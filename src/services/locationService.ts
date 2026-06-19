import { Platform } from "react-native";
import { calculateTransportCarbon } from "./carbonEngine";
import { TransportMode } from "../types/domain";
import {
  hasBackgroundLocationPermission,
  startBackgroundLocationTracking as nativeStartTracking,
  stopBackgroundLocationTracking as nativeStopTracking,
  isNativeTrackingActive,
  getLastKnownNativeLocation,
  subscribeToNativeLocationUpdates,
  NativeLocationEvent
} from "../native/locationBridge";
import { updateKnownLocation } from "./monitoringEngine";

let Location: any = null;
let locationTrackingActive = false;
let unsubscribeNativeLocation: (() => void) | null = null;

export type LocationPoint = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
};

export type TripSegment = {
  id: string;
  startLocation: LocationPoint;
  endLocation: LocationPoint;
  distanceKm: number;
  durationMinutes: number;
  mode: TransportMode;
  carbonKg: number;
  startedAt: string;
  endedAt: string;
};

export type CurrentLocation = {
  latitude: number;
  longitude: number;
  city: string | null;
  area: string | null;
  accuracy: number | null;
  timestamp: number;
};

export type LocationStats = {
  todayDistanceKm: number;
  todayTrips: number;
  todayCarbonKg: number;
  totalDistanceKm: number;
  totalTrips: number;
  currentLocation: CurrentLocation | null;
};

let currentTripStart: LocationPoint | null = null;
let lastLocation: LocationPoint | null = null;
let lastReverseGeocodeTime = 0;
const REVERSE_GEOCODE_INTERVAL_MS = 5 * 60 * 1000;
let locationWatcherSubscription: any = null;
let lastMovementTime: number = 0;
const STOP_THRESHOLD_MS = 5 * 60 * 1000;
const STOP_SPEED_MS = 1.0;
const LOCATION_STATS_KEY = "ecoguardian.locationStats";
let _asyncStorage: any = null;

let todayStats: LocationStats = {
  todayDistanceKm: 0,
  todayTrips: 0,
  todayCarbonKg: 0,
  totalDistanceKm: 0,
  totalTrips: 0,
  currentLocation: null
};

let lastResetDate: string = getLocalDate();

function getLocalDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getStorage(): Promise<any> {
  if (_asyncStorage) return _asyncStorage;
  try {
    _asyncStorage = require("@react-native-async-storage/async-storage").default;
    return _asyncStorage;
  } catch {
    return null;
  }
}

async function loadLocationStats(): Promise<void> {
  const store = await getStorage();
  if (!store) return;
  try {
    const raw = await store.getItem(LOCATION_STATS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return;
    todayStats = {
      todayDistanceKm: saved.todayDistanceKm ?? 0,
      todayTrips: saved.todayTrips ?? 0,
      todayCarbonKg: saved.todayCarbonKg ?? 0,
      totalDistanceKm: saved.totalDistanceKm ?? 0,
      totalTrips: saved.totalTrips ?? 0,
      currentLocation: saved.currentLocation ?? null,
    };
    if (saved.lastResetDate) {
      lastResetDate = saved.lastResetDate;
    }
  } catch {}
}

async function saveLocationStats(): Promise<void> {
  const store = await getStorage();
  if (!store) return;
  try {
    const data = {
      todayDistanceKm: todayStats.todayDistanceKm,
      todayTrips: todayStats.todayTrips,
      todayCarbonKg: todayStats.todayCarbonKg,
      totalDistanceKm: todayStats.totalDistanceKm,
      totalTrips: todayStats.totalTrips,
      currentLocation: todayStats.currentLocation ? {
        latitude: todayStats.currentLocation.latitude,
        longitude: todayStats.currentLocation.longitude,
        city: todayStats.currentLocation.city,
        area: todayStats.currentLocation.area,
        accuracy: todayStats.currentLocation.accuracy,
        timestamp: todayStats.currentLocation.timestamp,
      } : null,
      lastResetDate,
    };
    await store.setItem(LOCATION_STATS_KEY, JSON.stringify(data));
  } catch {}
}

void loadLocationStats();

function checkMidnightReset() {
  const today = getLocalDate();
  if (lastResetDate !== today) {
    resetDailyStats();
    lastResetDate = today;
  }
}

async function loadLocation() {
  if (!Location) {
    try { Location = require("expo-location"); } catch { Location = null; }
  }
}

function detectModeFromSpeed(speedMs: number | null): TransportMode {
  if (speedMs === null || speedMs < 0) return "walking";
  const speedKmh = speedMs * 3.6;

  if (speedKmh < 5) return "walking";
  if (speedKmh < 15) return "cycling";
  if (speedKmh < 30) return "bike";
  if (speedKmh < 50) return "car";
  if (speedKmh < 80) return "bus";
  return "train";
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

export async function getCurrentLocation(): Promise<CurrentLocation | null> {
  if (Platform.OS === "android") {
    let nativeLoc: LocationPoint | null = null;
    try {
      const raw = await getLastKnownNativeLocation();
      if (raw) nativeLoc = { ...raw, heading: null } as LocationPoint;
    } catch {}
    if (nativeLoc) {
      let city: string | null = null;
      let area: string | null = null;

      try {
        await loadLocation();
        if (Location) {
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: nativeLoc.latitude,
            longitude: nativeLoc.longitude,
          });
          if (reverseGeocode.length > 0) {
            const addr = reverseGeocode[0];
            area = addr.name || addr.street || null;
            city = addr.city || addr.region || null;
          }
        }
      } catch {}

      const current: CurrentLocation = {
        latitude: nativeLoc.latitude,
        longitude: nativeLoc.longitude,
        city,
        area,
        accuracy: nativeLoc.accuracy,
        timestamp: nativeLoc.timestamp,
      };
      todayStats = { ...todayStats, currentLocation: current };
      return current;
    }
  }

  await loadLocation();
  if (!Location) return null;

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });

    let city: string | null = null;
    let area: string | null = null;

    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        area = addr.name || addr.street || null;
        city = addr.city || addr.region || null;
      }
    } catch {}

    const current: CurrentLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city,
      area,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp
    };

    todayStats = { ...todayStats, currentLocation: current };
    lastLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      accuracy: location.coords.accuracy,
      speed: location.coords.speed,
      heading: location.coords.heading,
      timestamp: location.timestamp
    };

    return current;
  } catch {
    return null;
  }
}

export async function startLocationTracking(): Promise<boolean> {
  if (locationTrackingActive) return false;

  if (Platform.OS === "android") {
    try {
      const nativeStarted = await nativeStartTracking();
      if (nativeStarted) {
        locationTrackingActive = true;

        unsubscribeNativeLocation = subscribeToNativeLocationUpdates(
          (event: NativeLocationEvent) => {
            const point: LocationPoint = {
              latitude: event.latitude,
              longitude: event.longitude,
              altitude: event.altitude,
              accuracy: event.accuracy,
              speed: event.speed,
              heading: event.heading,
              timestamp: event.timestamp
            };
            processLocationPoint(point);
          }
        );

        return true;
      }
    } catch {
      // Native tracking unavailable
    }
  }

  await loadLocation();
  if (!Location) return false;

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return false;

    locationWatcherSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 50,
        mayShowUserSettingsDialog: true
      },
      (location: any) => {
        const point: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          accuracy: location.coords.accuracy,
          speed: location.coords.speed,
          heading: location.coords.heading,
          timestamp: location.timestamp
        };

        processLocationPoint(point);
      }
    );

    locationTrackingActive = true;
    return true;
  } catch {
    return false;
  }
}

export function stopLocationTracking() {
  locationTrackingActive = false;
  currentTripStart = null;

  if (Platform.OS === "android") {
    try { nativeStopTracking(); } catch {}
  }

  if (unsubscribeNativeLocation) {
    unsubscribeNativeLocation();
    unsubscribeNativeLocation = null;
  }

  if (locationWatcherSubscription) {
    try { locationWatcherSubscription.remove(); } catch {}
    locationWatcherSubscription = null;
  }
}

function processLocationPoint(point: LocationPoint) {
  checkMidnightReset();

  updateKnownLocation(point.latitude, point.longitude);

  todayStats = {
    ...todayStats,
    currentLocation: {
      latitude: point.latitude,
      longitude: point.longitude,
      city: todayStats.currentLocation?.city ?? null,
      area: todayStats.currentLocation?.area ?? null,
      accuracy: point.accuracy,
      timestamp: point.timestamp
    }
  };

  const now = Date.now();
  if (now - lastReverseGeocodeTime > REVERSE_GEOCODE_INTERVAL_MS) {
    lastReverseGeocodeTime = now;
    loadLocation().then(() => {
      if (!Location) return;
      Location.reverseGeocodeAsync({
        latitude: point.latitude,
        longitude: point.longitude,
      }).then((geocode: any[]) => {
        if (geocode.length > 0) {
          const addr = geocode[0];
          todayStats = {
            ...todayStats,
            currentLocation: {
              ...todayStats.currentLocation!,
              area: (addr.name || addr.street || todayStats.currentLocation?.area) ?? null,
              city: (addr.city || addr.region || todayStats.currentLocation?.city) ?? null,
            }
          };
        }
      }).catch(() => {});
    });
  }

  if (lastLocation) {
    const distanceKm = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      point.latitude,
      point.longitude
    );

    const speedMs = point.speed ?? 0;
    const isMoving = speedMs > STOP_SPEED_MS || distanceKm > 0.01;

    if (isMoving) {
      lastMovementTime = now;
    }

    if (distanceKm > 0.05 && distanceKm < 100) {
      todayStats.todayDistanceKm = Math.round((todayStats.todayDistanceKm + distanceKm) * 100) / 100;
      todayStats.totalDistanceKm = Math.round((todayStats.totalDistanceKm + distanceKm) * 100) / 100;

      const mode = detectModeFromSpeed(point.speed);
      const carbonKg = calculateTransportCarbon(distanceKm, mode);
      todayStats.todayCarbonKg = Math.round((todayStats.todayCarbonKg + carbonKg) * 100) / 100;

      if (!currentTripStart) {
        currentTripStart = point;
        lastMovementTime = now;
        todayStats.todayTrips = todayStats.todayTrips + 1;
        todayStats.totalTrips = todayStats.totalTrips + 1;
      }
    } else if (currentTripStart && !isMoving && (now - lastMovementTime) > STOP_THRESHOLD_MS) {
      currentTripStart = null;
    }
  }

  lastLocation = point;
  void saveLocationStats();
}

export function getLocationStats(): LocationStats {
  checkMidnightReset();
  return {
    todayDistanceKm: todayStats.todayDistanceKm,
    todayTrips: todayStats.todayTrips,
    todayCarbonKg: todayStats.todayCarbonKg,
    totalDistanceKm: todayStats.totalDistanceKm,
    totalTrips: todayStats.totalTrips,
    currentLocation: todayStats.currentLocation ? { ...todayStats.currentLocation } : null
  };
}

export function isLocationTrackingActive(): boolean {
  return locationTrackingActive;
}

export function estimateModeFromDistanceAndTime(distanceKm: number, durationMinutes: number): TransportMode {
  if (durationMinutes <= 0 || distanceKm <= 0) return "walking";

  const speedKmh = (distanceKm / durationMinutes) * 60;

  if (speedKmh < 5) return "walking";
  if (speedKmh < 15) return "cycling";
  if (speedKmh < 30) return "bike";
  if (speedKmh < 50) return "car";
  if (speedKmh < 80) return "bus";
  return "train";
}

export function resetDailyStats() {
  todayStats = {
    todayDistanceKm: 0,
    todayTrips: 0,
    todayCarbonKg: 0,
    totalDistanceKm: todayStats.totalDistanceKm,
    totalTrips: todayStats.totalTrips,
    currentLocation: todayStats.currentLocation
  };
  void saveLocationStats();
}
