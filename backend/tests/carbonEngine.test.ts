import { CarbonCategory, VehicleType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  calculateDeliveryCarbon,
  calculateEcoScore,
  calculateElectricityCarbon,
  calculateTransportCarbon,
  calculateFlightCarbon,
  calculateShoppingCarbonAdvanced,
  calculateFoodCarbon,
  calculateFoodWasteCarbon,
  calculateFoodDeliveryCarbon,
  calculateGroceryDeliveryCarbon
} from "../src/services/carbonEngine.js";
import { parseGmailMessageDetails } from "../src/services/gmailParser.js";
import { analyzeScreenshotOrPdf } from "../src/services/ocrPipeline.js";
import { predictDeliveryVehicle } from "../src/services/vehiclePrediction.js";
import { analyzeNotification } from "../src/services/notificationIntelligence.js";

describe("backend carbon engine", () => {
  it("calculates delivery emissions", () => {
    const result = calculateDeliveryCarbon({
      category: CarbonCategory.FOOD_DELIVERY,
      distanceKm: 8,
      vehicleType: VehicleType.PETROL_BIKE
    });
    expect(result.transportKg).toBe(0.656);
    expect(result.totalKgCo2e).toBeGreaterThan(0.8);
  });

  it("creates eco score bands", () => {
    expect(calculateEcoScore({ monthlyKg: 160, greenActions: 0, publicTransportTrips: 0 }).band).toBe("Green Citizen");
  });

  it("calculates electricity carbon emissions accurately by region", () => {
    expect(calculateElectricityCarbon(100, "india")).toBe(71.6);
    expect(calculateElectricityCarbon(100, "eu")).toBe(23.1);
    expect(calculateElectricityCarbon(100, "usa")).toBe(38.6);
    expect(calculateElectricityCarbon(100, "nonexistent")).toBe(47.5);
  });

  it("calculates transport carbon emissions based on mode and distance", () => {
    expect(calculateTransportCarbon(10, "car")).toBe(1.92);
    expect(calculateTransportCarbon(50, "metro")).toBe(1.4);
    expect(calculateTransportCarbon(100, "walking")).toBe(0);
  });

  it("calculates flight carbon emissions factoring in cabin class and passengers", () => {
    expect(calculateFlightCarbon(1000, "economy", 1)).toBe(255);
    expect(calculateFlightCarbon(1000, "business", 2)).toBe(1479);
    expect(calculateFlightCarbon(500, "first", 1)).toBe(510);
  });

  it("calculates advanced shopping carbon emissions including packaging and delivery", () => {
    const res = calculateShoppingCarbonAdvanced("electronics", 1, "standard", "standard");
    expect(res.manufacturingKg).toBe(28);
    expect(res.packagingKg).toBe(0.45);
    expect(res.deliveryKg).toBe(0.7);
    expect(res.totalKgCo2e).toBe(29.15);

    const expressRes = calculateShoppingCarbonAdvanced("fashion", 2, "express", "heavy");
    expect(expressRes.manufacturingKg).toBe(16);
    expect(expressRes.packagingKg).toBe(2.4);
    expect(expressRes.deliveryKg).toBe(1.4);
    expect(expressRes.totalKgCo2e).toBe(19.8);
  });

  it("calculates food and food waste carbon emissions", () => {
    expect(calculateFoodCarbon(3, "vegetarian")).toBe(3.3);
    expect(calculateFoodCarbon(1, "nonVegetarian")).toBe(5.4);
    expect(calculateFoodWasteCarbon(4.5)).toBe(11.25);
  });

  it("calculates food delivery carbon emissions accurately", () => {
    const res = calculateFoodDeliveryCarbon(5, "PETROL_BIKE", 1.2);
    expect(res.transportKg).toBe(0.41);
    expect(res.packagingKg).toBe(0.264);
    expect(res.totalKgCo2e).toBe(0.724);
  });

  it("calculates grocery delivery carbon emissions accurately", () => {
    const res = calculateGroceryDeliveryCarbon(2, "ELECTRIC_BIKE", 1.5);
    expect(res.transportKg).toBe(0.036);
    expect(res.storageKg).toBe(0.27);
    expect(res.totalKgCo2e).toBe(0.686);
  });

  it("predicts vehicle type based on delivery parameters", () => {
    const p1 = predictDeliveryVehicle({ platform: "ZEPTO", distanceKm: 1.5, hour: 12 });
    expect(p1.vehicleType).toBe("ELECTRIC_BIKE");
    expect(p1.confidence).toBe(0.85);

    const p2 = predictDeliveryVehicle({ platform: "SWIGGY", distanceKm: 5, hour: 20 });
    expect(p2.vehicleType).toBe("ELECTRIC_BIKE");

    const p3 = predictDeliveryVehicle({ platform: "AMAZON", distanceKm: 15, hour: 10 });
    expect(p3.vehicleType).toBe("PETROL_CAR");
  });

  it("analyzes notification payload intelligently", async () => {
    const res1 = await analyzeNotification({
      packageName: "com.application.zomato",
      title: "Order Confirmed",
      body: "Your order from Domino's Pizza has been confirmed",
      timestamp: new Date().toISOString()
    });
    expect(res1.platform).toBe("ZOMATO");
    expect(res1.orderStatus).toBe("CONFIRMED");
    expect(res1.restaurantName?.toLowerCase()).toContain("domino");

    const res2 = await analyzeNotification({
      packageName: "com.grofers.customerapp",
      title: "Order Arriving",
      body: "Your order from Sector 2 Warehouse is arriving in 5 minutes",
      timestamp: new Date().toISOString()
    });
    expect(res2.platform).toBe("BLINKIT");
    expect(res2.orderStatus).toBe("ARRIVING_SOON");
    expect(res2.storeName).toBe("Sector 2 Store");
  });
});

describe("backend heuristic parsers", () => {
  it("parses electricity bills from fileUrl via OCR pipeline", async () => {
    const res = await analyzeScreenshotOrPdf({
      userId: "test-user-id",
      fileUrl: "s3://pending/my-electricity-bill-may.pdf",
      sourceType: "pdf"
    });
    expect(res.carbonCategory).toBe("ELECTRICITY");
    expect(res.merchant).toBe("Tata Power");
    expect(res.units).toBe(214);
    expect(res.amount).toBe(1680);
  });

  it("parses food delivery details from fileUrl via OCR pipeline", async () => {
    const res = await analyzeScreenshotOrPdf({
      userId: "test-user-id",
      fileUrl: "s3://pending/swiggy_order.jpg",
      sourceType: "screenshot"
    });
    expect(res.carbonCategory).toBe("FOOD_DELIVERY");
    expect(res.merchant).toBe("Swiggy");
    expect(res.products).toContain("Paneer Butter Masala");
  });

  it("classifies and parses flight emails via Gmail parser", () => {
    const res = parseGmailMessageDetails({
      sender: "bookings@goindigo.in",
      subject: "IndiGo flight booking DEL to BOM confirmed",
      body: "PNR 6E2134 departs DEL on 18 Jun 2026. Passenger: 1"
    });
    expect(res.category).toBe("FLIGHT");
    expect(res.merchant).toBe("IndiGo");
    expect(res.distance).toBe(1148);
  });
});
