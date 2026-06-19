import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getPermissionsHealth, PermissionsHealth } from "../services/permissionService";
import { getTrackingStatus, TrackingStatus, onTrackingStatusChange } from "../services/trackingEngine";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";

type EngineModule = {
  route: keyof RootStackParamList;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const modules: EngineModule[] = [
  { route: "Permissions", title: "Permission Center", body: "Manage location, notifications, and tracking permissions.", icon: "shield-checkmark" },
  { route: "Monitoring", title: "Auto Monitoring", body: "GPS, activity recognition, notification signals.", icon: "navigate" },
  { route: "Alerts", title: "Smart Alerts", body: "Carbon, travel, delivery, electricity nudges.", icon: "notifications" },
  { route: "Analytics", title: "Prediction Analytics", body: "7-day, 30-day, 3-month and annual forecasts.", icon: "bar-chart" },
  { route: "Recommendations", title: "AI Recommendations", body: "Personalized predictive sustainability advice.", icon: "sparkles" },
  { route: "Flights", title: "Flight Tracking", body: "Gmail tickets, PDF OCR, cabin class, flight carbon.", icon: "airplane" },
  { route: "Shopping", title: "Shopping Carbon", body: "Manual entry, Gmail, receipts, notifications.", icon: "bag" },
  { route: "CoreTracking", title: "Core Trackers", body: "Electricity, route, food, waste, routines, manual.", icon: "leaf" }
];

export function AutomationHubScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { entries, smartAlerts, challenges, badges, streaks, deliveryOrders } = useAppStore();
  const [permHealth, setPermHealth] = useState<PermissionsHealth | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>(getTrackingStatus());

  useEffect(() => {
    getPermissionsHealth().then(setPermHealth).catch(() => {});
    const unsub = onTrackingStatusChange(setTrackingStatus);
    return unsub;
  }, []);

  function getEngineStatus(module: EngineModule): { label: string; color: string } {
    switch (module.route) {
      case "Permissions":
        if (permHealth) {
          return permHealth.score >= 70
            ? { label: `${permHealth.score}% granted`, color: colors.secondary }
            : { label: `${permHealth.score}% - needs attention`, color: colors.danger };
        }
        return { label: "Checking...", color: colors.onSurfaceVariant };
      case "Monitoring":
        return trackingStatus.overallStatus === "online"
          ? { label: "Active", color: colors.secondary }
          : trackingStatus.overallStatus === "degraded"
          ? { label: "Partial", color: colors.warning }
          : { label: "Offline", color: colors.danger };
      case "Alerts":
        return { label: `${smartAlerts.length} alerts`, color: smartAlerts.length > 0 ? colors.secondary : colors.onSurfaceVariant };
      case "Analytics":
        return { label: `${entries.length} entries tracked`, color: entries.length > 0 ? colors.secondary : colors.onSurfaceVariant };
      case "Shopping":
        return { label: `${deliveryOrders.length} orders`, color: deliveryOrders.length > 0 ? colors.secondary : colors.onSurfaceVariant };
      case "Flights":
        return { label: `${entries.filter(e => e.category === "flight").length} flights logged`, color: colors.onSurfaceVariant };
      default:
        return { label: "", color: colors.onSurfaceVariant };
    }
  }

  return (
    <ScreenShell title="Automation Engine" subtitle="Connect data sources and let EcoGuardian AI calculate carbon in the background.">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <GlassCard style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: "serif", fontSize: 16, color: colors.primary }}>System Status</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <StatusChip label={`${entries.length} entries`} active={entries.length > 0} />
            <StatusChip label={`${badges.filter(b => b.earned).length} badges`} active={badges.some(b => b.earned)} />
            <StatusChip label={`${streaks.filter(s => s.active).length} streaks`} active={streaks.some(s => s.active)} />
            <StatusChip label={`${challenges.filter(c => c.completed).length} challenges`} active={challenges.some(c => c.completed)} />
          </View>
        </GlassCard>

        <View style={styles.gapContainer}>
          {modules.map((module) => {
            const status = getEngineStatus(module);
            return (
              <Pressable key={module.route} onPress={() => navigation.navigate(module.route)}>
                <GlassCard>
                  <View style={styles.moduleRow}>
                    <View style={styles.iconCircle}>
                      <Ionicons name={module.icon} size={22} color={colors.primary} />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.moduleTitle}>{module.title}</Text>
                      <Text style={styles.moduleBody}>{module.body}</Text>
                      {status.label ? (
                        <Text style={{ marginTop: 4, fontSize: 12, fontWeight: "500", color: status.color }}>{status.label}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function StatusChip({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: active ? "rgba(188,240,174,0.4)" : "rgba(230,233,231,0.5)" }}>
      <Text style={{ fontSize: 11, fontWeight: "500", color: active ? colors.primary : "#999" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gapContainer: { gap: 16 },
  moduleRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  iconCircle: { height: 48, width: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: colors.primaryFixed },
  textContainer: { flex: 1 },
  moduleTitle: { fontFamily: "serif", fontSize: 20, color: colors.primary },
  moduleBody: { marginTop: 4, fontFamily: "sans-serif", fontSize: 14, lineHeight: 20, color: colors.onSurfaceVariant },
});
