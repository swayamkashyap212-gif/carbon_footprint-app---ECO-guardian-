import {
  addPendingVehicleSelection,
  resolveVehicleSelection,
  skipVehicleSelection,
  getNextPendingSelection,
  getPendingSelections,
  mapVehicleIdToType
} from "../src/services/vehicleSelection";

describe("vehicleSelection", () => {
  beforeEach(() => {
    // Clear pending selections before each test
    const selections = getPendingSelections();
    selections.forEach(s => skipVehicleSelection(s.id));
  });

  describe("addPendingVehicleSelection", () => {
    it("adds a pending selection", () => {
      addPendingVehicleSelection("Swiggy", "entry-1", "order-1", "food_delivery");
      const selections = getPendingSelections();
      expect(selections.length).toBe(1);
      expect(selections[0].platformName).toBe("Swiggy");
      expect(selections[0].entryId).toBe("entry-1");
    });

    it("deduplicates selections with same entryId", () => {
      addPendingVehicleSelection("Swiggy", "entry-1", "order-1", "food_delivery");
      addPendingVehicleSelection("Swiggy", "entry-1", "order-1", "food_delivery");
      const selections = getPendingSelections();
      expect(selections.length).toBe(1);
    });

    it("allows different entryIds", () => {
      addPendingVehicleSelection("Swiggy", "entry-1", "order-1", "food_delivery");
      addPendingVehicleSelection("Zomato", "entry-2", "order-2", "food_delivery");
      const selections = getPendingSelections();
      expect(selections.length).toBe(2);
    });
  });

  describe("resolveVehicleSelection", () => {
    it("resolves and removes selection", () => {
      addPendingVehicleSelection("Swiggy", "entry-1", "order-1", "food_delivery");
      const selections = getPendingSelections();
      const resolved = resolveVehicleSelection(selections[0].id, "ELECTRIC_BIKE");
      expect(resolved).not.toBeNull();
      expect(resolved?.platformName).toBe("Swiggy");
      expect(getPendingSelections().length).toBe(0);
    });

    it("returns null for non-existent selection", () => {
      const resolved = resolveVehicleSelection("non-existent", "ELECTRIC_BIKE");
      expect(resolved).toBeNull();
    });
  });

  describe("skipVehicleSelection", () => {
    it("skips and removes selection", () => {
      addPendingVehicleSelection("Swiggy", "entry-1", "order-1", "food_delivery");
      const selections = getPendingSelections();
      skipVehicleSelection(selections[0].id);
      expect(getPendingSelections().length).toBe(0);
    });
  });

  describe("getNextPendingSelection", () => {
    it("returns first pending selection", () => {
      addPendingVehicleSelection("Swiggy", "entry-1", "order-1", "food_delivery");
      addPendingVehicleSelection("Zomato", "entry-2", "order-2", "food_delivery");
      const next = getNextPendingSelection();
      expect(next?.platformName).toBe("Swiggy");
    });

    it("returns null when no selections", () => {
      const next = getNextPendingSelection();
      expect(next).toBeNull();
    });
  });

  describe("getPendingSelections", () => {
    it("returns copy of selections", () => {
      addPendingVehicleSelection("Swiggy", "entry-1", "order-1", "food_delivery");
      const selections1 = getPendingSelections();
      const selections2 = getPendingSelections();
      expect(selections1).not.toBe(selections2);
      expect(selections1.length).toBe(selections2.length);
    });
  });

  describe("mapVehicleIdToType", () => {
    it("maps known vehicle IDs", () => {
      expect(mapVehicleIdToType("bicycle")).toBe("CYCLE");
      expect(mapVehicleIdToType("electric_bike")).toBe("ELECTRIC_BIKE");
      expect(mapVehicleIdToType("petrol_bike")).toBe("PETROL_BIKE");
      expect(mapVehicleIdToType("auto_rickshaw")).toBe("AUTO_RICKSHAW");
      expect(mapVehicleIdToType("ev_car")).toBe("EV_CAR");
      expect(mapVehicleIdToType("petrol_car")).toBe("PETROL_CAR");
      expect(mapVehicleIdToType("van")).toBe("VAN");
      expect(mapVehicleIdToType("walking")).toBe("WALKING");
    });

    it("returns UNKNOWN for unknown vehicle ID", () => {
      expect(mapVehicleIdToType("unknown")).toBe("UNKNOWN");
    });
  });
});
