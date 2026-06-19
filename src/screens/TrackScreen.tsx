import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { calculateElectricityCarbon, calculateFoodCarbon, calculateFoodDeliveryCarbon, calculateFoodWasteCarbon, calculateGroceryDeliveryCarbon, calculateRideBookingCarbon, calculateShoppingCarbon, calculateTransportCarbon } from "../services/carbonEngine";
import { extractElectricityBill } from "../services/ocr";
import { useAppStore } from "../store/useAppStore";
import { enqueueOfflineMutation } from "../services/offlineQueue";
import { ingestCarbonEvent, saveElectricityLog } from "../services/supabase";
import { useAuth } from "../store/AuthProvider";
import { TransportMode } from "../types/domain";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";

export function TrackScreen() {
  const addEntry = useAppStore((state) => state.addEntry);
  const addElectricityLog = useAppStore((state) => state.addElectricityLog);
  const electricityLogs = useAppStore((state) => state.electricityLogs);
  const { session } = useAuth();
  const [distance, setDistance] = useState("18");
  const [mode, setMode] = useState<TransportMode>("metro");
  const [units, setUnits] = useState("214");
  const [provider, setProvider] = useState("BSES Rajdhani");
  const [billAmount, setBillAmount] = useState("1840");
  const [billingPeriod, setBillingPeriod] = useState("June 2026");
  const [origin, setOrigin] = useState("Rohini");
  const [destination, setDestination] = useState("New Delhi");
  const [routeSummary, setRouteSummary] = useState("");

  const [foodRestaurant, setFoodRestaurant] = useState("");
  const [foodDistance, setFoodDistance] = useState("3");
  const [foodVehicle, setFoodVehicle] = useState("bike");
  const [foodOrderValue, setFoodOrderValue] = useState("350");
  const [isVeg, setIsVeg] = useState(false);

  const [groceryStore, setGroceryStore] = useState("");
  const [groceryDistance, setGroceryDistance] = useState("4");
  const [isQuickCommerce, setIsQuickCommerce] = useState(false);
  const [groceryPlatform, setGroceryPlatform] = useState("blinkit");
  const [groceryOrderValue, setGroceryOrderValue] = useState("800");
  const groceryVehicle = isQuickCommerce ? "ELECTRIC_BIKE" : "PETROL_BIKE";

  const [ridePlatform, setRidePlatform] = useState("uber");
  const [rideType, setRideType] = useState("economy");
  const [rideDistance, setRideDistance] = useState("8");
  const [ridePickup, setRidePickup] = useState("");
  const [rideDrop, setRideDrop] = useState("");

  async function addTransport() {
    const dist = Number(distance);
    if (!Number.isFinite(dist) || dist <= 0) {
      Alert.alert("Invalid distance", "Enter a valid distance greater than zero.");
      return;
    }
    const kgCo2e = calculateTransportCarbon(dist, mode);
    const entry = { id: `${Date.now()}`, category: "transport" as const, label: `${mode} trip`, kgCo2e, source: "manual" as const, occurredAt: new Date().toISOString() };
    addEntry(entry);
    try {
      await ingestCarbonEvent({ category: "transport", label: `${mode} trip`, kg_co2e: kgCo2e, source: "manual", occurred_at: entry.occurredAt });
    } catch {
      await enqueueOfflineMutation("ingestCarbonEvent", { category: "transport", label: `${mode} trip`, kg_co2e: kgCo2e, source: "manual", occurred_at: entry.occurredAt });
    }
    Alert.alert("Transport added", `${kgCo2e} kg CO2e recorded.`);
  }

  async function addFoodDelivery() {
    if (!foodRestaurant.trim()) {
      Alert.alert("Required", "Enter restaurant name.");
      return;
    }
    const dist = Number(foodDistance);
    const value = Number(foodOrderValue);
    const kgCo2e = calculateFoodDeliveryCarbon(dist, foodVehicle, value, isVeg);
    const entry = { id: `food-${Date.now()}`, category: "food_delivery" as const, label: `${foodRestaurant} delivery`, kgCo2e, source: "manual" as const, occurredAt: new Date().toISOString(), metadata: { restaurant: foodRestaurant, distanceKm: dist, vehicle: foodVehicle, orderValue: value, isVegetarian: isVeg } };
    addEntry(entry);
    try {
      await ingestCarbonEvent({ category: "food_delivery", label: entry.label, kg_co2e: kgCo2e, source: "manual", occurred_at: entry.occurredAt, metadata: entry.metadata });
    } catch {
      await enqueueOfflineMutation("ingestCarbonEvent", { category: "food_delivery", label: entry.label, kg_co2e: kgCo2e, source: "manual", occurred_at: entry.occurredAt, metadata: entry.metadata });
    }
    Alert.alert("Food delivery logged", `${foodRestaurant}: ${kgCo2e} kg CO2e`);
  }

  async function addGroceryDelivery() {
    if (!groceryStore.trim()) {
      Alert.alert("Required", "Enter store name.");
      return;
    }
    const dist = Number(groceryDistance);
    const value = Number(groceryOrderValue);
    const kgCo2e = calculateGroceryDeliveryCarbon(dist, groceryVehicle, value, groceryPlatform, isQuickCommerce);
    const entry = { id: `grocery-${Date.now()}`, category: "grocery_delivery" as const, label: `${groceryStore} delivery`, kgCo2e, source: "manual" as const, occurredAt: new Date().toISOString(), metadata: { store: groceryStore, distanceKm: dist, vehicle: groceryVehicle, orderValue: value, platform: groceryPlatform, isQuickCommerce } };
    addEntry(entry);
    try {
      await ingestCarbonEvent({ category: "grocery_delivery", label: entry.label, kg_co2e: kgCo2e, source: "manual", occurred_at: entry.occurredAt, metadata: entry.metadata });
    } catch {
      await enqueueOfflineMutation("ingestCarbonEvent", { category: "grocery_delivery", label: entry.label, kg_co2e: kgCo2e, source: "manual", occurred_at: entry.occurredAt, metadata: entry.metadata });
    }
    Alert.alert("Grocery delivery logged", `${groceryStore}: ${kgCo2e} kg CO2e`);
  }

  async function addRideBooking() {
    const dist = Number(rideDistance);
    if (!Number.isFinite(dist) || dist <= 0) {
      Alert.alert("Invalid distance", "Enter a valid distance greater than zero.");
      return;
    }
    const kgCo2e = calculateRideBookingCarbon(dist, rideType, ridePlatform);
    const entry = { id: `ride-${Date.now()}`, category: "transport" as const, label: `${ridePlatform} ${rideType} ride`, kgCo2e, source: "manual" as const, occurredAt: new Date().toISOString(), metadata: { platform: ridePlatform, rideType, distanceKm: dist, pickup: ridePickup, drop: rideDrop } };
    addEntry(entry);
    try {
      await ingestCarbonEvent({ category: "transport", label: entry.label, kg_co2e: kgCo2e, source: "manual", occurred_at: entry.occurredAt, metadata: entry.metadata });
    } catch {
      await enqueueOfflineMutation("ingestCarbonEvent", { category: "transport", label: entry.label, kg_co2e: kgCo2e, source: "manual", occurred_at: entry.occurredAt, metadata: entry.metadata });
    }
    Alert.alert("Ride logged", `${ridePlatform} ${rideType}: ${kgCo2e} kg CO2e`);
  }

  async function addElectricity() {
    const parsedUnits = Number(units);
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      Alert.alert("Invalid units", "Enter electricity units greater than zero.");
      return;
    }
    const kgCo2e = calculateElectricityCarbon(parsedUnits, "india");
    const createdAt = new Date().toISOString();
    const entry = { id: `electricity-${Date.now()}`, category: "electricity" as const, label: billingPeriod.trim() || "Electricity usage", kgCo2e, source: "manual" as const, occurredAt: createdAt, metadata: { provider, unitsKwh: parsedUnits, billAmount: Number(billAmount) || 0, region: "india" } };
    const log = { id: entry.id, provider: provider.trim() || "Electricity provider", unitsKwh: parsedUnits, billAmount: Number(billAmount) || 0, billingPeriod: billingPeriod.trim() || "Current billing period", region: "india", kgCo2e, source: "manual" as const, createdAt };
    addEntry(entry);
    addElectricityLog(log);
    try {
      await ingestCarbonEvent({ category: "electricity", label: entry.label, kg_co2e: kgCo2e, source: "manual", occurred_at: createdAt, metadata: entry.metadata });
      if (session?.user?.id) {
        await saveElectricityLog({ user_id: session.user.id, provider: log.provider, units_kwh: log.unitsKwh, bill_amount: log.billAmount, billing_period_start: new Date().toISOString().slice(0, 10), billing_period_end: new Date().toISOString().slice(0, 10), regional_factor: 0.7147, kg_co2e: log.kgCo2e, source: "manual", metadata: { billing_period_label: log.billingPeriod } });
      }
    } catch {
      await enqueueOfflineMutation("ingestCarbonEvent", { category: "electricity", label: entry.label, kg_co2e: kgCo2e, source: "manual", occurred_at: createdAt, metadata: entry.metadata });
    }
    Alert.alert("Electricity logged", `${parsedUnits} kWh equals ${kgCo2e} kg CO2e.`);
  }

  async function scanBill() {
    try {
      const document = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"] });
      if (document.canceled || !document.assets?.[0]?.uri) return;
      const extracted = await extractElectricityBill(document.assets[0].uri);
      const kgCo2e = calculateElectricityCarbon(extracted.unitsConsumed, extracted.region);
      const entry = { id: `${Date.now()}`, category: "electricity" as const, label: extracted.billingPeriod, kgCo2e, source: "ocr" as const, occurredAt: new Date().toISOString(), metadata: extracted };
      addEntry(entry);
      addElectricityLog({ id: entry.id, provider: extracted.provider, unitsKwh: extracted.unitsConsumed, billAmount: extracted.billAmount, billingPeriod: extracted.billingPeriod, region: extracted.region, kgCo2e, source: "ocr", createdAt: entry.occurredAt });
      Alert.alert("Bill scanned", `${extracted.unitsConsumed} units (${extracted.provider}): ${kgCo2e} kg CO2e`);
    } catch {
      Alert.alert("Scan failed", "Could not scan the bill. Please try again.");
    }
  }

  async function recommendRoute() {
    try {
      const distKm = parseFloat(distance) || 10;
      const modes: TransportMode[] = ["walking", "cycling", "metro", "bus", "train", "bike", "car"];
      const results = modes.map(m => ({
        mode: m,
        carbonKg: Math.round(calculateTransportCarbon(distKm, m) * 100) / 100,
        durationMin: m === "walking" ? Math.round(distKm * 12) : m === "cycling" ? Math.round(distKm * 4) : m === "metro" ? Math.round(distKm * 2.5) + 10 : m === "bus" ? Math.round(distKm * 3) + 15 : m === "train" ? Math.round(distKm * 1.5) + 20 : m === "bike" ? Math.round(distKm * 2) : Math.round(distKm * 2.5),
      }));
      const best = results[0];
      const worst = results[results.length - 1];
      const savingsPct = worst.carbonKg > 0 ? Math.round(((worst.carbonKg - best.carbonKg) / worst.carbonKg) * 100) : 0;
      setRouteSummary(
        `${distKm} km route: Best is ${best.mode} (${best.carbonKg} kg CO₂, ${best.durationMin} min). ` +
        `Saves ${savingsPct}% vs ${worst.mode} (${worst.carbonKg} kg). ` +
        results.map(r => `${r.mode}: ${r.carbonKg} kg`).join(" | ")
      );
    } catch {
      Alert.alert("Route error", "Could not calculate route recommendations.");
    }
  }

  return (
    <ScreenShell title="Activity Tracking" subtitle="Capture electricity, trips, food, shopping, flights, waste, and daily habits." hideHeader>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
      <GlassCard style={styles.sectionCard}>
        <SectionTitle icon="flash" title="Electricity Tracker" />
        <TextInput style={styles.input} value={provider} onChangeText={setProvider} placeholder="Provider (e.g. BSES Rajdhani)" />
        <TextInput style={styles.input} value={billingPeriod} onChangeText={setBillingPeriod} placeholder="Billing period" />
        <TextInput style={styles.input} value={units} onChangeText={setUnits} keyboardType="numeric" placeholder="Units consumed (kWh)" />
        <TextInput style={styles.input} value={billAmount} onChangeText={setBillAmount} keyboardType="numeric" placeholder="Bill amount (Rs)" />
        <View style={styles.buttonRow}>
          <Pressable style={styles.primaryButton} onPress={addElectricity}>
            <Text style={styles.primaryButtonText}>Log Usage</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={scanBill}>
            <Text style={styles.secondaryButtonText}>Upload Bill</Text>
          </Pressable>
        </View>
        <View style={styles.recentLogs}>
          <Text style={styles.recentLogsTitle}>Recent electricity logs</Text>
          {electricityLogs.slice(0, 3).map((log) => (
            <Text key={log.id} style={styles.recentLogItem}>
              {log.billingPeriod}: {log.unitsKwh} kWh, {log.kgCo2e} kg CO2e
            </Text>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <SectionTitle icon="navigate" title="Transport Carbon Tracker" />
        <TextInput style={styles.input} value={distance} onChangeText={setDistance} keyboardType="numeric" placeholder="Distance km" />
        <View style={styles.chipWrap}>
          {(["car", "bike", "bus", "metro", "train", "walking", "cycling"] as TransportMode[]).map((item) => (
            <Pressable key={item} style={[styles.chip, mode === item ? styles.chipActive : styles.chipInactive]} onPress={() => setMode(item)}>
              <Text style={[styles.chipText, mode === item ? styles.chipTextActive : styles.chipTextInactive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.primaryButton} onPress={addTransport}>
          <Text style={styles.primaryButtonText}>Add Trip</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <SectionTitle icon="restaurant" title="Food Delivery Tracker" />
        <TextInput style={styles.input} value={foodRestaurant} onChangeText={setFoodRestaurant} placeholder="Restaurant name" />
        <TextInput style={styles.input} value={foodDistance} onChangeText={setFoodDistance} keyboardType="numeric" placeholder="Distance (km)" />
        <TextInput style={styles.input} value={foodOrderValue} onChangeText={setFoodOrderValue} keyboardType="numeric" placeholder="Order value (Rs)" />
        <View style={styles.chipRow}>
          {["bike", "scooter", "car", "walking", "e_bike", "bicycle"].map((v) => (
            <Pressable key={v} style={[styles.smallChip, foodVehicle === v ? styles.chipActive : styles.chipInactive]} onPress={() => setFoodVehicle(v)}>
              <Text style={[styles.smallChipText, foodVehicle === v ? styles.chipTextActive : styles.chipTextInactive]}>{v.replace("_", " ")}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setIsVeg(!isVeg)}>
          <Text style={styles.toggleText}>{isVeg ? "Vegetarian" : "Non-Vegetarian"} (tap to toggle)</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={addFoodDelivery}>
          <Text style={styles.primaryButtonText}>Log Food Delivery</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <SectionTitle icon="basket" title="Grocery Delivery Tracker" />
        <TextInput style={styles.input} value={groceryStore} onChangeText={setGroceryStore} placeholder="Store name" />
        <TextInput style={styles.input} value={groceryDistance} onChangeText={setGroceryDistance} keyboardType="numeric" placeholder="Distance (km)" />
        <TextInput style={styles.input} value={groceryOrderValue} onChangeText={setGroceryOrderValue} keyboardType="numeric" placeholder="Order value (Rs)" />
        <View style={styles.chipRow}>
          {["blinkit", "zepto", "instamart", "bigbasket", "amazon"].map((p) => (
            <Pressable key={p} style={[styles.smallChip, groceryPlatform === p ? styles.chipActive : styles.chipInactive]} onPress={() => { setGroceryPlatform(p); setIsQuickCommerce(["blinkit", "zepto", "instamart"].includes(p)); }}>
              <Text style={[styles.smallChipText, groceryPlatform === p ? styles.chipTextActive : styles.chipTextInactive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.primaryButton} onPress={addGroceryDelivery}>
          <Text style={styles.primaryButtonText}>Log Grocery Delivery</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <SectionTitle icon="car" title="Ride Booking Tracker" />
        <View style={styles.chipRow}>
          {["uber", "ola", "rapido"].map((p) => (
            <Pressable key={p} style={[styles.smallChip, ridePlatform === p ? styles.chipActive : styles.chipInactive]} onPress={() => setRidePlatform(p)}>
              <Text style={[styles.smallChipText, ridePlatform === p ? styles.chipTextActive : styles.chipTextInactive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.chipRow}>
          {["economy", "premium", "shared", "auto", "bike"].map((t) => (
            <Pressable key={t} style={[styles.smallChip, rideType === t ? styles.chipActive : styles.chipInactive]} onPress={() => setRideType(t)}>
              <Text style={[styles.smallChipText, rideType === t ? styles.chipTextActive : styles.chipTextInactive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.input} value={rideDistance} onChangeText={setRideDistance} keyboardType="numeric" placeholder="Distance (km)" />
        <TextInput style={styles.input} value={ridePickup} onChangeText={setRidePickup} placeholder="Pickup location" />
        <TextInput style={styles.input} value={rideDrop} onChangeText={setRideDrop} placeholder="Drop location" />
        <Pressable style={styles.primaryButton} onPress={addRideBooking}>
          <Text style={styles.primaryButtonText}>Log Ride</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <SectionTitle icon="map" title="AI Route Recommendation" />
        <Text style={styles.routeHelper}>Compares metro, bus, walk, cycle, bike, and car routes</Text>
        <View style={styles.routeInputRow}>
          <TextInput style={styles.routeInput} value={origin} onChangeText={setOrigin} placeholder="From" />
          <TextInput style={styles.routeInput} value={destination} onChangeText={setDestination} placeholder="To" />
        </View>
        <Pressable style={styles.primaryButton} onPress={recommendRoute}>
          <Text style={styles.primaryButtonText}>Compare All Routes</Text>
        </Pressable>
        {routeSummary ? <Text style={styles.routeSummary}>{routeSummary}</Text> : null}
      </GlassCard>

      <View style={styles.gapContainer}>
        <QuickCalculator title="Food Carbon" icon="restaurant" result={`${calculateFoodCarbon(1, "vegetarian")} kg veg / ${calculateFoodCarbon(1, "nonVegetarian")} kg non-veg per meal`} />
        <QuickCalculator title="Food Waste" icon="trash" result={`${calculateFoodWasteCarbon(0.5)} kg CO₂ for 0.5 kg waste`} />
        <QuickCalculator title="Shopping Delivery" icon="bag" result={`${calculateShoppingCarbon("standard", "grouped")} kg grouped / ${calculateShoppingCarbon("standard", "express")} kg express`} />
        <QuickCalculator title="Flight Tracker" icon="airplane" result="Upload ticket or connect Gmail to calculate route distance and offsets." />
        <QuickCalculator title="Daily Routine" icon="calendar" result="Morning, workout, work, study, sleep habits contribute to your daily score." />
      </View>
      </ScrollView>
    </ScreenShell>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={18} color="#154212" />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function QuickCalculator({ title, icon, result }: { title: string; icon: keyof typeof Ionicons.glyphMap; result: string }) {
  return (
    <GlassCard>
      <SectionTitle icon={icon} title={title} />
      <Text style={styles.quickCalcText}>{result}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  sectionCard: { marginBottom: 20, gap: 12 },
  input: { borderRadius: 16, backgroundColor: "rgba(230,233,231,0.5)", paddingHorizontal: 16, paddingVertical: 12, fontFamily: "sans-serif" },
  buttonRow: { flexDirection: "row", gap: 12 },
  primaryButton: { flex: 1, borderRadius: 9999, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { textAlign: "center", fontWeight: "500", color: colors.white },
  secondaryButton: { flex: 1, borderRadius: 9999, backgroundColor: colors.primaryFixed, paddingHorizontal: 16, paddingVertical: 12 },
  secondaryButtonText: { textAlign: "center", fontWeight: "500", color: colors.primary },
  recentLogs: { marginTop: 8, borderRadius: 16, backgroundColor: "rgba(188,240,174,0.4)", padding: 12 },
  recentLogsTitle: { fontWeight: "500", color: colors.primary },
  recentLogItem: { marginTop: 4, fontFamily: "sans-serif", fontSize: 12, color: colors.onSurfaceVariant },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipInactive: { backgroundColor: "rgba(188,240,174,0.6)" },
  chipText: { fontWeight: "500", textTransform: "capitalize" },
  chipTextActive: { color: colors.white },
  chipTextInactive: { color: colors.primary },
  smallChip: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 },
  smallChipText: { fontSize: 12, fontWeight: "500", textTransform: "capitalize" },
  toggleText: { fontFamily: "sans-serif", fontSize: 14, color: colors.primary },
  routeHelper: { fontFamily: "sans-serif", fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 8 },
  routeInputRow: { flexDirection: "row", gap: 12 },
  routeInput: { flex: 1, borderRadius: 16, backgroundColor: "rgba(230,233,231,0.5)", paddingHorizontal: 16, paddingVertical: 12, fontFamily: "sans-serif" },
  routeSummary: { fontFamily: "sans-serif", fontSize: 14, color: colors.onSurfaceVariant },
  gapContainer: { gap: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitleText: { fontFamily: "serif", fontSize: 20, color: colors.onSurface },
  quickCalcText: { marginTop: 8, fontFamily: "sans-serif", fontSize: 14, color: colors.onSurfaceVariant },
});
