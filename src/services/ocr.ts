import { Platform } from "react-native";

let FileSystem: typeof import("expo-file-system") | null = null;
if (Platform.OS !== "web") {
  try {
    FileSystem = require("expo-file-system");
  } catch {
    // expo-file-system not available on web
  }
}

async function readFileAsBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  if (!FileSystem) return "";
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64
  });
}

export type BillExtraction = {
  provider: string;
  unitsConsumed: number;
  billAmount: number;
  billingPeriod: string;
  region: string;
  confidence: number;
};

export type ReceiptExtraction = {
  vendor: string;
  category: string;
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  date: string;
  confidence: number;
};

const electricityProviders = [
  { name: "BSES Rajdhani", keywords: ["bses", "rajdhani"], region: "delhi" },
  { name: "BSES Yamuna", keywords: ["bses", "yamuna"], region: "delhi" },
  { name: "Tata Power Delhi", keywords: ["tata power", "tpddl"], region: "delhi" },
  { name: "Adani Electricity", keywords: ["adani"], region: "maharashtra" },
  { name: "MSEDCL", keywords: ["msedcl", "mahadiscom"], region: "maharashtra" },
  { name: "BESCOM", keywords: ["bescom"], region: "karnataka" },
  { name: "TANGEDCO", keywords: ["tangedco", "tneb"], region: "tamil_nadu" },
  { name: "PGVCL", keywords: ["pgvcl"], region: "gujarat" },
  { name: "JPVNL", keywords: ["jpvnl"], region: "rajasthan" },
  { name: "MVVNL", keywords: ["mvvnl"], region: "uttar_pradesh" }
];

export async function extractElectricityBill(uri: string): Promise<BillExtraction> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    console.warn("[OCR] Google Vision API key not configured. Set EXPO_PUBLIC_GOOGLE_VISION_API_KEY in .env");
    return emptyBillExtraction();
  }

  try {
    const base64 = await readFileAsBase64(uri);
    if (!base64) return emptyBillExtraction();

    const result = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }]
        }]
      })
    });

    const data = await result.json();
    const ocrText = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
    if (ocrText) return parseElectricityBillText(ocrText);
  } catch (err) {
    console.warn("[OCR] Bill extraction failed:", err);
  }

  return emptyBillExtraction();
}

function emptyBillExtraction(): BillExtraction {
  return {
    provider: "Unknown Provider",
    unitsConsumed: 0,
    billAmount: 0,
    billingPeriod: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
    region: "india",
    confidence: 0
  };
}

function parseElectricityBillText(text: string): BillExtraction {
  const lower = text.toLowerCase();

  let provider = "Unknown Provider";
  let region = "india";
  for (const p of electricityProviders) {
    if (p.keywords.some(kw => lower.includes(kw))) {
      provider = p.name;
      region = p.region;
      break;
    }
  }

  const unitsMatch = text.match(/(\d+)\s*(?:units?|kwh|unit)/i);
  const amountMatch = text.match(/(?:total|amount|bill)[:\s]*[₹Rs.]*\s*(\d+(?:\.\d+)?)/i);
  const periodMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/i);

  return {
    provider,
    unitsConsumed: unitsMatch ? parseInt(unitsMatch[1]) : 0,
    billAmount: amountMatch ? parseFloat(amountMatch[1]) : 0,
    billingPeriod: periodMatch ? `${periodMatch[1]} ${periodMatch[2]}` : new Date().toLocaleString("default", { month: "long", year: "numeric" }),
    region,
    confidence: (unitsMatch && amountMatch) ? 0.9 : 0.5
  };
}

async function performOcrOnImage(uri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    console.warn("[OCR] Google Vision API key not configured. Set EXPO_PUBLIC_GOOGLE_VISION_API_KEY in .env");
    return "";
  }

  try {
    const base64 = await readFileAsBase64(uri);
    if (!base64) return "";

    const result = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: "TEXT_DETECTION", maxResults: 1 }]
        }]
      })
    });

    const data = await result.json();
    return data.responses?.[0]?.fullTextAnnotation?.text ?? "";
  } catch {
    return "";
  }
}

export async function extractTicketOrReceipt(uri: string): Promise<ReceiptExtraction> {
  try {
    const ocrText = await performOcrOnImage(uri);
    if (ocrText) return parseReceiptText(ocrText);
  } catch {
    // Fall through
  }

  return {
    vendor: "Scanned document",
    category: "unknown",
    items: [],
    totalAmount: 0,
    date: new Date().toISOString().slice(0, 10),
    confidence: 0
  };
}

function parseReceiptText(text: string): ReceiptExtraction {
  const lower = text.toLowerCase();

  let vendor = "Unknown vendor";
  const vendorPatterns = [
    /(?:from|store|shop|restaurant|merchant)[:\s]*([A-Z][a-zA-Z\s&]+)/i,
    /^([A-Z][A-Z\s&]{3,30})$/m
  ];
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match) { vendor = match[1].trim(); break; }
  }

  const items: { name: string; quantity: number; price: number }[] = [];
  const itemLines = text.split("\n").filter(line => line.match(/[₹Rs.]\s*\d+/));
  for (const line of itemLines.slice(0, 10)) {
    const priceMatch = line.match(/[₹Rs.]*\s*(\d+(?:\.\d+)?)/);
    const qtyMatch = line.match(/(\d+)\s*x/i);
    const nameMatch = line.match(/^([\w\s]+?)(?:\s*\d+\s*x|\s*[₹Rs.])/i);
    if (priceMatch) {
      items.push({
        name: nameMatch?.[1]?.trim() ?? "Item",
        quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
        price: parseFloat(priceMatch[1])
      });
    }
  }

  const totalMatch = text.match(/(?:total|grand total|amount)[:\s]*[₹Rs.]*\s*(\d+(?:\.\d+)?)/i);
  const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);

  let category = "other";
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("meal")) category = "food";
  else if (lower.includes("grocery") || lower.includes("vegetable") || lower.includes("fruit")) category = "grocery";
  else if (lower.includes("electronics") || lower.includes("phone") || lower.includes("laptop")) category = "electronics";
  else if (lower.includes("clothing") || lower.includes("fashion") || lower.includes("shirt")) category = "fashion";
  else if (lower.includes("medicine") || lower.includes("pharmacy") || lower.includes("drug")) category = "medicine";

  return {
    vendor,
    category,
    items,
    totalAmount: totalMatch ? parseFloat(totalMatch[1]) : items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    date: dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}` : new Date().toISOString().slice(0, 10),
    confidence: items.length > 0 ? 0.85 : 0.5
  };
}
