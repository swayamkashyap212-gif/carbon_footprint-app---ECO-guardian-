import { env } from "../config/env.js";

export async function calculateRoute(input: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}) {
  const apiKey = env.GOOGLE_MAPS_API_KEY;

  if (apiKey && apiKey !== "your-google-maps-key") {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${input.origin.lat},${input.origin.lng}&destination=${input.destination.lat},${input.destination.lng}&key=${apiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await response.json();

      if (data.status === "OK" && data.routes && data.routes[0] && data.routes[0].legs && data.routes[0].legs[0]) {
        const leg = data.routes[0].legs[0];
        const distanceKm = leg.distance.value / 1000;
        const travelTimeMin = Math.round(leg.duration.value / 60);
        return {
          distanceKm: Math.round(distanceKm * 100) / 100,
          travelTimeMin,
          routeMetadata: {
            provider: "google-maps-api",
            traffic: leg.duration_in_traffic ? leg.duration_in_traffic.text : "normal",
            summary: data.routes[0].summary || ""
          }
        };
      }
    } catch (err) {
      console.warn("Google Maps API query failed, falling back to Haversine:", err);
    }
  }

  // Fallback: Haversine distance with 1.28 road winding multiplier
  const distanceKm = haversineKm(input.origin.lat, input.origin.lng, input.destination.lat, input.destination.lng) * 1.28;
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    travelTimeMin: Math.max(4, Math.round(distanceKm * 2.6)),
    routeMetadata: { provider: "google-maps-fallback", fallback: "haversine-road-adjusted" }
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}
