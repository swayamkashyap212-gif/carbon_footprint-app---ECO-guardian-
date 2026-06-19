import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";

export type VehicleOption = {
  id: string;
  label: string;
  icon: string;
  carbonFactor: number;
};

export const VEHICLE_OPTIONS: VehicleOption[] = [
  { id: "bicycle", label: "Bicycle", icon: "\u{1F6B2}", carbonFactor: 0 },
  { id: "electric_bike", label: "Electric Bike", icon: "\u{1F6F4}", carbonFactor: 0.015 },
  { id: "petrol_bike", label: "Bike/Scooter", icon: "\u{1F6F5}", carbonFactor: 0.072 },
  { id: "auto_rickshaw", label: "Auto Rickshaw", icon: "\u{1F683}", carbonFactor: 0.098 },
  { id: "ev_car", label: "EV/Cab", icon: "\u{1F697}", carbonFactor: 0.053 },
  { id: "petrol_car", label: "Car/Taxi", icon: "\u{1F697}", carbonFactor: 0.192 },
  { id: "van", label: "Van/Truck", icon: "\u{1F69A}", carbonFactor: 0.285 },
  { id: "walking", label: "Walking", icon: "\u{1F6B6}", carbonFactor: 0 },
];

type VehicleTypePromptProps = {
  visible: boolean;
  platformName: string;
  orderId?: string;
  onSelect: (vehicle: VehicleOption) => void;
  onSkip: () => void;
};

export function VehicleTypePrompt({
  visible,
  platformName,
  orderId,
  onSelect,
  onSkip,
}: VehicleTypePromptProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleSelect = (vehicle: VehicleOption) => {
    setSelected(vehicle.id);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setSelected(null);
      timeoutRef.current = null;
      onSelect(vehicle);
    }, 200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>How was it delivered?</Text>
          <Text style={styles.subtitle}>
            {platformName}{orderId ? ` (${orderId})` : ""} — Select vehicle for accurate carbon calculation
          </Text>

          <View style={styles.grid}>
            {VEHICLE_OPTIONS.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.option,
                  selected === vehicle.id && styles.optionSelected,
                ]}
                onPress={() => handleSelect(vehicle)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionIcon}>{vehicle.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    selected === vehicle.id && styles.optionLabelSelected,
                  ]}
                >
                  {vehicle.label}
                </Text>
                <Text style={styles.carbonBadge}>
                  {vehicle.carbonFactor === 0
                    ? "Zero CO\u2082"
                    : `${vehicle.carbonFactor} kg/km`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 34,
    maxHeight: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#154212",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  option: {
    width: "48%",
    backgroundColor: "#f5f7f5",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionSelected: {
    borderColor: "#154212",
    backgroundColor: "#e8f5e1",
  },
  optionIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: "#154212",
  },
  carbonBadge: {
    fontSize: 10,
    color: "#888",
    backgroundColor: "#e8e8e8",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  skipBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
});
