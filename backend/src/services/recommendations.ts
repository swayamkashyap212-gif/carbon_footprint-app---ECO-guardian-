import { CarbonCategory } from "@prisma/client";

export function buildRecommendations(input: { category: CarbonCategory; totalKg: number; distanceKm?: number }) {
  const recommendations = [];

  if (input.category === "FOOD_DELIVERY") {
    if ((input.distanceKm ?? 0) > 3) {
      recommendations.push({
        title: "Order from nearby restaurants",
        description: "Choosing a restaurant within 3 KM could reduce delivery emissions by up to 52%.",
        potentialSaving: Math.round(input.totalKg * 0.52 * 100) / 100,
        costSaving: 40,
        monthlyEstimate: 240
      });
    }
    if ((input.distanceKm ?? 0) <= 2) {
      recommendations.push({
        title: "Walk for nearby orders",
        description: "Your order is within walking distance. Opting for self-pickup completely eliminates delivery carbon.",
        potentialSaving: input.totalKg,
        costSaving: 30,
        monthlyEstimate: 180
      });
    }
    recommendations.push({
      title: "Opt for reusable packaging",
      description: "Ask the merchant to use minimal or reusable packaging to reduce packaging emissions.",
      potentialSaving: Math.round(input.totalKg * 0.15 * 100) / 100,
      costSaving: 10,
      monthlyEstimate: 50
    });
  }

  if (input.category === "GROCERY_DELIVERY") {
    recommendations.push({
      title: "Combine grocery orders",
      description: "Ordering in bulk instead of multiple small transactions saves packaging and delivery vehicle trips.",
      potentialSaving: Math.round(input.totalKg * 0.35 * 100) / 100,
      costSaving: 60,
      monthlyEstimate: 300
    });
    recommendations.push({
      title: "Select EV delivery options",
      description: "Choosing green shipping options at checkout cuts delivery emissions down to nearly zero.",
      potentialSaving: Math.round(input.totalKg * 0.25 * 100) / 100,
      costSaving: 0,
      monthlyEstimate: 120
    });
  }

  recommendations.push({
    title: "Eco Guardian Routine Sync",
    description: "Align your delivery times to off-peak slots to help route delivery agents more efficiently.",
    potentialSaving: Math.round(input.totalKg * 0.08 * 100) / 100,
    costSaving: 15,
    monthlyEstimate: 90
  });

  return recommendations;
}
