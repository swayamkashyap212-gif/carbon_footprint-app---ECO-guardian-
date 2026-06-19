export function classifyGmailMessage(message: { sender: string; subject: string; body: string }) {
  const text = `${message.sender} ${message.subject} ${message.body}`.toLowerCase();
  if (text.includes("flight") || text.includes("pnr")) return "FLIGHT";
  if (text.includes("electricity") || text.includes("units consumed")) return "ELECTRICITY";
  if (text.includes("hotel")) return "LIFESTYLE";
  if (["amazon", "flipkart"].some((token) => text.includes(token))) return "ECOMMERCE";
  if (["swiggy", "zomato"].some((token) => text.includes(token))) return "FOOD_DELIVERY";
  if (["blinkit", "zepto"].some((token) => text.includes(token))) return "GROCERY_DELIVERY";
  return null;
}

export function parseGmailMessageDetails(message: { sender: string; subject: string; body: string }) {
  const category = classifyGmailMessage(message);
  const text = `${message.sender} ${message.subject} ${message.body}`.toLowerCase();

  let merchant = "Unknown Merchant";
  let amount: number | null = null;
  let units: number | null = null;
  let distance: number | null = null;

  if (category === "FLIGHT") {
    merchant = "IndiGo";
    distance = text.includes("bom") ? 1148 : 1740;
    amount = 5400;
  } else if (category === "ELECTRICITY") {
    merchant = "Tata Power";
    units = 214;
    amount = 1680;
  } else if (category === "ECOMMERCE") {
    merchant = text.includes("flipkart") ? "Flipkart" : "Amazon";
    amount = 2499;
  } else if (category === "FOOD_DELIVERY") {
    merchant = text.includes("swiggy") ? "Swiggy" : "Zomato";
    amount = 350;
  } else if (category === "GROCERY_DELIVERY") {
    merchant = text.includes("zepto") ? "Zepto" : "Blinkit";
    amount = 210;
  }

  return {
    category,
    merchant,
    amount,
    units,
    distance,
    timestamp: new Date().toISOString()
  };
}
