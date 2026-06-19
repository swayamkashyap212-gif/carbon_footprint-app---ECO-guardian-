import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { VehicleTypePrompt, VehicleOption, VEHICLE_OPTIONS } from "../components/VehicleTypePrompt";
import {
  PendingVehicleSelection,
  getNextPendingSelection,
  resolveVehicleSelection,
  skipVehicleSelection,
  onPendingSelectionsChange,
  mapVehicleIdToType,
} from "../services/vehicleSelection";
import { useAppStore } from "../store/useAppStore";
import { generateSmartAlerts } from "../services/smartAlertEngine";
import { scheduleCarbonAlert } from "../services/notifications";

type VehicleSelectionContextType = {
  pendingCount: number;
};

const VehicleSelectionContext = createContext<VehicleSelectionContextType>({ pendingCount: 0 });

export function useVehicleSelection() {
  return useContext(VehicleSelectionContext);
}

export function VehicleSelectionProvider({ children }: { children: ReactNode }) {
  const [currentSelection, setCurrentSelection] = useState<PendingVehicleSelection | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const currentSelectionRef = useRef<PendingVehicleSelection | null>(null);

  useEffect(() => {
    currentSelectionRef.current = currentSelection;
  }, [currentSelection]);

  useEffect(() => {
    const unsub = onPendingSelectionsChange((pending) => {
      setPendingCount(pending.length);
      if (!currentSelectionRef.current && pending.length > 0) {
        setCurrentSelection(pending[0]);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const selection = getNextPendingSelection();
    if (selection && !currentSelection) {
      setCurrentSelection(selection);
    }
  }, [pendingCount, currentSelection]);

  const handleSelect = useCallback(
    (vehicle: VehicleOption) => {
      if (!currentSelection) return;

      const store = useAppStore.getState();
      const vehicleType = mapVehicleIdToType(vehicle.id);
      const entry = store.entries.find(e => e.id === currentSelection.entryId);

      let distanceKm = (entry?.metadata?.distanceKm as number) || 0;
      if (!distanceKm) {
        const foodDel = store.foodDeliveries.find(f => `fd-${f.id}` === currentSelection.entryId || f.id === currentSelection.entryId);
        if (foodDel) distanceKm = foodDel.distanceKm;
      }
      if (!distanceKm) {
        const groceryDel = store.groceryDeliveries.find(g => `gd-${g.id}` === currentSelection.entryId || g.id === currentSelection.entryId);
        if (groceryDel) distanceKm = groceryDel.distanceKm;
      }
      if (!distanceKm) {
        const ride = store.rideBookings.find(r => `rb-${r.id}` === currentSelection.entryId || r.id === currentSelection.entryId);
        if (ride) distanceKm = ride.distanceKm;
      }
      if (!distanceKm) {
        const order = store.deliveryOrders.find(o => `do-${o.id}` === currentSelection.entryId || o.id === currentSelection.entryId);
        if (order) distanceKm = order.distanceKm;
      }
      if (!distanceKm) distanceKm = 5;

      const carbonKg = Math.round(distanceKm * vehicle.carbonFactor * 100) / 100;

      const originalEntry = store.entries.find(e => e.id === currentSelection.entryId);
      const fallbackDate = currentSelection.timestamp
        ? new Date(currentSelection.timestamp).toISOString()
        : new Date().toISOString();
      store.addEntry({
        id: currentSelection.entryId,
        category: currentSelection.category,
        label: `${currentSelection.platformName} — ${vehicle.label}`,
        kgCo2e: carbonKg,
        source: "notification",
        occurredAt: originalEntry?.occurredAt ?? fallbackDate,
        metadata: { vehicleType, distanceKm, actualCarbon: carbonKg },
      });

      useAppStore.setState((state) => {
        const updates: Partial<typeof state> = {};

        if (currentSelection.category === "food_delivery") {
          updates.foodDeliveries = state.foodDeliveries.map(f => {
            if (`fd-${f.id}` === currentSelection.entryId || f.id === currentSelection.entryId) {
              return { ...f, vehicleType, kgCo2e: carbonKg };
            }
            return f;
          });
        } else if (currentSelection.category === "grocery_delivery") {
          updates.groceryDeliveries = state.groceryDeliveries.map(g => {
            if (`gd-${g.id}` === currentSelection.entryId || g.id === currentSelection.entryId) {
              return { ...g, vehicleType, kgCo2e: carbonKg };
            }
            return g;
          });
        } else if (currentSelection.category === "ride_booking") {
          updates.rideBookings = state.rideBookings.map(r => {
            if (`rb-${r.id}` === currentSelection.entryId || r.id === currentSelection.entryId) {
              return { ...r, vehicleType, kgCo2e: carbonKg };
            }
            return r;
          });
        } else if (currentSelection.category === "shopping") {
          updates.deliveryOrders = state.deliveryOrders.map(o => {
            if (`do-${o.id}` === currentSelection.entryId || o.id === currentSelection.entryId) {
              return { ...o, vehicleType, predictedVehicle: vehicleType, kgCo2e: carbonKg };
            }
            return o;
          });
        }

        return updates;
      });

      const updatedStore = useAppStore.getState();
      const alerts = generateSmartAlerts(
        updatedStore.entries,
        updatedStore.shoppingLogs,
        updatedStore.electricityLogs,
        updatedStore.deliveryOrders,
        updatedStore.foodDeliveries,
        updatedStore.groceryDeliveries,
        updatedStore.streaks
      );
      const existingIds = new Set(updatedStore.smartAlerts.map(a => a.id));
      const newAlerts = alerts.filter(a => !existingIds.has(a.id));
      for (const alert of newAlerts.slice(0, 3)) {
        useAppStore.getState().addSmartAlert(alert);
        if (alert.severity === "critical") {
          scheduleCarbonAlert(alert.body).catch(() => {});
        }
      }

      resolveVehicleSelection(currentSelection.id, vehicleType);
      setCurrentSelection(null);
    },
    [currentSelection]
  );

  const handleSkip = useCallback(() => {
    if (!currentSelection) return;
    skipVehicleSelection(currentSelection.id);
    setCurrentSelection(null);
  }, [currentSelection]);

  return (
    <VehicleSelectionContext.Provider value={{ pendingCount }}>
      {children}
      <VehicleTypePrompt
        visible={!!currentSelection}
        platformName={currentSelection?.platformName ?? ""}
        orderId={currentSelection?.orderId}
        onSelect={handleSelect}
        onSkip={handleSkip}
      />
    </VehicleSelectionContext.Provider>
  );
}
