import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/tokens";

type Status = "active" | "inactive" | "error" | "warning";

type Props = {
  status: Status;
  label: string;
  sublabel?: string;
  icon: string;
  lastUpdated?: string;
};

export function StatusIndicator({ status, label, sublabel, icon, lastUpdated }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === "active") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const statusColor =
    status === "active"
      ? colors.primary
      : status === "error"
        ? colors.danger
        : status === "warning"
          ? colors.warning
          : colors.onSurfaceVariant;

  const statusBg =
    status === "active"
      ? "rgba(188,240,174,0.4)"
      : status === "error"
        ? "rgba(186,26,26,0.1)"
        : status === "warning"
          ? "rgba(184,110,0,0.1)"
          : colors.surfaceHigh;

  return (
    <View
      style={[styles.container, { backgroundColor: "rgba(255,255,255,0.9)", borderColor: "rgba(0,0,0,0.06)" }]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${status}. ${sublabel || ""} ${lastUpdated ? `Last updated: ${lastUpdated}` : ""}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: statusBg }]}>
        <Ionicons name={icon as any} size={18} color={statusColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.onSurface }]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.sublabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
            {sublabel}
          </Text>
        )}
        {lastUpdated && (
          <Text style={[styles.timestamp, { color: colors.onSurfaceVariant }]}>{lastUpdated}</Text>
        )}
      </View>
      <Animated.View style={[styles.dot, { backgroundColor: statusColor, opacity: status === "active" ? pulseAnim : 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  sublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
