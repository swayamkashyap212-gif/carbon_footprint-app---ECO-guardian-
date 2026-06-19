import { create } from "zustand";

import {
  CarbonEntry, CarbonScore, Challenge, DeliveryOrder, EcoBadge,
  ElectricityLog, FlightLog, FoodDeliveryLog, GroceryDeliveryLog,
  MonitoringEvent, Recommendation, RideBooking, ShoppingLog,
  SmartAlert, Streak, UserPoints
} from "../types/domain";

const STORAGE_KEY = "ecoguardian.appState";

type AppState = {
  score: CarbonScore;
  entries: CarbonEntry[];
  electricityLogs: ElectricityLog[];
  badges: EcoBadge[];
  recommendations: Recommendation[];
  weeklyTrend: typeof weeklyTrend;
  flightLogs: FlightLog[];
  shoppingLogs: ShoppingLog[];
  monitoringEvents: MonitoringEvent[];
  smartAlerts: SmartAlert[];
  deliveryOrders: DeliveryOrder[];
  foodDeliveries: FoodDeliveryLog[];
  groceryDeliveries: GroceryDeliveryLog[];
  rideBookings: RideBooking[];
  streaks: Streak[];
  challenges: Challenge[];
  userPoints: UserPoints;
  addEntry: (entry: CarbonEntry) => void;
  addElectricityLog: (log: ElectricityLog) => void;
  addFlightLog: (log: FlightLog) => void;
  addShoppingLog: (log: ShoppingLog) => void;
  addMonitoringEvent: (event: MonitoringEvent) => void;
  addSmartAlert: (alert: SmartAlert) => void;
  addDeliveryOrder: (order: DeliveryOrder) => void;
  addFoodDelivery: (log: FoodDeliveryLog) => void;
  addGroceryDelivery: (log: GroceryDeliveryLog) => void;
  addRideBooking: (booking: RideBooking) => void;
  updateStreak: (type: Streak["type"], active: boolean) => void;
  addChallenge: (challenge: Challenge) => void;
  completeChallenge: (challengeId: string) => void;
  addPoints: (amount: number, type: UserPoints["history"][0]["type"], description: string) => void;
  markAlertRead: (alertId: string) => void;
  clearAlerts: () => void;
};

function saveState(state: Partial<AppState>) {
  try {
    const serializable = {
      score: state.score,
      entries: state.entries?.slice(0, 100),
      electricityLogs: state.electricityLogs?.slice(0, 50),
      flightLogs: state.flightLogs?.slice(0, 50),
      shoppingLogs: state.shoppingLogs?.slice(0, 50),
      monitoringEvents: state.monitoringEvents?.slice(0, 100),
      deliveryOrders: state.deliveryOrders?.slice(0, 50),
      foodDeliveries: state.foodDeliveries?.slice(0, 50),
      groceryDeliveries: state.groceryDeliveries?.slice(0, 50),
      rideBookings: state.rideBookings?.slice(0, 50),
      streaks: state.streaks,
      challenges: state.challenges,
      userPoints: state.userPoints
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Storage full or unavailable
  }
}

function loadState(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

const initialStreaks: Streak[] = [
  { id: "streak-1", type: "no_food_delivery", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
  { id: "streak-2", type: "metro_commute", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
  { id: "streak-3", type: "low_electricity", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
  { id: "streak-4", type: "walk_or_cycle", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
  { id: "streak-5", type: "no_shopping", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false }
];

const initialChallenges: Challenge[] = [
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

const initialPoints: UserPoints = {
  total: 0,
  level: 1,
  xp: 0,
  xpToNextLevel: 500,
  history: []
};

const emptyScore: CarbonScore = {
  dailyKg: 0,
  weeklyKg: 0,
  monthlyKg: 0,
  sustainabilityScore: 0,
  savingsKg: 0,
  goalKg: 9
};

const emptyWeeklyTrend = [
  { day: "Mon", kg: 0 },
  { day: "Tue", kg: 0 },
  { day: "Wed", kg: 0 },
  { day: "Thu", kg: 0 },
  { day: "Fri", kg: 0 },
  { day: "Sat", kg: 0 },
  { day: "Sun", kg: 0 }
];

export const useAppStore = create<AppState>((set, get) => ({
  score: emptyScore,
  entries: [],
  electricityLogs: [],
  badges: [],
  recommendations: [],
  weeklyTrend: emptyWeeklyTrend,
  flightLogs: [],
  shoppingLogs: [],
  monitoringEvents: [],
  smartAlerts: [],
  deliveryOrders: [],
  foodDeliveries: [],
  groceryDeliveries: [],
  rideBookings: [],
  streaks: initialStreaks,
  challenges: initialChallenges,
  userPoints: initialPoints,

  addEntry: (entry) =>
    set((state) => {
      const next = {
        entries: [entry, ...state.entries],
        score: {
          ...state.score,
          dailyKg: Math.round((state.score.dailyKg + entry.kgCo2e) * 100) / 100,
          weeklyKg: Math.round((state.score.weeklyKg + entry.kgCo2e) * 100) / 100,
          monthlyKg: Math.round((state.score.monthlyKg + entry.kgCo2e) * 100) / 100
        }
      };
      saveState(next);
      return next;
    }),

  addElectricityLog: (log) =>
    set((state) => {
      const energyWatcherUnlocked = state.electricityLogs.length + 1 >= 2;
      const next = {
        electricityLogs: [log, ...state.electricityLogs],
        badges: state.badges.map((badge) =>
          badge.id === "badge-2"
            ? { ...badge, earned: energyWatcherUnlocked, progress: energyWatcherUnlocked ? 100 : Math.min(100, badge.progress + 50) }
            : badge
        )
      };
      saveState(next);
      return next;
    }),

  addFlightLog: (log) =>
    set((state) => {
      const next = { flightLogs: [log, ...state.flightLogs] };
      saveState(next);
      return next;
    }),

  addShoppingLog: (log) =>
    set((state) => {
      const next = { shoppingLogs: [log, ...state.shoppingLogs] };
      saveState(next);
      return next;
    }),

  addMonitoringEvent: (event) =>
    set((state) => {
      const next = {
        monitoringEvents: [event, ...state.monitoringEvents].slice(0, 100),
        score: {
          ...state.score,
          dailyKg: Math.round((state.score.dailyKg + event.kgCo2e) * 100) / 100
        }
      };
      saveState(next);
      return next;
    }),

  addSmartAlert: (alert) =>
    set((state) => {
      const next = { smartAlerts: [alert, ...state.smartAlerts].slice(0, 50) };
      saveState(next);
      return next;
    }),

  addDeliveryOrder: (order) =>
    set((state) => {
      const next = { deliveryOrders: [order, ...state.deliveryOrders].slice(0, 50) };
      saveState(next);
      return next;
    }),

  addFoodDelivery: (log) =>
    set((state) => {
      const next = {
        foodDeliveries: [log, ...state.foodDeliveries].slice(0, 50),
        entries: [
          {
            id: `fd-${log.id}`,
            category: "food_delivery" as const,
            label: `${log.platform} - ${log.restaurantName}`,
            kgCo2e: log.kgCo2e,
            source: "notification" as const,
            occurredAt: log.detectedAt
          },
          ...state.entries
        ]
      };
      saveState(next);
      return next;
    }),

  addGroceryDelivery: (log) =>
    set((state) => {
      const next = {
        groceryDeliveries: [log, ...state.groceryDeliveries].slice(0, 50),
        entries: [
          {
            id: `gd-${log.id}`,
            category: "grocery_delivery" as const,
            label: `${log.platform} - ${log.storeName}`,
            kgCo2e: log.kgCo2e,
            source: "notification" as const,
            occurredAt: log.detectedAt
          },
          ...state.entries
        ]
      };
      saveState(next);
      return next;
    }),

  addRideBooking: (booking) =>
    set((state) => {
      const next = {
        rideBookings: [booking, ...state.rideBookings].slice(0, 50),
        entries: [
          {
            id: `rb-${booking.id}`,
            category: "transport" as const,
            label: `${booking.platform} ride - ${booking.rideType}`,
            kgCo2e: booking.kgCo2e,
            source: "notification" as const,
            occurredAt: booking.detectedAt
          },
          ...state.entries
        ]
      };
      saveState(next);
      return next;
    }),

  updateStreak: (type, active) =>
    set((state) => {
      const streaks = state.streaks.map((s) => {
        if (s.type !== type) return s;
        if (active && !s.active) {
          const newCount = s.count + 1;
          return {
            ...s,
            count: newCount,
            bestCount: Math.max(s.bestCount, newCount),
            active: true,
            lastUpdated: new Date().toISOString()
          };
        }
        if (!active && s.active) {
          return { ...s, count: 0, active: false, lastUpdated: new Date().toISOString() };
        }
        return s;
      });
      saveState({ streaks });
      return { streaks };
    }),

  addChallenge: (challenge) =>
    set((state) => {
      const next = { challenges: [challenge, ...state.challenges] };
      saveState(next);
      return next;
    }),

  completeChallenge: (challengeId) =>
    set((state) => {
      const challenge = state.challenges.find(c => c.id === challengeId);
      if (!challenge || challenge.completed) return state;
      const updatedChallenges = state.challenges.map(c =>
        c.id === challengeId ? { ...c, completed: true, completedAt: new Date().toISOString(), progress: c.target } : c
      );
      const newPoints = state.userPoints.total + challenge.reward;
      const newXp = state.userPoints.xp + challenge.reward;
      const newLevel = Math.floor((state.userPoints.total + challenge.reward) / 500);
      const updatedPoints: UserPoints = {
        total: newPoints,
        level: newLevel,
        xp: newXp % 500,
        xpToNextLevel: 500,
        history: [
          { id: `pc-${Date.now()}`, type: "challenge_completed" as const, amount: challenge.reward, description: `Completed: ${challenge.title}`, timestamp: new Date().toISOString() },
          ...state.userPoints.history
        ].slice(0, 100)
      };
      saveState({ challenges: updatedChallenges, userPoints: updatedPoints });
      return { challenges: updatedChallenges, userPoints: updatedPoints };
    }),

  addPoints: (amount, type, description) =>
    set((state) => {
      const newTotal = state.userPoints.total + amount;
      const newXp = state.userPoints.xp + amount;
      const newLevel = Math.floor(newTotal / 500);
      const updated: UserPoints = {
        total: newTotal,
        level: newLevel,
        xp: newXp % 500,
        xpToNextLevel: 500,
        history: [
          { id: `pe-${Date.now()}`, type, amount, description, timestamp: new Date().toISOString() },
          ...state.userPoints.history
        ].slice(0, 100)
      };
      saveState({ userPoints: updated });
      return { userPoints: updated };
    }),

  markAlertRead: (alertId) =>
    set((state) => {
      const next = { smartAlerts: state.smartAlerts.map(a => a.id === alertId ? { ...a, read: true } : a) };
      saveState(next);
      return next;
    }),

  clearAlerts: () =>
    set(() => {
      const next = { smartAlerts: [] as SmartAlert[] };
      saveState(next);
      return next;
    })
}));

const saved = loadState();
if (saved) {
  useAppStore.setState((state) => ({
    ...state,
    ...saved,
    entries: saved.entries ?? state.entries,
    electricityLogs: saved.electricityLogs ?? state.electricityLogs
  }));
}
