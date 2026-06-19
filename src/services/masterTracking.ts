import { Platform } from "react-native";
import { startLocationTracking, stopLocationTracking, isLocationTrackingActive } from "./locationService";
import { initializeNotifications, cleanupNativeListener, isNativeNotificationListenerActive } from "./notifications";
import { startHealthCheck, stopHealthCheck } from "./trackingEngine";
import { checkPermission, requestPermission } from "./permissionService";
import { syncTrackingPreferencesToNative } from "../native/locationBridge";

let _asyncStorage: any = null;
async function getStorage(): Promise<any> {
  if (_asyncStorage) return _asyncStorage;
  try {
    _asyncStorage = require("@react-native-async-storage/async-storage").default;
    return _asyncStorage;
  } catch {
    return null;
  }
}

const MASTER_KEY = "ecoguardian.masterTrackingEnabled";
const TRACKING_PREFS_KEY = "ecoguardian.trackingPrefs";

export type TrackingPreferences = {
  masterEnabled: boolean;
  locationEnabled: boolean;
  notificationEnabled: boolean;
  backgroundEnabled: boolean;
  deliveryEnabled: boolean;
  flightEnabled: boolean;
  aiEnabled: boolean;
};

const defaultPrefs: TrackingPreferences = {
  masterEnabled: true,
  locationEnabled: true,
  notificationEnabled: true,
  backgroundEnabled: true,
  deliveryEnabled: true,
  flightEnabled: true,
  aiEnabled: true,
};

let _listeners: ((prefs: TrackingPreferences) => void)[] = [];
let _currentPrefs: TrackingPreferences = { ...defaultPrefs };

export async function loadTrackingPreferences(): Promise<TrackingPreferences> {
  try {
    const store = await getStorage();
    if (!store) return _currentPrefs;
    const raw = await store.getItem(TRACKING_PREFS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      _currentPrefs = { ...defaultPrefs, ...saved };
    }
  } catch {}

  if (Platform.OS === "android") {
    try {
      await syncTrackingPreferencesToNative({
        tracking_enabled: _currentPrefs.masterEnabled,
        location_enabled: _currentPrefs.locationEnabled,
        notification_enabled: _currentPrefs.notificationEnabled,
        background_enabled: _currentPrefs.backgroundEnabled,
        delivery_enabled: _currentPrefs.deliveryEnabled,
        flight_enabled: _currentPrefs.flightEnabled,
        ai_enabled: _currentPrefs.aiEnabled,
      });
    } catch {}
  }

  return _currentPrefs;
}

export async function saveTrackingPreferences(prefs: TrackingPreferences): Promise<void> {
  _currentPrefs = prefs;
  try {
    const store = await getStorage();
    if (store) {
      await store.setItem(TRACKING_PREFS_KEY, JSON.stringify(prefs));
    }
  } catch {}

  if (Platform.OS === "android") {
    try {
      await syncTrackingPreferencesToNative({
        tracking_enabled: prefs.masterEnabled,
        location_enabled: prefs.locationEnabled,
        notification_enabled: prefs.notificationEnabled,
        background_enabled: prefs.backgroundEnabled,
        delivery_enabled: prefs.deliveryEnabled,
        flight_enabled: prefs.flightEnabled,
        ai_enabled: prefs.aiEnabled,
      });
    } catch {}
  }

  _listeners.forEach((l) => {
    try { l(prefs); } catch {}
  });
}

export function getTrackingPreferences(): TrackingPreferences {
  return { ..._currentPrefs };
}

export function onTrackingPreferencesChange(listener: (prefs: TrackingPreferences) => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

export async function setMasterTracking(enabled: boolean): Promise<void> {
  const prefs = { ..._currentPrefs, masterEnabled: enabled };
  await saveTrackingPreferences(prefs);

  if (enabled) {
    await startAllTracking(prefs);
  } else {
    await stopAllTracking();
  }
}

export async function setModuleTracking(module: keyof TrackingPreferences, enabled: boolean): Promise<void> {
  const prefs = { ..._currentPrefs, [module]: enabled };
  await saveTrackingPreferences(prefs);

  if (!prefs.masterEnabled) return;

  if (module === "locationEnabled" || module === "backgroundEnabled") {
    if (enabled) {
      const locStatus = await checkPermission("location_foreground");
      if (locStatus === "granted") {
        if (prefs.backgroundEnabled) {
          const bgStatus = await checkPermission("location_background");
          if (bgStatus !== "granted") {
            await requestPermission("location_background");
          }
        }
        await startLocationTracking();
      }
    } else if (!prefs.locationEnabled && !prefs.backgroundEnabled) {
      stopLocationTracking();
    }
  }

  if (module === "notificationEnabled") {
    if (enabled) {
      await initializeNotifications();
    } else {
      cleanupNativeListener();
    }
  }
}

export async function startAllTracking(prefs?: TrackingPreferences): Promise<void> {
  const p = prefs || _currentPrefs;
  if (!p.masterEnabled) return;

  if (p.notificationEnabled) {
    try { await initializeNotifications(); } catch {}
  }

  if (p.locationEnabled || p.backgroundEnabled) {
    try {
      const locStatus = await checkPermission("location_foreground");
      if (locStatus === "granted") {
        if (p.backgroundEnabled) {
          const bgStatus = await checkPermission("location_background");
          if (bgStatus !== "granted") {
            try { await requestPermission("location_background"); } catch {}
          }
        }
        await startLocationTracking();
      }
    } catch {}
  }

  startHealthCheck(30000);
}

export async function stopAllTracking(): Promise<void> {
  stopLocationTracking();
  cleanupNativeListener();
  stopHealthCheck();
}

export function getTrackingSummary(): {
  master: boolean;
  modules: { key: keyof TrackingPreferences; label: string; icon: string; active: boolean }[];
} {
  const p = _currentPrefs;
  const locationActive = isLocationTrackingActive();
  const notificationActive = isNativeNotificationListenerActive();

  return {
    master: p.masterEnabled,
    modules: [
      { key: "locationEnabled", label: "Location Tracking", icon: "location", active: p.masterEnabled && p.locationEnabled && locationActive },
      { key: "notificationEnabled", label: "Notification Monitor", icon: "notifications", active: p.masterEnabled && p.notificationEnabled && notificationActive },
      { key: "backgroundEnabled", label: "Background Service", icon: "cellular", active: p.masterEnabled && p.backgroundEnabled && locationActive },
      { key: "deliveryEnabled", label: "Delivery Tracking", icon: "bag", active: p.masterEnabled && p.deliveryEnabled && notificationActive },
      { key: "flightEnabled", label: "Flight Tracking", icon: "airplane", active: p.masterEnabled && p.flightEnabled },
      { key: "aiEnabled", label: "AI Engine", icon: "sparkles", active: p.masterEnabled && p.aiEnabled },
    ],
  };
}
