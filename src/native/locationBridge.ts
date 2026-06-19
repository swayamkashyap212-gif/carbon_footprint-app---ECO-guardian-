import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const EcoGuardianLocationBridge = NativeModules?.EcoGuardianLocationBridge;

export type NativeLocationEvent = {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: number;
  altitude: number;
};

const emitter = EcoGuardianLocationBridge
  ? new NativeEventEmitter(EcoGuardianLocationBridge)
  : null;

let locationSubscriptions: (() => void)[] = [];
let statusSubscriptions: (() => void)[] = [];

export async function hasLocationPermission(): Promise<boolean> {
  if (!EcoGuardianLocationBridge || Platform.OS !== "android") return false;
  try {
    return await EcoGuardianLocationBridge.hasLocationPermission();
  } catch {
    return false;
  }
}

export async function hasBackgroundLocationPermission(): Promise<boolean> {
  if (!EcoGuardianLocationBridge || Platform.OS !== "android") return false;
  try {
    return await EcoGuardianLocationBridge.hasBackgroundLocationPermission();
  } catch {
    return false;
  }
}

export async function startBackgroundLocationTracking(): Promise<boolean> {
  if (!EcoGuardianLocationBridge || Platform.OS !== "android") return false;
  try {
    return await EcoGuardianLocationBridge.startBackgroundLocationTracking();
  } catch {
    return false;
  }
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  if (!EcoGuardianLocationBridge || Platform.OS !== "android") return;
  try {
    await EcoGuardianLocationBridge.stopBackgroundLocationTracking();
  } catch {}
}

export async function isNativeTrackingActive(): Promise<boolean> {
  if (!EcoGuardianLocationBridge || Platform.OS !== "android") return false;
  try {
    return await EcoGuardianLocationBridge.isTrackingActive();
  } catch {
    return false;
  }
}

export async function getLastKnownNativeLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  timestamp: number;
  altitude: number;
} | null> {
  if (!EcoGuardianLocationBridge || Platform.OS !== "android") return null;
  try {
    return await EcoGuardianLocationBridge.getLastKnownLocation();
  } catch {
    return null;
  }
}

export function subscribeToNativeLocationUpdates(
  onLocation: (event: NativeLocationEvent) => void
): () => void {
  if (!emitter) return () => {};

  let sub: any = null;
  try {
    sub = emitter.addListener(
      "EcoGuardianLocationUpdate",
      (event: NativeLocationEvent) => {
        try {
          onLocation(event);
        } catch {}
      }
    );
  } catch {}

  const cleanup = () => {
    try { sub?.remove(); } catch {}
    locationSubscriptions = locationSubscriptions.filter(s => s !== cleanup);
  };
  locationSubscriptions.push(cleanup);
  return cleanup;
}

export function subscribeToLocationStatus(
  onStatusChanged: (active: boolean) => void
): () => void {
  if (!emitter) return () => {};

  let sub: any = null;
  try {
    sub = emitter.addListener(
      "EcoGuardianLocationStatusChanged",
      (event: { active: boolean }) => {
        try {
          onStatusChanged(event.active);
        } catch {}
      }
    );
  } catch {}

  const cleanup = () => {
    try { sub?.remove(); } catch {}
    statusSubscriptions = statusSubscriptions.filter(s => s !== cleanup);
  };
  statusSubscriptions.push(cleanup);
  return cleanup;
}

export function cleanupAllLocationSubscriptions(): void {
  locationSubscriptions.forEach(s => { try { s(); } catch {} });
  statusSubscriptions.forEach(s => { try { s(); } catch {} });
  locationSubscriptions = [];
  statusSubscriptions = [];
}

export async function syncTrackingPreferencesToNative(prefs: Record<string, boolean>): Promise<boolean> {
  if (!EcoGuardianLocationBridge || Platform.OS !== "android") return false;
  try {
    return await EcoGuardianLocationBridge.syncTrackingPreferences(JSON.stringify(prefs));
  } catch {
    return false;
  }
}
