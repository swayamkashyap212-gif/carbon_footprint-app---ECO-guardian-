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
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  let provider = "Unknown Provider";
  let region = "india";
  for (const p of electricityProviders) {
    if (p.keywords.some(kw => lower.includes(kw))) {
      provider = p.name;
      region = p.region;
      break;
    }
  }

  // Units consumed - multiple patterns for Indian electricity bills
  let unitsConsumed = 0;

  // Pattern 1: "214 units" or "214 Units" or "214 UNITS"
  const unitsPattern1 = text.match(/(\d+)\s*(?:units?|kwh|k\.?w\.?h\.?|unit)/i);
  // Pattern 2: "Units Consumed: 214" or "Total Units: 214"
  const unitsPattern2 = text.match(/(?:units?\s*(?:consumed|used|supplied|billed|total)|total\s*units?|consumption)[:\s]*(\d+)/i);
  // Pattern 3: "Sanctioned Load" line followed by units in next lines
  const unitsPattern3 = text.match(/(?:energy|electricity)\s*(?:consumed|used|billed)[:\s]*(\d+)/i);
  // Pattern 4: Look for standalone numbers near "kWh" or "unit" keywords in lines
  let unitsPattern5: RegExpMatchArray | null = null;
  for (const line of lines) {
    const lineMatch = line.match(/(\d{2,5})\s*(?:units?|kwh)/i);
    if (lineMatch && parseInt(lineMatch[1]) > 0 && parseInt(lineMatch[1]) < 100000) {
      unitsPattern5 = lineMatch;
      break;
    }
  }
  // Pattern 5: "Current Reading" - "Previous Reading" = units
  const currentReading = text.match(/(?:current|present|final)\s*(?:reading|mtr|meter)[:\s]*(\d+)/i);
  const prevReading = text.match(/(?:previous|prev|old|initial)\s*(?:reading|mtr|meter)[:\s]*(\d+)/i);
  if (currentReading && prevReading) {
    const diff = parseInt(currentReading[1]) - parseInt(prevReading[1]);
    if (diff > 0 && diff < 100000) unitsConsumed = diff;
  }

  if (unitsConsumed === 0) {
    unitsConsumed = unitsPattern1 ? parseInt(unitsPattern1[1])
      : unitsPattern2 ? parseInt(unitsPattern2[1])
      : unitsPattern3 ? parseInt(unitsPattern3[1])
      : unitsPattern5 ? parseInt(unitsPattern5[1])
      : 0;
  }

  // Bill amount - multiple patterns
  const amountPattern1 = text.match(/(?:total\s*(?:amount|bill|payable|due)|amount\s*(?:payable|due|charged)|net\s*(?:amount|payable)|grand\s*total)[:\s]*[₹Rs.]*\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  const amountPattern2 = text.match(/₹\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:only|\/-)?/);
  const amountPattern3 = text.match(/(?:Rs\.?|INR)\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  let billAmount = 0;
  if (amountPattern1) {
    billAmount = parseFloat(amountPattern1[1].replace(/,/g, ""));
  } else if (amountPattern2) {
    billAmount = parseFloat(amountPattern2[1].replace(/,/g, ""));
  } else if (amountPattern3) {
    billAmount = parseFloat(amountPattern3[1].replace(/,/g, ""));
  }

  // Billing period
  const periodPattern1 = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s\-]*(\d{4})/i);
  const periodPattern2 = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  const periodPattern3 = text.match(/(?:bill(?:ing)?\s*(?:period|date|for)|period\s*(?:of|from))[:\s]*(.+?)(?:\n|$)/i);
  let billingPeriod = "";
  if (periodPattern1) {
    billingPeriod = `${periodPattern1[1]} ${periodPattern1[2]}`;
  } else if (periodPattern2) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = parseInt(periodPattern2[2]) - 1;
    billingPeriod = `${monthNames[monthIdx] || periodPattern2[2]} ${periodPattern2[3]}`;
  } else if (periodPattern3) {
    billingPeriod = periodPattern3[1].trim().slice(0, 30);
  }
  if (!billingPeriod) {
    billingPeriod = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  }

  const confidence = (unitsConsumed > 0 && billAmount > 0) ? 0.9
    : (unitsConsumed > 0 || billAmount > 0) ? 0.6
    : 0.3;

  return {
    provider,
    unitsConsumed,
    billAmount,
    billingPeriod,
    region,
    confidence
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
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Vendor detection - multiple patterns
  let vendor = "Unknown vendor";
  const vendorPatterns = [
    /(?:from|store|shop|restaurant|merchant|sold\s*by|billed\s*by|invoice\s*from)[:\s]*([A-Z][a-zA-Z\s&'.]+?)(?:\n|$|,)/i,
    /^([A-Z][A-Z\s&'.]{3,40})$/m,
    /(?:m\/s|messrs?\.?)\s*([A-Z][a-zA-Z\s&'.]+)/i,
  ];
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match) { vendor = match[1].trim(); break; }
  }
  // Check for known vendor names
  const knownVendors = ["amazon", "flipkart", "swiggy", "zomato", "blinkit", "zepto", "bigbasket", "reliance", "dmart", "big bazaar", "more", "spencer", "nilgiris", "freshToHome", "jiomart", "myntra", "ajio", "nykaa", "tata cliq", "croma", "vijay sales", "reliance digital"];
  for (const kv of knownVendors) {
    if (lower.includes(kv)) { vendor = kv.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "); break; }
  }

  // Items extraction - improved patterns
  const items: { name: string; quantity: number; price: number }[] = [];

  // Pattern 1: Lines with price indicators
  const priceIndicators = /[₹Rs.]\s*\d+|\d+\s*(?:rs|inr)|@\s*\d+|\d+\s*x\s*\d+/i;
  const itemLines = lines.filter(line => priceIndicators.test(line) && line.length > 3);

  for (const line of itemLines.slice(0, 15)) {
    // Pattern A: "Item Name 2 x 150 = 300" or "Item Name 2 x ₹150"
    const patternA = line.match(/^(.+?)\s+(\d+)\s*[x×*]\s*[₹Rs.]?\s*(\d+(?:\.\d+)?)\s*(?:=\s*[₹Rs.]?\s*(\d+(?:\.\d+)?))?/i);
    // Pattern B: "Item Name ₹150" or "Item Name Rs.150"
    const patternB = line.match(/^(.+?)\s+[₹Rs.]\s*(\d+(?:\.\d+)?)\s*$/i);
    // Pattern C: "Item Name 150.00" (no currency symbol)
    const patternC = line.match(/^([a-zA-Z][\w\s&'.]+?)\s+(\d{1,6}(?:\.\d{1,2})?)\s*(?:\/-|only)?\s*$/i);
    // Pattern D: "150.00 Item Name" (price first)
    const patternD = line.match(/^[₹Rs.]?\s*(\d+(?:\.\d+)?)\s+([a-zA-Z][\w\s&'.]+?)$/i);
    // Pattern E: "Qty: 2 Item: Name Price: 150"
    const patternE = line.match(/(?:qty|quantity)[:\s]*(\d+).*?(?:item|product|name)[:\s]*(.+?).*?(?:price|rate|amt|amount)[:\s]*[₹Rs.]?\s*(\d+(?:\.\d+)?)/i);

    let name = "", qty = 1, price = 0;

    if (patternA) {
      name = patternA[1].trim();
      qty = parseInt(patternA[2]) || 1;
      price = parseFloat(patternA[4] || patternA[3]) || 0;
    } else if (patternE) {
      name = patternE[2].trim();
      qty = parseInt(patternE[1]) || 1;
      price = parseFloat(patternE[3]) || 0;
    } else if (patternB) {
      name = patternB[1].trim();
      price = parseFloat(patternB[2]) || 0;
    } else if (patternD) {
      name = patternD[2].trim();
      price = parseFloat(patternD[1]) || 0;
    } else if (patternC) {
      name = patternC[1].trim();
      price = parseFloat(patternC[2]) || 0;
    }

    if (name && price > 0 && name.length > 1 && name.length < 60) {
      // Clean up name - remove common prefixes/suffixes
      name = name.replace(/^( item| product| description| particulars?|s\.?no\.?|sn\.?|\.|\d+\.)[:\s]*/i, "").trim();
      if (name.length > 1) {
        items.push({ name, quantity: qty, price: price * qty });
      }
    }
  }

  // Pattern 2: Table format with tab/multiple spaces
  if (items.length === 0) {
    const tableLines = lines.filter(line => /\t/.test(line) || /\s{3,}/.test(line));
    for (const line of tableLines.slice(0, 10)) {
      const parts = line.split(/\t+|\s{3,}/).filter(Boolean);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const priceMatch = lastPart.match(/[₹Rs.]?\s*(\d+(?:\.\d+)?)/);
        if (priceMatch) {
          const name = parts.slice(0, -1).join(" ").trim();
          const qtyMatch = name.match(/(\d+)\s*[x×*]/i);
          if (name.length > 1 && name.length < 60) {
            items.push({
              name: name.replace(/\d+\s*[x×*]\s*\d+/i, "").trim(),
              quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
              price: parseFloat(priceMatch[1])
            });
          }
        }
      }
    }
  }

  // Total amount extraction - multiple patterns
  const totalPatterns = [
    /(?:grand\s*total|total\s*(?:amount|payable|due|cost|value)|net\s*(?:amount|total|payable)|amount\s*(?:payable|due|charged)|bill\s*(?:amount|total)|you\s*(?:paid|pay)|payable)[:\s]*[₹Rs.]*\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /(?:total)[:\s]*[₹Rs.]*\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /₹\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:only|\/-)?(?:\s*$|\s*\n)/im,
  ];
  let totalAmount = 0;
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      totalAmount = parseFloat(match[1].replace(/,/g, ""));
      if (totalAmount > 0) break;
    }
  }

  // Date extraction
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i,
    /(?:date|dated|order\s*date|invoice\s*date)[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
  ];
  let date = new Date().toISOString().slice(0, 10);
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === datePatterns[2]) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIdx = monthNames.findIndex(m => match[2].toLowerCase().startsWith(m.toLowerCase()));
        date = `${match[3]}-${String(monthIdx + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
      } else if (pattern === datePatterns[1]) {
        date = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
      } else {
        const yr = match[3].length === 2 ? `20${match[3]}` : match[3];
        date = `${yr}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
      }
      break;
    }
  }

  // Category inference
  let category = "other";
  const categoryKeywords: [string[], string][] = [
    [["food", "restaurant", "meal", "cafe", "pizza", "burger", "biryani", "dosa", "thali", "snack", "beverage", "drink", "tea", "coffee"], "food"],
    [["grocery", "vegetable", "fruit", "rice", "dal", "oil", "spice", "atta", "sugar", "salt", "milk", "bread", "egg", "meat", "fish", "chicken"], "grocery"],
    [["electronics", "phone", "laptop", "mobile", "tablet", "charger", "cable", "headphone", "earphone", "speaker", "tv", "monitor"], "electronics"],
    [["clothing", "fashion", "shirt", "pant", "dress", "shoe", "saree", "kurti", "jeans", "t-shirt", "jacket"], "fashion"],
    [["medicine", "pharmacy", "drug", "tablet", "capsule", "syrup", "medical", "health"], "medicine"],
    [["furniture", "table", "chair", "sofa", "bed", "mattress", "shelf", "cupboard"], "furniture"],
    [["beauty", "cosmetic", "cream", "lotion", "shampoo", "soap", "perfume", "makeup"], "beauty"],
    [["book", "novel", "textbook", "notebook", "pen", "pencil", "stationery"], "books"],
    [["sport", "gym", "fitness", "yoga", "cricket", "football", "badminton"], "sports"],
  ];
  for (const [keywords, cat] of categoryKeywords) {
    if (keywords.some(kw => lower.includes(kw))) { category = cat; break; }
  }

  const finalAmount = totalAmount > 0 ? totalAmount : items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const confidence = items.length > 0 ? (totalAmount > 0 ? 0.9 : 0.75) : (totalAmount > 0 ? 0.6 : 0.3);

  return {
    vendor,
    category,
    items,
    totalAmount: Math.round(finalAmount * 100) / 100,
    date,
    confidence
  };
}
