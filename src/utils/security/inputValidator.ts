import { Platform } from "react-native";

export class InputValidator {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim().toLowerCase());
  }

  static isValidOTP(otp: string): boolean {
    return /^\d{6}$/.test(otp.trim());
  }

  static isValidNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && !Number.isNaN(value);
  }

  static isPositiveNumber(value: unknown): value is number {
    return this.isValidNumber(value) && (value as number) > 0;
  }

  static isNonNegativeNumber(value: unknown): value is number {
    return this.isValidNumber(value) && (value as number) >= 0;
  }

  static isValidLatitude(lat: unknown): lat is number {
    return this.isValidNumber(lat) && (lat as number) >= -90 && (lat as number) <= 90;
  }

  static isValidLongitude(lng: unknown): lng is number {
    return this.isValidNumber(lng) && (lng as number) >= -180 && (lng as number) <= 180;
  }

  static isValidDistance(km: unknown): km is number {
    return this.isNonNegativeNumber(km) && (km as number) <= 50000;
  }

  static isValidDuration(minutes: unknown): minutes is number {
    return this.isNonNegativeNumber(minutes) && (minutes as number) <= 1440;
  }

  static isValidTimestamp(ts: unknown): ts is number {
    return this.isValidNumber(ts) && (ts as number) > 0 && (ts as number) <= Date.now() + 86400000;
  }

  static isValidISOString(str: unknown): str is string {
    if (typeof str !== "string") return false;
    try {
      const date = new Date(str);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "")
      .trim();
  }

  static isValidPackageName(pkg: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9._]*$/.test(pkg);
  }

  static isValidOrderId(orderId: string): boolean {
    return /^[a-zA-Z0-9\-_]{1,50}$/.test(orderId);
  }

  static isValidPlatform(platform: string): boolean {
    const validPlatforms = [
      "swiggy", "zomato", "blinkit", "zepto", "instamart", "bigbasket",
      "amazon", "flipkart", "porter", "uber", "ola", "rapido", "other"
    ];
    return validPlatforms.includes(platform.toLowerCase());
  }

  static isValidTransportMode(mode: string): boolean {
    const validModes = ["walking", "cycling", "bike", "car", "bus", "metro", "train", "flight"];
    return validModes.includes(mode.toLowerCase());
  }

  static isValidVehicleType(type: string): boolean {
    const validTypes = [
      "ELECTRIC_BIKE", "PETROL_BIKE", "SCOOTER", "EV_CAR", "PETROL_CAR",
      "DIESEL_CAR", "CYCLE", "WALKING", "VAN", "AUTO_RICKSHAW", "UNKNOWN"
    ];
    return validTypes.includes(type.toUpperCase());
  }
}

export class OutputSanitizer {
  static sanitizeForDisplay(value: unknown): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return str.replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "&": "&amp;",
      };
      return entities[char] || char;
    });
  }

  static sanitizeNumber(value: unknown, decimals = 2): number {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  static sanitizeKgCo2e(value: unknown): number {
    const num = this.sanitizeNumber(value, 2);
    return Math.max(0, Math.min(num, 1000000));
  }

  static sanitizePercentage(value: unknown): number {
    const num = this.sanitizeNumber(value, 0);
    return Math.max(0, Math.min(100, num));
  }

  static sanitizeDistance(value: unknown): number {
    const num = this.sanitizeNumber(value, 2);
    return Math.max(0, Math.min(num, 50000));
  }

  static sanitizeDuration(value: unknown): number {
    const num = this.sanitizeNumber(value, 0);
    return Math.max(0, Math.min(num, 1440));
  }
}

export class RateLimiter {
  private static attempts: Map<string, { count: number; resetTime: number }> = new Map();

  static check(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  static reset(key: string): void {
    this.attempts.delete(key);
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

export class SecureLogger {
  private static isProduction = __DEV__ === false;

  static log(message: string, data?: unknown): void {
    if (this.isProduction) return;
    console.log(`[EcoGuardian] ${message}`, data || "");
  }

  static warn(message: string, data?: unknown): void {
    if (this.isProduction) return;
    console.warn(`[EcoGuardian] ${message}`, data || "");
  }

  static error(message: string, error?: unknown): void {
    if (this.isProduction) {
      this.reportError(message, error);
      return;
    }
    console.error(`[EcoGuardian] ${message}`, error || "");
  }

  private static reportError(message: string, error?: unknown): void {
    const sanitizedMessage = message.replace(/[\n\r]/g, " ").slice(0, 500);
    const sanitizedError = error instanceof Error ? error.message : String(error).slice(0, 500);
    console.error(`[EcoGuardian Error] ${sanitizedMessage}: ${sanitizedError}`);
  }

  static sanitizeLogData(data: unknown): unknown {
    if (typeof data === "string") {
      return data.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
        .replace(/\b\d{6}\b/g, "[OTP]")
        .replace(/token["\s]*[:=]["\s]*[^"\s,}]+/gi, 'token":"[REDACTED]');
    }
    return data;
  }
}
