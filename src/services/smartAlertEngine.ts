import { CarbonEntry, DeliveryOrder, ElectricityLog, FoodDeliveryLog, GroceryDeliveryLog, ShoppingLog, SmartAlert, Streak } from "../types/domain";

function alertId(type: string, key: string): string {
  return `alert-${type}-${key}`;
}

export function generateSmartAlerts(
  entries: CarbonEntry[],
  shoppingLogs: ShoppingLog[] = [],
  electricityLogs: ElectricityLog[] = [],
  deliveryOrders: DeliveryOrder[] = [],
  foodDeliveries: FoodDeliveryLog[] = [],
  groceryDeliveries: GroceryDeliveryLog[] = [],
  streaks: Streak[] = [],
  goalKg: number = 9
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  // Use local date instead of UTC
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayEntries = entries.filter(e => e.occurredAt.startsWith(today));
  const total = todayEntries.reduce((sum, entry) => sum + entry.kgCo2e, 0);
  const transportTotal = todayEntries.filter(e => e.category === "transport").reduce((s, e) => s + e.kgCo2e, 0);
  const flightTotal = todayEntries.filter(e => e.category === "flight").reduce((s, e) => s + e.kgCo2e, 0);

  // Personalized threshold based on user's goal
  const highThreshold = goalKg * 2;
  const criticalThreshold = goalKg * 3;

  if (total > criticalThreshold) {
    alerts.push({
      id: alertId("critical-carbon", today),
      type: "high_carbon",
      title: "Critical Carbon Alert",
      body: `You generated ${Math.round((total - goalKg) * 100) / 100} kg more emissions today than your goal of ${goalKg} kg. Immediate action needed: switch to public transport, cancel unnecessary deliveries.`,
      severity: "critical",
      impactKg: Math.round((total - goalKg) * 100) / 100,
      actionLabel: "View alternatives",
      actionRoute: "Track",
      createdAt: new Date().toISOString(),
      read: false,
    });
  } else if (total > highThreshold) {
    alerts.push({
      id: alertId("high-carbon", today),
      type: "high_carbon",
      title: "High Carbon Alert",
      body: `You generated ${Math.round((total - goalKg) * 100) / 100} kg more emissions today than your goal. Consider switching to metro or reducing deliveries.`,
      severity: "warning",
      impactKg: Math.round((total - goalKg) * 100) / 100,
      actionLabel: "View alternatives",
      actionRoute: "Track",
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  if (transportTotal >= 5) {
    alerts.push({
      id: alertId("travel", today),
      type: "travel",
      title: "Metro Alternative Available",
      body: `Your vehicle trips produced ${Math.round(transportTotal * 100) / 100} kg CO₂. Metro or bus could save ${Math.round(transportTotal * 0.65 * 100) / 100} kg today.`,
      severity: "info",
      impactKg: Math.round(transportTotal * 0.65 * 100) / 100,
      actionLabel: "Compare routes",
      actionRoute: "Track",
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  if (shoppingLogs.some(log => log.deliveryType === "express")) {
    alerts.push({
      id: alertId("shopping-express", today),
      type: "shopping",
      title: "Express Delivery Impact",
      body: "Express delivery produces about 2x more emissions than grouped delivery. Combining orders can reduce delivery emissions by 40%.",
      severity: "info",
      impactKg: 1.05,
      actionLabel: "View shopping tips",
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  const latestElectricity = electricityLogs[0];
  if (latestElectricity && latestElectricity.unitsKwh >= 200) {
    alerts.push({
      id: alertId("electricity", latestElectricity.id),
      type: "electricity",
      title: "Electricity Usage Alert",
      body: `${latestElectricity.provider} usage is ${latestElectricity.unitsKwh} kWh for ${latestElectricity.billingPeriod}. LED lighting, AC temperature tuning, and standby cutoffs can reduce this month's impact.`,
      severity: latestElectricity.unitsKwh >= 300 ? "critical" : "warning",
      impactKg: latestElectricity.kgCo2e,
      createdAt: latestElectricity.createdAt,
      read: false
    });
  }

  if (electricityLogs.length >= 2) {
    const current = electricityLogs[0];
    const previous = electricityLogs[1];
    if (current && previous && current.unitsKwh > previous.unitsKwh * 1.15) {
      const increase = Math.round(((current.unitsKwh - previous.unitsKwh) / previous.unitsKwh) * 100);
      alerts.push({
        id: alertId("electricity-increase", `${previous.id}-${current.id}`),
        type: "electricity",
        title: "Electricity Consumption Increased",
        body: `Your electricity consumption increased ${increase}% compared to last month (${previous.unitsKwh} → ${current.unitsKwh} kWh). Check for standby appliances.`,
        severity: "warning",
        impactKg: current.kgCo2e - previous.kgCo2e,
        createdAt: new Date().toISOString(),
        read: false
      });
    }
  }

  // Walking distance alerts for all delivery types
  for (const order of deliveryOrders) {
    if (order.distanceKm <= 0.7) {
      alerts.push({
        id: alertId("walk", order.id),
        type: "food",
        title: "Walking Distance Alert",
        body: `${order.merchantName} is only ${Math.round(order.distanceKm * 1000)} meters away. Walking would save 100% delivery emissions.`,
        severity: "info",
        impactKg: order.kgCo2e,
        actionLabel: "Dismiss",
        createdAt: order.detectedAt,
        read: false
      });
    }
  }

  for (const delivery of foodDeliveries) {
    // Walking distance alert for food delivery
    if (delivery.distanceKm <= 0.7) {
      alerts.push({
        id: alertId("walk-food", delivery.id),
        type: "food",
        title: "Walking Distance Alert",
        body: `${delivery.restaurantName} is only ${Math.round(delivery.distanceKm * 1000)} meters away. Walking would save 100% delivery emissions.`,
        severity: "info",
        impactKg: delivery.kgCo2e,
        createdAt: delivery.detectedAt,
        read: false
      });
    }

    if (delivery.platform === "swiggy" || delivery.platform === "zomato") {
      const hour = new Date(delivery.detectedAt).getHours();
      if (hour >= 23 || hour <= 5) {
        alerts.push({
          id: alertId("latenight", delivery.id),
          type: "food",
          title: "Late Night Food Delivery",
          body: `Late-night food delivery from ${delivery.restaurantName} has higher environmental impact due to express logistics. Consider cooking or planning meals ahead.`,
          severity: "info",
          impactKg: delivery.kgCo2e,
          createdAt: delivery.detectedAt,
          read: false
        });
      }
    }
  }

  // Walking distance alerts for grocery deliveries
  for (const delivery of groceryDeliveries) {
    if (delivery.distanceKm <= 0.7) {
      alerts.push({
        id: alertId("walk-grocery", delivery.id),
        type: "food",
        title: "Walking Distance Alert",
        body: `${delivery.storeName} is only ${Math.round(delivery.distanceKm * 1000)} meters away. Walking would save 100% delivery emissions.`,
        severity: "info",
        impactKg: delivery.kgCo2e,
        createdAt: delivery.detectedAt,
        read: false
      });
    }
  }

  if (flightTotal > 10) {
    alerts.push({
      id: alertId("flight", today),
      type: "flight",
      title: "Flight Emissions Alert",
      body: `Your flights this month produced ${Math.round(flightTotal * 100) / 100} kg CO₂. For routes under 1000 km, trains can save up to 90% emissions.`,
      severity: "info",
      impactKg: flightTotal,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  const noDeliveryStreak = streaks.find(s => s.type === "no_food_delivery" && s.active);
  if (noDeliveryStreak && noDeliveryStreak.count >= 3) {
    alerts.push({
      id: alertId("streak", noDeliveryStreak.id),
      type: "streak",
      title: "Great Streak!",
      body: `You've gone ${noDeliveryStreak.count} days without food delivery! Keep it up to earn bonus green points.`,
      severity: "info",
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  const weekAgoTime = Date.now() - 7 * 86400000;
  const weeklyTransport = entries
    .filter(e => e.category === "transport" && new Date(e.occurredAt).getTime() > weekAgoTime)
    .reduce((s, e) => s + e.kgCo2e, 0);
  if (weeklyTransport > 30) {
    alerts.push({
      id: alertId("weekly-summary", new Date().toISOString().slice(0, 10)),
      type: "weekly_summary",
      title: "Weekly Carbon Summary",
      body: `This week's transport emissions: ${Math.round(weeklyTransport * 100) / 100} kg CO₂. Metro commuting twice this week could save ${Math.round(weeklyTransport * 0.4 * 100) / 100} kg.`,
      severity: "info",
      impactKg: Math.round(weeklyTransport * 0.4 * 100) / 100,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  const recentDeliveries = [...foodDeliveries, ...groceryDeliveries].filter(d => new Date(d.detectedAt).getTime() > weekAgoTime);
  if (recentDeliveries.length >= 5) {
    alerts.push({
      id: alertId("delivery-freq", new Date().toISOString().slice(0, 10)),
      type: "food",
      title: "High Delivery Frequency",
      body: `You've placed ${recentDeliveries.length} delivery orders this week. Grouping orders or cooking at home 2 days could save ${Math.round(recentDeliveries.length * 0.5 * 100) / 100} kg CO₂.`,
      severity: "warning",
      impactKg: Math.round(recentDeliveries.length * 0.5 * 100) / 100,
      actionLabel: "View alternatives",
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
  });
}

export function generateAlertFromNotification(platform: string, status: string, merchantName: string, distanceKm?: number): SmartAlert | null {
  if (status === "delivered" && distanceKm && distanceKm <= 0.7) {
    return {
      id: alertId("walk-notification", `${platform}-${merchantName}`),
      type: "food",
      title: "Walking Distance Alert",
      body: `${merchantName} is only ${Math.round(distanceKm * 1000)}m away. Walking would save 100% delivery emissions next time.`,
      severity: "info",
      impactKg: 0.3,
      createdAt: new Date().toISOString(),
      read: false
    };
  }

  if (status === "confirmed" && (platform === "uber" || platform === "ola")) {
    return {
      id: alertId("ride", `${platform}-${Date.now()}`),
      type: "ride_booking",
      title: "Ride Sharing Suggestion",
      body: `Shared rides on ${platform} can save up to 50% emissions compared to solo rides.`,
      severity: "info",
      createdAt: new Date().toISOString(),
      read: false
    };
  }

  return null;
}
