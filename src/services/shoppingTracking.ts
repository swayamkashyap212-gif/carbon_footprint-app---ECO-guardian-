import { calculateShoppingCarbonAdvanced } from "./carbonEngine";
import { ParsedEmail } from "./gmailIntegration";
import { DeliveryPlatform, DeliveryType, ShoppingCategory, ShoppingLog } from "../types/domain";
import { extractTicketOrReceipt } from "./ocr";

export function parseShoppingEmail(email: ParsedEmail): ShoppingLog {
  const text = `${email.subject} ${email.bodyPreview}`.toLowerCase();
  const vendor = text.includes("flipkart") ? "flipkart" : text.includes("blinkit") ? "blinkit" : text.includes("bigbasket") ? "bigbasket" : "amazon";
  const category = inferShoppingCategory(text);
  const deliveryType: DeliveryType = text.includes("express") ? "express" : text.includes("grouped") ? "grouped" : "standard";
  const quantity = Number(text.match(/quantity\s?(\d+)/i)?.[1] ?? 1);
  const orderValue = Number(text.match(/rs\s?(\d+)/i)?.[1] ?? 0);
  const productName = text.includes("headphones") ? "Bluetooth headphones" : "Imported order";
  const carbon = calculateShoppingCarbonAdvanced(category, quantity, deliveryType);

  return {
    id: email.id,
    vendor,
    productName,
    category,
    quantity,
    deliveryType,
    orderValue,
    ...carbon,
    source: "gmail",
    confidence: 0.9
  };
}

export async function parseShoppingReceipt(uri: string): Promise<ShoppingLog> {
  const receipt = await extractTicketOrReceipt(uri);

  const rawVendor = receipt.vendor.toLowerCase().replace(/\s+store$/, "").trim();
  const vendor: DeliveryPlatform = ["swiggy", "zomato", "blinkit", "zepto", "instamart", "bigbasket", "amazon", "flipkart", "porter", "uber", "ola", "rapido"].includes(rawVendor) ? rawVendor as DeliveryPlatform : "other";
  const category = mapOcrCategoryToShopping(receipt.category);
  const quantity = receipt.items.reduce((sum, item) => sum + item.quantity, 0) || 1;
  const deliveryType: DeliveryType = "standard";
  const orderValue = receipt.totalAmount || 0;
  const productName = receipt.items.length > 0 ? receipt.items[0].name : "Scanned purchase";
  const carbon = calculateShoppingCarbonAdvanced(category, quantity, deliveryType);

  return {
    id: `receipt-${Date.now()}`,
    vendor,
    productName,
    category,
    quantity,
    deliveryType,
    orderValue,
    ...carbon,
    source: "manual",
    confidence: receipt.confidence > 0 ? Math.min(receipt.confidence, 0.85) : 0.5
  };
}

function mapOcrCategoryToShopping(ocrCategory: string): ShoppingCategory {
  const lower = ocrCategory.toLowerCase();
  if (lower.includes("electronics") || lower.includes("phone") || lower.includes("laptop")) return "electronics";
  if (lower.includes("fashion") || lower.includes("clothing") || lower.includes("shirt")) return "fashion";
  if (lower.includes("home") || lower.includes("appliance")) return "home_appliances";
  if (lower.includes("personal") || lower.includes("care") || lower.includes("medicine")) return "personal_care";
  if (lower.includes("food") || lower.includes("grocery")) return "grocery";
  if (lower.includes("grocery") || lower.includes("vegetable")) return "grocery";
  return "grocery";
}

export function parseShoppingSmsOrNotification(text: string): ShoppingLog {
  const category = inferShoppingCategory(text.toLowerCase());
  const deliveryType = text.toLowerCase().includes("express") ? "express" : "standard";
  const carbon = calculateShoppingCarbonAdvanced(category, 1, deliveryType);
  return {
    id: `signal-${Date.now()}`,
    vendor: text.toLowerCase().includes("zepto") ? "zepto" : "other",
    productName: "Detected purchase",
    category,
    quantity: 1,
    deliveryType,
    orderValue: 0,
    ...carbon,
    source: "notification",
    confidence: 0.72
  };
}

export function getShoppingAnalytics(logs: ShoppingLog[] = []) {
  const total = logs.reduce((sum, log) => sum + log.totalKgCo2e, 0);
  const categoryBreakdown = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.category] = Math.round(((acc[log.category] ?? 0) + log.totalKgCo2e) * 100) / 100;
    return acc;
  }, {});
  return {
    totalKg: Math.round(total * 100) / 100,
    monthlyKg: Math.round(total * 100) / 100,
    categoryBreakdown,
    topProducts: [...logs].sort((a, b) => b.totalKgCo2e - a.totalKgCo2e).slice(0, 3),
    recommendations: [
      "Group grocery orders into two delivery windows per week.",
      "Prefer local stores for urgent low-value items.",
      "Avoid express delivery unless it replaces a longer personal trip."
    ]
  };
}

function inferShoppingCategory(text: string): ShoppingCategory {
  if (text.includes("headphone") || text.includes("phone") || text.includes("laptop")) return "electronics";
  if (text.includes("shirt") || text.includes("shoe") || text.includes("fashion")) return "fashion";
  if (text.includes("appliance") || text.includes("fan") || text.includes("mixer")) return "home_appliances";
  if (text.includes("care") || text.includes("shampoo")) return "personal_care";
  if (text.includes("food")) return "food";
  return "grocery";
}
