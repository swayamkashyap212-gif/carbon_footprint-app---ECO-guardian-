import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const FETCH_TIMEOUT = 8000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function isBackendAvailable(): boolean {
  return Boolean(API_BASE_URL && API_BASE_URL !== "" && !API_BASE_URL.includes("localhost"));
}

export async function getBackend<TResponse>(path: string, token: string): Promise<TResponse> {
  if (!isBackendAvailable()) {
    throw new Error("Backend API not configured. Running in offline mode.");
  }
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Backend GET ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function postBackend<TResponse>(path: string, token: string, body: unknown): Promise<TResponse> {
  if (!isBackendAvailable()) {
    throw new Error("Backend API not configured. Running in offline mode.");
  }
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Backend POST ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function getBackendDashboard(token: string) {
  return getBackend<{
    todayCarbon: number;
    monthlyCarbon: number;
    ecoScore: { score: number; band: string };
    categoryBreakdown: Record<string, number>;
    foodDeliveryCarbon: number;
    groceryDeliveryCarbon: number;
    totalDistanceKm: number;
    vehicleBreakdown: Record<string, number>;
    monthlyTrends: { month: string; carbon: number }[];
    frequentMerchants: { merchantName: string; category: string; count: number }[];
    activeRecommendations: any[];
    recentAlerts: any[];
    aiInsights: string[];
  }>("/carbon/dashboard", token);
}

export async function syncNotificationEvent(token: string, event: { packageName: string; title: string; body: string; timestamp: string }) {
  return postBackend<{
    event: any;
    order: any;
    carbonRecord: any;
    alert: any;
    recommendations: any[];
  }>("/notifications/events", token, event);
}

export async function updateOrderVehicle(token: string, orderId: string, vehicleType: string) {
  return postBackend<{ order: any; carbonRecord: any }>(`/orders/${orderId}/vehicle`, token, { vehicleType });
}

export async function updateUserPreferences(
  token: string,
  payload: {
    preferences?: Record<string, any>;
    home?: { lat: number; lng: number };
    office?: { lat: number; lng: number };
  }
) {
  return postBackend<{ success: boolean; profile: any }>("/users/preferences", token, payload);
}

export async function deleteUserData(token: string) {
  return postBackend<{ success: boolean; message: string }>("/users/delete-data", token, {});
}

export async function exportUserData(token: string) {
  return postBackend<{ userId: string; exportDate: string; data: any }>("/users/export-data", token, {});
}

export async function calculateBackendDeliveryCarbon(
  token: string,
  payload: { category: string; distanceKm: number; vehicleType: string; orderId?: string }
) {
  return postBackend<{ record: any; recommendations: any[] }>("/carbon/delivery/calculate", token, payload);
}

export async function generateBackendPrediction(token: string) {
  return postBackend<{
    id: string;
    dailyCarbonKg: number;
    weeklyCarbonKg: number;
    monthlyCarbonKg: number;
    expectedFoodDeliveries: number;
    expectedGroceryOrders: number;
    expectedShoppingActivities: number;
    futureFootprintKg: number;
    confidence: number;
    modelVersion: string;
    drivers: any[];
  }>("/predictions/generate", token, {});
}

async function uriToFormData(uri: string, fieldName: string, fileName: string): Promise<FormData> {
  const formData = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, fileName);
  } else {
    formData.append(fieldName, {
      uri,
      name: fileName,
      type: "application/octet-stream",
    } as any);
  }
  return formData;
}

export async function uploadScreenshot(token: string, fileUri: string) {
  if (!isBackendAvailable()) throw new Error("Backend API not configured.");
  const formData = await uriToFormData(fileUri, "file", "screenshot.jpg");

  const response = await fetchWithTimeout(`${API_BASE_URL}/uploads/screenshot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error("Screenshot upload failed");
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function uploadPdf(token: string, fileUri: string) {
  if (!isBackendAvailable()) throw new Error("Backend API not configured.");
  const formData = await uriToFormData(fileUri, "file", "document.pdf");

  const response = await fetchWithTimeout(`${API_BASE_URL}/uploads/pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error("PDF upload failed");
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function analyzeGmailMessage(token: string, message: { messageHash: string; sender: string; subject: string; body: string }) {
  return postBackend<{ id: string; category: string; extracted: any }>("/gmail/messages/analyze", token, message);
}

export type RecommendationCard = {
  id: string;
  category: string | null;
  title: string;
  description: string;
  reason: string;
  priorityScore: number;
  impactScore: number;
  confidence: number;
  adoptionProbability: number;
  carbonSaving: number;
  costSaving: number;
  timeSavingMin: number;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  status: "active" | "accepted" | "completed";
  metadata: Record<string, unknown>;
  deduplicationHash: string;
  expiresAt: string | null;
  createdAt: string | null;
};

export type RecommendationDashboard = {
  generatedAt: string;
  predictions: {
    dailyCarbonKg: number;
    weeklyCarbonKg: number;
    monthlyCarbonKg: number;
    futureFootprintKg: number;
    confidence: number;
    modelVersion: string;
    drivers: { category: string; kg: number }[];
  };
  behaviorSummary: {
    orderCount: number;
    foodOrders: number;
    groceryOrders: number;
    shoppingOrders: number;
    flightCount: number;
    transportEntries: number;
    electricityEntries: number;
    lateNightOrders: number;
    peakOrderHour: number | null;
    recurringMerchant: string | null;
    averageOrderValue: number;
  };
  hotspots: { category: string; kg: number; share: number }[];
  insights: string[];
  recommendations: RecommendationCard[];
  learning: {
    shown: number;
    clicked: number;
    ignored: number;
    adopted: number;
    completed: number;
    adoptionRate: number;
    completionRate: number;
  };
  coachSummary: string;
};

export async function getRecommendationDashboard(token: string) {
  return getBackend<RecommendationDashboard>("/recommendations/dashboard", token);
}

export async function generateRecommendationDashboard(
  token: string,
  payload?: { limit?: number; trigger?: string; environmental?: { weather?: string; temperature?: number; traffic?: number; airQuality?: number; season?: string } }
) {
  return postBackend<RecommendationDashboard>("/recommendations/generate", token, payload ?? {});
}

export async function sendRecommendationFeedback(
  token: string,
  payload: { recommendationId: string; eventType: "SHOWN" | "CLICKED" | "IGNORED" | "ADOPTED" | "COMPLETED" | "DISMISSED"; note?: string; context?: Record<string, unknown> }
) {
  return postBackend<RecommendationCard>("/recommendations/feedback", token, payload);
}

export async function askBackendCoach(
  token: string,
  payload: {
    messages: { role: "user" | "assistant"; content: string }[];
    environmental?: { weather?: string; temperature?: number; traffic?: number; airQuality?: number; season?: string };
  }
) {
  return postBackend<{ role: "assistant"; content: string }>("/recommendations/coach", token, payload);
}
