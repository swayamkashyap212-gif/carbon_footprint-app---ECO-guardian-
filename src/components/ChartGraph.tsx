import { useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/tokens";

type DataPoint = { label: string; value: number };

type Props = {
  daily: DataPoint[];
  weekly: DataPoint[];
  monthly: DataPoint[];
  yearly: DataPoint[];
  goalKg?: number;
};

export function ChartGraph({ daily, weekly, monthly, yearly, goalKg = 9 }: Props) {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

  const tabs = [
    { key: "daily" as const, label: "D" },
    { key: "weekly" as const, label: "W" },
    { key: "monthly" as const, label: "M" },
    { key: "yearly" as const, label: "Y" },
  ];

  const dataMap = { daily, weekly, monthly, yearly };
  const data = dataMap[activeTab];

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="bar-chart-outline" size={32} color={colors.onSurfaceVariant} />
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          No data yet. Start tracking to see your carbon trends.
        </Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), goalKg * 1.5, 1);
  const highThreshold = goalKg * 1.5;
  const midThreshold = goalKg * 1.1;

  return (
    <View style={styles.container}>
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceHigh }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && {
                backgroundColor: colors.surface,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? colors.primary : colors.onSurfaceVariant },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartContent}>
        <View style={styles.chartArea}>
          {data.map((d, i) => {
            const heightPct = Math.max((d.value / maxVal) * 100, 3);
            const barColor =
              d.value > highThreshold
                ? colors.danger
                : d.value > midThreshold
                  ? colors.warning
                  : colors.primary;
            return (
              <View key={i} style={styles.barColumn}>
                <Text style={[styles.valueLabel, { color: colors.onSurfaceVariant }]}>
                  {d.value < 1 ? d.value.toFixed(1) : Math.round(d.value)}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: barColor,
                      opacity: 0.85,
                    },
                  ]}
                />
                <Text style={[styles.dayLabel, { color: colors.onSurfaceVariant }]}>{d.label}</Text>
              </View>
            );
          })}

          {goalKg > 0 && (
            <View
              style={[
                styles.goalLine,
                {
                  bottom: `${(goalKg / maxVal) * 100}%`,
                  borderColor: colors.primary,
                },
              ]}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>Low</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>Medium</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>High</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  chartContent: {
    paddingHorizontal: 4,
  },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 180,
    paddingTop: 20,
    paddingBottom: 24,
    minWidth: "100%",
    justifyContent: "space-around",
    position: "relative",
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    minWidth: 32,
    maxWidth: 48,
  },
  bar: {
    width: 20,
    borderRadius: 10,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: "500",
  },
  valueLabel: {
    fontSize: 9,
    marginBottom: 4,
    fontWeight: "500",
  },
  goalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
});
