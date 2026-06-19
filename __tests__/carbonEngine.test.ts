import { calculateElectricityCarbon, calculateFoodWasteCarbon, calculateTransportCarbon, predictCarbon } from "../src/services/carbonEngine";

describe("carbonEngine", () => {
  it("calculates electricity emissions by regional factor", () => {
    expect(calculateElectricityCarbon(100, "india")).toBe(71.6);
  });

  it("calculates transport emissions by mode", () => {
    expect(calculateTransportCarbon(10, "metro")).toBe(0.28);
    expect(calculateTransportCarbon(10, "walking")).toBe(0);
  });

  it("estimates food waste impact", () => {
    expect(calculateFoodWasteCarbon(2)).toBe(5);
  });

  it("predicts risk from recent entries", () => {
    const prediction = predictCarbon([
      { id: "1", category: "transport", label: "car", kgCo2e: 12, source: "manual", occurredAt: new Date().toISOString() },
      { id: "2", category: "electricity", label: "bill", kgCo2e: 8, source: "manual", occurredAt: new Date().toISOString() }
    ]);
    expect(prediction.nextWeekKg).toBe(65.8);
    expect(prediction.risk).toBe("medium");
  });
});
