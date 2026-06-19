import { CarbonEntry, CarbonScore, Challenge, EcoBadge, ElectricityLog, FlightLog, FoodDeliveryLog, GroceryDeliveryLog, MonitoringEvent, Prediction, Recommendation, RideBooking, ShoppingLog, SmartAlert, Streak, UserPoints } from "../types/domain";

export const score: CarbonScore = {
  dailyKg: 12.4,
  weeklyKg: 82.8,
  monthlyKg: 312.6,
  sustainabilityScore: 92,
  savingsKg: 12,
  goalKg: 9
};

export const weeklyTrend = [
  { day: "Mon", kg: 8.8 },
  { day: "Tue", kg: 10.4 },
  { day: "Wed", kg: 7.9 },
  { day: "Thu", kg: 12.4 },
  { day: "Fri", kg: 6.6 },
  { day: "Sat", kg: 14.7 },
  { day: "Sun", kg: 15.9 }
];

export const recentEntries: CarbonEntry[] = [
  { id: "1", category: "transport", label: "Metro commute", kgCo2e: 1.4, source: "gps", occurredAt: new Date().toISOString() },
  { id: "2", category: "electricity", label: "Bill estimate", kgCo2e: 7.6, source: "ocr", occurredAt: new Date().toISOString() },
  { id: "3", category: "food", label: "Plant-forward lunch", kgCo2e: 1.1, source: "manual", occurredAt: new Date().toISOString() },
  { id: "4", category: "shopping", label: "Grouped delivery", kgCo2e: 0.9, source: "email", occurredAt: new Date().toISOString() },
  { id: "5", category: "food_delivery", label: "Swiggy - KFC", kgCo2e: 1.8, source: "notification", occurredAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "6", category: "grocery_delivery", label: "Blinkit - Weekly groceries", kgCo2e: 0.6, source: "notification", occurredAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "7", category: "transport", label: "Uber ride", kgCo2e: 2.4, source: "notification", occurredAt: new Date(Date.now() - 10800000).toISOString() }
];

export const electricityLogs: ElectricityLog[] = [
  {
    id: "el1",
    provider: "BSES Rajdhani",
    unitsKwh: 214,
    billAmount: 1840,
    billingPeriod: "May 2026",
    region: "india",
    kgCo2e: 152.94,
    source: "ocr",
    createdAt: new Date().toISOString()
  },
  {
    id: "el2",
    provider: "BSES Rajdhani",
    unitsKwh: 198,
    billAmount: 1650,
    billingPeriod: "April 2026",
    region: "india",
    kgCo2e: 141.57,
    source: "manual",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  }
];

export const ecoBadges: EcoBadge[] = [
  { id: "badge-1", title: "Metro Mover", description: "Logged 5 low-carbon public transport trips.", icon: "train", earned: true, progress: 100 },
  { id: "badge-2", title: "Energy Watcher", description: "Add two electricity logs to unlock appliance insights.", icon: "flash", earned: true, progress: 100 },
  { id: "badge-3", title: "Green Streak", description: "Keep daily carbon under your goal for 7 days.", icon: "trophy", earned: false, progress: 43 },
  { id: "badge-4", title: "Delivery Free", description: "Go 3 days without food delivery.", icon: "restaurant", earned: false, progress: 67 },
  { id: "badge-5", title: "Eco Champion", description: "Reach sustainability score of 90+.", icon: "star", earned: true, progress: 100 },
  { id: "badge-6", title: "Route Master", description: "Use AI route comparison 10 times.", icon: "map", earned: false, progress: 40 },
  { id: "badge-7", title: "Bill Scanner", description: "Scan 5 electricity bills with OCR.", icon: "scan", earned: false, progress: 60 },
  { id: "badge-8", title: "Notification Listener", description: "Track 20 delivery notifications.", icon: "notifications", earned: false, progress: 35 },
  { id: "badge-9", title: "Walk Champion", description: "Walk or cycle for 10 short trips.", icon: "walk", earned: false, progress: 30 },
  { id: "badge-10", title: "Carbon Saver", description: "Save 50 kg CO₂ through recommendations.", icon: "leaf", earned: false, progress: 48 }
];

export const recommendations: Recommendation[] = [
  { id: "r1", title: "Walk the 2 km errand loop", impactKg: 0.5, difficulty: "easy", category: "transport", reason: "Two short car trips this week can be replaced without increasing travel time much." },
  { id: "r2", title: "Shift fan and standby loads", impactKg: 3.2, difficulty: "medium", category: "electricity", reason: "Your evening electricity pattern is above your baseline for three consecutive days." },
  { id: "r3", title: "Group grocery deliveries", impactKg: 1.8, difficulty: "easy", category: "shopping", reason: "Combining quick-commerce orders cuts duplicated delivery emissions." },
  { id: "r4", title: "Take metro instead of cab", impactKg: 4.2, difficulty: "medium", category: "transport", reason: "Metro produces 92% less CO₂ than cab per kilometer for your daily commute." },
  { id: "r5", title: "Order vegetarian meals", impactKg: 2.5, difficulty: "easy", category: "food", reason: "Vegetarian meals produce 80% less carbon than non-vegetarian meals." }
];

export const prediction: Prediction = {
  nextWeekKg: 76.2,
  nextMonthKg: 296.1,
  nextQuarterKg: 888.3,
  annualKg: 3548,
  risk: "medium",
  sustainabilityScore: 86,
  drivers: ["Transport emissions may rise 18% next month", "Food delivery frequency is above baseline", "Shopping express delivery is increasing packaging impact"]
};

export const flightLogs: FlightLog[] = [
  { id: "f1", flightNumber: "6E 2134", departureAirport: "DEL", destinationAirport: "BOM", departureDate: "2026-06-18", passengerCount: 1, distanceKm: 1148, kgCo2e: 292.74, source: "gmail", confidence: 0.92 },
  { id: "f2", flightNumber: "AI 506", departureAirport: "DEL", destinationAirport: "BLR", departureDate: "2026-07-02", passengerCount: 1, distanceKm: 1740, kgCo2e: 443.7, source: "ocr", confidence: 0.88 }
];

export const shoppingLogs: ShoppingLog[] = [
  { id: "s1", vendor: "amazon", productName: "Bluetooth headphones", category: "electronics", quantity: 1, deliveryType: "express", orderValue: 2499, manufacturingKg: 28, packagingKg: 0.45, deliveryKg: 1.4, totalKgCo2e: 29.85, source: "gmail", confidence: 0.9 },
  { id: "s2", vendor: "blinkit", productName: "Weekly groceries", category: "grocery", quantity: 6, deliveryType: "grouped", orderValue: 1180, manufacturingKg: 9.6, packagingKg: 2.7, deliveryKg: 0.35, totalKgCo2e: 12.65, source: "notification", confidence: 0.82 },
  { id: "s3", vendor: "flipkart", productName: "Smart watch", category: "electronics", quantity: 1, deliveryType: "standard", orderValue: 3999, manufacturingKg: 28, packagingKg: 0.45, deliveryKg: 0.7, totalKgCo2e: 29.15, source: "gmail", confidence: 0.88 }
];

export const monitoringEvents: MonitoringEvent[] = [
  { id: "m1", detectedMode: "metro", distanceKm: 18, durationMinutes: 42, confidence: 0.87, source: "activity", kgCo2e: 0.5, occurredAt: new Date().toISOString() },
  { id: "m2", detectedMode: "car", distanceKm: 6.4, durationMinutes: 24, confidence: 0.78, source: "gps", kgCo2e: 1.23, occurredAt: new Date().toISOString() }
];

export const smartAlerts: SmartAlert[] = [
  { id: "a1", type: "high_carbon", title: "High Carbon Alert", body: "You generated 35% more emissions today than your usual baseline.", severity: "warning", impactKg: 4.2, actionLabel: "View alternatives", actionRoute: "Track", createdAt: new Date().toISOString(), read: false },
  { id: "a2", type: "shopping", title: "Express Delivery Impact", body: "This express delivery produced about 2x more emissions than grouped delivery.", severity: "info", impactKg: 1.05, createdAt: new Date().toISOString(), read: false },
  { id: "a3", type: "food", title: "Walking Distance Alert", body: "Restaurant is only 700 meters away. Walking would save 100% delivery emissions.", severity: "info", impactKg: 0.3, createdAt: new Date().toISOString(), read: false },
  { id: "a4", type: "electricity", title: "Electricity Usage Alert", body: "BSES Rajdhani usage is 214 kWh for May 2026. LED lights and AC optimization can reduce this.", severity: "warning", impactKg: 12.5, createdAt: new Date().toISOString(), read: false },
  { id: "a5", type: "travel", title: "Metro Alternative Available", body: "Your vehicle trips are above baseline. Metro twice this week could save 4.2 kg CO₂.", severity: "info", impactKg: 4.2, actionLabel: "Compare routes", actionRoute: "Track", createdAt: new Date().toISOString(), read: false }
];

export const foodDeliveries: FoodDeliveryLog[] = [
  { id: "fd1", platform: "swiggy", restaurantName: "KFC", distanceKm: 3.2, vehicleType: "bike", orderValue: 350, items: ["Zinger Burger", "Fries"], kgCo2e: 1.8, isVegetarian: false, source: "notification", detectedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "fd2", platform: "zomato", restaurantName: "Starbucks", distanceKm: 2.1, vehicleType: "e_bike", orderValue: 520, items: ["Cappuccino", "Sandwich"], kgCo2e: 0.9, isVegetarian: true, source: "notification", detectedAt: new Date(Date.now() - 7200000).toISOString() }
];

export const groceryDeliveries: GroceryDeliveryLog[] = [
  { id: "gd1", platform: "blinkit", storeName: "Sector 12 Warehouse", distanceKm: 2.5, vehicleType: "ELECTRIC_BIKE", orderValue: 800, items: ["Milk", "Bread", "Eggs", "Vegetables"], kgCo2e: 0.6, isQuickCommerce: true, source: "notification", detectedAt: new Date(Date.now() - 10800000).toISOString() }
];

export const rideBookings: RideBooking[] = [
  { id: "rb1", platform: "uber", rideType: "economy", pickupLocation: "Rohini", dropLocation: "Connaught Place", distanceKm: 18, durationMinutes: 35, fare: 280, kgCo2e: 3.46, vehicleType: "sedan", source: "notification", detectedAt: new Date(Date.now() - 14400000).toISOString() }
];

export const streaks: Streak[] = [
  { id: "streak-1", type: "no_food_delivery", count: 2, bestCount: 5, lastUpdated: new Date().toISOString(), active: true },
  { id: "streak-2", type: "metro_commute", count: 3, bestCount: 7, lastUpdated: new Date().toISOString(), active: true },
  { id: "streak-3", type: "low_electricity", count: 0, bestCount: 10, lastUpdated: new Date().toISOString(), active: false },
  { id: "streak-4", type: "walk_or_cycle", count: 1, bestCount: 4, lastUpdated: new Date().toISOString(), active: true }
];

export const challenges: Challenge[] = [
  { id: "ch-1", title: "Metro Week", description: "Use metro for commute 5 times this week", category: "transport", target: 5, progress: 3, unit: "trips", reward: 150, startDate: new Date(Date.now() - 3 * 86400000).toISOString(), endDate: new Date(Date.now() + 4 * 86400000).toISOString(), completed: false },
  { id: "ch-2", title: "No Delivery Days", description: "Avoid food delivery for 3 consecutive days", category: "food", target: 3, progress: 2, unit: "days", reward: 100, startDate: new Date(Date.now() - 2 * 86400000).toISOString(), endDate: new Date(Date.now() + 5 * 86400000).toISOString(), completed: false },
  { id: "ch-3", title: "Green Electricity", description: "Reduce electricity usage by 10% this month", category: "electricity", target: 10, progress: 7, unit: "percent", reward: 200, startDate: new Date(Date.now() - 15 * 86400000).toISOString(), endDate: new Date(Date.now() + 15 * 86400000).toISOString(), completed: false },
  { id: "ch-4", title: "Walk Champion", description: "Walk or cycle for 5 short trips", category: "lifestyle", target: 5, progress: 1, unit: "trips", reward: 180, startDate: new Date(Date.now() - 1 * 86400000).toISOString(), endDate: new Date(Date.now() + 6 * 86400000).toISOString(), completed: false }
];

export const userPoints: UserPoints = {
  total: 4280,
  level: 12,
  xp: 280,
  xpToNextLevel: 500,
  history: [
    { id: "p1", type: "daily_login", amount: 10, description: "Daily login", timestamp: new Date().toISOString() },
    { id: "p2", type: "action_logged", amount: 25, description: "Logged metro commute", timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: "p3", type: "streak_milestone", amount: 50, description: "3-day metro streak", timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: "p4", type: "badge_earned", amount: 100, description: "Earned Metro Mover badge", timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: "p5", type: "recommendation_adopted", amount: 50, description: "Adopted: Walk errand loop", timestamp: new Date(Date.now() - 3 * 86400000).toISOString() }
  ]
};
