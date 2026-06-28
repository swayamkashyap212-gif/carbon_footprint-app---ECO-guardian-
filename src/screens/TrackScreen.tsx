import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { calculateElectricityCarbon, calculateFoodCarbon, calculateFoodDeliveryCarbon, calculateFoodWasteCarbon, calculateGroceryDeliveryCarbon, calculateRideBookingCarbon, calculateShoppingCarbon, calculateShoppingCarbonAdvanced, calculateTransportCarbon, calculateTransportCarbonByFuel, FuelType } from "../services/carbonEngine";
import { extractElectricityBill, extractTicketOrReceipt } from "../services/ocr";
import { useAppStore } from "../store/useAppStore";
import { enqueueOfflineMutation } from "../services/offlineQueue";
import { ingestCarbonEvent, saveElectricityLog } from "../services/supabase";
import { useAuth } from "../store/AuthProvider";
import { TransportMode, ShoppingCategory, DeliveryType } from "../types/domain";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";
import { syncShoppingLog } from "../services/dataBridge";

export function TrackScreen() {
  const addEntry = useAppStore((state) => state.addEntry);
  const addElectricityLog = useAppStore((state) => state.addElectricityLog);
  const electricityLogs = useAppStore((state) => state.electricityLogs);
  const entries = useAppStore((state) => state.entries);
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

  // Manual driving state
  const [drivingDistance, setDrivingDistance] = useState("");
  const [drivingFuel, setDrivingFuel] = useState<FuelType>("petrol");
  const [drivingVehicle, setDrivingVehicle] = useState<TransportMode>("car");
  const [drivingFrom, setDrivingFrom] = useState("");
  const [drivingTo, setDrivingTo] = useState("");

  // Shopping manual state
  const [shopProduct, setShopProduct] = useState("");
  const [shopVendor, setShopVendor] = useState("amazon");
  const [shopCategory, setShopCategory] = useState<ShoppingCategory>("electronics");
  const [shopQuantity, setShopQuantity] = useState("1");
  const [shopOrderValue, setShopOrderValue] = useState("500");
  const [shopDeliveryType, setShopDeliveryType] = useState<DeliveryType>("standard");

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

      if (extracted.unitsConsumed <= 0 && extracted.billAmount <= 0) {
        Alert.alert("Scan Issue", "Could not extract units or amount from the bill. Please enter manually or try a clearer image.");
        return;
      }

      // Pre-fill manual fields with scanned data
      if (extracted.unitsConsumed > 0) setUnits(String(extracted.unitsConsumed));
      if (extracted.billAmount > 0) setBillAmount(String(Math.round(extracted.billAmount)));
      if (extracted.provider !== "Unknown Provider") setProvider(extracted.provider);
      if (extracted.billingPeriod) setBillingPeriod(extracted.billingPeriod);

      const kgCo2e = calculateElectricityCarbon(extracted.unitsConsumed, extracted.region);
      const createdAt = new Date().toISOString();
      const entry = {
        id: `electricity-${Date.now()}`,
        category: "electricity" as const,
        label: extracted.billingPeriod,
        kgCo2e,
        source: "ocr" as const,
        occurredAt: createdAt,
        metadata: { ...extracted, scanSource: "bill_photo" }
      };
      const log = {
        id: entry.id,
        provider: extracted.provider,
        unitsKwh: extracted.unitsConsumed,
        billAmount: extracted.billAmount,
        billingPeriod: extracted.billingPeriod,
        region: extracted.region,
        kgCo2e,
        source: "ocr" as const,
        createdAt
      };
      addEntry(entry);
      addElectricityLog(log);

      try {
        await ingestCarbonEvent({
          category: "electricity",
          label: entry.label,
          kg_co2e: kgCo2e,
          source: "ocr",
          occurred_at: createdAt,
          metadata: entry.metadata
        });
        if (session?.user?.id) {
          await saveElectricityLog({
            user_id: session.user.id,
            provider: log.provider,
            units_kwh: log.unitsKwh,
            bill_amount: log.billAmount,
            billing_period_start: createdAt.slice(0, 10),
            billing_period_end: createdAt.slice(0, 10),
            regional_factor: 0.7147,
            kg_co2e: log.kgCo2e,
            source: "ocr",
            metadata: { billing_period_label: log.billingPeriod }
          });
        }
      } catch {
        await enqueueOfflineMutation("ingestCarbonEvent", {
          category: "electricity",
          label: entry.label,
          kg_co2e: kgCo2e,
          source: "ocr",
          occurred_at: createdAt,
          metadata: entry.metadata
        });
      }

      const unitText = extracted.unitsConsumed > 0 ? `${extracted.unitsConsumed} units` : "units detected";
      const amountText = extracted.billAmount > 0 ? `, Rs ${Math.round(extracted.billAmount)}` : "";
      Alert.alert("Bill Scanned", `${extracted.provider}: ${unitText}${amountText} = ${kgCo2e} kg CO2e`);
    } catch {
      Alert.alert("Scan failed", "Could not scan the bill. Please try again or enter manually.");
    }
  }

  async function addDriving() {
    const dist = Number(drivingDistance);
    if (!Number.isFinite(dist) || dist <= 0) {
      Alert.alert("Invalid distance", "Enter a valid driving distance greater than zero.");
      return;
    }
    const kgCo2e = calculateTransportCarbonByFuel(dist, drivingVehicle, drivingFuel);
    const label = drivingFrom && drivingTo
      ? `${drivingFrom} to ${drivingTo} (${drivingVehicle}, ${drivingFuel})`
      : `${drivingVehicle} drive (${drivingFuel})`;
    const entry = {
      id: `driving-${Date.now()}`,
      category: "transport" as const,
      label,
      kgCo2e,
      source: "manual" as const,
      occurredAt: new Date().toISOString(),
      metadata: {
        distanceKm: dist,
        fuelType: drivingFuel,
        vehicleType: drivingVehicle,
        from: drivingFrom,
        to: drivingTo,
        trackingType: "manual_driving"
      }
    };
    addEntry(entry);
    try {
      await ingestCarbonEvent({
        category: "transport",
        label,
        kg_co2e: kgCo2e,
        source: "manual",
        occurred_at: entry.occurredAt,
        metadata: entry.metadata
      });
    } catch {
      await enqueueOfflineMutation("ingestCarbonEvent", {
        category: "transport",
        label,
        kg_co2e: kgCo2e,
        source: "manual",
        occurred_at: entry.occurredAt,
        metadata: entry.metadata
      });
    }
    Alert.alert("Driving logged", `${dist} km (${drivingFuel}): ${kgCo2e} kg CO2e`);
  }

  async function addManualShopping() {
    if (!shopProduct.trim()) {
      Alert.alert("Required", "Enter a product name.");
      return;
    }
    const qty = parseInt(shopQuantity) || 1;
    const value = parseFloat(shopOrderValue) || 500;
    const carbon = calculateShoppingCarbonAdvanced(shopCategory, qty, shopDeliveryType);
    const shoppingLog = {
      id: `shop-manual-${Date.now()}`,
      vendor: shopVendor as any,
      productName: shopProduct.trim(),
      category: shopCategory,
      quantity: qty,
      deliveryType: shopDeliveryType,
      orderValue: value,
      manufacturingKg: carbon.manufacturingKg,
      packagingKg: carbon.packagingKg,
      deliveryKg: carbon.deliveryKg,
      totalKgCo2e: carbon.totalKgCo2e,
      source: "manual" as const,
      confidence: 1.0
    };
    addEntry({
      id: `sl-${shoppingLog.id}`,
      category: "shopping" as const,
      label: `${shoppingLog.productName} (${shoppingLog.vendor})`,
      kgCo2e: carbon.totalKgCo2e,
      source: "manual",
      occurredAt: new Date().toISOString(),
      metadata: { vendor: shopVendor, category: shopCategory, quantity: qty, orderValue: value }
    });
    try {
      await syncShoppingLog(shoppingLog, session?.access_token);
    } catch {}
    setShopProduct("");
    setShopQuantity("1");
    setShopOrderValue("500");
    Alert.alert("Shopping logged", `${shoppingLog.productName}: ${carbon.totalKgCo2e} kg CO2e`);
  }

  async function scanShoppingReceipt() {
    try {
      const document = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"] });
      if (document.canceled || !document.assets?.[0]) return;
      const file = document.assets[0];
      const receipt = await extractTicketOrReceipt(file.uri);

      if (receipt.items.length === 0 && receipt.totalAmount <= 0) {
        Alert.alert("Scan Issue", "Could not extract items from the receipt. Please enter manually.");
        return;
      }

      // Pre-fill manual fields
      if (receipt.vendor !== "Unknown vendor") setShopVendor(receipt.vendor.toLowerCase());
      if (receipt.items.length > 0) setShopProduct(receipt.items[0].name);
      if (receipt.totalAmount > 0) setShopOrderValue(String(Math.round(receipt.totalAmount)));

      const qty = receipt.items.reduce((sum, item) => sum + item.quantity, 0) || 1;
      const value = receipt.totalAmount || 0;
      const category = mapOcrCategory(receipt.category);
      const carbon = calculateShoppingCarbonAdvanced(category, qty, "standard");

      const shoppingLog = {
        id: `receipt-${Date.now()}`,
        vendor: (receipt.vendor.toLowerCase() as any) || "other",
        productName: receipt.items.length > 0 ? receipt.items.map(i => i.name).join(", ") : "Scanned purchase",
        category,
        quantity: qty,
        deliveryType: "standard" as const,
        orderValue: value,
        manufacturingKg: carbon.manufacturingKg,
        packagingKg: carbon.packagingKg,
        deliveryKg: carbon.deliveryKg,
        totalKgCo2e: carbon.totalKgCo2e,
        source: "manual" as const,
        confidence: receipt.confidence > 0 ? Math.min(receipt.confidence, 0.85) : 0.5
      };

      addEntry({
        id: `sl-${shoppingLog.id}`,
        category: "shopping" as const,
        label: `${shoppingLog.productName} (${shoppingLog.vendor})`,
        kgCo2e: carbon.totalKgCo2e,
        source: "ocr",
        occurredAt: new Date().toISOString(),
        metadata: { receiptItems: receipt.items, receiptDate: receipt.date }
      });

      try {
        await syncShoppingLog(shoppingLog, session?.access_token);
      } catch {}

      const itemText = receipt.items.length > 0 ? `${receipt.items.length} items` : "purchase";
      Alert.alert("Receipt Scanned", `${itemText}: ${carbon.totalKgCo2e} kg CO2e`);
    } catch {
      Alert.alert("Scan failed", "Could not parse the receipt. Please try again.");
    }
  }

  function mapOcrCategory(ocrCat: string): ShoppingCategory {
    const lower = ocrCat.toLowerCase();
    if (lower.includes("electronics") || lower.includes("phone")) return "electronics";
    if (lower.includes("fashion") || lower.includes("clothing")) return "fashion";
    if (lower.includes("home") || lower.includes("appliance")) return "home_appliances";
    if (lower.includes("personal") || lower.includes("care") || lower.includes("medicine")) return "personal_care";
    if (lower.includes("food")) return "food";
    if (lower.includes("book")) return "books";
    if (lower.includes("furniture")) return "furniture";
    if (lower.includes("sport")) return "sports";
    if (lower.includes("beauty")) return "beauty";
    return "grocery";
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
        <SectionTitle icon="car" title="Manual Driving Log" />
        <Text style={styles.sectionHelper}>Log your personal car/bike drives with fuel type for accurate carbon tracking.</Text>
        <TextInput style={styles.input} value={drivingDistance} onChangeText={setDrivingDistance} keyboardType="numeric" placeholder="Distance driven (km)" />
        <TextInput style={styles.input} value={drivingFrom} onChangeText={setDrivingFrom} placeholder="From (optional)" />
        <TextInput style={styles.input} value={drivingTo} onChangeText={setDrivingTo} placeholder="To (optional)" />
        <Text style={styles.chipLabel}>Vehicle Type</Text>
        <View style={styles.chipWrap}>
          {(["car", "bike", "bus"] as TransportMode[]).map((v) => (
            <Pressable key={v} style={[styles.smallChip, drivingVehicle === v ? styles.chipActive : styles.chipInactive]} onPress={() => setDrivingVehicle(v)}>
              <Text style={[styles.smallChipText, drivingVehicle === v ? styles.chipTextActive : styles.chipTextInactive]}>{v}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.chipLabel}>Fuel Type</Text>
        <View style={styles.chipWrap}>
          {(["petrol", "diesel", "cng", "electric", "hybrid"] as FuelType[]).map((f) => (
            <Pressable key={f} style={[styles.smallChip, drivingFuel === f ? styles.chipActive : styles.chipInactive]} onPress={() => setDrivingFuel(f)}>
              <Text style={[styles.smallChipText, drivingFuel === f ? styles.chipTextActive : styles.chipTextInactive]}>{f}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.primaryButton} onPress={addDriving}>
          <Text style={styles.primaryButtonText}>Log Driving</Text>
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
        <SectionTitle icon="bag" title="Shopping Tracker" />
        <Text style={styles.sectionHelper}>Log shopping purchases manually or scan receipts to track carbon from manufacturing, packaging, and delivery.</Text>
        <TextInput style={styles.input} value={shopProduct} onChangeText={setShopProduct} placeholder="Product name" />
        <View style={styles.formRow}>
          <TextInput style={[styles.input, { flex: 1 }]} value={shopVendor} onChangeText={setShopVendor} placeholder="Vendor" />
          <TextInput style={[styles.input, { flex: 1 }]} value={shopQuantity} onChangeText={setShopQuantity} keyboardType="numeric" placeholder="Qty" />
        </View>
        <TextInput style={styles.input} value={shopOrderValue} onChangeText={setShopOrderValue} keyboardType="numeric" placeholder="Order value (Rs)" />
        <Text style={styles.chipLabel}>Category</Text>
        <View style={styles.chipWrap}>
          {(["electronics", "fashion", "grocery", "food", "home_appliances", "personal_care"] as ShoppingCategory[]).map((cat) => (
            <Pressable key={cat} style={[styles.smallChip, shopCategory === cat ? styles.chipActive : styles.chipInactive]} onPress={() => setShopCategory(cat)}>
              <Text style={[styles.smallChipText, shopCategory === cat ? styles.chipTextActive : styles.chipTextInactive]}>{cat.replace("_", " ")}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.chipLabel}>Delivery Type</Text>
        <View style={styles.chipWrap}>
          {(["standard", "express", "grouped", "pickup"] as DeliveryType[]).map((dt) => (
            <Pressable key={dt} style={[styles.smallChip, shopDeliveryType === dt ? styles.chipActive : styles.chipInactive]} onPress={() => setShopDeliveryType(dt)}>
              <Text style={[styles.smallChipText, shopDeliveryType === dt ? styles.chipTextActive : styles.chipTextInactive]}>{dt}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={styles.primaryButton} onPress={addManualShopping}>
            <Text style={styles.primaryButtonText}>Log Shopping</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={scanShoppingReceipt}>
            <Text style={styles.secondaryButtonText}>Scan Receipt</Text>
          </Pressable>
        </View>
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
  sectionHelper: { fontFamily: "sans-serif", fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4 },
  chipLabel: { fontFamily: "sans-serif", fontSize: 13, fontWeight: "500", color: colors.primary, marginTop: 4 },
  formRow: { flexDirection: "row", gap: 12 },
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
