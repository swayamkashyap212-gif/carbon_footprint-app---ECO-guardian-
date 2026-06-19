import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View, ScrollView } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { GlassCard } from "../components/GlassCard";
import { clearOfflineQueue } from "../services/offlineQueue";
import { registerForPushNotifications, scheduleCarbonAlert } from "../services/notifications";
import { calculateLifetimeStats } from "../services/carbonEngine";
import { showAlert } from "../utils/alert";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";
import { useAuth } from "../store/AuthProvider";
import { useAppStore } from "../store/useAppStore";
import {
  updateUserPreferences,
  deleteUserData,
  exportUserData
} from "../services/backendApi";

export function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { entries, badges, streaks, userPoints, score } = useAppStore();
  const [loading, setLoading] = useState(false);

  const [preferences, setPreferences] = useState({
    locationTracking: true,
    emailParsing: true,
    smsParsing: false,
    receiptOcr: true,
    aiPersonalization: true,
    monitoringPaused: false
  });

  const [homeLat, setHomeLat] = useState("");
  const [homeLng, setHomeLng] = useState("");
  const [workLat, setWorkLat] = useState("");
  const [workLng, setWorkLng] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("ecoguardian.preferences").then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setPreferences(parsed);
          if (parsed.homeLat) setHomeLat(String(parsed.homeLat));
          if (parsed.homeLng) setHomeLng(String(parsed.homeLng));
          if (parsed.workLat) setWorkLat(String(parsed.workLat));
          if (parsed.workLng) setWorkLng(String(parsed.workLng));
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("ecoguardian.preferences", JSON.stringify(preferences));
  }, [preferences]);

  async function handleToggle(key: keyof typeof preferences, value: boolean) {
    const nextPrefs = { ...preferences, [key]: value };
    setPreferences(nextPrefs);

    if (session?.access_token) {
      try {
        await updateUserPreferences(session.access_token, { preferences: nextPrefs });
      } catch (err) {
        console.warn("Could not sync preferences to backend:", err);
      }
    }
  }

  async function saveLocations() {
    const hLat = parseFloat(homeLat);
    const hLng = parseFloat(homeLng);
    const wLat = parseFloat(workLat);
    const wLng = parseFloat(workLng);

    if (isNaN(hLat) || isNaN(hLng) || isNaN(wLat) || isNaN(wLng)) {
      Alert.alert("Invalid Input", "Please enter valid numeric latitude and longitude coordinates.");
      return;
    }

    AsyncStorage.setItem("ecoguardian.preferences", JSON.stringify({
      ...preferences,
      homeLat: hLat,
      homeLng: hLng,
      workLat: wLat,
      workLng: wLng
    }));

    if (session?.access_token) {
      setLoading(true);
      try {
        await updateUserPreferences(session.access_token, {
          home: { lat: hLat, lng: hLng },
          office: { lat: wLat, lng: wLng }
        });
        Alert.alert("Success", "Delivery locations coordinates saved and encrypted securely on the server.");
      } catch (err) {
        console.warn("Could not save delivery locations:", err);
        Alert.alert("Error", "Could not save location coordinates.");
      } finally {
        setLoading(false);
      }
    }
  }

  async function enableNotifications() {
    try {
      const token = await registerForPushNotifications();
      Alert.alert("Notifications", token ? "Push notifications are ready." : "Notification permission was not granted.");
    } catch (err) {
      Alert.alert("Notifications", "Could not register for push notifications.");
    }
  }

  async function handleExport() {
    if (session?.access_token) {
      try {
        const res = await exportUserData(session.access_token);
        const rowCount = res.data && typeof res.data === "object"
          ? Object.keys(res.data).reduce((sum, key) => sum + (Array.isArray(res.data[key]) ? res.data[key].length : 0), 0)
          : 0;
        Alert.alert(
          "Data Exported",
          `Export completed successfully. Enrolled User: ${res.userId}. Records exported: ${rowCount} rows.`
        );
      } catch (err) {
        console.warn("Could not export user data:", err);
        Alert.alert("Export Failed", "Unable to pull server-side records.");
      }
    }
  }

  async function handleDelete() {
    showAlert(
      "Confirm Wipe",
      "Are you absolutely sure you want to delete all carbon logs, orders, and integration history? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe Account",
          style: "destructive",
          onPress: async () => {
            if (session?.access_token) {
              try {
                await deleteUserData(session.access_token);
              } catch (err) {
                console.warn("Could not wipe server data:", err);
                Alert.alert("Wipe Failed", "Could not delete server data. Local data was not cleared.");
                return;
              }
            }

            useAppStore.setState({
              entries: [],
              electricityLogs: [],
              flightLogs: [],
              shoppingLogs: [],
              deliveryOrders: [],
              foodDeliveries: [],
              groceryDeliveries: [],
              rideBookings: [],
              monitoringEvents: [],
              smartAlerts: [],
              score: { dailyKg: 0, weeklyKg: 0, monthlyKg: 0, sustainabilityScore: 0, savingsKg: 0, goalKg: 9, lastScoreResetDate: new Date().toISOString().slice(0, 10) },
              userPoints: { total: 0, level: 1, xp: 0, xpToNextLevel: 100, history: [] },
              streaks: [
                { id: "streak-1", type: "no_food_delivery", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
                { id: "streak-2", type: "metro_commute", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
                { id: "streak-3", type: "low_electricity", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
                { id: "streak-4", type: "walk_or_cycle", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false },
                { id: "streak-5", type: "no_shopping", count: 0, bestCount: 0, lastUpdated: new Date().toISOString(), active: false }
              ],
              badges: [],
              weeklyTrend: [],
            });

            try {
              await AsyncStorage.removeItem("ecoguardian.appState");
            } catch {}

            showAlert("Wipe Complete", "All logs, scores, and local data have been cleared.");
          }
        }
      ]
    );
  }

  return (
    <ScreenShell title="Profile & Privacy" subtitle="Control permissions, location settings, and account data.">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <GlassCard style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#154212", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "white", fontSize: 28, fontWeight: "600" }}>
                {session?.user?.email?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "serif", fontSize: 20, color: "#154212" }}>
                {session?.user?.email?.split("@")[0] || "EcoGuardian User"}
              </Text>
              <Text style={{ fontFamily: "sans-serif", fontSize: 13, color: "#42493e", marginTop: 2 }}>
                {session?.user?.email || "No email connected"}
              </Text>
              <Text style={{ fontFamily: "sans-serif", fontSize: 12, color: "#486800", marginTop: 2 }}>
                Level {userPoints.level} · {userPoints.total.toLocaleString()} points
              </Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Lifetime Stats</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{entries.length}</Text>
              <Text style={styles.summaryLabel}>Total Entries</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{calculateLifetimeStats(entries).totalKg} kg</Text>
              <Text style={styles.summaryLabel}>Total CO₂</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{streaks.filter(s => s.active && s.count > 0).length}</Text>
              <Text style={styles.summaryLabel}>Active Streaks</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{score.sustainabilityScore}/100</Text>
              <Text style={styles.summaryLabel}>Sustainability</Text>
            </View>
          </View>
        </GlassCard>

        {badges.length > 0 && (
          <GlassCard style={{ marginBottom: 20 }}>
            <Text style={styles.text2xl}>Badges & Achievements</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {badges.map(badge => (
                <View key={badge.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: badge.earned ? "rgba(188,240,174,0.4)" : "rgba(230,233,231,0.5)", paddingHorizontal: 10, paddingVertical: 6, opacity: badge.earned ? 1 : 0.5 }}>
                  <Ionicons name={badge.icon} size={14} color={badge.earned ? "#154212" : "#999"} />
                  <Text style={{ fontSize: 11, fontWeight: "500", color: badge.earned ? "#154212" : "#999" }}>{badge.title}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Connected Services</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="location" size={18} color="#154212" />
              <Text style={styles.fontMedium}>GPS Location Tracking</Text>
            </View>
            <Text style={{ fontSize: 12, color: "#486800", fontWeight: "500" }}>Active</Text>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="mail" size={18} color="#154212" />
              <Text style={styles.fontMedium}>Gmail Integration</Text>
            </View>
            <Text style={{ fontSize: 12, color: preferences.emailParsing ? "#486800" : "#999", fontWeight: "500" }}>
              {preferences.emailParsing ? "Connected" : "Disabled"}
            </Text>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="notifications" size={18} color="#154212" />
              <Text style={styles.fontMedium}>Push Notifications</Text>
            </View>
            <Text style={{ fontSize: 12, color: "#486800", fontWeight: "500" }}>Active</Text>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="cloud" size={18} color="#154212" />
              <Text style={styles.fontMedium}>Supabase Cloud Sync</Text>
            </View>
            <Text style={{ fontSize: 12, color: session?.access_token ? "#486800" : "#b86e00", fontWeight: "500" }}>
              {session?.access_token ? "Connected" : "Sign in required"}
            </Text>
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Privacy & Consents</Text>
          <Text style={styles.subtitle}>EcoGuardian AI handles raw notification details and receipts locally.</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="eye-off" size={18} color="#154212" />
              <Text style={styles.fontMedium}>Pause Monitoring</Text>
            </View>
            <Switch
              value={preferences.monitoringPaused}
              onValueChange={(val) => handleToggle("monitoringPaused", val)}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="navigate" size={18} color="#154212" />
              <Text style={styles.fontMedium}>Location Tracking</Text>
            </View>
            <Switch
              value={preferences.locationTracking}
              onValueChange={(val) => handleToggle("locationTracking", val)}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="mail" size={18} color="#154212" />
              <Text style={styles.fontMedium}>Email Parsing (Gmail)</Text>
            </View>
            <Switch
              value={preferences.emailParsing}
              onValueChange={(val) => handleToggle("emailParsing", val)}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="scan" size={18} color="#154212" />
              <Text style={styles.fontMedium}>Receipt OCR uploads</Text>
            </View>
            <Switch
              value={preferences.receiptOcr}
              onValueChange={(val) => handleToggle("receiptOcr", val)}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="sparkles" size={18} color="#154212" />
              <Text style={styles.fontMedium}>AI Personalization</Text>
            </View>
            <Switch
              value={preferences.aiPersonalization}
              onValueChange={(val) => handleToggle("aiPersonalization", val)}
            />
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Saved Location Coordinates</Text>
          <Text style={styles.locationSubtitle}>Coordinates are symmetrically encrypted using AES-256 before database insertion.</Text>

          <Text style={styles.labelPrimary}>Home Coordinates</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.coordinateInput}
              placeholder="Lat (e.g. 19.076)"
              value={homeLat}
              onChangeText={setHomeLat}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.coordinateInput}
              placeholder="Lng (e.g. 72.877)"
              value={homeLng}
              onChangeText={setHomeLng}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.labelPrimary}>Work Coordinates</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.coordinateInput}
              placeholder="Lat (e.g. 19.085)"
              value={workLat}
              onChangeText={setWorkLat}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.coordinateInput}
              placeholder="Lng (e.g. 72.888)"
              value={workLng}
              onChangeText={setWorkLng}
              keyboardType="numeric"
            />
          </View>

          <Pressable
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={saveLocations}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>Save Delivery Locations</Text>
          </Pressable>
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Data Operations</Text>
          <Text style={styles.mt1Sm}>Export raw logs as JSON or request a complete wipe of your server-side history.</Text>
          <View style={styles.actionRow}>
            <ActionButton label="Export Data" icon="download" onPress={handleExport} />
            <ActionButton label="Wipe History" icon="trash" onPress={handleDelete} />
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Offline Queue</Text>
          <Text style={styles.mt1Sm}>Local mutations are replayed when connectivity re-establishes.</Text>
          <Pressable style={styles.clearQueueButton} onPress={() => void clearOfflineQueue()}>
            <Text style={styles.clearQueueText}>Clear Local Queue</Text>
          </Pressable>
        </GlassCard>

        <View style={styles.gap3}>
          <ActionButton label="Enable System Alerts" icon="notifications" onPress={enableNotifications} />
          <ActionButton label="Test Nudge Alert" icon="warning" onPress={() => void scheduleCarbonAlert("EV delivery option would reduce emissions by 40%.")} />
          <ActionButton label="Sign Out" icon="log-out" onPress={async () => {
            try {
              await signOut();
            } catch (err) {
              Alert.alert("Sign Out", "Could not sign out. Please try again.");
            }
          }} />
        </View>
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
  text2xl: {
    fontFamily: "serif",
    fontSize: 24,
    color: colors.primary,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: "sans-serif",
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
  },
  toggleRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHigh,
    paddingTop: 16,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fontMedium: {
    fontWeight: "500",
    color: colors.onSurface,
  },
  locationSubtitle: {
    marginTop: 4,
    fontFamily: "sans-serif",
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  labelPrimary: {
    fontWeight: "500",
    fontSize: 14,
    color: colors.primary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  coordinateInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.onSurface,
  },
  saveButton: {
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingVertical: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    textAlign: "center",
    fontWeight: "500",
    color: colors.white,
  },
  mt1Sm: {
    marginTop: 4,
    fontFamily: "sans-serif",
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  clearQueueButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearQueueText: {
    textAlign: "center",
    fontWeight: "500",
    color: colors.primary,
  },
  gap3: {
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  summaryItem: {
    width: "47%",
    borderRadius: 12,
    backgroundColor: "rgba(188,240,174,0.3)",
    padding: 12,
    alignItems: "center",
  },
  summaryValue: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "600",
    color: colors.primary,
  },
  summaryLabel: {
    marginTop: 4,
    fontFamily: "sans-serif",
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
});
