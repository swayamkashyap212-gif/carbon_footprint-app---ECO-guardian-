import { TransportMode } from "../types/domain";

export const regionalElectricityFactorsKgPerKwh: Record<string, number> = {
  india: 0.716,
  usa: 0.386,
  eu: 0.231,
  global: 0.475,
  maharashtra: 0.738,
  delhi: 0.714,
  karnataka: 0.682,
  tamil_nadu: 0.655,
  gujarat: 0.744,
  rajasthan: 0.762,
  uttar_pradesh: 0.792,
  west_bengal: 0.722,
  andhra_pradesh: 0.698,
  telangana: 0.688
};

export const transportFactorsKgPerKm: Record<TransportMode, number> = {
  car: 0.192,
  bike: 0.082,
  bus: 0.089,
  metro: 0.028,
  train: 0.041,
  flight: 0.255,
  walking: 0,
  cycling: 0
};

export const deliveryVehicleFactorsKgPerKm: Record<string, number> = {
  ELECTRIC_BIKE: 0.015,
  PETROL_BIKE: 0.072,
  SCOOTER: 0.065,
  EV_CAR: 0.053,
  PETROL_CAR: 0.192,
  DIESEL_CAR: 0.171,
  CYCLE: 0,
  WALKING: 0,
  E_BIKE: 0.015,
  VAN: 0.285,
  TRUCK: 0.412,
  AUTO_RICKSHAW: 0.098
};

export const rideSharingFactorsKgPerKm: Record<string, number> = {
  solo_cab: 0.192,
  shared_cab: 0.096,
  auto_rickshaw: 0.098,
  bike_taxi: 0.052,
  ev_solo: 0.053,
  ev_shared: 0.027
};

export const foodDeliveryVehicleFactors: Record<string, number> = {
  bicycle: 0,
  walking: 0,
  e_bike: 0.015,
  bike: 0.072,
  scooter: 0.065,
  car: 0.192,
  van: 0.285
};

export const quickCommerceFactorsKgPerKm: Record<string, number> = {
  blinkit: 0.042,
  zepto: 0.045,
  instamart: 0.043,
  bb_daily: 0.048,
  amazon_fresh: 0.055,
  default: 0.050
};

export const foodFactorsKgPerServing: Record<string, number> = {
  vegetarian: 1.1,
  nonVegetarian: 5.4,
  processed: 2.8,
  local: 0.7,
  vegan: 0.6,
  seafood: 6.2,
  dairy: 3.1
};

export const flightCabinMultipliers: Record<string, number> = {
  economy: 1,
  premium_economy: 1.6,
  business: 2.9,
  first: 4
};

export const shoppingManufacturingFactorsKg: Record<string, number> = {
  electronics: 28,
  fashion: 8,
  grocery: 1.6,
  food: 2.4,
  home_appliances: 35,
  personal_care: 2.2,
  medicine: 1.8,
  books: 1.2,
  furniture: 42,
  sports: 5.5,
  beauty: 3.2
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
    grouped: 0.35,
    pickup: 0
  }
};

export const electricityProviders: Record<string, { name: string; region: string; factor: number }> = {
  bses_rajdhani: { name: "BSES Rajdhani", region: "delhi", factor: 0.714 },
  bses_yamuna: { name: "BSES Yamuna", region: "delhi", factor: 0.714 },
  tata_power_delhi: { name: "Tata Power Delhi", region: "delhi", factor: 0.714 },
  adani_electricity: { name: "Adani Electricity", region: "maharashtra", factor: 0.738 },
  msedcl: { name: "MSEDCL", region: "maharashtra", factor: 0.738 },
  bescom: { name: "BESCOM", region: "karnataka", factor: 0.682 },
  tangedco: { name: "TANGEDCO", region: "tamil_nadu", factor: 0.655 },
  pgvcl: { name: "PGVCL", region: "gujarat", factor: 0.744 },
  jpvnl: { name: "JPVNL", region: "rajasthan", factor: 0.762 },
  mvvnl: { name: "MVVNL", region: "uttar_pradesh", factor: 0.792 },
  wbseb: { name: "WBSEB", region: "west_bengal", factor: 0.722 },
  apspdcl: { name: "APSPDCL", region: "andhra_pradesh", factor: 0.698 },
  tsspdcl: { name: "TSSPDCL", region: "telangana", factor: 0.688 }
};

export const platformEmissionMultipliers: Record<string, number> = {
  swiggy: 1.0,
  zomato: 1.0,
  blinkit: 0.85,
  zepto: 0.85,
  instamart: 0.88,
  bigbasket: 0.92,
  amazon: 1.1,
  flipkart: 1.05,
  uber: 1.0,
  ola: 1.0,
  rapido: 0.6,
  porter: 1.2
};

export const carbonOffsetFactorsKgPerRupee = 0.008;
