import { Platform } from "react-native";
import { ingestCarbonEvent } from "./supabase";

let AsyncStorage: any = null;
let _storageInit: Promise<any> | null = null;

async function initAsyncStorage(): Promise<any> {
  if (AsyncStorage) return AsyncStorage;
  if (_storageInit) return _storageInit;
  _storageInit = (async () => {
    if (Platform.OS === "web") {
      AsyncStorage = {
        getItem: async (key: string) => {
          try { return localStorage.getItem(key); } catch { return null; }
        },
        setItem: async (key: string, value: string) => {
          try { localStorage.setItem(key, value); } catch {}
        },
        removeItem: async (key: string) => {
          try { localStorage.removeItem(key); } catch {}
        },
      };
      return AsyncStorage;
    }
    try {
      AsyncStorage = require("@react-native-async-storage/async-storage").default;
    } catch {
      AsyncStorage = null;
    }
    return AsyncStorage;
  })();
  return _storageInit;
}

const QUEUE_KEY = "ecoguardian.offlineQueue";
const RETRY_KEY = "ecoguardian.syncRetries";
const MAX_RETRIES = 10;

export type OfflineMutation = {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount?: number;
};

export async function enqueueOfflineMutation(name: string, payload: Record<string, unknown>) {
  const store = await initAsyncStorage();
  if (!store) return [];
  try {
    const current = await readOfflineQueue();
    const next = [...current, { id: cryptoSafeId(), name, payload, createdAt: new Date().toISOString() }];
    await store.setItem(QUEUE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export async function readOfflineQueue(): Promise<OfflineMutation[]> {
  const store = await initAsyncStorage();
  if (!store) return [];
  try {
    const raw = await store.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
  } catch {
    return [];
  }
}

export async function clearOfflineQueue() {
  const store = await initAsyncStorage();
  if (!store) return;
  try {
    await store.removeItem(QUEUE_KEY);
  } catch {}
}

function cryptoSafeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function syncOfflineQueue(token: string): Promise<boolean> {
  const queue = await readOfflineQueue();
  if (queue.length === 0) return true;

  const failed: OfflineMutation[] = [];

  for (const item of queue) {
    if ((item.retryCount || 0) >= MAX_RETRIES) {
      console.warn(`[OfflineQueue] Dropping permanently failed mutation: ${item.name} (id: ${item.id})`);
      continue;
    }
    try {
      if (item.name === "ingestCarbonEvent") {
        const p = item.payload as { category: string; label: string; kg_co2e: number; source: string; occurred_at?: string; metadata?: Record<string, unknown> };
        await ingestCarbonEvent(p);
      } else {
        // Unknown mutation type - drop it
      }
    } catch (error) {
      failed.push({ ...item, retryCount: (item.retryCount || 0) + 1 });
    }
  }

  if (failed.length === 0) {
    await clearOfflineQueue();
    return true;
  } else {
    const store = await initAsyncStorage();
    if (store) {
      try { await store.setItem(QUEUE_KEY, JSON.stringify(failed)); } catch {}
    }
    return false;
  }
}
