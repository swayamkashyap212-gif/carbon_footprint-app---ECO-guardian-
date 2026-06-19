import { NotificationPlatform, VehicleType } from "@prisma/client";

export function predictDeliveryVehicle(input: {
  city?: string;
  distanceKm: number;
  platform: NotificationPlatform;
  hour: number;
  deliveryTimeMin?: number;
}) {
  // If the distance is very short (<= 2.5km), dark stores mostly use Electric Bikes or Scooters
  if (input.distanceKm <= 2.5) {
    if (input.platform === "ZEPTO" || input.platform === "BLINKIT") {
      return { vehicleType: "ELECTRIC_BIKE" as VehicleType, confidence: 0.85 };
    }
    return { vehicleType: "SCOOTER" as VehicleType, confidence: 0.72 };
  }
  
  // If distance is long (e.g. > 10km)
  if (input.distanceKm > 10) {
    if (input.platform === "AMAZON" || input.platform === "FLIPKART") {
      return { vehicleType: "PETROL_CAR" as VehicleType, confidence: 0.65 };
    }
    return { vehicleType: "PETROL_BIKE" as VehicleType, confidence: 0.60 };
  }

  // Speed check if delivery time is provided
  if (input.deliveryTimeMin && input.deliveryTimeMin > 0) {
    const speedKmh = (input.distanceKm / input.deliveryTimeMin) * 60;
    if (speedKmh > 50) {
      return { vehicleType: "PETROL_CAR" as VehicleType, confidence: 0.58 };
    }
  }

  // Peak hour checking for food delivery
  if (input.platform === "SWIGGY" || input.platform === "ZOMATO") {
    if (input.hour >= 18 && input.hour <= 22) {
      return { vehicleType: "ELECTRIC_BIKE" as VehicleType, confidence: 0.75 };
    }
    return { vehicleType: "PETROL_BIKE" as VehicleType, confidence: 0.70 };
  }

  return { vehicleType: "PETROL_BIKE" as VehicleType, confidence: 0.65 };
}
