import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { classifyScore } from "../services/carbonEngine";
import { colors } from "../theme/tokens";

type Props = {
  value: number;
  goal: number;
};

export function EcoGauge({ value, goal }: Props) {
  const status = classifyScore(value);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / Math.max(goal * 2, 1), 1);
  const strokeDashoffset = circumference - circumference * progress;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`Carbon emissions: ${value} kg CO2e. Status: ${status.label}. Goal: ${goal} kg.`}
      accessibilityValue={{ min: 0, max: goal * 2, now: value }}
    >
      <Svg width={156} height={156} viewBox="0 0 156 156">
        <Circle cx="78" cy="78" r={radius} stroke={colors.surfaceHigh} strokeWidth="8" fill="transparent" />
        <Circle
          cx="78"
          cy="78"
          r={radius}
          stroke={status.color}
          strokeWidth="8"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin="78, 78"
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={styles.gaugeValue}>{value}</Text>
        <Text style={styles.unit}>kg CO2e</Text>
        <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center"
  },
  labelContainer: {
    position: "absolute",
    alignItems: "center"
  },
  gaugeValue: {
    fontSize: 36,
    color: colors.primary
  },
  unit: {
    fontWeight: "500",
    fontSize: 12,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant
  },
  status: {
    marginTop: 4,
    fontWeight: "500",
    fontSize: 12
  }
});
