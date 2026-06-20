import { InputValidator } from "../security/inputValidator";

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ValidationResult {
  constructor(
    public valid: boolean,
    public errors: ValidationError[] = []
  ) {}

  get firstError(): ValidationError | undefined {
    return this.errors[0];
  }

  get errorMessages(): string[] {
    return this.errors.map(e => e.message);
  }

  static success(): ValidationResult {
    return new ValidationResult(true);
  }

  static failure(errors: ValidationError[]): ValidationResult {
    return new ValidationResult(false, errors);
  }
}

export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return ValidationResult.failure([
      new ValidationError("Email is required", "email", "REQUIRED")
    ]);
  }

  if (!InputValidator.isValidEmail(email)) {
    return ValidationResult.failure([
      new ValidationError("Invalid email format", "email", "INVALID_FORMAT")
    ]);
  }

  return ValidationResult.success();
}

export function validateOTP(otp: string): ValidationResult {
  if (!otp || typeof otp !== "string") {
    return ValidationResult.failure([
      new ValidationError("OTP is required", "otp", "REQUIRED")
    ]);
  }

  if (!InputValidator.isValidOTP(otp)) {
    return ValidationResult.failure([
      new ValidationError("OTP must be 6 digits", "otp", "INVALID_FORMAT")
    ]);
  }

  return ValidationResult.success();
}

export function validateDistance(distance: unknown): ValidationResult {
  if (!InputValidator.isNonNegativeNumber(distance)) {
    return ValidationResult.failure([
      new ValidationError("Distance must be a non-negative number", "distance", "INVALID_TYPE")
    ]);
  }

  if ((distance as number) > 50000) {
    return ValidationResult.failure([
      new ValidationError("Distance exceeds maximum allowed value", "distance", "OUT_OF_RANGE")
    ]);
  }

  return ValidationResult.success();
}

export function validateCarbonValue(value: unknown): ValidationResult {
  if (!InputValidator.isNonNegativeNumber(value)) {
    return ValidationResult.failure([
      new ValidationError("Carbon value must be a non-negative number", "carbon", "INVALID_TYPE")
    ]);
  }

  if ((value as number) > 1000000) {
    return ValidationResult.failure([
      new ValidationError("Carbon value exceeds maximum allowed value", "carbon", "OUT_OF_RANGE")
    ]);
  }

  return ValidationResult.success();
}

export function validateCoordinates(lat: unknown, lng: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!InputValidator.isValidLatitude(lat)) {
    errors.push(new ValidationError("Invalid latitude", "latitude", "INVALID_RANGE"));
  }

  if (!InputValidator.isValidLongitude(lng)) {
    errors.push(new ValidationError("Invalid longitude", "longitude", "INVALID_RANGE"));
  }

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

export function validateTimestamp(timestamp: unknown): ValidationResult {
  if (!InputValidator.isValidTimestamp(timestamp)) {
    return ValidationResult.failure([
      new ValidationError("Invalid timestamp", "timestamp", "INVALID_VALUE")
    ]);
  }

  return ValidationResult.success();
}

export function validateISOString(str: unknown): ValidationResult {
  if (!InputValidator.isValidISOString(str)) {
    return ValidationResult.failure([
      new ValidationError("Invalid ISO string format", "date", "INVALID_FORMAT")
    ]);
  }

  return ValidationResult.success();
}

export function validatePlatform(platform: unknown): ValidationResult {
  if (typeof platform !== "string" || !InputValidator.isValidPlatform(platform)) {
    return ValidationResult.failure([
      new ValidationError("Invalid platform", "platform", "INVALID_VALUE")
    ]);
  }

  return ValidationResult.success();
}

export function validateTransportMode(mode: unknown): ValidationResult {
  if (typeof mode !== "string" || !InputValidator.isValidTransportMode(mode)) {
    return ValidationResult.failure([
      new ValidationError("Invalid transport mode", "mode", "INVALID_VALUE")
    ]);
  }

  return ValidationResult.success();
}

export function validateVehicleType(type: unknown): ValidationResult {
  if (typeof type !== "string" || !InputValidator.isValidVehicleType(type)) {
    return ValidationResult.failure([
      new ValidationError("Invalid vehicle type", "vehicleType", "INVALID_VALUE")
    ]);
  }

  return ValidationResult.success();
}

export function validateOrderEntry(entry: {
  id?: unknown;
  category?: unknown;
  label?: unknown;
  kgCo2e?: unknown;
  source?: unknown;
  occurredAt?: unknown;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!entry.id || typeof entry.id !== "string") {
    errors.push(new ValidationError("Entry ID is required", "id", "REQUIRED"));
  }

  if (!entry.category || typeof entry.category !== "string") {
    errors.push(new ValidationError("Category is required", "category", "REQUIRED"));
  }

  if (!entry.label || typeof entry.label !== "string") {
    errors.push(new ValidationError("Label is required", "label", "REQUIRED"));
  }

  if (!InputValidator.isNonNegativeNumber(entry.kgCo2e)) {
    errors.push(new ValidationError("Carbon value must be a non-negative number", "kgCo2e", "INVALID_TYPE"));
  }

  if (!entry.source || typeof entry.source !== "string") {
    errors.push(new ValidationError("Source is required", "source", "REQUIRED"));
  }

  if (!InputValidator.isValidISOString(entry.occurredAt)) {
    errors.push(new ValidationError("Invalid date", "occurredAt", "INVALID_FORMAT"));
  }

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

export function validatePagination(page: unknown, limit: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!InputValidator.isPositiveNumber(page)) {
    errors.push(new ValidationError("Page must be a positive number", "page", "INVALID_TYPE"));
  }

  if (!InputValidator.isPositiveNumber(limit)) {
    errors.push(new ValidationError("Limit must be a positive number", "limit", "INVALID_TYPE"));
  }

  if (InputValidator.isPositiveNumber(limit) && (limit as number) > 100) {
    errors.push(new ValidationError("Limit cannot exceed 100", "limit", "OUT_OF_RANGE"));
  }

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}
