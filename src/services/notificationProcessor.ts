import { NotificationParsed, DeliveryOrder, FoodDeliveryLog, GroceryDeliveryLog, RideBooking, DeliveryVehicleType } from "../types/domain";
import { useAppStore } from "../store/useAppStore";
import { addPendingVehicleSelection } from "./vehicleSelection";
import { estimateDeliveryDistance } from "./monitoringEngine";
import {
  deliveryVehicleFactorsKgPerKm,
  quickCommerceFactorsKgPerKm,
  rideSharingFactorsKgPerKm
} from "../data/emissionFactors";
import { supabase, ingestCarbonEvent } from "./supabase";
import { generateSmartAlerts } from "./smartAlertEngine";
import { scheduleCarbonAlert } from "./notifications";

// Track active orders to prevent duplicates - persisted to AsyncStorage
const activeOrders = new Map<string, { id: string; platform: string; status: string; createdAt: number }>();
const ACTIVE_ORDERS_KEY = "ecoguardian.activeOrders";
let _asyncStorage: any = null;

async function getStorage(): Promise<any> {
  if (_asyncStorage) return _asyncStorage;
  try {
    _asyncStorage = require("@react-native-async-storage/async-storage").default;
    return _asyncStorage;
  } catch {
    return null;
  }
}

async function loadActiveOrders(): Promise<void> {
  const store = await getStorage();
  if (!store) return;
  try {
    const raw = await store.getItem(ACTIVE_ORDERS_KEY);
    if (raw) {
      const entries = JSON.parse(raw);
      for (const [key, value] of entries) {
        activeOrders.set(key, value);
      }
    }
  } catch {}
}

async function saveActiveOrders(): Promise<void> {
  const store = await getStorage();
  if (!store) return;
  try {
    const entries = Array.from(activeOrders.entries());
    await store.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(entries));
  } catch {}
}

// Load on module init
void loadActiveOrders();

function inferVehicleType(platform: string): DeliveryVehicleType {
  const bikePlatforms = ["swiggy", "zomato", "blinkit", "zepto", "instamart", "rapido"];
  if (bikePlatforms.includes(platform)) return "PETROL_BIKE";
  const carPlatforms = ["uber", "ola"];
  if (carPlatforms.includes(platform)) return "PETROL_CAR";
  if (platform === "porter") return "VAN";
  if (platform === "amazon" || platform === "flipkart") return "VAN";
  return "UNKNOWN";
}

function calculateFoodDeliveryCarbon(distanceKm: number, vehicleType: string): number {
  const factor = deliveryVehicleFactorsKgPerKm[vehicleType] ?? deliveryVehicleFactorsKgPerKm.PETROL_BIKE;
  const distanceCarbon = Math.round(distanceKm * factor * 100) / 100;
  const packagingCarbon = 0.12;
  return Math.round((distanceCarbon + packagingCarbon) * 100) / 100;
}

function calculateGroceryDeliveryCarbon(distanceKm: number, vehicleType: string, isQuickCommerce: boolean, platform: string): number {
  let factor: number;
  if (isQuickCommerce) {
    factor = quickCommerceFactorsKgPerKm[platform.toLowerCase()] ?? quickCommerceFactorsKgPerKm.default;
  } else {
    factor = deliveryVehicleFactorsKgPerKm[vehicleType] ?? deliveryVehicleFactorsKgPerKm.PETROL_BIKE;
  }
  const distanceCarbon = Math.round(distanceKm * factor * 100) / 100;
  const packagingCarbon = 0.25;
  return Math.round((distanceCarbon + packagingCarbon) * 100) / 100;
}

function calculateRideCarbon(distanceKm: number, platform: string): number {
  let factor: number;
  if (platform === "rapido") {
    factor = rideSharingFactorsKgPerKm.bike_taxi;
  } else if (platform === "uber" || platform === "ola") {
    factor = rideSharingFactorsKgPerKm.solo_cab;
  } else {
    factor = rideSharingFactorsKgPerKm.solo_cab;
  }
  return Math.round(distanceKm * factor * 100) / 100;
}

function calculateShoppingCarbon(distanceKm: number): number {
  const factor = deliveryVehicleFactorsKgPerKm.VAN;
  const distanceCarbon = Math.round(distanceKm * factor * 100) / 100;
  const packagingCarbon = 0.45;
  return Math.round((distanceCarbon + packagingCarbon) * 100) / 100;
}

const platformDisplayNames: Record<string, string> = {
  swiggy: "Swiggy",
  zomato: "Zomato",
  blinkit: "Blinkit",
  zepto: "Zepto",
  instamart: "Instamart",
  bigbasket: "BigBasket",
  amazon: "Amazon",
  flipkart: "Flipkart",
  porter: "Porter",
  uber: "Uber",
  ola: "Ola",
  rapido: "Rapido",
};

function generateOrderId(parsed: NotificationParsed): string {
  if (parsed.orderId) return `${parsed.platform}-${parsed.orderId}`;
  // Generate a dedup key from platform + title + status
  return `${parsed.platform}-${parsed.title?.slice(0, 20) || "unknown"}`;
}

function isStatusUpdate(existingStatus: string, newStatus: string): boolean {
  const statusOrder = ["detected", "confirmed", "picked_up", "arriving", "delivered"];
  const existingIdx = statusOrder.indexOf(existingStatus);
  const newIdx = statusOrder.indexOf(newStatus);
  return newIdx > existingIdx;
}

export async function syncNotificationEventToBackend(parsed: NotificationParsed) {
  const store = useAppStore.getState();
  const now = new Date().toISOString();
  const displayName = platformDisplayNames[parsed.platform] ?? parsed.platform;
  const orderId = generateOrderId(parsed);
  const existingOrder = activeOrders.get(orderId);

  // Handle rides - always create new entry
  if (parsed.platform === "uber" || parsed.platform === "ola" || parsed.platform === "rapido") {
    const distanceKm = estimateDeliveryDistance(parsed.platform, parsed.title || "ride");
    const carbonKg = calculateRideCarbon(distanceKm, parsed.platform);

    const booking: RideBooking = {
      id: `ride-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: parsed.platform as RideBooking["platform"],
      rideType: parsed.platform === "rapido" ? "bike" : "economy",
      pickupLocation: parsed.body || "Detected location",
      dropLocation: parsed.deliveryAddress || "Destination",
      distanceKm,
      durationMinutes: Math.round(distanceKm * 2.5),
      fare: 0,
      kgCo2e: carbonKg,
      vehicleType: inferVehicleType(parsed.platform),
      source: "notification",
      detectedAt: now,
    };

    store.addRideBooking(booking);
    store.addPoints(5, "action_logged", `${displayName} ride detected`);
    addPendingVehicleSelection(displayName, booking.id, parsed.orderId, "ride_booking");

    // Sync to Supabase
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          await ingestCarbonEvent({
            category: "transport",
            label: `${displayName} ride detected`,
            kg_co2e: carbonKg,
            source: "notification",
            occurred_at: now
          });
        }
      }
    } catch {}

    triggerAlerts(store);
    return;
  }

  // Handle food delivery (Swiggy, Zomato)
  if (parsed.platform === "swiggy" || parsed.platform === "zomato") {
    if (existingOrder && parsed.status && isStatusUpdate(existingOrder.status, parsed.status)) {
      // Update existing order status
      activeOrders.set(orderId, { ...existingOrder, status: parsed.status });
      void saveActiveOrders();
      // If delivered, prompt for vehicle type
      if (parsed.status === "delivered") {
        addPendingVehicleSelection(displayName, existingOrder.id, parsed.orderId, "food_delivery");
      }
      return;
    }

    // New order
    const distanceKm = estimateDeliveryDistance(parsed.platform, parsed.title || "restaurant");
    const vehicleType = inferVehicleType(parsed.platform);
    const carbonKg = calculateFoodDeliveryCarbon(distanceKm, vehicleType);
    const entryId = `food-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const delivery: FoodDeliveryLog = {
      id: entryId,
      platform: parsed.platform as FoodDeliveryLog["platform"],
      restaurantName: parsed.title || "Restaurant",
      distanceKm,
      vehicleType,
      orderValue: 0,
      items: [],
      kgCo2e: carbonKg,
      isVegetarian: false,
      source: "notification",
      detectedAt: now,
    };

    store.addFoodDelivery(delivery);
    store.addPoints(5, "action_logged", `${displayName} food delivery detected`);
    store.updateStreak("no_food_delivery", false);

    // Track active order
    activeOrders.set(orderId, { id: entryId, platform: parsed.platform, status: parsed.status || "confirmed", createdAt: Date.now() });
    void saveActiveOrders();

    // Only prompt for vehicle on delivery (not on first notification)
    if (parsed.status === "delivered") {
      addPendingVehicleSelection(displayName, entryId, parsed.orderId, "food_delivery");
    }

    syncToSupabase("food_delivery", `${displayName} food delivery`, carbonKg, now);
    triggerAlerts(store);
    return;
  }

  // Handle grocery delivery (Blinkit, Zepto, Instamart, BigBasket)
  if (parsed.platform === "blinkit" || parsed.platform === "zepto" || parsed.platform === "instamart" || parsed.platform === "bigbasket") {
    if (existingOrder && parsed.status && isStatusUpdate(existingOrder.status, parsed.status)) {
      activeOrders.set(orderId, { ...existingOrder, status: parsed.status });
      void saveActiveOrders();
      if (parsed.status === "delivered") {
        addPendingVehicleSelection(displayName, existingOrder.id, parsed.orderId, "grocery_delivery");
      }
      return;
    }

    const distanceKm = estimateDeliveryDistance(parsed.platform, parsed.title || "store");
    const vehicleType = inferVehicleType(parsed.platform);
    const isQuickCommerce = ["blinkit", "zepto"].includes(parsed.platform);
    const carbonKg = calculateGroceryDeliveryCarbon(distanceKm, vehicleType, isQuickCommerce, parsed.platform);
    const entryId = `grocery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const delivery: GroceryDeliveryLog = {
      id: entryId,
      platform: parsed.platform as GroceryDeliveryLog["platform"],
      storeName: parsed.title || "Store",
      distanceKm,
      vehicleType,
      orderValue: 0,
      items: [],
      kgCo2e: carbonKg,
      isQuickCommerce,
      source: "notification",
      detectedAt: now,
    };

    store.addGroceryDelivery(delivery);
    store.addPoints(5, "action_logged", `${displayName} grocery delivery detected`);

    activeOrders.set(orderId, { id: entryId, platform: parsed.platform, status: parsed.status || "confirmed", createdAt: Date.now() });
    void saveActiveOrders();

    if (parsed.status === "delivered") {
      addPendingVehicleSelection(displayName, entryId, parsed.orderId, "grocery_delivery");
    }

    syncToSupabase("grocery_delivery", `${displayName} grocery delivery`, carbonKg, now);
    triggerAlerts(store);
    return;
  }

  // Handle shopping (Amazon, Flipkart)
  if (parsed.platform === "amazon" || parsed.platform === "flipkart") {
    if (existingOrder && parsed.status && isStatusUpdate(existingOrder.status, parsed.status)) {
      activeOrders.set(orderId, { ...existingOrder, status: parsed.status });
      void saveActiveOrders();
      if (parsed.status === "delivered") {
        addPendingVehicleSelection(displayName, existingOrder.id, parsed.orderId, "shopping");
      }
      return;
    }

    const distanceKm = estimateDeliveryDistance(parsed.platform, parsed.title || "merchant");
    const carbonKg = calculateShoppingCarbon(distanceKm);
    const entryId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const order: DeliveryOrder = {
      id: entryId,
      platform: parsed.platform as DeliveryOrder["platform"],
      orderId: parsed.orderId || `ORD-${Date.now()}`,
      merchantName: parsed.title || "Merchant",
      vehicleType: inferVehicleType(parsed.platform),
      predictedVehicle: inferVehicleType(parsed.platform),
      distanceKm,
      kgCo2e: carbonKg,
      status: (parsed.status as DeliveryOrder["status"]) || "detected",
      orderValue: 0,
      items: [],
      detectedAt: now,
      source: "notification",
      confidence: 0.8,
    };

    store.addDeliveryOrder(order);
    store.addEntry({
      id: `do-${entryId}`,
      category: "shopping",
      label: `${displayName} order (${Math.round(distanceKm * 10) / 10} km)`,
      kgCo2e: carbonKg,
      source: "notification",
      occurredAt: now,
      metadata: { distanceKm }
    });
    store.addPoints(5, "action_logged", `${displayName} order detected`);

    activeOrders.set(orderId, { id: entryId, platform: parsed.platform, status: parsed.status || "confirmed", createdAt: Date.now() });
    void saveActiveOrders();

    if (parsed.status === "delivered") {
      addPendingVehicleSelection(displayName, entryId, parsed.orderId, "shopping");
    }

    syncToSupabase("shopping", `${displayName} order`, carbonKg, now);
    triggerAlerts(store);
    return;
  }
}

async function syncToSupabase(category: string, label: string, kgCo2e: number, occurredAt: string) {
  try {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      await ingestCarbonEvent({
        category,
        label,
        kg_co2e: kgCo2e,
        source: "notification",
        occurred_at: occurredAt
      });
    }
  } catch {}
}

function triggerAlerts(store: ReturnType<typeof useAppStore.getState>) {
  try {
    const updatedStore = useAppStore.getState();
    const alerts = generateSmartAlerts(
      updatedStore.entries,
      updatedStore.shoppingLogs,
      updatedStore.electricityLogs,
      updatedStore.deliveryOrders,
      updatedStore.foodDeliveries,
      updatedStore.groceryDeliveries,
      updatedStore.streaks
    );
    const existingIds = new Set(updatedStore.smartAlerts.map(a => a.id));
    const newAlerts = alerts.filter(a => !existingIds.has(a.id));
    for (const alert of newAlerts.slice(0, 3)) {
      useAppStore.getState().addSmartAlert(alert);
      if (alert.severity === "critical") {
        scheduleCarbonAlert(alert.body).catch(() => {});
      }
    }
  } catch {}
}

let _cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startOrderCleanup() {
  if (_cleanupInterval) return;
  _cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [key, order] of activeOrders.entries()) {
      if (order.createdAt < cutoff) {
        activeOrders.delete(key);
      }
    }
  }, 60 * 60 * 1000);
}

startOrderCleanup();
