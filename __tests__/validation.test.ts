import {
  validateEmail,
  validateOTP,
  validateDistance,
  validateCarbonValue,
  validateCoordinates,
  validateTimestamp,
  validateISOString,
  validatePlatform,
  validateTransportMode,
  validateVehicleType,
  validateOrderEntry,
  validatePagination
} from "../src/utils/validation/validators";

describe("Validators", () => {
  describe("validateEmail", () => {
    it("returns success for valid email", () => {
      const result = validateEmail("user@example.com");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns failure for empty email", () => {
      const result = validateEmail("");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("REQUIRED");
    });

    it("returns failure for invalid format", () => {
      const result = validateEmail("invalid");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_FORMAT");
    });
  });

  describe("validateOTP", () => {
    it("returns success for valid OTP", () => {
      const result = validateOTP("123456");
      expect(result.valid).toBe(true);
    });

    it("returns failure for invalid OTP", () => {
      const result = validateOTP("12345");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_FORMAT");
    });

    it("returns failure for empty OTP", () => {
      const result = validateOTP("");
      expect(result.valid).toBe(false);
    });
  });

  describe("validateDistance", () => {
    it("returns success for valid distance", () => {
      const result = validateDistance(10);
      expect(result.valid).toBe(true);
    });

    it("returns success for zero", () => {
      const result = validateDistance(0);
      expect(result.valid).toBe(true);
    });

    it("returns failure for negative", () => {
      const result = validateDistance(-1);
      expect(result.valid).toBe(false);
    });

    it("returns failure for too large", () => {
      const result = validateDistance(50001);
      expect(result.valid).toBe(false);
    });

    it("returns failure for non-number", () => {
      const result = validateDistance("ten");
      expect(result.valid).toBe(false);
    });
  });

  describe("validateCarbonValue", () => {
    it("returns success for valid value", () => {
      const result = validateCarbonValue(42.5);
      expect(result.valid).toBe(true);
    });

    it("returns failure for negative", () => {
      const result = validateCarbonValue(-1);
      expect(result.valid).toBe(false);
    });

    it("returns failure for too large", () => {
      const result = validateCarbonValue(1000001);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateCoordinates", () => {
    it("returns success for valid coordinates", () => {
      const result = validateCoordinates(19.09, 72.87);
      expect(result.valid).toBe(true);
    });

    it("returns failure for invalid latitude", () => {
      const result = validateCoordinates(91, 72.87);
      expect(result.valid).toBe(false);
    });

    it("returns failure for invalid longitude", () => {
      const result = validateCoordinates(19.09, 181);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateTimestamp", () => {
    it("returns success for valid timestamp", () => {
      const result = validateTimestamp(Date.now());
      expect(result.valid).toBe(true);
    });

    it("returns failure for negative", () => {
      const result = validateTimestamp(-1);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateISOString", () => {
    it("returns success for valid ISO string", () => {
      const result = validateISOString(new Date().toISOString());
      expect(result.valid).toBe(true);
    });

    it("returns failure for invalid string", () => {
      const result = validateISOString("not a date");
      expect(result.valid).toBe(false);
    });
  });

  describe("validatePlatform", () => {
    it("returns success for valid platform", () => {
      const result = validatePlatform("swiggy");
      expect(result.valid).toBe(true);
    });

    it("returns failure for invalid platform", () => {
      const result = validatePlatform("unknown");
      expect(result.valid).toBe(false);
    });
  });

  describe("validateTransportMode", () => {
    it("returns success for valid mode", () => {
      const result = validateTransportMode("car");
      expect(result.valid).toBe(true);
    });

    it("returns failure for invalid mode", () => {
      const result = validateTransportMode("helicopter");
      expect(result.valid).toBe(false);
    });
  });

  describe("validateVehicleType", () => {
    it("returns success for valid type", () => {
      const result = validateVehicleType("ELECTRIC_BIKE");
      expect(result.valid).toBe(true);
    });

    it("returns failure for invalid type", () => {
      const result = validateVehicleType("ROCKET");
      expect(result.valid).toBe(false);
    });
  });

  describe("validateOrderEntry", () => {
    it("returns success for valid entry", () => {
      const result = validateOrderEntry({
        id: "1",
        category: "transport",
        label: "car",
        kgCo2e: 10,
        source: "manual",
        occurredAt: new Date().toISOString()
      });
      expect(result.valid).toBe(true);
    });

    it("returns failure for missing fields", () => {
      const result = validateOrderEntry({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns failure for invalid carbon value", () => {
      const result = validateOrderEntry({
        id: "1",
        category: "transport",
        label: "car",
        kgCo2e: -1,
        source: "manual",
        occurredAt: new Date().toISOString()
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("validatePagination", () => {
    it("returns success for valid pagination", () => {
      const result = validatePagination(1, 10);
      expect(result.valid).toBe(true);
    });

    it("returns failure for zero page", () => {
      const result = validatePagination(0, 10);
      expect(result.valid).toBe(false);
    });

    it("returns failure for too large limit", () => {
      const result = validatePagination(1, 101);
      expect(result.valid).toBe(false);
    });
  });
});
