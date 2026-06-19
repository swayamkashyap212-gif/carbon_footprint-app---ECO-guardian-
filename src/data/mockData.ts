import { CarbonEntry, CarbonScore, Challenge, EcoBadge, ElectricityLog, FlightLog, FoodDeliveryLog, GroceryDeliveryLog, MonitoringEvent, Prediction, Recommendation, RideBooking, ShoppingLog, SmartAlert, Streak, UserPoints } from "../types/domain";

export const score: CarbonScore = {
  dailyKg: 0,
  weeklyKg: 0,
  monthlyKg: 0,
  sustainabilityScore: 100,
  savingsKg: 0,
  goalKg: 9
};

export const weeklyTrend = [
  { day: "Mon", kg: 0 },
  { day: "Tue", kg: 0 },
  { day: "Wed", kg: 0 },
  { day: "Thu", kg: 0 },
  { day: "Fri", kg: 0 },
  { day: "Sat", kg: 0 },
  { day: "Sun", kg: 0 }
];

export const recentEntries: CarbonEntry[] = [];

export const electricityLogs: ElectricityLog[] = [];

export const ecoBadges: EcoBadge[] = [
  { id: "badge-1", title: "Metro Mover", description: "Logged 5 low-carbon public transport trips.", icon: "train", earned: false, progress: 0 },
  { id: "badge-2", title: "Energy Watcher", description: "Add two electricity logs to unlock appliance insights.", icon: "flash", earned: false, progress: 0 },
  { id: "badge-3", title: "Green Streak", description: "Keep daily carbon under your goal for 7 days.", icon: "trophy", earned: false, progress: 0 },
  { id: "badge-4", title: "Delivery Free", description: "Go 3 days without food delivery.", icon: "restaurant", earned: false, progress: 0 },
  { id: "badge-5", title: "Eco Champion", description: "Reach sustainability score of 90+.", icon: "star", earned: false, progress: 0 },
  { id: "badge-6", title: "Route Master", description: "Use AI route comparison 10 times.", icon: "map", earned: false, progress: 0 },
  { id: "badge-7", title: "Bill Scanner", description: "Scan 5 electricity bills with OCR.", icon: "scan", earned: false, progress: 0 },
  { id: "badge-8", title: "Notification Listener", description: "Track 20 delivery notifications.", icon: "notifications", earned: false, progress: 0 },
  { id: "badge-9", title: "Walk Champion", description: "Walk or cycle for 10 short trips.", icon: "walk", earned: false, progress: 0 },
  { id: "badge-10", title: "Carbon Saver", description: "Save 50 kg CO₂ through recommendations.", icon: "leaf", earned: false, progress: 0 }
];

export const recommendations: Recommendation[] = [
  { id: "r1", title: "Walk the 2 km errand loop", impactKg: 0.5, difficulty: "easy", category: "transport", reason: "Two short car trips this week can be replaced without increasing travel time much." },
  { id: "r2", title: "Shift fan and standby loads", impactKg: 3.2, difficulty: "medium", category: "electricity", reason: "Your evening electricity pattern is above your baseline for three consecutive days." },
  { id: "r3", title: "Group grocery deliveries", impactKg: 1.8, difficulty: "easy", category: "shopping", reason: "Combining quick-commerce orders cuts duplicated delivery emissions." },
  { id: "r4", title: "Take metro instead of cab", impactKg: 4.2, difficulty: "medium", category: "transport", reason: "Metro produces 92% less CO₂ than cab per kilometer for your daily commute." },
  { id: "r5", title: "Order vegetarian meals", impactKg: 2.5, difficulty: "easy", category: "food", reason: "Vegetarian meals produce 80% less carbon than non-vegetarian meals." }
];

export const prediction: Prediction = {
  nextWeekKg: 0,
  nextMonthKg: 0,
  nextQuarterKg: 0,
  annualKg: 0,
  risk: "low",
  sustainabilityScore: 100,
  drivers: []
};

export const flightLogs: FlightLog[] = [];

export const shoppingLogs: ShoppingLog[] = [];

export const monitoringEvents: MonitoringEvent[] = [];

export const smartAlerts: SmartAlert[] = [];

export const foodDeliveries: FoodDeliveryLog[] = [];

export const groceryDeliveries: GroceryDeliveryLog[] = [];

export const rideBookings: RideBooking[] = [];

export const streaks: Streak[] = [
  { id: "streak-1", type: "no_food_delivery", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
  { id: "streak-2", type: "metro_commute", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
  { id: "streak-3", type: "low_electricity", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
  { id: "streak-4", type: "walk_or_cycle", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
  { id: "streak-5", type: "no_shopping", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false }
];

export const challenges: Challenge[] = [
  {
    id: "ch-1", title: "Metro Week", description: "Use metro for commute 5 times this week",
    category: "transport", target: 5, progress: 0, unit: "trips", reward: 150,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString(), completed: false
  },
  {
    id: "ch-2", title: "No Delivery Days", description: "Avoid food delivery for 3 consecutive days",
    category: "food", target: 3, progress: 0, unit: "days", reward: 100,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString(), completed: false
  },
  {
    id: "ch-3", title: "Green Electricity", description: "Reduce electricity usage by 10% compared to last month",
    category: "electricity", target: 10, progress: 0, unit: "percent", reward: 200,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 86400000).toISOString(), completed: false
  },
  {
    id: "ch-4", title: "Batch Shopper", description: "Combine 3 shopping orders into grouped delivery",
    category: "shopping", target: 3, progress: 0, unit: "orders", reward: 120,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 14 * 86400000).toISOString(), completed: false
  },
  {
    id: "ch-5", title: "Walk Champion", description: "Walk or cycle for 5 short trips this week",
    category: "lifestyle", target: 5, progress: 0, unit: "trips", reward: 180,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString(), completed: false
  }
];

export const userPoints: UserPoints = {
  total: 0,
  level: 1,
  xp: 0,
  xpToNextLevel: 500,
  history: []
};
