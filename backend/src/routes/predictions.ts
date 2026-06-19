import { Router } from "express";

import { prisma } from "../config/prisma.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { generatePrediction } from "../services/predictionEngine.js";
import { enqueueRecommendationRefresh } from "../services/jobQueues.js";

const router = Router();

router.post("/generate", requireAuth, async (req: AuthenticatedRequest, res) => {
  const records = await prisma.carbonRecord.findMany({
    where: { userId: req.user!.id },
    orderBy: { occurredAt: "desc" },
    take: 180
  });
  const prediction = generatePrediction(records);
  const saved = await prisma.prediction.create({ data: { userId: req.user!.id, ...prediction } });
  void enqueueRecommendationRefresh(req.user!.id, "prediction_generated", "new forecast computed").catch(() => undefined);
  res.status(201).json(saved);
});

export default router;
