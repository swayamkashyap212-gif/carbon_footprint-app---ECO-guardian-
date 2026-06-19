import { Platform } from "react-native";

let _asyncStorage: any | null = null;

const TRACKING_ENABLED_KEY = "ecoguardian.trackingEnabled";

async function getStorage(): Promise<any | null> {
  if (_asyncStorage) return _asyncStorage;
  if (Platform.OS === "web") return null;
  try {
    _asyncStorage = require("@react-native-async-storage/async-storage").default;
    return _asyncStorage;
  } catch {
    return null;
  }
}

export async function getTrackingEnabled(): Promise<boolean> {
  const store = await getStorage();
  if (!store) return true; // Default to enabled
  try {
    const value = await store.getItem(TRACKING_ENABLED_KEY);
    if (value === null) return true; // Default enabled for new users
    return value === "true";
  } catch {
    return true;
  }
}

export async function setTrackingEnabled(enabled: boolean): Promise<void> {
  const store = await getStorage();
  if (!store) return;
  try {
    await store.setItem(TRACKING_ENABLED_KEY, enabled ? "true" : "false");
  } catch {}
}

export async function toggleTracking(): Promise<boolean> {
  const current = await getTrackingEnabled();
  const next = !current;
  await setTrackingEnabled(next);
  return next;
}
