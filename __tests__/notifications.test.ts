import {
  getAppCategory,
  parseNotificationText,
  getPlatformDisplayName,
  isFoodDeliveryPlatform,
  isGroceryPlatform,
  isShoppingPlatform,
  isRidePlatform
} from "../src/services/notifications";

describe("notifications", () => {
  describe("getAppCategory", () => {
    it("returns delivery for Swiggy", () => {
      expect(getAppCategory("in.swiggy.android", "")).toBe("delivery");
    });

    it("returns delivery for Zomato", () => {
      expect(getAppCategory("com.application.zomato", "")).toBe("delivery");
    });

    it("returns delivery for Blinkit", () => {
      expect(getAppCategory("com.blinkit.app", "")).toBe("delivery");
    });

    it("returns delivery for Zepto", () => {
      expect(getAppCategory("com.zeptoconsumerapp", "")).toBe("delivery");
    });

    it("returns delivery for BigBasket", () => {
      expect(getAppCategory("com.bigbasket.android", "")).toBe("delivery");
    });

    it("returns ride for Uber", () => {
      expect(getAppCategory("com.ubercab", "")).toBe("ride");
    });

    it("returns ride for Ola", () => {
      expect(getAppCategory("com.olacabs.customer", "")).toBe("ride");
    });

    it("returns ride for Rapido", () => {
      expect(getAppCategory("com.rapido.passenger", "")).toBe("ride");
    });

    it("returns shopping for Amazon", () => {
      expect(getAppCategory("in.amazon.mShop.android.shopping", "")).toBe("shopping");
    });

    it("returns shopping for Flipkart", () => {
      expect(getAppCategory("com.flipkart.android", "")).toBe("shopping");
    });

    it("returns navigation for Google Maps", () => {
      expect(getAppCategory("com.google.android.apps.maps", "")).toBe("navigation");
    });

    it("returns navigation for Waze", () => {
      expect(getAppCategory("com.waze", "")).toBe("navigation");
    });

    it("detects navigation from notification text", () => {
      expect(getAppCategory("unknown.app", "Turn left in 200 meters")).toBe("navigation");
    });

    it("detects navigation from ETA text", () => {
      expect(getAppCategory("unknown.app", "10 minutes away")).toBe("navigation");
    });

    it("returns ignore for unknown apps", () => {
      expect(getAppCategory("com.unknown.app", "random text")).toBe("ignore");
    });
  });

  describe("parseNotificationText", () => {
    it("parses Swiggy notification correctly", () => {
      const result = parseNotificationText(
        "Order Confirmed",
        "Your Swiggy order has been confirmed",
        "in.swiggy.android"
      );
      expect(result.platform).toBe("swiggy");
      expect(result.title).toBe("Order Confirmed");
    });

    it("parses Zomato notification correctly", () => {
      const result = parseNotificationText(
        "Order Placed",
        "Your Zomato order has been placed",
        "com.application.zomato"
      );
      expect(result.platform).toBe("zomato");
    });

    it("parses Amazon notification correctly", () => {
      const result = parseNotificationText(
        "Order Shipped",
        "Your Amazon order has been shipped",
        "in.amazon.mShop.android.shopping"
      );
      expect(result.platform).toBe("amazon");
    });

    it("parses Uber notification correctly", () => {
      const result = parseNotificationText(
        "Ride Confirmed",
        "Your Uber ride has been confirmed",
        "com.ubercab"
      );
      expect(result.platform).toBe("uber");
    });

    it("detects order status from text", () => {
      const result = parseNotificationText(
        "Order Confirmed",
        "Your order has been confirmed successfully",
        "in.swiggy.android"
      );
      expect(result.status).toBe("confirmed");
    });

    it("detects delivered status", () => {
      const result = parseNotificationText(
        "Order Delivered",
        "Your order has been delivered. Enjoy!",
        "in.swiggy.android"
      );
      expect(result.status).toBe("delivered");
    });

    it("detects picked up status", () => {
      const result = parseNotificationText(
        "Rider Picked Up",
        "Your order has been picked up by the rider",
        "in.swiggy.android"
      );
      expect(result.status).toBe("picked_up");
    });

    it("detects arriving status", () => {
      const result = parseNotificationText(
        "Rider Near You",
        "Your order is arriving soon",
        "in.swiggy.android"
      );
      expect(result.status).toBe("arriving");
    });

    it("extracts order ID from notification", () => {
      const result = parseNotificationText(
        "Order #12345",
        "Your order #12345 has been confirmed",
        "in.swiggy.android"
      );
      expect(result.orderId).toBe("12345");
    });

    it("extracts estimated time", () => {
      const result = parseNotificationText(
        "Rider On The Way",
        "Your order is 15 minutes away",
        "in.swiggy.android"
      );
      expect(result.estimatedTime).toBe("15 minutes");
    });

    it("detects platform from text when package is unknown", () => {
      const result = parseNotificationText(
        "Swiggy Order",
        "Your swiggy order has been confirmed",
        "com.unknown.app"
      );
      expect(result.platform).toBe("swiggy");
    });

    it("returns other for completely unknown", () => {
      const result = parseNotificationText(
        "Random Notification",
        "Some random text",
        "com.unknown.app"
      );
      expect(result.platform).toBe("other");
    });

    it("includes timestamp", () => {
      const result = parseNotificationText(
        "Order Confirmed",
        "Your order has been confirmed",
        "in.swiggy.android",
        Date.now()
      );
      expect(result.timestamp).toBeDefined();
    });

    it("uses current time when no timestamp provided", () => {
      const result = parseNotificationText(
        "Order Confirmed",
        "Your order has been confirmed",
        "in.swiggy.android"
      );
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("getPlatformDisplayName", () => {
    it("returns correct display names", () => {
      expect(getPlatformDisplayName("swiggy")).toBe("Swiggy");
      expect(getPlatformDisplayName("zomato")).toBe("Zomato");
      expect(getPlatformDisplayName("blinkit")).toBe("Blinkit");
      expect(getPlatformDisplayName("zepto")).toBe("Zepto");
      expect(getPlatformDisplayName("amazon")).toBe("Amazon");
      expect(getPlatformDisplayName("flipkart")).toBe("Flipkart");
      expect(getPlatformDisplayName("uber")).toBe("Uber");
      expect(getPlatformDisplayName("ola")).toBe("Ola");
      expect(getPlatformDisplayName("rapido")).toBe("Rapido");
      expect(getPlatformDisplayName("other")).toBe("Other");
    });
  });

  describe("isFoodDeliveryPlatform", () => {
    it("returns true for Swiggy", () => {
      expect(isFoodDeliveryPlatform("swiggy")).toBe(true);
    });

    it("returns true for Zomato", () => {
      expect(isFoodDeliveryPlatform("zomato")).toBe(true);
    });

    it("returns false for non-food platforms", () => {
      expect(isFoodDeliveryPlatform("amazon")).toBe(false);
      expect(isFoodDeliveryPlatform("uber")).toBe(false);
    });
  });

  describe("isGroceryPlatform", () => {
    it("returns true for grocery platforms", () => {
      expect(isGroceryPlatform("blinkit")).toBe(true);
      expect(isGroceryPlatform("zepto")).toBe(true);
      expect(isGroceryPlatform("instamart")).toBe(true);
      expect(isGroceryPlatform("bigbasket")).toBe(true);
    });

    it("returns false for non-grocery platforms", () => {
      expect(isGroceryPlatform("swiggy")).toBe(false);
      expect(isGroceryPlatform("amazon")).toBe(false);
    });
  });

  describe("isShoppingPlatform", () => {
    it("returns true for shopping platforms", () => {
      expect(isShoppingPlatform("amazon")).toBe(true);
      expect(isShoppingPlatform("flipkart")).toBe(true);
    });

    it("returns false for non-shopping platforms", () => {
      expect(isShoppingPlatform("swiggy")).toBe(false);
      expect(isShoppingPlatform("uber")).toBe(false);
    });
  });

  describe("isRidePlatform", () => {
    it("returns true for ride platforms", () => {
      expect(isRidePlatform("uber")).toBe(true);
      expect(isRidePlatform("ola")).toBe(true);
      expect(isRidePlatform("rapido")).toBe(true);
    });

    it("returns false for non-ride platforms", () => {
      expect(isRidePlatform("swiggy")).toBe(false);
      expect(isRidePlatform("amazon")).toBe(false);
    });
  });
});
