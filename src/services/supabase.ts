import { Platform } from "react-native";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { calculateLevel } from "./levelCalc";

const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const configuredSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!configuredSupabaseUrl || !configuredSupabaseAnonKey) {
  console.warn("[Supabase] Missing configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");
}

export let isSupabaseConfigured = Boolean(configuredSupabaseUrl && configuredSupabaseAnonKey);

const supabaseUrl = configuredSupabaseUrl;
const supabaseAnonKey = configuredSupabaseAnonKey;

function getSecureStoreAdapter() {
  if (Platform.OS === "web") {
    return {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
    };
  }

  let SecureStore: any = null;
  try {
    SecureStore = require("expo-secure-store");
  } catch {}

  if (SecureStore) {
    return {
      getItem: async (key: string) => {
        try {
          return await SecureStore.getItemAsync(key);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch {}
      },
      removeItem: async (key: string) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {}
      },
    };
  }

  let AsyncStorage: any = null;
  try {
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
  } catch {}

  if (AsyncStorage) {
    return {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    };
  }

  return undefined;
}

let _supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: getSecureStoreAdapter(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
        storageKey: "ecoguardian.auth.token",
      }
    });
  } catch (e) {
    console.warn("[Supabase] Init failed:", e);
    isSupabaseConfigured = false;
  }
}
export const supabase = _supabase;

export function getAuthRedirectUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "ecoguardian://auth/callback";
}

export async function sendEmailOtp(email: string) {
  if (!isSupabaseConfigured || !supabase) {
    const msg = "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env";
    console.warn("[Auth]", msg);
    return { data: null, error: { message: msg } };
  }
  try {
    const result = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { full_name: email.split("@")[0] }
      }
    });
    if (result.error) {
      const errCode = result.error.code || "unknown";
      const errMsg = result.error.message || "Unknown error";
      const errStatus = result.error.status || 0;
      if (errStatus === 429) {
        return { data: null, error: { message: "Rate limited. Wait 60 seconds and try again." } };
      }
      if (errMsg.includes("magic link")) {
        return { data: null, error: { message: "Supabase Email OTP is not enabled. Go to Supabase Dashboard → Authentication → Providers → Email → Enable 'Email OTP'. Error: " + errMsg } };
      }
      if (errMsg.includes("not found") || errMsg.includes("disabled")) {
        return { data: null, error: { message: "Email provider is disabled in Supabase. Enable it at: supabase.com/dashboard → Authentication → Providers → Email. Error: " + errMsg } };
      }
      return { data: null, error: { message: errMsg + " (code: " + errCode + ", status: " + errStatus + ")" } };
    }
    return result;
  } catch (err) {
    console.warn("[Auth] OTP exception:", err);
    return { data: null, error: { message: "Exception: " + String(err) } };
  }
}

export async function verifyEmailOtp(email: string, token: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: "Supabase is not configured. Demo mode opens the app without login." } };
  }
  try {
    const result = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (result.error) {
      if (result.error.message.includes("Invalid token")) {
        return { data: null, error: { message: "Invalid or expired code. Request a new OTP." } };
      }
      if (result.error.message.includes("Database error saving new user")) {
        return { data: null, error: { message: "Account creation failed. The database trigger needs fixing. Run FIX_AUTH_COMPLETE.sql in Supabase SQL Editor." } };
      }
    }
    return result;
  } catch (err) {
    console.warn("[Auth] Verify exception:", err);
    return { data: null, error: { message: String(err) } };
  }
}

export const sendMobileOtp = sendEmailOtp;
export const verifyMobileOtp = verifyEmailOtp;

export async function saveCarbonEntry(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("carbon_entries").insert(payload).select().single();
}

export async function ingestCarbonEvent(payload: {
  category: string;
  label: string;
  kg_co2e: number;
  source: string;
  occurred_at?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return { data: null, error: { message: "Not authenticated" } };

    return supabase.from("carbon_entries").insert({
      user_id: userId,
      category: payload.category,
      label: payload.label,
      kg_co2e: payload.kg_co2e,
      source: payload.source,
      occurred_at: payload.occurred_at ?? new Date().toISOString(),
      metadata: payload.metadata ?? {}
    }).select().single();
  } catch (e) {
    return { data: null, error: { message: String(e) } };
  }
}

export async function generatePrediction() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return { data: null, error: { message: "Not authenticated" } };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await supabase
      .from("carbon_entries")
      .select("kg_co2e, category, occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", thirtyDaysAgo)
      .order("occurred_at", { ascending: false });

    if (error) return { data: null, error };

    const entries = data ?? [];
    const totalKg = entries.reduce((s: number, e: any) => s + (e.kg_co2e || 0), 0);
    const uniqueDays = new Set(entries.map((e: any) => e.occurred_at?.slice(0, 10))).size || 1;
    const dailyAvg = totalKg / uniqueDays;

    return {
      data: {
        dailyAverageKg: Math.round(dailyAvg * 100) / 100,
        weeklyPredictionKg: Math.round(dailyAvg * 7 * 100) / 100,
        monthlyPredictionKg: Math.round(dailyAvg * 30 * 100) / 100,
        entryCount: entries.length
      },
      error: null
    };
  } catch (e) {
    return { data: null, error: { message: String(e) } };
  }
}

export async function saveFlightLog(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("flight_logs").insert(payload).select().single();
}

export async function saveShoppingLog(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("shopping_logs").insert(payload).select().single();
}

export async function saveTransportLog(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("transport_logs").insert(payload).select().single();
}

export async function saveElectricityLog(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("electricity_logs").insert(payload).select().single();
}

export async function registerDeviceToken(userId: string, token: string, platform: "android" | "ios") {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("device_tokens").upsert({ user_id: userId, token, platform }, { onConflict: "token" });
}

// ==================== DELIVERY ORDERS ====================

export async function saveDeliveryOrder(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("delivery_orders").insert(payload).select().single();
}

export async function fetchDeliveryOrders(userId: string, limit = 50) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  return supabase
    .from("delivery_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function updateDeliveryOrder(id: string, updates: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("delivery_orders").update(updates).eq("id", id).select().single();
}

// ==================== FOOD DELIVERY LOGS ====================

export async function saveFoodDeliveryLog(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("food_delivery_logs").insert(payload).select().single();
}

export async function fetchFoodDeliveryLogs(userId: string, limit = 50) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  return supabase
    .from("food_delivery_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

// ==================== GROCERY DELIVERY LOGS ====================

export async function saveGroceryDeliveryLog(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("grocery_delivery_logs").insert(payload).select().single();
}

export async function fetchGroceryDeliveryLogs(userId: string, limit = 50) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  return supabase
    .from("grocery_delivery_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

// ==================== RIDE BOOKINGS ====================

export async function saveRideBooking(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("ride_bookings").insert(payload).select().single();
}

export async function fetchRideBookings(userId: string, limit = 50) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  return supabase
    .from("ride_bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function updateRideBooking(id: string, updates: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("ride_bookings").update(updates).eq("id", id).select().single();
}

// ==================== USER POINTS ====================

export async function fetchUserPoints(userId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("user_points").select("*").eq("user_id", userId).single();
}

export async function upsertUserPoints(userId: string, points: number, level: number, pointsToNext: number) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase
    .from("user_points")
    .upsert(
      { user_id: userId, total_points: points, level, points_to_next_level: pointsToNext },
      { onConflict: "user_id" }
    )
    .select()
    .single();
}

export async function addPointsToUser(userId: string, pointsToAdd: number) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: current } = await fetchUserPoints(userId);
    const newTotal = (current?.total_points || 0) + pointsToAdd;
    const levelInfo = calculateLevel(newTotal);

    const result = await upsertUserPoints(userId, newTotal, levelInfo.level, levelInfo.xpToNextLevel);
    if (!result.error) return result;

    if (attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  return { data: null, error: { message: "Failed to update points after retries" } };
}

// ==================== POINTS EVENTS ====================

export async function savePointsEvent(payload: {
  user_id: string;
  event_type: string;
  points: number;
  description?: string;
  reference_id?: string;
}) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("points_events").insert(payload).select().single();
}

export async function fetchPointsEvents(userId: string, limit = 50) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  return supabase
    .from("points_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

// ==================== USER BADGES ====================

export async function saveUserBadge(userId: string, badgeId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase
    .from("user_badges")
    .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: "user_id,badge_id" })
    .select()
    .single();
}

export async function fetchUserBadges(userId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  return supabase
    .from("user_badges")
    .select("*")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });
}

// ==================== STREAKS ====================

export async function fetchStreaks(userId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  return supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function updateStreak(userId: string, streakType: string, increment = 1) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  
  const { data: current } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("streak_type", streakType)
    .single();
  
  const today = new Date().toISOString().split("T")[0];
  
  if (!current) {
    return supabase
      .from("streaks")
      .insert({ user_id: userId, streak_type: streakType, current_count: increment, best_count: increment, last_entry_date: today })
      .select()
      .single();
  }

  if (current.last_entry_date === today) {
    return { data: current, error: null };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const isConsecutive = current.last_entry_date === yesterday;
  const newCount = isConsecutive ? current.current_count + increment : increment;
  const newBest = Math.max(newCount, current.best_count);
  
  return supabase
    .from("streaks")
    .update({ current_count: newCount, best_count: newBest, last_entry_date: today })
    .eq("id", current.id)
    .select()
    .single();
}

export async function resetStreak(userId: string, streakType: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase
    .from("streaks")
    .update({ current_count: 0 })
    .eq("user_id", userId)
    .eq("streak_type", streakType)
    .select()
    .single();
}

// ==================== CHALLENGES ====================

export async function saveChallenge(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("challenges").insert(payload).select().single();
}

export async function fetchChallenges(userId: string, status?: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  let query = supabase
    .from("challenges")
    .select("*")
    .eq("user_id", userId);
  
  if (status) {
    query = query.eq("status", status);
  }
  
  return query.order("created_at", { ascending: false });
}

export async function updateChallenge(id: string, updates: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("challenges").update(updates).eq("id", id).select().single();
}

// ==================== SMART ALERTS ====================

export async function saveSmartAlert(payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("smart_alerts").insert(payload).select().single();
}

export async function fetchSmartAlerts(userId: string, unreadOnly = false) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  let query = supabase
    .from("smart_alerts")
    .select("*")
    .eq("user_id", userId);
  
  if (unreadOnly) {
    query = query.eq("is_read", false);
  }
  
  return query.order("created_at", { ascending: false }).limit(50);
}

export async function markAlertRead(id: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase.from("smart_alerts").update({ is_read: true }).eq("id", id);
}

export async function markAllAlertsRead(userId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }
  return supabase
    .from("smart_alerts")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}

// ==================== ANALYTICS QUERIES ====================

export async function fetchCarbonSummary(userId: string, days = 30) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return supabase
    .from("carbon_entries")
    .select("category, kg_co2e, created_at")
    .eq("user_id", userId)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false });
}

export async function fetchTopCategories(userId: string, limit = 5) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("carbon_entries")
    .select("category, kg_co2e")
    .eq("user_id", userId)
    .gte("occurred_at", thirtyDaysAgo);

  if (error) return { data: [], error };

  const categoryMap: Record<string, number> = {};
  (data ?? []).forEach((entry: any) => {
    const cat = entry.category || "other";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + (entry.kg_co2e || 0);
  });

  const result = Object.entries(categoryMap)
    .map(([category, kg]) => ({ category, kg: Math.round(kg * 100) / 100 }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, limit);

  return { data: result, error: null };
}
