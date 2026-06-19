import { calculateTransportCarbon } from "./carbonEngine";
import { DeliveryPlatform, DeliveryVehicleType, MonitoringEvent, TransportMode } from "../types/domain";

export type MonitoringSummary = {
  events: MonitoringEvent[];
  dailyKg: number;
  weeklyKg: number;
  monthlyKg: number;
  detectedModes: string[];
  totalDistanceKm: number;
  greenPercent: number;
  tripCount: number;
  dailyEvents: number;
  weeklyEvents: number;
  monthlyEvents: number;
  greenTripPercent: number;
  totalCarbon: number;
};

export function detectActivityFromSignal(speedKmh: number, source: "gps" | "activity" = "gps"): MonitoringEvent {
  const detectedMode = inferMode(speedKmh);
  const distanceKm = Math.max(0.5, Math.round((speedKmh / 4) * 100) / 100);
  const kgCo2e = calculateTransportCarbon(distanceKm, detectedMode);

  return {
    id: `monitor-${Date.now()}`,
    detectedMode,
    distanceKm,
    durationMinutes: 15,
    confidence: detectedMode === "car" ? 0.78 : 0.86,
    source,
    kgCo2e,
    occurredAt: new Date().toISOString()
  };
}

export function getMonitoringSummary(events: MonitoringEvent[] = []) {
  const now = Date.now();
  const dayAgo = now - 86400000;
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;

  const dailyEvents = events.filter(e => new Date(e.occurredAt).getTime() > dayAgo);
  const weeklyEvents = events.filter(e => new Date(e.occurredAt).getTime() > weekAgo);
  const monthlyEvents = events.filter(e => new Date(e.occurredAt).getTime() > monthAgo);

  const dailyKg = dailyEvents.reduce((sum, event) => sum + event.kgCo2e, 0);
  const weeklyKg = weeklyEvents.reduce((sum, event) => sum + event.kgCo2e, 0);
  const monthlyKg = monthlyEvents.reduce((sum, event) => sum + event.kgCo2e, 0);

  const modeCounts: Record<string, number> = {};
  events.forEach(e => { modeCounts[e.detectedMode] = (modeCounts[e.detectedMode] || 0) + 1; });
  const detectedModes = Object.entries(modeCounts).sort((a, b) => b[1] - a[1]).map(([mode]) => mode);

  const totalDistance = events.reduce((sum, e) => sum + e.distanceKm, 0);
  const greenTrips = events.filter(e => ["walking", "cycling", "metro"].includes(e.detectedMode)).length;
  const greenPercent = events.length > 0 ? Math.round((greenTrips / events.length) * 100) : 0;

  return {
    events,
    dailyKg: Math.round(dailyKg * 100) / 100,
    weeklyKg: Math.round(weeklyKg * 100) / 100,
    monthlyKg: Math.round(monthlyKg * 100) / 100,
    detectedModes,
    totalDistanceKm: Math.round(totalDistance * 100) / 100,
    greenPercent,
    tripCount: events.length,
    dailyEvents: dailyEvents.length,
    weeklyEvents: weeklyEvents.length,
    monthlyEvents: monthlyEvents.length,
    greenTripPercent: greenPercent,
    totalCarbon: Math.round(monthlyKg * 100) / 100
  };
}

function inferMode(speedKmh: number): TransportMode {
  if (speedKmh < 5) return "walking";
  if (speedKmh < 15) return "cycling";
  if (speedKmh < 30) return "bike";
  if (speedKmh < 50) return "car";
  if (speedKmh < 80) return "bus";
  return "train";
}

export function predictDeliveryVehicle(distanceKm: number, platform: DeliveryPlatform, deliveryTimeMinutes: number): DeliveryVehicleType {
  if (distanceKm <= 2) {
    if (deliveryTimeMinutes <= 15) return "ELECTRIC_BIKE";
    if (deliveryTimeMinutes <= 25) return "CYCLE";
    return "WALKING";
  }

  if (distanceKm <= 5) {
    if (["blinkit", "zepto", "instamart"].includes(platform)) return "ELECTRIC_BIKE";
    if (platform === "bigbasket") return "PETROL_BIKE";
    if (deliveryTimeMinutes <= 20) return "ELECTRIC_BIKE";
    if (deliveryTimeMinutes <= 30) return "PETROL_BIKE";
    return "SCOOTER";
  }

  if (distanceKm <= 10) {
    if (deliveryTimeMinutes <= 25) return "PETROL_BIKE";
    if (deliveryTimeMinutes <= 40) return "SCOOTER";
    return "PETROL_CAR";
  }

  if (platform === "porter") return "VAN";
  if (["amazon", "flipkart"].includes(platform)) return "VAN";
  return "PETROL_CAR";
}

let _lastKnownLatitude: number | null = null;
let _lastKnownLongitude: number | null = null;

export function updateKnownLocation(lat: number, lng: number): void {
  _lastKnownLatitude = lat;
  _lastKnownLongitude = lng;
}

export function getKnownLocation(): { lat: number; lng: number } | null {
  if (_lastKnownLatitude !== null && _lastKnownLongitude !== null) {
    return { lat: _lastKnownLatitude, lng: _lastKnownLongitude };
  }
  return null;
}

export function estimateDeliveryDistance(platform: DeliveryPlatform, merchantName: string): number {
  const baseDistance = getBaseDistanceForPlatform(platform);

  if (_lastKnownLatitude !== null && _lastKnownLongitude !== null) {
    const urbanFactor = estimateUrbanFactor(_lastKnownLatitude, _lastKnownLongitude);
    return Math.round(baseDistance * urbanFactor * 100) / 100;
  }

  return baseDistance;
}

function getBaseDistanceForPlatform(platform: DeliveryPlatform): number {
  const quickCommercePlatforms = ["blinkit", "zepto", "instamart"];
  if (quickCommercePlatforms.includes(platform)) return 2.5;

  if (platform === "bigbasket") return 5;
  if (platform === "swiggy" || platform === "zomato") return 4;
  if (["uber", "ola", "rapido"].includes(platform)) return 8;
  if (platform === "porter") return 12;
  if (["amazon", "flipkart"].includes(platform)) return 10;
  return 6;
}

function estimateUrbanFactor(lat: number, lng: number): number {
  const isUrban = (lat > 18.5 && lat < 20.0 && lng > 72.5 && lng < 73.5) ||
                  (lat > 12.5 && lat < 13.5 && lng > 77.0 && lng < 78.0) ||
                  (lat > 28.0 && lat < 29.0 && lng > 76.5 && lng < 77.5) ||
                  (lat > 19.0 && lat < 20.0 && lng > 72.5 && lng < 73.5);
  return isUrban ? 0.85 : 1.15;
}

export function calculateDistanceFromGPS(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getVehicleEmoji(vehicle: DeliveryVehicleType): string {
  const emojis: Record<DeliveryVehicleType, string> = {
    ELECTRIC_BIKE: "⚡",
    PETROL_BIKE: "🏍",
    SCOOTER: "🛵",
    EV_CAR: "🚗",
    PETROL_CAR: "🚗",
    DIESEL_CAR: "🚗",
    CYCLE: "🚲",
    WALKING: "🚶",
    VAN: "🚐",
    AUTO_RICKSHAW: "🛺",
    UNKNOWN: "❓"
  };
  return emojis[vehicle] ?? "❓";
}

export function getVehicleDisplayName(vehicle: DeliveryVehicleType): string {
  const names: Record<DeliveryVehicleType, string> = {
    ELECTRIC_BIKE: "Electric Bike",
    PETROL_BIKE: "Petrol Bike",
    SCOOTER: "Scooter",
    EV_CAR: "Electric Car",
    PETROL_CAR: "Petrol Car",
    DIESEL_CAR: "Diesel Car",
    CYCLE: "Bicycle",
    WALKING: "Walking",
    VAN: "Delivery Van",
    AUTO_RICKSHAW: "Auto Rickshaw",
    UNKNOWN: "Unknown"
  };
  return names[vehicle] ?? "Unknown";
}
