import { calculateTransportCarbon, calculateTransportCarbonByFuel, FuelType } from "./carbonEngine";
import { TransportMode } from "../types/domain";

export type RouteOption = {
  mode: TransportMode;
  label: string;
  distanceKm: number;
  durationMinutes: number;
  carbonKg: number;
  fareEstimate: number;
  bookingUrl: string | null;
};

const cityData: Record<string, { metro: boolean; bus: boolean; train: boolean }> = {
  delhi: { metro: true, bus: true, train: true },
  mumbai: { metro: true, bus: true, train: true },
  bangalore: { metro: true, bus: true, train: true },
  chennai: { metro: true, bus: true, train: true },
  hyderabad: { metro: true, bus: true, train: true },
  kolkata: { metro: true, bus: true, train: true },
  pune: { metro: true, bus: true, train: true },
  ahmedabad: { metro: true, bus: true, train: true },
  jaipur: { metro: false, bus: true, train: true },
  lucknow: { metro: true, bus: true, train: true },
  kochi: { metro: true, bus: true, train: true },
  nagpur: { metro: true, bus: true, train: true },
};

function getCityFromCoords(lat: number, lon: number): string {
  if (lat >= 28.4 && lat <= 28.9 && lon >= 76.8 && lon <= 77.5) return "delhi";
  if (lat >= 18.8 && lat <= 19.3 && lon >= 72.7 && lon <= 73.1) return "mumbai";
  if (lat >= 12.8 && lat <= 13.1 && lon >= 77.4 && lon <= 77.8) return "bangalore";
  if (lat >= 13.0 && lat <= 13.2 && lon >= 80.1 && lon <= 80.4) return "chennai";
  if (lat >= 17.2 && lat <= 17.6 && lon >= 78.2 && lon <= 78.7) return "hyderabad";
  if (lat >= 22.4 && lat <= 22.7 && lon >= 88.2 && lon <= 88.5) return "kolkata";
  if (lat >= 18.4 && lat <= 18.7 && lon >= 73.7 && lon <= 74.0) return "pune";
  if (lat >= 22.9 && lat <= 23.2 && lon >= 72.4 && lon <= 72.8) return "ahmedabad";
  if (lat >= 26.7 && lat <= 27.1 && lon >= 75.6 && lon <= 76.0) return "jaipur";
  if (lat >= 26.7 && lat <= 27.0 && lon >= 80.8 && lon <= 81.1) return "lucknow";
  return "other";
}

export async function getRouteRecommendations(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number
): Promise<RouteOption[]> {
  const distanceKm = haversineDistance(originLat, originLon, destLat, destLon);
  const city = getCityFromCoords(originLat, originLon);
  const cityInfo = cityData[city] || { metro: false, bus: true, train: false };

  const options: RouteOption[] = [];

  if (distanceKm <= 5) {
    options.push({
      mode: "walking",
      label: "Walking",
      distanceKm,
      durationMinutes: Math.round(distanceKm * 12),
      carbonKg: 0,
      fareEstimate: 0,
      bookingUrl: null,
    });
  }

  if (distanceKm <= 15) {
    options.push({
      mode: "cycling",
      label: "Cycling",
      distanceKm,
      durationMinutes: Math.round(distanceKm * 4),
      carbonKg: 0,
      fareEstimate: 0,
      bookingUrl: null,
    });
  }

  if (cityInfo.metro && distanceKm <= 40) {
    const metroKm = distanceKm * 0.8;
    options.push({
      mode: "metro",
      label: "Metro",
      distanceKm: metroKm,
      durationMinutes: Math.round(metroKm * 2.5) + 10,
      carbonKg: calculateTransportCarbon(metroKm, "metro"),
      fareEstimate: Math.round(metroKm * 2),
      bookingUrl: null,
    });
  }

  if (cityInfo.bus) {
    const busKm = distanceKm * 1.15;
    options.push({
      mode: "bus",
      label: "Bus",
      distanceKm: busKm,
      durationMinutes: Math.round(busKm * 3) + 15,
      carbonKg: calculateTransportCarbon(busKm, "bus"),
      fareEstimate: Math.round(busKm * 1.5),
      bookingUrl: null,
    });
  }

  if (cityInfo.train && distanceKm >= 20) {
    const trainKm = distanceKm * 0.9;
    options.push({
      mode: "train",
      label: "Local Train",
      distanceKm: trainKm,
      durationMinutes: Math.round(trainKm * 1.5) + 20,
      carbonKg: calculateTransportCarbon(trainKm, "train"),
      fareEstimate: Math.round(trainKm * 1),
      bookingUrl: null,
    });
  }

  options.push({
    mode: "bike",
    label: "Bike",
    distanceKm,
    durationMinutes: Math.round(distanceKm * 2),
    carbonKg: calculateTransportCarbon(distanceKm, "bike"),
    fareEstimate: Math.round(distanceKm * 3),
    bookingUrl: "https://rapido.bike",
  });

  options.push({
    mode: "car",
    label: "Car",
    distanceKm,
    durationMinutes: Math.round(distanceKm * 2.5),
    carbonKg: calculateTransportCarbon(distanceKm, "car"),
    fareEstimate: Math.round(distanceKm * 12),
    bookingUrl: "https://uber.com",
  });

  return options.sort((a, b) => a.carbonKg - b.carbonKg);
}

export function compareFuels(distanceKm: number, mode: TransportMode): { fuel: FuelType; kg: number; label: string }[] {
  const fuels: FuelType[] = ["petrol", "diesel", "cng", "electric", "hybrid"];
  return fuels.map(fuel => ({
    fuel,
    kg: calculateTransportCarbonByFuel(distanceKm, mode, fuel),
    label: fuel.charAt(0).toUpperCase() + fuel.slice(1),
  }));
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
