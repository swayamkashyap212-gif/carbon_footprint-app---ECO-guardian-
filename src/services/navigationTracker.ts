import { calculateTransportCarbon } from "./carbonEngine";
import { useAppStore } from "../store/useAppStore";
import { getCurrentLocation, LocationPoint } from "./locationService";
import { ingestCarbonEvent } from "./supabase";
import { CarbonEntry, TransportMode } from "../types/domain";

type NavigationState = {
  active: boolean;
  startLocation: LocationPoint | null;
  startTime: number | null;
  lastUpdate: number | null;
  totalDistanceKm: number;
  estimatedMode: TransportMode;
  packageName: string;
  notificationDistanceKm: number;
  notificationEtaMinutes: number;
  lastNotificationText: string;
};

let navState: NavigationState = {
  active: false,
  startLocation: null,
  startTime: null,
  lastUpdate: null,
  totalDistanceKm: 0,
  estimatedMode: "car",
  packageName: "",
  notificationDistanceKm: 0,
  notificationEtaMinutes: 0,
  lastNotificationText: "",
};

const NAVIGATION_TIMEOUT_MS = 30 * 60 * 1000;
const MIN_DISTANCE_KM = 0.1;
const DEDUP_WINDOW_MS = 60 * 1000;
let _timeoutTimer: ReturnType<typeof setTimeout> | null = null;
let _lastTripFinalizedAt = 0;

const SPEED_LOOKUP: Record<TransportMode, number> = {
  walking: 4.5,
  cycling: 14,
  bike: 28,
  car: 25,
  bus: 20,
  metro: 35,
  train: 45,
  flight: 800,
};

function startNavigationTimer() {
  clearNavigationTimer();
  _timeoutTimer = setTimeout(() => {
    if (navState.active) {
      finalizeTrip();
    }
  }, NAVIGATION_TIMEOUT_MS);
}

function clearNavigationTimer() {
  if (_timeoutTimer) {
    clearTimeout(_timeoutTimer);
    _timeoutTimer = null;
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractDistanceFromText(text: string): number {
  const lower = text.toLowerCase();

  // Pattern: "12 km" or "12km"
  const kmMatch = lower.match(/(\d+(?:\.\d+)?)\s*km/);
  if (kmMatch) return parseFloat(kmMatch[1]);

  // Pattern: "12.5 kilometres"
  const kmLongMatch = lower.match(/(\d+(?:\.\d+)?)\s*kilometres?/);
  if (kmLongMatch) return parseFloat(kmLongMatch[1]);

  // Pattern: "12 mi" or "12 miles"
  const miMatch = lower.match(/(\d+(?:\.\d+)?)\s*mi(?:les?)?/);
  if (miMatch) return parseFloat(miMatch[1]) * 1.60934;

  // Pattern: "7.5 m" or "750 m" (meters)
  const mMatch = lower.match(/(\d+(?:\.\d+)?)\s*m(?:eters?)?(?!\w)/);
  if (mMatch) {
    const meters = parseFloat(mMatch[1]);
    if (meters > 50) return meters / 1000;
  }

  return 0;
}

function extractEtaFromText(text: string): number {
  const lower = text.toLowerCase();

  // Pattern: "12 min" or "12 minutes"
  const minMatch = lower.match(/(\d+)\s*min(?:ute)?s?/);
  if (minMatch) return parseInt(minMatch[1]);

  // Pattern: "1 hr 23 min" or "1h 23m"
  const hrMinMatch = lower.match(/(\d+)\s*h(?:r|ours?)?\s*(\d+)?\s*m(?:in)?/);
  if (hrMinMatch) {
    const hours = parseInt(hrMinMatch[1]);
    const mins = hrMinMatch[2] ? parseInt(hrMinMatch[2]) : 0;
    return hours * 60 + mins;
  }

  // Pattern: "about 12 minutes"
  const aboutMatch = lower.match(/about\s+(\d+)\s*min/);
  if (aboutMatch) return parseInt(aboutMatch[1]);

  return 0;
}

function detectModeFromText(title: string, body: string): TransportMode {
  const text = `${title} ${body}`.toLowerCase();
  if (text.includes("walk") || text.includes("on foot") || text.includes("walking")) return "walking";
  if (text.includes("bicycle") || text.includes("cycling") || text.includes("bike route")) return "cycling";
  if (text.includes("two-wheeler") || (text.includes("bike") && !text.includes("bike route"))) return "bike";
  if (text.includes("bus") || text.includes("transit")) return "bus";
  if (text.includes("metro") || text.includes("subway") || text.includes("train")) return "metro";
  if (text.includes("driving") || text.includes("drive") || text.includes("car")) return "car";
  return "car";
}

function inferModeFromEtaAndDistance(distanceKm: number, etaMinutes: number): TransportMode {
  if (distanceKm <= 0 || etaMinutes <= 0) return "walking";

  const speedKmh = (distanceKm / etaMinutes) * 60;

  if (speedKmh < 5) return "walking";
  if (speedKmh < 15) return "cycling";
  if (speedKmh < 30) return "bike";
  if (speedKmh < 50) return "car";
  if (speedKmh < 80) return "bus";
  return "train";
}

export function handleNavigationNotification(title: string, body: string, packageName: string) {
  const text = `${title} ${body}`.toLowerCase();

  const isStart = text.includes("starting navigation") ||
    text.includes("head towards") ||
    text.includes("navigate to") ||
    text.includes("fastest route") ||
    text.includes("route to") ||
    text.includes("directions to") ||
    (text.includes("eta") && text.includes("min"));

  const isEnd = text.includes("arrived") ||
    text.includes("you have arrived") ||
    text.includes("destination is on your") ||
    text.includes("destination is ahead") ||
    text.includes("you've reached") ||
    text.includes("reached your destination");

  const isUpdate = text.includes("turn left") ||
    text.includes("turn right") ||
    text.includes("continue for") ||
    text.includes("in 400") ||
    text.includes("in 300") ||
    text.includes("in 200") ||
    text.includes("in 150") ||
    text.includes("in 100") ||
    text.includes("in 50") ||
    text.includes("in 500") ||
    text.includes("in 1 km") ||
    text.includes("in 2 km") ||
    text.includes("in 3 km") ||
    text.includes("slight left") ||
    text.includes("slight right") ||
    text.includes("keep left") ||
    text.includes("keep right") ||
    text.includes("exit the") ||
    text.includes("merge onto") ||
    text.includes("recalculating") ||
    text.includes("traffic on") ||
    text.includes("road closure") ||
    text.includes("speed camera") ||
    text.includes("alternate route") ||
    text.includes("u-turn") ||
    text.includes("roundabout");

  // Extract distance and ETA from any notification
  const distFromText = extractDistanceFromText(text);
  const etaFromText = extractEtaFromText(text);

  if (distFromText > 0) {
    navState.notificationDistanceKm = distFromText;
  }
  if (etaFromText > 0) {
    navState.notificationEtaMinutes = etaFromText;
  }

  if (isEnd && navState.active) {
    // Use notification distance if GPS distance is 0
    if (navState.totalDistanceKm < MIN_DISTANCE_KM && navState.notificationDistanceKm > 0) {
      navState.totalDistanceKm = navState.notificationDistanceKm;
    }
    finalizeTrip();
    return;
  }

  if (isStart) {
    if (navState.active) {
      finalizeTrip();
    }
    startNavigation(title, body, packageName, distFromText, etaFromText);
    return;
  }

  if (isUpdate && navState.active) {
    updateNavigationProgress(title, body);
  }

  // If we get distance/ETA updates and navigation is active, update even without specific start/end
  if ((distFromText > 0 || etaFromText > 0) && navState.active) {
    if (distFromText > 0) navState.notificationDistanceKm = distFromText;
    if (etaFromText > 0) navState.notificationEtaMinutes = etaFromText;
    startNavigationTimer();
  }
}

async function startNavigation(
  title: string,
  body: string,
  packageName: string,
  distFromText: number,
  etaFromText: number
) {
  let loc: LocationPoint | null = null;
  try {
    const currentLoc = await getCurrentLocation();
    if (currentLoc) {
      loc = {
        latitude: currentLoc.latitude,
        longitude: currentLoc.longitude,
        altitude: null,
        accuracy: currentLoc.accuracy,
        speed: null,
        heading: null,
        timestamp: currentLoc.timestamp,
      };
    }
  } catch {}

  const textMode = detectModeFromText(title, body);
  const inferredMode = (distFromText > 0 && etaFromText > 0)
    ? inferModeFromEtaAndDistance(distFromText, etaFromText)
    : textMode;

  navState = {
    active: true,
    startLocation: loc,
    startTime: Date.now(),
    lastUpdate: Date.now(),
    totalDistanceKm: 0,
    estimatedMode: inferredMode,
    packageName,
    notificationDistanceKm: distFromText,
    notificationEtaMinutes: etaFromText,
    lastNotificationText: `${title} ${body}`,
  };
  startNavigationTimer();
}

async function updateNavigationProgress(title: string, body: string) {
  if (!navState.active) return;

  const now = Date.now();
  if (now - (navState.lastUpdate ?? 0) < 10000) return;

  navState.lastUpdate = now;
  navState.lastNotificationText = `${title} ${body}`;

  startNavigationTimer();

  // Try GPS distance
  try {
    const loc = await getCurrentLocation();
    if (loc && navState.startLocation) {
      const distanceKm = calculateDistance(
        navState.startLocation.latitude,
        navState.startLocation.longitude,
        loc.latitude,
        loc.longitude
      );
      if (distanceKm > navState.totalDistanceKm) {
        navState.totalDistanceKm = distanceKm;
      }
    }
  } catch {}

  // Update mode from speed if we have GPS data
  const elapsedMinutes = (now - (navState.startTime ?? now)) / 60000;
  if (elapsedMinutes > 2 && navState.totalDistanceKm > 0) {
    const speedKmh = (navState.totalDistanceKm / elapsedMinutes) * 60;
    if (speedKmh < 5) navState.estimatedMode = "walking";
    else if (speedKmh < 15) navState.estimatedMode = "cycling";
    else if (speedKmh < 30) navState.estimatedMode = "bike";
    else if (speedKmh < 50) navState.estimatedMode = "car";
    else if (speedKmh < 80) navState.estimatedMode = "bus";
    else navState.estimatedMode = "train";
  }
}

function finalizeTrip() {
  if (!navState.active) return;
  clearNavigationTimer();

  const now = Date.now();
  if (now - _lastTripFinalizedAt < DEDUP_WINDOW_MS && navState.totalDistanceKm < MIN_DISTANCE_KM) {
    resetNavigation();
    return;
  }

  const elapsedMs = now - (navState.startTime ?? now);
  const elapsedMinutes = elapsedMs / 60000;
  let distanceKm = navState.totalDistanceKm;

  // Fallback: use notification distance if GPS distance is 0
  if (distanceKm < MIN_DISTANCE_KM && navState.notificationDistanceKm > 0) {
    distanceKm = navState.notificationDistanceKm;
  }

  // Fallback: estimate from ETA if we have no distance
  if (distanceKm < MIN_DISTANCE_KM && navState.notificationEtaMinutes > 0) {
    const avgSpeed = SPEED_LOOKUP[navState.estimatedMode] || 25;
    distanceKm = (navState.notificationEtaMinutes / 60) * avgSpeed;
  }

  // Final fallback: estimate from elapsed time
  if (distanceKm < MIN_DISTANCE_KM && elapsedMinutes > 2) {
    const avgSpeed = SPEED_LOOKUP[navState.estimatedMode] || 25;
    distanceKm = (elapsedMinutes / 60) * avgSpeed;
  }

  // Minimum threshold
  if (distanceKm < MIN_DISTANCE_KM && elapsedMinutes < 2) {
    resetNavigation();
    return;
  }

  const finalDistance = Math.max(0.1, distanceKm);
  const carbonKg = calculateTransportCarbon(finalDistance, navState.estimatedMode);
  const occurredAt = new Date().toISOString();

  const store = useAppStore.getState();

  store.addEntry({
    id: `nav-${Date.now()}`,
    category: "navigation_trip",
    label: `Navigation trip (${navState.estimatedMode}, ${Math.round(finalDistance * 100) / 100} km)`,
    kgCo2e: carbonKg,
    source: "notification",
    occurredAt,
    metadata: {
      mode: navState.estimatedMode,
      distanceKm: finalDistance,
      durationMinutes: Math.round(elapsedMinutes),
      packageName: navState.packageName,
      notificationDistance: navState.notificationDistanceKm,
      notificationEta: navState.notificationEtaMinutes,
    },
  });

  store.addPoints(3, "action_logged", `Navigation trip tracked`);

  // Sync to Supabase
  try {
    void ingestCarbonEvent({
      category: "navigation_trip",
      label: `Navigation trip (${navState.estimatedMode}, ${Math.round(finalDistance * 100) / 100} km)`,
      kg_co2e: carbonKg,
      source: "notification",
      occurred_at: occurredAt,
      metadata: {
        mode: navState.estimatedMode,
        distanceKm: finalDistance,
        durationMinutes: Math.round(elapsedMinutes),
      },
    });
  } catch {}

  if (navState.estimatedMode === "metro" || navState.estimatedMode === "bus" || navState.estimatedMode === "train") {
    store.updateStreak("metro_commute", true);
  }
  if (navState.estimatedMode === "walking" || navState.estimatedMode === "cycling") {
    store.updateStreak("walk_or_cycle", true);
  }

  _lastTripFinalizedAt = Date.now();
  resetNavigation();
}

function resetNavigation() {
  clearNavigationTimer();
  navState = {
    active: false,
    startLocation: null,
    startTime: null,
    lastUpdate: null,
    totalDistanceKm: 0,
    estimatedMode: "car",
    packageName: "",
    notificationDistanceKm: 0,
    notificationEtaMinutes: 0,
    lastNotificationText: "",
  };
}
