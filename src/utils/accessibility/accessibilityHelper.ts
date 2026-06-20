import { AccessibilityInfo, Platform } from "react-native";

export class AccessibilityHelper {
  static async isScreenReaderEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch {
      return false;
    }
  }

  static async isReduceMotionEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isReduceMotionEnabled();
    } catch {
      return false;
    }
  }

  static async isBoldTextEnabled(): Promise<boolean> {
    if (Platform.OS !== "ios") return false;
    try {
      return await AccessibilityInfo.isBoldTextEnabled();
    } catch {
      return false;
    }
  }

  static async isGrayscaleEnabled(): Promise<boolean> {
    if (Platform.OS !== "ios") return false;
    try {
      return await AccessibilityInfo.isGrayscaleEnabled();
    } catch {
      return false;
    }
  }

  static async isInvertColorsEnabled(): Promise<boolean> {
    if (Platform.OS !== "ios") return false;
    try {
      return await AccessibilityInfo.isInvertColorsEnabled();
    } catch {
      return false;
    }
  }

  static announceForAccessibility(message: string): void {
    AccessibilityInfo.announceForAccessibility(message);
  }

  static setAccessibilityFocus(reactTag: number): void {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
}

export class AccessibilityLabels {
  static carbonEmission(value: number, unit = "kg CO2e"): string {
    return `Carbon emission: ${value} ${unit}`;
  }

  static sustainabilityScore(score: number, level: string): string {
    return `Sustainability score: ${score} percent. Level: ${level}`;
  }

  static tripInfo(mode: string, distance: number, carbon: number): string {
    return `Trip by ${mode}. Distance: ${distance} kilometers. Carbon: ${carbon} kilograms CO2e`;
  }

  static deliveryInfo(platform: string, status: string, carbon?: number): string {
    const carbonText = carbon ? ` Carbon: ${carbon} kilograms.` : "";
    return `${platform} delivery. Status: ${status}.${carbonText}`;
  }

  static streakInfo(type: string, count: number): string {
    return `${type.replace(/_/g, " ")} streak: ${count} days`;
  }

  static challengeInfo(title: string, progress: number, target: number): string {
    return `Challenge: ${title}. Progress: ${progress} of ${target}`;
  }

  static permissionStatus(name: string, granted: boolean): string {
    return `${name} permission: ${granted ? "Granted" : "Not granted"}`;
  }

  static trackingStatus(module: string, active: boolean): string {
    return `${module} tracking: ${active ? "Active" : "Inactive"}`;
  }

  static alertInfo(severity: string, title: string): string {
    return `${severity} alert: ${title}`;
  }

  static weeklyTrend(data: { day: string; kg: number }[]): string {
    return data.map(d => `${d.day}: ${d.kg} kilograms`).join(". ");
  }

  static buttonAction(action: string): string {
    return `Double tap to ${action}`;
  }

  static navigationDestination(destination: string): string {
    return `Navigate to ${destination}`;
  }
}

export class AccessibilityRoles {
  static readonly BUTTON = "button";
  static readonly LINK = "link";
  static readonly TEXT = "text";
  static readonly IMAGE = "image";
  static readonly HEADER = "header";
  static readonly SUMMARY = "summary";
  static readonly PROGRESSBAR = "progressbar";
  static readonly TAB = "tab";
  static readonly TABLIST = "tablist";
  static readonly SWITCH = "switch";
  static readonly CHECKBOX = "checkbox";
  static readonly RADIO = "radio";
  static readonly ADJUSTABLE = "adjustable";
  static readonly ALERT = "alert";
  static readonly MENU = "menu";
  static readonly MENUITEM = "menuitem";
  static readonly NONE = "none";
}

export class AccessibilityHints {
  static readonly DOUBLE_TAP = "Double tap to activate";
  static readonly SWIPE = "Swipe to navigate";
  static readonly SCROLL = "Scroll for more content";
  static readonly LONG_PRESS = "Long press for options";
  static readonly ACTIVATE = "Double tap to activate";
  static readonly DEACTIVATE = "Double tap to deactivate";
  static readonly EXPAND = "Double tap to expand";
  static readonly COLLAPSE = "Double tap to collapse";
  static readonly DISMISS = "Double tap to dismiss";
  static readonly REFRESH = "Double tap to refresh";
}

export const ACCESSIBILITY_CONSTANTS = {
  MIN_TOUCH_TARGET: 48,
  MIN_FONT_SIZE: 12,
  MAX_FONT_SCALE: 2.0,
  CONTRAST_RATIO_AA: 4.5,
  CONTRAST_RATIO_AAA: 7,
} as const;
