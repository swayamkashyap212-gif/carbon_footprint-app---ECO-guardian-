import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import { askCarbonCoach, CoachMessage } from "../services/ai";
import { getRecommendationDashboard, RecommendationCard } from "../services/backendApi";
import { calculateLifetimeStats, calculateTravelEfficiencyScore } from "../services/carbonEngine";
import { generateAnalytics } from "../services/analyticsEngine";
import { useAuth } from "../store/AuthProvider";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";

export function CoachScreen() {
  const { session } = useAuth();
  const badges = useAppStore((state) => state.badges);
  const entries = useAppStore((state) => state.entries);
  const electricityLogs = useAppStore((state) => state.electricityLogs);
  const score = useAppStore((state) => state.score);
  const streaks = useAppStore((state) => state.streaks);
  const foodDeliveries = useAppStore((state) => state.foodDeliveries);
  const groceryDeliveries = useAppStore((state) => state.groceryDeliveries);
  const shoppingLogs = useAppStore((state) => state.shoppingLogs);
  const flightLogs = useAppStore((state) => state.flightLogs);
  const rideBookings = useAppStore((state) => state.rideBookings);
  const challenges = useAppStore((state) => state.challenges);
  const userPoints = useAppStore((state) => state.userPoints);
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [messages, setMessages] = useState<CoachMessage[]>([
    { role: "assistant", content: "I reviewed your week. Transport and standby electricity are the easiest wins right now." }
  ]);
  const [input, setInput] = useState("How can I reduce my carbon this week?");
  const [loading, setLoading] = useState(false);

  const lifetimeStats = useMemo(() => calculateLifetimeStats(entries), [entries]);
  const travelEfficiency = useMemo(() => calculateTravelEfficiencyScore(entries, electricityLogs), [entries, electricityLogs]);
  const analytics = useMemo(() => generateAnalytics(
    entries, electricityLogs, shoppingLogs, flightLogs,
    foodDeliveries, groceryDeliveries, rideBookings,
    challenges.filter(c => c.completed).length
  ), [entries, electricityLogs, shoppingLogs, flightLogs, foodDeliveries, groceryDeliveries, rideBookings, challenges]);

  useEffect(() => {
    if (!session?.access_token) return;

    let cancelled = false;

    void getRecommendationDashboard(session.access_token)
      .then((bundle) => {
        if (cancelled) return;
        setRecommendations(bundle.recommendations.slice(0, 3));
        setMessages([{ role: "assistant", content: bundle.coachSummary }]);
      })
      .catch(() => {
        if (cancelled) return;

        const fallbackRecs: RecommendationCard[] = [];
        const transportEntries = entries.filter(e => e.category === "transport");
        const foodEntries = entries.filter(e => e.category === "food_delivery");
        const totalTransportKg = transportEntries.reduce((s, e) => s + e.kgCo2e, 0);
        const totalFoodKg = foodEntries.reduce((s, e) => s + e.kgCo2e, 0);

        if (totalTransportKg > 0) {
          const carTrips = transportEntries.filter(e => !e.label.toLowerCase().includes("metro") && !e.label.toLowerCase().includes("walk") && !e.label.toLowerCase().includes("cycl"));
          if (carTrips.length > 0) {
            fallbackRecs.push({
              id: "off-1",
              category: "transport",
              title: `Switch ${Math.min(carTrips.length, 2)} car trips to metro this week`,
              description: `You took ${carTrips.length} car-based trips this period. Metro produces 92% less CO₂ per km than private car.`,
              carbonSaving: Math.round(carTrips.reduce((s, e) => s + e.kgCo2e, 0) * 0.8 * 10) / 10,
              difficulty: "easy"
            } as any);
          }
        }

        if (totalFoodKg > 0) {
          fallbackRecs.push({
            id: "off-2",
            category: "food",
            title: `Reduce food delivery by ${Math.min(foodEntries.length, 2)} orders/week`,
            description: `You had ${foodEntries.length} food deliveries (${totalFoodKg.toFixed(1)} kg CO₂). Cooking at home eliminates delivery vehicle emissions.`,
            carbonSaving: Math.round(totalFoodKg * 0.6 * 10) / 10,
            difficulty: "medium"
          } as any);
        }

        const hasElectricity = electricityLogs.length > 0;
        if (hasElectricity) {
          fallbackRecs.push({
            id: "off-3",
            category: "electricity",
            title: "Switch to fan-first cooling",
            description: "Using fan before AC can reduce electricity emissions by 15%.",
            carbonSaving: 2.8,
            difficulty: "easy"
          } as any);
        }

        if (fallbackRecs.length === 0) {
          fallbackRecs.push(
            { id: "off-1", category: "transport", title: "Use metro for short commutes", description: "Metro produces 92% less CO₂ than private car per kilometer.", carbonSaving: 4.2, difficulty: "easy" } as any,
            { id: "off-2", category: "food", title: "Cook at home instead of ordering delivery", description: "Cooking at home eliminates delivery vehicle emissions entirely.", carbonSaving: 3.5, difficulty: "medium" } as any,
            { id: "off-3", category: "electricity", title: "Switch to fan-first cooling", description: "Using fan before AC can reduce electricity emissions by 15%.", carbonSaving: 2.8, difficulty: "easy" } as any
          );
        }

        setRecommendations(fallbackRecs);
        const summaryParts: string[] = [];
        if (totalTransportKg > 0) summaryParts.push(`transport (${totalTransportKg.toFixed(1)} kg)`);
        if (totalFoodKg > 0) summaryParts.push(`food delivery (${totalFoodKg.toFixed(1)} kg)`);
        const summary = summaryParts.length > 0
          ? `I reviewed your data. Your biggest impact areas are ${summaryParts.join(" and ")}. Here are personalized recommendations.`
          : "Start logging your activities to get personalized recommendations based on your actual carbon footprint.";
        setMessages([{ role: "assistant", content: summary }]);
      });

    return () => { cancelled = true; };
  }, [session?.access_token, entries.length, electricityLogs.length, foodDeliveries.length]);

  async function send() {
    const userMessage = { role: "user" as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const answer = await askCarbonCoach([...messages, userMessage], session?.access_token, {
        entries,
        electricityLogs,
        foodDeliveries,
        flightLogs,
        shoppingLogs,
        streaks,
        dailyKg: score.dailyKg,
        weeklyKg: score.weeklyKg
      });
      setMessages(prev => [...prev, answer]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I could not process that request. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell title="AI Carbon Coach" subtitle="Personalized action plans, nudges, and lifestyle analysis.">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
      <GlassCard style={{ marginBottom: 20 }}>
        <Text style={styles.text2xl}>This Week's Plan</Text>
        {recommendations.map((item) => (
          <View key={item.id} style={styles.recommendationItem}>
            <Text style={styles.fontMedium}>{item.title}</Text>
            <Text style={styles.mt1Sm}>{item.carbonSaving} kg CO2e potential saving - {item.difficulty}</Text>
          </View>
        ))}
      </GlassCard>

      <GlassCard style={{ marginBottom: 20 }}>
        <Text style={styles.text2xl}>Your Carbon Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{lifetimeStats.todayKg} kg</Text>
            <Text style={styles.summaryLabel}>Today</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{lifetimeStats.weekKg} kg</Text>
            <Text style={styles.summaryLabel}>This Week</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{lifetimeStats.totalKg} kg</Text>
            <Text style={styles.summaryLabel}>Lifetime</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{travelEfficiency}%</Text>
            <Text style={styles.summaryLabel}>Travel Efficiency</Text>
          </View>
        </View>
        <Text style={styles.mt1Sm}>
          Equivalent to {lifetimeStats.totalTrees} trees absorbing CO₂ for a year
        </Text>
      </GlassCard>

      <GlassCard style={{ marginBottom: 20 }}>
        <Text style={styles.text2xl}>Eco Badges</Text>
        <Text style={styles.mt1Sm}>Earn rewards by logging usage, choosing greener routes, and reducing daily impact.</Text>
        <View style={styles.badgeList}>
          {badges.map((badge) => (
            <View key={badge.id} style={styles.badgeCard}>
              <View style={styles.badgeRow}>
                <View style={[styles.badgeIcon, badge.earned ? styles.badgeIconEarned : styles.badgeIconLocked]}>
                  <Ionicons name={badge.icon} size={20} color={badge.earned ? "white" : "#154212"} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.fontMedium}>{badge.title}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                </View>
                <Text style={styles.xsPrimary}>{badge.earned ? "Earned" : `${badge.progress}%`}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${badge.progress}%` }]} />
              </View>
            </View>
          ))}
        </View>
      </GlassCard>

      {userPoints.total > 0 && (
        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Eco Points</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{userPoints.total.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Points</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>Lv.{userPoints.level}</Text>
              <Text style={styles.summaryLabel}>Level</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{userPoints.xp}/{userPoints.xpToNextLevel}</Text>
              <Text style={styles.summaryLabel}>XP</Text>
            </View>
          </View>
        </GlassCard>
      )}

      {challenges.length > 0 && (
        <GlassCard style={{ marginBottom: 20 }}>
          <Text style={styles.text2xl}>Active Challenges</Text>
          <Text style={styles.mt1Sm}>Complete challenges to earn bonus points and unlock badges.</Text>
          <View style={{ gap: 12, marginTop: 12 }}>
            {challenges.map(challenge => (
              <View key={challenge.id} style={{ borderRadius: 16, backgroundColor: "#f2f4f2", padding: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontWeight: "600", color: "#191c1b", fontSize: 15 }}>{challenge.title}</Text>
                  {challenge.completed ? (
                    <Ionicons name="checkmark-circle" size={20} color="#486800" />
                  ) : (
                    <Text style={{ fontSize: 12, fontWeight: "500", color: "#486800" }}>{challenge.reward} pts</Text>
                  )}
                </View>
                <Text style={{ marginTop: 4, fontSize: 13, color: "#42493e" }}>{challenge.description}</Text>
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: "#e6e9e7", overflow: "hidden" }}>
                    <View style={{ height: "100%", width: `${Math.min(100, challenge.target > 0 ? (challenge.progress / challenge.target) * 100 : 0)}%`, borderRadius: 999, backgroundColor: challenge.completed ? "#486800" : "#154212" }} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: "#42493e" }}>
                    {challenge.progress}/{challenge.target} {challenge.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </GlassCard>
      )}

      <GlassCard style={{ marginBottom: 20 }}>
        <View style={styles.gap3}>
          {messages.map((message, index) => (
            <View key={`${message.role}-${index}`} style={message.role === "assistant" ? styles.messageAssistant : styles.messageUser}>
              <Text style={styles.messageText}>{message.content}</Text>
            </View>
          ))}
          {loading ? <ActivityIndicator color="#154212" /> : null}
        </View>
      </GlassCard>

      <View style={styles.inputRow}>
        <TextInput style={styles.textInput} value={input} onChangeText={setInput} placeholder="Ask your carbon coach" />
        <Pressable style={styles.sendButton} onPress={send}>
          <Ionicons name="send" size={20} color="white" />
        </Pressable>
      </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  text2xl: {
    fontFamily: "serif",
    fontSize: 24,
    color: colors.primary,
  },
  recommendationItem: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHigh,
    paddingTop: 16,
  },
  fontMedium: {
    fontWeight: "500",
    color: colors.onSurface,
  },
  mt1Sm: {
    marginTop: 4,
    fontFamily: "sans-serif",
    fontSize: 14,
    color: colors.onSurfaceVariant,
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
  badgeList: {
    marginTop: 16,
    gap: 12,
  },
  badgeCard: {
    borderRadius: 16,
    backgroundColor: "rgba(230,233,231,0.5)",
    padding: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  badgeIconEarned: {
    backgroundColor: colors.primary,
  },
  badgeIconLocked: {
    backgroundColor: colors.primaryFixed,
  },
  flex1: {
    flex: 1,
  },
  badgeDescription: {
    marginTop: 4,
    fontFamily: "sans-serif",
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  xsPrimary: {
    fontWeight: "500",
    fontSize: 12,
    color: colors.primary,
  },
  progressTrack: {
    marginTop: 12,
    height: 8,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: colors.surfaceHigh,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  gap3: {
    gap: 12,
  },
  messageAssistant: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(188, 240, 174, 0.5)",
  },
  messageUser: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainer,
  },
  messageText: {
    fontFamily: "sans-serif",
    fontSize: 14,
    lineHeight: 24,
    color: colors.onSurface,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: "sans-serif",
    color: colors.onSurface,
  },
  sendButton: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
});
