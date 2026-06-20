import { calculateLevel } from "../src/services/levelCalc";

describe("levelCalc", () => {
  describe("calculateLevel", () => {
    it("returns level 1 for zero XP", () => {
      const result = calculateLevel(0);
      expect(result.level).toBe(1);
      expect(result.xp).toBe(0);
    });

    it("returns level 1 for XP below first threshold", () => {
      const result = calculateLevel(100);
      expect(result.level).toBe(1);
      expect(result.xp).toBe(100);
    });

    it("returns level 2 at first threshold", () => {
      const result = calculateLevel(200);
      expect(result.level).toBe(2);
      expect(result.xp).toBe(0);
    });

    it("returns level 2 for XP between first and second threshold", () => {
      const result = calculateLevel(300);
      expect(result.level).toBe(2);
      expect(result.xp).toBe(100);
    });

    it("calculates higher levels correctly", () => {
      const result = calculateLevel(1000);
      expect(result.level).toBeGreaterThan(1);
    });

    it("returns correct xpToNextLevel", () => {
      const result = calculateLevel(0);
      expect(result.xpToNextLevel).toBe(200);
    });

    it("handles large XP values", () => {
      const result = calculateLevel(10000);
      expect(result.level).toBeGreaterThan(5);
      expect(result.xp).toBeGreaterThanOrEqual(0);
    });
  });
});
