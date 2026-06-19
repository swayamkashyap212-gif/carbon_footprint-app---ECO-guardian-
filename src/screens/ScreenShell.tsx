import { LinearGradient } from "expo-linear-gradient";
import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/tokens";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  hideHeader?: boolean;
}>;

export function ScreenShell({ title, subtitle, children, hideHeader = false }: Props) {
  return (
    <LinearGradient colors={["#edf6ee", colors.surface, colors.white]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {!hideHeader && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          )}
          {children}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.onSurfaceVariant
  }
});
