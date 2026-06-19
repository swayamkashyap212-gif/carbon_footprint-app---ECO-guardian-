import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";

import { CarbonRecorder } from "../components/CarbonRecorder";
import { EarthPulse } from "../components/EarthPulse";
import { EcoGauge } from "../components/EcoGauge";
import { GlassCard } from "../components/GlassCard";
import { MetricTile } from "../components/MetricTile";
import { TrendChart } from "../components/TrendChart";
import { syncOfflineQueue } from "../services/offlineQueue";
import { generateSmartAlerts } from "../services/smartAlertEngine";
import { getPermissionsHealth, getHealthLabel, PermissionsHealth } from "../services/permissionService";
import { getLocationStats, isLocationTrackingActive, getCurrentLocation, LocationStats } from "../services/locationService";
import { getTrackingStatus, TrackingStatus, onTrackingStatusChange, startHealthCheck, stopHealthCheck } from "../services/trackingEngine";
import { generateAnalytics, AnalyticsSummary } from "../services/analyticsEngine";
import { calculateLifetimeStats, getSustainabilityLevel, calculateGreenScore } from "../services/carbonEngine";
import { hydrateFromDatabase, generateAndSyncAlerts, recalculateScore, updateChallengeProgress } from "../services/dataBridge";
import { useAuth } from "../store/AuthProvider";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";

export function DashboardScreen() {
  const {
    score, entries, electricityLogs, shoppingLogs, flightLogs,
    foodDeliveries, groceryDeliveries, rideBookings, smartAlerts,
    challenges, userPoints, streaks, deliveryOrders, badges
  } = useAppStore();
  const { session } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [permHealth, setPermHealth] = useState<PermissionsHealth | null>(null);
  const [locationStats, setLocationStats] = useState<LocationStats | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>(getTrackingStatus());
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string | null>(null);

  const token = session?.access_token;

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await hydrateFromDatabase();
      } catch {}
      recalculateScore();
      updateChallengeProgress();
      if (!cancelled) {
        const h = await getPermissionsHealth().catch(() => null);
        if (!cancelled && h) setPermHealth(h);
        const loc = getLocationStats();
        if (!cancelled) setLocationStats(loc);
        if (!cancelled) setTrackingStatus(getTrackingStatus());

        const curLoc = await getCurrentLocation().catch(() => null);
        if (!cancelled && curLoc) {
          const name = curLoc.area && curLoc.city
            ? `${curLoc.area}, ${curLoc.city}`
            : curLoc.city || curLoc.area || `${curLoc.latitude.toFixed(4)}, ${curLoc.longitude.toFixed(4)}`;
          setCurrentLocationName(name);
        }
      }
    };
    init();

    startHealthCheck(30000);
    const unsub = onTrackingStatusChange((s) => {
      if (!cancelled) setTrackingStatus(s);
    });

    if (token) {
      void syncOfflineQueue(token);
      void generateAndSyncAlerts(token);
    }

    return () => { cancelled = true; unsub(); stopHealthCheck(); };
  }, [token]);

  useEffect(() => {
    const a = generateAnalytics(
      entries, electricityLogs, shoppingLogs, flightLogs,
      foodDeliveries, groceryDeliveries, rideBookings,
      challenges.filter(c => c.completed).length
    );
    setAnalytics(a);
  }, [entries, electricityLogs, shoppingLogs, flightLogs, foodDeliveries, groceryDeliveries, rideBookings, challenges]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    recalculateScore();
    updateChallengeProgress();
    const h = await getPermissionsHealth().catch(() => null);
    if (h) setPermHealth(h);
    setLocationStats(getLocationStats());
    setTrackingStatus(getTrackingStatus());

    const curLoc = await getCurrentLocation().catch(() => null);
    if (curLoc) {
      const name = curLoc.area && curLoc.city
        ? `${curLoc.area}, ${curLoc.city}`
        : curLoc.city || curLoc.area || `${curLoc.latitude.toFixed(4)}, ${curLoc.longitude.toFixed(4)}`;
      setCurrentLocationName(name);
    }

    if (token) {
      void syncOfflineQueue(token);
      void generateAndSyncAlerts(token);
    }
    setRefreshing(false);
  }, [token]);

  const lifetimeStats = calculateLifetimeStats(entries);
  const sustainabilityLevel = getSustainabilityLevel(score.sustainabilityScore);
  const greenScore = calculateGreenScore(entries, electricityLogs);
  const permLabel = permHealth ? getHealthLabel(permHealth.score) : null;

  const activeModules = trackingStatus.modules.filter((m) => m.status === "online").length;
  const totalModules = trackingStatus.modules.length;

  const alerts = useMemo(() => {
    return generateSmartAlerts(entries, shoppingLogs, electricityLogs, deliveryOrders, foodDeliveries, groceryDeliveries, streaks);
  }, [entries, shoppingLogs, electricityLogs, deliveryOrders, foodDeliveries, groceryDeliveries, streaks]);

  return (
    <ScreenShell title="EcoGuardian" subtitle={currentLocationName ? `Tracking from ${currentLocationName}` : "Your carbon footprint dashboard"}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <CarbonRecorder
          dailyKg={score.dailyKg}
          goalKg={score.goalKg}
          sustainabilityScore={score.sustainabilityScore}
          level={sustainabilityLevel.level}
          levelIcon={sustainabilityLevel.icon}
          levelColor={sustainabilityLevel.color}
          date={new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        />

        <View style={styles.metricRow}>
          <MetricTile
            icon={<Ionicons name="leaf" size={18} color={colors.primary} />}
            label="Weekly"
            value={`${lifetimeStats.weekKg} kg`}
            detail={`${Math.round(lifetimeStats.weekKg / 7 * 10) / 10} kg/day`}
          />
          <MetricTile
            icon={<Ionicons name="trending-down" size={18} color={colors.secondary} />}
            label="Monthly"
            value={`${lifetimeStats.monthKg} kg`}
            detail={`${Math.round(lifetimeStats.monthKg / 30 * 10) / 10} kg/day`}
          />
        </View>

        <View style={styles.metricRow}>
          <MetricTile
            icon={<Ionicons name="trophy" size={18} color={colors.warning} />}
            label="Points"
            value={`${userPoints.total}`}
            detail={`Level ${userPoints.level}`}
          />
          <MetricTile
            icon={<Ionicons name="flash" size={18} color={colors.danger} />}
            label="Streaks"
            value={`${streaks.filter(s => s.active).length}`}
            detail="Active streaks"
          />
        </View>

        <GlassCard style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={styles.trackingTitle}>Tracking Status</Text>
            <Text style={[styles.trackingBadge, { color: trackingStatus.overallStatus === "online" ? colors.primary : colors.danger }]}>
              {activeModules}/{totalModules} Active
            </Text>
          </View>
          <View style={styles.trackingGrid}>
            {trackingStatus.modules.map((m) => (
              <View key={m.id} style={styles.trackingItem}>
                <View style={[styles.trackingDot, { backgroundColor: m.status === "online" ? colors.primary : colors.danger }]} />
                <Text style={styles.trackingLabel} numberOfLines={1}>{m.name.replace(" Tracking", "").replace(" Monitoring", "")}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {analytics && analytics.dailyGraph.length > 0 && (
          <GlassCard style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>Carbon Trend</Text>
              <Pressable onPress={() => navigation.navigate("Analytics")}>
                <Text style={styles.seeAll}>See Details</Text>
              </Pressable>
            </View>
            <TrendChart data={analytics.dailyGraph.map(d => ({ day: d.label, kg: d.value }))} goalKg={score.goalKg} />
          </GlassCard>
        )}

        <View style={styles.metricRow}>
          <MetricTile
            icon={<Ionicons name="navigate" size={18} color={colors.tertiary} />}
            label="Distance"
            value={locationStats ? `${locationStats.todayDistanceKm} km` : "0 km"}
            detail={locationStats ? `${locationStats.todayTrips} trips` : "No trips"}
          />
          <MetricTile
            icon={<Ionicons name="airplane" size={18} color={colors.tertiary} />}
            label="Flights"
            value={`${(flightLogs || []).length}`}
            detail={(flightLogs || []).length > 0 ? `${Math.round((flightLogs || []).reduce((s, f) => s + f.kgCo2e, 0))} kg CO₂` : "No flights"}
          />
        </View>

        <View style={styles.metricRow}>
          <MetricTile
            icon={<Ionicons name="restaurant" size={18} color={colors.warning} />}
            label="Food Orders"
            value={`${(foodDeliveries || []).length}`}
            detail={(foodDeliveries || []).length > 0 ? `${Math.round((foodDeliveries || []).reduce((s, f) => s + f.kgCo2e, 0) * 10) / 10} kg CO₂` : "No orders"}
          />
          <MetricTile
            icon={<Ionicons name="bag" size={18} color={colors.secondary} />}
            label="Shopping"
            value={`${(shoppingLogs || []).length + (deliveryOrders || []).length}`}
            detail={`${Math.round(((shoppingLogs || []).reduce((s, l) => s + l.totalKgCo2e, 0) + (deliveryOrders || []).reduce((s, o) => s + o.kgCo2e, 0)) * 10) / 10} kg CO₂`}
          />
        </View>

        {permHealth && permLabel && (
          <Pressable onPress={() => navigation.navigate("Permissions")}>
            <GlassCard style={styles.healthCard}>
              <View style={styles.healthRow}>
                <View style={[styles.healthCircle, { borderColor: permLabel.color }]}>
                  <Text style={[styles.healthScore, { color: permLabel.color }]}>{permHealth.score}%</Text>
                </View>
                <View style={styles.healthInfo}>
                  <Text style={styles.healthLabel}>Permission Health</Text>
                  <Text style={[styles.healthStatus, { color: permLabel.color }]}>{permLabel.label}</Text>
                  <Text style={styles.healthDetail}>
                    {permHealth.granted}/{permHealth.total} permissions granted
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
              </View>
            </GlassCard>
          </Pressable>
        )}

        <GlassCard style={styles.treesCard}>
          <View style={styles.treesHeader}>
            <Ionicons name="leaf" size={24} color={colors.primary} />
            <Text style={styles.treesTitle}>Environmental Impact</Text>
          </View>
          <View style={styles.treesGrid}>
            <View style={styles.treesItem}>
              <Text style={styles.treesValue}>{lifetimeStats.totalTrees}</Text>
              <Text style={styles.treesLabel}>Trees Required</Text>
              <Text style={styles.treesDetail}>to offset your CO₂</Text>
            </View>
            <View style={styles.treesItem}>
              <Text style={styles.treesValue}>{Math.round(lifetimeStats.totalKg / 0.21)}</Text>
              <Text style={styles.treesLabel}>Driving km</Text>
              <Text style={styles.treesDetail}>equivalent distance</Text>
            </View>
          </View>
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>How to Reduce Your Carbon Footprint</Text>
            <View style={styles.tipRow}>
              <Ionicons name="train" size={16} color={colors.primary} />
              <Text style={styles.tipText}>Use metro/bus instead of car for daily commute</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="walk" size={16} color={colors.primary} />
              <Text style={styles.tipText}>Walk or cycle for trips under 3 km</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="flash" size={16} color={colors.primary} />
              <Text style={styles.tipText}>Set AC to 24°C and use fans first</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="restaurant" size={16} color={colors.primary} />
              <Text style={styles.tipText}>Cook at home instead of ordering delivery</Text>
            </View>
          </View>
        </GlassCard>

        {alerts.length > 0 && (
          <View style={styles.alertSection}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertTitle}>Smart Alerts</Text>
              <Pressable onPress={() => navigation.navigate("Alerts")}>
                <Text style={styles.seeAll}>See All</Text>
              </Pressable>
            </View>
            {alerts.slice(0, 3).map((alert) => (
              <GlassCard key={alert.id} tone={alert.severity === "critical" ? "red" : alert.severity === "warning" ? "blue" : "default"} style={styles.alertCard}>
                <View style={styles.alertRow}>
                  <Ionicons
                    name={alert.severity === "critical" ? "warning" : alert.severity === "warning" ? "alert-circle" : "information-circle"}
                    size={18}
                    color={alert.severity === "critical" ? colors.danger : alert.severity === "warning" ? colors.warning : colors.tertiary}
                  />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertItemTitle}>{alert.title}</Text>
                    <Text style={styles.alertBody} numberOfLines={2}>{alert.body}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {streaks.filter(s => s.active && s.count > 0).length > 0 && (
          <View style={styles.streakSection}>
            <Text style={styles.streakTitle}>Active Streaks</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.streakScroll}>
              {streaks.filter(s => s.active && s.count > 0).map((streak) => (
                <GlassCard key={streak.id} tone="green" style={styles.streakCard}>
                  <Ionicons name="flame" size={24} color={colors.warning} />
                  <Text style={styles.streakCount}>{streak.count}</Text>
                  <Text style={styles.streakLabel}>{streak.type.replace(/_/g, " ")}</Text>
                </GlassCard>
              ))}
            </ScrollView>
          </View>
        )}

        {challenges.filter(c => !c.completed).length > 0 && (
          <View style={styles.challengeSection}>
            <Text style={styles.challengeTitle}>Active Challenges</Text>
            {challenges.filter(c => !c.completed).slice(0, 3).map((challenge) => (
              <GlassCard key={challenge.id} style={styles.challengeCard}>
                <View style={styles.challengeRow}>
                  <Ionicons name="trophy" size={18} color={colors.warning} />
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeName}>{challenge.title}</Text>
                    <Text style={styles.challengeDesc} numberOfLines={1}>{challenge.description}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.challengeProgress}>{challenge.progress}/{challenge.target}</Text>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginBottom: 20 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  heroMeta: { flex: 1 },
  heroLabel: { fontSize: 14, fontWeight: "500", color: colors.onSurfaceVariant },
  heroDate: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  levelBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start", marginTop: 8, gap: 4 },
  levelText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  scoreRow: { flexDirection: "row", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(21,66,18,0.1)" },
  scoreItem: { flex: 1, alignItems: "center" },
  scoreValue: { fontSize: 24, fontWeight: "700", color: colors.primary },
  scoreLabel: { fontSize: 11, fontWeight: "500", color: colors.onSurfaceVariant, marginTop: 2 },
  scoreDivider: { width: 1, backgroundColor: "rgba(21,66,18,0.1)" },
  metricRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  trackingCard: { marginBottom: 16 },
  trackingHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  trackingTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.onSurface },
  trackingBadge: { fontSize: 12, fontWeight: "700" },
  trackingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trackingItem: { flexDirection: "row", alignItems: "center", gap: 6, width: "47%" },
  trackingDot: { width: 8, height: 8, borderRadius: 4 },
  trackingLabel: { fontSize: 12, color: colors.onSurfaceVariant, flex: 1 },
  trendCard: { marginBottom: 16 },
  trendHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  trendTitle: { fontSize: 16, fontWeight: "600", color: colors.onSurface },
  seeAll: { fontSize: 13, fontWeight: "600", color: colors.primary },
  healthCard: { marginBottom: 16 },
  healthRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  healthCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  healthScore: { fontSize: 16, fontWeight: "700" },
  healthInfo: { flex: 1 },
  healthLabel: { fontSize: 14, fontWeight: "600", color: colors.onSurface },
  healthStatus: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  healthDetail: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 },
  treesCard: { marginBottom: 16 },
  treesHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  treesTitle: { fontSize: 16, fontWeight: "600", color: colors.onSurface },
  treesGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  treesItem: { flex: 1, alignItems: "center", backgroundColor: "rgba(188,240,174,0.3)", borderRadius: 12, padding: 12 },
  treesValue: { fontSize: 28, fontWeight: "700", color: colors.primary },
  treesLabel: { fontSize: 12, fontWeight: "600", color: colors.onSurface, marginTop: 4 },
  treesDetail: { fontSize: 10, color: colors.onSurfaceVariant, marginTop: 2 },
  tipsContainer: { borderTopWidth: 1, borderTopColor: "rgba(21,66,18,0.1)", paddingTop: 12 },
  tipsTitle: { fontSize: 13, fontWeight: "600", color: colors.onSurface, marginBottom: 8 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  tipText: { fontSize: 12, color: colors.onSurfaceVariant, flex: 1 },
  alertSection: { marginBottom: 16 },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  alertTitle: { fontSize: 16, fontWeight: "600", color: colors.onSurface },
  alertCard: { marginBottom: 6, padding: 14 },
  alertRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  alertContent: { flex: 1 },
  alertItemTitle: { fontSize: 13, fontWeight: "600", color: colors.onSurface },
  alertBody: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  streakSection: { marginBottom: 16 },
  streakTitle: { fontSize: 16, fontWeight: "600", color: colors.onSurface, marginBottom: 8 },
  streakScroll: { gap: 10, paddingBottom: 8 },
  streakCard: { alignItems: "center", padding: 16, minWidth: 90, gap: 4 },
  streakCount: { fontSize: 28, fontWeight: "700", color: colors.primary },
  streakLabel: { fontSize: 10, fontWeight: "500", color: colors.onSurfaceVariant, textTransform: "capitalize", textAlign: "center" },
  challengeSection: { marginBottom: 16 },
  challengeTitle: { fontSize: 16, fontWeight: "600", color: colors.onSurface, marginBottom: 8 },
  challengeCard: { marginBottom: 6, padding: 14 },
  challengeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  challengeInfo: { flex: 1 },
  challengeName: { fontSize: 13, fontWeight: "600", color: colors.onSurface },
  challengeDesc: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 },
  progressBar: { height: 4, backgroundColor: colors.surfaceHigh, borderRadius: 2, marginTop: 6 },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  challengeProgress: { fontSize: 12, fontWeight: "700", color: colors.primary },
});
