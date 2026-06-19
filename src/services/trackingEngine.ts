import { Platform } from "react-native";
import { isLocationTrackingActive, getCurrentLocation, LocationStats, getLocationStats } from "./locationService";
import { isNotificationsInitialized, isNativeNotificationListenerActive, checkNativeListenerStatus } from "./notifications";
import { isSupabaseConfigured } from "./supabase";

export type TrackingModule = {
  id: string;
  name: string;
  status: "online" | "offline" | "error";
  label: string;
  lastUpdate: string;
  icon: string;
};

export type TrackingStatus = {
  overallStatus: "online" | "offline" | "degraded";
  modules: TrackingModule[];
  lastHealthCheck: string;
};

let _trackingStatusListeners: ((status: TrackingStatus) => void)[] = [];
let _healthCheckInterval: ReturnType<typeof setInterval> | null = null;
let _cachedNotificationActive = false;
let _backendReachable = isSupabaseConfigured;

export function setBackendReachable(reachable: boolean): void {
  _backendReachable = reachable;
}

export function getTrackingStatus(): TrackingStatus {
  const now = new Date().toISOString();
  const locationActive = isLocationTrackingActive();
  const notificationActive = _cachedNotificationActive || isNativeNotificationListenerActive();

  const aiStatus = "online";
  const aiLabel = "ACTIVE";

  const modules: TrackingModule[] = [
    {
      id: "location",
      name: "Location Tracking",
      status: locationActive ? "online" : "offline",
      label: locationActive ? "ACTIVE" : "INACTIVE",
      lastUpdate: now,
      icon: "location"
    },
    {
      id: "notifications",
      name: "Notification Monitoring",
      status: notificationActive ? "online" : "offline",
      label: notificationActive ? "ACTIVE" : "INACTIVE",
      lastUpdate: now,
      icon: "notifications"
    },
    {
      id: "ai",
      name: "AI Monitoring",
      status: "online",
      label: "ACTIVE",
      lastUpdate: now,
      icon: "sparkles"
    },
    {
      id: "flight",
      name: "Flight Tracking",
      status: "online",
      label: "ACTIVE",
      lastUpdate: now,
      icon: "airplane"
    },
    {
      id: "delivery",
      name: "Order Monitoring",
      status: notificationActive ? "online" : "offline",
      label: notificationActive ? "ACTIVE" : "INACTIVE",
      lastUpdate: now,
      icon: "bag"
    },
    {
      id: "background",
      name: "Background Tracking",
      status: locationActive ? "online" : "offline",
      label: locationActive ? "ACTIVE" : "INACTIVE",
      lastUpdate: now,
      icon: "cellular"
    }
  ];

  const onlineCount = modules.filter(m => m.status === "online").length;
  const overallStatus: TrackingStatus["overallStatus"] =
    onlineCount === modules.length ? "online" :
    onlineCount > modules.length / 2 ? "degraded" : "offline";

  return {
    overallStatus,
    modules,
    lastHealthCheck: now
  };
}

export function startHealthCheck(intervalMs = 10000): void {
  if (_healthCheckInterval) return;

  _healthCheckInterval = setInterval(async () => {
    try {
      const enabled = await checkNativeListenerStatus();
      _cachedNotificationActive = enabled;
    } catch {}

    const status = getTrackingStatus();
    _trackingStatusListeners.forEach(listener => {
      try { listener(status); } catch {}
    });
  }, intervalMs);
}

export function stopHealthCheck(): void {
  if (_healthCheckInterval) {
    clearInterval(_healthCheckInterval);
    _healthCheckInterval = null;
  }
}

export function onTrackingStatusChange(listener: (status: TrackingStatus) => void): () => void {
  _trackingStatusListeners.push(listener);
  return () => {
    _trackingStatusListeners = _trackingStatusListeners.filter(l => l !== listener);
  };
}
