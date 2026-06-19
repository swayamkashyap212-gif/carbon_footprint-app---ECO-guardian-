import { Ionicons } from "@expo/vector-icons";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AlertsScreen } from "../screens/AlertsScreen";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { AutomationHubScreen } from "../screens/AutomationHubScreen";
import { CoachScreen } from "../screens/CoachScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { FlightScreen } from "../screens/FlightScreen";
import { InsightsScreen } from "../screens/InsightsScreen";
import { MonitoringScreen } from "../screens/MonitoringScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { PermissionsScreen } from "../screens/PermissionsScreen";
import { RecommendationsScreen } from "../screens/RecommendationsScreen";
import { ShoppingScreen } from "../screens/ShoppingScreen";
import { TrackScreen } from "../screens/TrackScreen";
import { isSupabaseConfigured } from "../services/supabase";
import { useAuth } from "../store/AuthProvider";
import { colors } from "../theme/tokens";
import { ErrorBoundary } from "../components/ErrorBoundary";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Flights: undefined;
  Shopping: undefined;
  Monitoring: undefined;
  Alerts: undefined;
  Analytics: undefined;
  CoreTracking: undefined;
  Recommendations: undefined;
  Permissions: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Automate: undefined;
  Insights: undefined;
  Challenges: undefined;
  Profile: undefined;
};

type StackNavProps = NativeStackNavigationProp<RootStackParamList>;
type TabNavProps = BottomTabNavigationProp<MainTabParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function BackButton() {
  const navigation = useNavigation();
  return (
    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
    </Pressable>
  );
}

function HeaderTitle({ title }: { title: string }) {
  return <Text style={styles.headerTitle}>{title}</Text>;
}

function TabHeader({ title }: { title: string }) {
  return <Text style={styles.tabHeaderTitle}>{title}</Text>;
}

export function AppNavigator() {
  const { loading, session } = useAuth();

  const showApp = session || !isSupabaseConfigured;

  if (loading && !showApp) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showApp ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="Flights"
            options={{
              headerShown: true,
              headerTitle: () => <HeaderTitle title="Flight Tracking" />,
              headerStyle: { backgroundColor: "#edf6ee", elevation: 0, shadowOpacity: 0 } as any,
              headerTintColor: colors.primary,
              headerBackTitleVisible: false,
              headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null
            }}
          >
            {() => (
              <ErrorBoundary name="Flights">
                <FlightScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Shopping"
            options={{
              headerShown: true,
              headerTitle: () => <HeaderTitle title="Shopping Tracking" />,
              headerStyle: { backgroundColor: "#edf6ee", elevation: 0, shadowOpacity: 0 } as any,
              headerTintColor: colors.primary,
              headerBackTitleVisible: false,
              headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null
            }}
          >
            {() => (
              <ErrorBoundary name="Shopping">
                <ShoppingScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Monitoring"
            options={{
              headerShown: true,
              headerTitle: () => <HeaderTitle title="Automation Intelligence" />,
              headerStyle: { backgroundColor: "#edf6ee", elevation: 0, shadowOpacity: 0 } as any,
              headerTintColor: colors.primary,
              headerBackTitleVisible: false,
              headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null
            }}
          >
            {() => (
              <ErrorBoundary name="Monitoring">
                <MonitoringScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Alerts"
            options={{
              headerShown: true,
              headerTitle: () => <HeaderTitle title="Alerts" />,
              headerStyle: { backgroundColor: "#edf6ee", elevation: 0, shadowOpacity: 0 } as any,
              headerTintColor: colors.primary,
              headerBackTitleVisible: false,
              headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null
            }}
          >
            {() => (
              <ErrorBoundary name="Alerts">
                <AlertsScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Analytics"
            options={{
              headerShown: true,
              headerTitle: () => <HeaderTitle title="Analytics" />,
              headerStyle: { backgroundColor: "#edf6ee", elevation: 0, shadowOpacity: 0 } as any,
              headerTintColor: colors.primary,
              headerBackTitleVisible: false,
              headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null
            }}
          >
            {() => (
              <ErrorBoundary name="Analytics">
                <AnalyticsScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="CoreTracking"
            options={{
              headerShown: true,
              headerTitle: () => <HeaderTitle title="Core Tracking" />,
              headerStyle: { backgroundColor: "#edf6ee", elevation: 0, shadowOpacity: 0 } as any,
              headerTintColor: colors.primary,
              headerBackTitleVisible: false,
              headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null
            }}
          >
            {() => (
              <ErrorBoundary name="CoreTracking">
                <TrackScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Recommendations"
            options={{
              headerShown: true,
              headerTitle: () => <HeaderTitle title="Recommendations" />,
              headerStyle: { backgroundColor: "#edf6ee", elevation: 0, shadowOpacity: 0 } as any,
              headerTintColor: colors.primary,
              headerBackTitleVisible: false,
              headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null
            }}
          >
            {() => (
              <ErrorBoundary name="Recommendations">
                <RecommendationsScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Permissions"
            options={{
              headerShown: true,
              headerTitle: () => <HeaderTitle title="Permission Center" />,
              headerStyle: { backgroundColor: "#edf6ee", elevation: 0, shadowOpacity: 0 } as any,
              headerTintColor: colors.primary,
              headerBackTitleVisible: false,
              headerLeft: ({ canGoBack }) => canGoBack ? <BackButton /> : null
            }}
          >
            {() => (
              <ErrorBoundary name="Permissions">
                <PermissionsScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 18,
          height: 72,
          borderRadius: 36,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.9)",
          backgroundColor: "rgba(255,255,255,0.92)",
          ...Platform.select({
            android: { elevation: 8 } as any,
            ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 }
          })
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: "sans-serif" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: "home",
            Automate: "analytics",
            Insights: "sparkles",
            Challenges: "trophy",
            Profile: "person"
          };
          return <Ionicons name={(icons[route.name] ?? "ellipse") as any} color={color} size={size} />;
        }
      })}
    >
      <Tab.Screen name="Home">
        {() => (
          <ErrorBoundary name="Home">
            <DashboardScreen />
          </ErrorBoundary>
        )}
      </Tab.Screen>
      <Tab.Screen name="Automate">
        {() => (
          <ErrorBoundary name="Automate">
            <AutomationHubScreen />
          </ErrorBoundary>
        )}
      </Tab.Screen>
      <Tab.Screen name="Insights">
        {() => (
          <ErrorBoundary name="Insights">
            <InsightsScreen />
          </ErrorBoundary>
        )}
      </Tab.Screen>
      <Tab.Screen name="Challenges">
        {() => (
          <ErrorBoundary name="Challenges">
            <CoachScreen />
          </ErrorBoundary>
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => (
          <ErrorBoundary name="Profile">
            <ProfileScreen />
          </ErrorBoundary>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  backButton: {
    paddingLeft: 8,
    paddingVertical: 8,
    paddingRight: 16
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "sans-serif",
    fontWeight: "600",
    color: colors.primary
  },
  tabHeaderTitle: {
    fontSize: 30,
    color: colors.primary
  }
});
