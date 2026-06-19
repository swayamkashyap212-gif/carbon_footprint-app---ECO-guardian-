import { CarbonEntry, Prediction } from "../types/domain";
import { predictCarbon } from "./carbonEngine";

const emptyPrediction: Prediction = {
  nextWeekKg: 0,
  nextMonthKg: 0,
  nextQuarterKg: 0,
  annualKg: 0,
  risk: "low",
  sustainabilityScore: 0,
  drivers: []
};

export function generateCarbonForecast(entries: CarbonEntry[]) {
  const generated = entries.length > 0 ? predictCarbon(entries) : emptyPrediction;

  const transportEntries = entries.filter(e => e.category === "transport");
  const foodEntries = entries.filter(e => e.category === "food" || e.category === "food_delivery");
  const electricityEntries = entries.filter(e => e.category === "electricity");
  const shoppingEntries = entries.filter(e => e.category === "shopping" || e.category === "grocery_delivery");

  const transportKg = transportEntries.reduce((s, e) => s + e.kgCo2e, 0);
  const foodKg = foodEntries.reduce((s, e) => s + e.kgCo2e, 0);
  const electricityKg = electricityEntries.reduce((s, e) => s + e.kgCo2e, 0);
  const shoppingKg = shoppingEntries.reduce((s, e) => s + e.kgCo2e, 0);

  const insights: string[] = [];

  if (transportKg > 15) {
    insights.push(`Your transport emissions are high at ${Math.round(transportKg)} kg. Switching to metro twice this week could save ${Math.round(transportKg * 0.3)} kg.`);
  }
  if (foodKg > 10) {
    insights.push(`Food delivery contributed ${Math.round(foodKg)} kg CO₂. Reducing by 2 orders/week could save ${Math.round(foodKg * 0.25)} kg.`);
  }
  if (electricityKg > 20) {
    insights.push(`Electricity usage is ${Math.round(electricityKg)} kg CO₂. LED lights and AC optimization can reduce this by 15%.`);
  }
  if (shoppingKg > 5) {
    insights.push(`Shopping delivery generated ${Math.round(shoppingKg)} kg. Grouped deliveries reduce emissions by up to 50%.`);
  }

  if (insights.length === 0) {
    insights.push(
      "Your carbon footprint looks good! Keep maintaining eco-friendly habits.",
      "Consider walking or cycling for trips under 3 km to earn green points.",
      "Grouping your shopping orders can reduce delivery emissions by 40%."
    );
  }

  const trendDirection = entries.length > 5 ? analyzeTrend(entries) : "stable";

  return {
    ...generated,
    trendDirection,
    graph: [
      { label: "7D", kg: generated.nextWeekKg },
      { label: "30D", kg: generated.nextMonthKg },
      { label: "3M", kg: generated.nextQuarterKg },
      { label: "1Y", kg: generated.annualKg }
    ],
    categoryBreakdown: {
      transport: Math.round(transportKg * 100) / 100,
      food: Math.round(foodKg * 100) / 100,
      electricity: Math.round(electricityKg * 100) / 100,
      shopping: Math.round(shoppingKg * 100) / 100
    },
    insights,
    scenarioImpacts: generateScenarios(entries)
  };
}

function analyzeTrend(entries: CarbonEntry[]): "increasing" | "decreasing" | "stable" {
  const sorted = [...entries].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid).reduce((s, e) => s + e.kgCo2e, 0);
  const secondHalf = sorted.slice(mid).reduce((s, e) => s + e.kgCo2e, 0);
  const diff = secondHalf - firstHalf;
  if (diff > 2) return "increasing";
  if (diff < -2) return "decreasing";
  return "stable";
}

function generateScenarios(entries: CarbonEntry[]) {
  const dailyAverage = entries.length > 0 ? entries.reduce((s, e) => s + e.kgCo2e, 0) / Math.max(entries.length, 1) : 10;

  return [
    {
      title: "No food delivery for a week",
      savings: Math.round(dailyAverage * 0.3 * 7 * 100) / 100,
      description: "Cooking at home eliminates delivery vehicle emissions and reduces packaging waste."
    },
    {
      title: "Metro instead of cab for commute",
      savings: Math.round(dailyAverage * 0.65 * 100) / 100,
      description: "Metro produces 92% less CO₂ than private car per kilometer."
    },
    {
      title: "Group all shopping deliveries",
      savings: Math.round(dailyAverage * 0.2 * 100) / 100,
      description: "Batching orders reduces individual delivery trips by 40%."
    },
    {
      title: "LED lights and AC optimization",
      savings: Math.round(dailyAverage * 0.15 * 100) / 100,
      description: "Energy-efficient habits can cut electricity emissions by 15-20%."
    }
  ];
}
