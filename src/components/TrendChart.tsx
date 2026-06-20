import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";

type Props = {
  data: { day: string; kg: number }[];
  goalKg?: number;
};

export function TrendChart({ data, goalKg = 9 }: Props) {
  const maxVal = Math.max(...data.map((d) => d.kg), 1);
  const highThreshold = goalKg * 1.5;
  const midThreshold = goalKg * 1.1;

  const chartDescription = data.map(d => `${d.day}: ${d.kg} kg`).join(", ");

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Weekly carbon trend chart. Goal: ${goalKg} kg. Data: ${chartDescription}`}
    >
      <View style={styles.chartArea}>
        {data.map((d, i) => {
          const heightPct = Math.max((d.kg / maxVal) * 100, 4);
          const barColor = d.kg > highThreshold ? colors.primary : d.kg > midThreshold ? "#a1d494" : "#d8dad9";
          return (
            <View key={i} style={styles.barColumn}>
              <Text style={styles.valueLabel}>{d.kg}</Text>
              <View style={[styles.bar, { height: `${heightPct}%`, backgroundColor: barColor }]} />
              <Text style={styles.dayLabel}>{d.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 208,
  },
  chartArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 20,
    paddingBottom: 24,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: 16,
    borderRadius: 8,
  },
  dayLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: "center",
  },
  valueLabel: {
    fontSize: 9,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
    textAlign: "center",
  },
});
