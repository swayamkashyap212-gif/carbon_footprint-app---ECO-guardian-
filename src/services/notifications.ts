import { Platform } from "react-native";
import { DeliveryPlatform, NotificationParsed } from "../types/domain";
import {
  isNotificationListenerEnabled as nativeIsEnabled,
  openNotificationListenerSettings as nativeOpenSettings,
  subscribeToNativeNotifications,
  subscribeToListenerStatus,
  drainQueuedNotifications,
  NativeNotificationEvent
} from "../native/notificationBridge";

let Notifications: any = null;
let notificationsInitialized = false;
let nativeListenerActive = false;
let unsubscribeNative: (() => void) | null = null;
let unsubscribeStatus: (() => void) | null = null;
let statusCheckInterval: ReturnType<typeof setInterval> | null = null;
let statusCheckAttempts = 0;
const MAX_STATUS_CHECK_ATTEMPTS = 30;

export type AppCategory = "delivery" | "ride" | "navigation" | "shopping" | "ignore";

const appCategoryMap: Record<string, AppCategory> = {
  "in.swiggy.android": "delivery",
  "com.application.zomato": "delivery",
  "com.grofers.customerapp": "delivery",
  "com.zeptoconsumerapp": "delivery",
  "com.blinkit.app": "delivery",
  "com.swiggy.instamart": "delivery",
  "com.bigbasket.android": "delivery",
  "com.ubercab": "ride",
  "com.olacabs.customer": "ride",
  "com.rapido.passenger": "ride",
  "in.amazon.mShop.android.shopping": "shopping",
  "com.flipkart.android": "shopping",
  "com.theporter.android.customerapp": "delivery",
  "com.google.android.apps.maps": "navigation",
  "com.waze": "navigation",
  "com.here.app": "navigation",
  "com.citymapper.app": "navigation",
};

const navigationKeywords = [
  "turn left", "turn right", "in 400", "in 300", "in 200", "in 150", "in 100", "in 50",
  "in 500", "in 1 km", "in 2 km", "in 3 km",
  "head towards", "take the highway", "continue for", "arrive at destination", "destination is on",
  "recalculating", "fastest route", "traffic on route", "slight left", "slight right",
  "exit the highway", "merge onto", "keep left", "keep right", "u-turn", "roundabout",
  "navigate to", "starting navigation", "eta", "minutes away", "km left",
  "speed camera", "road closure", "alternate route",
  // Google Maps specific - compound phrases only to avoid false positives
  "destination reached", "you have arrived", "arrived at destination",
  "start navigation", "navigation started", "navigation ended",
  "head north", "head south", "head east", "head west",
  // Waze specific
  "police reported", "hazard reported"
];

export function getAppCategory(packageName: string, notificationText: string): AppCategory {
  const known = appCategoryMap[packageName];
  if (known) return known;

  const text = notificationText.toLowerCase();
  if (navigationKeywords.some(kw => text.includes(kw))) return "navigation";

  return "ignore";
}

export function isNotificationsInitialized(): boolean {
  return notificationsInitialized;
}

export function isNativeNotificationListenerActive(): boolean {
  return nativeListenerActive;
}

export async function initializeNotifications() {
  if (notificationsInitialized) return;
  notificationsInitialized = true;

  try {
    Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {}

  if (Platform.OS === "android") {
    await startNativeNotificationListener();
    await drainQueuedEvents();
  }
}

async function startNativeNotificationListener() {
  if (unsubscribeNative) return;

  unsubscribeNative = subscribeToNativeNotifications(
    (event: NativeNotificationEvent) => {
      nativeListenerActive = true;
      handleRealNotification(event);
    }
  );

  unsubscribeStatus = subscribeToListenerStatus((enabled: boolean) => {
    nativeListenerActive = enabled;
  });

  const enabled = await checkNativeListenerStatus();
  nativeListenerActive = enabled;

  if (!enabled) {
    statusCheckAttempts = 0;
    statusCheckInterval = setInterval(async () => {
      statusCheckAttempts++;
      const nowEnabled = await checkNativeListenerStatus();
      if ((nowEnabled || statusCheckAttempts >= MAX_STATUS_CHECK_ATTEMPTS) && statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
      }
    }, 5000);
  }
}

export async function checkNativeListenerStatus(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  try {
    const enabled = await nativeIsEnabled();
    nativeListenerActive = enabled;
    return enabled;
  } catch {
    return false;
  }
}

async function drainQueuedEvents(): Promise<void> {
  try {
    const queued = await drainQueuedNotifications();
    for (const event of queued) {
      handleRealNotification(event);
    }
    if (queued.length > 0) {
    }
  } catch {}
}

export function openNotificationSettings() {
  if (Platform.OS === "android") {
    nativeOpenSettings();
  }
}

function handleRealNotification(event: NativeNotificationEvent) {
  const combined = `${event.title} ${event.body}`;
  const category = getAppCategory(event.packageName, combined);

  if (category === "ignore") return;

  if (category === "navigation") {
    try {
      const { handleNavigationNotification } = require("./navigationTracker");
      handleNavigationNotification(event.title, event.body, event.packageName);
    } catch {}
    return;
  }

  const parsed = parseNotificationText(event.title, event.body, event.packageName, event.timestamp);

  if (parsed.platform === "other") return;

  try {
    const { syncNotificationEventToBackend } = require("./notificationProcessor");
    syncNotificationEventToBackend(parsed);
  } catch {}
}

export async function registerForPushNotifications() {
  if (!Notifications) return null;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function scheduleCarbonAlert(message: string) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: "EcoGuardian Alert", body: message, sound: true },
      trigger: { seconds: 2 },
    });
  } catch {}
}

export async function scheduleRecurringAlert(title: string, message: string, hours: number) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body: message, sound: true },
      trigger: { seconds: hours * 3600, repeats: true },
    });
  } catch {}
}

const platformKeywords: Record<DeliveryPlatform, string[]> = {
  swiggy: ["swiggy", "swiggy order", "swiggy delivery", "swiggy rider", "swiggy delivered"],
  zomato: ["zomato", "zomato order", "zomato delivery", "zomato rider"],
  blinkit: ["blinkit", "blinkit order", "blinkit delivery"],
  zepto: ["zepto", "zepto order", "zepto delivery", "zepto express"],
  instamart: ["instamart", "instamart order"],
  bigbasket: ["bigbasket", "bigbasket order", "bb order"],
  amazon: ["amazon", "amazon order", "amazon delivery", "amazon shipping"],
  flipkart: ["flipkart", "flipkart order", "flipkart delivery"],
  porter: ["porter", "porter delivery", "porter pickup"],
  uber: ["uber", "uber trip", "uber ride", "uber eat"],
  ola: ["ola", "ola ride", "ola trip"],
  rapido: ["rapido", "rapido ride", "rapido delivery"],
  other: []
};

const packageNameToPlatform: Record<string, DeliveryPlatform> = {
  "in.swiggy.android": "swiggy",
  "com.application.zomato": "zomato",
  "com.blinkit.app": "blinkit",
  "com.zeptoconsumerapp": "zepto",
  "com.grofers.customerapp": "blinkit",
  "com.swiggy.instamart": "instamart",
  "com.bigbasket.android": "bigbasket",
  "in.amazon.mShop.android.shopping": "amazon",
  "com.flipkart.android": "flipkart",
  "com.theporter.android.customerapp": "porter",
  "com.ubercab": "uber",
  "com.olacabs.customer": "ola",
  "com.rapido.passenger": "rapido",
};

const statusKeywords: Record<string, string[]> = {
  confirmed: ["confirmed", "placed", "order placed", "successfully placed"],
  picked_up: ["picked up", "rider assigned", "on the way", "picked up by"],
  arriving: ["arriving", "near you", "almost there", "minutes away", "out for delivery"],
  delivered: ["delivered", "enjoy", "has been delivered", "delivered successfully"]
};

export function parseNotificationText(title: string, body: string, packageName: string, notificationTimestamp?: number): NotificationParsed {
  const combined = `${title} ${body}`.toLowerCase();
  const pkg = packageName.toLowerCase();

  let platform: DeliveryPlatform = "other";

  if (packageNameToPlatform[packageName]) {
    platform = packageNameToPlatform[packageName];
  } else {
    for (const [key, keywords] of Object.entries(platformKeywords)) {
      if (keywords.some(kw => combined.includes(kw)) || pkg.includes(key)) {
        platform = key as DeliveryPlatform;
        break;
      }
    }
  }

  let status: string | undefined;
  for (const [key, keywords] of Object.entries(statusKeywords)) {
    if (keywords.some(kw => combined.includes(kw))) {
      status = key;
      break;
    }
  }

  const orderIdMatch = combined.match(/order\s*(?:id|number|#)?\s*:?\s*([a-z0-9\-]+)/i);
  const orderId = orderIdMatch?.[1];

  const timeMatch = combined.match(/(\d+)\s*min(?:ute)?s?\s*(?:away|remaining|left)/i);
  const estimatedTime = timeMatch?.[1] ? `${timeMatch[1]} minutes` : undefined;

  const addressMatch = combined.match(/(?:delivered?\s*(?:at|to)\s+)(.+?)(?:\.|$)/i);
  const deliveryAddress = addressMatch?.[1]?.trim();

  return {
    platform,
    title,
    body,
    packageName,
    timestamp: notificationTimestamp ? new Date(notificationTimestamp).toISOString() : new Date().toISOString(),
    orderId,
    status,
    deliveryAddress,
    estimatedTime
  };
}

export function getPlatformDisplayName(platform: DeliveryPlatform): string {
  const names: Record<DeliveryPlatform, string> = {
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
    other: "Other"
  };
  return names[platform];
}

export function isFoodDeliveryPlatform(platform: DeliveryPlatform): boolean {
  return ["swiggy", "zomato"].includes(platform);
}

export function isGroceryPlatform(platform: DeliveryPlatform): boolean {
  return ["blinkit", "zepto", "instamart", "bigbasket"].includes(platform);
}

export function isShoppingPlatform(platform: DeliveryPlatform): boolean {
  return ["amazon", "flipkart"].includes(platform);
}

export function isRidePlatform(platform: DeliveryPlatform): boolean {
  return ["uber", "ola", "rapido"].includes(platform);
}

export function cleanupNativeListener() {
  if (unsubscribeNative) {
    unsubscribeNative();
    unsubscribeNative = null;
  }
  if (unsubscribeStatus) {
    unsubscribeStatus();
    unsubscribeStatus = null;
  }
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
  }
  nativeListenerActive = false;
}
