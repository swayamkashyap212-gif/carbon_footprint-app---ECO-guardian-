import {
  AccessibilityHelper,
  AccessibilityLabels,
  AccessibilityRoles,
  AccessibilityHints,
  ACCESSIBILITY_CONSTANTS
} from "../src/utils/accessibility/accessibilityHelper";

describe("AccessibilityLabels", () => {
  describe("carbonEmission", () => {
    it("formats carbon emission label", () => {
      const label = AccessibilityLabels.carbonEmission(42.5);
      expect(label).toBe("Carbon emission: 42.5 kg CO2e");
    });

    it("handles custom unit", () => {
      const label = AccessibilityLabels.carbonEmission(10, "kg");
      expect(label).toBe("Carbon emission: 10 kg");
    });
  });

  describe("sustainabilityScore", () => {
    it("formats score label", () => {
      const label = AccessibilityLabels.sustainabilityScore(85, "Earth Guardian");
      expect(label).toBe("Sustainability score: 85 percent. Level: Earth Guardian");
    });
  });

  describe("tripInfo", () => {
    it("formats trip info", () => {
      const label = AccessibilityLabels.tripInfo("car", 10, 2.1);
      expect(label).toBe("Trip by car. Distance: 10 kilometers. Carbon: 2.1 kilograms CO2e");
    });
  });

  describe("deliveryInfo", () => {
    it("formats delivery info without carbon", () => {
      const label = AccessibilityLabels.deliveryInfo("Swiggy", "delivered");
      expect(label).toBe("Swiggy delivery. Status: delivered.");
    });

    it("formats delivery info with carbon", () => {
      const label = AccessibilityLabels.deliveryInfo("Swiggy", "delivered", 0.5);
      expect(label).toBe("Swiggy delivery. Status: delivered. Carbon: 0.5 kilograms.");
    });
  });

  describe("streakInfo", () => {
    it("formats streak info", () => {
      const label = AccessibilityLabels.streakInfo("no_food_delivery", 5);
      expect(label).toBe("no food delivery streak: 5 days");
    });
  });

  describe("challengeInfo", () => {
    it("formats challenge info", () => {
      const label = AccessibilityLabels.challengeInfo("Metro Week", 3, 5);
      expect(label).toBe("Challenge: Metro Week. Progress: 3 of 5");
    });
  });

  describe("permissionStatus", () => {
    it("formats granted permission", () => {
      const label = AccessibilityLabels.permissionStatus("Location", true);
      expect(label).toBe("Location permission: Granted");
    });

    it("formats denied permission", () => {
      const label = AccessibilityLabels.permissionStatus("Location", false);
      expect(label).toBe("Location permission: Not granted");
    });
  });

  describe("trackingStatus", () => {
    it("formats active tracking", () => {
      const label = AccessibilityLabels.trackingStatus("Location", true);
      expect(label).toBe("Location tracking: Active");
    });

    it("formats inactive tracking", () => {
      const label = AccessibilityLabels.trackingStatus("Location", false);
      expect(label).toBe("Location tracking: Inactive");
    });
  });

  describe("alertInfo", () => {
    it("formats alert info", () => {
      const label = AccessibilityLabels.alertInfo("critical", "High Carbon Alert");
      expect(label).toBe("critical alert: High Carbon Alert");
    });
  });

  describe("weeklyTrend", () => {
    it("formats weekly trend", () => {
      const data = [
        { day: "Mon", kg: 5 },
        { day: "Tue", kg: 3 }
      ];
      const label = AccessibilityLabels.weeklyTrend(data);
      expect(label).toBe("Mon: 5 kilograms. Tue: 3 kilograms");
    });
  });

  describe("buttonAction", () => {
    it("formats button action", () => {
      const label = AccessibilityLabels.buttonAction("submit form");
      expect(label).toBe("Double tap to submit form");
    });
  });

  describe("navigationDestination", () => {
    it("formats navigation destination", () => {
      const label = AccessibilityLabels.navigationDestination("Dashboard");
      expect(label).toBe("Navigate to Dashboard");
    });
  });
});

describe("AccessibilityRoles", () => {
  it("has all required roles", () => {
    expect(AccessibilityRoles.BUTTON).toBe("button");
    expect(AccessibilityRoles.LINK).toBe("link");
    expect(AccessibilityRoles.TEXT).toBe("text");
    expect(AccessibilityRoles.IMAGE).toBe("image");
    expect(AccessibilityRoles.HEADER).toBe("header");
    expect(AccessibilityRoles.SUMMARY).toBe("summary");
    expect(AccessibilityRoles.PROGRESSBAR).toBe("progressbar");
    expect(AccessibilityRoles.TAB).toBe("tab");
    expect(AccessibilityRoles.SWITCH).toBe("switch");
    expect(AccessibilityRoles.ALERT).toBe("alert");
  });
});

describe("AccessibilityHints", () => {
  it("has all required hints", () => {
    expect(AccessibilityHints.DOUBLE_TAP).toBeDefined();
    expect(AccessibilityHints.SWIPE).toBeDefined();
    expect(AccessibilityHints.SCROLL).toBeDefined();
    expect(AccessibilityHints.LONG_PRESS).toBeDefined();
    expect(AccessibilityHints.ACTIVATE).toBeDefined();
    expect(AccessibilityHints.DEACTIVATE).toBeDefined();
    expect(AccessibilityHints.EXPAND).toBeDefined();
    expect(AccessibilityHints.COLLAPSE).toBeDefined();
    expect(AccessibilityHints.DISMISS).toBeDefined();
    expect(AccessibilityHints.REFRESH).toBeDefined();
  });
});

describe("ACCESSIBILITY_CONSTANTS", () => {
  it("has correct minimum touch target", () => {
    expect(ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET).toBe(48);
  });

  it("has correct minimum font size", () => {
    expect(ACCESSIBILITY_CONSTANTS.MIN_FONT_SIZE).toBe(12);
  });

  it("has correct max font scale", () => {
    expect(ACCESSIBILITY_CONSTANTS.MAX_FONT_SCALE).toBe(2.0);
  });

  it("has correct contrast ratios", () => {
    expect(ACCESSIBILITY_CONSTANTS.CONTRAST_RATIO_AA).toBe(4.5);
    expect(ACCESSIBILITY_CONSTANTS.CONTRAST_RATIO_AAA).toBe(7);
  });
});
