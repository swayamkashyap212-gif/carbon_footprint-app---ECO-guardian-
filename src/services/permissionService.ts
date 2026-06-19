import { Platform } from "react-native";
import { isNotificationListenerEnabled, openNotificationListenerSettings } from "../native/notificationBridge";
import {
  hasBackgroundLocationPermission as nativeHasBgLocation,
} from "../native/locationBridge";

let Location: any = null;
let Notifications: any = null;

export type PermissionType =
  | "location_foreground"
  | "location_background"
  | "notifications"
  | "notification_listener"
  | "activity_recognition"
  | "battery_optimization";

export type PermissionStatus = "granted" | "denied" | "undetermined" | "unavailable";

export type PermissionInfo = {
  type: PermissionType;
  status: PermissionStatus;
  canRequest: boolean;
  label: string;
  description: string;
  icon: string;
};

export type PermissionsHealth = {
  score: number;
  granted: number;
  total: number;
  permissions: PermissionInfo[];
};

async function loadModules() {
  if (!Location) {
    try { Location = require("expo-location"); } catch { Location = null; }
  }
  if (!Notifications) {
    try { Notifications = require("expo-notifications"); } catch { Notifications = null; }
  }
}

export async function checkPermission(type: PermissionType): Promise<PermissionStatus> {
  await loadModules();

  try {
    switch (type) {
      case "location_foreground": {
        if (!Location) return "unavailable";
        const { status } = await Location.getForegroundPermissionsAsync();
        return status as PermissionStatus;
      }
      case "location_background": {
        if (Platform.OS === "android") {
          try {
            const hasBg = await nativeHasBgLocation();
            if (hasBg) return "granted";
          } catch {}
          if (!Location) return "unavailable";
          const { status } = await Location.getBackgroundPermissionsAsync();
          return status as PermissionStatus;
        }
        if (!Location) return "unavailable";
        const { status } = await Location.getBackgroundPermissionsAsync();
        return status as PermissionStatus;
      }
      case "notifications": {
        if (!Notifications) return "unavailable";
        const { status } = await Notifications.getPermissionsAsync();
        return status as PermissionStatus;
      }
      case "notification_listener": {
        if (Platform.OS !== "android") return "unavailable";
        try {
          const enabled = await isNotificationListenerEnabled();
          return enabled ? "granted" : "denied";
        } catch {
          return "denied";
        }
      }
      case "activity_recognition": {
        if (Platform.OS !== "android") return "unavailable";
        if (!Location) return "unavailable";
        const { status } = await Location.getForegroundPermissionsAsync();
        return status as PermissionStatus;
      }
      case "battery_optimization": {
        if (Platform.OS !== "android") return "unavailable";
        return "granted";
      }
      default:
        return "unavailable";
    }
  } catch {
    return "unavailable";
  }
}

export async function requestPermission(type: PermissionType): Promise<PermissionStatus> {
  await loadModules();

  try {
    switch (type) {
      case "location_foreground": {
        if (!Location) return "unavailable";
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status as PermissionStatus;
      }
      case "location_background": {
        if (!Location) return "unavailable";
        const { status } = await Location.requestBackgroundPermissionsAsync();
        return status as PermissionStatus;
      }
      case "notifications": {
        if (!Notifications) return "unavailable";
        const { status } = await Notifications.requestPermissionsAsync();
        return status as PermissionStatus;
      }
      case "notification_listener": {
        if (Platform.OS !== "android") return "unavailable";
        try {
          const alreadyEnabled = await isNotificationListenerEnabled();
          if (alreadyEnabled) return "granted";
          openNotificationListenerSettings();
          return "undetermined";
        } catch {
          openNotificationListenerSettings();
          return "undetermined";
        }
      }
      case "activity_recognition": {
        if (Platform.OS !== "android") return "unavailable";
        if (!Location) return "unavailable";
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status as PermissionStatus;
      }
      case "battery_optimization": {
        return "granted";
      }
      default:
        return "unavailable";
    }
  } catch {
    return "denied";
  }
}

export async function getPermissionsHealth(): Promise<PermissionsHealth> {
  const types: PermissionType[] = [
    "location_foreground",
    "notifications",
    "activity_recognition"
  ];

  if (Platform.OS === "android") {
    types.push("location_background");
    types.push("notification_listener");
    types.push("battery_optimization");
  }

  const permissions = await Promise.all(
    types.map(async (type) => {
      const status = await checkPermission(type);
      const canRequest = type === "notification_listener" 
        ? status !== "granted"
        : type === "battery_optimization"
        ? false
        : status === "undetermined" || status === "denied";
      return {
        type,
        status,
        canRequest,
        ...getPermissionMeta(type)
      };
    })
  );

  const granted = permissions.filter(p => p.status === "granted").length;
  const total = permissions.length;
  const score = total > 0 ? Math.round((granted / total) * 100) : 0;

  return { score, granted, total, permissions };
}

function getPermissionMeta(type: PermissionType) {
  const meta: Record<PermissionType, { label: string; description: string; icon: string }> = {
    location_foreground: {
      label: "Location Access",
      description: "Required for tracking trips and calculating transport emissions",
      icon: "navigate"
    },
    location_background: {
      label: "Background Location",
      description: "Enables automatic trip detection while app is in background",
      icon: "location"
    },
    notifications: {
      label: "Notifications",
      description: "Receive carbon alerts, delivery updates, and eco nudges",
      icon: "notifications"
    },
    notification_listener: {
      label: "Notification Listener",
      description: "Auto-detect orders from Swiggy, Zomato, Amazon, Flipkart and more",
      icon: "notifications"
    },
    activity_recognition: {
      label: "Activity Recognition",
      description: "Auto-detect walking, cycling, driving, and transit modes",
      icon: "walk"
    },
    battery_optimization: {
      label: "Battery Optimization",
      description: "Exclude from battery optimization for reliable background tracking",
      icon: "battery-charging"
    }
  };
  return meta[type];
}

export function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "#154212" };
  if (score >= 60) return { label: "Good", color: "#486800" };
  if (score >= 40) return { label: "Fair", color: "#b86e00" };
  return { label: "Needs Setup", color: "#ba1a1a" };
}
