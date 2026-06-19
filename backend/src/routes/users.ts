import { Router } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const preferencesSchema = z.object({
  preferences: z.record(z.any()).optional(),
  home: z.object({ lat: z.number(), lng: z.number() }).optional(),
  office: z.object({ lat: z.number(), lng: z.number() }).optional()
});

router.post("/preferences", requireAuth, async (req: AuthenticatedRequest, res) => {
  const input = preferencesSchema.parse(req.body);

  let homeLocation: any = null;
  let officeLocation: any = null;

  if (input.home) {
    homeLocation = input.home;
  }
  if (input.office) {
    officeLocation = input.office;
  }

  const profile = await prisma.carbonProfile.upsert({
    where: { userId: req.user!.id },
    update: {
      ...(input.preferences ? { preferences: input.preferences } : {}),
      ...(homeLocation ? { encryptedHome: homeLocation } : {}),
      ...(officeLocation ? { encryptedOffice: officeLocation } : {})
    },
    create: {
      userId: req.user!.id,
      preferences: input.preferences || {},
      encryptedHome: homeLocation || {},
      encryptedOffice: officeLocation || {}
    }
  });

  res.json({ success: true, profile });
});

router.post("/delete-data", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  // Transaction to clean all user tables
  await prisma.$transaction([
    prisma.carbonRecord.deleteMany({ where: { userId } }),
    prisma.order.deleteMany({ where: { userId } }),
    prisma.route.deleteMany({ where: { userId } }),
    prisma.notificationEvent.deleteMany({ where: { userId } }),
    prisma.gmailData.deleteMany({ where: { userId } }),
    prisma.ocrData.deleteMany({ where: { userId } }),
    prisma.pdfData.deleteMany({ where: { userId } }),
    prisma.alert.deleteMany({ where: { userId } }),
    prisma.recommendation.deleteMany({ where: { userId } }),
    prisma.prediction.deleteMany({ where: { userId } }),
    prisma.ecoScore.deleteMany({ where: { userId } })
  ]);

  res.json({ success: true, message: "All user data deleted successfully" });
});

router.post("/export-data", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const [
    carbonRecords,
    orders,
    notifications,
    gmailData,
    ocrData,
    pdfData,
    alerts,
    recommendations,
    predictions,
    ecoScores
  ] = await Promise.all([
    prisma.carbonRecord.findMany({ where: { userId } }),
    prisma.order.findMany({ where: { userId } }),
    prisma.notificationEvent.findMany({ where: { userId } }),
    prisma.gmailData.findMany({ where: { userId } }),
    prisma.ocrData.findMany({ where: { userId } }),
    prisma.pdfData.findMany({ where: { userId } }),
    prisma.alert.findMany({ where: { userId } }),
    prisma.recommendation.findMany({ where: { userId } }),
    prisma.prediction.findMany({ where: { userId } }),
    prisma.ecoScore.findMany({ where: { userId } })
  ]);

  res.json({
    userId,
    exportDate: new Date(),
    data: {
      carbonRecords,
      orders,
      notifications,
      gmailData,
      ocrData,
      pdfData,
      alerts,
      recommendations,
      predictions,
      ecoScores
    }
  });
});

export default router;
