import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { connectGmail, fetchShoppingEmails } from "../services/gmailIntegration";
import { getShoppingAnalytics, parseShoppingEmail, parseShoppingReceipt, parseShoppingSmsOrNotification } from "../services/shoppingTracking";
import { calculateShoppingCarbonAdvanced } from "../services/carbonEngine";
import { syncNotificationEvent, uploadPdf, uploadScreenshot } from "../services/backendApi";
import { enqueueOfflineMutation } from "../services/offlineQueue";
import { syncShoppingLog } from "../services/dataBridge";
import { useAuth } from "../store/AuthProvider";
import { ShoppingLog, ShoppingCategory, DeliveryType, DeliveryPlatform } from "../types/domain";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";
import { useAppStore } from "../store/useAppStore";

export function ShoppingScreen() {
  const { session } = useAuth();
  const storeLogs = useAppStore((s) => s.shoppingLogs);
  const analytics = useMemo(() => getShoppingAnalytics(storeLogs), [storeLogs]);
  const [showForm, setShowForm] = useState(false);
  const [formVendor, setFormVendor] = useState("amazon");
  const [formProduct, setFormProduct] = useState("");
  const [formCategory, setFormCategory] = useState<ShoppingCategory>("electronics");
  const [formQuantity, setFormQuantity] = useState("1");
  const [formDeliveryType, setFormDeliveryType] = useState<DeliveryType>("standard");
  const [formOrderValue, setFormOrderValue] = useState("500");

  function addManualEntry() {
    if (!formProduct.trim()) {
      Alert.alert("Required", "Please enter a product name.");
      return;
    }
    const qty = parseInt(formQuantity) || 1;
    const value = parseFloat(formOrderValue) || 500;
    const carbon = calculateShoppingCarbonAdvanced(formCategory, qty, formDeliveryType);
    const log: ShoppingLog = {
      id: `shop-manual-${Date.now()}`,
      vendor: formVendor as DeliveryPlatform,
      productName: formProduct.trim(),
      category: formCategory,
      quantity: qty,
      deliveryType: formDeliveryType,
      orderValue: value,
      manufacturingKg: carbon.manufacturingKg,
      packagingKg: carbon.packagingKg,
      deliveryKg: carbon.deliveryKg,
      totalKgCo2e: carbon.totalKgCo2e,
      source: "manual",
      confidence: 1.0
    };
    void syncShoppingLog(log, session?.access_token);
    setFormProduct("");
    setFormQuantity("1");
    setFormOrderValue("500");
    setShowForm(false);
    Alert.alert("Added", `${log.productName} - ${log.totalKgCo2e} kg CO₂e`);
  }

  async function importGmailOrders() {
    try {
      const connection = await connectGmail();
      if (!connection.connected) {
        Alert.alert("Gmail unavailable", connection.message ?? "Gmail sync is currently unavailable.");
        return;
      }
      const emails = await fetchShoppingEmails();
      if (emails.length === 0) {
        Alert.alert("No orders found", "No shopping emails were returned from Gmail.");
        return;
      }
      const parsed = emails.map(parseShoppingEmail);
      parsed.forEach((order) => void syncShoppingLog(order, session?.access_token));
      Alert.alert("Shopping imported", `${parsed.length} Gmail order imported.`);
    } catch (err) {
      Alert.alert("Import failed", "Could not import orders from Gmail.");
    }
  }

  async function uploadReceipt() {
    try {
      const document = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"] });
      if (document.canceled || !document.assets?.[0]) return;
      const file = document.assets[0];

      if (session?.access_token) {
        try {
          if (file.mimeType?.includes("pdf")) {
            await uploadPdf(session.access_token, file.uri);
          } else {
            await uploadScreenshot(session.access_token, file.uri);
          }
        } catch (err) {
          console.warn("Backend receipt upload failed:", err);
        }
      }

      const parsed = await parseShoppingReceipt(file.uri);

      if (parsed.totalKgCo2e <= 0 && parsed.orderValue <= 0) {
        Alert.alert("Scan Issue", "Could not extract items from the receipt. Please try manual entry.");
        return;
      }

      void syncShoppingLog(parsed, session?.access_token);

      const itemText = parsed.productName || "Purchase";
      const valueText = parsed.orderValue > 0 ? ` (Rs ${parsed.orderValue})` : "";
      Alert.alert("Receipt Scanned", `${itemText}${valueText}: ${parsed.totalKgCo2e} kg CO₂e`);
    } catch (err) {
      Alert.alert("Scan failed", "Could not parse the shopping receipt. Please try again.");
    }
  }

  async function parseFromClipboard() {
    Alert.alert("Clipboard", "Copy a shopping order notification or SMS, then use the Manual entry to log it.");
  }

  return (
    <ScreenShell title="Shopping Carbon" subtitle="Automatic order parsing for retail, grocery and delivery emissions." hideHeader>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
      <View style={styles.actionsRow}>
        <ActionButton label="Gmail" icon="mail" onPress={importGmailOrders} />
        <ActionButton label="Receipt" icon="scan" onPress={uploadReceipt} />
        <ActionButton label="Clipboard" icon="clipboard" onPress={parseFromClipboard} />
        <ActionButton label="Manual" icon="create" onPress={() => setShowForm(!showForm)} />
      </View>

      {showForm && (
        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>Add Shopping Entry</Text>
          <TextInput style={styles.formInput} placeholder="Product name" value={formProduct} onChangeText={setFormProduct} />
          <View style={styles.formRow}>
            <TextInput style={[styles.formInput, { flex: 1 }]} placeholder="Vendor" value={formVendor} onChangeText={setFormVendor} />
            <TextInput style={[styles.formInput, { flex: 1 }]} placeholder="Qty" value={formQuantity} onChangeText={setFormQuantity} keyboardType="numeric" />
          </View>
          <View style={styles.formRow}>
            <TextInput style={[styles.formInput, { flex: 1 }]} placeholder="Order value (₹)" value={formOrderValue} onChangeText={setFormOrderValue} keyboardType="numeric" />
          </View>
          <Text style={{ marginTop: 8, fontWeight: "500", color: "#154212" }}>Category</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {(["electronics", "fashion", "grocery", "food", "home_appliances", "personal_care"] as ShoppingCategory[]).map(cat => (
              <Pressable key={cat} onPress={() => setFormCategory(cat)} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: formCategory === cat ? "#154212" : "#e6e9e7" }}>
                <Text style={{ fontSize: 11, color: formCategory === cat ? "white" : "#42493e" }}>{cat.replace("_", " ")}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ marginTop: 8, fontWeight: "500", color: "#154212" }}>Delivery Type</Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
            {(["standard", "express", "grouped", "pickup"] as DeliveryType[]).map(dt => (
              <Pressable key={dt} onPress={() => setFormDeliveryType(dt)} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: formDeliveryType === dt ? "#154212" : "#e6e9e7" }}>
                <Text style={{ fontSize: 11, color: formDeliveryType === dt ? "white" : "#42493e" }}>{dt}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={{ marginTop: 12, borderRadius: 999, backgroundColor: "#154212", paddingVertical: 12, alignItems: "center" }} onPress={addManualEntry}>
            <Text style={{ fontWeight: "500", color: "white" }}>Add Entry</Text>
          </Pressable>
        </GlassCard>
      )}

      <GlassCard style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>Shopping Analytics</Text>
        <Text style={styles.totalValue}>{analytics.totalKg} kg</Text>
        <Text style={styles.totalLabel}>Total detected shopping carbon this month</Text>
        <View style={styles.categoryRow}>
          {Object.entries(analytics.categoryBreakdown).map(([category, kg]) => (
            <View key={category} style={styles.categoryChip}>
              <Text style={styles.categoryName}>{category.replace("_", " ")}</Text>
              <Text style={styles.categoryValue}>{kg} kg</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <Text style={styles.sectionHeading}>All Shopping Records ({storeLogs.length})</Text>
      <View style={styles.productsSection}>
        {storeLogs.length === 0 ? (
          <GlassCard>
            <Text style={styles.emptyText}>No shopping records yet. Import orders, upload receipts, or add manually.</Text>
          </GlassCard>
        ) : null}
        {storeLogs.map((log) => (
          <GlassCard key={log.id}>
            <View style={styles.productHeader}>
              <Text style={styles.productName}>{log.productName}</Text>
              <Text style={styles.productVendor}>{log.vendor}</Text>
            </View>
            <Text style={styles.productRoute}>
              {log.category.replace("_", " ")} - {log.deliveryType} delivery - Rs {log.orderValue}
            </Text>
            <Text style={styles.productCo2}>{log.totalKgCo2e} kg CO2e</Text>
            <Text style={styles.productBreakdown}>
              Manufacturing {log.manufacturingKg} kg - Packaging {log.packagingKg} kg - Delivery {log.deliveryKg} kg
            </Text>
          </GlassCard>
        ))}
      </View>

      <GlassCard tone="green">
        <Text style={styles.sectionTitle}>Recommendations</Text>
        {analytics.recommendations.map((recommendation) => (
          <Text key={recommendation} style={styles.recommendationText}>- {recommendation}</Text>
        ))}
      </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

function ActionButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Ionicons name={icon} size={17} color="white" />
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    marginBottom: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    minWidth: "30%",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonText: {
    fontWeight: "500",
    color: colors.white,
  },
  sectionTitle: {
    fontFamily: "serif",
    fontSize: 24,
    color: colors.primary,
  },
  totalValue: {
    marginTop: 12,
    fontFamily: "sans-serif",
    fontSize: 32,
    color: colors.primary,
  },
  totalLabel: {
    fontFamily: "sans-serif",
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  categoryRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryChip: {
    borderRadius: 16,
    backgroundColor: "rgba(188, 240, 174, 0.4)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryName: {
    fontWeight: "500",
    fontSize: 12,
    textTransform: "uppercase",
    color: colors.primary,
  },
  categoryValue: {
    fontFamily: "serif",
    fontSize: 20,
    color: colors.primary,
  },
  sectionHeading: {
    marginBottom: 12,
    fontFamily: "serif",
    fontSize: 24,
    color: colors.onSurface,
  },
  productsSection: {
    marginBottom: 20,
    gap: 16,
  },
  emptyText: {
    fontFamily: "sans-serif",
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productName: {
    fontFamily: "serif",
    fontSize: 20,
    color: colors.onSurface,
  },
  productVendor: {
    borderRadius: 999,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontWeight: "500",
    fontSize: 12,
    textTransform: "uppercase",
    color: colors.primary,
  },
  productRoute: {
    marginTop: 8,
    fontFamily: "sans-serif",
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  productCo2: {
    marginTop: 12,
    fontFamily: "serif",
    fontSize: 24,
    color: colors.primary,
  },
  productBreakdown: {
    marginTop: 4,
    fontFamily: "sans-serif",
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  recommendationText: {
    marginTop: 12,
    fontFamily: "sans-serif",
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  formInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    color: colors.onSurface,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
});
