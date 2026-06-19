import {
  ingestCarbonEvent,
  saveFlightLog,
  saveShoppingLog,
  saveFoodDeliveryLog,
  saveGroceryDeliveryLog,
  saveRideBooking,
  saveSmartAlert,
  fetchSmartAlerts,
  saveChallenge,
  fetchChallenges,
  updateChallenge,
  savePointsEvent,
  fetchPointsEvents,
  upsertUserPoints,
  fetchUserPoints,
  updateStreak,
  fetchStreaks,
  fetchUserBadges,
  saveUserBadge,
  saveDeliveryOrder,
  fetchDeliveryOrders,
  fetchFoodDeliveryLogs,
  fetchGroceryDeliveryLogs,
  fetchRideBookings,
  isSupabaseConfigured,
  supabase
} from "./supabase";
import { useAppStore } from "../store/useAppStore";
import {
  CarbonEntry,
  DeliveryOrder,
  FlightLog,
  FoodDeliveryLog,
  GroceryDeliveryLog,
  RideBooking,
  ShoppingLog,
  SmartAlert
} from "../types/domain";
import { generateSmartAlerts } from "./smartAlertEngine";
import { enqueueOfflineMutation } from "./offlineQueue";
import { calculateLevel } from "./levelCalc";

let _hydrationDone = false;

export function resetHydration(): void {
  _hydrationDone = false;
}

export async function hydrateFromDatabase(): Promise<void> {
  if (_hydrationDone) return;
  if (!isSupabaseConfigured || !supabase) {
    _hydrationDone = true;
    return;
  }

  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 10000)
    );
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
    const userId = session?.user?.id;
    if (!userId) {
      _hydrationDone = true;
      return;
    }

    const [alertsRes, badgesRes, challengesRes, streaksRes, pointsRes, eventsRes] = await Promise.allSettled([
      fetchSmartAlerts(userId),
      fetchUserBadges(userId),
      fetchChallenges(userId),
      fetchStreaks(userId),
      fetchUserPoints(userId),
      fetchPointsEvents(userId)
    ]);

    function extractData<T>(result: PromiseSettledResult<any>): T[] | null {
      if (result.status !== "fulfilled") return null;
      const res = result.value;
      if (res?.error) return null;
      return (res?.data as T[]) || null;
    }

    function extractSingle<T>(result: PromiseSettledResult<any>): T | null {
      if (result.status !== "fulfilled") return null;
      const res = result.value;
      if (res?.error) return null;
      return (res?.data as T) || null;
    }

    const alerts = extractData<any>(alertsRes);
    if (alerts && alerts.length > 0) {
      const mapped: SmartAlert[] = alerts.map((a: any) => ({
        id: a.id,
        type: a.type || "high_carbon",
        title: a.title || "Alert",
        body: a.body || "",
        severity: a.severity || "info",
        impactKg: a.impact_kg || 0,
        actionLabel: a.action_label,
        actionRoute: a.action_route,
        createdAt: a.created_at || new Date().toISOString(),
        read: a.is_read || false
      }));
      useAppStore.setState({ smartAlerts: mapped });
    }

    const badges = extractData<any>(badgesRes);
    if (badges && badges.length > 0) {
      const mapped = badges.map((b: any) => ({
        id: b.id,
        title: b.title || "Badge",
        description: b.description || "",
        icon: b.icon || "star",
        earned: b.earned || false,
        progress: b.progress || 0
      }));
      useAppStore.setState({ badges: mapped });
    }

    const challenges = extractData<any>(challengesRes);
    if (challenges && challenges.length > 0) {
      const mapped = challenges.map((c: any) => ({
        id: c.id,
        title: c.title || "Challenge",
        description: c.description || "",
        category: c.category || "transport",
        target: c.target || 1,
        progress: c.progress || 0,
        unit: c.unit || "trips",
        reward: c.reward || 100,
        startDate: c.start_date || new Date().toISOString(),
        endDate: c.end_date || new Date(Date.now() + 7 * 86400000).toISOString(),
        completed: c.completed || false,
        completedAt: c.completed_at
      }));
      useAppStore.setState({ challenges: mapped });
    }

    const streaks = extractData<any>(streaksRes);
    if (streaks && streaks.length > 0) {
      const mapped = streaks.map((s: any) => ({
        id: s.id,
        type: s.streak_type || s.type || "no_food_delivery",
        count: s.current_count || s.count || 0,
        bestCount: s.best_count || 0,
        lastUpdated: s.last_updated || s.last_entry_date || new Date().toISOString(),
        active: s.is_active || s.active || false
      }));
      useAppStore.setState({ streaks: mapped });
    }

    const points = extractSingle<any>(pointsRes);
    if (points) {
      const totalPts = points.total_points || 0;
      const levelInfo = calculateLevel(totalPts);
      useAppStore.setState({
        userPoints: {
          total: totalPts,
          ...levelInfo,
          history: []
        }
      });
    }

    const events = extractData<any>(eventsRes);
    if (events && events.length > 0) {
      useAppStore.setState((s) => ({
        userPoints: { ...s.userPoints, history: events.map((e: any) => ({
          id: e.id,
          type: e.type || "action_logged",
          amount: e.points || e.amount || 0,
          description: e.description || "",
          timestamp: e.created_at || new Date().toISOString()
        }))}
      }));
    }

    try {
      const ordersRes = await fetchDeliveryOrders(userId);
      const orders = extractData<any>({ status: "fulfilled", value: ordersRes } as any);
      if (orders && orders.length > 0) {
        useAppStore.setState({
          deliveryOrders: orders.map((o: any) => ({
            id: o.id,
            platform: o.platform || "other",
            orderId: o.order_id || o.id,
            merchantName: o.merchant_name || "Unknown",
            vehicleType: o.vehicle_type || "UNKNOWN",
            predictedVehicle: o.predicted_vehicle || o.vehicle_type || "UNKNOWN",
            distanceKm: o.distance_km || 0,
            kgCo2e: o.kg_co2e || 0,
            status: o.status || "detected",
            orderValue: o.order_value || 0,
            items: o.items || [],
            detectedAt: o.detected_at || o.created_at || new Date().toISOString(),
            source: o.source || "notification",
            confidence: o.confidence || 0.8
          }))
        });
      }
    } catch {}

    try {
      const foodRes = await fetchFoodDeliveryLogs(userId);
      const foodLogs = extractData<any>({ status: "fulfilled", value: foodRes } as any);
      if (foodLogs && foodLogs.length > 0) {
        useAppStore.setState({
          foodDeliveries: foodLogs.map((f: any) => ({
            id: f.id,
            platform: f.platform || "other",
            restaurantName: f.restaurant_name || "Restaurant",
            distanceKm: f.distance_km || 3,
            vehicleType: f.vehicle_type || "bike",
            orderValue: f.order_value || 300,
            items: f.items || [],
            kgCo2e: f.kg_co2e || 0,
            isVegetarian: f.is_vegetarian || false,
            source: f.source || "notification",
            detectedAt: f.detected_at || f.created_at || new Date().toISOString()
          }))
        });
      }
    } catch {}

    try {
      const rideRes = await fetchRideBookings(userId);
      const rideLogs = extractData<any>({ status: "fulfilled", value: rideRes } as any);
      if (rideLogs && rideLogs.length > 0) {
        useAppStore.setState({
          rideBookings: rideLogs.map((r: any) => ({
            id: r.id,
            platform: r.platform || "uber",
            rideType: r.ride_type || "economy",
            pickupLocation: r.pickup_location || "",
            dropLocation: r.drop_location || "",
            distanceKm: r.distance_km || 0,
            durationMinutes: r.duration_minutes || 0,
            fare: r.fare || 0,
            kgCo2e: r.kg_co2e || 0,
            vehicleType: r.vehicle_type || "car",
            source: r.source || "notification",
            detectedAt: r.detected_at || r.created_at || new Date().toISOString()
          }))
        });
      }
    } catch {}

    try {
      const groceryRes = await fetchGroceryDeliveryLogs(userId);
      const groceryLogs = extractData<any>({ status: "fulfilled", value: groceryRes } as any);
      if (groceryLogs && groceryLogs.length > 0) {
        useAppStore.setState({
          groceryDeliveries: groceryLogs.map((g: any) => ({
            id: g.id,
            platform: g.platform || "other",
            storeName: g.store_name || "Store",
            distanceKm: g.distance_km || 2,
            vehicleType: g.vehicle_type || "bike",
            orderValue: g.order_value || 500,
            items: g.items || [],
            kgCo2e: g.kg_co2e || 0,
            isQuickCommerce: g.is_quick_commerce || false,
            source: g.source || "notification",
            detectedAt: g.detected_at || g.created_at || new Date().toISOString()
          }))
        });
      }
    } catch {}

    _hydrationDone = true;
  } catch {
    _hydrationDone = true;
  }
}

export async function syncNewEntry(entry: CarbonEntry, token?: string): Promise<void> {
  useAppStore.getState().addEntry(entry);

  if (!token || !isSupabaseConfigured || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    await ingestCarbonEvent({
      category: entry.category,
      label: entry.label,
      kg_co2e: entry.kgCo2e,
      source: entry.source,
      occurred_at: entry.occurredAt,
      metadata: entry.metadata
    });
  } catch {
    await enqueueOfflineMutation("ingestCarbonEvent", {
      category: entry.category,
      label: entry.label,
      kg_co2e: entry.kgCo2e,
      source: entry.source,
      occurred_at: entry.occurredAt
    });
  }
}

export async function syncFlightLog(log: FlightLog, token?: string): Promise<void> {
  useAppStore.getState().addFlightLog(log);

  if (!token || !isSupabaseConfigured || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    await saveFlightLog({
      user_id: userId,
      flight_number: log.flightNumber,
      departure_airport: log.departureAirport,
      destination_airport: log.destinationAirport,
      departure_date: log.departureDate,
      passenger_count: log.passengerCount,
      distance_km: log.distanceKm,
      kg_co2e: log.kgCo2e,
      source: log.source,
      confidence: log.confidence
    });
    await ingestCarbonEvent({
      category: "flight",
      label: `${log.departureAirport} → ${log.destinationAirport}`,
      kg_co2e: log.kgCo2e,
      source: log.source,
      occurred_at: log.departureDate
    });
  } catch {
    await enqueueOfflineMutation("ingestCarbonEvent", {
      category: "flight",
      label: `${log.departureAirport} → ${log.destinationAirport}`,
      kg_co2e: log.kgCo2e,
      source: log.source,
      occurred_at: log.departureDate
    });
  }
}

export async function syncShoppingLog(log: ShoppingLog, token?: string): Promise<void> {
  useAppStore.getState().addShoppingLog(log);

  if (!token || !isSupabaseConfigured || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const label = `${log.productName} (${log.vendor})`;
    const occurredAt = new Date().toISOString();

    await saveShoppingLog({
      user_id: userId,
      vendor: log.vendor,
      product_name: log.productName,
      category: log.category,
      quantity: log.quantity,
      delivery_type: log.deliveryType,
      order_value: log.orderValue,
      manufacturing_kg: log.manufacturingKg,
      packaging_kg: log.packagingKg,
      delivery_kg: log.deliveryKg,
      total_kg_co2e: log.totalKgCo2e,
      source: log.source,
      confidence: log.confidence
    });
    await ingestCarbonEvent({
      category: "shopping",
      label,
      kg_co2e: log.totalKgCo2e,
      source: log.source,
      occurred_at: occurredAt
    });
  } catch {
    await enqueueOfflineMutation("ingestCarbonEvent", {
      category: "shopping",
      label: `${log.productName} (${log.vendor})`,
      kg_co2e: log.totalKgCo2e,
      source: log.source,
      occurred_at: new Date().toISOString()
    });
  }
}

export async function syncFoodDelivery(log: FoodDeliveryLog, token?: string): Promise<void> {
  useAppStore.getState().addFoodDelivery(log);

  if (!token || !isSupabaseConfigured || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    await saveFoodDeliveryLog({
      user_id: userId,
      platform: log.platform,
      restaurant_name: log.restaurantName,
      distance_km: log.distanceKm,
      vehicle_type: log.vehicleType,
      order_value: log.orderValue,
      items: log.items,
      kg_co2e: log.kgCo2e,
      is_vegetarian: log.isVegetarian,
      source: log.source,
      detected_at: log.detectedAt
    });
  } catch {
    await enqueueOfflineMutation("ingestCarbonEvent", {
      category: "food_delivery",
      label: `${log.platform} - ${log.restaurantName}`,
      kg_co2e: log.kgCo2e,
      source: log.source,
      occurred_at: log.detectedAt
    });
  }
}

export async function syncGroceryDelivery(log: GroceryDeliveryLog, token?: string): Promise<void> {
  useAppStore.getState().addGroceryDelivery(log);

  if (!token || !isSupabaseConfigured || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    await saveGroceryDeliveryLog({
      user_id: userId,
      platform: log.platform,
      store_name: log.storeName,
      distance_km: log.distanceKm,
      vehicle_type: log.vehicleType,
      order_value: log.orderValue,
      items: log.items,
      kg_co2e: log.kgCo2e,
      is_quick_commerce: log.isQuickCommerce,
      source: log.source,
      detected_at: log.detectedAt
    });
  } catch {
    await enqueueOfflineMutation("ingestCarbonEvent", {
      category: "grocery_delivery",
      label: `${log.platform} - ${log.storeName}`,
      kg_co2e: log.kgCo2e,
      source: log.source,
      occurred_at: log.detectedAt
    });
  }
}

export async function syncRideBooking(booking: RideBooking, token?: string): Promise<void> {
  useAppStore.getState().addRideBooking(booking);

  if (!token || !isSupabaseConfigured || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    await saveRideBooking({
      user_id: userId,
      platform: booking.platform,
      ride_type: booking.rideType,
      pickup_location: booking.pickupLocation,
      drop_location: booking.dropLocation,
      distance_km: booking.distanceKm,
      duration_minutes: booking.durationMinutes,
      fare: booking.fare,
      kg_co2e: booking.kgCo2e,
      vehicle_type: booking.vehicleType,
      source: booking.source,
      detected_at: booking.detectedAt
    });
  } catch {
    await enqueueOfflineMutation("ingestCarbonEvent", {
      category: "transport",
      label: `${booking.platform} ${booking.rideType} ride`,
      kg_co2e: booking.kgCo2e,
      source: booking.source,
      occurred_at: booking.detectedAt
    });
  }
}

export async function syncDeliveryOrder(order: DeliveryOrder, token?: string): Promise<void> {
  useAppStore.getState().addDeliveryOrder(order);

  if (!token || !isSupabaseConfigured || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    await saveDeliveryOrder({
      user_id: userId,
      platform: order.platform,
      order_id: order.orderId,
      merchant_name: order.merchantName,
      vehicle_type: order.vehicleType,
      distance_km: order.distanceKm,
      kg_co2e: order.kgCo2e,
      status: order.status,
      order_value: order.orderValue,
      items: order.items,
      source: order.source,
      confidence: order.confidence
    });
  } catch {
    await enqueueOfflineMutation("ingestCarbonEvent", {
      category: "food_delivery",
      label: `${order.platform} - ${order.merchantName}`,
      kg_co2e: order.kgCo2e,
      source: order.source,
      occurred_at: order.detectedAt
    });
  }
}

export async function syncAlert(alert: SmartAlert, token?: string): Promise<void> {
  useAppStore.getState().addSmartAlert(alert);

  if (!token || !isSupabaseConfigured || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    await saveSmartAlert({
      user_id: userId,
      type: alert.type,
      title: alert.title,
      body: alert.body,
      severity: alert.severity,
      impact_kg: alert.impactKg,
      action_label: alert.actionLabel,
      action_route: alert.actionRoute
    });
  } catch {
    await enqueueOfflineMutation("ingestCarbonEvent", {
      category: "alert",
      label: alert.title,
      kg_co2e: alert.impactKg,
      source: "alert",
      occurred_at: alert.createdAt
    });
  }
}

export async function generateAndSyncAlerts(token?: string): Promise<void> {
  const store = useAppStore.getState();
  const alerts = generateSmartAlerts(
    store.entries,
    store.shoppingLogs,
    store.electricityLogs,
    store.deliveryOrders,
    store.foodDeliveries,
    store.groceryDeliveries,
    store.streaks
  );

  const existingIds = new Set(store.smartAlerts.map(a => a.id));
  const newAlerts = alerts.filter(a => !existingIds.has(a.id));

  for (const alert of newAlerts.slice(0, 5)) {
    await syncAlert(alert, token);
  }
}

export function recalculateScore(): void {
  const store = useAppStore.getState();
  const entries = store.entries;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  const todayKg = entries
    .filter(e => e.occurredAt.startsWith(today))
    .reduce((s, e) => s + (e.kgCo2e || 0), 0);

  const weekKg = entries
    .filter(e => e.occurredAt >= weekAgo)
    .reduce((s, e) => s + (e.kgCo2e || 0), 0);

  const monthKg = entries
    .filter(e => e.occurredAt >= monthAgo)
    .reduce((s, e) => s + (e.kgCo2e || 0), 0);

  const totalKg = entries.reduce((s, e) => s + (e.kgCo2e || 0), 0);
  const avgDaily = entries.length > 0 ? totalKg / Math.max(1, new Set(entries.map(e => e.occurredAt.slice(0, 10))).size) : 0;
  const sustainabilityScore = Math.max(0, Math.min(100, Math.round(100 - avgDaily * 2)));

  useAppStore.setState({
    score: {
      dailyKg: Math.round(todayKg * 100) / 100,
      weeklyKg: Math.round(weekKg * 100) / 100,
      monthlyKg: Math.round(monthKg * 100) / 100,
      sustainabilityScore,
      savingsKg: store.score.savingsKg,
      goalKg: store.score.goalKg || 9
    }
  });
}

export function updateChallengeProgress(): void {
  const store = useAppStore.getState();
  const entries = store.entries;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const weekEntries = entries.filter(e => e.occurredAt >= weekAgo);

  const challenges = store.challenges.map(c => {
    if (c.completed) return c;

    let progress = 0;

    switch (c.id) {
      case "ch-1": {
        progress = weekEntries.filter(e =>
          e.category === "transport" && e.label.toLowerCase().includes("metro")
        ).length;
        break;
      }
      case "ch-2": {
        const deliveryDays = new Set(
          entries
            .filter(e => e.category === "food_delivery" && e.occurredAt >= c.startDate)
            .map(e => e.occurredAt.slice(0, 10))
        );
        let consecutiveNoDelivery = 0;
        let maxConsecutive = 0;
        const checkDate = new Date(c.startDate);
        while (checkDate <= now) {
          const dateStr = checkDate.toISOString().slice(0, 10);
          if (deliveryDays.has(dateStr)) {
            consecutiveNoDelivery = 0;
          } else {
            consecutiveNoDelivery++;
            maxConsecutive = Math.max(maxConsecutive, consecutiveNoDelivery);
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
        progress = maxConsecutive;
        break;
      }
      case "ch-3": {
        const monthAgoStr = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
        const twoMonthsAgo = new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10);
        const thisMonth = entries.filter(e => e.category === "electricity" && e.occurredAt >= monthAgoStr);
        const lastMonth = entries.filter(e => e.category === "electricity" && e.occurredAt >= twoMonthsAgo && e.occurredAt < monthAgoStr);
        const thisTotal = thisMonth.reduce((s, e) => s + e.kgCo2e, 0);
        const lastTotal = lastMonth.reduce((s, e) => s + e.kgCo2e, 0);
        if (lastTotal > 0) {
          progress = Math.round(Math.max(0, ((lastTotal - thisTotal) / lastTotal) * 100));
        }
        break;
      }
      case "ch-4": {
        progress = weekEntries.filter(e => e.category === "shopping").length;
        break;
      }
      case "ch-5": {
        progress = weekEntries.filter(e =>
          e.category === "transport" &&
          (e.label.toLowerCase().includes("walk") || e.label.toLowerCase().includes("cycl"))
        ).length;
        break;
      }
      default:
        progress = c.progress;
    }

    const completed = progress >= c.target && !c.completed;
    return { ...c, progress: Math.min(progress, c.target), completed, completedAt: completed ? now.toISOString() : c.completedAt };
  });

  const newlyCompleted = challenges.filter(c => c.completed && !store.challenges.find(oc => oc.id === c.id)?.completed);
  if (newlyCompleted.length > 0) {
    useAppStore.getState().addPoints(
      newlyCompleted.reduce((s, c) => s + c.reward, 0),
      "challenge_completed",
      `Completed: ${newlyCompleted.map(c => c.title).join(", ")}`
    );
  }

  useAppStore.setState({ challenges });
}
