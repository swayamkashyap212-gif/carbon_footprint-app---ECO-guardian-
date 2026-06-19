import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { TrendChart } from "../components/TrendChart";
import { getFlightAnalytics, parseFlightEmail, parseFlightTicketDocument } from "../services/flightTracking";
import { calculateFlightCarbon, estimateFlightDistanceKm } from "../services/carbonEngine";
import { connectGmail, fetchFlightEmails } from "../services/gmailIntegration";
import { uploadPdf, uploadScreenshot } from "../services/backendApi";
import { syncFlightLog } from "../services/dataBridge";
import { useAuth } from "../store/AuthProvider";
import { FlightLog } from "../types/domain";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";
import { useAppStore } from "../store/useAppStore";

type CabinClass = "economy" | "premium_economy" | "business" | "first";

export function FlightScreen() {
  const { session } = useAuth();
  const storeLogs = useAppStore((s) => s.flightLogs);
  const analytics = useMemo(() => getFlightAnalytics(storeLogs), [storeLogs]);
  const [showForm, setShowForm] = useState(false);
  const [formFrom, setFormFrom] = useState("DEL");
  const [formTo, setFormTo] = useState("BOM");
  const [formCabin, setFormCabin] = useState<CabinClass>("economy");
  const [formPassengers, setFormPassengers] = useState("1");
  const [formFlightNo, setFormFlightNo] = useState("6E-201");

  function addManualFlight() {
    const from = formFrom.toUpperCase().trim();
    const to = formTo.toUpperCase().trim();
    if (from.length < 3 || to.length < 3) {
      Alert.alert("Invalid airports", "Enter 3-letter airport codes (e.g., DEL, BOM).");
      return;
    }
    const passengers = parseInt(formPassengers) || 1;
    const distance = estimateFlightDistanceKm(from, to);
    const kgCo2e = calculateFlightCarbon(distance, formCabin, passengers);
    const log: FlightLog = {
      id: `flight-manual-${Date.now()}`,
      flightNumber: formFlightNo.trim() || "N/A",
      departureAirport: from,
      destinationAirport: to,
      departureDate: new Date().toISOString(),
      passengerCount: passengers,
      distanceKm: distance,
      kgCo2e,
      source: "manual",
      confidence: 1.0
    };
    void syncFlightLog(log, session?.access_token);
    setShowForm(false);
    Alert.alert("Added", `${log.flightNumber} ${from}→${to} - ${kgCo2e} kg CO₂e`);
  }

  async function importGmailFlights() {
    try {
      const connection = await connectGmail();
      if (!connection.connected) {
        Alert.alert("Gmail unavailable", connection.message ?? "Gmail sync is currently unavailable.");
        return;
      }
      const emails = await fetchFlightEmails();
      if (emails.length === 0) {
        Alert.alert("No flights found", "No flight emails were returned from Gmail.");
        return;
      }
      const parsed = emails.map(parseFlightEmail);
      parsed.forEach((flight) => void syncFlightLog(flight, session?.access_token));
      Alert.alert("Gmail connected", `${parsed.length} flight ticket email imported with readonly scope.`);
    } catch (err) {
      Alert.alert("Import failed", "Could not import flights from Gmail.");
    }
  }

  async function uploadTicket() {
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
          console.warn("Backend ticket upload failed:", err);
        }
      }

      const parsed = await parseFlightTicketDocument(file.uri);
      void syncFlightLog(parsed, session?.access_token);
      Alert.alert("Ticket scanned", `${parsed.flightNumber} produced ${parsed.kgCo2e} kg CO2e.`);
    } catch (err) {
      Alert.alert("Scan failed", "Could not parse the flight ticket.");
    }
  }

  return (
    <ScreenShell title="Flight Tracking" subtitle="Gmail tickets, PDF OCR, emissions, alternatives, and offsets." hideHeader>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
      <View style={styles.actionsRow}>
        <ActionButton label="Connect Gmail" icon="mail" onPress={importGmailFlights} />
        <ActionButton label="Scan Ticket" icon="document-attach" onPress={uploadTicket} />
        <ActionButton label="Add Manual" icon="create" onPress={() => setShowForm(!showForm)} />
      </View>

      {showForm && (
        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>Add Flight</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <TextInput style={[styles.formInput, { flex: 1 }]} placeholder="From (DEL)" value={formFrom} onChangeText={setFormFrom} maxLength={3} autoCapitalize="characters" />
            <TextInput style={[styles.formInput, { flex: 1 }]} placeholder="To (BOM)" value={formTo} onChangeText={setFormTo} maxLength={3} autoCapitalize="characters" />
          </View>
          <TextInput style={styles.formInput} placeholder="Flight number" value={formFlightNo} onChangeText={setFormFlightNo} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TextInput style={[styles.formInput, { flex: 1 }]} placeholder="Passengers" value={formPassengers} onChangeText={setFormPassengers} keyboardType="numeric" />
          </View>
          <Text style={{ marginTop: 8, fontWeight: "500", color: "#154212" }}>Cabin Class</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {(["economy", "premium_economy", "business", "first"] as CabinClass[]).map(cabin => (
              <Pressable key={cabin} onPress={() => setFormCabin(cabin)} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: formCabin === cabin ? "#154212" : "#e6e9e7" }}>
                <Text style={{ fontSize: 11, color: formCabin === cabin ? "white" : "#42493e" }}>{cabin.replace("_", " ")}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={{ marginTop: 12, borderRadius: 999, backgroundColor: "#154212", paddingVertical: 12, alignItems: "center" }} onPress={addManualFlight}>
            <Text style={{ fontWeight: "500", color: "white" }}>Add Flight</Text>
          </Pressable>
        </GlassCard>
      )}

      <GlassCard style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>Flight Carbon</Text>
        <View style={styles.metricsRow}>
          <Metric label="Monthly" value={`${analytics.monthlyKg} kg`} />
          <Metric label="Annual Run-rate" value={`${analytics.annualKg} kg`} />
        </View>
        <TrendChart data={storeLogs.map((log, index) => ({ day: `F${index + 1}`, kg: Math.min(log.kgCo2e / 20, 18) }))} />
      </GlassCard>

      <View style={styles.logsSection}>
        {storeLogs.length === 0 ? (
          <GlassCard>
            <Text style={styles.emptyText}>No flight logs yet. Connect Gmail or scan a ticket to start tracking.</Text>
          </GlassCard>
        ) : null}
        {storeLogs.map((log) => (
          <GlassCard key={log.id}>
            <View style={styles.logHeader}>
              <Text style={styles.logFlightNumber}>{log.flightNumber}</Text>
              <Text style={styles.logSource}>{log.source}</Text>
            </View>
            <Text style={styles.logRoute}>
              {log.departureAirport} to {log.destinationAirport} - {log.distanceKm} km - {log.passengerCount} passenger
            </Text>
            <Text style={styles.logCo2}>{log.kgCo2e} kg CO2e</Text>
          </GlassCard>
        ))}
      </View>

      <GlassCard tone="green">
        <Text style={styles.sectionTitle}>Sustainable Travel Suggestions</Text>
        {analytics.suggestions.map((suggestion) => (
          <Text key={suggestion} style={styles.suggestionText}>- {suggestion}</Text>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    marginBottom: 20,
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
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
  metricsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: 16,
  },
  metricLabel: {
    fontFamily: "sans-serif",
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  metricValue: {
    marginTop: 4,
    fontFamily: "serif",
    fontSize: 20,
    color: colors.primary,
  },
  logsSection: {
    marginBottom: 20,
    gap: 16,
  },
  emptyText: {
    fontFamily: "sans-serif",
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logFlightNumber: {
    fontFamily: "serif",
    fontSize: 20,
    color: colors.onSurface,
  },
  logSource: {
    borderRadius: 999,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontWeight: "500",
    fontSize: 12,
    textTransform: "uppercase",
    color: colors.primary,
  },
  logRoute: {
    marginTop: 8,
    fontFamily: "sans-serif",
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  logCo2: {
    marginTop: 12,
    fontFamily: "serif",
    fontSize: 24,
    color: colors.primary,
  },
  suggestionText: {
    marginTop: 12,
    fontFamily: "sans-serif",
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  formInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    color: colors.onSurface,
  },
});
