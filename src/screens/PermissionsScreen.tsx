import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useCallback } from "react";
import { AppState, AppStateStatus, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import {
  checkPermission,
  getPermissionsHealth,
  getHealthLabel,
  PermissionsHealth,
  PermissionInfo,
  requestPermission
} from "../services/permissionService";
import { getCurrentLocation, isLocationTrackingActive, startLocationTracking, stopLocationTracking } from "../services/locationService";
import { initializeNotifications } from "../services/notifications";
import { startAllTracking, loadTrackingPreferences, getTrackingPreferences } from "../services/masterTracking";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";

export function PermissionsScreen() {
  const [health, setHealth] = useState<PermissionsHealth | null>(null);
  const [locationActive, setLocationActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [requestingType, setRequestingType] = useState<string | null>(null);

  const refreshPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const h = await getPermissionsHealth();
      setHealth(h);
      setLocationActive(isLocationTrackingActive());

      try {
        const loc = await getCurrentLocation();
        if (loc?.city) setCurrentCity(loc.city);
      } catch {}
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeNotifications().catch(() => {}).finally(() => refreshPermissions());

    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        refreshPermissions();
      }
    });

    return () => sub.remove();
  }, [refreshPermissions]);

  async function handleRequestPermission(info: PermissionInfo) {
    if (!info.canRequest || requestingType) return;
    setRequestingType(info.type);

    try {
      const result = await requestPermission(info.type);

      if (result === "granted" && info.type === "location_foreground") {
        if (Platform.OS === "android") {
          await requestPermission("location_background");
        }
        await startLocationTracking();
        await loadTrackingPreferences();
        const prefs = getTrackingPreferences();
        if (prefs.masterEnabled) {
          await startAllTracking(prefs);
        }
      }

      if (result === "granted" && info.type === "location_background") {
        await startLocationTracking();
      }

      if (result === "granted" && info.type === "notifications") {
        await initializeNotifications();
      }

      if (info.type === "notification_listener") {
        await refreshPermissions();
      }
    } catch {
      // Silent fail
    } finally {
      setRequestingType(null);
      await refreshPermissions();
    }
  }

  async function handleEnableAll() {
    const criticalPerms = health?.permissions.filter(
      p => p.status !== "granted" && p.status !== "unavailable" && p.canRequest
    ) || [];

    for (const perm of criticalPerms) {
      await handleRequestPermission(perm);
    }

    await refreshPermissions();

    try {
      await loadTrackingPreferences();
      const prefs = getTrackingPreferences();
      if (prefs.masterEnabled) {
        await startAllTracking(prefs);
      }
    } catch {}
  }

  async function toggleLocationTracking() {
    if (locationActive) {
      stopLocationTracking();
    } else {
      const fgStatus = await checkPermission("location_foreground");
      if (fgStatus !== "granted") {
        await requestPermission("location_foreground");
      }
      await startLocationTracking();
    }
    setLocationActive(isLocationTrackingActive());
  }

  const healthMeta = health ? getHealthLabel(health.score) : null;
  const criticalMissing = health?.permissions.filter(
    p => p.status !== "granted" && p.status !== "unavailable"
  ).length || 0;

  return (
    <ScreenShell title="Permission Center" subtitle="Manage permissions for optimal carbon tracking.">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        <GlassCard style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <View style={styles.healthIconWrap}>
              <Ionicons name="shield-checkmark" size={32} color="#154212" />
            </View>
            <View style={styles.healthTextWrap}>
              <Text style={styles.healthTitle}>Permissions Health</Text>
              {health && (
                <Text style={[styles.healthScore, { color: healthMeta?.color ?? "#154212" }]}>
                  {health.score}% - {healthMeta?.label ?? "Unknown"}
                </Text>
              )}
            </View>
          </View>

          {health && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${health.score}%`, backgroundColor: healthMeta?.color ?? "#154212" }]} />
            </View>
          )}

          {health && (
            <Text style={styles.healthDetail}>
              {health.granted} of {health.total} permissions granted
            </Text>
          )}

          {currentCity && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color="#154212" />
              <Text style={styles.locationText}>Current area: {currentCity}</Text>
            </View>
          )}
        </GlassCard>

        {criticalMissing > 0 && (
          <Pressable style={styles.enableAllButton} onPress={handleEnableAll}>
            <Ionicons name="shield-checkmark" size={18} color="#ffffff" />
            <Text style={styles.enableAllButtonText}>
              Enable All Permissions ({criticalMissing} remaining)
            </Text>
          </Pressable>
        )}

        {health?.score === 100 && (
          <GlassCard style={styles.allGrantedCard}>
            <View style={styles.allGrantedRow}>
              <Ionicons name="checkmark-circle" size={24} color="#154212" />
              <View style={styles.allGrantedInfo}>
                <Text style={styles.allGrantedTitle}>All Permissions Granted</Text>
                <Text style={styles.allGrantedDesc}>Your app is fully configured for carbon tracking</Text>
              </View>
            </View>
          </GlassCard>
        )}

        <Text style={styles.sectionTitle}>Required Permissions</Text>

        {health?.permissions.map((info) => (
          <GlassCard key={info.type} style={styles.permissionCard}>
            <View style={styles.permissionRow}>
              <View style={[styles.permissionIconWrap, info.status === "granted" && styles.permissionIconWrapGranted]}>
                <Ionicons name={info.icon as any} size={20} color={info.status === "granted" ? "#154212" : "#666"} />
              </View>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionLabel}>{info.label}</Text>
                <Text style={styles.permissionDesc}>{info.description}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: info.status === "granted" ? "#154212" : info.status === "denied" ? "#ba1a1a" : "#b86e00" }]} />
                  <Text style={[styles.statusText, { color: info.status === "granted" ? "#154212" : info.status === "denied" ? "#ba1a1a" : "#b86e00" }]}>
                    {info.status === "granted" ? "Granted" : info.status === "denied" ? "Denied - Tap Enable" : info.status === "unavailable" ? "Unavailable" : "Not Set"}
                  </Text>
                </View>
              </View>
              {info.canRequest && (
                <Pressable
                  style={[styles.enableButton, requestingType === info.type && styles.enableButtonLoading]}
                  onPress={() => handleRequestPermission(info)}
                  disabled={requestingType !== null}
                >
                  <Text style={styles.enableButtonText}>
                    {requestingType === info.type ? "..." : info.type === "notification_listener" ? "Open Settings" : "Enable"}
                  </Text>
                </Pressable>
              )}
              {info.status === "granted" && (
                <View style={styles.grantedBadge}>
                  <Ionicons name="checkmark" size={16} color="#154212" />
                </View>
              )}
            </View>
          </GlassCard>
        ))}

        <Text style={styles.sectionTitle}>Tracking Controls</Text>

        <GlassCard style={styles.trackingCard}>
          <View style={styles.trackingRow}>
            <View style={styles.trackingIconWrap}>
              <Ionicons name={locationActive ? "location" : "location-outline"} size={20} color="#154212" />
            </View>
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingLabel}>Location Tracking</Text>
              <Text style={styles.trackingDesc}>
                {locationActive ? "Active - tracking trips in background" : "Paused - start tracking to detect trips"}
              </Text>
            </View>
            <Pressable
              style={[styles.trackingToggle, locationActive ? styles.trackingToggleOn : styles.trackingToggleOff]}
              onPress={toggleLocationTracking}
            >
              <Text style={[styles.trackingToggleText, locationActive ? styles.trackingToggleTextOn : styles.trackingToggleTextOff]}>
                {locationActive ? "ON" : "OFF"}
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={18} color="#486800" />
            <Text style={styles.infoTitle}>How Permissions Work</Text>
          </View>
          <Text style={styles.infoText}>
            Location access enables automatic trip detection and carbon calculation. Notifications deliver real-time alerts when high-emission activities are detected. Notification Listener auto-detects orders from delivery apps.
          </Text>
          <Text style={styles.infoText}>
            All location data is processed locally on your device. Only anonymized carbon metrics are synced to the cloud.
          </Text>
        </GlassCard>

        <Pressable style={styles.refreshButton} onPress={refreshPermissions}>
          <Ionicons name="refresh" size={18} color="#154212" />
          <Text style={styles.refreshText}>Refresh Permissions</Text>
        </Pressable>

      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  healthCard: {
    marginBottom: 24,
    padding: 20,
  },
  healthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  healthIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center",
  },
  healthTextWrap: {
    flex: 1,
  },
  healthTitle: {
    fontFamily: "serif",
    fontSize: 20,
    color: colors.primary,
  },
  healthScore: {
    marginTop: 4,
    fontFamily: "sans-serif",
    fontSize: 14,
    fontWeight: "600",
  },
  progressBar: {
    marginTop: 16,
    height: 10,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: colors.surfaceHigh,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  healthDetail: {
    marginTop: 8,
    fontFamily: "sans-serif",
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(188, 240, 174, 0.3)",
    borderRadius: 8,
  },
  locationText: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: colors.primary,
  },
  enableAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  enableAllButtonText: {
    fontFamily: "sans-serif",
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  allGrantedCard: {
    marginBottom: 20,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#154212",
  },
  allGrantedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  allGrantedInfo: {
    flex: 1,
  },
  allGrantedTitle: {
    fontFamily: "serif",
    fontSize: 16,
    fontWeight: "600",
    color: "#154212",
  },
  allGrantedDesc: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  sectionTitle: {
    marginBottom: 12,
    fontFamily: "serif",
    fontSize: 20,
    color: colors.onSurface,
  },
  permissionCard: {
    marginBottom: 12,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  permissionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(230,233,231,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionIconWrapGranted: {
    backgroundColor: "rgba(188, 240, 174, 0.4)",
  },
  permissionInfo: {
    flex: 1,
  },
  permissionLabel: {
    fontWeight: "500",
    fontSize: 14,
    color: colors.onSurface,
  },
  permissionDesc: {
    marginTop: 2,
    fontFamily: "sans-serif",
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: "sans-serif",
    fontSize: 11,
    fontWeight: "500",
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  enableButtonLoading: {
    opacity: 0.6,
  },
  enableButtonText: {
    fontFamily: "sans-serif",
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
  grantedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(188, 240, 174, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  trackingCard: {
    marginBottom: 16,
  },
  trackingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trackingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center",
  },
  trackingInfo: {
    flex: 1,
  },
  trackingLabel: {
    fontWeight: "500",
    fontSize: 14,
    color: colors.onSurface,
  },
  trackingDesc: {
    marginTop: 2,
    fontFamily: "sans-serif",
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  trackingToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 56,
    alignItems: "center",
  },
  trackingToggleOn: {
    backgroundColor: colors.primary,
  },
  trackingToggleOff: {
    backgroundColor: colors.surfaceHigh,
  },
  trackingToggleText: {
    fontFamily: "sans-serif",
    fontSize: 12,
    fontWeight: "700",
  },
  trackingToggleTextOn: {
    color: colors.white,
  },
  trackingToggleTextOff: {
    color: colors.onSurfaceVariant,
  },
  infoCard: {
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontFamily: "serif",
    fontSize: 16,
    color: colors.secondary,
  },
  infoText: {
    fontFamily: "sans-serif",
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(230,233,231,0.5)",
  },
  refreshText: {
    fontFamily: "sans-serif",
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
});
