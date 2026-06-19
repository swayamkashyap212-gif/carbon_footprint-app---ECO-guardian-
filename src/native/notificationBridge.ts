import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const EcoGuardianNotificationBridge = NativeModules?.EcoGuardianNotificationBridge;

export type NativeNotificationEvent = {
  packageName: string;
  title: string;
  body: string;
  timestamp: number;
};

const emitter = EcoGuardianNotificationBridge
  ? new NativeEventEmitter(EcoGuardianNotificationBridge)
  : null;

let notificationSubscriptions: (() => void)[] = [];
let statusSubscriptions: (() => void)[] = [];

export async function isNotificationListenerEnabled(): Promise<boolean> {
  if (!EcoGuardianNotificationBridge || Platform.OS !== "android") return false;
  try {
    return await EcoGuardianNotificationBridge.isNotificationListenerEnabled();
  } catch {
    return false;
  }
}

export function openNotificationListenerSettings(): void {
  if (!EcoGuardianNotificationBridge || Platform.OS !== "android") return;
  try {
    EcoGuardianNotificationBridge.openNotificationListenerSettings();
  } catch {}
}

export async function drainQueuedNotifications(): Promise<NativeNotificationEvent[]> {
  if (!EcoGuardianNotificationBridge || Platform.OS !== "android") return [];
  try {
    const queue = await EcoGuardianNotificationBridge.drainQueuedNotifications();
    if (!Array.isArray(queue)) return [];
    return queue.map((item: any) => ({
      packageName: item.packageName || "",
      title: item.title || "",
      body: item.body || "",
      timestamp: Number(item.timestamp) || Date.now(),
    }));
  } catch {
    return [];
  }
}

export function subscribeToNativeNotifications(
  onNotification: (event: NativeNotificationEvent) => void
): () => void {
  if (!emitter) return () => {};

  let sub: any = null;
  try {
    sub = emitter.addListener(
      "EcoGuardianNotificationReceived",
      (event: NativeNotificationEvent) => {
        try {
          onNotification(event);
        } catch {}
      }
    );
  } catch {}

  const cleanup = () => {
    try { sub?.remove(); } catch {}
    notificationSubscriptions = notificationSubscriptions.filter(s => s !== cleanup);
  };
  notificationSubscriptions.push(cleanup);
  return cleanup;
}

export function subscribeToListenerStatus(
  onStatusChanged: (enabled: boolean) => void
): () => void {
  if (!emitter) return () => {};

  let sub: any = null;
  try {
    sub = emitter.addListener(
      "EcoGuardianNotificationListenerStatusChanged",
      (event: { enabled: boolean }) => {
        try {
          onStatusChanged(event.enabled);
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

export function cleanupAllNotificationSubscriptions(): void {
  notificationSubscriptions.forEach(s => { try { s(); } catch {} });
  statusSubscriptions.forEach(s => { try { s(); } catch {} });
  notificationSubscriptions = [];
  statusSubscriptions = [];
}
