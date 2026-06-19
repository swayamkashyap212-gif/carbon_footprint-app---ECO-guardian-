import { CarbonEntry, ElectricityLog, FlightLog, FoodDeliveryLog, ShoppingLog, Streak, TransportMode } from "../types/domain";
import { calculateTransportCarbon } from "./carbonEngine";

export type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

type CoachContext = {
  entries?: CarbonEntry[];
  electricityLogs?: ElectricityLog[];
  foodDeliveries?: FoodDeliveryLog[];
  flightLogs?: FlightLog[];
  shoppingLogs?: ShoppingLog[];
  streaks?: Streak[];
  dailyKg?: number;
  weeklyKg?: number;
  weather?: string;
};

export async function askCarbonCoach(messages: CoachMessage[], accessToken?: string, context?: CoachContext) {
  const latest = messages[messages.length - 1]?.content ?? "Help me reduce carbon.";
  return {
    role: "assistant" as const,
    content: generateSmartResponse(latest, context)
  };
}

function generateSmartResponse(query: string, context?: CoachContext): string {
  const lower = query.toLowerCase();
  const dailyKg = context?.dailyKg ?? 0;
  const weeklyKg = context?.weeklyKg ?? 0;
  const foodCount = context?.foodDeliveries?.length ?? 0;
  const foodKg = context?.foodDeliveries?.reduce((s, d) => s + d.kgCo2e, 0) ?? 0;
  const flightKg = context?.flightLogs?.reduce((s, f) => s + f.kgCo2e, 0) ?? 0;
  const elecKg = context?.electricityLogs?.reduce((s, l) => s + l.kgCo2e, 0) ?? 0;

  if (lower.includes("metro") || lower.includes("train") || lower.includes("public transport")) {
    const carKg = calculateTransportCarbon(10, "car");
    const metroKg = calculateTransportCarbon(10, "metro");
    const savings = ((carKg - metroKg) / carKg * 100).toFixed(0);
    return `Metro is one of the best choices! It produces only ${metroKg} kg CO₂ per 10 km compared to ${carKg} kg by car. That's a ${savings}% reduction.\n\nTips:\n• Use metro for your daily commute\n• Combine metro with walking for last-mile connectivity\n• Metro passes save money and encourage consistent use`;
  }

  if (lower.includes("walk") || lower.includes("cycle") || lower.includes("cycling")) {
    return `Walking and cycling are zero-emission options! They also improve health and save money.\n\n• For trips under 3 km, walking is ideal\n• For 3-10 km, cycling is perfect\n• Both produce 0 kg CO₂\n• You burn calories instead of fuel!`;
  }

  if (lower.includes("cab") || lower.includes("uber") || lower.includes("ola") || lower.includes("ride")) {
    const carKg = calculateTransportCarbon(10, "car");
    const sharedKg = carKg * 0.5;
    return `Cabs produce about ${carKg} kg CO₂ per 10 km.\n\nBetter alternatives:\n• Shared rides: ~${sharedKg.toFixed(2)} kg (50% less)\n• Metro + auto for last mile\n• Walking if under 2 km\n• EV cabs when available`;
  }

  if (lower.includes("food") || lower.includes("delivery") || lower.includes("swiggy") || lower.includes("zomato")) {
    return `You've had ${foodCount} food deliveries totaling ${foodKg.toFixed(1)} kg CO₂.\n\nWays to reduce:\n• Walk to nearby restaurants (saves 100% delivery emissions)\n• Order vegetarian meals (60% less food carbon)\n• Avoid express delivery (2x more emissions)\n• Batch orders with family/friends\n• Cook at home more often`;
  }

  if (lower.includes("electricity") || lower.includes("power") || lower.includes("bill")) {
    const elecKg = context?.electricityLogs?.reduce((s, l) => s + l.kgCo2e, 0) ?? 0;
    return `Your electricity has produced ${elecKg.toFixed(1)} kg CO₂.\n\nTips to reduce:\n• Switch to LED lights (saves 75% lighting energy)\n• Set AC to 24°C (each degree saves 6% energy)\n• Unplug standby appliances (saves 5-10%)\n• Use fans before AC\n• Run washing machine with full loads\n• Each kWh produces ~0.7 kg CO₂ in India`;
  }

  if (lower.includes("flight") || lower.includes("plane") || lower.includes("fly")) {
    const flightKg = context?.flightLogs?.reduce((s, f) => s + f.kgCo2e, 0) ?? 0;
    return `Your flights have produced ${flightKg.toFixed(1)} kg CO₂.\n\nAlternatives:\n• Trains save up to 90% emissions for routes under 1000 km\n• Choose economy cabin (lower per-passenger share)\n• Pack light (less fuel needed)\n• Consider carbon offsets for unavoidable flights\n• A Delhi-Mumbai flight produces ~115 kg CO₂ per passenger`;
  }

  if (lower.includes("shopping") || lower.includes("amazon") || lower.includes("flipkart")) {
    return `Shopping carbon tips:\n• Group orders (reduces delivery trips by 40%)\n• Choose standard delivery over express (50% less)\n• Buy locally made products\n• Choose pickup option when possible\n• Buy refurbished electronics when available\n• Avoid returns (doubles shipping emissions)`;
  }

  if (lower.includes("score") || lower.includes("sustainability") || lower.includes("how am i doing")) {
    if (dailyKg <= 8) {
      return `Great job! Your daily carbon is ${dailyKg.toFixed(1)} kg - that's in the "Low" range. You're doing well!\n\nKeep maintaining:\n• Your eco-friendly transport habits\n• Mindful delivery choices\n• Efficient electricity usage`;
    }
    if (dailyKg <= 16) {
      return `Your daily carbon is ${dailyKg.toFixed(1)} kg - that's "Medium" range.\n\nTo improve:\n• Switch one car trip to metro per week\n• Reduce one food delivery per week\n• Optimize electricity usage\n• Small changes add up!`;
    }
    return `Your daily carbon is ${dailyKg.toFixed(1)} kg - that's "High" range.\n\nPriority actions:\n• Use metro for commute instead of car\n• Reduce food deliveries\n• Optimize electricity usage\n• Combine shopping orders\n• Every kg saved matters!`;
  }

  if (lower.includes("badge") || lower.includes("point") || lower.includes("level") || lower.includes("streak")) {
    return `Earn green points by:\n• Logging activities (+10 pts each)\n• Completing challenges (+50-200 pts)\n• Maintaining streaks (+25 pts/day)\n• Adopting recommendations (+50 pts)\n\nBadges unlock at milestones like 5 metro trips, 7-day streak, or reducing electricity by 10%.`;
  }

  if (lower.includes("tip") || lower.includes("advice") || lower.includes("help") || lower.includes("reduce")) {
    const tips = [
      "Use metro for your daily commute - it produces 92% less CO₂ than a car.",
      "Walk or cycle for trips under 3 km - zero emissions and great exercise.",
      "Combine your shopping orders into fewer deliveries.",
      "Set your AC to 24°C - each degree lower uses 6% more energy.",
      "Choose vegetarian meals more often - they produce 60% less carbon.",
      "Use public transport instead of cabs when possible.",
      "Avoid express delivery - standard delivery has 50% less emissions.",
      "Unplug appliances when not in use - standby power adds up.",
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)];
    return `Here's a tip for you:\n\n${tip}\n\nBased on your current daily average of ${dailyKg.toFixed(1)} kg CO₂, even small changes can make a big difference over time!`;
  }

  return `I can help you reduce your carbon footprint! Try asking about:\n\n• Transport alternatives (metro vs car)\n• Food delivery impact\n• Electricity saving tips\n• Flight alternatives\n• Shopping optimization\n• Your sustainability score\n• Earning badges and points\n\nYour current daily average: ${dailyKg.toFixed(1)} kg CO₂`;
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
