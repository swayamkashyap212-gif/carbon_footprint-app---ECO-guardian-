import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/tokens";

type Props = {
  dailyKg: number;
  goalKg: number;
  sustainabilityScore: number;
  level: string;
  levelIcon: string;
  levelColor: string;
  date: string;
};

export function CarbonRecorder({
  dailyKg,
  goalKg,
  sustainabilityScore,
  level,
  levelIcon,
  levelColor,
  date,
}: Props) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(dailyKg / Math.max(goalKg * 2, 1), 1);

  const getStatusColor = () => {
    if (dailyKg <= goalKg) return colors.primary;
    if (dailyKg <= goalKg * 1.5) return colors.warning;
    return colors.danger;
  };

  const statusColor = getStatusColor();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedValue, {
        toValue: progress,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const percentage = Math.round((dailyKg / Math.max(goalKg, 1)) * 100);

  return (
    <LinearGradient
      colors={["#1a4d1a", "#2d5a27", "#154212"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.glowOverlay} />
      
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.dateText}>{date}</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
          <Ionicons name={levelIcon as any} size={12} color="#fff" />
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        <Animated.View style={[styles.gaugeContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.gaugeWrapper}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.gaugeOuter}>
                <View style={[styles.gaugeRing, { borderColor: "rgba(255,255,255,0.1)" }]} />
                <View style={[styles.gaugeProgress, { borderColor: statusColor, opacity: progress }]} />
              </View>
            </Animated.View>
            
            <View style={styles.gaugeCenter}>
              <Animated.Text style={[styles.carbonValue, { opacity: fadeAnim }]}>
                {dailyKg < 10 ? dailyKg.toFixed(1) : Math.round(dailyKg)}
              </Animated.Text>
              <Text style={styles.carbonUnit}>kg CO₂</Text>
              <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>
                  {dailyKg <= goalKg ? "On Track" : dailyKg <= goalKg * 1.5 ? "Over Goal" : "High"}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.sideStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(sustainabilityScore)}</Text>
            <Text style={styles.statLabel}>Eco Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{goalKg}</Text>
            <Text style={styles.statLabel}>Goal kg</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{percentage}%</Text>
            <Text style={styles.statLabel}>of Goal</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <View style={[styles.footerDot, { backgroundColor: dailyKg <= goalKg ? "#4ade80" : "#fbbf24" }]} />
          <Text style={styles.footerText}>
            {dailyKg <= goalKg ? "Within daily goal" : `${(dailyKg - goalKg).toFixed(1)} kg over goal`}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="leaf" size={14} color="#4ade80" />
          <Text style={styles.footerText}>
            {Math.round((goalKg - dailyKg) * 10) / 10} kg remaining
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#154212",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(188,240,174,0.05)",
    borderRadius: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  mainContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeWrapper: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 8,
    borderColor: "rgba(255,255,255,0.1)",
  },
  gaugeRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
  },
  gaugeProgress: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
  },
  gaugeCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  carbonValue: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  carbonUnit: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
  },
  sideStats: {
    flex: 1,
    gap: 12,
  },
  statBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
    textTransform: "uppercase",
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
});
