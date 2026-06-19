import { CarbonRecord } from "@prisma/client";

export function generatePrediction(records: Pick<CarbonRecord, "category" | "totalKgCo2e" | "occurredAt">[]) {
  const total = records.reduce((sum, record) => sum + record.totalKgCo2e, 0);
  const daySpan = records.length > 1
    ? Math.max(1, Math.ceil((records[0].occurredAt.getTime() - records[records.length - 1].occurredAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const dailyAverage = total / daySpan;
  const foodOrders = records.filter((record) => record.category === "FOOD_DELIVERY").length;
  const groceryOrders = records.filter((record) => record.category === "GROCERY_DELIVERY").length;
  const shopping = records.filter((record) => record.category === "ECOMMERCE").length;
  return {
    dailyCarbonKg: round(dailyAverage),
    weeklyCarbonKg: round(dailyAverage * 7),
    monthlyCarbonKg: round(dailyAverage * 30),
    expectedFoodDeliveries: Math.round(foodOrders * 1.1),
    expectedGroceryOrders: Math.round(groceryOrders * 1.05),
    expectedShoppingActivities: Math.round(shopping * 1.08),
    futureFootprintKg: round(dailyAverage * 365),
    confidence: records.length > 20 ? 0.82 : 0.58,
    modelVersion: "baseline-statistical-v1",
    drivers: summarizeDrivers(records)
  };
}

function summarizeDrivers(records: Pick<CarbonRecord, "category" | "totalKgCo2e">[]) {
  const totals = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.category] = (acc[record.category] ?? 0) + record.totalKgCo2e;
    return acc;
  }, {});
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, kg]) => ({ category, kg: round(kg) }));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
