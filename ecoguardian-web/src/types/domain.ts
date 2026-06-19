export type CarbonCategory =
  | "electricity"
  | "transport"
  | "flight"
  | "food"
  | "food_waste"
  | "shopping"
  | "food_delivery"
  | "grocery_delivery"
  | "ride_booking"
  | "routine";

export type TransportMode = "car" | "bike" | "bus" | "metro" | "train" | "flight" | "walking" | "cycling";
export type TrackingSource = "manual" | "ocr" | "email" | "gmail" | "gps" | "sms" | "notification" | "activity" | "ai";
export type ShoppingCategory = "electronics" | "fashion" | "grocery" | "food" | "home_appliances" | "personal_care" | "medicine" | "books" | "furniture" | "sports" | "beauty";
export type DeliveryType = "standard" | "express" | "grouped" | "pickup";

export type DeliveryPlatform =
  | "swiggy" | "zomato" | "blinkit" | "zepto" | "instamart"
  | "bigbasket" | "amazon" | "flipkart" | "porter"
  | "uber" | "ola" | "rapido" | "other";

export type DeliveryVehicleType =
  | "ELECTRIC_BIKE" | "PETROL_BIKE" | "SCOOTER"
  | "EV_CAR" | "PETROL_CAR" | "DIESEL_CAR"
  | "CYCLE" | "WALKING" | "VAN" | "AUTO_RICKSHAW" | "UNKNOWN";

export type DeliveryOrderStatus =
  | "detected" | "confirmed" | "picked_up" | "arriving" | "delivered" | "cancelled";

export type CarbonEntry = {
  id: string;
  category: CarbonCategory;
  label: string;
  kgCo2e: number;
  source: TrackingSource;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type CarbonScore = {
  dailyKg: number;
  weeklyKg: number;
  monthlyKg: number;
  sustainabilityScore: number;
  savingsKg: number;
  goalKg: number;
};

export type ElectricityLog = {
  id: string;
  provider: string;
  unitsKwh: number;
  billAmount: number;
  billingPeriod: string;
  region: string;
  kgCo2e: number;
  source: "manual" | "ocr" | "gmail";
  createdAt: string;
};

export type EcoBadge = {
  id: string;
  title: string;
  description: string;
  icon: "leaf" | "flash" | "train" | "trophy" | "basket" | "restaurant" | "star" | "heart" | "flame" | "ribbon" | "map" | "scan" | "notifications" | "walk" | "bicycle" | "car" | "airplane";
  earned: boolean;
  progress: number;
};

export type Recommendation = {
  id: string;
  title: string;
  impactKg: number;
  difficulty: "easy" | "medium" | "hard";
  category: CarbonCategory;
  reason: string;
};

export type Prediction = {
  nextWeekKg: number;
  nextMonthKg: number;
  nextQuarterKg: number;
  annualKg: number;
  risk: "low" | "medium" | "high";
  sustainabilityScore: number;
  drivers: string[];
};

export type FlightLog = {
  id: string;
  flightNumber: string;
  departureAirport: string;
  destinationAirport: string;
  departureDate: string;
  passengerCount: number;
  distanceKm: number;
  kgCo2e: number;
  source: "gmail" | "ocr" | "manual";
  confidence: number;
};

export type ShoppingLog = {
  id: string;
  vendor: DeliveryPlatform;
  productName: string;
  category: ShoppingCategory;
  quantity: number;
  deliveryType: DeliveryType;
  orderValue: number;
  manufacturingKg: number;
  packagingKg: number;
  deliveryKg: number;
  totalKgCo2e: number;
  source: "gmail" | "ocr" | "sms" | "notification" | "manual";
  confidence: number;
};

export type MonitoringEvent = {
  id: string;
  detectedMode: TransportMode;
  distanceKm: number;
  durationMinutes: number;
  confidence: number;
  source: "gps" | "activity" | "manual";
  kgCo2e: number;
  occurredAt: string;
};

export type SmartAlert = {
  id: string;
  type: "high_carbon" | "travel" | "shopping" | "electricity" | "food" | "ride_booking" | "flight" | "weekly_summary" | "streak";
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  impactKg?: number;
  actionLabel?: string;
  actionRoute?: string;
  createdAt: string;
  read: boolean;
};

export type DeliveryOrder = {
  id: string;
  platform: DeliveryPlatform;
  orderId: string;
  merchantName: string;
  merchantLocation?: string;
  userLocation?: string;
  deliveryAddress?: string;
  estimatedDeliveryTime?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  vehicleType: DeliveryVehicleType;
  predictedVehicle: DeliveryVehicleType;
  distanceKm: number;
  kgCo2e: number;
  status: DeliveryOrderStatus;
  orderValue: number;
  items: string[];
  detectedAt: string;
  confirmedAt?: string;
  pickedUpAt?: string;
  arrivingAt?: string;
  deliveredAt?: string;
  source: "notification" | "email" | "manual";
  confidence: number;
};

export type RideBooking = {
  id: string;
  platform: "uber" | "ola" | "rapido" | "other";
  rideType: "economy" | "premium" | "shared" | "auto" | "bike";
  pickupLocation: string;
  dropLocation: string;
  distanceKm: number;
  durationMinutes: number;
  fare: number;
  kgCo2e: number;
  vehicleType: string;
  source: "notification" | "email" | "manual";
  detectedAt: string;
};

export type FoodDeliveryLog = {
  id: string;
  platform: "swiggy" | "zomato" | "other";
  restaurantName: string;
  distanceKm: number;
  vehicleType: string;
  orderValue: number;
  items: string[];
  kgCo2e: number;
  isVegetarian: boolean;
  source: "notification" | "email" | "manual";
  detectedAt: string;
};

export type GroceryDeliveryLog = {
  id: string;
  platform: "blinkit" | "zepto" | "instamart" | "bigbasket" | "other";
  storeName: string;
  distanceKm: number;
  vehicleType: string;
  orderValue: number;
  items: string[];
  kgCo2e: number;
  isQuickCommerce: boolean;
  source: "notification" | "email" | "manual";
  detectedAt: string;
};

export type Streak = {
  id: string;
  type: "no_food_delivery" | "metro_commute" | "low_electricity" | "walk_or_cycle" | "no_shopping";
  count: number;
  bestCount: number;
  lastUpdated: string;
  active: boolean;
};

export type Challenge = {
  id: string;
  title: string;
  description: string;
  category: "transport" | "food" | "electricity" | "shopping" | "lifestyle";
  target: number;
  progress: number;
  unit: string;
  reward: number;
  startDate: string;
  endDate: string;
  completed: boolean;
  completedAt?: string;
};

export type UserPoints = {
  total: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  history: PointsEvent[];
};

export type PointsEvent = {
  id: string;
  type: "badge_earned" | "challenge_completed" | "streak_milestone" | "action_logged" | "daily_login" | "recommendation_adopted";
  amount: number;
  description: string;
  timestamp: string;
};

export type NotificationParsed = {
  platform: DeliveryPlatform;
  title: string;
  body: string;
  packageName: string;
  timestamp: string;
  orderId?: string;
  merchantName?: string;
  status?: string;
  deliveryAddress?: string;
  estimatedTime?: string;
  vehicleType?: string;
};
