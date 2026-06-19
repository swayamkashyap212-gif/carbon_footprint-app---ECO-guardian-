import { CarbonEntry, ElectricityLog, ShoppingLog, FlightLog, FoodDeliveryLog, GroceryDeliveryLog, RideBooking } from "../types/domain";
import { calculateTransportCarbon } from "./carbonEngine";

export type TimeGranularity = "daily" | "weekly" | "monthly" | "yearly";

export type GraphDataPoint = {
  label: string;
  value: number;
  color?: string;
};

export type CategoryBreakdown = {
  category: string;
  totalKg: number;
  count: number;
  percentage: number;
  color: string;
};

export type VehicleBreakdown = {
  mode: string;
  totalKg: number;
  count: number;
  percentage: number;
};

export type AnalyticsSummary = {
  todayKg: number;
  weekKg: number;
  monthKg: number;
  yearKg: number;
  totalKg: number;
  totalTrips: number;
  totalOrders: number;
  totalFlights: number;
  totalShopping: number;
  carbonSaved: number;
  challengesCompleted: number;
  dailyGraph: GraphDataPoint[];
  weeklyGraph: GraphDataPoint[];
  monthlyGraph: GraphDataPoint[];
  yearlyGraph: GraphDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
  vehicleBreakdown: VehicleBreakdown[];
  shoppingBreakdown: CategoryBreakdown[];
  flightBreakdown: { route: string; kg: number; count: number }[];
  orderBreakdown: { platform: string; kg: number; count: number }[];
  trendDirection: "increasing" | "stable" | "decreasing";
  avgDailyKg: number;
  peakDay: string;
  greenestDay: string;
};

const categoryColors: Record<string, string> = {
  transport: "#154212",
  flight: "#ba1a1a",
  electricity: "#b86e00",
  food_delivery: "#486800",
  grocery_delivery: "#123c5a",
  shopping: "#2d5a27",
  food: "#486800",
  ride_booking: "#b86e00",
  navigation_trip: "#2d5a27",
  routine: "#42493e"
};

export function generateAnalytics(
  entries: CarbonEntry[],
  electricityLogs: ElectricityLog[],
  shoppingLogs: ShoppingLog[],
  flightLogs: FlightLog[],
  foodDeliveries: FoodDeliveryLog[],
  groceryDeliveries: GroceryDeliveryLog[],
  rideBookings: RideBooking[],
  challengesCompleted: number
): AnalyticsSummary {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const yearAgo = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);

  const todayEntries = entries.filter(e => e.occurredAt.startsWith(today));
  const weekEntries = entries.filter(e => e.occurredAt >= weekAgo);
  const monthEntries = entries.filter(e => e.occurredAt >= monthAgo);
  const yearEntries = entries.filter(e => e.occurredAt >= yearAgo);

  const todayKg = todayEntries.reduce((s, e) => s + e.kgCo2e, 0);
  const weekKg = weekEntries.reduce((s, e) => s + e.kgCo2e, 0);
  const monthKg = monthEntries.reduce((s, e) => s + e.kgCo2e, 0);
  const yearKg = yearEntries.reduce((s, e) => s + e.kgCo2e, 0);
  const totalKg = entries.reduce((s, e) => s + e.kgCo2e, 0);

  const totalTrips = entries.filter(e => e.category === "transport" || e.category === "navigation_trip").length;
  const totalOrders = entries.filter(e => e.category === "food_delivery" || e.category === "grocery_delivery" || e.category === "shopping").length;
  const totalFlights = entries.filter(e => e.category === "flight").length;
  const totalShopping = entries.filter(e => e.category === "shopping").length;

  const uniqueDays = new Set(entries.map(e => e.occurredAt.slice(0, 10))).size;
  const avgDailyKg = uniqueDays > 0 ? totalKg / uniqueDays : 0;

  const carbonSaved = entries.reduce((s, e) => {
    if (e.category === "transport" || e.category === "navigation_trip") {
      const distanceKm = (e.metadata?.distanceKm as number) || 0;
      if (distanceKm <= 0) return s;
      const carCarbon = calculateTransportCarbon(distanceKm, "car");
      return s + Math.max(0, carCarbon - e.kgCo2e);
    }
    return s;
  }, 0);

  const dailyGraph = generateDailyGraph(entries, 7);
  const weeklyGraph = generateWeeklyGraph(entries, 12);
  const monthlyGraph = generateMonthlyGraph(entries, 12);
  const yearlyGraph = generateYearlyGraph(entries, 12);

  const categoryBreakdown = generateCategoryBreakdown(entries);
  const vehicleBreakdown = generateVehicleBreakdown(entries);
  const shoppingBreakdown = generateShoppingCategoryBreakdown(shoppingLogs);
  const flightBreakdown = generateFlightBreakdown(flightLogs);
  const orderBreakdown = generateOrderBreakdown(foodDeliveries, groceryDeliveries);

  const dayKgMap: Record<string, number> = {};
  entries.forEach(e => {
    const day = e.occurredAt.slice(0, 10);
    dayKgMap[day] = (dayKgMap[day] || 0) + e.kgCo2e;
  });
  const peakDay = Object.entries(dayKgMap).sort((a, b) => b[1] - a[1])[0]?.[0] || today;
  const greenestDay = Object.entries(dayKgMap).sort((a, b) => a[1] - b[1])[0]?.[0] || today;

  const trendDirection = computeTrend(entries);

  return {
    todayKg: round(todayKg),
    weekKg: round(weekKg),
    monthKg: round(monthKg),
    yearKg: round(yearKg),
    totalKg: round(totalKg),
    totalTrips,
    totalOrders,
    totalFlights,
    totalShopping,
    carbonSaved: round(carbonSaved),
    challengesCompleted,
    dailyGraph,
    weeklyGraph,
    monthlyGraph,
    yearlyGraph,
    categoryBreakdown,
    vehicleBreakdown,
    shoppingBreakdown,
    flightBreakdown,
    orderBreakdown,
    trendDirection,
    avgDailyKg: round(avgDailyKg),
    peakDay,
    greenestDay
  };
}

function generateDailyGraph(entries: CarbonEntry[], days: number): GraphDataPoint[] {
  const result: GraphDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400000);
    const dateStr = date.toISOString().slice(0, 10);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const dayEntries = entries.filter(e => e.occurredAt.startsWith(dateStr));
    const total = dayEntries.reduce((s, e) => s + e.kgCo2e, 0);
    result.push({ label: dayName, value: round(total), color: getCategoryColor(total) });
  }
  return result;
}

function generateWeeklyGraph(entries: CarbonEntry[], weeks: number): GraphDataPoint[] {
  const result: GraphDataPoint[] = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
    const startStr = weekStart.toISOString().slice(0, 10);
    const endStr = weekEnd.toISOString().slice(0, 10);
    const label = `W${weeks - i}`;
    const weekEntries = entries.filter(e => {
      const d = e.occurredAt.slice(0, 10);
      return d >= startStr && d <= endStr;
    });
    const total = weekEntries.reduce((s, e) => s + e.kgCo2e, 0);
    result.push({ label, value: round(total), color: getCategoryColor(total) });
  }
  return result;
}

function generateMonthlyGraph(entries: CarbonEntry[], months: number): GraphDataPoint[] {
  const result: GraphDataPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString("en-US", { month: "short" });
    const monthEntries = entries.filter(e => e.occurredAt.startsWith(monthStr));
    const total = monthEntries.reduce((s, e) => s + e.kgCo2e, 0);
    result.push({ label, value: round(total), color: getCategoryColor(total) });
  }
  return result;
}

function generateYearlyGraph(entries: CarbonEntry[], years: number): GraphDataPoint[] {
  const result: GraphDataPoint[] = [];
  const now = new Date();

  for (let i = years - 1; i >= 0; i--) {
    const year = now.getFullYear() - i;
    const yearEntries = entries.filter(e => e.occurredAt.startsWith(String(year)));
    const total = yearEntries.reduce((s, e) => s + e.kgCo2e, 0);
    result.push({ label: String(year), value: round(total), color: getCategoryColor(total) });
  }
  return result;
}

function generateCategoryBreakdown(entries: CarbonEntry[]): CategoryBreakdown[] {
  const totals: Record<string, { kg: number; count: number }> = {};
  entries.forEach(e => {
    const cat = e.category;
    if (!totals[cat]) totals[cat] = { kg: 0, count: 0 };
    totals[cat].kg += e.kgCo2e;
    totals[cat].count += 1;
  });

  const grandTotal = Object.values(totals).reduce((s, v) => s + v.kg, 0);

  return Object.entries(totals)
    .map(([category, data]) => ({
      category,
      totalKg: round(data.kg),
      count: data.count,
      percentage: grandTotal > 0 ? Math.round((data.kg / grandTotal) * 100) : 0,
      color: categoryColors[category] || "#42493e"
    }))
    .sort((a, b) => b.totalKg - a.totalKg);
}

function generateVehicleBreakdown(entries: CarbonEntry[]): VehicleBreakdown[] {
  const transportEntries = entries.filter(e => e.category === "transport" || e.category === "navigation_trip");
  const totals: Record<string, { kg: number; count: number }> = {};

  transportEntries.forEach(e => {
    let mode: string;
    if (e.metadata?.mode && typeof e.metadata.mode === "string") {
      mode = e.metadata.mode;
    } else if (e.metadata?.vehicleType && typeof e.metadata.vehicleType === "string") {
      mode = e.metadata.vehicleType;
    } else {
      const match = e.label.match(/\(([^,)]+)/);
      mode = match ? match[1] : "unknown";
    }
    if (!totals[mode]) totals[mode] = { kg: 0, count: 0 };
    totals[mode].kg += e.kgCo2e;
    totals[mode].count += 1;
  });

  const grandTotal = Object.values(totals).reduce((s, v) => s + v.kg, 0);

  return Object.entries(totals)
    .map(([mode, data]) => ({
      mode,
      totalKg: round(data.kg),
      count: data.count,
      percentage: grandTotal > 0 ? Math.round((data.kg / grandTotal) * 100) : 0
    }))
    .sort((a, b) => b.totalKg - a.totalKg);
}

function generateShoppingCategoryBreakdown(logs: ShoppingLog[]): CategoryBreakdown[] {
  const totals: Record<string, { kg: number; count: number }> = {};
  logs.forEach(l => {
    const cat = l.category;
    if (!totals[cat]) totals[cat] = { kg: 0, count: 0 };
    totals[cat].kg += l.totalKgCo2e;
    totals[cat].count += 1;
  });

  const grandTotal = Object.values(totals).reduce((s, v) => s + v.kg, 0);

  return Object.entries(totals)
    .map(([category, data]) => ({
      category,
      totalKg: round(data.kg),
      count: data.count,
      percentage: grandTotal > 0 ? Math.round((data.kg / grandTotal) * 100) : 0,
      color: categoryColors[category] || "#2d5a27"
    }))
    .sort((a, b) => b.totalKg - a.totalKg);
}

function generateFlightBreakdown(logs: FlightLog[]): { route: string; kg: number; count: number }[] {
  const routes: Record<string, { kg: number; count: number }> = {};
  logs.forEach(l => {
    const route = `${l.departureAirport}-${l.destinationAirport}`;
    if (!routes[route]) routes[route] = { kg: 0, count: 0 };
    routes[route].kg += l.kgCo2e;
    routes[route].count += 1;
  });

  return Object.entries(routes)
    .map(([route, data]) => ({ route, kg: round(data.kg), count: data.count }))
    .sort((a, b) => b.kg - a.kg);
}

function generateOrderBreakdown(
  food: FoodDeliveryLog[],
  grocery: GroceryDeliveryLog[]
): { platform: string; kg: number; count: number }[] {
  const platforms: Record<string, { kg: number; count: number }> = {};

  food.forEach(f => {
    const p = f.platform;
    if (!platforms[p]) platforms[p] = { kg: 0, count: 0 };
    platforms[p].kg += f.kgCo2e;
    platforms[p].count += 1;
  });

  grocery.forEach(g => {
    const p = g.platform;
    if (!platforms[p]) platforms[p] = { kg: 0, count: 0 };
    platforms[p].kg += g.kgCo2e;
    platforms[p].count += 1;
  });

  return Object.entries(platforms)
    .map(([platform, data]) => ({ platform, kg: round(data.kg), count: data.count }))
    .sort((a, b) => b.kg - a.kg);
}

function computeTrend(entries: CarbonEntry[]): "increasing" | "stable" | "decreasing" {
  if (entries.length < 10) return "stable";

  const sorted = [...entries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  if (firstHalf.length === 0 || secondHalf.length === 0) return "stable";

  const firstAvg = firstHalf.reduce((s, e) => s + e.kgCo2e, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, e) => s + e.kgCo2e, 0) / secondHalf.length;

  if (firstAvg === 0 && secondAvg === 0) return "stable";
  if (firstAvg === 0) return "increasing";

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (change < -10) return "decreasing";
  if (change > 10) return "increasing";
  return "stable";
}

function getCategoryColor(kg: number): string {
  if (kg <= 5) return "#154212";
  if (kg <= 15) return "#486800";
  if (kg <= 30) return "#b86e00";
  return "#ba1a1a";
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
