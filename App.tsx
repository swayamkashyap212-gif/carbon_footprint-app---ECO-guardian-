import "react-native-gesture-handler";

import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, BackHandler, View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AuthProvider } from "./src/store/AuthProvider";
import { VehicleSelectionProvider } from "./src/store/VehicleSelectionProvider";
import { initializeNotifications, cleanupNativeListener } from "./src/services/notifications";
import { checkPermission } from "./src/services/permissionService";
import { startLocationTracking, stopLocationTracking } from "./src/services/locationService";
import { hydrateFromDatabase } from "./src/services/dataBridge";
import { startHealthCheck, stopHealthCheck } from "./src/services/trackingEngine";
import { loadTrackingPreferences, startAllTracking, stopAllTracking, getTrackingPreferences } from "./src/services/masterTracking";

void SplashScreen.preventAutoHideAsync().catch(() => {});

function CrashFallback({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View style={crashStyles.container}>
      <Text style={crashStyles.title}>EcoGuardian AI</Text>
      <Text style={crashStyles.subtitle}>Something went wrong</Text>
      <Text style={crashStyles.error}>{error}</Text>
      <TouchableOpacity style={crashStyles.retryBtn} onPress={onRetry}>
        <Text style={crashStyles.retryText}>Tap to Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const crashStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#154212", padding: 32 },
  title: { fontSize: 28, fontWeight: "700", color: "#ffffff", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#bcf0ae", marginBottom: 16 },
  error: { fontSize: 12, color: "#ccc", textAlign: "center", marginBottom: 24, lineHeight: 18 },
  retryBtn: { backgroundColor: "#bcf0ae", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999 },
  retryText: { fontSize: 16, fontWeight: "600", color: "#154212" },
});

export default function App() {
  const [ready, setReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [crashError, setCrashError] = useState<string | null>(null);
  const navigationRef = useNavigationContainerRef();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      } catch {}

      try {
        await hydrateFromDatabase();
      } catch {}

      if (mountedRef.current) {
        setReady(true);
      }
    };

    init().catch(() => {
      if (mountedRef.current) setReady(true);
    });

    return () => { mountedRef.current = false; };
  }, [retryCount]);

  useEffect(() => {
    if (!ready) return;

    void (async () => {
      try {
        await loadTrackingPreferences();
        const prefs = getTrackingPreferences();
        if (prefs.masterEnabled && mountedRef.current) {
          await startAllTracking(prefs);
        }
      } catch {}
    })();

    try {
      startHealthCheck(30000);
    } catch {}

    return () => {
      try { stopHealthCheck(); } catch {}
      try { stopAllTracking(); } catch {}
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    let lastAppState: AppStateStatus = AppState.currentState;

    const subscription = AppState.addEventListener("change", async (nextState: AppStateStatus) => {
      const prefs = getTrackingPreferences();

      if (lastAppState.match(/inactive|background/) && nextState === "active") {
        try {
          stopHealthCheck();
          startHealthCheck(30000);
        } catch {}

        if (prefs.masterEnabled) {
          try {
            await startAllTracking(prefs);
          } catch {}
        }
      } else if (nextState.match(/inactive|background/)) {
        if (prefs.masterEnabled) {
          try {
            stopHealthCheck();
            startHealthCheck(60000);
          } catch {}
        }
      }

      lastAppState = nextState;
    });

    return () => subscription.remove();
  }, [ready]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const nav = navigationRef.current;
      if (!nav) return false;

      if (nav.canGoBack()) {
        nav.goBack();
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [navigationRef]);

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (crashError) {
    return <CrashFallback error={crashError} onRetry={() => { setCrashError(null); setReady(false); setRetryCount(c => c + 1); }} />;
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#154212" }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <ErrorBoundary name="Root">
          <AuthProvider>
            <VehicleSelectionProvider>
              <NavigationContainer ref={navigationRef}>
                <StatusBar style="dark" />
                <AppNavigator />
              </NavigationContainer>
            </VehicleSelectionProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
