import { Platform } from "react-native";
import { create } from "zustand";

import {
  CarbonEntry, CarbonScore, Challenge, DeliveryOrder, EcoBadge,
  ElectricityLog, FlightLog, FoodDeliveryLog, GroceryDeliveryLog,
  MonitoringEvent, Recommendation, RideBooking, ShoppingLog,
  SmartAlert, Streak, UserPoints
} from "../types/domain";

import { calculateLevel } from "../services/levelCalc";

const STORAGE_KEY = "ecoguardian.appState";

type AppState = {
  score: CarbonScore;
  entries: CarbonEntry[];
  electricityLogs: ElectricityLog[];
  badges: EcoBadge[];
  recommendations: Recommendation[];
  weeklyTrend: { day: string; kg: number }[];
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

let _asyncStorage: any | undefined;
let _storageInit: boolean = false;

async function getAsyncStorage(): Promise<any | undefined> {
  if (_storageInit) return _asyncStorage;
  _storageInit = true;
  try {
    if (Platform.OS !== "web" && typeof require === "function") {
      _asyncStorage = require("@react-native-async-storage/async-storage").default;
    }
  } catch {
    _asyncStorage = undefined;
  }
  return _asyncStorage;
}

let _persistedCache: Partial<AppState> | null = null;

async function saveState(state: Partial<AppState>) {
  const store = await getAsyncStorage();
  if (!store) return;
  try {
    if (!_persistedCache) {
      const raw = await store.getItem(STORAGE_KEY);
      _persistedCache = raw ? JSON.parse(raw) : {};
    }
    const merged = { ..._persistedCache, ...state };
    _persistedCache = merged;
    const serializable = {
      score: merged.score,
      entries: merged.entries?.slice(0, 100),
      electricityLogs: merged.electricityLogs?.slice(0, 50),
      flightLogs: merged.flightLogs?.slice(0, 50),
      shoppingLogs: merged.shoppingLogs?.slice(0, 50),
      monitoringEvents: merged.monitoringEvents?.slice(0, 100),
      smartAlerts: merged.smartAlerts?.slice(0, 50),
      deliveryOrders: merged.deliveryOrders?.slice(0, 50),
      foodDeliveries: merged.foodDeliveries?.slice(0, 50),
      groceryDeliveries: merged.groceryDeliveries?.slice(0, 50),
      rideBookings: merged.rideBookings?.slice(0, 50),
      badges: merged.badges,
      recommendations: merged.recommendations?.slice(0, 20),
      streaks: merged.streaks,
      challenges: merged.challenges,
      userPoints: merged.userPoints,
      weeklyTrend: merged.weeklyTrend
    };
    await store.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Storage full or unavailable
  }
}

async function loadState(): Promise<Partial<AppState> | null> {
  const store = await getAsyncStorage();
  if (!store) return null;
  try {
    const raw = await store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const safeArray = <T>(val: unknown, fallback: T[]): T[] => Array.isArray(val) ? val : fallback;
    const safeObject = <T extends Record<string, unknown>>(val: unknown, fallback: T): T =>
      val && typeof val === "object" && !Array.isArray(val) ? val as T : fallback;

    return {
      ...parsed,
      entries: safeArray(parsed.entries, []),
      electricityLogs: safeArray(parsed.electricityLogs, []),
      flightLogs: safeArray(parsed.flightLogs, []),
      shoppingLogs: safeArray(parsed.shoppingLogs, []),
      monitoringEvents: safeArray(parsed.monitoringEvents, []),
      smartAlerts: safeArray(parsed.smartAlerts, []),
      deliveryOrders: safeArray(parsed.deliveryOrders, []),
      foodDeliveries: safeArray(parsed.foodDeliveries, []),
      groceryDeliveries: safeArray(parsed.groceryDeliveries, []),
      rideBookings: safeArray(parsed.rideBookings, []),
      badges: safeArray(parsed.badges, []),
      recommendations: safeArray(parsed.recommendations, []),
      streaks: safeArray(parsed.streaks, initialStreaks),
      challenges: safeArray(parsed.challenges, initialChallenges),
      weeklyTrend: safeArray(parsed.weeklyTrend, emptyWeeklyTrend),
      score: safeObject(parsed.score, emptyScore),
      userPoints: safeObject(parsed.userPoints, initialPoints),
    };
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
  goalKg: 9,
  lastScoreResetDate: new Date().toISOString().slice(0, 10)
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
      const today = new Date().toISOString().slice(0, 10);
      const needsReset = state.score.lastScoreResetDate !== today;
      const baseDaily = needsReset ? 0 : state.score.dailyKg;
      const existing = state.entries.find((e) => e.id === entry.id);
      const scoreDelta = existing ? entry.kgCo2e - existing.kgCo2e : entry.kgCo2e;
      const entries = existing
        ? state.entries.map((e) => (e.id === entry.id ? { ...e, ...entry } : e))
        : [entry, ...state.entries];
      const next = {
        entries,
        score: {
          ...state.score,
          dailyKg: Math.round((baseDaily + scoreDelta) * 100) / 100,
          weeklyKg: Math.round((state.score.weeklyKg + scoreDelta) * 100) / 100,
          monthlyKg: Math.round((state.score.monthlyKg + scoreDelta) * 100) / 100,
          lastScoreResetDate: today
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
      const today = new Date().toISOString().slice(0, 10);
      const needsReset = state.score.lastScoreResetDate !== today;
      const baseDaily = needsReset ? 0 : state.score.dailyKg;
      const next = {
        flightLogs: [log, ...state.flightLogs].slice(0, 50),
        entries: [
          {
            id: `fl-${log.id}`,
            category: "flight" as const,
            label: `${log.departureAirport} → ${log.destinationAirport} (${log.flightNumber})`,
            kgCo2e: log.kgCo2e,
            source: log.source as CarbonEntry["source"],
            occurredAt: log.departureDate
          },
          ...state.entries
        ],
        score: {
          ...state.score,
          dailyKg: Math.round((baseDaily + log.kgCo2e) * 100) / 100,
          weeklyKg: Math.round((state.score.weeklyKg + log.kgCo2e) * 100) / 100,
          monthlyKg: Math.round((state.score.monthlyKg + log.kgCo2e) * 100) / 100,
          lastScoreResetDate: today
        }
      };
      saveState(next);
      return next;
    }),

  addShoppingLog: (log) =>
    set((state) => {
      const today = new Date().toISOString().slice(0, 10);
      const needsReset = state.score.lastScoreResetDate !== today;
      const baseDaily = needsReset ? 0 : state.score.dailyKg;
      const next = {
        shoppingLogs: [log, ...state.shoppingLogs].slice(0, 50),
        entries: [
          {
            id: `sl-${log.id}`,
            category: "shopping" as const,
            label: `${log.productName} (${log.vendor})`,
            kgCo2e: log.totalKgCo2e,
            source: log.source as CarbonEntry["source"],
            occurredAt: new Date().toISOString()
          },
          ...state.entries
        ],
        score: {
          ...state.score,
          dailyKg: Math.round((baseDaily + log.totalKgCo2e) * 100) / 100,
          weeklyKg: Math.round((state.score.weeklyKg + log.totalKgCo2e) * 100) / 100,
          monthlyKg: Math.round((state.score.monthlyKg + log.totalKgCo2e) * 100) / 100,
          lastScoreResetDate: today
        }
      };
      saveState(next);
      return next;
    }),

  addMonitoringEvent: (event) =>
    set((state) => {
      const today = new Date().toISOString().slice(0, 10);
      const needsReset = state.score.lastScoreResetDate !== today;
      const baseDaily = needsReset ? 0 : state.score.dailyKg;
      const next = {
        monitoringEvents: [event, ...state.monitoringEvents].slice(0, 100),
        entries: [
          {
            id: event.id,
            category: "transport" as const,
            label: `${event.detectedMode} (${Math.round(event.distanceKm * 10) / 10} km)`,
            kgCo2e: event.kgCo2e,
            source: event.source as CarbonEntry["source"],
            occurredAt: event.occurredAt
          },
          ...state.entries
        ],
        score: {
          ...state.score,
          dailyKg: Math.round((baseDaily + event.kgCo2e) * 100) / 100,
          weeklyKg: Math.round((state.score.weeklyKg + event.kgCo2e) * 100) / 100,
          monthlyKg: Math.round((state.score.monthlyKg + event.kgCo2e) * 100) / 100,
          lastScoreResetDate: today
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
      const today = new Date().toISOString().slice(0, 10);
      const needsReset = state.score.lastScoreResetDate !== today;
      const baseDaily = needsReset ? 0 : state.score.dailyKg;
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
        ],
        score: {
          ...state.score,
          dailyKg: Math.round((baseDaily + log.kgCo2e) * 100) / 100,
          weeklyKg: Math.round((state.score.weeklyKg + log.kgCo2e) * 100) / 100,
          monthlyKg: Math.round((state.score.monthlyKg + log.kgCo2e) * 100) / 100,
          lastScoreResetDate: today
        }
      };
      saveState(next);
      return next;
    }),

  addGroceryDelivery: (log) =>
    set((state) => {
      const today = new Date().toISOString().slice(0, 10);
      const needsReset = state.score.lastScoreResetDate !== today;
      const baseDaily = needsReset ? 0 : state.score.dailyKg;
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
        ],
        score: {
          ...state.score,
          dailyKg: Math.round((baseDaily + log.kgCo2e) * 100) / 100,
          weeklyKg: Math.round((state.score.weeklyKg + log.kgCo2e) * 100) / 100,
          monthlyKg: Math.round((state.score.monthlyKg + log.kgCo2e) * 100) / 100,
          lastScoreResetDate: today
        }
      };
      saveState(next);
      return next;
    }),

  addRideBooking: (booking) =>
    set((state) => {
      const today = new Date().toISOString().slice(0, 10);
      const needsReset = state.score.lastScoreResetDate !== today;
      const baseDaily = needsReset ? 0 : state.score.dailyKg;
      const next = {
        rideBookings: [booking, ...state.rideBookings].slice(0, 50),
        entries: [
          {
            id: `rb-${booking.id}`,
            category: "ride_booking" as const,
            label: `${booking.platform} ride - ${booking.rideType}`,
            kgCo2e: booking.kgCo2e,
            source: "notification" as const,
            occurredAt: booking.detectedAt
          },
          ...state.entries
        ],
        score: {
          ...state.score,
          dailyKg: Math.round((baseDaily + booking.kgCo2e) * 100) / 100,
          weeklyKg: Math.round((state.score.weeklyKg + booking.kgCo2e) * 100) / 100,
          monthlyKg: Math.round((state.score.monthlyKg + booking.kgCo2e) * 100) / 100,
          lastScoreResetDate: today
        }
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
      const newTotal = state.userPoints.total + challenge.reward;
      const levelInfo = calculateLevel(newTotal);
      const updatedPoints: UserPoints = {
        total: newTotal,
        ...levelInfo,
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
      const levelInfo = calculateLevel(newTotal);
      const updated: UserPoints = {
        total: newTotal,
        ...levelInfo,
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
    set((state) => {
      const next = { smartAlerts: state.smartAlerts.map(a => ({ ...a, read: true })) };
      saveState(next);
      return next;
    })
}));

try {
  loadState().then((saved) => {
    if (saved) {
      const today = new Date().toISOString().slice(0, 10);
      const savedScore = saved.score ?? emptyScore;
      const lastReset = savedScore.lastScoreResetDate;
      const needsDailyReset = !lastReset || lastReset !== today;

      useAppStore.setState((state) => ({
        ...state,
        ...saved,
        entries: saved.entries ?? state.entries,
        electricityLogs: saved.electricityLogs ?? state.electricityLogs,
        flightLogs: saved.flightLogs ?? state.flightLogs,
        shoppingLogs: saved.shoppingLogs ?? state.shoppingLogs,
        foodDeliveries: saved.foodDeliveries ?? state.foodDeliveries,
        groceryDeliveries: saved.groceryDeliveries ?? state.groceryDeliveries,
        rideBookings: saved.rideBookings ?? state.rideBookings,
        deliveryOrders: saved.deliveryOrders ?? state.deliveryOrders,
        monitoringEvents: saved.monitoringEvents ?? state.monitoringEvents,
        smartAlerts: saved.smartAlerts ?? state.smartAlerts,
        badges: saved.badges ?? state.badges,
        recommendations: saved.recommendations ?? state.recommendations,
        streaks: saved.streaks ?? state.streaks,
        challenges: saved.challenges ?? state.challenges,
        userPoints: saved.userPoints ?? state.userPoints,
        weeklyTrend: saved.weeklyTrend ?? state.weeklyTrend,
        score: needsDailyReset
          ? { ...savedScore, dailyKg: 0, lastScoreResetDate: today }
          : savedScore
      }));
    }
  }).catch(() => {});
} catch (e) {
}
