import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../theme/tokens";

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = "100%", height = 20, borderRadius = 8, style }: Props) {
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animated, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animated, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surfaceHigh,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[skeletonStyles.card, style]}>
      <Skeleton width="60%" height={16} />
      <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
      <Skeleton width="100%" height={80} borderRadius={12} style={{ marginTop: 16 }} />
    </View>
  );
}

export function SkeletonMetric() {
  return (
    <View style={skeletonStyles.metric}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <Skeleton width="70%" height={14} style={{ marginTop: 12 }} />
      <Skeleton width="50%" height={24} style={{ marginTop: 8 }} />
      <Skeleton width="60%" height={10} style={{ marginTop: 4 }} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 20,
  },
  metric: {
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
});
