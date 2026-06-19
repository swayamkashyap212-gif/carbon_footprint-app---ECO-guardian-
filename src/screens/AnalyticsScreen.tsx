import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard } from "../components/GlassCard";
import { TrendChart } from "../components/TrendChart";
import { generateCarbonForecast } from "../services/predictionEngine";
import { generateAnalytics, AnalyticsSummary, GraphDataPoint } from "../services/analyticsEngine";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";

type GraphTab = "daily" | "weekly" | "monthly" | "yearly";

export function AnalyticsScreen() {
  const {
    entries, electricityLogs, shoppingLogs, flightLogs,
    foodDeliveries, groceryDeliveries, rideBookings, challenges
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<GraphTab>("daily");
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  const forecast = generateCarbonForecast(entries);

  useEffect(() => {
    const a = generateAnalytics(
      entries, electricityLogs, shoppingLogs, flightLogs,
      foodDeliveries, groceryDeliveries, rideBookings,
      challenges.filter(c => c.completed).length
    );
    setAnalytics(a);
  }, [entries, electricityLogs, shoppingLogs, flightLogs, foodDeliveries, groceryDeliveries, rideBookings, challenges]);

  const tabs: { key: GraphTab; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "yearly", label: "Yearly" }
  ];

  const getGraphData = (tab: GraphTab): { day: string; kg: number }[] => {
    if (!analytics) return [];
    const map: Record<GraphTab, GraphDataPoint[]> = {
      daily: analytics.dailyGraph,
      weekly: analytics.weeklyGraph,
      monthly: analytics.monthlyGraph,
      yearly: analytics.yearlyGraph
    };
    return map[tab].map(d => ({ day: d.label, kg: d.value }));
  };

  return (
    <ScreenShell title="Carbon Analytics" subtitle="Live graphs, predictions, and emission analysis.">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.mb}>
          <Text style={styles.title}>Carbon Forecast</Text>
          <View style={styles.metricGrid}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Next Week</Text>
              <Text style={styles.metricValue}>{forecast.nextWeekKg} kg</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Next Month</Text>
              <Text style={styles.metricValue}>{forecast.nextMonthKg} kg</Text>
            </View>
          </View>
          <View style={styles.metricGrid}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Next Quarter</Text>
              <Text style={styles.metricValue}>{forecast.nextQuarterKg} kg</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Annual</Text>
              <Text style={styles.metricValue}>{forecast.annualKg} kg</Text>
            </View>
          </View>
          <View style={styles.riskRow}>
            <Ionicons name={forecast.risk === "high" ? "warning" : forecast.risk === "medium" ? "alert-circle" : "checkmark-circle"} size={16} color={forecast.risk === "high" ? "#ba1a1a" : forecast.risk === "medium" ? "#b86e00" : "#154212"} />
            <Text style={[styles.riskText, { color: forecast.risk === "high" ? "#ba1a1a" : forecast.risk === "medium" ? "#b86e00" : "#154212" }]}>
              Risk: {forecast.risk.toUpperCase()}
            </Text>
            {forecast.trendDirection && (
              <Text style={styles.trendText}> · Trend: {forecast.trendDirection}</Text>
            )}
          </View>
        </GlassCard>

        <GlassCard style={styles.mb}>
          <Text style={styles.title}>Carbon Graph</Text>
          <View style={styles.tabRow}>
            {tabs.map(tab => (
              <Pressable
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
          {analytics && (
            <TrendChart data={getGraphData(activeTab)} />
          )}
          {analytics && (
            <View style={styles.graphSummary}>
              <Text style={styles.graphSummaryText}>
                {activeTab === "daily" ? "7-day" : activeTab === "weekly" ? "12-week" : activeTab === "monthly" ? "12-month" : "12-year"} data · {getGraphData(activeTab).reduce((s, d) => s + d.kg, 0).toFixed(1)} kg total
              </Text>
            </View>
          )}
        </GlassCard>

        {analytics && analytics.vehicleBreakdown.length > 0 && (
          <GlassCard style={styles.mb}>
            <Text style={styles.title}>Transport Breakdown</Text>
            {analytics.vehicleBreakdown.map(v => (
              <View key={v.mode} style={styles.barRow}>
                <Text style={styles.barLabel}>{v.mode}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(5, v.percentage)}%` }]} />
                </View>
                <Text style={styles.barValue}>{v.totalKg} kg ({v.percentage}%)</Text>
              </View>
            ))}
          </GlassCard>
        )}

        {analytics && analytics.shoppingBreakdown.length > 0 && (
          <GlassCard style={styles.mb}>
            <Text style={styles.title}>Shopping Carbon</Text>
            {analytics.shoppingBreakdown.map(s => (
              <View key={s.category} style={styles.barRow}>
                <Text style={styles.barLabel}>{s.category}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(5, s.percentage)}%`, backgroundColor: s.color }]} />
                </View>
                <Text style={styles.barValue}>{s.totalKg} kg ({s.percentage}%)</Text>
              </View>
            ))}
          </GlassCard>
        )}

        {analytics && analytics.flightBreakdown.length > 0 && (
          <GlassCard style={styles.mb}>
            <Text style={styles.title}>Flight Carbon</Text>
            {analytics.flightBreakdown.map(f => (
              <View key={f.route} style={styles.barRow}>
                <Text style={styles.barLabel}>{f.route}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.min(100, f.kg)}%`, backgroundColor: "#ba1a1a" }]} />
                </View>
                <Text style={styles.barValue}>{f.kg} kg · {f.count}x</Text>
              </View>
            ))}
          </GlassCard>
        )}

        {analytics && analytics.orderBreakdown.length > 0 && (
          <GlassCard style={styles.mb}>
            <Text style={styles.title}>Order Carbon</Text>
            {analytics.orderBreakdown.map(o => (
              <View key={o.platform} style={styles.barRow}>
                <Text style={styles.barLabel}>{o.platform}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.min(100, o.kg)}%`, backgroundColor: "#486800" }]} />
                </View>
                <Text style={styles.barValue}>{o.kg} kg · {o.count} orders</Text>
              </View>
            ))}
          </GlassCard>
        )}

        {analytics && (
          <GlassCard style={styles.mb}>
            <Text style={styles.title}>Category Breakdown</Text>
            {analytics.categoryBreakdown.map(cat => (
              <View key={cat.category} style={styles.barRow}>
                <Text style={styles.barLabel}>{cat.category.replace("_", " ")}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(5, cat.percentage)}%`, backgroundColor: cat.color }]} />
                </View>
                <Text style={styles.barValue}>{cat.totalKg} kg ({cat.percentage}%)</Text>
              </View>
            ))}
          </GlassCard>
        )}

        <GlassCard style={styles.mb}>
          <Text style={styles.title}>AI Insights</Text>
          {forecast.insights.map((insight, idx) => (
            <View key={idx} style={styles.insightRow}>
              <Ionicons name="bulb" size={14} color="#b86e00" />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
          {forecast.drivers.map((driver, idx) => (
            <View key={`d-${idx}`} style={styles.insightRow}>
              <Ionicons name="analytics" size={14} color="#154212" />
              <Text style={styles.insightText}>{driver}</Text>
            </View>
          ))}
          {forecast.insights.length === 0 && forecast.drivers.length === 0 && (
            <Text style={styles.emptyText}>Add more activities to generate AI insights.</Text>
          )}
        </GlassCard>

        {forecast.scenarioImpacts && forecast.scenarioImpacts.length > 0 && (
          <GlassCard style={styles.mb}>
            <Text style={styles.title}>What-If Scenarios</Text>
            {forecast.scenarioImpacts.map((scenario, idx) => (
              <View key={idx} style={styles.scenarioItem}>
                <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                <Text style={styles.scenarioDesc}>{scenario.description}</Text>
                <Text style={styles.scenarioSavings}>Saves {scenario.savings} kg CO₂</Text>
              </View>
            ))}
          </GlassCard>
        )}

        {analytics && (
          <GlassCard>
            <Text style={styles.title}>Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{analytics.totalTrips}</Text>
                <Text style={styles.summaryLabel}>Trips</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{analytics.totalOrders}</Text>
                <Text style={styles.summaryLabel}>Orders</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{analytics.totalFlights}</Text>
                <Text style={styles.summaryLabel}>Flights</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{analytics.carbonSaved} kg</Text>
                <Text style={styles.summaryLabel}>Carbon Saved</Text>
              </View>
            </View>
            <Text style={styles.summaryDetail}>
              Peak: {analytics.peakDay} · Greenest: {analytics.greenestDay} · Avg: {analytics.avgDailyKg} kg/day
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  mb: { marginBottom: 20 },
  title: { fontFamily: "serif", fontSize: 20, color: colors.primary, marginBottom: 12 },
  metricGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  metricTile: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.7)",
    padding: 12,
  },
  metricLabel: { fontSize: 11, color: colors.onSurfaceVariant },
  metricValue: { marginTop: 4, fontFamily: "serif", fontSize: 18, color: colors.primary },
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  riskText: { fontWeight: "600", fontSize: 12 },
  trendText: { fontSize: 12, color: colors.onSurfaceVariant },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceHigh,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.white,
  },
  graphSummary: {
    marginTop: 8,
    alignItems: "center",
  },
  graphSummaryText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHigh,
    gap: 8,
  },
  barLabel: {
    width: 90,
    fontSize: 11,
    color: colors.onSurface,
    textTransform: "capitalize",
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  barValue: {
    width: 100,
    fontSize: 10,
    fontWeight: "500",
    color: colors.primary,
    textAlign: "right",
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  scenarioItem: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHigh,
    paddingTop: 12,
  },
  scenarioTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: colors.onSurface,
  },
  scenarioDesc: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  scenarioSavings: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.primary,
    marginTop: 6,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryItem: {
    width: "47%",
    borderRadius: 10,
    backgroundColor: "rgba(188,240,174,0.3)",
    padding: 10,
    alignItems: "center",
  },
  summaryValue: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "600",
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    marginTop: 2,
  },
  summaryDetail: {
    marginTop: 12,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  emptyText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontStyle: "italic",
  },
});
