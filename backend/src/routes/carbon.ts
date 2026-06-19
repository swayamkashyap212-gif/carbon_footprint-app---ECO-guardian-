import { CarbonCategory, VehicleType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { calculateDeliveryCarbon, calculateEcoScore } from "../services/carbonEngine.js";
import { buildRecommendations } from "../services/recommendations.js";
import { enqueueRecommendationRefresh } from "../services/jobQueues.js";

const router = Router();

const deliverySchema = z.object({
  category: z.nativeEnum(CarbonCategory),
  distanceKm: z.number().nonnegative(),
  vehicleType: z.nativeEnum(VehicleType).default("UNKNOWN"),
  orderId: z.string().optional()
});

router.post("/delivery/calculate", requireAuth, async (req: AuthenticatedRequest, res) => {
  const input = deliverySchema.parse(req.body);
  const carbon = calculateDeliveryCarbon(input);
  const record = await prisma.carbonRecord.create({
    data: {
      userId: req.user!.id,
      category: input.category,
      orderId: input.orderId,
      vehicleType: input.vehicleType,
      distanceKm: input.distanceKm,
      ...carbon,
      confidence: input.vehicleType === "UNKNOWN" ? 0.55 : 0.9,
      explanation: { formula: "distance * vehicle factor + packaging + storage" },
      occurredAt: new Date()
    }
  });
  const recommendations = buildRecommendations({ category: input.category, totalKg: carbon.totalKgCo2e, distanceKm: input.distanceKm });
  void enqueueRecommendationRefresh(req.user!.id, "carbon_delivery", "delivery record created").catch(() => undefined);
  res.status(201).json({ record, recommendations });
});

router.get("/dashboard", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  // 30-day records
  const records = await prisma.carbonRecord.findMany({ where: { userId, occurredAt: { gte: since } } });
  const monthlyKg = records.reduce((sum, record) => sum + record.totalKgCo2e, 0);

  // Past 6 months records
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const allRecords = await prisma.carbonRecord.findMany({
    where: { userId, occurredAt: { gte: sixMonthsAgo } },
    orderBy: { occurredAt: "asc" }
  });

  // Calculate stats
  const foodDeliveryCarbon = records
    .filter((r) => r.category === "FOOD_DELIVERY")
    .reduce((sum, r) => sum + r.totalKgCo2e, 0);
  const groceryDeliveryCarbon = records
    .filter((r) => r.category === "GROCERY_DELIVERY")
    .reduce((sum, r) => sum + r.totalKgCo2e, 0);

  const totalDistanceKm = allRecords.reduce((sum, r) => sum + (r.distanceKm ?? 0), 0);

  const vehicleBreakdown: Record<string, number> = {};
  for (const r of allRecords) {
    if (r.vehicleType) {
      vehicleBreakdown[r.vehicleType] = Math.round(((vehicleBreakdown[r.vehicleType] ?? 0) + r.totalKgCo2e) * 100) / 100;
    }
  }

  // Monthly trends grouping
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyTrendsMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthlyTrendsMap[months[d.getMonth()]] = 0;
  }
  for (const rec of allRecords) {
    const mName = months[new Date(rec.occurredAt).getMonth()];
    if (mName in monthlyTrendsMap) {
      monthlyTrendsMap[mName] += rec.totalKgCo2e;
    }
  }
  const monthlyTrends = Object.entries(monthlyTrendsMap).map(([month, carbon]) => ({
    month,
    carbon: Math.round(carbon * 100) / 100
  }));

  // Frequent Merchants
  const userOrders = await prisma.order.findMany({
    where: { userId },
    select: { merchantName: true, category: true }
  });
  const merchantCounts: Record<string, { count: number; category: string }> = {};
  for (const o of userOrders) {
    if (o.merchantName) {
      if (!merchantCounts[o.merchantName]) {
        merchantCounts[o.merchantName] = { count: 0, category: o.category };
      }
      merchantCounts[o.merchantName].count++;
    }
  }
  const frequentMerchants = Object.entries(merchantCounts)
    .map(([merchantName, info]) => ({
      merchantName,
      category: info.category,
      count: info.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recommendations and Alerts
  const activeRecommendations = await prisma.recommendation.findMany({
    where: { userId, completedAt: null },
    orderBy: { createdAt: "desc" },
    take: 3
  });
  const recentAlerts = await prisma.alert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3
  });

  // AI Insights
  const aiInsights: string[] = [];
  if (foodDeliveryCarbon > 15) {
    aiInsights.push("Your food delivery emissions are 30% higher than average. Ordering from restaurants closer to home can save up to 4kg CO2 this week.");
  }
  if (groceryDeliveryCarbon > 10) {
    aiInsights.push("Multiple grocery deliveries detected. Combining them into one weekly order would reduce your packaging waste by 40%.");
  }
  const petrolImpact = Object.entries(vehicleBreakdown).find(([v]) => v.includes("PETROL"));
  if (petrolImpact && petrolImpact[1] > 10) {
    aiInsights.push("Switching delivery preferences to EV partners (like Zepto or Blinkit green fleets) will drastically lower your transportation impact.");
  }
  if (aiInsights.length === 0) {
    aiInsights.push("Fantastic job! Your delivery selections are highly localized, keeping last-mile transport emissions well below target bounds.");
  }

  // Calculate EcoScore
  const score = calculateEcoScore({ monthlyKg, greenActions: 0, publicTransportTrips: 0 });

  res.json({
    todayCarbon: Math.round(records.filter((record) => isToday(record.occurredAt)).reduce((sum, record) => sum + record.totalKgCo2e, 0) * 100) / 100,
    monthlyCarbon: Math.round(monthlyKg * 100) / 100,
    ecoScore: score,
    categoryBreakdown: records.reduce<Record<string, number>>((acc, record) => {
      acc[record.category] = Math.round(((acc[record.category] ?? 0) + record.totalKgCo2e) * 100) / 100;
      return acc;
    }, {}),
    foodDeliveryCarbon: Math.round(foodDeliveryCarbon * 100) / 100,
    groceryDeliveryCarbon: Math.round(groceryDeliveryCarbon * 100) / 100,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    vehicleBreakdown,
    monthlyTrends,
    frequentMerchants,
    activeRecommendations,
    recentAlerts,
    aiInsights
  });
});

function isToday(date: Date) {
  return date.toDateString() === new Date().toDateString();
}

export default router;
