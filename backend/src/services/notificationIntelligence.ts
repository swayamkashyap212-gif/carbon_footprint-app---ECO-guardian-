import { NotificationPlatform, OrderStatus } from "@prisma/client";
import OpenAI from "openai";

export type NotificationPayload = {
  packageName: string;
  title: string;
  body: string;
  timestamp: string;
};

const packageMap: Record<string, NotificationPlatform> = {
  "in.swiggy.android": "SWIGGY",
  "com.application.zomato": "ZOMATO",
  "com.grofers.customerapp": "BLINKIT",
  "com.zeptoconsumerapp": "ZEPTO",
  "in.amazon.mShop.android.shopping": "AMAZON",
  "com.flipkart.android": "FLIPKART",
  "com.ubercab": "UBER",
  "com.olacabs.customer": "OLA"
};

export async function analyzeNotification(payload: NotificationPayload): Promise<{
  platform: NotificationPlatform;
  orderStatus: OrderStatus;
  merchantName: string | null;
  restaurantName: string | null;
  storeName: string | null;
}> {
  const text = `${payload.title} ${payload.body}`.toLowerCase();
  const platform = packageMap[payload.packageName] ?? "OTHER";
  
  let merchantName = detectMerchant(text) || (platform !== "OTHER" ? platform : null);
  let restaurantName = detectRestaurant(text);
  let storeName = detectStore(text);
  
  // If OpenAI API key is set, call AI extraction
  if (process.env.NODE_ENV !== "test" && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-key") {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Extract merchant name, restaurant name, and store/warehouse name from this notification text. Return JSON only with fields: merchantName (string or null), restaurantName (string or null), storeName (string or null). Text: "${payload.title.replace(/"/g, "'")} - ${payload.body.replace(/"/g, "'")}"`
        }],
        response_format: { type: "json_object" }
      });
      const result = JSON.parse(response.choices[0].message.content || "{}");
      if (result.merchantName) merchantName = result.merchantName;
      if (result.restaurantName) restaurantName = result.restaurantName;
      if (result.storeName) storeName = result.storeName;
    } catch (err) {
      console.warn("AI extraction failed, falling back to heuristics:", err);
    }
  }

  return {
    platform,
    orderStatus: detectOrderStatus(text),
    merchantName,
    restaurantName,
    storeName
  };
}

function detectOrderStatus(text: string): OrderStatus {
  if (text.includes("confirmed") || text.includes("placed")) return "CONFIRMED";
  if (text.includes("accepted")) return "ACCEPTED";
  if (text.includes("preparing")) return "PREPARING";
  if (text.includes("rider assigned") || text.includes("driver assigned") || text.includes("delivery agent")) return "RIDER_ASSIGNED";
  if (text.includes("picked up") || text.includes("on the way")) return "PICKED_UP";
  if (text.includes("arriving") || text.includes("arrive in")) return "ARRIVING_SOON";
  if (text.includes("delivered")) return "DELIVERED";
  if (text.includes("completed") || text.includes("finished")) return "COMPLETED";
  return "UNKNOWN";
}

function detectMerchant(text: string) {
  return ["swiggy", "zomato", "blinkit", "zepto", "amazon", "flipkart", "uber", "ola"].find((name) => text.includes(name)) ?? null;
}

function detectRestaurant(text: string) {
  // Extract patterns like "from KFC", "from McDonald's"
  const match = text.match(/from\s+([a-zA-Z0-9\s']+?)(?:\s+(?:has|is|order|will)\b|$)/i);
  if (match) {
    const name = match[1].trim();
    if (!["swiggy", "zomato", "blinkit", "zepto", "amazon", "flipkart"].includes(name.toLowerCase())) {
      return name;
    }
  }
  const hardcoded = ["mcdonald", "domino", "burger king", "kfc", "subway", "haldiram"].find((name) => text.includes(name));
  return hardcoded ? hardcoded.charAt(0).toUpperCase() + hardcoded.slice(1) : null;
}

function detectStore(text: string) {
  const fromMatch = text.match(/from\s+([a-zA-Z0-9\s']+?)\s+(?:dark store|warehouse|store)/i);
  if (fromMatch) {
    const name = fromMatch[1].trim();
    return name.charAt(0).toUpperCase() + name.slice(1) + " Store";
  }
  const match = text.match(/([a-zA-Z0-9'-]+)\s+(?:dark store|warehouse|store)/i);
  if (match) {
    const name = match[1].trim();
    return name.charAt(0).toUpperCase() + name.slice(1) + " Store";
  }
  if (text.includes("blinkit")) return "Blinkit Warehouse";
  if (text.includes("zepto")) return "Zepto Dark Store";
  return null;
}
