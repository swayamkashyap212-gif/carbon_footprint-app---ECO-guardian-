import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { generateSmartAlerts } from "../services/smartAlertEngine";
import { markAlertRead, markAllAlertsRead } from "../services/supabase";
import { useAppStore } from "../store/useAppStore";
import { useAuth } from "../store/AuthProvider";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";

export function AlertsScreen() {
  const { entries, shoppingLogs, electricityLogs, smartAlerts, deliveryOrders, foodDeliveries, groceryDeliveries, streaks } = useAppStore();
  const { session } = useAuth();
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  const localAlerts = generateSmartAlerts(entries, shoppingLogs, electricityLogs, deliveryOrders, foodDeliveries, groceryDeliveries, streaks);
  const allAlerts = [...smartAlerts, ...localAlerts];
  const uniqueAlerts = allAlerts.reduce<typeof allAlerts>((acc, alert) => {
    if (!acc.find(a => a.id === alert.id)) acc.push(alert);
    return acc;
  }, []);

  const filteredAlerts = filter === "all"
    ? uniqueAlerts
    : uniqueAlerts.filter(a => a.severity === filter);

  const unreadCount = uniqueAlerts.filter(a => !a.read).length;
  const criticalCount = uniqueAlerts.filter(a => a.severity === "critical").length;
  const warningCount = uniqueAlerts.filter(a => a.severity === "warning").length;
  const infoCount = uniqueAlerts.filter(a => a.severity === "info").length;

  async function handleMarkRead(alertId: string) {
    useAppStore.getState().markAlertRead(alertId);
    if (session?.access_token) {
      try { await markAlertRead(alertId); } catch {}
    }
  }

  async function handleMarkAllRead() {
    useAppStore.getState().clearAlerts();
    if (session?.access_token && session?.user?.id) {
      try { await markAllAlertsRead(session.user.id); } catch {}
    }
  }

  const severityColor = (s: string) => s === "critical" ? colors.danger : s === "warning" ? colors.warning : colors.primary;

  return (
    <ScreenShell title="Smart Alerts" subtitle="Real-time carbon emission alerts and notifications.">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: colors.danger }]}>{criticalCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>Critical</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: colors.warning }]}>{warningCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>Warning</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: colors.primary }]}>{infoCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>Info</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: colors.onSurfaceVariant }]}>{unreadCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>Unread</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.filterRow}>
          {(["all", "critical", "warning", "info"] as const).map(f => (
            <Pressable
              key={f}
              style={[styles.filterChip, { backgroundColor: colors.surfaceHigh }, filter === f && { backgroundColor: colors.primary }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, { color: colors.onSurfaceVariant }, filter === f && { color: colors.white }]}>{f}</Text>
            </Pressable>
          ))}
          {unreadCount > 0 && (
            <Pressable style={[styles.markAllBtn, { backgroundColor: "rgba(188,240,174,0.6)" }]} onPress={handleMarkAllRead}>
              <Text style={[styles.markAllText, { color: colors.primary }]}>Mark All Read</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.alertsContainer}>
          {filteredAlerts.length === 0 && (
            <GlassCard>
              <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>No alerts matching this filter.</Text>
            </GlassCard>
          )}
          {filteredAlerts.map(alert => (
            <GlassCard
              key={alert.id}
              style={[styles.alertCard, alert.read ? { borderLeftColor: colors.surfaceHigh } : { borderLeftColor: colors.primary }]}
              tone={alert.severity === "critical" ? "red" : alert.severity === "warning" ? "green" : "default"}
            >
              <Pressable onPress={() => handleMarkRead(alert.id)}>
                <View style={styles.alertHeader}>
                  <Ionicons
                    name={alert.severity === "info" ? "leaf" : alert.severity === "critical" ? "warning" : "alert-circle"}
                    size={18}
                    color={severityColor(alert.severity)}
                  />
                  <View style={styles.alertMeta}>
                    <Text style={[styles.alertType, { color: colors.onSurfaceVariant }]}>{alert.type.replace(/_/g, " ")}</Text>
                    <Text style={[styles.alertSeverity, { color: severityColor(alert.severity) }]}>
                      {alert.severity}
                    </Text>
                  </View>
                  {!alert.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.alertTitle, { color: colors.onSurface }]}>{alert.title}</Text>
                <Text style={[styles.alertBody, { color: colors.onSurfaceVariant }]}>{alert.body}</Text>
                {alert.impactKg && alert.impactKg > 0 && (
                  <Text style={[styles.alertImpact, { color: colors.danger }]}>Impact: {alert.impactKg} kg CO₂</Text>
                )}
                <Text style={[styles.alertTime, { color: colors.onSurfaceVariant }]}>
                  {new Date(alert.createdAt).toLocaleDateString()} {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </Pressable>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  summaryCard: { marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryItem: { alignItems: "center" },
  summaryCount: { fontFamily: "serif", fontSize: 24, fontWeight: "700" },
  summaryLabel: { fontSize: 10, textTransform: "uppercase", marginTop: 4 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16, alignItems: "center" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  filterText: { fontSize: 12, fontWeight: "500", textTransform: "capitalize" },
  markAllBtn: { marginLeft: "auto", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  markAllText: { fontSize: 11, fontWeight: "500" },
  alertsContainer: { gap: 12 },
  alertCard: { borderLeftWidth: 3 },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertMeta: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  alertType: { fontSize: 10, textTransform: "uppercase", fontWeight: "500" },
  alertSeverity: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  alertTitle: { marginTop: 8, fontWeight: "600", fontSize: 14 },
  alertBody: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  alertImpact: { marginTop: 6, fontSize: 12, fontWeight: "500" },
  alertTime: { marginTop: 6, fontSize: 10 },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
});
