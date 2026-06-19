export type GmailConnection = {
  connected: boolean;
  scopes: string[];
  connectedEmail?: string;
  message?: string;
};

export type ParsedEmail = {
  id: string;
  from: string;
  subject: string;
  bodyPreview: string;
  receivedAt: string;
};

export const flightSenders = [
  "indigo", "air india", "akasa", "spicejet", "vistara",
  "makemytrip", "cleartrip", "easemytrip", "yatra", "goibibo"
];

export const foodSenders = [
  "swiggy", "zomato", "foodpanda"
];

export const shoppingSenders = [
  "amazon", "flipkart", "blinkit", "zepto", "swiggy instamart",
  "bigbasket", "jiomart", "meesho"
];

export const rideSenders = [
  "uber", "ola", "rapido"
];

export const utilitySenders = [
  "bses", "tata power", "adani electricity", "mseb", "bescom",
  "tangedco", "pgvcl", "android electricity"
];

export const travelSenders = [
  "irctc", "redbus", "olacabs", "uber", "make my trip"
];

export async function connectGmail(): Promise<GmailConnection> {
  return {
    connected: false,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    message: `Gmail integration requires backend configuration with Google OAuth credentials.\n\nSupported senders:\n\nTravel: ${flightSenders.join(", ")}\nFood: ${foodSenders.join(", ")}\nShopping: ${shoppingSenders.join(", ")}\nRide: ${rideSenders.join(", ")}\nUtility: ${utilitySenders.join(", ")}\n\nYou can also scan tickets and receipts directly using the Scan buttons.`
  };
}

export async function fetchFlightEmails(): Promise<ParsedEmail[]> {
  console.warn("[GmailIntegration] Gmail API fetch requires backend Google OAuth setup. Use scan ticket instead.");
  return [];
}

export async function fetchShoppingEmails(): Promise<ParsedEmail[]> {
  console.warn("[GmailIntegration] Gmail API fetch requires backend Google OAuth setup. Use scan receipt instead.");
  return [];
}

export async function fetchFoodDeliveryEmails(): Promise<ParsedEmail[]> {
  console.warn("[GmailIntegration] Gmail API fetch requires backend Google OAuth setup.");
  return [];
}

export async function fetchRideEmails(): Promise<ParsedEmail[]> {
  console.warn("[GmailIntegration] Gmail API fetch requires backend Google OAuth setup.");
  return [];
}

export async function fetchUtilityBillEmails(): Promise<ParsedEmail[]> {
  console.warn("[GmailIntegration] Gmail API fetch requires backend Google OAuth setup. Use scan bill instead.");
  return [];
}

export function classifyEmailSender(from: string): "flight" | "food" | "shopping" | "ride" | "utility" | "other" {
  const lower = from.toLowerCase();
  if (flightSenders.some(s => lower.includes(s))) return "flight";
  if (foodSenders.some(s => lower.includes(s))) return "food";
  if (shoppingSenders.some(s => lower.includes(s))) return "shopping";
  if (rideSenders.some(s => lower.includes(s))) return "ride";
  if (utilitySenders.some(s => lower.includes(s))) return "utility";
  return "other";
}

export function parseFoodDeliveryEmail(email: ParsedEmail) {
  const text = `${email.subject} ${email.bodyPreview}`;
  const platform = text.toLowerCase().includes("swiggy") ? "swiggy" : text.toLowerCase().includes("zomato") ? "zomato" : "other";
  const restaurantMatch = text.match(/from\s+([A-Z][a-zA-Z\s&]+)/i);
  const restaurant = restaurantMatch?.[1]?.trim() ?? "Unknown Restaurant";
  const amountMatch = text.match(/(?:total|amount|paid)[:\s]*[₹Rs.]*\s*(\d+(?:\.\d+)?)/i);
  const orderValue = amountMatch ? parseFloat(amountMatch[1]) : 0;
  const itemsMatch = text.match(/items?:?\s*(.+)/i);
  const items = itemsMatch?.[1]?.split(",").map(i => i.trim()).slice(0, 5) ?? [];

  return {
    id: email.id,
    platform,
    restaurant,
    orderValue,
    items,
    isVegetarian: text.toLowerCase().includes("veg") || text.toLowerCase().includes("paneer") || text.toLowerCase().includes("dal"),
    source: "gmail" as const,
    confidence: 0.85
  };
}

export function parseShoppingEmail(email: ParsedEmail) {
  const text = `${email.subject} ${email.bodyPreview}`;
  const platform = shoppingSenders.find(s => text.toLowerCase().includes(s)) ?? "other";
  const orderMatch = text.match(/order\s*(?:id|number|#)?\s*:?\s*([a-z0-9\-]+)/i);
  const amountMatch = text.match(/(?:total|amount|paid)[:\s]*[₹Rs.]*\s*(\d+(?:\.\d+)?)/i);
  const itemsMatch = text.match(/items?:?\s*(.+)/i);
  const items = itemsMatch?.[1]?.split(",").map(i => i.trim()).slice(0, 10) ?? [];

  return {
    id: email.id,
    platform,
    orderId: orderMatch?.[1],
    orderValue: amountMatch ? parseFloat(amountMatch[1]) : 0,
    items,
    source: "gmail" as const,
    confidence: 0.85
  };
}

export function parseRideEmail(email: ParsedEmail) {
  const text = `${email.subject} ${email.bodyPreview}`;
  const platform = rideSenders.find(s => text.toLowerCase().includes(s)) ?? "other";
  const pickupMatch = text.match(/(?:pickup|from|pickup\s*location)[:\s]*(.+?)(?:\s*to|\s*drop|\n)/i);
  const dropMatch = text.match(/(?:drop|to|destination)[:\s]*(.+?)(?:\s*fare|\s*total|\n)/i);
  const fareMatch = text.match(/(?:fare|total|amount|paid)[:\s]*[₹Rs.]*\s*(\d+(?:\.\d+)?)/i);
  const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer)/i);

  return {
    id: email.id,
    platform,
    pickup: pickupMatch?.[1]?.trim() ?? "Unknown",
    drop: dropMatch?.[1]?.trim() ?? "Unknown",
    fare: fareMatch ? parseFloat(fareMatch[1]) : 0,
    distanceKm: distanceMatch ? parseFloat(distanceMatch[1]) : 0,
    source: "gmail" as const,
    confidence: 0.85
  };
}

export function parseUtilityBillEmail(email: ParsedEmail) {
  const text = `${email.subject} ${email.bodyPreview}`;
  const provider = utilitySenders.find(s => text.toLowerCase().includes(s)) ?? "Unknown Provider";
  const unitsMatch = text.match(/(\d+)\s*(?:units?|kwh)/i);
  const amountMatch = text.match(/(?:amount|bill|total)[:\s]*[₹Rs.]*\s*(\d+(?:\.\d+)?)/i);
  const periodMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/i);

  return {
    id: email.id,
    provider,
    units: unitsMatch ? parseInt(unitsMatch[1]) : 0,
    amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
    period: periodMatch ? `${periodMatch[1]} ${periodMatch[2]}` : new Date().toLocaleString("default", { month: "long", year: "numeric" }),
    source: "gmail" as const,
    confidence: 0.85
  };
}
