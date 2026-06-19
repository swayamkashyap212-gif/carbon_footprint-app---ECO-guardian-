import { CarbonEntry, ElectricityLog, FoodDeliveryLog, Streak, TransportMode } from "../types/domain";
import { calculateTransportCarbon } from "./carbonEngine";

export type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

type CoachContext = {
  entries?: CarbonEntry[];
  electricityLogs?: ElectricityLog[];
  foodDeliveries?: FoodDeliveryLog[];
  streaks?: Streak[];
  dailyKg?: number;
  weather?: string;
};

const modePriorities: Record<TransportMode, string> = {
  walking: "best - zero emissions and great exercise",
  cycling: "excellent - zero emissions with health benefits",
  metro: "great - 92% less CO₂ than car per km",
  bus: "good - shared transport reduces per-person emissions",
  train: "good - efficient for longer distances",
  bike: "moderate - lower emissions than car but higher than public transit",
  car: "highest emissions for personal transport",
  flight: "highest emissions - consider train for routes under 1000 km"
};

export async function askCarbonCoach(messages: CoachMessage[], context?: CoachContext) {
  const latest = messages[messages.length - 1]?.content ?? "Help me reduce carbon.";
  return {
    role: "assistant" as const,
    content: generateLocalResponse(latest, context)
  };
}

function generateLocalResponse(query: string, context?: CoachContext): string {
  const lower = query.toLowerCase();

  if (lower.includes("metro") || lower.includes("train")) {
    return `Metro is one of the best choices! It produces only ${calculateTransportCarbon(10, "metro")} kg CO₂ per 10 km compared to ${calculateTransportCarbon(10, "car")} kg by car. That's a 92% reduction. ${modePriorities.metro}`;
  }

  if (lower.includes("walk") || lower.includes("cycle")) {
    return `Walking and cycling are zero-emission options! They also improve health and save money. For trips under 3 km, walking is ideal. For 3-10 km, cycling is perfect. ${modePriorities.walking}`;
  }

  if (lower.includes("cab") || lower.includes("uber") || lower.includes("ola")) {
    return `Cabs produce about ${calculateTransportCarbon(10, "car")} kg CO₂ per 10 km. Consider: 1) Shared rides (50% less emissions), 2) Metro + auto for the last mile, 3) Walking if under 2 km. ${modePriorities.car}`;
  }

  if (lower.includes("food") || lower.includes("delivery") || lower.includes("swiggy") || lower.includes("zomato")) {
    return `Food delivery typically produces 0.5-2 kg CO₂ per order depending on distance and vehicle. Tips: 1) Walk to nearby restaurants (saves 100% delivery emissions), 2) Order vegetarian (60% less food carbon), 3) Avoid express delivery (2x more emissions), 4) Batch orders with family/friends.`;
  }

  if (lower.includes("electricity") || lower.includes("power") || lower.includes("bill")) {
    return `Electricity tips: 1) Switch to LED lights (saves 75% lighting energy), 2) Set AC to 24°C (each degree saves 6% energy), 3) Unplug standby appliances (saves 5-10%), 4) Use fans before AC, 5) Run washing machine with full loads. Each kWh produces ~0.7 kg CO₂ in India.`;
  }

  if (lower.includes("flight") || lower.includes("plane")) {
    return `Flights are the highest-emission transport per km. For domestic routes under 1000 km, trains save up to 90% emissions. If flying is necessary: 1) Choose economy (lower per-passenger share), 2) Pack light (less fuel), 3) Consider carbon offsets. A Delhi-Mumbai flight produces ~115 kg CO₂ per passenger.`;
  }

  if (lower.includes("shopping") || lower.includes("amazon") || lower.includes("flipkart")) {
    return `Shopping carbon tips: 1) Group orders (reduces delivery trips by 40%), 2) Choose standard delivery over express (50% less), 3) Buy locally made products, 4) Choose pickup option when possible, 5) Buy refurbished electronics when available.`;
  }

  if (lower.includes("score") || lower.includes("sustainability")) {
    const dailyKg = context?.dailyKg;
    if (dailyKg !== undefined) {
      if (dailyKg <= 8) return `Great job! Your daily carbon is ${dailyKg} kg - that's in the "Low" range. You're doing well! Keep maintaining eco-friendly habits.`;
      if (dailyKg <= 16) return `Your daily carbon is ${dailyKg} kg - that's "Medium" range. You can improve by switching one car trip to metro, or reducing one food delivery.`;
      return `Your daily carbon is ${dailyKg} kg - that's "High" range. Focus on: 1) Metro for commute, 2) Reduce food deliveries, 3) Optimize electricity usage.`;
    }
    return `To improve your sustainability score: Track your daily activities, choose green transport, reduce deliveries, and optimize electricity. Your score improves as you log more eco-friendly activities.`;
  }

  if (lower.includes("badge") || lower.includes("point") || lower.includes("level")) {
    return `Earn green points by: 1) Logging activities (+10 pts each), 2) Completing challenges (+50-200 pts), 3) Maintaining streaks (+25 pts/day), 4) Adopting recommendations (+50 pts). Badges unlock at milestones like 5 metro trips, 7-day streak, or reducing electricity by 10%.`;
  }

  return `I can help with: metro vs cab comparisons, food delivery alternatives, electricity savings, flight alternatives, shopping optimization, and more. Ask me anything about reducing your carbon footprint! Based on your query "${query.slice(0, 50)}", try asking about specific transport modes, delivery platforms, or energy-saving tips.`;
}

export function buildActionPlan(recommendations: { title: string; impactKg: number; reason: string }[]) {
  return recommendations.map((item, index) => ({
    step: index + 1,
    title: item.title,
    impactKg: item.impactKg,
    reason: item.reason
  }));
}

export function getTransportRecommendation(mode: TransportMode, distanceKm: number): string {
  const carbon = calculateTransportCarbon(distanceKm, mode);
  const alternatives = (["walking", "cycling", "metro", "bus"] as TransportMode[])
    .map(m => ({ mode: m, carbon: calculateTransportCarbon(distanceKm, m) }))
    .filter(a => a.carbon < carbon)
    .sort((a, b) => a.carbon - b.carbon);

  if (alternatives.length === 0) {
    return `${mode} is already a low-carbon option for this distance.`;
  }

  const best = alternatives[0];
  const savings = Math.round(((carbon - best.carbon) / carbon) * 100);
  return `Switching from ${mode} to ${best.mode} saves ${savings}% CO₂ (${Math.round((carbon - best.carbon) * 100) / 100} kg).`;
}
