import {
  deliveryVehicleFactorsKgPerKm,
  flightCabinMultipliers,
  foodDeliveryVehicleFactors,
  foodFactorsKgPerServing,
  quickCommerceFactorsKgPerKm,
  regionalElectricityFactorsKgPerKwh,
  rideSharingFactorsKgPerKm,
  shoppingFactorsKg,
  shoppingManufacturingFactorsKg,
  transportFactorsKgPerKm
} from "../data/emissionFactors";
import { CarbonEntry, DeliveryType, Prediction, ShoppingCategory, TransportMode } from "../types/domain";

export function calculateElectricityCarbon(unitsKwh: number, region = "india") {
  const factor = regionalElectricityFactorsKgPerKwh[region] ?? regionalElectricityFactorsKgPerKwh.global;
  return round(safeNumber(unitsKwh) * factor);
}

export function calculateTransportCarbon(distanceKm: number, mode: TransportMode) {
  const factor = transportFactorsKgPerKm[mode] ?? 0;
  return round(safeNumber(distanceKm) * factor);
}

export function calculateFlightCarbon(distanceKm: number, cabin: keyof typeof flightCabinMultipliers = "economy", passengerCount = 1) {
  const cabinMultiplier = flightCabinMultipliers[cabin] ?? 1;
  return round(safeNumber(distanceKm) * transportFactorsKgPerKm.flight * cabinMultiplier * safeNumber(passengerCount));
}

export function estimateFlightDistanceKm(departureAirport: string, destinationAirport: string) {
  const routes: Record<string, number> = {
    "DEL-BOM": 1148, "DEL-BLR": 1740, "DEL-HYD": 1260, "DEL-CCU": 1305,
    "BOM-BLR": 842, "BOM-GOI": 425, "DEL-GOI": 1580, "DEL-JAI": 485,
    "DEL-LKO": 554, "BOM-DEL": 1148, "BLR-DEL": 1740,
    "HYD-DEL": 1260, "CCU-DEL": 1305, "BLR-BOM": 842, "GOI-BOM": 425,
    "GOI-DEL": 1580, "JAI-DEL": 485, "LKO-DEL": 554, "PUN-BLR": 842,
    "PUN-DEL": 1170, "AMD-DEL": 930, "AMD-BOM": 530, "PAT-DEL": 850,
    "VNS-DEL": 690, "JDH-DEL": 650, "UDR-DEL": 660, "IXR-DEL": 1100,
    "TRV-DEL": 2210, "COK-DEL": 2050, "MAA-BLR": 330, "MAA-DEL": 1760,
    "MAA-HYD": 510, "PNQ-BLR": 840, "PNQ-DEL": 1170
  };
  const key = `${departureAirport.toUpperCase()}-${destinationAirport.toUpperCase()}`;
  const reverseKey = `${destinationAirport.toUpperCase()}-${departureAirport.toUpperCase()}`;
  return routes[key] ?? routes[reverseKey] ?? greatCircleDistanceKm(departureAirport, destinationAirport);
}

function greatCircleDistanceKm(dep: string, dest: string) {
  const airports: Record<string, [number, number]> = {
    DEL: [28.57, 77.09], BOM: [19.09, 72.87], BLR: [13.20, 77.71],
    HYD: [17.24, 78.43], CCU: [22.65, 88.45], GOI: [15.38, 73.83],
    MAA: [12.99, 80.17], TRV: [8.48, 76.92], COK: [10.15, 76.27],
    PNQ: [18.58, 73.92], AMD: [23.08, 72.63], PAT: [25.59, 85.09],
    LKO: [26.76, 80.88], JAI: [26.82, 75.81], JDH: [26.25, 73.05],
    UDR: [24.62, 73.90], VNS: [25.45, 82.86], IXR: [23.31, 85.32]
  };
  const a = airports[dep.toUpperCase()];
  const b = airports[dest.toUpperCase()];
  if (!a || !b) return 1000;
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

export function calculateFlightCarbonByRoute(departureAirport: string, destinationAirport: string, passengerCount = 1) {
  const distanceKm = estimateFlightDistanceKm(departureAirport, destinationAirport);
  return { distanceKm, kgCo2e: calculateFlightCarbon(distanceKm, "economy", passengerCount) };
}

export function calculateShoppingCarbonAdvanced(category: ShoppingCategory, quantity: number, delivery: DeliveryType, packaging: keyof typeof shoppingFactorsKg.packaging = "standard") {
  const manufacturingFactor = shoppingManufacturingFactorsKg[category] ?? 0;
  const packagingFactor = shoppingFactorsKg.packaging[packaging] ?? shoppingFactorsKg.packaging.standard;
  const deliveryFactor = delivery === "pickup"
    ? 0
    : shoppingFactorsKg.delivery[delivery === "standard" ? "normal" : delivery === "express" ? "express" : "grouped"] ?? shoppingFactorsKg.delivery.grouped;
  const normalizedQuantity = safeNumber(quantity);
  const manufacturingKg = manufacturingFactor * normalizedQuantity;
  const packagingKg = packagingFactor * normalizedQuantity;
  const deliveryKg = deliveryFactor;
  return {
    manufacturingKg: round(manufacturingKg),
    packagingKg: round(packagingKg),
    deliveryKg: round(deliveryKg),
    totalKgCo2e: round(manufacturingKg + packagingKg + deliveryKg)
  };
}

export function calculateLegacyFlightCarbon(distanceKm: number, cabinMultiplier = 1) {
  return round(safeNumber(distanceKm) * transportFactorsKgPerKm.flight * safeNumber(cabinMultiplier));
}

export function calculateFoodCarbon(servings: number, type: keyof typeof foodFactorsKgPerServing) {
  const factor = foodFactorsKgPerServing[type] ?? 1;
  return round(safeNumber(servings) * factor);
}

export function calculateFoodWasteCarbon(weightKg: number, methaneMultiplier = 2.5) {
  return round(safeNumber(weightKg) * safeNumber(methaneMultiplier));
}

export function calculateShoppingCarbon(packaging: keyof typeof shoppingFactorsKg.packaging, delivery: keyof typeof shoppingFactorsKg.delivery) {
  const packagingFactor = shoppingFactorsKg.packaging[packaging] ?? shoppingFactorsKg.packaging.standard;
  const deliveryFactor = shoppingFactorsKg.delivery[delivery] ?? shoppingFactorsKg.delivery.grouped;
  return round(packagingFactor + deliveryFactor);
}

export function calculateFoodDeliveryCarbon(distanceKm: number, vehicleType: string, orderValue: number, isVegetarian: boolean) {
  const vehicleFactor = foodDeliveryVehicleFactors[vehicleType.toLowerCase().replace(/\s+/g, "_")]
    ?? foodDeliveryVehicleFactors.bike;
  const distanceCarbon = round(safeNumber(distanceKm) * vehicleFactor);
  const packagingCarbon = round(0.12 + safeNumber(orderValue) * 0.001);
  const foodPrepCarbon = isVegetarian ? 0.3 : 0.8;
  return round(distanceCarbon + packagingCarbon + foodPrepCarbon);
}

export function calculateGroceryDeliveryCarbon(distanceKm: number, vehicleType: string, orderValue: number, platform: string, isQuickCommerce: boolean) {
  let vehicleFactor: number;
  if (isQuickCommerce) {
    vehicleFactor = quickCommerceFactorsKgPerKm[platform.toLowerCase()] ?? quickCommerceFactorsKgPerKm.default;
  } else {
    vehicleFactor = deliveryVehicleFactorsKgPerKm[vehicleType.toUpperCase().replace(/\s+/g, "_")]
      ?? deliveryVehicleFactorsKgPerKm.PETROL_BIKE;
  }
  const distanceCarbon = round(safeNumber(distanceKm) * vehicleFactor);
  const packagingCarbon = round(0.25 + safeNumber(orderValue) * 0.0008);
  return round(distanceCarbon + packagingCarbon);
}

export function calculateRideBookingCarbon(distanceKm: number, rideType: string, platform: string) {
  const rideFactors: Record<string, number> = {
    economy: rideSharingFactorsKgPerKm.solo_cab,
    premium: rideSharingFactorsKgPerKm.solo_cab * 1.3,
    shared: rideSharingFactorsKgPerKm.shared_cab,
    auto: rideSharingFactorsKgPerKm.auto_rickshaw,
    bike: rideSharingFactorsKgPerKm.bike_taxi,
    ev: rideSharingFactorsKgPerKm.ev_solo,
    ev_shared: rideSharingFactorsKgPerKm.ev_shared
  };
  const factor = rideFactors[rideType.toLowerCase()] ?? rideSharingFactorsKgPerKm.solo_cab;
  return round(safeNumber(distanceKm) * factor);
}

export function calculateDeliveryCarbon(distanceKm: number, vehicleType: string) {
  const factor = deliveryVehicleFactorsKgPerKm[vehicleType.toUpperCase().replace(/\s+/g, "_")]
    ?? deliveryVehicleFactorsKgPerKm.PETROL_BIKE;
  return round(safeNumber(distanceKm) * factor);
}

export function predictCarbon(entries: CarbonEntry[]): Prediction {
  const normalizedEntries = entries.map((entry) => ({ ...entry, kgCo2e: safeNumber(entry.kgCo2e) }));
  const total = normalizedEntries.reduce((sum, entry) => sum + entry.kgCo2e, 0);
  const dailyAverage = total / Math.max(normalizedEntries.length, 1);
  const nextWeekKg = round(dailyAverage * 7 * 0.94);
  const nextMonthKg = round(dailyAverage * 30 * 0.9);
  const nextQuarterKg = round(nextMonthKg * 3);
  const annualKg = round(nextMonthKg * 12);
  const risk = nextWeekKg > 100 ? "high" : nextWeekKg > 60 ? "medium" : "low";
  const sustainabilityScore = Math.max(0, Math.min(100, Math.round(100 - dailyAverage * 2)));
  return {
    nextWeekKg,
    nextMonthKg,
    nextQuarterKg,
    annualKg,
    risk,
    sustainabilityScore,
    drivers: buildPredictionDrivers(normalizedEntries)
  };
}

export function classifyScore(dailyKg: number) {
  if (dailyKg <= 8) return { label: "Low", color: "#2d5a27" };
  if (dailyKg <= 16) return { label: "Medium", color: "#b86e00" };
  return { label: "High", color: "#ba1a1a" };
}

export function getSustainabilityLevel(score: number) {
  if (score >= 90) return { level: "Climate Hero", icon: "trophy" as const, color: "#154212" };
  if (score >= 75) return { level: "Earth Guardian", icon: "leaf" as const, color: "#2d5a27" };
  if (score >= 60) return { level: "Eco Champion", icon: "star" as const, color: "#4a9e3f" };
  if (score >= 40) return { level: "Eco Explorer", icon: "ribbon" as const, color: "#b86e00" };
  return { level: "Eco Beginner", icon: "leaf" as const, color: "#666" };
}

export function calculateGreenScore(entries: CarbonEntry[], electricityLogs: { kgCo2e: number }[]) {
  const totalTransport = entries.filter(e => e.category === "transport").reduce((s, e) => s + e.kgCo2e, 0);
  const totalDelivery = entries.filter(e => e.category === "food_delivery" || e.category === "grocery_delivery").reduce((s, e) => s + e.kgCo2e, 0);
  const totalElectricity = electricityLogs.reduce((s, e) => s + e.kgCo2e, 0);
  const totalFlight = entries.filter(e => e.category === "flight").reduce((s, e) => s + e.kgCo2e, 0);
  const transportScore = totalTransport < 5 ? 25 : totalTransport < 10 ? 20 : totalTransport < 20 ? 15 : 5;
  const deliveryScore = totalDelivery < 3 ? 25 : totalDelivery < 8 ? 20 : totalDelivery < 15 ? 15 : 5;
  const electricityScore = totalElectricity < 10 ? 25 : totalElectricity < 25 ? 20 : totalElectricity < 50 ? 15 : 5;
  const flightScore = totalFlight < 10 ? 25 : totalFlight < 30 ? 20 : totalFlight < 80 ? 15 : 5;

  return Math.min(100, transportScore + deliveryScore + electricityScore + flightScore);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function safeNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function buildPredictionDrivers(entries: CarbonEntry[]) {
  const totals = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + safeNumber(entry.kgCo2e);
    return acc;
  }, {});
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, kg]) => `${category.replace("_", " ")} contributed ${round(kg)} kg CO2e`);
}
