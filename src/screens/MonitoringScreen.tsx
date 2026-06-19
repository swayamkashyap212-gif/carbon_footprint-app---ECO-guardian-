import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { getTrackingStatus, TrackingStatus, onTrackingStatusChange, startHealthCheck, stopHealthCheck } from "../services/trackingEngine";
import { isLocationTrackingActive, startLocationTracking, stopLocationTracking, getLocationStats, LocationStats } from "../services/locationService";
import { getMonitoringSummary, MonitoringSummary } from "../services/monitoringEngine";
import { useAppStore } from "../store/useAppStore";
import { ScreenShell } from "./ScreenShell";
import { getTrackingEnabled, setTrackingEnabled } from "../services/trackingPreferences";
import { isNativeNotificationListenerActive } from "../services/notifications";
import { colors } from "../theme/tokens";

export function MonitoringScreen() {
  const { monitoringEvents } = useAppStore();
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>(getTrackingStatus());
  const [locationStats, setLocationStats] = useState<LocationStats | null>(null);
  const [locationActive, setLocationActive] = useState(isLocationTrackingActive());
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [trackingEnabled, setTrackingEnabledState] = useState(true);
  const [notificationActive, setNotificationActive] = useState(isNativeNotificationListenerActive());

  useEffect(() => {
    getTrackingEnabled().then(setTrackingEnabledState);
    startHealthCheck(30000);
    const unsub = onTrackingStatusChange(setTrackingStatus);
    return () => {
      stopHealthCheck();
      unsub();
    };
  }, []);

  useEffect(() => {
    setLocationStats(getLocationStats());
    setLocationActive(isLocationTrackingActive());
    setNotificationActive(isNativeNotificationListenerActive());
    if (monitoringEvents.length > 0) {
      setSummary(getMonitoringSummary(monitoringEvents));
    }
  }, [monitoringEvents]);

  async function toggleLocation() {
    if (locationActive) {
      stopLocationTracking();
      await setTrackingEnabled(false);
      setTrackingEnabledState(false);
    } else {
      await setTrackingEnabled(true);
      setTrackingEnabledState(true);
      await startLocationTracking();
    }
    setLocationActive(isLocationTrackingActive());
    setLocationStats(getLocationStats());
    setTrackingStatus(getTrackingStatus());
  }

  const hasFlightLogs = useAppStore(s => s.flightLogs.length > 0);
  const hasAiAnalysis = useAppStore(s => s.entries.length > 5);

  const platforms = [
    { name: "Google Maps", icon: "map", status: notificationActive ? "online" as const : "offline" as const },
    { name: "Uber", icon: "car", status: notificationActive ? "online" as const : "offline" as const },
    { name: "Rapido", icon: "bicycle", status: notificationActive ? "online" as const : "offline" as const },
    { name: "Swiggy", icon: "restaurant", status: notificationActive ? "online" as const : "offline" as const },
    { name: "Zomato", icon: "pizza", status: notificationActive ? "online" as const : "offline" as const },
    { name: "Blinkit", icon: "flash", status: notificationActive ? "online" as const : "offline" as const },
    { name: "Zepto", icon: "flash", status: notificationActive ? "online" as const : "offline" as const },
    { name: "Amazon", icon: "bag", status: notificationActive ? "online" as const : "offline" as const },
    { name: "Flipkart", icon: "bag", status: notificationActive ? "online" as const : "offline" as const },
    { name: "Flights", icon: "airplane", status: hasFlightLogs ? "online" as const : "offline" as const },
    { name: "AI Analysis", icon: "analytics", status: hasAiAnalysis ? "online" as const : "offline" as const }
  ];

  return (
    <ScreenShell title="Auto Monitoring" subtitle="Live tracking engine status and monitoring controls.">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.engineCard}>
          <View style={styles.engineHeader}>
            <View style={[styles.engineDot, { backgroundColor: trackingStatus.overallStatus === "online" ? "#154212" : "#ba1a1a" }]} />
            <Text style={styles.engineTitle}>Tracking Engine</Text>
            <Text style={[styles.engineStatus, { color: trackingStatus.overallStatus === "online" ? "#154212" : "#ba1a1a" }]}>
              {trackingStatus.overallStatus === "online" ? "ONLINE" : trackingStatus.overallStatus === "degraded" ? "DEGRADED" : "OFFLINE"}
            </Text>
          </View>
          {!trackingEnabled && (
            <Text style={styles.disabledBanner}>Tracking is disabled. Turn it ON to start monitoring.</Text>
          )}
        </GlassCard>

        <GlassCard style={styles.controlCard}>
          <View style={styles.controlRow}>
            <View style={styles.controlInfo}>
              <Ionicons name={locationActive ? "location" : "location-outline"} size={20} color="#154212" />
              <View>
                <Text style={styles.controlLabel}>Location Tracking</Text>
                <Text style={styles.controlDesc}>
                  {!trackingEnabled ? "Disabled by user" : locationActive ? "Active - tracking trips" : "Paused"}
                </Text>
              </View>
            </View>
            <Pressable style={[styles.toggleBtn, locationActive ? styles.toggleOn : styles.toggleOff]} onPress={toggleLocation}>
              <Text style={[styles.toggleText, locationActive ? styles.toggleTextOn : styles.toggleTextOff]}>
                {locationActive ? "ON" : "OFF"}
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        <Text style={styles.sectionTitle}>Monitoring Modules</Text>
        <View style={styles.moduleGrid}>
          {trackingStatus.modules.map(m => (
            <GlassCard key={m.id} style={styles.moduleCard}>
              <View style={styles.moduleHeader}>
                <Ionicons name={m.icon as any} size={18} color={m.status === "online" ? "#154212" : "#ba1a1a"} />
                <View style={[styles.moduleDot, { backgroundColor: m.status === "online" ? "#154212" : "#ba1a1a" }]} />
              </View>
              <Text style={styles.moduleName}>{m.name}</Text>
              <Text style={[styles.moduleStatus, { color: m.status === "online" ? "#154212" : "#ba1a1a" }]}>
                {m.label}
              </Text>
            </GlassCard>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Platform Monitoring</Text>
        <View style={styles.platformGrid}>
          {platforms.map(p => (
            <GlassCard key={p.name} style={styles.platformCard}>
              <View style={styles.platformRow}>
                <Ionicons name={p.icon as any} size={16} color="#154212" />
                <Text style={styles.platformName}>{p.name}</Text>
                <View style={[styles.platformDot, { backgroundColor: p.status === "online" ? "#154212" : "#ba1a1a" }]} />
              </View>
            </GlassCard>
          ))}
        </View>

        {locationStats && (
          <GlassCard style={styles.statsCard}>
            <Text style={styles.cardTitle}>Location Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{locationStats.todayDistanceKm} km</Text>
                <Text style={styles.statLabel}>Today Distance</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{locationStats.todayCarbonKg} kg</Text>
                <Text style={styles.statLabel}>Today Carbon</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{locationStats.todayTrips}</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{locationStats.totalDistanceKm} km</Text>
                <Text style={styles.statLabel}>Total Distance</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {summary && (
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Monitoring Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.dailyEvents}</Text>
                <Text style={styles.statLabel}>Daily Events</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.weeklyEvents}</Text>
                <Text style={styles.statLabel}>Weekly Events</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.greenTripPercent}%</Text>
                <Text style={styles.statLabel}>Green Trips</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.totalCarbon} kg</Text>
                <Text style={styles.statLabel}>Total Carbon</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {monitoringEvents.length > 0 && (
          <GlassCard style={styles.eventsCard}>
            <Text style={styles.cardTitle}>Recent Events</Text>
            {monitoringEvents.slice(0, 10).map(event => (
              <View key={event.id} style={styles.eventRow}>
                <Ionicons name="navigate" size={14} color="#154212" />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventMode}>{event.detectedMode}</Text>
                  <Text style={styles.eventDetail}>{event.distanceKm} km · {event.durationMinutes} min · {event.kgCo2e} kg</Text>
                </View>
                <Text style={styles.eventSource}>{event.source}</Text>
              </View>
            ))}
          </GlassCard>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  engineCard: { marginBottom: 16 },
  engineHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  engineDot: { width: 12, height: 12, borderRadius: 6 },
  engineTitle: { flex: 1, fontFamily: "serif", fontSize: 20, color: colors.primary },
  engineStatus: { fontFamily: "sans-serif", fontSize: 14, fontWeight: "700" },
  disabledBanner: { marginTop: 8, fontSize: 12, color: colors.danger, fontWeight: "500" },
  controlCard: { marginBottom: 20 },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  controlInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  controlLabel: { fontWeight: "500", fontSize: 14, color: colors.onSurface },
  controlDesc: { fontSize: 12, color: colors.onSurfaceVariant },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999 },
  toggleOn: { backgroundColor: colors.primary },
  toggleOff: { backgroundColor: colors.surfaceHigh },
  toggleText: { fontWeight: "700", fontSize: 12 },
  toggleTextOn: { color: colors.white },
  toggleTextOff: { color: colors.onSurfaceVariant },
  sectionTitle: { marginBottom: 12, fontFamily: "serif", fontSize: 18, color: colors.onSurface },
  moduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  moduleCard: { flex: 1, minWidth: "45%", padding: 12 },
  moduleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moduleDot: { width: 8, height: 8, borderRadius: 4 },
  moduleName: { marginTop: 8, fontWeight: "500", fontSize: 13, color: colors.onSurface },
  moduleStatus: { marginTop: 2, fontSize: 11, fontWeight: "700" },
  platformGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  platformCard: { flex: 1, minWidth: "45%", paddingVertical: 8, paddingHorizontal: 12 },
  platformRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  platformName: { flex: 1, fontSize: 12, color: colors.onSurface },
  platformDot: { width: 6, height: 6, borderRadius: 3 },
  statsCard: { marginBottom: 16 },
  cardTitle: { fontFamily: "serif", fontSize: 16, color: colors.onSurface, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statItem: { flex: 1, minWidth: "45%", borderRadius: 10, backgroundColor: "rgba(188,240,174,0.3)", padding: 10, alignItems: "center" },
  statValue: { fontFamily: "serif", fontSize: 18, fontWeight: "600", color: colors.primary },
  statLabel: { fontSize: 10, color: colors.onSurfaceVariant, textTransform: "uppercase", marginTop: 4 },
  summaryCard: { marginBottom: 16 },
  eventsCard: { marginBottom: 16 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surfaceHigh },
  eventInfo: { flex: 1 },
  eventMode: { fontWeight: "500", fontSize: 13, color: colors.onSurface, textTransform: "capitalize" },
  eventDetail: { fontSize: 11, color: colors.onSurfaceVariant },
  eventSource: { fontSize: 10, color: colors.onSurfaceVariant, textTransform: "capitalize" },
});
