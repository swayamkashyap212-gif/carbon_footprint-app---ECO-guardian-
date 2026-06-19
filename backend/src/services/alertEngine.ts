import { AlertLevel, CarbonCategory } from "@prisma/client";

export function createRiskAlert(input: { category: CarbonCategory; currentKg: number; baselineKg: number; count?: number }) {
  const increase = input.baselineKg > 0 ? ((input.currentKg - input.baselineKg) / input.baselineKg) * 100 : 0;
  const level: AlertLevel = increase > 75 ? "CRITICAL" : increase > 45 ? "RED" : increase > 25 ? "ORANGE" : increase > 10 ? "YELLOW" : "GREEN";
  return {
    level,
    title: `${input.category.replace(/_/g, " ")} carbon update`,
    message: `You generated ${round(input.currentKg)}kg CO2e from ${input.category.toLowerCase().replace(/_/g, " ")}. Change vs baseline: ${round(increase)}%.`,
    metadata: { increase, count: input.count ?? null }
  };
}

export function generateDeliveryCarbonAlert(
  platform: string,
  totalKg: number,
  distanceKm: number,
  vehicleType: string
) {
  const reductionPercentage = distanceKm > 3 ? 52 : 0;
  let message = `Your ${platform} order generated approximately ${totalKg}kg CO₂. Distance: ${distanceKm} KM. Vehicle: ${vehicleType.replace("_", " ")}.`;
  if (reductionPercentage > 0) {
    message += ` Choosing a restaurant within 3 KM could reduce emissions by ${reductionPercentage}%.`;
  }
  return {
    level: "YELLOW" as AlertLevel,
    title: `${platform} Delivery Carbon Alert`,
    message,
    metadata: { platform, totalKg, distanceKm, vehicleType }
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
