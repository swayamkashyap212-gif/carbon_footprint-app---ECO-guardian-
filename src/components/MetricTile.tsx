import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";
import { GlassCard } from "./GlassCard";

type Props = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
};

export function MetricTile({ icon, label, value, detail }: Props) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 118,
    flex: 1,
    justifyContent: "space-between",
    padding: 16
  },
  iconContainer: {
    marginBottom: 12,
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    backgroundColor: "rgba(188,240,174,0.6)"
  },
  label: {
    fontWeight: "500",
    fontSize: 12,
    color: colors.onSurfaceVariant
  },
  value: {
    marginTop: 4,
    fontSize: 24,
    color: colors.onSurface
  },
  detail: {
    fontFamily: "sans-serif",
    fontSize: 12,
    color: colors.onSurfaceVariant
  }
});
