import { InputValidator, OutputSanitizer, RateLimiter } from "../src/utils/security/inputValidator";

describe("InputValidator", () => {
  describe("isValidEmail", () => {
    it("returns true for valid email", () => {
      expect(InputValidator.isValidEmail("user@example.com")).toBe(true);
    });

    it("returns true for email with subdomain", () => {
      expect(InputValidator.isValidEmail("user@mail.example.com")).toBe(true);
    });

    it("returns false for email without @", () => {
      expect(InputValidator.isValidEmail("userexample.com")).toBe(false);
    });

    it("returns false for email without domain", () => {
      expect(InputValidator.isValidEmail("user@")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(InputValidator.isValidEmail("")).toBe(false);
    });

    it("returns false for email with spaces", () => {
      expect(InputValidator.isValidEmail("user @example.com")).toBe(false);
    });

    it("handles email with dots in local part", () => {
      expect(InputValidator.isValidEmail("user.name@example.com")).toBe(true);
    });

    it("handles email with plus in local part", () => {
      expect(InputValidator.isValidEmail("user+tag@example.com")).toBe(true);
    });
  });

  describe("isValidOTP", () => {
    it("returns true for valid 6-digit OTP", () => {
      expect(InputValidator.isValidOTP("123456")).toBe(true);
    });

    it("returns false for OTP with less than 6 digits", () => {
      expect(InputValidator.isValidOTP("12345")).toBe(false);
    });

    it("returns false for OTP with more than 6 digits", () => {
      expect(InputValidator.isValidOTP("1234567")).toBe(false);
    });

    it("returns false for OTP with letters", () => {
      expect(InputValidator.isValidOTP("12345a")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(InputValidator.isValidOTP("")).toBe(false);
    });
  });

  describe("isValidNumber", () => {
    it("returns true for valid number", () => {
      expect(InputValidator.isValidNumber(42)).toBe(true);
    });

    it("returns true for zero", () => {
      expect(InputValidator.isValidNumber(0)).toBe(true);
    });

    it("returns true for negative number", () => {
      expect(InputValidator.isValidNumber(-5)).toBe(true);
    });

    it("returns false for NaN", () => {
      expect(InputValidator.isValidNumber(NaN)).toBe(false);
    });

    it("returns false for Infinity", () => {
      expect(InputValidator.isValidNumber(Infinity)).toBe(false);
    });

    it("returns false for string", () => {
      expect(InputValidator.isValidNumber("42")).toBe(false);
    });

    it("returns false for null", () => {
      expect(InputValidator.isValidNumber(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(InputValidator.isValidNumber(undefined)).toBe(false);
    });
  });

  describe("isPositiveNumber", () => {
    it("returns true for positive number", () => {
      expect(InputValidator.isPositiveNumber(42)).toBe(true);
    });

    it("returns false for zero", () => {
      expect(InputValidator.isPositiveNumber(0)).toBe(false);
    });

    it("returns false for negative number", () => {
      expect(InputValidator.isPositiveNumber(-5)).toBe(false);
    });
  });

  describe("isNonNegativeNumber", () => {
    it("returns true for positive number", () => {
      expect(InputValidator.isNonNegativeNumber(42)).toBe(true);
    });

    it("returns true for zero", () => {
      expect(InputValidator.isNonNegativeNumber(0)).toBe(true);
    });

    it("returns false for negative number", () => {
      expect(InputValidator.isNonNegativeNumber(-5)).toBe(false);
    });
  });

  describe("isValidLatitude", () => {
    it("returns true for valid latitude", () => {
      expect(InputValidator.isValidLatitude(19.09)).toBe(true);
    });

    it("returns true for boundary values", () => {
      expect(InputValidator.isValidLatitude(-90)).toBe(true);
      expect(InputValidator.isValidLatitude(90)).toBe(true);
    });

    it("returns false for out of range", () => {
      expect(InputValidator.isValidLatitude(-91)).toBe(false);
      expect(InputValidator.isValidLatitude(91)).toBe(false);
    });
  });

  describe("isValidLongitude", () => {
    it("returns true for valid longitude", () => {
      expect(InputValidator.isValidLongitude(72.87)).toBe(true);
    });

    it("returns true for boundary values", () => {
      expect(InputValidator.isValidLongitude(-180)).toBe(true);
      expect(InputValidator.isValidLongitude(180)).toBe(true);
    });

    it("returns false for out of range", () => {
      expect(InputValidator.isValidLongitude(-181)).toBe(false);
      expect(InputValidator.isValidLongitude(181)).toBe(false);
    });
  });

  describe("isValidDistance", () => {
    it("returns true for valid distance", () => {
      expect(InputValidator.isValidDistance(10)).toBe(true);
    });

    it("returns true for zero", () => {
      expect(InputValidator.isValidDistance(0)).toBe(true);
    });

    it("returns false for negative", () => {
      expect(InputValidator.isValidDistance(-1)).toBe(false);
    });

    it("returns false for too large", () => {
      expect(InputValidator.isValidDistance(50001)).toBe(false);
    });
  });

  describe("isValidPlatform", () => {
    it("returns true for valid platforms", () => {
      expect(InputValidator.isValidPlatform("swiggy")).toBe(true);
      expect(InputValidator.isValidPlatform("uber")).toBe(true);
      expect(InputValidator.isValidPlatform("amazon")).toBe(true);
    });

    it("returns false for invalid platform", () => {
      expect(InputValidator.isValidPlatform("unknown")).toBe(false);
    });
  });

  describe("isValidTransportMode", () => {
    it("returns true for valid modes", () => {
      expect(InputValidator.isValidTransportMode("car")).toBe(true);
      expect(InputValidator.isValidTransportMode("walking")).toBe(true);
      expect(InputValidator.isValidTransportMode("metro")).toBe(true);
    });

    it("returns false for invalid mode", () => {
      expect(InputValidator.isValidTransportMode("helicopter")).toBe(false);
    });
  });

  describe("isValidVehicleType", () => {
    it("returns true for valid types", () => {
      expect(InputValidator.isValidVehicleType("ELECTRIC_BIKE")).toBe(true);
      expect(InputValidator.isValidVehicleType("PETROL_CAR")).toBe(true);
    });

    it("returns false for invalid type", () => {
      expect(InputValidator.isValidVehicleType("ROCKET")).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("removes HTML tags", () => {
      expect(InputValidator.sanitizeString("<script>alert(1)</script>")).toBe("scriptalert(1)/script");
    });

    it("removes javascript protocol", () => {
      expect(InputValidator.sanitizeString("javascript:alert(1)")).toBe("alert(1)");
    });

    it("trims whitespace", () => {
      expect(InputValidator.sanitizeString("  hello  ")).toBe("hello");
    });
  });
});

describe("OutputSanitizer", () => {
  describe("sanitizeForDisplay", () => {
    it("sanitizes HTML entities", () => {
      expect(OutputSanitizer.sanitizeForDisplay("<div>test</div>")).toBe("&lt;div&gt;test&lt;/div&gt;");
    });

    it("handles null", () => {
      expect(OutputSanitizer.sanitizeForDisplay(null)).toBe("");
    });

    it("handles undefined", () => {
      expect(OutputSanitizer.sanitizeForDisplay(undefined)).toBe("");
    });

    it("handles numbers", () => {
      expect(OutputSanitizer.sanitizeForDisplay(42)).toBe("42");
    });
  });

  describe("sanitizeNumber", () => {
    it("rounds to specified decimals", () => {
      expect(OutputSanitizer.sanitizeNumber(3.14159, 2)).toBe(3.14);
    });

    it("returns 0 for NaN", () => {
      expect(OutputSanitizer.sanitizeNumber(NaN)).toBe(0);
    });

    it("returns 0 for Infinity", () => {
      expect(OutputSanitizer.sanitizeNumber(Infinity)).toBe(0);
    });
  });

  describe("sanitizeKgCo2e", () => {
    it("clamps to valid range", () => {
      expect(OutputSanitizer.sanitizeKgCo2e(-5)).toBe(0);
      expect(OutputSanitizer.sanitizeKgCo2e(1000001)).toBe(1000000);
    });

    it("returns valid value", () => {
      expect(OutputSanitizer.sanitizeKgCo2e(42.5)).toBe(42.5);
    });
  });

  describe("sanitizePercentage", () => {
    it("clamps to 0-100", () => {
      expect(OutputSanitizer.sanitizePercentage(-10)).toBe(0);
      expect(OutputSanitizer.sanitizePercentage(110)).toBe(100);
    });
  });
});

describe("RateLimiter", () => {
  beforeEach(() => {
    RateLimiter.reset("test");
  });

  it("allows requests within limit", () => {
    expect(RateLimiter.check("test", 3, 1000)).toBe(true);
    expect(RateLimiter.check("test", 3, 1000)).toBe(true);
    expect(RateLimiter.check("test", 3, 1000)).toBe(true);
  });

  it("blocks requests over limit", () => {
    RateLimiter.check("test", 2, 1000);
    RateLimiter.check("test", 2, 1000);
    expect(RateLimiter.check("test", 2, 1000)).toBe(false);
  });

  it("resets after window expires", async () => {
    RateLimiter.check("test", 1, 50);
    expect(RateLimiter.check("test", 1, 50)).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(RateLimiter.check("test", 1, 50)).toBe(true);
  });
});
