import crypto from "crypto";
import OpenAI from "openai";
import { CarbonCategory, NotificationPlatform } from "@prisma/client";

import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { generatePrediction } from "./predictionEngine.js";
import { buildRecommendations } from "./recommendations.js";

export type RecommendationEventType = "SHOWN" | "CLICKED" | "IGNORED" | "ADOPTED" | "COMPLETED" | "DISMISSED";

export type EnvironmentalContext = {
  weather?: string;
  temperature?: number;
  traffic?: number;
  airQuality?: number;
  season?: string;
};

export type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RecommendationCard = {
  id: string;
  category: CarbonCategory | null;
  title: string;
  description: string;
  reason: string;
  priorityScore: number;
  impactScore: number;
  confidence: number;
  adoptionProbability: number;
  carbonSaving: number;
  costSaving: number;
  timeSavingMin: number;
  difficulty: "easy" | "medium" | "hard";
  source: "behavioral" | "predictive" | "environmental" | "llm" | "rule";
  status: "active" | "accepted" | "completed";
  metadata: Record<string, unknown>;
  deduplicationHash: string;
  expiresAt: string | null;
  createdAt: string | null;
};

export type RecommendationBundle = {
  generatedAt: string;
  predictions: {
    dailyCarbonKg: number;
    weeklyCarbonKg: number;
    monthlyCarbonKg: number;
    futureFootprintKg: number;
    confidence: number;
    modelVersion: string;
    drivers: Array<{ category: string; kg: number }>;
  };
  behaviorSummary: {
    orderCount: number;
    foodOrders: number;
    groceryOrders: number;
    shoppingOrders: number;
    flightCount: number;
    transportEntries: number;
    electricityEntries: number;
    lateNightOrders: number;
    peakOrderHour: number | null;
    recurringMerchant: string | null;
    averageOrderValue: number;
  };
  hotspots: Array<{ category: string; kg: number; share: number }>;
  insights: string[];
  recommendations: RecommendationCard[];
  learning: {
    shown: number;
    clicked: number;
    ignored: number;
    adopted: number;
    completed: number;
    adoptionRate: number;
    completionRate: number;
  };
  coachSummary: string;
};

type PredictionSnapshot = RecommendationBundle["predictions"];

type RecommendationCandidate = Omit<
  RecommendationCard,
  "id" | "status" | "createdAt" | "expiresAt" | "deduplicationHash" | "confidence" | "adoptionProbability" | "impactScore" | "priorityScore"
> & {
  confidence?: number;
  adoptionProbability?: number;
  impactScore?: number;
  priorityScore?: number;
};

type RecommendationContext = {
  records: Array<{ category: CarbonCategory; totalKgCo2e: number; occurredAt: Date; distanceKm: number | null }>;
  orders: Array<{
    id: string;
    platform: NotificationPlatform;
    category: CarbonCategory;
    merchantName: string | null;
    amount: number | null;
    createdAt: Date;
    routeId: string | null;
  }>;
  routes: Array<{ id: string; distanceKm: number; travelTimeMin: number; createdAt: Date }>;
  profile: {
    preferences: unknown;
    city: string | null;
    monthlyBaselineKg: number;
    currentEcoScore: number;
    encryptedHome: unknown;
    encryptedOffice: unknown;
  } | null;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    category: CarbonCategory | null;
    potentialSaving: number;
    priority: number;
    acceptedAt: Date | null;
    completedAt: Date | null;
    impactScore: number | null;
    confidence: number | null;
    adoptionProbability: number | null;
    costSavings: number | null;
    timeSavingsMin: number | null;
    difficulty: string | null;
    source: string | null;
    reasoning: unknown;
    metadata: unknown;
    deduplicationHash: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    shownAt: Date | null;
  }>;
  events: Array<{
    eventType: RecommendationEventType;
    createdAt: Date;
  }>;
  alerts: Array<{ level: string; title: string; message: string; createdAt: Date }>;
  predictions: Array<{
    dailyCarbonKg: number;
    weeklyCarbonKg: number;
    monthlyCarbonKg: number;
    futureFootprintKg: number;
    confidence: number;
    modelVersion: string;
    drivers: unknown;
    createdAt: Date;
  }>;
};

export async function refreshRecommendationEngine(userId: string, input?: { limit?: number; environmental?: EnvironmentalContext; trigger?: string }) {
  const context = await loadContext(userId);
  const bundle = await buildBundle(context, input?.environmental, input?.trigger, userId);
  const saved = await persistRecommendations(userId, bundle.recommendations, input?.limit ?? 8);

  return {
    ...bundle,
    recommendations: saved
  } satisfies RecommendationBundle;
}

export async function getRecommendationDashboard(userId: string) {
  const context = await loadContext(userId);
  const activeRecommendations = context.recommendations
    .filter((rec) => !rec.completedAt)
    .sort((a, b) => b.priority - a.priority || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8)
    .map((rec) => serializeRecommendation(rec));

  if (activeRecommendations.length === 0) {
    return refreshRecommendationEngine(userId, { trigger: "dashboard_empty" });
  }

  const bundle = await buildBundle(context, undefined, "dashboard", userId);
  return {
    ...bundle,
    recommendations: activeRecommendations
  } satisfies RecommendationBundle;
}

export async function recordRecommendationFeedback(userId: string, input: { recommendationId: string; eventType: RecommendationEventType; note?: string; context?: Record<string, unknown> }) {
  const recommendation = await prisma.recommendation.findFirst({
    where: { id: input.recommendationId, userId }
  });

  if (!recommendation) {
    throw new Error("Recommendation not found");
  }

  const timestamp = new Date();
  const updated = await prisma.recommendation.update({
    where: { id: recommendation.id },
    data: {
      shownAt: input.eventType === "SHOWN" && !recommendation.shownAt ? timestamp : recommendation.shownAt,
      acceptedAt: input.eventType === "ADOPTED" && !recommendation.acceptedAt ? timestamp : recommendation.acceptedAt,
      completedAt: input.eventType === "COMPLETED" ? timestamp : recommendation.completedAt
    }
  });

  await (prisma as any).recommendationEvent.create({
    data: {
      userId,
      recommendationId: recommendation.id,
      eventType: input.eventType,
      note: input.note ?? null,
      context: input.context ?? {},
      createdAt: timestamp
    }
  });

  return serializeRecommendation(updated);
}

export async function answerSustainabilityCoach(userId: string, messages: CoachMessage[], environmental?: EnvironmentalContext) {
  const context = await loadContext(userId);
  const bundle = await buildBundle(context, environmental, "coach", userId);

  if (process.env.NODE_ENV !== "test" && env.OPENAI_API_KEY && env.OPENAI_API_KEY !== "your-openai-key") {
    try {
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are EcoGuardian AI, a personal sustainability coach.",
              "Use only the provided user context.",
              "Give a short, personalized answer with concrete actions, estimated savings, and a one-sentence explanation of the main carbon hotspot.",
              "Return JSON with a single field named content."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({
              messages,
              behaviorSummary: bundle.behaviorSummary,
              hotspots: bundle.hotspots,
              insights: bundle.insights,
              recommendations: bundle.recommendations.slice(0, 3).map((item) => ({
                title: item.title,
                description: item.description,
                carbonSaving: item.carbonSaving,
                costSaving: item.costSaving,
                adoptionProbability: item.adoptionProbability
              })),
              predictions: bundle.predictions,
              environmental: environmental ?? null
            })
          }
        ]
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      if (parsed?.content) {
        return { role: "assistant" as const, content: String(parsed.content) };
      }
    } catch (error) {
      console.warn("AI coach generation failed, falling back to rules:", error);
    }
  }

  return {
    role: "assistant" as const,
    content: buildFallbackCoachReply(bundle, messages)
  };
}

async function loadContext(userId: string): Promise<RecommendationContext> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [records, orders, routes, profile, recommendations, events, alerts, predictions] = await Promise.all([
    prisma.carbonRecord.findMany({
      where: { userId, occurredAt: { gte: ninetyDaysAgo } },
      orderBy: { occurredAt: "desc" }
    }),
    prisma.order.findMany({
      where: { userId, createdAt: { gte: ninetyDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 180,
      select: { id: true, platform: true, category: true, merchantName: true, amount: true, createdAt: true, routeId: true }
    }),
    prisma.route.findMany({
      where: { userId, createdAt: { gte: ninetyDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 120,
      select: { id: true, distanceKm: true, travelTimeMin: true, createdAt: true }
    }),
    prisma.carbonProfile.findUnique({
      where: { userId },
      select: { preferences: true, city: true, monthlyBaselineKg: true, currentEcoScore: true, encryptedHome: true, encryptedOffice: true }
    }),
    prisma.recommendation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 60
    }),
    (prisma as any).recommendationEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200
    }),
    prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.prediction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  return { records, orders, routes, profile, recommendations, events, alerts, predictions };
}

async function buildBundle(context: RecommendationContext, environmental?: EnvironmentalContext, trigger = "manual", userId?: string): Promise<RecommendationBundle> {
  const rawPrediction = context.predictions[0] ?? generatePrediction(context.records);
  const latestPrediction = normalizePrediction(rawPrediction as Partial<PredictionSnapshot> & { drivers?: unknown });
  const behavior = analyzeBehavior(context);
  const candidates = buildRecommendationCandidates(context, behavior, latestPrediction, environmental, trigger);
  const aiCandidates = await maybeGenerateAiCandidates(context, behavior, latestPrediction, environmental, trigger, candidates);
  const ranked = rankCandidates([...candidates, ...aiCandidates], context, userId);
  const recommendations = ranked.slice(0, 8).map((candidate) => toBundleCard(candidate));
  const learning = summarizeLearning(context.events);

  return {
    generatedAt: new Date().toISOString(),
    predictions: mapPrediction(latestPrediction),
    behaviorSummary: behavior.behaviorSummary,
    hotspots: behavior.hotspots,
    insights: behavior.insights,
    recommendations,
    learning,
    coachSummary: buildCoachSummary(behavior, latestPrediction, recommendations, learning)
  };
}

function analyzeBehavior(context: RecommendationContext) {
  const totalsByCategory = context.records.reduce<Record<string, number>>((acc, record) => {
    acc[record.category] = (acc[record.category] ?? 0) + safeNumber(record.totalKgCo2e);
    return acc;
  }, {});

  const orderCount = context.orders.length;
  const foodOrders = context.orders.filter((order) => order.category === "FOOD_DELIVERY").length;
  const groceryOrders = context.orders.filter((order) => order.category === "GROCERY_DELIVERY").length;
  const shoppingOrders = context.orders.filter((order) => order.category === "ECOMMERCE").length;
  const flightCount = context.records.filter((record) => record.category === "FLIGHT").length;
  const transportEntries = context.records.filter((record) => record.category === "TRANSPORT").length;
  const electricityEntries = context.records.filter((record) => record.category === "ELECTRICITY").length;
  const lateNightOrders = context.orders.filter((order) => {
    const hour = new Date(order.createdAt).getHours();
    return hour >= 21 || hour < 6;
  }).length;

  const hourTotals = context.orders.reduce<Record<number, number>>((acc, order) => {
    const hour = new Date(order.createdAt).getHours();
    acc[hour] = (acc[hour] ?? 0) + 1;
    return acc;
  }, {});
  const peakOrderHour = Object.entries(hourTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const recurringMerchant = context.orders.reduce<Record<string, number>>((acc, order) => {
    if (!order.merchantName) return acc;
    acc[order.merchantName] = (acc[order.merchantName] ?? 0) + 1;
    return acc;
  }, {});
  const topMerchant = Object.entries(recurringMerchant).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const averageOrderValue = context.orders.reduce((sum, order) => sum + safeNumber(order.amount ?? 0), 0) / Math.max(orderCount, 1);

  const totalCarbon = context.records.reduce((sum, record) => sum + safeNumber(record.totalKgCo2e), 0);
  const hotspots = Object.entries(totalsByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, kg]) => ({
      category,
      kg: round(kg),
      share: round((kg / Math.max(totalCarbon, 1)) * 100)
    }));

  const insights = [
    orderCount > 0 ? `You placed ${orderCount} orders in the last 90 days.` : "No order history yet. Recommendations will stay focused on your tracked carbon events.",
    foodOrders > 0 ? `Food delivery frequency is ${foodOrders} orders in the last 90 days.` : "Food delivery activity is low, so non-food habits are driving more of your footprint.",
    groceryOrders > 0 ? `You placed ${groceryOrders} grocery orders in the last 90 days.` : "No grocery delivery pattern was detected in the current window.",
    peakOrderHour !== null ? `Most orders happen around ${Number(peakOrderHour)}:00.` : "No dominant ordering time could be identified.",
    lateNightOrders > 0 ? `${lateNightOrders} orders were placed after 9 PM. Late-night ordering often leads to more express routing.` : "Late-night ordering is not a major pattern right now.",
    topMerchant ? `Your most repeated merchant is ${topMerchant}.` : "No single merchant dominates your activity yet.",
    averageOrderValue > 0 ? `Average order value is ₹${round(averageOrderValue)}.` : "Order value data is too sparse to assess budget friction.",
    hotspots[0] ? `${hotspots[0].category.replace("_", " ")} is your largest carbon hotspot.` : "No dominant hotspot could be identified." 
  ];

  return {
    behaviorSummary: {
      orderCount,
      foodOrders,
      groceryOrders,
      shoppingOrders,
      flightCount,
      transportEntries,
      electricityEntries,
      lateNightOrders,
      peakOrderHour: peakOrderHour === null ? null : Number(peakOrderHour),
      recurringMerchant: topMerchant,
      averageOrderValue: round(averageOrderValue)
    },
    hotspots,
    insights
  };
}

function buildRecommendationCandidates(
  context: RecommendationContext,
  behavior: ReturnType<typeof analyzeBehavior>,
  prediction: PredictionSnapshot,
  environmental?: EnvironmentalContext,
  trigger = "manual"
): RecommendationCandidate[] {
  const candidates: RecommendationCandidate[] = [];
  const totalCarbon = context.records.reduce((sum, record) => sum + safeNumber(record.totalKgCo2e), 0);
  const allRoutesDistance = context.routes.reduce((sum, route) => sum + safeNumber(route.distanceKm), 0);
  const averageRouteDistance = context.routes.length > 0 ? allRoutesDistance / context.routes.length : 0;
  const foodCarbon = sumCategory(context.records, "FOOD_DELIVERY");
  const groceryCarbon = sumCategory(context.records, "GROCERY_DELIVERY");
  const shoppingCarbon = sumCategory(context.records, "ECOMMERCE");
  const flightCarbon = sumCategory(context.records, "FLIGHT");
  const transportCarbon = sumCategory(context.records, "TRANSPORT");
  const electricityCarbon = sumCategory(context.records, "ELECTRICITY");
  const currentMonth = new Date().getMonth();
  const climateBoost = environmental?.temperature && environmental.temperature > 32 ? 0.1 : 0;
  const trafficBoost = environmental?.traffic && environmental.traffic > 70 ? 0.08 : 0;

  if (behavior.behaviorSummary.foodOrders >= 4 || foodCarbon > totalCarbon * 0.2) {
    const distance = averageRouteDistance > 0 ? averageRouteDistance : 4;
    for (const item of buildRecommendations({ category: "FOOD_DELIVERY", totalKg: foodCarbon || totalCarbon * 0.25, distanceKm: distance })) {
      candidates.push(normalizeLegacyRecommendation(item, "FOOD_DELIVERY", "behavioral", {
        trigger,
        recurringMerchant: behavior.behaviorSummary.recurringMerchant,
        averageRouteDistance: round(distance),
        lateNightOrders: behavior.behaviorSummary.lateNightOrders,
        reasoning: "food delivery clustering"
      }));
    }
  }

  if (behavior.behaviorSummary.groceryOrders >= 3 || groceryCarbon > totalCarbon * 0.15) {
    candidates.push(createCandidate({
      category: "GROCERY_DELIVERY",
      title: "Bundle grocery orders into a weekly slot",
      description: "Grouping groceries into one scheduled delivery reduces packaging duplication and last-mile emissions.",
      reason: `You made ${behavior.behaviorSummary.groceryOrders} grocery orders recently, so batching is the easiest low-friction win.`,
      carbonSaving: Math.max(1.2, round(groceryCarbon * 0.32)),
      costSaving: Math.max(120, round(behavior.behaviorSummary.groceryOrders * 60)),
      timeSavingMin: 25,
      difficulty: "easy",
      source: "behavioral",
      metadata: { trigger, category: "GROCERY_DELIVERY", signal: "frequency", orders: behavior.behaviorSummary.groceryOrders }
    }));

    candidates.push(createCandidate({
      category: "GROCERY_DELIVERY",
      title: "Prefer standard grocery delivery over express",
      description: "Standard shipping is usually enough for groceries and reduces vehicle emissions and rush fees.",
      reason: "Express grocery delivery tends to increase both cost and carbon for small baskets.",
      carbonSaving: Math.max(0.8, round(groceryCarbon * 0.18)),
      costSaving: Math.max(40, round(groceryCarbon * 8)),
      timeSavingMin: 10,
      difficulty: "easy",
      source: "predictive",
      metadata: { trigger, category: "GROCERY_DELIVERY", signal: "shipping_speed" }
    }));
  }

  if (behavior.behaviorSummary.shoppingOrders >= 2 || shoppingCarbon > totalCarbon * 0.12) {
    candidates.push(createCandidate({
      category: "ECOMMERCE",
      title: "Batch non-urgent shopping into one cart",
      description: "Combining small purchases cuts repeated packaging and reduces delivery trips.",
      reason: "Your shopping pattern suggests multiple low-friction purchases that can be consolidated.",
      carbonSaving: Math.max(0.9, round(shoppingCarbon * 0.28)),
      costSaving: Math.max(150, round(behavior.behaviorSummary.shoppingOrders * 75)),
      timeSavingMin: 18,
      difficulty: "easy",
      source: "behavioral",
      metadata: { trigger, category: "ECOMMERCE", signal: "batch_purchase" }
    }));

    candidates.push(createCandidate({
      category: "ECOMMERCE",
      title: "Choose slower shipping for low-urgency items",
      description: "Standard shipping typically lowers carbon and often removes express fees.",
      reason: "You can trade speed for lower emissions on non-urgent purchases.",
      carbonSaving: Math.max(0.7, round(shoppingCarbon * 0.2)),
      costSaving: Math.max(60, round(behavior.behaviorSummary.shoppingOrders * 25)),
      timeSavingMin: 0,
      difficulty: "easy",
      source: "predictive",
      metadata: { trigger, category: "ECOMMERCE", signal: "shipping_speed" }
    }));
  }

  if (behavior.behaviorSummary.flightCount > 0 || flightCarbon > 0) {
    candidates.push(createCandidate({
      category: "FLIGHT",
      title: "Replace one short-haul trip with a virtual meeting",
      description: "A single avoided short flight can save far more carbon than a full week of local optimizations.",
      reason: `Flight activity is present in your history, so reducing even one trip has outsized impact.`,
      carbonSaving: Math.max(4, round(flightCarbon * 0.12)),
      costSaving: Math.max(2000, round(flightCarbon * 90)),
      timeSavingMin: 120,
      difficulty: "medium",
      source: "predictive",
      metadata: { trigger, category: "FLIGHT", signal: "travel_frequency" }
    }));

    candidates.push(createCandidate({
      category: "FLIGHT",
      title: "Prefer direct flights and combine trip purposes",
      description: "Reducing layovers and merging travel reasons lowers carbon per journey.",
      reason: "Direct routing and fewer separate trips are the fastest flight emissions win after flight reduction.",
      carbonSaving: Math.max(2.5, round(flightCarbon * 0.08)),
      costSaving: Math.max(800, round(flightCarbon * 35)),
      timeSavingMin: 60,
      difficulty: "medium",
      source: "behavioral",
      metadata: { trigger, category: "FLIGHT", signal: "trip_consolidation" }
    }));
  }

  if (behavior.behaviorSummary.transportEntries > 0 || transportCarbon > totalCarbon * 0.15 || trafficBoost > 0) {
    candidates.push(createCandidate({
      category: "TRANSPORT",
      title: "Swap one car trip for metro or bus this week",
      description: "Public transport can cut commute emissions while avoiding traffic stress and parking costs.",
      reason: "Transport remains one of the easiest categories to improve with low planning effort.",
      carbonSaving: Math.max(1.2, round(transportCarbon * 0.3 + trafficBoost)),
      costSaving: Math.max(100, round(transportCarbon * 45)),
      timeSavingMin: 20,
      difficulty: "easy",
      source: "environmental",
      metadata: { trigger, category: "TRANSPORT", signal: "traffic", traffic: environmental?.traffic ?? null }
    }));

    candidates.push(createCandidate({
      category: "TRANSPORT",
      title: "Batch errands into one route instead of separate trips",
      description: "Combining errands can remove multiple short vehicle trips from a week.",
      reason: "Repeated small trips are a hidden source of unnecessary transport emissions.",
      carbonSaving: Math.max(0.8, round(transportCarbon * 0.22)),
      costSaving: Math.max(80, round(transportCarbon * 35)),
      timeSavingMin: 35,
      difficulty: "easy",
      source: "behavioral",
      metadata: { trigger, category: "TRANSPORT", signal: "errand_batching" }
    }));
  }

  if (behavior.behaviorSummary.electricityEntries > 0 || electricityCarbon > totalCarbon * 0.12 || currentMonth >= 4 && currentMonth <= 6) {
    candidates.push(createCandidate({
      category: "ELECTRICITY",
      title: "Shift heavy appliance use away from peak hours",
      description: "Moving laundry, heating, or charging to off-peak times trims emissions and often lowers the bill.",
      reason: "Your electricity footprint is meaningful enough that timing changes can create visible savings.",
      carbonSaving: Math.max(1, round(electricityCarbon * (0.16 + climateBoost))),
      costSaving: Math.max(120, round(electricityCarbon * 25)),
      timeSavingMin: 0,
      difficulty: "medium",
      source: "environmental",
      metadata: { trigger, category: "ELECTRICITY", signal: "peak_shifting", season: environmental?.season ?? null }
    }));

    candidates.push(createCandidate({
      category: "ELECTRICITY",
      title: "Review standby loads and older appliances",
      description: "Low-value standby power and inefficient appliances often hide recurring monthly waste.",
      reason: "A small appliance audit can permanently reduce baseline consumption.",
      carbonSaving: Math.max(0.9, round(electricityCarbon * 0.12)),
      costSaving: Math.max(90, round(electricityCarbon * 18)),
      timeSavingMin: 10,
      difficulty: "medium",
      source: "predictive",
      metadata: { trigger, category: "ELECTRICITY", signal: "appliance_efficiency" }
    }));
  }

  candidates.push(createCandidate({
    category: "WATER",
    title: "Cut hot-water waste with one low-flow habit",
    description: "A single water-saving habit such as shorter hot showers or low-flow fixtures reduces utility load and emissions.",
    reason: "Water usage is not directly tracked yet, so this is a preventive baseline recommendation.",
    carbonSaving: 0.7,
    costSaving: 45,
    timeSavingMin: 5,
    difficulty: "easy",
    source: "rule",
    confidenceOverride: 0.4,
    metadata: { trigger, category: "WATER", signal: "untracked_water" }
  }));

  candidates.push(createCandidate({
    category: "WASTE",
    title: "Reuse packaging for the next delivery",
    description: "Reusing packing materials and consolidating returns lowers waste and the emissions embedded in packaging.",
    reason: "Packaging waste often compounds across food, grocery, and shopping orders.",
    carbonSaving: Math.max(0.6, round(totalCarbon * 0.05)),
    costSaving: 35,
    timeSavingMin: 8,
    difficulty: "easy",
    source: "behavioral",
    metadata: { trigger, category: "WASTE" }
  }));

  candidates.push(createCandidate({
    category: "LIFESTYLE",
    title: "Lock in a delivery-free dinner twice a week",
    description: "A few planned, no-delivery meals reduce ordering friction and improve budget predictability.",
    reason: "Lifestyle changes create durable savings when they reduce repeated decisions.",
    carbonSaving: Math.max(0.9, round(foodCarbon * 0.1 + groceryCarbon * 0.05)),
    costSaving: Math.max(150, round((foodCarbon + groceryCarbon) * 18)),
    timeSavingMin: 45,
    difficulty: "easy",
    source: "predictive",
    metadata: { trigger, category: "LIFESTYLE" }
  }));

  if (behavior.behaviorSummary.peakOrderHour !== null && behavior.behaviorSummary.peakOrderHour >= 21) {
    candidates.push(createCandidate({
      category: "FOOD_DELIVERY",
      title: "Move late-night orders earlier",
      description: "Earlier ordering reduces the chance of premium routing and improves merchant availability.",
      reason: "Your peak order time is late in the day, which often correlates with higher delivery friction.",
      carbonSaving: Math.max(0.8, round(foodCarbon * 0.12)),
      costSaving: Math.max(60, round(behavior.behaviorSummary.foodOrders * 20)),
      timeSavingMin: 10,
      difficulty: "easy",
      source: "behavioral",
      metadata: { trigger, category: "FOOD_DELIVERY", signal: "late_night_orders" }
    }));
  }

  return candidates;
}

async function maybeGenerateAiCandidates(
  context: RecommendationContext,
  behavior: ReturnType<typeof analyzeBehavior>,
  prediction: PredictionSnapshot,
  environmental: EnvironmentalContext | undefined,
  trigger: string,
  currentCandidates: RecommendationCandidate[]
): Promise<RecommendationCandidate[]> {
  if (process.env.NODE_ENV === "test" || !env.OPENAI_API_KEY || env.OPENAI_API_KEY === "your-openai-key") {
    return [];
  }

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are EcoGuardian AI's recommendation engine.",
            "Generate only practical sustainability recommendations grounded in the provided data.",
            "Return JSON with recommendations as an array. Each recommendation must include title, description, reason, category, carbonSaving, costSaving, timeSavingMin, difficulty, source, confidence, adoptionProbability, impactScore, priorityScore, and metadata.",
            "Do not repeat the existing recommendations in the prompt."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            trigger,
            behavior,
            prediction: mapPrediction(prediction),
            hotspots: currentCandidates.slice(0, 6).map((item) => ({ title: item.title, category: item.category, carbonSaving: item.carbonSaving })),
            environmental: environmental ?? null,
            preferences: context.profile?.preferences ?? null,
            city: context.profile?.city ?? null,
            recentInsights: summarizeBehaviorSnippets(context)
          })
        }
      ]
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    if (!Array.isArray(parsed.recommendations)) {
      return [];
    }

    return parsed.recommendations
      .map((item: any) => createCandidate({
        category: normalizeCategory(item.category),
        title: String(item.title ?? "Suggested sustainability action"),
        description: String(item.description ?? item.reason ?? ""),
        reason: String(item.reason ?? item.description ?? "AI-generated recommendation"),
        carbonSaving: safeNumber(item.carbonSaving ?? item.impactKg ?? 0),
        costSaving: safeNumber(item.costSaving ?? item.moneySaving ?? 0),
        timeSavingMin: safeNumber(item.timeSavingMin ?? item.timeSaving ?? 0),
        difficulty: normalizeDifficulty(item.difficulty),
        source: "llm",
        confidenceOverride: clamp01(safeNumber(item.confidence ?? 0.72)),
        adoptionProbabilityOverride: clamp01(safeNumber(item.adoptionProbability ?? 0.55)),
        impactScoreOverride: safeNumber(item.impactScore ?? 0),
        priorityScoreOverride: safeNumber(item.priorityScore ?? 0),
        metadata: { trigger, source: "llm", raw: item }
      }))
      .filter((item: RecommendationCandidate) => item.title && item.description);
  } catch (error) {
    console.warn("AI recommendation enrichment failed, using rule engine only:", error);
    return [];
  }
}

function rankCandidates(candidates: RecommendationCandidate[], context: RecommendationContext, userId?: string) {
  const adoptionRate = summarizeLearning(context.events).adoptionRate;
  const confidenceMultiplier = context.profile?.currentEcoScore ? Math.max(0.85, Math.min(1.1, context.profile.currentEcoScore / 100)) : 1;

  return candidates
    .map((candidate) => {
      const deduplicationHash = hashRecommendation(candidate.category, candidate.title, candidate.source, userId);
      const carbonSaving = round(candidate.carbonSaving);
      const costSaving = round(candidate.costSaving);
      const timeSavingMin = round(candidate.timeSavingMin);
      const confidence = clamp01(candidate.confidence ?? Math.min(0.95, 0.45 + Math.min(0.4, carbonSaving / 15)));
      const adoptionProbability = clamp01(
        candidate.adoptionProbability ??
          Math.min(0.92, 0.25 + adoptionRate * 0.45 + (candidate.difficulty === "easy" ? 0.18 : candidate.difficulty === "medium" ? 0.08 : -0.03))
      );
      const impactScore = clamp100(
        candidate.impactScore ??
          Math.round((carbonSaving * 11 + costSaving / 30 + timeSavingMin / 8 + confidence * 18) * confidenceMultiplier)
      );
      const priorityScore = clamp100(
        candidate.priorityScore ?? Math.round(impactScore * 0.55 + adoptionProbability * 35 + confidence * 20)
      );

      return {
        ...candidate,
        carbonSaving,
        costSaving,
        timeSavingMin,
        confidence,
        adoptionProbability,
        impactScore,
        priorityScore,
        deduplicationHash
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || b.impactScore - a.impactScore || b.carbonSaving - a.carbonSaving)
    .filter((candidate, index, array) => array.findIndex((item) => item.deduplicationHash === candidate.deduplicationHash) === index);
}

async function persistRecommendations(userId: string, recommendations: ReturnType<typeof rankCandidates>, limit: number) {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 21);

  const active = recommendations.slice(0, limit);
  const saved = [] as RecommendationCard[];

  for (const recommendation of active) {
    const payload = {
      userId,
      category: recommendation.category,
      title: recommendation.title,
      description: recommendation.description,
      potentialSaving: recommendation.carbonSaving,
      priority: Math.max(1, Math.min(5, 6 - Math.round(recommendation.priorityScore / 20))),
      impactScore: recommendation.impactScore,
      confidence: recommendation.confidence,
      adoptionProbability: recommendation.adoptionProbability,
      costSavings: recommendation.costSaving,
      timeSavingsMin: recommendation.timeSavingMin,
      difficulty: recommendation.difficulty,
      source: recommendation.source,
      reasoning: {
        reason: recommendation.reason,
        metadata: recommendation.metadata
      } as any,
      metadata: recommendation.metadata as any,
      deduplicationHash: recommendation.deduplicationHash,
      expiresAt,
      shownAt: now
    };

    const record = await prisma.recommendation.upsert({
      where: { deduplicationHash: recommendation.deduplicationHash },
      update: {
        ...payload,
        completedAt: null
      } as any,
      create: payload as any
    });

    saved.push(serializeRecommendation(record));
  }

  return saved;
}

export async function refreshRecommendationCache(userId: string, trigger = "manual") {
  return refreshRecommendationEngine(userId, { trigger });
}

export async function getRecommendationStats(userId: string) {
  const context = await loadContext(userId);
  const bundle = await buildBundle(context, undefined, "stats", userId);
  return bundle;
}

function toBundleCard(candidate: ReturnType<typeof rankCandidates>[number]): RecommendationCard {
  return {
    id: candidate.deduplicationHash,
    category: candidate.category,
    title: candidate.title,
    description: candidate.description,
    reason: candidate.reason,
    priorityScore: candidate.priorityScore ?? 0,
    impactScore: candidate.impactScore ?? 0,
    confidence: candidate.confidence ?? 0.5,
    adoptionProbability: candidate.adoptionProbability ?? 0.5,
    carbonSaving: candidate.carbonSaving,
    costSaving: candidate.costSaving,
    timeSavingMin: candidate.timeSavingMin,
    difficulty: candidate.difficulty,
    source: candidate.source,
    status: "active",
    metadata: candidate.metadata,
    deduplicationHash: candidate.deduplicationHash,
    expiresAt: null,
    createdAt: null
  };
}

function serializeRecommendation(record: any): RecommendationCard {
  return {
    id: record.id,
    category: record.category,
    title: record.title,
    description: record.description,
    reason: typeof record.reasoning === "object" && record.reasoning ? String((record.reasoning as any).reason ?? record.description) : record.description,
    priorityScore: round(safeNumber(record.impactScore ?? record.priority * 20)),
    impactScore: round(safeNumber(record.impactScore ?? record.potentialSaving * 10)),
    confidence: clamp01(safeNumber(record.confidence ?? 0.5)),
    adoptionProbability: clamp01(safeNumber(record.adoptionProbability ?? 0.5)),
    carbonSaving: round(safeNumber(record.potentialSaving)),
    costSaving: round(safeNumber(record.costSavings ?? 0)),
    timeSavingMin: round(safeNumber(record.timeSavingsMin ?? 0)),
    difficulty: normalizeDifficulty(record.difficulty),
    source: normalizeSource(record.source),
    status: record.completedAt ? "completed" : record.acceptedAt ? "accepted" : "active",
    metadata: (record.metadata as Record<string, unknown>) ?? {},
    deduplicationHash: record.deduplicationHash ?? hashRecommendation(record.category, record.title, record.source ?? "rule", record.userId),
    expiresAt: record.expiresAt ? new Date(record.expiresAt).toISOString() : null,
    createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : null
  };
}

function createCandidate(input: {
  category: CarbonCategory | null;
  title: string;
  description: string;
  reason: string;
  carbonSaving: number;
  costSaving: number;
  timeSavingMin: number;
  difficulty: "easy" | "medium" | "hard";
  source: RecommendationCandidate["source"];
  metadata: Record<string, unknown>;
  confidenceOverride?: number;
  adoptionProbabilityOverride?: number;
  impactScoreOverride?: number;
  priorityScoreOverride?: number;
}) {
  return {
    category: input.category,
    title: input.title,
    description: input.description,
    reason: input.reason,
    carbonSaving: round(input.carbonSaving),
    costSaving: round(input.costSaving),
    timeSavingMin: round(input.timeSavingMin),
    difficulty: input.difficulty,
    source: input.source,
    confidence: input.confidenceOverride,
    adoptionProbability: input.adoptionProbabilityOverride,
    impactScore: input.impactScoreOverride,
    priorityScore: input.priorityScoreOverride,
    metadata: input.metadata
  } satisfies RecommendationCandidate;
}

function normalizeLegacyRecommendation(
  recommendation: ReturnType<typeof buildRecommendations>[number],
  category: CarbonCategory,
  source: RecommendationCandidate["source"],
  metadata: Record<string, unknown>
): RecommendationCandidate {
  return createCandidate({
    category,
    title: recommendation.title,
    description: recommendation.description,
    reason: recommendation.description,
    carbonSaving: safeNumber(recommendation.potentialSaving),
    costSaving: safeNumber((recommendation as any).costSaving ?? 0),
    timeSavingMin: safeNumber((recommendation as any).monthlyEstimate ?? 0) / 6,
    difficulty: recommendation.potentialSaving > 4 ? "medium" : "easy",
    source,
    metadata
  });
}

function buildCoachSummary(
  behavior: ReturnType<typeof analyzeBehavior>,
  prediction: PredictionSnapshot,
  recommendations: RecommendationCard[],
  learning: ReturnType<typeof summarizeLearning>
) {
  const top = recommendations[0];
  const predictionDelta = prediction.monthlyCarbonKg > behavior.behaviorSummary.orderCount * 8 ? "Emissions are likely to rise unless the current ordering pattern changes." : "Current habits are manageable, but there is still room for easy savings.";
  const adoptionLine = learning.adoptionRate > 0.5 ? "You tend to adopt advice when it is simple and cost-saving." : "The engine should prioritize low-friction, high-confidence actions first.";

  return [
    top ? `Top recommendation: ${top.title}.` : "No active recommendation could be ranked above the rest.",
    predictionDelta,
    adoptionLine,
    behavior.insights[0],
    `Expected weekly emissions: ${prediction.weeklyCarbonKg} kg CO2e.`
  ].filter(Boolean).join(" ");
}

function summarizeLearning(events: RecommendationContext["events"]) {
  const shown = events.filter((event) => event.eventType === "SHOWN").length;
  const clicked = events.filter((event) => event.eventType === "CLICKED").length;
  const ignored = events.filter((event) => event.eventType === "IGNORED" || event.eventType === "DISMISSED").length;
  const adopted = events.filter((event) => event.eventType === "ADOPTED").length;
  const completed = events.filter((event) => event.eventType === "COMPLETED").length;
  return {
    shown,
    clicked,
    ignored,
    adopted,
    completed,
    adoptionRate: shown > 0 ? round(adopted / shown) : 0,
    completionRate: adopted > 0 ? round(completed / adopted) : 0
  };
}

function buildFallbackCoachReply(bundle: RecommendationBundle, messages: CoachMessage[]) {
  const latest = messages[messages.length - 1]?.content ?? "How can I reduce emissions?";
  const top = bundle.recommendations[0];
  const hotspot = bundle.hotspots[0];
  return [
    `I reviewed your recent activity and the strongest hotspot is ${hotspot ? hotspot.category.replaceAll("_", " ") : "your mixed activity profile"}.`,
    top ? `Start with: ${top.title}.` : "Start with one low-friction habit swap this week.",
    `That should save about ${top ? top.carbonSaving : 1} kg CO2e and roughly ₹${top ? top.costSaving : 0}.`,
    `You asked: ${latest}`
  ].join(" ");
}

function normalizePrediction(prediction: Partial<PredictionSnapshot> & { drivers?: unknown }): PredictionSnapshot {
  const rawDrivers = Array.isArray(prediction.drivers) ? prediction.drivers : [];
  const drivers = rawDrivers.map((driver) => {
    if (driver && typeof driver === "object") {
      const item = driver as { category?: unknown; kg?: unknown };
      return {
        category: typeof item.category === "string" ? item.category : "unknown",
        kg: round(safeNumber(item.kg))
      };
    }
    return { category: String(driver), kg: 0 };
  });

  return {
    dailyCarbonKg: round(safeNumber(prediction.dailyCarbonKg)),
    weeklyCarbonKg: round(safeNumber(prediction.weeklyCarbonKg)),
    monthlyCarbonKg: round(safeNumber(prediction.monthlyCarbonKg)),
    futureFootprintKg: round(safeNumber(prediction.futureFootprintKg)),
    confidence: clamp01(safeNumber(prediction.confidence)),
    modelVersion: typeof prediction.modelVersion === "string" ? prediction.modelVersion : "local-v1",
    drivers
  };
}

function mapPrediction(prediction: PredictionSnapshot) {
  return {
    dailyCarbonKg: round(safeNumber(prediction.dailyCarbonKg)),
    weeklyCarbonKg: round(safeNumber(prediction.weeklyCarbonKg)),
    monthlyCarbonKg: round(safeNumber(prediction.monthlyCarbonKg)),
    futureFootprintKg: round(safeNumber(prediction.futureFootprintKg)),
    confidence: clamp01(safeNumber(prediction.confidence)),
    modelVersion: prediction.modelVersion,
    drivers: prediction.drivers
  };
}

function summarizeBehaviorSnippets(context: RecommendationContext) {
  return [
    `orders:${context.orders.length}`,
    `records:${context.records.length}`,
    `alerts:${context.alerts.length}`,
    `topMerchant:${context.orders.find((order) => order.merchantName)?.merchantName ?? "none"}`
  ];
}

function sumCategory(records: RecommendationContext["records"], category: CarbonCategory) {
  return round(records.filter((record) => record.category === category).reduce((sum, record) => sum + safeNumber(record.totalKgCo2e), 0));
}

function normalizeCategory(value: unknown): CarbonCategory | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  const allowed = new Set([
    "FOOD_DELIVERY",
    "GROCERY_DELIVERY",
    "ECOMMERCE",
    "FLIGHT",
    "TRANSPORT",
    "ELECTRICITY",
    "FOOD",
    "WASTE",
    "WATER",
    "LIFESTYLE"
  ]);
  return allowed.has(upper) ? (upper as CarbonCategory) : null;
}

function normalizeDifficulty(value: unknown): "easy" | "medium" | "hard" {
  if (value === "hard") return "hard";
  if (value === "medium") return "medium";
  return "easy";
}

function normalizeSource(value: unknown): RecommendationCandidate["source"] {
  if (value === "behavioral" || value === "predictive" || value === "environmental" || value === "llm") {
    return value;
  }
  return "rule";
}

function hashRecommendation(category: CarbonCategory | null, title: string, source: string, userId?: string) {
  return crypto.createHash("sha1").update(`${userId ?? "none"}|${category ?? "none"}|${title}|${source}`).digest("hex");
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, round(value)));
}

function clamp100(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
