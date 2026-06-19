import { CarbonCategory, DeliveryVehicleType } from "../types/domain";

export type PendingVehicleSelection = {
  id: string;
  platformName: string;
  orderId?: string;
  entryId: string;
  category: CarbonCategory;
  timestamp: number;
};

let pendingSelections: PendingVehicleSelection[] = [];
let selectionListeners: ((pending: PendingVehicleSelection[]) => void)[] = [];

export function addPendingVehicleSelection(
  platformName: string,
  entryId: string,
  orderId?: string,
  category: CarbonCategory = "food_delivery"
): void {
  // Deduplicate - don't add if one with same entryId already exists
  const existing = pendingSelections.find(s => s.entryId === entryId);
  if (existing) return;

  const selection: PendingVehicleSelection = {
    id: `veh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    platformName,
    orderId,
    entryId,
    category,
    timestamp: Date.now(),
  };

  pendingSelections = [...pendingSelections, selection];
  notifyListeners();
}

export function resolveVehicleSelection(
  selectionId: string,
  vehicleType: DeliveryVehicleType
): PendingVehicleSelection | null {
  const selection = pendingSelections.find((s) => s.id === selectionId);
  if (!selection) return null;

  pendingSelections = pendingSelections.filter((s) => s.id !== selectionId);
  notifyListeners();

  return selection;
}

export function skipVehicleSelection(selectionId: string): void {
  pendingSelections = pendingSelections.filter((s) => s.id !== selectionId);
  notifyListeners();
}

export function getNextPendingSelection(): PendingVehicleSelection | null {
  return pendingSelections[0] ?? null;
}

export function getPendingSelections(): PendingVehicleSelection[] {
  return [...pendingSelections];
}

export function onPendingSelectionsChange(
  listener: (pending: PendingVehicleSelection[]) => void
): () => void {
  selectionListeners.push(listener);
  return () => {
    selectionListeners = selectionListeners.filter((l) => l !== listener);
  };
}

function notifyListeners(): void {
  selectionListeners.forEach((l) => {
    try {
      l(pendingSelections);
    } catch {}
  });
}

export function mapVehicleIdToType(vehicleId: string): DeliveryVehicleType {
  const mapping: Record<string, DeliveryVehicleType> = {
    bicycle: "CYCLE",
    electric_bike: "ELECTRIC_BIKE",
    petrol_bike: "PETROL_BIKE",
    auto_rickshaw: "AUTO_RICKSHAW",
    ev_car: "EV_CAR",
    petrol_car: "PETROL_CAR",
    van: "VAN",
    walking: "WALKING",
  };
  return mapping[vehicleId] ?? "UNKNOWN";
}
