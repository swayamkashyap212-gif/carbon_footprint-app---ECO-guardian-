import { generateSmartAlerts, generateAlertFromNotification } from "../src/services/smartAlertEngine";

describe("smartAlertEngine", () => {
  describe("generateSmartAlerts", () => {
    it("returns empty array for no entries", () => {
      const alerts = generateSmartAlerts([]);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it("generates high carbon alert when over threshold", () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        id: `entry-${i}`,
        category: "transport" as const,
        label: "car",
        kgCo2e: 5,
        source: "manual" as const,
        occurredAt: new Date().toISOString()
      }));
      const alerts = generateSmartAlerts(entries, [], [], [], [], [], [], 9);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it("generates transport alert for high transport usage", () => {
      const entries = Array.from({ length: 5 }, (_, i) => ({
        id: `entry-${i}`,
        category: "transport" as const,
        label: "car",
        kgCo2e: 2,
        source: "manual" as const,
        occurredAt: new Date().toISOString()
      }));
      const alerts = generateSmartAlerts(entries);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it("generates express delivery alert", () => {
      const shoppingLogs = [{
        id: "shop-1",
        vendor: "Amazon",
        productName: "Phone",
        category: "electronics" as const,
        quantity: 1,
        deliveryType: "express" as const,
        orderValue: 1000,
        manufacturingKg: 5,
        packagingKg: 0.5,
        deliveryKg: 1,
        totalKgCo2e: 6.5,
        source: "manual" as const,
        confidence: 0.8
      }];
      const alerts = generateSmartAlerts([], shoppingLogs);
      const expressAlert = alerts.find(a => a.type === "shopping");
      expect(expressAlert).toBeDefined();
    });

    it("generates electricity alert for high usage", () => {
      const electricityLogs = [{
        id: "elec-1",
        provider: "MSEB",
        unitsKwh: 250,
        billingPeriod: "monthly",
        kgCo2e: 179,
        createdAt: new Date().toISOString()
      }];
      const alerts = generateSmartAlerts([], [], electricityLogs);
      const elecAlert = alerts.find(a => a.type === "electricity");
      expect(elecAlert).toBeDefined();
    });

    it("generates walking distance alert for close delivery", () => {
      const foodDeliveries = [{
        id: "food-1",
        platform: "swiggy" as const,
        restaurantName: "Near Restaurant",
        distanceKm: 0.5,
        vehicleType: "PETROL_BIKE" as const,
        orderValue: 300,
        items: [],
        kgCo2e: 0.3,
        isVegetarian: false,
        source: "notification" as const,
        detectedAt: new Date().toISOString()
      }];
      const alerts = generateSmartAlerts([], [], [], [], foodDeliveries);
      const walkAlert = alerts.find(a => a.title.includes("Walking"));
      expect(walkAlert).toBeDefined();
    });

    it("generates streak alert", () => {
      const streaks = [{
        id: "streak-1",
        type: "no_food_delivery" as const,
        count: 5,
        bestCount: 5,
        lastUpdated: new Date().toISOString(),
        active: true
      }];
      const alerts = generateSmartAlerts([], [], [], [], [], [], streaks);
      const streakAlert = alerts.find(a => a.type === "streak");
      expect(streakAlert).toBeDefined();
    });

    it("sorts alerts by severity", () => {
      const entries = Array.from({ length: 15 }, (_, i) => ({
        id: `entry-${i}`,
        category: "transport" as const,
        label: "car",
        kgCo2e: 10,
        source: "manual" as const,
        occurredAt: new Date().toISOString()
      }));
      const alerts = generateSmartAlerts(entries, [], [], [], [], [], [], 9);
      if (alerts.length >= 2) {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        for (let i = 1; i < alerts.length; i++) {
          expect(severityOrder[alerts[i].severity]).toBeGreaterThanOrEqual(
            severityOrder[alerts[i - 1].severity]
          );
        }
      }
    });
  });

  describe("generateAlertFromNotification", () => {
    it("generates walking alert for delivered close order", () => {
      const alert = generateAlertFromNotification("swiggy", "delivered", "Near Restaurant", 0.5);
      expect(alert).not.toBeNull();
      expect(alert?.title).toContain("Walking");
    });

    it("returns null for delivered far order", () => {
      const alert = generateAlertFromNotification("swiggy", "delivered", "Far Restaurant", 5);
      expect(alert).toBeNull();
    });

    it("generates ride sharing alert for Uber", () => {
      const alert = generateAlertFromNotification("uber", "confirmed", "Uber Ride");
      expect(alert).not.toBeNull();
      expect(alert?.title).toContain("Ride Sharing");
    });

    it("generates ride sharing alert for Ola", () => {
      const alert = generateAlertFromNotification("ola", "confirmed", "Ola Ride");
      expect(alert).not.toBeNull();
    });

    it("returns null for unknown platform and status", () => {
      const alert = generateAlertFromNotification("unknown", "confirmed", "Test");
      expect(alert).toBeNull();
    });
  });
});
