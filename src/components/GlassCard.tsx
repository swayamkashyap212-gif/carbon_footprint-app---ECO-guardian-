import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { colors } from "../theme/tokens";

type Props = PropsWithChildren<ViewProps> & {
  tone?: "default" | "green" | "red" | "blue";
};

const toneStyles = {
  default: { backgroundColor: "rgba(255,255,255,0.9)", borderColor: colors.white },
  green: { backgroundColor: "rgba(188,240,174,0.4)", borderColor: colors.primaryFixed },
  red: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },
  blue: { backgroundColor: "#e0f2fe", borderColor: "#bae6fd" }
};

export function GlassCard({ children, tone = "default", style, ...props }: Props) {
  return (
    <View
      accessible={true}
      accessibilityRole="summary"
      style={[styles.card, toneStyles[tone], style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#2d5a27",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  }
});
