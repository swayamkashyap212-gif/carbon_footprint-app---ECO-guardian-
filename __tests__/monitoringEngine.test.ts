import {
  detectActivityFromSignal,
  getMonitoringSummary,
  predictDeliveryVehicle,
  updateKnownLocation,
  getKnownLocation,
  estimateDeliveryDistance,
  calculateDistanceFromGPS,
  getVehicleEmoji,
  getVehicleDisplayName
} from "../src/services/monitoringEngine";

describe("monitoringEngine", () => {
  describe("detectActivityFromSignal", () => {
    it("detects walking from low speed", () => {
      const event = detectActivityFromSignal(3, "gps");
      expect(event.detectedMode).toBe("walking");
    });

    it("detects cycling from moderate speed", () => {
      const event = detectActivityFromSignal(10, "gps");
      expect(event.detectedMode).toBe("cycling");
    });

    it("detects bike from medium speed", () => {
      const event = detectActivityFromSignal(25, "gps");
      expect(event.detectedMode).toBe("bike");
    });

    it("detects car from higher speed", () => {
      const event = detectActivityFromSignal(40, "gps");
      expect(event.detectedMode).toBe("car");
    });

    it("detects bus from high speed", () => {
      const event = detectActivityFromSignal(60, "gps");
      expect(event.detectedMode).toBe("bus");
    });

    it("detects train from very high speed", () => {
      const event = detectActivityFromSignal(100, "gps");
      expect(event.detectedMode).toBe("train");
    });

    it("calculates carbon emissions", () => {
      const event = detectActivityFromSignal(40, "gps");
      expect(event.kgCo2e).toBeGreaterThanOrEqual(0);
    });

    it("includes source", () => {
      const event = detectActivityFromSignal(40, "activity");
      expect(event.source).toBe("activity");
    });

    it("includes timestamp", () => {
      const event = detectActivityFromSignal(40, "gps");
      expect(event.occurredAt).toBeDefined();
    });
  });

  describe("getMonitoringSummary", () => {
    it("returns summary for empty events", () => {
      const summary = getMonitoringSummary([]);
      expect(summary.tripCount).toBe(0);
      expect(summary.dailyKg).toBe(0);
      expect(summary.weeklyKg).toBe(0);
      expect(summary.monthlyKg).toBe(0);
    });

    it("calculates daily events", () => {
      const events = [
        {
          id: "1",
          detectedMode: "car" as const,
          distanceKm: 10,
          durationMinutes: 15,
          confidence: 0.8,
          source: "gps" as const,
          kgCo2e: 2,
          occurredAt: new Date().toISOString()
        }
      ];
      const summary = getMonitoringSummary(events);
      expect(summary.dailyEvents).toBe(1);
    });

    it("calculates green percent", () => {
      const events = [
        {
          id: "1",
          detectedMode: "walking" as const,
          distanceKm: 1,
          durationMinutes: 15,
          confidence: 0.9,
          source: "gps" as const,
          kgCo2e: 0,
          occurredAt: new Date().toISOString()
        },
        {
          id: "2",
          detectedMode: "car" as const,
          distanceKm: 10,
          durationMinutes: 15,
          confidence: 0.8,
          source: "gps" as const,
          kgCo2e: 2,
          occurredAt: new Date().toISOString()
        }
      ];
      const summary = getMonitoringSummary(events);
      expect(summary.greenPercent).toBe(50);
    });

    it("detects modes", () => {
      const events = [
        {
          id: "1",
          detectedMode: "car" as const,
          distanceKm: 10,
          durationMinutes: 15,
          confidence: 0.8,
          source: "gps" as const,
          kgCo2e: 2,
          occurredAt: new Date().toISOString()
        }
      ];
      const summary = getMonitoringSummary(events);
      expect(summary.detectedModes).toContain("car");
    });
  });

  describe("predictDeliveryVehicle", () => {
    it("predicts electric bike for short distance quick delivery", () => {
      const vehicle = predictDeliveryVehicle(1.5, "blinkit", 10);
      expect(vehicle).toBe("ELECTRIC_BIKE");
    });

    it("predicts cycle for short distance moderate delivery", () => {
      const vehicle = predictDeliveryVehicle(1.5, "swiggy", 20);
      expect(vehicle).toBe("CYCLE");
    });

    it("predicts walking for very short distance", () => {
      const vehicle = predictDeliveryVehicle(1, "swiggy", 30);
      expect(vehicle).toBe("WALKING");
    });

    it("predicts petrol bike for medium distance", () => {
      const vehicle = predictDeliveryVehicle(4, "swiggy", 25);
      expect(vehicle).toBe("PETROL_BIKE");
    });

    it("predicts van for Amazon", () => {
      const vehicle = predictDeliveryVehicle(15, "amazon", 60);
      expect(vehicle).toBe("VAN");
    });

    it("predicts van for Porter", () => {
      const vehicle = predictDeliveryVehicle(15, "porter", 60);
      expect(vehicle).toBe("VAN");
    });
  });

  describe("updateKnownLocation and getKnownLocation", () => {
    it("updates and retrieves location", () => {
      updateKnownLocation(19.09, 72.87);
      const location = getKnownLocation();
      expect(location).not.toBeNull();
      expect(location?.lat).toBe(19.09);
      expect(location?.lng).toBe(72.87);
    });
  });

  describe("estimateDeliveryDistance", () => {
    it("returns base distance for quick commerce", () => {
      updateKnownLocation(0, 0);
      const distance = estimateDeliveryDistance("blinkit", "store");
      expect(distance).toBeGreaterThan(0);
    });

    it("returns base distance for Swiggy", () => {
      const distance = estimateDeliveryDistance("swiggy", "restaurant");
      expect(distance).toBeGreaterThan(0);
    });

    it("applies urban factor for known urban location", () => {
      updateKnownLocation(19.09, 72.87);
      const distance = estimateDeliveryDistance("swiggy", "restaurant");
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe("calculateDistanceFromGPS", () => {
    it("calculates distance between two points", () => {
      const distance = calculateDistanceFromGPS(19.09, 72.87, 28.57, 77.09);
      expect(distance).toBeGreaterThan(0);
    });

    it("returns 0 for same point", () => {
      const distance = calculateDistanceFromGPS(19.09, 72.87, 19.09, 72.87);
      expect(distance).toBe(0);
    });
  });

  describe("getVehicleEmoji", () => {
    it("returns correct emoji for each vehicle type", () => {
      expect(getVehicleEmoji("ELECTRIC_BIKE")).toBe("⚡");
      expect(getVehicleEmoji("PETROL_BIKE")).toBe("🏍");
      expect(getVehicleEmoji("SCOOTER")).toBe("🛵");
      expect(getVehicleEmoji("CYCLE")).toBe("🚲");
      expect(getVehicleEmoji("WALKING")).toBe("🚶");
      expect(getVehicleEmoji("VAN")).toBe("🚐");
      expect(getVehicleEmoji("AUTO_RICKSHAW")).toBe("🛺");
    });

    it("returns question mark for unknown vehicle", () => {
      expect(getVehicleEmoji("UNKNOWN")).toBe("❓");
    });
  });

  describe("getVehicleDisplayName", () => {
    it("returns correct display name for each vehicle type", () => {
      expect(getVehicleDisplayName("ELECTRIC_BIKE")).toBe("Electric Bike");
      expect(getVehicleDisplayName("PETROL_BIKE")).toBe("Petrol Bike");
      expect(getVehicleDisplayName("SCOOTER")).toBe("Scooter");
      expect(getVehicleDisplayName("CYCLE")).toBe("Bicycle");
      expect(getVehicleDisplayName("WALKING")).toBe("Walking");
      expect(getVehicleDisplayName("VAN")).toBe("Delivery Van");
      expect(getVehicleDisplayName("AUTO_RICKSHAW")).toBe("Auto Rickshaw");
    });

    it("returns Unknown for unknown vehicle", () => {
      expect(getVehicleDisplayName("UNKNOWN")).toBe("Unknown");
    });
  });
});
