import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { colors } from "../theme/tokens";

export function EarthPulse() {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const breatheLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    spinLoopRef.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoopRef.current.start();

    breatheLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.08,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    breatheLoopRef.current.start();

    return () => {
      spinLoopRef.current?.stop();
      breatheLoopRef.current?.stop();
    };
  }, [spinAnim, breatheAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.sphere, { transform: [{ rotate: spin }, { scale: breatheAnim }] }]}>
        <LinearGradient colors={["#a5caef", "#4dab5d", colors.primary]} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          <View style={styles.land1} />
          <View style={styles.land2} />
          <View style={styles.land3} />
        </LinearGradient>
      </Animated.View>
      <View style={styles.ring} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.8
  },
  sphere: {
    height: 288,
    width: 288,
    borderRadius: 9999,
    overflow: "hidden"
  },
  gradient: {
    flex: 1
  },
  land1: {
    position: "absolute",
    left: 32,
    top: 48,
    height: 48,
    width: 112,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.35)"
  },
  land2: {
    position: "absolute",
    right: 28,
    top: 96,
    height: 64,
    width: 80,
    borderRadius: 9999,
    backgroundColor: "rgba(188,240,174,0.6)"
  },
  land3: {
    position: "absolute",
    bottom: 48,
    left: 64,
    height: 80,
    width: 96,
    borderRadius: 9999,
    backgroundColor: "rgba(21,66,18,0.45)"
  },
  ring: {
    position: "absolute",
    height: 384,
    width: 384,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(188,240,174,0.5)"
  }
});
