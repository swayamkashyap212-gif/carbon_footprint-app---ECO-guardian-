import { CarbonCategory, NotificationPlatform, OrderStatus, VehicleType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { analyzeNotification } from "../services/notificationIntelligence.js";
import { predictDeliveryVehicle } from "../services/vehiclePrediction.js";
import { calculateRoute } from "../services/mapsService.js";
import { calculateDeliveryCarbon, calculateFoodDeliveryCarbon, calculateGroceryDeliveryCarbon } from "../services/carbonEngine.js";
import { generateDeliveryCarbonAlert } from "../services/alertEngine.js";
import { buildRecommendations } from "../services/recommendations.js";
import { enqueueRecommendationRefresh } from "../services/jobQueues.js";

const router = Router();

function platformToCategory(platform: NotificationPlatform): CarbonCategory {
  switch (platform) {
    case "SWIGGY":
    case "ZOMATO":
      return "FOOD_DELIVERY";
    case "BLINKIT":
    case "ZEPTO":
      return "GROCERY_DELIVERY";
    case "AMAZON":
    case "FLIPKART":
      return "ECOMMERCE";
    case "UBER":
    case "OLA":
      return "TRANSPORT";
    default:
      return "GROCERY_DELIVERY";
  }
}

const schema = z.object({
  packageName: z.string(),
  title: z.string(),
  body: z.string(),
  timestamp: z.string()
});

router.post("/events", requireAuth, async (req: AuthenticatedRequest, res) => {
  const payload = schema.parse(req.body);
  const analysis = await analyzeNotification(payload);

  const event = await prisma.notificationEvent.create({
    data: {
      userId: req.user!.id,
      packageName: payload.packageName,
      title: payload.title,
      body: payload.body,
      eventTimestamp: new Date(payload.timestamp),
      rawPayload: payload,
      platform: analysis.platform,
      orderStatus: analysis.orderStatus,
      merchantName: analysis.merchantName,
      restaurantName: analysis.restaurantName,
      storeName: analysis.storeName
    }
  });

  // Check if we can determine locations and process orders
  let destLat = 20.5937;
  let destLng = 78.9629;
  const profile = await prisma.carbonProfile.findUnique({ where: { userId: req.user!.id } });
  if (profile && profile.encryptedHome) {
    try {
      const home = profile.encryptedHome as any;
      if (home && home.lat && home.lng) {
        destLat = home.lat;
        destLng = home.lng;
      }
    } catch (e) {
      console.warn("Failed parsing home location:", e);
    }
  }

  // Create restaurant / store if identified
  let restaurantId: string | undefined = undefined;
  let storeId: string | undefined = undefined;
  // Use deterministic offset based on merchant name hash instead of random
  const merchantHash = (analysis.restaurantName || analysis.storeName || "").split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const originOffset = (merchantHash % 100) / 10000;
  let originLat = destLat + originOffset;
  let originLng = destLng + (merchantHash % 79) / 10000;

  if (analysis.restaurantName) {
    const rest = await prisma.restaurant.upsert({
      where: { placeId: `mock-place-${analysis.restaurantName.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        name: analysis.restaurantName,
        placeId: `mock-place-${analysis.restaurantName.toLowerCase().replace(/\s+/g, "-")}`,
        latitude: originLat,
        longitude: originLng
      }
    });
    restaurantId = rest.id;
  } else if (analysis.storeName) {
    const st = await prisma.store.upsert({
      where: { placeId: `mock-place-${analysis.storeName.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        name: analysis.storeName,
        placeId: `mock-place-${analysis.storeName.toLowerCase().replace(/\s+/g, "-")}`,
        latitude: originLat,
        longitude: originLng
      }
    });
    storeId = st.id;
  }

  // Calculate routes
  const routeData = await calculateRoute({
    origin: { lat: originLat, lng: originLng },
    destination: { lat: destLat, lng: destLng }
  });

  const savedRoute = await prisma.route.create({
    data: {
      userId: req.user!.id,
      originLatitude: originLat,
      originLongitude: originLng,
      destLatitude: destLat,
      destLongitude: destLng,
      distanceKm: routeData.distanceKm,
      travelTimeMin: routeData.travelTimeMin,
      routeMetadata: routeData.routeMetadata as any
    }
  });

  const category = platformToCategory(analysis.platform);

  // Try finding an active order in the past 2 hours
  let order = await prisma.order.findFirst({
    where: {
      userId: req.user!.id,
      platform: analysis.platform,
      status: { notIn: ["DELIVERED", "COMPLETED"] },
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!order) {
    order = await prisma.order.create({
      data: {
        userId: req.user!.id,
        platform: analysis.platform,
        category,
        merchantName: analysis.merchantName || analysis.restaurantName || analysis.storeName || String(analysis.platform),
        status: analysis.orderStatus,
        restaurantId,
        storeId,
        routeId: savedRoute.id,
        destination: { lat: destLat, lng: destLng }
      }
    });
  } else {
    order = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: analysis.orderStatus,
        restaurantId: restaurantId || order.restaurantId,
        storeId: storeId || order.storeId,
        routeId: savedRoute.id
      }
    });
  }

  // Link event to order
  await prisma.notificationEvent.update({
    where: { id: event.id },
    data: { orderId: order.id }
  });

  let carbonRecord = null;
  let alert = null;
  let recommendations: any[] = [];

  // If order transitions to completed status
  if (analysis.orderStatus === "DELIVERED" || analysis.orderStatus === "COMPLETED") {
    const vehicleInfo = predictDeliveryVehicle({
      distanceKm: routeData.distanceKm,
      platform: analysis.platform,
      hour: new Date().getHours(),
      deliveryTimeMin: routeData.travelTimeMin
    });

    let emissions = 0;
    let transportKg = 0;
    let packagingKg = 0;
    let storageKg = 0;

    if (category === "FOOD_DELIVERY") {
      const carbon = calculateFoodDeliveryCarbon(routeData.distanceKm, vehicleInfo.vehicleType);
      emissions = carbon.totalKgCo2e;
      transportKg = carbon.transportKg;
      packagingKg = carbon.packagingKg;
      storageKg = carbon.storageKg;
    } else if (category === "GROCERY_DELIVERY") {
      const carbon = calculateGroceryDeliveryCarbon(routeData.distanceKm, vehicleInfo.vehicleType);
      emissions = carbon.totalKgCo2e;
      transportKg = carbon.transportKg;
      packagingKg = carbon.packagingKg;
      storageKg = carbon.storageKg;
    } else {
      const carbon = calculateDeliveryCarbon({
        category,
        distanceKm: routeData.distanceKm,
        vehicleType: vehicleInfo.vehicleType
      });
      emissions = carbon.totalKgCo2e;
      transportKg = carbon.transportKg;
      packagingKg = carbon.packagingKg;
      storageKg = carbon.storageKg;
    }

    order = await prisma.order.update({
      where: { id: order.id },
      data: {
        vehicleType: vehicleInfo.vehicleType,
        vehicleConfidence: vehicleInfo.confidence
      }
    });

    carbonRecord = await prisma.carbonRecord.create({
      data: {
        userId: req.user!.id,
        category,
        orderId: order.id,
        routeId: savedRoute.id,
        vehicleType: vehicleInfo.vehicleType,
        distanceKm: routeData.distanceKm,
        transportKg,
        packagingKg,
        storageKg,
        totalKgCo2e: emissions,
        confidence: vehicleInfo.confidence,
        explanation: { source: "notification_listener", predicted: true },
        occurredAt: new Date()
      }
    });

    const alertInfo = generateDeliveryCarbonAlert(
      analysis.merchantName || String(analysis.platform),
      emissions,
      routeData.distanceKm,
      vehicleInfo.vehicleType
    );

    alert = await prisma.alert.create({
      data: {
        userId: req.user!.id,
        level: alertInfo.level,
        title: alertInfo.title,
        message: alertInfo.message,
        category,
        metadata: alertInfo.metadata as any
      }
    });

    const recs = buildRecommendations({
      category,
      totalKg: emissions,
      distanceKm: routeData.distanceKm
    });

    for (const rec of recs) {
      const r = await prisma.recommendation.create({
        data: {
          userId: req.user!.id,
          category,
          title: rec.title,
          description: rec.description,
          potentialSaving: rec.potentialSaving,
          priority: rec.potentialSaving > 4 ? 1 : 2
        }
      });
      recommendations.push(r);
    }

    void enqueueRecommendationRefresh(req.user!.id, "notification_completion", "notification event completed").catch(() => undefined);

    // Update Profile EcoScore
    if (profile) {
      const newScore = Math.max(0, Math.min(100, profile.currentEcoScore - Math.round(emissions * 0.1)));
      await prisma.carbonProfile.update({
        where: { userId: req.user!.id },
        data: { currentEcoScore: newScore }
      });
    }
  }

  res.status(201).json({ event, order, carbonRecord, alert, recommendations });
});

export default router;
