import { calculateFlightCarbonByRoute } from "./carbonEngine";
import { ParsedEmail } from "./gmailIntegration";
import { FlightLog } from "../types/domain";
import { extractTicketOrReceipt } from "./ocr";

export type FlightExtraction = Omit<FlightLog, "id" | "kgCo2e" | "distanceKm" | "confidence"> & {
  confidence: number;
};

export function parseFlightEmail(email: ParsedEmail): FlightLog {
  const text = `${email.subject} ${email.bodyPreview}`;
  const flightNumber = text.match(/\b(?:6E|AI|QP|SG|IX|G8|UK|FD|I5|UK|SG|LH|BA|EK|SQ|QF|AA|UA)\s?\d{2,4}\b/i)?.[0]?.replace(/\s+/, " ") ?? "Unknown";
  const route = text.match(/\b([A-Z]{3})\s+to\s+([A-Z]{3})\b/) ?? text.match(/\bfrom\s+([A-Z]{3})\s+.*\bto\s+([A-Z]{3})\b/i);
  const departureAirport = route?.[1]?.toUpperCase() ?? "DEL";
  const destinationAirport = route?.[2]?.toUpperCase() ?? "BOM";
  const passengerCount = Number(text.match(/Passenger:\s?(\d+)/i)?.[1] ?? 1);
  const { distanceKm, kgCo2e } = calculateFlightCarbonByRoute(departureAirport, destinationAirport, passengerCount);
  const dateMatch = text.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/i);
  let departureDate = new Date().toISOString().slice(0, 10);
  if (dateMatch) {
    try {
      departureDate = new Date(`${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`).toISOString().slice(0, 10);
    } catch {
      // Use default date
    }
  }

  return {
    id: email.id,
    flightNumber,
    departureAirport,
    destinationAirport,
    departureDate,
    passengerCount,
    distanceKm,
    kgCo2e,
    source: "gmail",
    confidence: flightNumber !== "Unknown" ? 0.92 : 0.5
  };
}

export async function parseFlightTicketDocument(uri: string): Promise<FlightLog> {
  const receipt = await extractTicketOrReceipt(uri);

  const flightNumber = extractFlightNumber(receipt.vendor, receipt.items);
  const route = extractRouteFromItems(receipt.items);
  const departureAirport = route?.from ?? extractAirportFromText(receipt.vendor);
  const destinationAirport = route?.to ?? "BOM";
  const passengerCount = extractPassengerCount(receipt.items);
  const departureDate = receipt.date || new Date().toISOString().slice(0, 10);
  const { distanceKm, kgCo2e } = calculateFlightCarbonByRoute(departureAirport, destinationAirport, passengerCount);

  return {
    id: `flight-ocr-${Date.now()}`,
    flightNumber,
    departureAirport,
    destinationAirport,
    departureDate,
    passengerCount,
    distanceKm,
    kgCo2e,
    source: "manual",
    confidence: receipt.confidence > 0 ? Math.min(receipt.confidence, 0.85) : 0.5
  };
}

function extractFlightNumber(vendor: string, items: { name: string }[]): string {
  for (const item of items) {
    const match = item.name.match(/\b(?:6E|AI|QP|SG|IX|G8|UK|FD|I5|LH|BA|EK|SQ|QF|AA|UA)\s?\d{2,4}\b/i);
    if (match) return match[0].replace(/\s+/, " ");
  }
  const vendorMatch = vendor.match(/\b(?:6E|AI|QP|SG|IX|G8|UK|FD|I5|LH|BA|EK|SQ|QF|AA|UA)\s?\d{2,4}\b/i);
  if (vendorMatch) return vendorMatch[0].replace(/\s+/, " ");
  return "Unknown";
}

function extractRouteFromItems(items: { name: string }[]): { from: string; to: string } | null {
  for (const item of items) {
    const match = item.name.match(/\b([A-Z]{3})\s*(?:to|→|-)\s*([A-Z]{3})\b/);
    if (match) return { from: match[1], to: match[2] };
  }
  return null;
}

function extractAirportFromText(text: string): string {
  const airportMatch = text.match(/\b(DEL|BOM|BLR|MAA|CCU|HYD|GOI|COK|PAT|JAI|AMD|PNQ|TRV|IXM|GAU|SHL|IMF|BBI|VTZ|RJA|IXR|PAT|SXR|LEH|JSM|DHM)\b/i);
  return airportMatch?.[1]?.toUpperCase() ?? "DEL";
}

function extractPassengerCount(items: { name: string; quantity: number }[]): number {
  for (const item of items) {
    const match = item.name.match(/(?:passenger|pax|traveller)s?\s*:?\s*(\d+)/i);
    if (match) return parseInt(match[1]);
  }
  return 1;
}

export function getFlightAnalytics(logs: FlightLog[] = []) {
  const total = logs.reduce((sum, log) => sum + log.kgCo2e, 0);
  return {
    history: logs,
    monthlyKg: Math.round(total * 100) / 100,
    annualKg: Math.round(total * 12 * 100) / 100,
    suggestions: [
      "Compare overnight train alternatives for routes under 1,000 km.",
      "Choose economy cabin where flying is unavoidable.",
      "Offset verified unavoidable flights through certified projects."
    ]
  };
}
