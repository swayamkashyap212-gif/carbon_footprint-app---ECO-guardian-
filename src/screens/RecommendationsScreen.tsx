import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassCard } from "../components/GlassCard";
import {
  askCarbonCoach,
  CoachMessage
} from "../services/ai";
import {
  generateRecommendationDashboard,
  getRecommendationDashboard,
  sendRecommendationFeedback,
  RecommendationDashboard,
  RecommendationCard
} from "../services/backendApi";
import { useAuth } from "../store/AuthProvider";
import { colors } from "../theme/tokens";
import { ScreenShell } from "./ScreenShell";

const initialAssistantMessage: CoachMessage = {
  role: "assistant",
  content: "I am reviewing your live carbon activity. Generate a fresh recommendation set to see your top savings opportunities."
};

export function RecommendationsScreen() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState<RecommendationDashboard | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([initialAssistantMessage]);
  const [input, setInput] = useState("What should I change this week?");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const shownIdsRef = useRef<Set<string>>(new Set());

  const token = session?.access_token;

  const topRecommendation = dashboard?.recommendations[0] ?? null;
  const summaryCards = useMemo(() => {
    if (!dashboard) return [];

    const learning = dashboard.learning ?? { adoptionRate: 0, completionRate: 0 };
    const predictions = dashboard.predictions ?? { weeklyCarbonKg: 0, monthlyCarbonKg: 0 };
    return [
      { label: "Adoption rate", value: `${Math.round((learning.adoptionRate ?? 0) * 100)}%` },
      { label: "Completion rate", value: `${Math.round((learning.completionRate ?? 0) * 100)}%` },
      { label: "Forecast next week", value: `${predictions.weeklyCarbonKg ?? 0} kg` },
      { label: "Forecast next month", value: `${predictions.monthlyCarbonKg ?? 0} kg` }
    ];
  }, [dashboard]);

  async function refreshRecommendations() {
    if (!token) return;
    setRefreshing(true);
    try {
      const generated = await generateRecommendationDashboard(token, { trigger: "manual_refresh" });
      setDashboard(generated);
      setMessages([
        {
          role: "assistant",
          content: generated.coachSummary
        }
      ]);
      await markShownRecommendations(generated.recommendations);
    } finally {
      setRefreshing(false);
    }
  }

  async function recordFeedback(recommendation: RecommendationCard, eventType: "CLICKED" | "IGNORED" | "ADOPTED" | "COMPLETED") {
    if (!token) return;
    try {
      await sendRecommendationFeedback(token, {
        recommendationId: recommendation.id,
        eventType,
        context: {
          title: recommendation.title,
          category: recommendation.category,
          source: recommendation.source
        }
      });
      const latest = await getRecommendationDashboard(token);
      setDashboard(latest);
    } catch (err) {
      console.warn("Could not record recommendation feedback:", err);
    }
  }

  const markShownRecommendations = useCallback(async (recommendations: RecommendationCard[]) => {
    if (!token || recommendations.length === 0) return;

    const unseen = recommendations.filter((recommendation) => !shownIdsRef.current.has(recommendation.id));
    if (unseen.length === 0) return;

    for (const recommendation of unseen) {
      shownIdsRef.current.add(recommendation.id);
      await sendRecommendationFeedback(token, {
        recommendationId: recommendation.id,
        eventType: "SHOWN",
        context: {
          title: recommendation.title,
          category: recommendation.category,
          source: recommendation.source,
          surface: "recommendations_screen"
        }
      });
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    getRecommendationDashboard(token)
      .then((data) => {
        setDashboard(data);
        setMessages([
          {
            role: "assistant",
            content: data.coachSummary
          }
        ]);
        void markShownRecommendations(data.recommendations);
      })
      .catch(async () => {
        try {
          const generated = await generateRecommendationDashboard(token, { trigger: "screen_open" });
          setDashboard(generated);
          setMessages([
            {
              role: "assistant",
              content: generated.coachSummary
            }
          ]);
        } catch (innerError) {
          const fallbackResponse = await askCarbonCoach(
            [{ role: "user", content: "Give me top recommendations to reduce my carbon footprint today." }],
            undefined
          );
          setMessages([fallbackResponse]);
        }
      })
      .finally(() => setLoading(false));
  }, [markShownRecommendations, token]);

  async function sendChat() {
    if (!token || !input.trim()) return;
    const userMessage = { role: "user" as const, content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    try {
      const answer = await askCarbonCoach([...messages, userMessage], token);
      setMessages(prev => [...prev, answer]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I could not process that request. Please try again." }]);
    }
  }

  return (
    <ScreenShell title="Recommendation Engine" subtitle="Personalized, predictive sustainability guidance built from your live activity, history, and patterns." hideHeader>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.mb5}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="sparkles" size={18} color="#154212" />
              <Text style={styles.forecastTitle}>Top Recommendations</Text>
            </View>
            <Pressable onPress={() => void refreshRecommendations()} style={[styles.refreshButton, refreshing && styles.refreshButtonDisabled]}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loadingIndicator} color="#154212" />
          ) : null}

          {topRecommendation ? (
            <View style={styles.topCard}>
              <Text style={styles.topPriority}>Priority {topRecommendation.priorityScore}</Text>
              <Text style={styles.topTitle}>{topRecommendation.title}</Text>
              <Text style={styles.topDescription}>{topRecommendation.description}</Text>
              <Text style={styles.topSavings}>
                Potential saving: {topRecommendation.carbonSaving} kg CO₂ | ₹{topRecommendation.costSaving} | {topRecommendation.difficulty}
              </Text>
            </View>
          ) : null}

          <View style={styles.recommendationsGap}>
            {dashboard?.recommendations.map((recommendation) => (
              <View key={recommendation.id} style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationTextContainer}>
                    <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                    <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
                  </View>
                  <Text style={styles.priorityBadge}>{recommendation.priorityScore}</Text>
                </View>

                <View style={styles.metricPillRow}>
                  <MetricPill label="Carbon" value={`${recommendation.carbonSaving} kg`} />
                  <MetricPill label="Cost" value={`₹${recommendation.costSaving}`} />
                  <MetricPill label="Confidence" value={`${Math.round(recommendation.confidence * 100)}%`} />
                  <MetricPill label="Adoption" value={`${Math.round(recommendation.adoptionProbability * 100)}%`} />
                </View>

                <Text style={styles.reasonText}>{recommendation.reason}</Text>

                <View style={styles.actionRow}>
                  <Pressable style={styles.adoptButton} onPress={() => void recordFeedback(recommendation, "ADOPTED")}>
                    <Text style={styles.adoptButtonText}>Adopt</Text>
                  </Pressable>
                  <Pressable style={styles.completeButton} onPress={() => void recordFeedback(recommendation, "COMPLETED")}>
                    <Text style={styles.completeButtonText}>Complete</Text>
                  </Pressable>
                  <Pressable style={styles.skipButton} onPress={() => void recordFeedback(recommendation, "IGNORED")}>
                    <Text style={styles.skipButtonText}>Skip</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </GlassCard>

        <View style={styles.summaryRow}>
          {summaryCards.map((item) => (
            <GlassCard key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </GlassCard>
          ))}
        </View>

        {dashboard ? (
          <GlassCard style={styles.mb5}>
            <Text style={styles.forecastTitle}>Behavioral Analysis</Text>
            <View style={styles.behaviorGap}>
              <BehaviorLine label="Food orders" value={`${dashboard.behaviorSummary.foodOrders}`} />
              <BehaviorLine label="Grocery orders" value={`${dashboard.behaviorSummary.groceryOrders}`} />
              <BehaviorLine label="Shopping orders" value={`${dashboard.behaviorSummary.shoppingOrders}`} />
              <BehaviorLine label="Late-night orders" value={`${dashboard.behaviorSummary.lateNightOrders}`} />
              <BehaviorLine label="Peak order hour" value={dashboard.behaviorSummary.peakOrderHour === null ? "N/A" : `${dashboard.behaviorSummary.peakOrderHour}:00`} />
              <BehaviorLine label="Recurring merchant" value={dashboard.behaviorSummary.recurringMerchant ?? "None yet"} />
            </View>
          </GlassCard>
        ) : null}

        {dashboard ? (
          <GlassCard style={styles.mb5}>
            <Text style={styles.forecastTitle}>Carbon Hotspots</Text>
            <View style={styles.hotspotGap}>
              {dashboard.hotspots.map((hotspot) => (
                <View key={hotspot.category} style={styles.hotspotCard}>
                  <View style={styles.hotspotHeader}>
                    <Text style={styles.hotspotCategory}>{hotspot.category.replaceAll("_", " ")}</Text>
                    <Text style={styles.hotspotShare}>{hotspot.share}%</Text>
                  </View>
                  <Text style={styles.hotspotKg}>{hotspot.kg} kg CO₂ in the current window</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        ) : null}

        {dashboard ? (
          <GlassCard style={styles.mb5}>
            <Text style={styles.forecastTitle}>Learning Loop</Text>
            <View style={styles.learningPillRow}>
              <MetricPill label="Shown" value={`${dashboard.learning.shown}`} />
              <MetricPill label="Clicked" value={`${dashboard.learning.clicked}`} />
              <MetricPill label="Adopted" value={`${dashboard.learning.adopted}`} />
              <MetricPill label="Completed" value={`${dashboard.learning.completed}`} />
            </View>
            <Text style={styles.learningText}>This engine learns from actions over time and uses your adoption rate to rank the most convenient recommendations first.</Text>
          </GlassCard>
        ) : null}

        <GlassCard>
          <View style={styles.coachHeaderRow}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#154212" />
            <Text style={styles.forecastTitle}>Sustainability Coach</Text>
          </View>
          <View style={styles.messagesGap}>
            {messages.map((message, index) => (
              <View key={`${message.role}-${index}`} style={[styles.messageBubble, message.role === "assistant" ? styles.assistantBubble : styles.userBubble]}>
                <Text style={styles.messageText}>{message.content}</Text>
              </View>
            ))}
          </View>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about savings, hotspots, or habits"
            />
            <Pressable style={styles.sendButton} onPress={() => void sendChat()}>
              <Ionicons name="send" size={20} color="white" />
            </Pressable>
          </View>
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricPillLabel}>{label}</Text>
      <Text style={styles.metricPillValue}>{value}</Text>
    </View>
  );
}

function BehaviorLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.behaviorLine}>
      <Text style={styles.behaviorLineLabel}>{label}</Text>
      <Text style={styles.behaviorLineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mb5: { marginBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  forecastTitle: { fontFamily: "serif", fontSize: 22, color: colors.primary },
  refreshButton: { borderRadius: 9999, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8 },
  refreshButtonDisabled: { opacity: 0.6 },
  refreshButtonText: { fontWeight: "500", color: colors.white },
  loadingIndicator: { marginTop: 24 },
  topCard: { marginTop: 16, borderRadius: 24, backgroundColor: "rgba(188,240,174,0.4)", padding: 16 },
  topLevelText: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: colors.primary },
  topPriority: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: colors.primary },
  topTitle: { marginTop: 8, fontFamily: "serif", fontSize: 20, color: colors.onSurface },
  topDescription: { marginTop: 8, fontFamily: "sans-serif", fontSize: 14, lineHeight: 20, color: colors.onSurfaceVariant },
  topSavings: { marginTop: 12, fontWeight: "500", fontSize: 12, textTransform: "uppercase", color: colors.primary },
  recommendationsGap: { marginTop: 16, gap: 12 },
  recommendationCard: { borderRadius: 16, borderWidth: 1, borderColor: colors.surfaceHigh, backgroundColor: "rgba(255,255,255,0.6)", padding: 16 },
  recommendationHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  recommendationTextContainer: { flex: 1 },
  recommendationTitle: { fontFamily: "serif", fontSize: 18, color: colors.onSurface },
  recommendationDescription: { marginTop: 4, fontFamily: "sans-serif", fontSize: 14, lineHeight: 20, color: colors.onSurfaceVariant },
  priorityBadge: { borderRadius: 9999, backgroundColor: colors.primaryFixed, paddingHorizontal: 12, paddingVertical: 4, fontSize: 12, fontWeight: "600", color: colors.primary },
  metricPillRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricPill: { borderRadius: 9999, backgroundColor: colors.primaryFixed, paddingHorizontal: 12, paddingVertical: 8 },
  metricPillLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: colors.primary },
  metricPillValue: { marginTop: 4, fontWeight: "600", fontSize: 14, color: colors.onSurface },
  reasonText: { marginTop: 12, fontFamily: "sans-serif", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: colors.secondary },
  actionRow: { marginTop: 16, flexDirection: "row", gap: 8 },
  adoptButton: { flex: 1, borderRadius: 9999, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 12 },
  adoptButtonText: { textAlign: "center", fontSize: 14, fontWeight: "500", color: colors.white },
  completeButton: { flex: 1, borderRadius: 9999, backgroundColor: colors.primaryFixed, paddingHorizontal: 12, paddingVertical: 12 },
  completeButtonText: { textAlign: "center", fontSize: 14, fontWeight: "500", color: colors.primary },
  skipButton: { borderRadius: 9999, backgroundColor: "rgba(230,233,231,0.5)", paddingHorizontal: 12, paddingVertical: 12 },
  skipButtonText: { fontSize: 14, fontWeight: "500", color: colors.onSurfaceVariant },
  summaryRow: { marginBottom: 20, flexDirection: "row", gap: 12 },
  summaryCard: { flex: 1 },
  summaryLabel: { fontFamily: "sans-serif", fontSize: 12, textTransform: "uppercase", color: colors.onSurfaceVariant },
  summaryValue: { marginTop: 8, fontFamily: "serif", fontSize: 20, color: colors.onSurface },
  behaviorGap: { marginTop: 16, gap: 8 },
  behaviorLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", paddingHorizontal: 16, paddingVertical: 12 },
  behaviorLineLabel: { fontWeight: "500", fontSize: 14, color: colors.onSurface },
  behaviorLineValue: { fontFamily: "sans-serif", fontSize: 14, color: colors.primary },
  hotspotGap: { marginTop: 16, gap: 12 },
  hotspotCard: { borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", padding: 16 },
  hotspotHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hotspotCategory: { fontWeight: "500", textTransform: "capitalize", color: colors.onSurface },
  hotspotShare: { fontFamily: "sans-serif", fontSize: 14, color: colors.primary },
  hotspotKg: { marginTop: 4, fontFamily: "sans-serif", fontSize: 12, color: colors.onSurfaceVariant },
  learningPillRow: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  learningText: { marginTop: 16, fontFamily: "sans-serif", fontSize: 14, color: colors.onSurfaceVariant },
  coachHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  messagesGap: { marginTop: 16, gap: 12 },
  messageBubble: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  assistantBubble: { backgroundColor: "rgba(188,240,174,0.5)" },
  userBubble: { backgroundColor: colors.surfaceHigh },
  messageText: { fontFamily: "sans-serif", fontSize: 14, lineHeight: 24, color: colors.onSurface },
  chatInputRow: { marginTop: 16, flexDirection: "row", gap: 12 },
  chatInput: { flex: 1, borderRadius: 16, backgroundColor: "rgba(230,233,231,0.5)", paddingHorizontal: 16, paddingVertical: 16, fontFamily: "sans-serif", color: colors.onSurface },
  sendButton: { height: 56, width: 56, alignItems: "center", justifyContent: "center", borderRadius: 9999, backgroundColor: colors.primary },
});
