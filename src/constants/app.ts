export const APP_NAME = "EcoGuardian AI";
export const APP_VERSION = "21.0.0";
export const APP_BUNDLE_ID = "com.ecoguardian.ai";

export const STORAGE_KEYS = {
  APP_STATE: "ecoguardian.appState",
  TRACKING_PREFS: "ecoguardian.trackingPrefs",
  LOCATION_STATS: "ecoguardian.locationStats",
  ACTIVE_ORDERS: "ecoguardian.activeOrders",
  MASTER_TRACKING: "ecoguardian.masterTrackingEnabled",
  USER_SESSION: "ecoguardian.userSession",
  ONBOARDING_COMPLETE: "ecoguardian.onboardingComplete",
} as const;

export const API_ENDPOINTS = {
  CARBON_INGEST: "/carbon/ingest",
  FLIGHT_LOGS: "/flights",
  SHOPPING_LOGS: "/shopping",
  FOOD_DELIVERIES: "/food-deliveries",
  GROCERY_DELIVERIES: "/grocery-deliveries",
  RIDE_BOOKINGS: "/rides",
  DELIVERY_ORDERS: "/orders",
  SMART_ALERTS: "/alerts",
  CHALLENGES: "/challenges",
  USER_POINTS: "/points",
  STREAKS: "/streaks",
  BADGES: "/badges",
  RECOMMENDATIONS: "/recommendations",
  PREDICTIONS: "/predictions",
} as const;

export const LIMITS = {
  MAX_ENTRIES: 100,
  MAX_FLIGHT_LOGS: 50,
  MAX_SHOPPING_LOGS: 50,
  MAX_FOOD_DELIVERIES: 50,
  MAX_GROCERY_DELIVERIES: 50,
  MAX_RIDE_BOOKINGS: 50,
  MAX_DELIVERY_ORDERS: 50,
  MAX_MONITORING_EVENTS: 100,
  MAX_SMART_ALERTS: 50,
  MAX_RECOMMENDATIONS: 20,
  MAX_POINTS_HISTORY: 100,
  MAX_CHALLENGES: 10,
  MAX_STREAKS: 10,
  MAX_NOTIFICATION_QUEUE: 100,
} as const;

export const THRESHOLDS = {
  LOW_CARBON_KG: 8,
  MEDIUM_CARBON_KG: 16,
  HIGH_CARBON_KG: 24,
  CRITICAL_CARBON_KG: 36,
  DAILY_GOAL_KG: 9,
  WEEKLY_GOAL_KG: 63,
  MONTHLY_GOAL_KG: 270,
  WALKING_DISTANCE_KM: 0.7,
  QUICK_COMMERCE_DISTANCE_KM: 2.5,
  NEAR_DELIVERY_KM: 3,
  FAR_DELIVERY_KM: 10,
} as const;

export const TIMING = {
  SESSION_REFRESH_MS: 4 * 60 * 1000,
  HEALTH_CHECK_MS: 30 * 1000,
  BACKGROUND_HEALTH_CHECK_MS: 60 * 1000,
  LOCATION_UPDATE_MS: 30 * 1000,
  LOCATION_DISTANCE_M: 50,
  REVERSE_GEOCODE_MS: 5 * 60 * 1000,
  STOP_THRESHOLD_MS: 5 * 60 * 1000,
  NAVIGATION_TIMEOUT_MS: 30 * 60 * 1000,
  DEDUP_WINDOW_MS: 60 * 1000,
  STATUS_CHECK_INTERVAL_MS: 5 * 1000,
  MAX_STATUS_CHECK_ATTEMPTS: 30,
  ORDER_CLEANUP_HOURS: 24,
  SPLASH_TIMEOUT_MS: 10000,
} as const;

export const SPEED_THRESHOLDS = {
  WALKING_KMH: 5,
  CYCLING_KMH: 15,
  BIKE_KMH: 30,
  CAR_KMH: 50,
  BUS_KMH: 80,
  TRAIN_KMH: 120,
} as const;

export const CABIN_MULTIPLIERS = {
  economy: 1,
  premium_economy: 1.2,
  business: 1.5,
  first: 2,
} as const;

export const FUEL_MULTIPLIERS = {
  petrol: 1.0,
  diesel: 0.95,
  cng: 0.8,
  electric: 0.3,
  hybrid: 0.6,
} as const;
