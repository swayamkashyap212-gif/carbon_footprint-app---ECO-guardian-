import { CarbonCategory, NotificationPlatform, OrderStatus, VehicleType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { calculateRoute } from "../services/mapsService.js";
import { predictDeliveryVehicle } from "../services/vehiclePrediction.js";
import { calculateDeliveryCarbon, calculateFoodDeliveryCarbon, calculateGroceryDeliveryCarbon } from "../services/carbonEngine.js";
import { enqueueRecommendationRefresh } from "../services/jobQueues.js";

const router = Router();

const schema = z.object({
  platform: z.nativeEnum(NotificationPlatform),
  category: z.nativeEnum(CarbonCategory),
  merchantName: z.string().optional(),
  status: z.nativeEnum(OrderStatus).default("UNKNOWN"),
  origin: z.object({ lat: z.number(), lng: z.number() }),
  destination: z.object({ lat: z.number(), lng: z.number() }),
  vehicleType: z.nativeEnum(VehicleType).optional()
});

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const input = schema.parse(req.body);
  const route = await calculateRoute({ origin: input.origin, destination: input.destination });
  const vehicle = input.vehicleType
    ? { vehicleType: input.vehicleType, confidence: 1 }
    : predictDeliveryVehicle({ distanceKm: route.distanceKm, platform: input.platform, hour: new Date().getHours() });
  const savedRoute = await prisma.route.create({
    data: {
      userId: req.user!.id,
      originLatitude: input.origin.lat,
      originLongitude: input.origin.lng,
      destLatitude: input.destination.lat,
      destLongitude: input.destination.lng,
      ...route
    }
  });
  const order = await prisma.order.create({
    data: {
      userId: req.user!.id,
      platform: input.platform,
      category: input.category,
      merchantName: input.merchantName,
      status: input.status,
      routeId: savedRoute.id,
      vehicleType: vehicle.vehicleType,
      vehicleConfidence: vehicle.confidence,
      destination: input.destination
    }
  });
  res.status(201).json({ order, route: savedRoute, vehicle });
});

const vehicleUpdateSchema = z.object({
  vehicleType: z.nativeEnum(VehicleType)
});

router.post("/:id/vehicle", requireAuth, async (req: AuthenticatedRequest, res) => {
  const input = vehicleUpdateSchema.parse(req.body);
  const orderId = req.params.id as string;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: req.user!.id }
  });

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  // Update order vehicle
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      vehicleType: input.vehicleType,
      vehicleConfidence: 1.0
    }
  });

  // Recalculate carbon
  const route = order.routeId ? await prisma.route.findUnique({ where: { id: order.routeId } }) : null;
  const distanceKm = route ? route.distanceKm : 3.0;

  let emissions = 0;
  let transportKg = 0;
  let packagingKg = 0;
  let storageKg = 0;

  if (order.category === "FOOD_DELIVERY") {
    const carbon = calculateFoodDeliveryCarbon(distanceKm, input.vehicleType);
    emissions = carbon.totalKgCo2e;
    transportKg = carbon.transportKg;
    packagingKg = carbon.packagingKg;
    storageKg = carbon.storageKg;
  } else if (order.category === "GROCERY_DELIVERY") {
    const carbon = calculateGroceryDeliveryCarbon(distanceKm, input.vehicleType);
    emissions = carbon.totalKgCo2e;
    transportKg = carbon.transportKg;
    packagingKg = carbon.packagingKg;
    storageKg = carbon.storageKg;
  } else {
    const carbon = calculateDeliveryCarbon({
      category: order.category,
      distanceKm,
      vehicleType: input.vehicleType
    });
    emissions = carbon.totalKgCo2e;
    transportKg = carbon.transportKg;
    packagingKg = carbon.packagingKg;
    storageKg = carbon.storageKg;
  }

  void enqueueRecommendationRefresh(req.user!.id, "order_vehicle_override", "order vehicle updated").catch(() => undefined);

  // Update carbon ledger
  const existingRecord = await prisma.carbonRecord.findFirst({
    where: { orderId: order.id }
  });

  let carbonRecord;
  if (existingRecord) {
    carbonRecord = await prisma.carbonRecord.update({
      where: { id: existingRecord.id },
      data: {
        vehicleType: input.vehicleType,
        transportKg,
        packagingKg,
        storageKg,
        totalKgCo2e: emissions,
        confidence: 1.0,
        explanation: { source: "user_override", overrideAt: new Date() }
      }
    });
  } else {
    carbonRecord = await prisma.carbonRecord.create({
      data: {
        userId: req.user!.id,
        category: order.category,
        orderId: order.id,
        routeId: order.routeId,
        vehicleType: input.vehicleType,
        distanceKm,
        transportKg,
        packagingKg,
        storageKg,
        totalKgCo2e: emissions,
        confidence: 1.0,
        explanation: { source: "user_override", overrideAt: new Date() },
        occurredAt: order.createdAt
      }
    });
  }

  // Adjust EcoScore
  const profile = await prisma.carbonProfile.findUnique({ where: { userId: req.user!.id } });
  if (profile) {
    const oldEmissions = existingRecord ? existingRecord.totalKgCo2e : 0;
    const diff = emissions - oldEmissions;
    const newScore = Math.max(0, Math.min(100, profile.currentEcoScore - Math.round(diff * 0.1)));
    await prisma.carbonProfile.update({
      where: { userId: req.user!.id },
      data: { currentEcoScore: newScore }
    });
  }

  res.json({ order: updatedOrder, carbonRecord });
});

export default router;
