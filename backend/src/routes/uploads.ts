import { CarbonCategory } from "@prisma/client";
import { Router } from "express";
import multer from "multer";

import { prisma } from "../config/prisma.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import {
  calculateDeliveryCarbon,
  calculateElectricityCarbon,
  calculateFlightCarbon,
  calculateShoppingCarbonAdvanced
} from "../services/carbonEngine.js";
import { analyzeScreenshotOrPdf } from "../services/ocrPipeline.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function createCarbonRecordFromExtraction(userId: string, extracted: any) {
  const categoryStr = extracted.carbonCategory as string;
  if (!categoryStr || categoryStr === "UNKNOWN") return null;

  const category = categoryStr as CarbonCategory;
  if (!Object.values(CarbonCategory).includes(category)) return null;

  let totalKgCo2e = 0;
  let transportKg = 0;
  let packagingKg = 0;
  let storageKg = 0;

  if (category === "ELECTRICITY") {
    totalKgCo2e = calculateElectricityCarbon(extracted.units ?? 214, "india");
  } else if (category === "FLIGHT") {
    totalKgCo2e = calculateFlightCarbon(extracted.distance ?? 1000, "economy", 1);
  } else if (category === "FOOD_DELIVERY" || category === "GROCERY_DELIVERY") {
    const carbon = calculateDeliveryCarbon({
      category,
      distanceKm: extracted.distance ?? 3.0,
      vehicleType: "UNKNOWN"
    });
    totalKgCo2e = carbon.totalKgCo2e;
    transportKg = carbon.transportKg;
    packagingKg = carbon.packagingKg;
    storageKg = carbon.storageKg;
  } else if (category === "ECOMMERCE") {
    const carbon = calculateShoppingCarbonAdvanced("electronics", 1, "standard", "standard");
    totalKgCo2e = carbon.totalKgCo2e;
    packagingKg = carbon.packagingKg;
    transportKg = carbon.deliveryKg;
    storageKg = carbon.manufacturingKg;
  } else {
    totalKgCo2e = 0;
  }

  if (totalKgCo2e <= 0) return null;

  return prisma.carbonRecord.create({
    data: {
      userId,
      category,
      totalKgCo2e,
      transportKg,
      packagingKg,
      storageKg,
      confidence: 0.86,
      occurredAt: new Date(extracted.date || new Date())
    }
  });
}

router.post("/screenshot", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { code: "MISSING_FILE", message: "File is required." } });
  }
  const fileUrl = `s3://pending/${req.file.originalname ?? "screenshot"}`;
  const extracted = await analyzeScreenshotOrPdf({ userId: req.user!.id, fileUrl, sourceType: "screenshot" });
  const saved = await prisma.ocrData.create({ data: { userId: req.user!.id, sourceType: "screenshot", fileUrl, rawText: "", extracted } });
  
  // Persist corresponding carbon ledger entry
  await createCarbonRecordFromExtraction(req.user!.id, extracted);

  res.status(201).json(saved);
});

router.post("/pdf", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { code: "MISSING_FILE", message: "File is required." } });
  }
  const fileUrl = `s3://pending/${req.file.originalname ?? "document.pdf"}`;
  const extracted = await analyzeScreenshotOrPdf({ userId: req.user!.id, fileUrl, sourceType: "pdf" });
  const saved = await prisma.pdfData.create({ data: { userId: req.user!.id, fileUrl, documentType: String(extracted.carbonCategory), extracted } });
  
  // Persist corresponding carbon ledger entry
  await createCarbonRecordFromExtraction(req.user!.id, extracted);

  res.status(201).json(saved);
});

export default router;
