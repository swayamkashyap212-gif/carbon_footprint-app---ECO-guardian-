import { Router } from "express";
import { z } from "zod";

import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import {
  answerSustainabilityCoach,
  getRecommendationDashboard,
  recordRecommendationFeedback,
  refreshRecommendationEngine,
  RecommendationEventType
} from "../services/recommendationEngine.js";

const router = Router();

const environmentalSchema = z
  .object({
    weather: z.string().optional(),
    temperature: z.number().optional(),
    traffic: z.number().optional(),
    airQuality: z.number().optional(),
    season: z.string().optional()
  })
  .optional();

const generateSchema = z.object({
  limit: z.number().int().min(1).max(12).default(8),
  trigger: z.string().default("manual"),
  environmental: environmentalSchema
});

const feedbackSchema = z.object({
  recommendationId: z.string().min(1),
  eventType: z.enum(["SHOWN", "CLICKED", "IGNORED", "ADOPTED", "COMPLETED", "DISMISSED"] as [RecommendationEventType, ...RecommendationEventType[]]),
  note: z.string().optional(),
  context: z.record(z.unknown()).optional()
});

const coachSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) })).min(1),
  environmental: environmentalSchema
});

router.get("/dashboard", requireAuth, async (req: AuthenticatedRequest, res) => {
  const dashboard = await getRecommendationDashboard(req.user!.id);
  res.json(dashboard);
});

router.post("/generate", requireAuth, async (req: AuthenticatedRequest, res) => {
  const input = generateSchema.parse(req.body ?? {});
  const bundle = await refreshRecommendationEngine(req.user!.id, {
    limit: input.limit,
    trigger: input.trigger,
    environmental: input.environmental
  });
  res.status(201).json(bundle);
});

router.post("/feedback", requireAuth, async (req: AuthenticatedRequest, res) => {
  const input = feedbackSchema.parse(req.body);
  const updated = await recordRecommendationFeedback(req.user!.id, input);
  res.status(201).json(updated);
});

router.post("/coach", requireAuth, async (req: AuthenticatedRequest, res) => {
  const input = coachSchema.parse(req.body);
  const answer = await answerSustainabilityCoach(req.user!.id, input.messages, input.environmental);
  res.json(answer);
});

export default router;
