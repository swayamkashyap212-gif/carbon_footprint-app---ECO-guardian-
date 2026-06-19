import { CarbonCategory } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildRecommendations } from "../src/services/recommendations.js";

describe("backend recommendation templates", () => {
  it("creates food delivery actions with savings estimates", () => {
    const recommendations = buildRecommendations({ category: CarbonCategory.FOOD_DELIVERY, totalKg: 12, distanceKm: 4.5 });

    expect(recommendations.some((item) => item.title === "Order from nearby restaurants")).toBe(true);
    expect(recommendations.some((item) => item.title === "Opt for reusable packaging")).toBe(true);
    expect(recommendations.some((item) => item.potentialSaving > 0)).toBe(true);
  });

  it("creates grocery and routine recommendations", () => {
    const recommendations = buildRecommendations({ category: CarbonCategory.GROCERY_DELIVERY, totalKg: 8 });

    expect(recommendations.map((item) => item.title)).toContain("Combine grocery orders");
    expect(recommendations.map((item) => item.title)).toContain("Select EV delivery options");
    expect(recommendations.map((item) => item.title)).toContain("Eco Guardian Routine Sync");
  });
});