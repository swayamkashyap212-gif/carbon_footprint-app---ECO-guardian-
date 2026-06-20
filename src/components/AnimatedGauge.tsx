import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
  getColor?: (value: number, max: number) => string;
};

function getDefaultColor(value: number, max: number): string {
  const ratio = value / max;
  if (ratio <= 0.5) return colors.primary;
  if (ratio <= 0.75) return colors.warning;
  return colors.danger;
}

export function AnimatedGauge({
  value,
  max,
  size = 180,
  strokeWidth = 12,
  label,
  unit,
  getColor = getDefaultColor,
}: Props) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / Math.max(max, 1), 1);
  const color = getColor(value, max);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedValue, {
        toValue: progress,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={label ? `${label}: ${value} ${unit || ""}` : `${value} ${unit || ""}`}
      accessibilityValue={{ min: 0, max, now: value }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceHigh}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Animated.View style={[styles.labelContainer, { opacity: animatedOpacity }]}>
        <Text style={[styles.value, { color: colors.onSurface }]}>
          {typeof value === "number" ? (value < 10 ? value.toFixed(1) : Math.round(value)) : value}
        </Text>
        {unit && <Text style={[styles.unit, { color: colors.onSurfaceVariant }]}>{unit}</Text>}
        {label && <Text style={[styles.label, { color }]}>{label}</Text>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    position: "absolute",
    alignItems: "center",
  },
  value: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1,
  },
  unit: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
});
