import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { getClimateNews, getWeatherSummary } from "../services/weatherNews";
import { generateCarbonForecast } from "../services/predictionEngine";
import { getSustainabilityLevel, calculateLifetimeStats, calculateTravelEfficiencyScore, calculateGreenScore } from "../services/carbonEngine";
import { generateAnalytics, AnalyticsSummary } from "../services/analyticsEngine";
import { getCurrentLocation } from "../services/locationService";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";

type Weather = Awaited<ReturnType<typeof getWeatherSummary>>;
type News = Awaited<ReturnType<typeof getClimateNews>>;

export function InsightsScreen() {
  const {
    entries, score, userPoints, streaks, challenges, electricityLogs,
    shoppingLogs, flightLogs, foodDeliveries, groceryDeliveries, rideBookings
  } = useAppStore();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [news, setNews] = useState<News>([]);

  const forecast = useMemo(() => generateCarbonForecast(entries), [entries]);
  const level = getSustainabilityLevel(score?.sustainabilityScore ?? 0);
  const activeStreaks = (streaks ?? []).filter(s => s.active && s.count > 0);
  const activeChallenges = (challenges ?? []).filter(c => !c.completed);
  const completedChallenges = (challenges ?? []).filter(c => c.completed);

  const lifetimeStats = useMemo(() => calculateLifetimeStats(entries), [entries]);
  const travelEfficiency = useMemo(() => calculateTravelEfficiencyScore(entries, electricityLogs), [entries, electricityLogs]);
  const greenScore = useMemo(() => calculateGreenScore(entries, electricityLogs), [entries, electricityLogs]);
  const carbonRiskScore = forecast.risk === "high" ? 90 : forecast.risk === "medium" ? 60 : 25;

  const analytics = useMemo(() => generateAnalytics(
    entries, electricityLogs, shoppingLogs, flightLogs,
    foodDeliveries, groceryDeliveries, rideBookings,
    completedChallenges.length
  ), [entries, electricityLogs, shoppingLogs, flightLogs, foodDeliveries, groceryDeliveries, rideBookings, completedChallenges.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loc = await getCurrentLocation().catch(() => null);
        const lat = loc?.latitude ?? 28.7041;
        const lon = loc?.longitude ?? 77.1025;
        const [weatherData, newsData] = await Promise.all([
          getWeatherSummary(lat, lon).catch(() => null),
          getClimateNews().catch(() => []),
        ]);
        if (!cancelled) {
          if (weatherData) setWeather(weatherData);
          if (newsData && newsData.length > 0) setNews(newsData);
        }
      } catch {
        // Weather/news fetch failed - will show defaults
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const generateWeeklyReport = (): string[] => {
    const lines: string[] = [];
    lines.push(`Weekly Carbon Summary: ${score.weeklyKg} kg CO₂ emitted this week.`);
    if (analytics.trendDirection === "decreasing") {
      lines.push("Your emissions are trending down. Great work reducing your carbon footprint!");
    } else if (analytics.trendDirection === "increasing") {
      lines.push("Your emissions are trending up. Consider switching to public transport or reducing deliveries.");
    } else {
      lines.push("Your emissions are stable. Look for opportunities to reduce further.");
    }
    if (analytics.carbonSaved > 0) {
      lines.push(`You saved ${analytics.carbonSaved} kg CO₂ by choosing greener transport options.`);
    }
    if (activeStreaks.length > 0) {
      lines.push(`Active streaks: ${activeStreaks.map(s => `${s.type.replace(/_/g, " ")} (${s.count} days)`).join(", ")}.`);
    }
    if (completedChallenges.length > 0) {
      lines.push(`${completedChallenges.length} challenges completed this period.`);
    }
    return lines;
  };

  const generateMonthlyReport = (): string[] => {
    const lines: string[] = [];
    lines.push(`Monthly Carbon Report: ${score.monthlyKg} kg CO₂ total.`);
    lines.push(`Lifetime total: ${lifetimeStats.totalKg} kg CO₂ (equivalent to ${lifetimeStats.totalTrees} trees).`);
    if (analytics.categoryBreakdown.length > 0) {
      const top = analytics.categoryBreakdown[0];
      lines.push(`Top emission source: ${top.category.replace("_", " ")} at ${top.totalKg} kg (${top.percentage}%).`);
    }
    if (analytics.flightBreakdown.length > 0) {
      lines.push(`Flight emissions: ${analytics.flightBreakdown.reduce((s, f) => s + f.kg, 0)} kg from ${analytics.flightBreakdown.reduce((s, f) => s + f.count, 0)} flights.`);
    }
    if (analytics.orderBreakdown.length > 0) {
      lines.push(`Delivery orders: ${analytics.totalOrders} orders generating ${analytics.orderBreakdown.reduce((s, o) => s + o.kg, 0)} kg CO₂.`);
    }
    return lines;
  };

  const weeklyReport = generateWeeklyReport();
  const monthlyReport = generateMonthlyReport();

  const behaviorChanges: string[] = [];
  if (analytics.vehicleBreakdown.length > 0) {
    const carTrips = analytics.vehicleBreakdown.find(v => v.mode === "car");
    const metroTrips = analytics.vehicleBreakdown.find(v => v.mode === "metro");
    if (carTrips && metroTrips && carTrips.totalKg > metroTrips.totalKg) {
      behaviorChanges.push("Switch 2 car trips to metro per week to reduce transport emissions by ~40%.");
    }
  }
  if (analytics.orderBreakdown.length > 0) {
    behaviorChanges.push("Group your delivery orders to reduce per-order delivery emissions.");
  }
  if (analytics.flightBreakdown.length > 0) {
    behaviorChanges.push("Consider train for domestic routes under 1000 km to save up to 90% emissions.");
  }
  behaviorChanges.push("Use walking or cycling for trips under 3 km to achieve zero emissions.");

  return (
    <ScreenShell title="Insights" subtitle="Predictions, reports, trends, and sustainability progress.">
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Weekly Carbon Report</Text>
          {weeklyReport.map((line, idx) => (
            <Text key={idx} style={styles.reportLine}>• {line}</Text>
          ))}
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Monthly Carbon Report</Text>
          {monthlyReport.map((line, idx) => (
            <Text key={idx} style={styles.reportLine}>• {line}</Text>
          ))}
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <View style={styles.row}>
            <Ionicons name="analytics" size={18} color="#154212" />
            <Text style={styles.text2xl}>Prediction Engine</Text>
          </View>
          <View style={styles.tileGrid}>
            <Tile label="Next Week" value={`${forecast.nextWeekKg} kg`} />
            <Tile label="Next Month" value={`${forecast.nextMonthKg} kg`} />
          </View>
          <Text style={styles.detailText}>
            Annual: {forecast.annualKg} kg CO₂ · Risk: {forecast.risk}
          </Text>
          {forecast.trendDirection && (
            <Text style={styles.trendText}>Trend: {forecast.trendDirection}</Text>
          )}
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Advanced Scores</Text>
          <View style={styles.tileGrid}>
            <ScoreTile label="Carbon Risk" value={`${carbonRiskScore}/100`} color={carbonRiskScore >= 70 ? "#154212" : carbonRiskScore >= 40 ? "#b86e00" : "#ba1a1a"} icon="shield-checkmark" />
            <ScoreTile label="Travel Efficiency" value={`${travelEfficiency}/100`} color={travelEfficiency >= 70 ? "#154212" : travelEfficiency >= 40 ? "#b86e00" : "#ba1a1a"} icon="car-sport" />
          </View>
          <View style={styles.tileGrid}>
            <ScoreTile label="Green Score" value={`${greenScore}/100`} color={greenScore >= 70 ? "#154212" : greenScore >= 40 ? "#b86e00" : "#ba1a1a"} icon="leaf" />
            <ScoreTile label="Lifetime CO₂" value={`${lifetimeStats.totalKg} kg`} color="#154212" icon="analytics" />
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Lifetime Impact</Text>
          <View style={styles.tileGrid}>
            <Tile label="Total Carbon" value={`${lifetimeStats.totalKg} kg`} />
            <Tile label="Trees Needed" value={`${lifetimeStats.totalTrees}`} />
          </View>
          <View style={styles.tileGrid}>
            <Tile label="This Week" value={`${lifetimeStats.weekKg} kg`} />
            <Tile label="This Month" value={`${lifetimeStats.monthKg} kg`} />
          </View>
          <Text style={styles.detailText}>
            Equivalent to driving {lifetimeStats.totalDrivingKm} km
          </Text>
        </GlassCard>

        {forecast.insights.length > 0 && (
          <GlassCard style={{ marginBottom: 20 }} tone="green">
            <Text style={styles.textLg}>AI Insights</Text>
            {forecast.insights.map((insight, idx) => (
              <Text key={idx} style={styles.reportLine}>• {insight}</Text>
            ))}
          </GlassCard>
        )}

        {behaviorChanges.length > 0 && (
          <GlassCard style={{ marginBottom: 20 }}>
            <Text style={styles.text2xl}>Behavior Changes</Text>
            {behaviorChanges.map((change, idx) => (
              <Text key={idx} style={styles.reportLine}>• {change}</Text>
            ))}
          </GlassCard>
        )}

        <GlassCard style={{ marginBottom: 20 }} tone="blue">
          <Text style={styles.textBlue}>Weather & Climate</Text>
          {weather ? (
            <>
              <View style={styles.tileGrid}>
                <Tile label="Temp" value={`${weather.temperature}°C`} />
                <Tile label="Humidity" value={`${weather.humidity}%`} />
                <Tile label="AQI" value={`${weather.aqi}`} />
                <Tile label="UV" value={`${weather.uvIndex}`} />
              </View>
              <Text style={styles.detailText}>{weather.note}</Text>
            </>
          ) : (
            <Text style={styles.detailText}>Loading weather data...</Text>
          )}
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Carbon News</Text>
          {news.map((item) => (
            <View key={item.id} style={styles.newsItem}>
              <Text style={styles.newsTitle}>{item.title}</Text>
              <Text style={styles.newsCategory}>{item.category}</Text>
            </View>
          ))}
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <View style={styles.betweenRow}>
            <Text style={styles.text2xl}>Sustainability Level</Text>
            <View style={styles.levelRow}>
              <Ionicons name={level.icon} size={18} color={level.color} />
              <Text style={[styles.levelText, { color: level.color }]}>{level.level}</Text>
            </View>
          </View>
          <View style={styles.tileGrid}>
            <Tile label="Score" value={`${score?.sustainabilityScore ?? 0}/100`} />
            <Tile label="Daily" value={`${score?.dailyKg ?? 0} kg`} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, score?.sustainabilityScore ?? 0)}%` }]} />
          </View>
          <Text style={styles.detailText}>
            {score.sustainabilityScore >= 90 ? "You're a Climate Hero!" :
             score.sustainabilityScore >= 75 ? "Excellent progress!" :
             score.sustainabilityScore >= 60 ? "Great, keep reducing!" :
             "Keep going! Small changes add up."}
          </Text>
        </GlassCard>

        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Gamification</Text>
          <View style={styles.tileGrid}>
            <Tile label="Eco Points" value={userPoints.total.toLocaleString()} />
            <Tile label="Level" value={`${userPoints.level}`} />
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.min(100, userPoints.xpToNextLevel > 0 ? (userPoints.xp / userPoints.xpToNextLevel) * 100 : 0)}%` }]} />
          </View>
          <Text style={styles.detailText}>
            {userPoints?.xp ?? 0}/{userPoints?.xpToNextLevel ?? 500} XP to Level {(userPoints?.level ?? 0) + 1}
          </Text>
        </GlassCard>

        {activeStreaks.length > 0 && (
          <GlassCard style={{ marginBottom: 20 }}>
            <Text style={styles.textLg}>Active Streaks</Text>
            {activeStreaks.map((streak) => (
              <View key={streak.id} style={styles.streakItem}>
                <Text style={styles.streakName}>{streak.type.replace(/_/g, " ")}</Text>
                <View style={styles.streakRight}>
                  <Text style={styles.streakCount}>{streak.count} days</Text>
                  <Text style={styles.streakBest}>best: {streak.bestCount}</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        {activeChallenges.length > 0 && (
          <GlassCard style={{ marginBottom: 20 }}>
            <Text style={styles.textLg}>Active Challenges</Text>
            {activeChallenges.map((challenge) => (
              <View key={challenge.id} style={styles.challengeItem}>
                <View style={styles.betweenRow}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeReward}>+{challenge.reward} pts</Text>
                </View>
                <Text style={styles.challengeDesc}>{challenge.description}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${challenge.target > 0 ? Math.min(100, (challenge.progress / challenge.target) * 100) : 0}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>{challenge.progress}/{challenge.target} {challenge.unit}</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        <GlassCard>
          <Text style={styles.textLg}>Recent Points</Text>
          {userPoints.history.slice(0, 5).map((event) => (
            <View key={event.id} style={styles.historyItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyDesc}>{event.description}</Text>
                <Text style={styles.historyDate}>
                  {new Date(event.timestamp).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.historyPoints}>+{event.amount} pts</Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function ScoreTile({ label, value, color, icon }: { label: string; value: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.scoreTile}>
      <View style={styles.scoreTileHeader}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text2xl: { fontFamily: "serif", fontSize: 20, color: colors.primary },
  textLg: { fontFamily: "serif", fontSize: 18, color: colors.primary },
  textBlue: { fontFamily: "serif", fontSize: 20, color: colors.tertiary },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  tile: { flex: 1, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.7)", padding: 12 },
  tileLabel: { fontSize: 11, color: colors.onSurfaceVariant },
  tileValue: { marginTop: 4, fontFamily: "serif", fontSize: 18, color: colors.onSurface },
  scoreTile: { flex: 1, borderRadius: 12, backgroundColor: "rgba(188,240,174,0.2)", padding: 12, borderWidth: 1, borderColor: "rgba(21,66,18,0.1)" },
  scoreTileHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { marginTop: 10, fontFamily: "sans-serif", fontSize: 12, color: colors.onSurfaceVariant },
  trendText: { marginTop: 4, fontFamily: "sans-serif", fontSize: 12, color: colors.primary },
  reportLine: { marginTop: 8, fontFamily: "sans-serif", fontSize: 13, lineHeight: 18, color: colors.onSurfaceVariant },
  progressTrack: { marginTop: 10, height: 8, borderRadius: 999, backgroundColor: colors.surfaceHigh, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: colors.primary },
  xpTrack: { marginTop: 10, height: 6, borderRadius: 999, backgroundColor: colors.surfaceHigh, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 999, backgroundColor: colors.primary },
  betweenRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  levelText: { fontWeight: "500", fontSize: 14 },
  newsItem: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.surfaceHigh, paddingTop: 12 },
  newsTitle: { fontWeight: "500", color: colors.onSurface },
  newsCategory: { marginTop: 4, fontSize: 11, textTransform: "uppercase", color: colors.secondary },
  streakItem: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, backgroundColor: "rgba(188,240,174,0.4)", padding: 10 },
  streakName: { fontWeight: "500", color: colors.onSurface, textTransform: "capitalize" },
  streakRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  streakCount: { fontFamily: "serif", fontSize: 16, color: colors.primary },
  streakBest: { fontSize: 11, color: colors.onSurfaceVariant },
  challengeItem: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.surfaceHigh, paddingTop: 12 },
  challengeTitle: { fontWeight: "500", color: colors.onSurface },
  challengeReward: { fontSize: 11, color: colors.primary, fontWeight: "500" },
  challengeDesc: { marginTop: 4, fontSize: 12, color: colors.onSurfaceVariant },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  progressLabel: { fontSize: 10, color: colors.onSurfaceVariant },
  historyItem: { marginTop: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.surfaceHigh, paddingBottom: 8 },
  historyDesc: { fontSize: 13, color: colors.onSurface },
  historyDate: { fontSize: 10, color: colors.onSurfaceVariant, marginTop: 2 },
  historyPoints: { fontSize: 12, color: "#154212", fontWeight: "500" },
});
