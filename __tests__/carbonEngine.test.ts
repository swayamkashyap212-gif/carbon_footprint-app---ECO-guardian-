import {
  calculateElectricityCarbon,
  calculateFoodWasteCarbon,
  calculateTransportCarbon,
  calculateFlightCarbon,
  estimateFlightDistanceKm,
  calculateFlightCarbonByRoute,
  calculateShoppingCarbonAdvanced,
  calculateLegacyFlightCarbon,
  calculateFoodCarbon,
  calculateShoppingCarbon,
  calculateFoodDeliveryCarbon,
  calculateGroceryDeliveryCarbon,
  calculateRideBookingCarbon,
  calculateDeliveryCarbon,
  predictCarbon,
  classifyScore,
  getSustainabilityLevel,
  calculateGreenScore,
  calculateTransportCarbonByFuel,
  calculateLifetimeCarbon,
  calculateLifetimeStats,
  calculateTravelEfficiencyScore
} from "../src/services/carbonEngine";

describe("carbonEngine", () => {
  describe("calculateElectricityCarbon", () => {
    it("calculates electricity emissions by regional factor", () => {
      expect(calculateElectricityCarbon(100, "india")).toBe(71.6);
    });

    it("uses global factor for unknown region", () => {
      const result = calculateElectricityCarbon(100, "unknown_region");
      expect(result).toBeGreaterThan(0);
    });

    it("handles zero input", () => {
      expect(calculateElectricityCarbon(0, "india")).toBe(0);
    });

    it("handles negative input", () => {
      const result = calculateElectricityCarbon(-50, "india");
      expect(result).toBeLessThan(0);
    });
  });

  describe("calculateTransportCarbon", () => {
    it("calculates transport emissions by mode", () => {
      expect(calculateTransportCarbon(10, "metro")).toBe(0.28);
      expect(calculateTransportCarbon(10, "walking")).toBe(0);
    });

    it("calculates car emissions correctly", () => {
      const result = calculateTransportCarbon(10, "car");
      expect(result).toBeGreaterThan(0);
    });

    it("calculates bus emissions correctly", () => {
      const result = calculateTransportCarbon(10, "bus");
      expect(result).toBeGreaterThan(0);
    });

    it("handles zero distance", () => {
      expect(calculateTransportCarbon(0, "car")).toBe(0);
    });

    it("handles unknown mode", () => {
      const result = calculateTransportCarbon(10, "unknown_mode" as any);
      expect(result).toBe(0);
    });
  });

  describe("calculateFlightCarbon", () => {
    it("calculates flight emissions for economy class", () => {
      const result = calculateFlightCarbon(1000, "economy", 1);
      expect(result).toBeGreaterThan(0);
    });

    it("calculates flight emissions for business class", () => {
      const economy = calculateFlightCarbon(1000, "economy", 1);
      const business = calculateFlightCarbon(1000, "business", 1);
      expect(business).toBeGreaterThan(economy);
    });

    it("handles multiple passengers", () => {
      const single = calculateFlightCarbon(1000, "economy", 1);
      const double = calculateFlightCarbon(1000, "economy", 2);
      expect(double).toBe(single * 2);
    });

    it("handles zero distance", () => {
      expect(calculateFlightCarbon(0, "economy", 1)).toBe(0);
    });
  });

  describe("estimateFlightDistanceKm", () => {
    it("returns known route distance", () => {
      const distance = estimateFlightDistanceKm("DEL", "BOM");
      expect(distance).toBe(1148);
    });

    it("returns reverse route distance", () => {
      const distance = estimateFlightDistanceKm("BOM", "DEL");
      expect(distance).toBe(1148);
    });

    it("calculates great circle distance for unknown routes", () => {
      const distance = estimateFlightDistanceKm("JFK", "LAX");
      expect(distance).toBeGreaterThan(0);
    });

    it("returns 1000 for completely unknown airports", () => {
      const distance = estimateFlightDistanceKm("XXX", "YYY");
      expect(distance).toBe(1000);
    });
  });

  describe("calculateFlightCarbonByRoute", () => {
    it("returns distance and carbon for known route", () => {
      const result = calculateFlightCarbonByRoute("DEL", "BOM");
      expect(result.distanceKm).toBe(1148);
      expect(result.kgCo2e).toBeGreaterThan(0);
    });
  });

  describe("calculateShoppingCarbonAdvanced", () => {
    it("calculates shopping carbon with standard packaging", () => {
      const result = calculateShoppingCarbonAdvanced("electronics", 1, "standard");
      expect(result.totalKgCo2e).toBeGreaterThan(0);
      expect(result.manufacturingKg).toBeGreaterThanOrEqual(0);
      expect(result.packagingKg).toBeGreaterThanOrEqual(0);
    });

    it("calculates pickup delivery as zero delivery carbon", () => {
      const result = calculateShoppingCarbonAdvanced("electronics", 1, "pickup");
      expect(result.deliveryKg).toBe(0);
    });

    it("calculates express delivery as higher carbon", () => {
      const standard = calculateShoppingCarbonAdvanced("electronics", 1, "standard");
      const express = calculateShoppingCarbonAdvanced("electronics", 1, "express");
      expect(express.deliveryKg).toBeGreaterThanOrEqual(standard.deliveryKg);
    });
  });

  describe("calculateLegacyFlightCarbon", () => {
    it("calculates legacy flight carbon correctly", () => {
      const result = calculateLegacyFlightCarbon(1000, 1);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("calculateFoodCarbon", () => {
    it("calculates food carbon by servings", () => {
      const result = calculateFoodCarbon(2, "vegetarian");
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("calculateFoodWasteCarbon", () => {
    it("estimates food waste impact", () => {
      expect(calculateFoodWasteCarbon(2)).toBe(5);
    });

    it("handles zero weight", () => {
      expect(calculateFoodWasteCarbon(0)).toBe(0);
    });

    it("uses custom methane multiplier", () => {
      const result = calculateFoodWasteCarbon(2, 3.0);
      expect(result).toBe(6);
    });
  });

  describe("calculateShoppingCarbon", () => {
    it("calculates shopping carbon with packaging and delivery", () => {
      const result = calculateShoppingCarbon("standard", "normal");
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("calculateFoodDeliveryCarbon", () => {
    it("calculates food delivery carbon", () => {
      const result = calculateFoodDeliveryCarbon(5, "bike", 300, false);
      expect(result).toBeGreaterThan(0);
    });

    it("vegetarian orders have lower food prep carbon", () => {
      const veg = calculateFoodDeliveryCarbon(5, "bike", 300, true);
      const nonVeg = calculateFoodDeliveryCarbon(5, "bike", 300, false);
      expect(veg).toBeLessThan(nonVeg);
    });
  });

  describe("calculateGroceryDeliveryCarbon", () => {
    it("calculates grocery delivery carbon", () => {
      const result = calculateGroceryDeliveryCarbon(3, "PETROL_BIKE", 500, "blinkit", true);
      expect(result).toBeGreaterThan(0);
    });

    it("quick commerce uses different factors", () => {
      const quick = calculateGroceryDeliveryCarbon(3, "PETROL_BIKE", 500, "blinkit", true);
      const normal = calculateGroceryDeliveryCarbon(3, "PETROL_BIKE", 500, "bigbasket", false);
      expect(quick).toBeGreaterThan(0);
      expect(normal).toBeGreaterThan(0);
    });
  });

  describe("calculateRideBookingCarbon", () => {
    it("calculates ride carbon for different types", () => {
      const economy = calculateRideBookingCarbon(10, "economy", "uber");
      const shared = calculateRideBookingCarbon(10, "shared", "uber");
      expect(economy).toBeGreaterThan(0);
      expect(shared).toBeLessThanOrEqual(economy);
    });

    it("handles auto rickshaw", () => {
      const result = calculateRideBookingCarbon(5, "auto", "rapido");
      expect(result).toBeGreaterThan(0);
    });

    it("handles EV rides", () => {
      const ev = calculateRideBookingCarbon(10, "ev", "uber");
      const petrol = calculateRideBookingCarbon(10, "economy", "uber");
      expect(ev).toBeLessThan(petrol);
    });
  });

  describe("calculateDeliveryCarbon", () => {
    it("calculates delivery carbon", () => {
      const result = calculateDeliveryCarbon(5, "PETROL_BIKE");
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("predictCarbon", () => {
    it("predicts risk from recent entries", () => {
      const prediction = predictCarbon([
        { id: "1", category: "transport", label: "car", kgCo2e: 12, source: "manual", occurredAt: new Date().toISOString() },
        { id: "2", category: "electricity", label: "bill", kgCo2e: 8, source: "manual", occurredAt: new Date().toISOString() }
      ]);
      expect(prediction.nextWeekKg).toBeGreaterThan(0);
      expect(prediction.risk).toBeDefined();
    });

    it("predicts high risk for high emissions", () => {
      const prediction = predictCarbon([
        { id: "1", category: "transport", label: "car", kgCo2e: 50, source: "manual", occurredAt: new Date().toISOString() }
      ]);
      expect(prediction.risk).toBe("high");
    });

    it("predicts low risk for low emissions", () => {
      const prediction = predictCarbon([
        { id: "1", category: "transport", label: "metro", kgCo2e: 1, source: "manual", occurredAt: new Date().toISOString() }
      ]);
      expect(prediction.risk).toBe("low");
    });

    it("handles empty entries", () => {
      const prediction = predictCarbon([]);
      expect(prediction.nextWeekKg).toBe(0);
      expect(prediction.risk).toBe("low");
    });

    it("includes sustainability score", () => {
      const prediction = predictCarbon([
        { id: "1", category: "transport", label: "car", kgCo2e: 5, source: "manual", occurredAt: new Date().toISOString() }
      ]);
      expect(prediction.sustainabilityScore).toBeGreaterThanOrEqual(0);
      expect(prediction.sustainabilityScore).toBeLessThanOrEqual(100);
    });

    it("includes drivers", () => {
      const prediction = predictCarbon([
        { id: "1", category: "transport", label: "car", kgCo2e: 10, source: "manual", occurredAt: new Date().toISOString() },
        { id: "2", category: "food_delivery", label: "swiggy", kgCo2e: 5, source: "notification", occurredAt: new Date().toISOString() }
      ]);
      expect(prediction.drivers.length).toBeGreaterThan(0);
    });
  });

  describe("classifyScore", () => {
    it("classifies low emissions", () => {
      expect(classifyScore(5).label).toBe("Low");
    });

    it("classifies medium emissions", () => {
      expect(classifyScore(12).label).toBe("Medium");
    });

    it("classifies high emissions", () => {
      expect(classifyScore(20).label).toBe("High");
    });
  });

  describe("getSustainabilityLevel", () => {
    it("returns Climate Hero for high scores", () => {
      expect(getSustainabilityLevel(95).level).toBe("Climate Hero");
    });

    it("returns Earth Guardian for good scores", () => {
      expect(getSustainabilityLevel(80).level).toBe("Earth Guardian");
    });

    it("returns Eco Champion for moderate scores", () => {
      expect(getSustainabilityLevel(65).level).toBe("Eco Champion");
    });

    it("returns Eco Explorer for low scores", () => {
      expect(getSustainabilityLevel(45).level).toBe("Eco Explorer");
    });

    it("returns Eco Beginner for very low scores", () => {
      expect(getSustainabilityLevel(20).level).toBe("Eco Beginner");
    });
  });

  describe("calculateGreenScore", () => {
    it("calculates green score from entries", () => {
      const entries = [
        { id: "1", category: "transport" as const, label: "metro", kgCo2e: 2, source: "manual" as const, occurredAt: new Date().toISOString() }
      ];
      const score = calculateGreenScore(entries, []);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("returns 100 for very green lifestyle", () => {
      const entries = [
        { id: "1", category: "transport" as const, label: "walking", kgCo2e: 0, source: "manual" as const, occurredAt: new Date().toISOString() }
      ];
      const score = calculateGreenScore(entries, []);
      expect(score).toBe(100);
    });
  });

  describe("calculateTransportCarbonByFuel", () => {
    it("applies fuel multiplier correctly", () => {
      const petrol = calculateTransportCarbonByFuel(10, "car", "petrol");
      const electric = calculateTransportCarbonByFuel(10, "car", "electric");
      expect(electric).toBeLessThan(petrol);
    });

    it("uses petrol as default fuel", () => {
      const result = calculateTransportCarbonByFuel(10, "car");
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("calculateLifetimeCarbon", () => {
    it("calculates lifetime carbon from entries", () => {
      const entries = [
        { id: "1", category: "transport" as const, label: "car", kgCo2e: 10, source: "manual" as const, occurredAt: new Date().toISOString() },
        { id: "2", category: "food_delivery" as const, label: "swiggy", kgCo2e: 5, source: "notification" as const, occurredAt: new Date().toISOString() }
      ];
      const result = calculateLifetimeCarbon(entries);
      expect(result.totalKg).toBe(15);
      expect(result.entryCount).toBe(2);
      expect(result.byCategory.transport).toBe(10);
      expect(result.byCategory.food_delivery).toBe(5);
    });

    it("calculates trees required", () => {
      const entries = [
        { id: "1", category: "transport" as const, label: "car", kgCo2e: 21, source: "manual" as const, occurredAt: new Date().toISOString() }
      ];
      const result = calculateLifetimeCarbon(entries);
      expect(result.totalTrees).toBe(1);
    });
  });

  describe("calculateTravelEfficiencyScore", () => {
    it("calculates travel efficiency score", () => {
      const entries = [
        { id: "1", category: "transport" as const, label: "metro", kgCo2e: 2, source: "manual" as const, occurredAt: new Date().toISOString() }
      ];
      const score = calculateTravelEfficiencyScore(entries, []);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
