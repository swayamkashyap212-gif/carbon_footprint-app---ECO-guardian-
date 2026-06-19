import { CarbonCategory } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import {
  calculateDeliveryCarbon,
  calculateElectricityCarbon,
  calculateFlightCarbon,
  calculateShoppingCarbonAdvanced
} from "../services/carbonEngine.js";
import { parseGmailMessageDetails } from "../services/gmailParser.js";

const router = Router();

const messageSchema = z.object({
  messageHash: z.string(),
  sender: z.string(),
  subject: z.string(),
  body: z.string()
});

async function createCarbonRecordFromGmail(userId: string, details: any) {
  const categoryStr = details.category as string;
  if (!categoryStr || categoryStr === "UNKNOWN" || categoryStr === "HOTEL") return null;
  
  const category = categoryStr as CarbonCategory;
  if (!Object.values(CarbonCategory).includes(category)) return null;

  let totalKgCo2e = 0;
  let transportKg = 0;
  let packagingKg = 0;
  let storageKg = 0;

  if (category === "ELECTRICITY") {
    totalKgCo2e = calculateElectricityCarbon(details.units ?? 214, "india");
  } else if (category === "FLIGHT") {
    totalKgCo2e = calculateFlightCarbon(details.distance ?? 1000, "economy", 1);
  } else if (category === "FOOD_DELIVERY" || category === "GROCERY_DELIVERY") {
    const carbon = calculateDeliveryCarbon({
      category,
      distanceKm: details.distance ?? 3.0,
      vehicleType: "UNKNOWN"
    });
    totalKgCo2e = carbon.totalKgCo2e;
    transportKg = carbon.transportKg;
    packagingKg = carbon.packagingKg;
    storageKg = carbon.storageKg;
  } else if (category === "ECOMMERCE") {
    const productCategory = details.productCategory || details.itemCategory || details.subcategory || "electronics";
    const carbon = calculateShoppingCarbonAdvanced(productCategory, 1, "standard", "standard");
    totalKgCo2e = carbon.totalKgCo2e;
    packagingKg = carbon.packagingKg;
    transportKg = carbon.deliveryKg;
    storageKg = carbon.manufacturingKg;
  }

  return prisma.carbonRecord.create({
    data: {
      userId,
      category,
      totalKgCo2e,
      transportKg,
      packagingKg,
      storageKg,
      confidence: 0.86,
      occurredAt: new Date(details.timestamp || new Date())
    }
  });
}

router.post("/messages/analyze", requireAuth, async (req: AuthenticatedRequest, res) => {
  const message = messageSchema.parse(req.body);
  const details = parseGmailMessageDetails(message);
  const category = details.category;

  // Check for existing record for this user first to avoid cross-user overwrite
  const existing = await prisma.gmailData.findFirst({
    where: { messageHash: message.messageHash, userId: req.user!.id }
  });

  let saved;
  if (existing) {
    saved = await prisma.gmailData.update({
      where: { id: existing.id },
      data: { extracted: details as any }
    });
  } else {
    saved = await prisma.gmailData.create({
      data: {
        userId: req.user!.id,
        messageHash: message.messageHash,
        sender: message.sender,
        subject: message.subject,
        extracted: details as any,
        category: category === "UNKNOWN" || category === "HOTEL" ? null : (category as any)
      }
    });
  }

  // Persist corresponding carbon ledger entry
  await createCarbonRecordFromGmail(req.user!.id, details);

  res.status(201).json(saved);
});

export default router;
