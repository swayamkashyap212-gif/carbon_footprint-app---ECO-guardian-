import { useState } from "react";
import { Leaf, Zap, Car, UtensilsCrossed, ShoppingCart, Navigation, Route } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import {
  calculateElectricityCarbon,
  calculateTransportCarbon,
  calculateFoodDeliveryCarbon,
  calculateGroceryDeliveryCarbon,
  calculateRideBookingCarbon,
} from "../services/carbonEngine";
import { electricityProviders, transportFactorsKgPerKm } from "../data/emissionFactors";
import type { TransportMode } from "../types/domain";

type Tab = "electricity" | "transport" | "food_delivery" | "grocery" | "ride" | "route";

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "electricity", label: "Electricity", icon: <Zap size={16} /> },
  { key: "transport", label: "Transport", icon: <Car size={16} /> },
  { key: "food_delivery", label: "Food Delivery", icon: <UtensilsCrossed size={16} /> },
  { key: "grocery", label: "Grocery", icon: <ShoppingCart size={16} /> },
  { key: "ride", label: "Ride", icon: <Navigation size={16} /> },
  { key: "route", label: "Route", icon: <Route size={16} /> },
];

const transportModes: TransportMode[] = ["car", "bike", "bus", "metro", "train", "walking", "cycling"];
const foodVehicles = ["e_bike", "bike", "scooter", "car", "van", "bicycle"] as const;
const groceryPlatforms = ["blinkit", "zepto", "instamart", "bigbasket", "amazon"] as const;
const ridePlatforms = ["uber", "ola", "rapido"] as const;
const rideTypes = ["economy", "premium", "shared", "auto", "bike"] as const;
const routeCompareModes: TransportMode[] = ["car", "bike", "bus", "metro", "train", "walking", "cycling"];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border
        ${
          selected
            ? "bg-[#154212] text-white border-[#154212] shadow-md"
            : "bg-white/60 text-[#42493e] border-[#bcf0ae] hover:bg-[#bcf0ae]/30"
        }`}
    >
      {label}
    </button>
  );
}

export default function TrackScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("electricity");
  const [message, setMessage] = useState("");
  const addEntry = useAppStore((s) => s.addEntry);
  const addElectricityLog = useAppStore((s) => s.addElectricityLog);
  const addFoodDelivery = useAppStore((s) => s.addFoodDelivery);
  const addGroceryDelivery = useAppStore((s) => s.addGroceryDelivery);
  const addRideBooking = useAppStore((s) => s.addRideBooking);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0faf0] to-[#e8f5e8] pb-24">
      <div className="sticky top-0 z-20 bg-[#154212]/95 backdrop-blur-md px-4 pt-4 pb-3 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Leaf className="text-[#bcf0ae]" size={22} />
          <h1 className="text-white text-lg font-semibold tracking-tight">Track Carbon</h1>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                ${
                  activeTab === t.key
                    ? "bg-[#bcf0ae] text-[#154212] shadow"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-[#154212] text-[#bcf0ae] text-sm font-medium shadow-lg animate-pulse">
          {message}
        </div>
      )}

      <div className="p-4">
        {activeTab === "electricity" && <ElectricityTab onLog={addEntry} onLogElectricity={addElectricityLog} flash={flash} />}
        {activeTab === "transport" && <TransportTab onLog={addEntry} flash={flash} />}
        {activeTab === "food_delivery" && <FoodDeliveryTab onLogFood={addFoodDelivery} flash={flash} />}
        {activeTab === "grocery" && <GroceryTab onLogGrocery={addGroceryDelivery} flash={flash} />}
        {activeTab === "ride" && <RideTab onLogRide={addRideBooking} flash={flash} />}
        {activeTab === "route" && <RouteTab />}
      </div>
    </div>
  );
}

/* ───── Electricity ───── */
function ElectricityTab({
  onLog,
  onLogElectricity,
  flash,
}: {
  onLog: any;
  onLogElectricity: any;
  flash: (m: string) => void;
}) {
  const [provider, setProvider] = useState("bses_rajdhani");
  const [billingPeriod, setBillingPeriod] = useState("");
  const [units, setUnits] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [preview, setPreview] = useState<number | null>(null);

  const providerList = Object.entries(electricityProviders);

  function calc() {
    const u = parseFloat(units);
    if (!u || u <= 0) return;
    const p = electricityProviders[provider];
    const kg = calculateElectricityCarbon(u, p.region);
    setPreview(kg);
  }

  function log() {
    const u = parseFloat(units);
    const b = parseFloat(billAmount);
    if (!u || u <= 0) return;
    const p = electricityProviders[provider];
    const kg = calculateElectricityCarbon(u, p.region);
    const now = new Date().toISOString();
    onLogElectricity({
      id: uid(),
      provider: p.name,
      unitsKwh: u,
      billAmount: b || 0,
      billingPeriod: billingPeriod || "N/A",
      region: p.region,
      kgCo2e: kg,
      source: "manual",
      createdAt: now,
    });
    onLog({
      id: uid(),
      category: "electricity",
      label: `Electricity – ${p.name}`,
      kgCo2e: kg,
      source: "manual",
      occurredAt: now,
    });
    flash(`Logged ${kg} kg CO₂e for ${u} kWh`);
    setUnits("");
    setBillAmount("");
    setBillingPeriod("");
    setPreview(null);
  }

  return (
    <div className="space-y-4">
      <Card title="Electricity Usage" icon={<Zap size={18} className="text-[#154212]" />}>
        <Field label="Provider">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          >
            {providerList.map(([key, p]) => (
              <option key={key} value={key}>
                {p.name} ({p.region})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Billing Period">
          <input
            type="text"
            value={billingPeriod}
            onChange={(e) => setBillingPeriod(e.target.value)}
            placeholder="e.g. Jan 2026"
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Units (kWh)">
          <input
            type="number"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Bill Amount (₹)">
          <input
            type="number"
            value={billAmount}
            onChange={(e) => setBillAmount(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => flash("Scan feature coming soon")}
            className="flex-1 py-2.5 rounded-xl border border-[#154212]/20 text-[#154212] text-sm font-medium hover:bg-[#bcf0ae]/20 transition"
          >
            Scan Bill
          </button>
          <button
            onClick={calc}
            className="flex-1 py-2.5 rounded-xl border border-[#154212]/20 text-[#154212] text-sm font-medium hover:bg-[#bcf0ae]/20 transition"
          >
            Preview
          </button>
        </div>
        {preview !== null && (
          <div className="mt-2 p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-sm text-[#154212] font-medium text-center">
            Estimated: {preview} kg CO₂e
          </div>
        )}
        <PrimaryButton label="Calculate & Log" onClick={log} />
      </Card>
    </div>
  );
}

/* ───── Transport ───── */
function TransportTab({
  onLog,
  flash,
}: {
  onLog: any;
  flash: (m: string) => void;
}) {
  const [distance, setDistance] = useState("");
  const [mode, setMode] = useState<TransportMode>("car");
  const [preview, setPreview] = useState<number | null>(null);

  function calc() {
    const d = parseFloat(distance);
    if (!d || d <= 0) return;
    setPreview(calculateTransportCarbon(d, mode));
  }

  function log() {
    const d = parseFloat(distance);
    if (!d || d <= 0) return;
    const kg = calculateTransportCarbon(d, mode);
    const now = new Date().toISOString();
    onLog({
      id: uid(),
      category: "transport",
      label: `Transport – ${mode} (${d} km)`,
      kgCo2e: kg,
      source: "manual",
      occurredAt: now,
    });
    flash(`Logged ${kg} kg CO₂e for ${d} km by ${mode}`);
    setDistance("");
    setPreview(null);
  }

  return (
    <div className="space-y-4">
      <Card title="Transport Emissions" icon={<Car size={18} className="text-[#154212]" />}>
        <Field label="Distance (km)">
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Mode">
          <div className="flex flex-wrap gap-2">
            {transportModes.map((m) => (
              <Chip key={m} label={m} selected={mode === m} onClick={() => setMode(m)} />
            ))}
          </div>
        </Field>
        <div className="p-3 rounded-xl bg-[#bcf0ae]/20 text-xs text-[#42493e]">
          Factor: {transportFactorsKgPerKm[mode]} kg CO₂e per km
        </div>
        {preview !== null && (
          <div className="mt-2 p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-sm text-[#154212] font-medium text-center">
            Estimated: {preview} kg CO₂e
          </div>
        )}
        <PrimaryButton label="Calculate & Log" onClick={log} />
      </Card>
    </div>
  );
}

/* ───── Food Delivery ───── */
function FoodDeliveryTab({
  onLogFood,
  flash,
}: {
  onLogFood: any;
  flash: (m: string) => void;
}) {
  const [restaurant, setRestaurant] = useState("");
  const [distance, setDistance] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [vehicle, setVehicle] = useState<string>("bike");
  const [veg, setVeg] = useState(false);
  const [platform, setPlatform] = useState<"swiggy" | "zomato">("swiggy");
  const [preview, setPreview] = useState<number | null>(null);

  function calc() {
    const d = parseFloat(distance);
    const v = parseFloat(orderValue);
    if (!d || d <= 0) return;
    setPreview(calculateFoodDeliveryCarbon(d, vehicle, v || 0, veg));
  }

  function log() {
    const d = parseFloat(distance);
    const v = parseFloat(orderValue);
    if (!d || d <= 0) return;
    const kg = calculateFoodDeliveryCarbon(d, vehicle, v || 0, veg);
    const now = new Date().toISOString();
    onLogFood({
      id: uid(),
      platform,
      restaurantName: restaurant || "Unknown",
      distanceKm: d,
      vehicleType: vehicle,
      orderValue: v || 0,
      items: [],
      kgCo2e: kg,
      isVegetarian: veg,
      source: "manual",
      detectedAt: now,
    });
    flash(`Logged ${kg} kg CO₂e for food delivery`);
    setRestaurant("");
    setDistance("");
    setOrderValue("");
    setPreview(null);
  }

  return (
    <div className="space-y-4">
      <Card title="Food Delivery" icon={<UtensilsCrossed size={18} className="text-[#154212]" />}>
        <Field label="Restaurant Name">
          <input
            type="text"
            value={restaurant}
            onChange={(e) => setRestaurant(e.target.value)}
            placeholder="Restaurant name"
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Distance (km)">
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Order Value (₹)">
          <input
            type="number"
            value={orderValue}
            onChange={(e) => setOrderValue(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Vehicle Type">
          <div className="flex flex-wrap gap-2">
            {foodVehicles.map((v) => (
              <Chip key={v} label={v} selected={vehicle === v} onClick={() => setVehicle(v)} />
            ))}
          </div>
        </Field>
        <Field label="Vegetarian">
          <button
            type="button"
            onClick={() => setVeg(!veg)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              veg ? "bg-green-500 text-white border-green-600" : "bg-white/60 text-[#42493e] border-[#bcf0ae]"
            }`}
          >
            {veg ? "Vegetarian ✓" : "Non-Vegetarian"}
          </button>
        </Field>
        <Field label="Platform">
          <div className="flex gap-2">
            <Chip label="Swiggy" selected={platform === "swiggy"} onClick={() => setPlatform("swiggy")} />
            <Chip label="Zomato" selected={platform === "zomato"} onClick={() => setPlatform("zomato")} />
          </div>
        </Field>
        {preview !== null && (
          <div className="mt-2 p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-sm text-[#154212] font-medium text-center">
            Estimated: {preview} kg CO₂e
          </div>
        )}
        <PrimaryButton label="Calculate & Log" onClick={log} />
      </Card>
    </div>
  );
}

/* ───── Grocery ───── */
function GroceryTab({
  onLogGrocery,
  flash,
}: {
  onLogGrocery: any;
  flash: (m: string) => void;
}) {
  const [store, setStore] = useState("");
  const [distance, setDistance] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [platform, setPlatform] = useState<string>("blinkit");
  const [quickCommerce, setQuickCommerce] = useState(true);
  const [preview, setPreview] = useState<number | null>(null);

  function calc() {
    const d = parseFloat(distance);
    const v = parseFloat(orderValue);
    if (!d || d <= 0) return;
    setPreview(calculateGroceryDeliveryCarbon(d, "PETROL_BIKE", v || 0, platform, quickCommerce));
  }

  function log() {
    const d = parseFloat(distance);
    const v = parseFloat(orderValue);
    if (!d || d <= 0) return;
    const kg = calculateGroceryDeliveryCarbon(d, "PETROL_BIKE", v || 0, platform, quickCommerce);
    const now = new Date().toISOString();
    onLogGrocery({
      id: uid(),
      platform: platform as "blinkit" | "zepto" | "instamart" | "bigbasket" | "other",
      storeName: store || "Unknown",
      distanceKm: d,
      vehicleType: "PETROL_BIKE",
      orderValue: v || 0,
      items: [],
      kgCo2e: kg,
      isQuickCommerce: quickCommerce,
      source: "manual",
      detectedAt: now,
    });
    flash(`Logged ${kg} kg CO₂e for grocery delivery`);
    setStore("");
    setDistance("");
    setOrderValue("");
    setPreview(null);
  }

  return (
    <div className="space-y-4">
      <Card title="Grocery Delivery" icon={<ShoppingCart size={18} className="text-[#154212]" />}>
        <Field label="Store Name">
          <input
            type="text"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            placeholder="Store name"
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Distance (km)">
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Order Value (₹)">
          <input
            type="number"
            value={orderValue}
            onChange={(e) => setOrderValue(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Platform">
          <div className="flex flex-wrap gap-2">
            {groceryPlatforms.map((p) => (
              <Chip key={p} label={p} selected={platform === p} onClick={() => setPlatform(p)} />
            ))}
          </div>
        </Field>
        <Field label="Quick Commerce">
          <button
            type="button"
            onClick={() => setQuickCommerce(!quickCommerce)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              quickCommerce ? "bg-[#154212] text-white border-[#154212]" : "bg-white/60 text-[#42493e] border-[#bcf0ae]"
            }`}
          >
            {quickCommerce ? "Quick Commerce ✓" : "Standard Delivery"}
          </button>
        </Field>
        {preview !== null && (
          <div className="mt-2 p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-sm text-[#154212] font-medium text-center">
            Estimated: {preview} kg CO₂e
          </div>
        )}
        <PrimaryButton label="Calculate & Log" onClick={log} />
      </Card>
    </div>
  );
}

/* ───── Ride ───── */
function RideTab({
  onLogRide,
  flash,
}: {
  onLogRide: any;
  flash: (m: string) => void;
}) {
  const [platform, setPlatform] = useState<string>("uber");
  const [rideType, setRideType] = useState<string>("economy");
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [distance, setDistance] = useState("");
  const [preview, setPreview] = useState<number | null>(null);

  function calc() {
    const d = parseFloat(distance);
    if (!d || d <= 0) return;
    setPreview(calculateRideBookingCarbon(d, rideType, platform));
  }

  function log() {
    const d = parseFloat(distance);
    if (!d || d <= 0) return;
    const kg = calculateRideBookingCarbon(d, rideType, platform);
    const now = new Date().toISOString();
    onLogRide({
      id: uid(),
      platform: platform as "uber" | "ola" | "rapido",
      rideType: rideType as "economy" | "premium" | "shared" | "auto" | "bike",
      pickupLocation: pickup || "Unknown",
      dropLocation: drop || "Unknown",
      distanceKm: d,
      durationMinutes: 0,
      fare: 0,
      kgCo2e: kg,
      vehicleType: rideType,
      source: "manual",
      detectedAt: now,
    });
    flash(`Logged ${kg} kg CO₂e for ride`);
    setPickup("");
    setDrop("");
    setDistance("");
    setPreview(null);
  }

  return (
    <div className="space-y-4">
      <Card title="Ride Booking" icon={<Navigation size={18} className="text-[#154212]" />}>
        <Field label="Platform">
          <div className="flex gap-2">
            {ridePlatforms.map((p) => (
              <Chip key={p} label={p} selected={platform === p} onClick={() => setPlatform(p)} />
            ))}
          </div>
        </Field>
        <Field label="Ride Type">
          <div className="flex flex-wrap gap-2">
            {rideTypes.map((r) => (
              <Chip key={r} label={r} selected={rideType === r} onClick={() => setRideType(r)} />
            ))}
          </div>
        </Field>
        <Field label="Pickup Location">
          <input
            type="text"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Pickup location"
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Drop Location">
          <input
            type="text"
            value={drop}
            onChange={(e) => setDrop(e.target.value)}
            placeholder="Drop location"
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Distance (km)">
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        {preview !== null && (
          <div className="mt-2 p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-sm text-[#154212] font-medium text-center">
            Estimated: {preview} kg CO₂e
          </div>
        )}
        <PrimaryButton label="Calculate & Log" onClick={log} />
      </Card>
    </div>
  );
}

/* ───── Route Comparison ───── */
function RouteTab() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distance, setDistance] = useState("");
  const [results, setResults] = useState<{ mode: string; kg: number }[] | null>(null);

  function compare() {
    const d = parseFloat(distance);
    if (!d || d <= 0) return;
    const table = routeCompareModes.map((m) => ({
      mode: m,
      kg: calculateTransportCarbon(d, m),
    }));
    setResults(table);
  }

  return (
    <div className="space-y-4">
      <Card title="Compare Routes" icon={<Route size={18} className="text-[#154212]" />}>
        <Field label="Origin">
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Starting point"
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Destination">
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination"
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <Field label="Distance (km)">
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
          />
        </Field>
        <PrimaryButton label="Compare Routes" onClick={compare} />
      </Card>

      {results && (
        <Card title="Carbon Comparison" icon={<Leaf size={18} className="text-[#154212]" />}>
          <div className="space-y-2">
            {results
              .sort((a, b) => a.kg - b.kg)
              .map((r, i) => (
                <div
                  key={r.mode}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    i === 0
                      ? "bg-[#bcf0ae]/40 border-[#154212]/30"
                      : "bg-white/50 border-[#bcf0ae]/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="text-xs">🌿</span>}
                    <span className="text-sm font-medium capitalize text-[#154212]">{r.mode}</span>
                  </div>
                  <span className={`text-sm font-bold ${i === 0 ? "text-[#154212]" : "text-[#42493e]"}`}>
                    {r.kg} kg CO₂e
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ───── Shared UI ───── */
function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#bcf0ae] shadow-[0_4px_30px_rgba(21,66,18,0.06)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-[#154212]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#42493e]">{label}</label>
      {children}
    </div>
  );
}

function PrimaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 mt-2 rounded-xl bg-[#154212] text-white font-semibold text-sm shadow-lg hover:bg-[#1a5a18] active:scale-[0.98] transition-all"
    >
      {label}
    </button>
  );
}
