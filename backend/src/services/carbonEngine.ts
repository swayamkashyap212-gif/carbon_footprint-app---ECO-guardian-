import { CarbonCategory, VehicleType } from "@prisma/client";

const vehicleFactors: Record<VehicleType, number> = {
  ELECTRIC_BIKE: 0.018,
  PETROL_BIKE: 0.082,
  SCOOTER: 0.073,
  PETROL_CAR: 0.192,
  DIESEL_CAR: 0.171,
  EV_CAR: 0.045,
  UNKNOWN: 0.082
};

const packagingFactors: Partial<Record<CarbonCategory, number>> = {
  FOOD_DELIVERY: 0.22,
  GROCERY_DELIVERY: 0.38,
  ECOMMERCE: 0.75
};

const storageFactors: Partial<Record<CarbonCategory, number>> = {
  GROCERY_DELIVERY: 0.18,
  FOOD_DELIVERY: 0.05
};

export const regionalElectricityFactorsKgPerKwh: Record<string, number> = {
  india: 0.716,
  usa: 0.386,
  eu: 0.231,
  global: 0.475
};

export const transportFactorsKgPerKm = {
  car: 0.192,
  bike: 0.082,
  bus: 0.089,
  metro: 0.028,
  train: 0.041,
  flight: 0.255,
  walking: 0,
  cycling: 0
};

export const foodFactorsKgPerServing = {
  vegetarian: 1.1,
  nonVegetarian: 5.4,
  processed: 2.8,
  local: 0.7
};

export const flightCabinMultipliers = {
  economy: 1.0,
  premium_economy: 1.6,
  business: 2.9,
  first: 4.0
};

export const shoppingManufacturingFactorsKg = {
  electronics: 28.0,
  fashion: 8.0,
  grocery: 1.6,
  food: 2.4,
  home_appliances: 35.0,
  personal_care: 2.2
};

export const shoppingFactorsKg = {
  packaging: {
    minimal: 0.15,
    standard: 0.45,
    heavy: 1.2
  },
  delivery: {
    normal: 0.7,
    express: 1.4,
    grouped: 0.35
  }
};

export function calculateDeliveryCarbon(input: {
  category: CarbonCategory;
  distanceKm: number;
  vehicleType: VehicleType;
  packagingMultiplier?: number;
  storageMultiplier?: number;
}) {
  const transportKg = safeNumber(input.distanceKm) * (vehicleFactors[input.vehicleType] ?? 0);
  const packagingKg = (packagingFactors[input.category] ?? 0) * safeNumber(input.packagingMultiplier ?? 1);
  const storageKg = (storageFactors[input.category] ?? 0) * safeNumber(input.storageMultiplier ?? 1);
  return {
    transportKg: round(transportKg),
    packagingKg: round(packagingKg),
    storageKg: round(storageKg),
    totalKgCo2e: round(transportKg + packagingKg + storageKg)
  };
}

export function calculateFoodDeliveryCarbon(distanceKm: number, vehicleType: VehicleType = "UNKNOWN", packagingMultiplier = 1) {
  return calculateDeliveryCarbon({
    category: "FOOD_DELIVERY",
    distanceKm,
    vehicleType,
    packagingMultiplier
  });
}

export function calculateGroceryDeliveryCarbon(distanceKm: number, vehicleType: VehicleType = "UNKNOWN", coldStorageMultiplier = 1) {
  return calculateDeliveryCarbon({
    category: "GROCERY_DELIVERY",
    distanceKm,
    vehicleType,
    storageMultiplier: coldStorageMultiplier
  });
}

export function calculateElectricityCarbon(unitsKwh: number, region = "india") {
  const factor = regionalElectricityFactorsKgPerKwh[region] ?? regionalElectricityFactorsKgPerKwh.global;
  return round(safeNumber(unitsKwh) * factor);
}

export function calculateTransportCarbon(distanceKm: number, mode: keyof typeof transportFactorsKgPerKm) {
  const factor = transportFactorsKgPerKm[mode] ?? 0;
  return round(safeNumber(distanceKm) * factor);
}

export function calculateFlightCarbon(distanceKm: number, cabin: keyof typeof flightCabinMultipliers = "economy", passengerCount = 1) {
  const cabinMultiplier = flightCabinMultipliers[cabin] ?? 1.0;
  return round(safeNumber(distanceKm) * transportFactorsKgPerKm.flight * cabinMultiplier * safeNumber(passengerCount));
}

export function calculateShoppingCarbonAdvanced(
  category: keyof typeof shoppingManufacturingFactorsKg,
  quantity: number,
  delivery: "standard" | "express" | "grouped" = "standard",
  packaging: "minimal" | "standard" | "heavy" = "standard"
) {
  const normalizedQuantity = safeNumber(quantity);
  const manufacturingKg = (shoppingManufacturingFactorsKg[category] ?? 0) * normalizedQuantity;
  const packagingKg = (shoppingFactorsKg.packaging[packaging] ?? shoppingFactorsKg.packaging.standard) * normalizedQuantity;
  const deliveryKg = delivery === "standard"
    ? shoppingFactorsKg.delivery.normal
    : shoppingFactorsKg.delivery[delivery] ?? shoppingFactorsKg.delivery.grouped;
  return {
    manufacturingKg: round(manufacturingKg),
    packagingKg: round(packagingKg),
    deliveryKg: round(deliveryKg),
    totalKgCo2e: round(manufacturingKg + packagingKg + deliveryKg)
  };
}

export function calculateFoodCarbon(servings: number, type: keyof typeof foodFactorsKgPerServing) {
  const factor = foodFactorsKgPerServing[type] ?? 1.0;
  return round(safeNumber(servings) * factor);
}

export function calculateFoodWasteCarbon(weightKg: number, methaneMultiplier = 2.5) {
  return round(safeNumber(weightKg) * methaneMultiplier);
}

export function calculateEcoScore(input: { monthlyKg: number; greenActions: number; publicTransportTrips: number }) {
  const raw = 100 - input.monthlyKg / 8 + input.greenActions * 2 + input.publicTransportTrips * 0.8;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const band = score >= 90 ? "Eco Hero" : score >= 70 ? "Green Citizen" : score >= 50 ? "Average" : "High Impact User";
  return { score, band };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function safeNumber(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
