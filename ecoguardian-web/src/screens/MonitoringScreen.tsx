import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Bell,
  MapPin,
  Truck,
  CheckCircle,
  Package,
  Zap,
  ShoppingBag,
  Car,
  Navigation,
  Activity,
  Play,
  Pause,
  UtensilsCrossed,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type {
  DeliveryPlatform,
  MonitoringEvent,
  TransportMode,
} from '../types/domain';
import GlassCard from '../components/GlassCard';

const platforms: {
  id: DeliveryPlatform;
  name: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  type: 'food' | 'grocery' | 'shopping' | 'ride' | 'delivery';
}[] = [
  { id: 'swiggy', name: 'Swiggy', color: '#fc8019', bgColor: '#fff3e6', icon: <UtensilsCrossed size={24} />, type: 'food' },
  { id: 'zomato', name: 'Zomato', color: '#e23744', bgColor: '#fee2e2', icon: <UtensilsCrossed size={24} />, type: 'food' },
  { id: 'zepto', name: 'Zepto', color: '#6c5ce7', bgColor: '#f3f0ff', icon: <Zap size={24} />, type: 'grocery' },
  { id: 'blinkit', name: 'Blinkit', color: '#f5a623', bgColor: '#fff8e6', icon: <Zap size={24} />, type: 'grocery' },
  { id: 'bigbasket', name: 'BigBasket', color: '#8bc34a', bgColor: '#f1f8e9', icon: <ShoppingBag size={24} />, type: 'grocery' },
  { id: 'amazon', name: 'Amazon', color: '#ff9900', bgColor: '#fff3e0', icon: <Package size={24} />, type: 'shopping' },
  { id: 'flipkart', name: 'Flipkart', color: '#2874f0', bgColor: '#e3f2fd', icon: <ShoppingBag size={24} />, type: 'shopping' },
  { id: 'uber', name: 'Uber', color: '#000000', bgColor: '#f5f5f5', icon: <Car size={24} />, type: 'ride' },
  { id: 'ola', name: 'Ola', color: '#00b140', bgColor: '#e8f5e9', icon: <Car size={24} />, type: 'ride' },
  { id: 'rapido', name: 'Rapido', color: '#ffcc02', bgColor: '#fffde7', icon: <Navigation size={24} />, type: 'ride' },
  { id: 'porter', name: 'Porter', color: '#333333', bgColor: '#f5f5f5', icon: <Truck size={24} />, type: 'delivery' },
];

const merchants = ['KFC', "McDonald's", 'Starbucks', "Domino's", 'Pizza Hut', 'Subway', 'Burger King'];
const orderValues = [250, 350, 420, 580, 690];
const activities: TransportMode[] = ['walking', 'cycling', 'car', 'metro', 'bus', 'bike'];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getNotificationText(
  platform: (typeof platforms)[0],
  merchant: string,
  step: 1 | 2 | 3
): { title: string; body: string; icon: React.ReactNode } {
  const orderId = Math.floor(1000 + Math.random() * 9000);
  const distance = (Math.random() * 5 + 1).toFixed(1);

  switch (step) {
    case 1:
      return {
        title: 'Order Confirmed',
        body: `Your ${platform.name} order #${orderId} from ${merchant} has been confirmed. Estimated delivery in 25-30 mins.`,
        icon: <CheckCircle size={20} className="text-[#154212]" />,
      };
    case 2:
      if (platform.type === 'food' || platform.type === 'grocery') {
        return {
          title: 'Order Picked Up',
          body: `Your order from ${merchant} is on the way! Rider is ${distance} km away. ETA: 12 mins.`,
          icon: <Truck size={20} className="text-[#154212]" />,
        };
      }
      return {
        title: 'Arriving Soon',
        body: `Your ${platform.name} ride is arriving in 2 minutes. Vehicle: White Maruti Swift.`,
        icon: <Navigation size={20} className="text-[#154212]" />,
      };
    case 3:
      if (platform.type === 'food' || platform.type === 'grocery') {
        return {
          title: 'Delivered',
          body: `Your ${merchant} order has been delivered. Thank you for choosing ${platform.name}!`,
          icon: <Package size={20} className="text-[#154212]" />,
        };
      }
      return {
        title: 'Ride Completed',
        body: `Your ${platform.name} ride has been completed. Hope you had a safe journey!`,
        icon: <CheckCircle size={20} className="text-[#154212]" />,
      };
  }
}

function getCarbonEstimate(platform: (typeof platforms)[0], orderValue: number): number {
  const valueFactor = orderValue / 500;
  switch (platform.type) {
    case 'food':
      return (1.5 + Math.random() * 1.5) * (0.8 + valueFactor * 0.4);
    case 'grocery':
      return (0.8 + Math.random() * 1.2) * (0.8 + valueFactor * 0.4);
    case 'shopping':
      return (2 + Math.random() * 3) * (0.8 + valueFactor * 0.4);
    case 'ride':
      return 1 + Math.random() * 2;
    case 'delivery':
      return 0.5 + Math.random() * 1;
    default:
      return 1;
  }
}

function getActivityLabel(mode: TransportMode): string {
  switch (mode) {
    case 'walking': return 'Walking';
    case 'cycling': return 'Cycling';
    case 'car': return 'Driving';
    case 'metro': return 'Metro Ride';
    case 'bus': return 'Bus Ride';
    case 'bike': return 'Motorcycle';
    default: return mode;
  }
}

function getActivityIcon(mode: TransportMode) {
  switch (mode) {
    case 'walking': return <Activity size={16} />;
    case 'cycling': return <Activity size={16} />;
    case 'car': return <Car size={16} />;
    case 'metro': return <Zap size={16} />;
    case 'bus': return <Zap size={16} />;
    case 'bike': return <Navigation size={16} />;
    default: return <Activity size={16} />;
  }
}

interface SimulationStep {
  platform: DeliveryPlatform;
  merchant: string;
  step: 1 | 2 | 3;
  timestamp: string;
  kgCo2e: number;
}

export default function MonitoringScreen() {
  const { monitoringEvents, addMonitoringEvent, addFoodDelivery, addGroceryDelivery, addRideBooking } = useAppStore();
  const [simulatingPlatform, setSimulatingPlatform] = useState<string | null>(null);
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [monitoring, setMonitoring] = useState(false);
  const [detectedActivities, setDetectedActivities] = useState<MonitoringEvent[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSimulation = useCallback(
    (platform: (typeof platforms)[0]) => {
      if (simulatingPlatform) return;
      setSimulatingPlatform(platform.id);
      setSimulationSteps([]);

      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      const orderValue = orderValues[Math.floor(Math.random() * orderValues.length)];
      const kgCo2e = getCarbonEstimate(platform, orderValue);

      const steps: SimulationStep[] = [
        { platform: platform.id, merchant, step: 1, timestamp: new Date().toISOString(), kgCo2e },
        { platform: platform.id, merchant, step: 2, timestamp: new Date(Date.now() + 2000).toISOString(), kgCo2e: kgCo2e * 0.8 },
        { platform: platform.id, merchant, step: 3, timestamp: new Date(Date.now() + 4000).toISOString(), kgCo2e },
      ];

      steps.forEach((s, i) => {
        setTimeout(() => {
          setSimulationSteps((prev) => [...prev, s]);
        }, i * 2000);
      });

      setTimeout(() => {
        const totalKg = kgCo2e;
        if (platform.type === 'food') {
          addFoodDelivery({
            id: uid(),
            platform: platform.id as 'swiggy' | 'zomato' | 'other',
            restaurantName: merchant,
            distanceKm: parseFloat((Math.random() * 5 + 1).toFixed(1)),
            vehicleType: 'bike',
            orderValue,
            items: ['Simulated order'],
            kgCo2e: totalKg,
            isVegetarian: Math.random() > 0.5,
            source: 'notification',
            detectedAt: new Date().toISOString(),
          });
        } else if (platform.type === 'grocery') {
          addGroceryDelivery({
            id: uid(),
            platform: platform.id as 'blinkit' | 'zepto' | 'instamart' | 'bigbasket' | 'other',
            storeName: `${platform.name} Warehouse`,
            distanceKm: parseFloat((Math.random() * 5 + 1).toFixed(1)),
            vehicleType: 'PETROL_BIKE',
            orderValue,
            items: ['Simulated groceries'],
            kgCo2e: totalKg,
            isQuickCommerce: true,
            source: 'notification',
            detectedAt: new Date().toISOString(),
          });
        } else if (platform.type === 'ride') {
          addRideBooking({
            id: uid(),
            platform: platform.id as 'uber' | 'ola' | 'rapido',
            rideType: 'economy',
            pickupLocation: 'Home',
            dropLocation: 'Office',
            distanceKm: parseFloat((Math.random() * 15 + 3).toFixed(1)),
            durationMinutes: Math.floor(Math.random() * 30 + 10),
            fare: Math.floor(Math.random() * 500 + 150),
            kgCo2e: totalKg,
            vehicleType: 'sedan',
            source: 'notification',
            detectedAt: new Date().toISOString(),
          });
        }

        setTimeout(() => {
          setSimulatingPlatform(null);
          setSimulationSteps([]);
        }, 3000);
      }, 6500);
    },
    [simulatingPlatform, addFoodDelivery, addGroceryDelivery, addRideBooking]
  );

  const toggleMonitoring = useCallback(() => {
    if (monitoring) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setMonitoring(false);
    } else {
      setMonitoring(true);
      intervalRef.current = setInterval(() => {
        const mode = activities[Math.floor(Math.random() * activities.length)];
        const distance = parseFloat((Math.random() * 15 + 0.5).toFixed(1));
        const duration = Math.floor(Math.random() * 45 + 5);
        const confidence = parseFloat((Math.random() * 0.3 + 0.7).toFixed(2));
        const kgPerKm = mode === 'metro' || mode === 'bus' ? 0.05 : mode === 'car' ? 0.18 : mode === 'bike' ? 0.12 : 0.02;
        const kgCo2e = parseFloat((distance * kgPerKm).toFixed(2));

        const event: MonitoringEvent = {
          id: uid(),
          detectedMode: mode,
          distanceKm: distance,
          durationMinutes: duration,
          confidence,
          source: Math.random() > 0.5 ? 'gps' : 'activity',
          kgCo2e,
          occurredAt: new Date().toISOString(),
        };
        addMonitoringEvent(event);
        setDetectedActivities((prev) => [event, ...prev].slice(0, 10));
      }, 5000);
    }
  }, [monitoring, addMonitoringEvent]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8faf8] pb-24">
      {/* Header */}
      <div className="bg-[#154212] px-4 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={20} className="text-[#bcf0ae]" />
          <h1 className="text-white text-lg font-semibold">Monitoring Simulator</h1>
        </div>
        <p className="text-[#bcf0ae]/70 text-xs">Simulate notifications and activity detection</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Platform Grid */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-[#154212]" />
            <h2 className="font-serif text-base font-bold text-[#154212]">Platform Notifications</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => startSimulation(p)}
                disabled={!!simulatingPlatform}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-300 ${
                  simulatingPlatform === p.id
                    ? 'border-[#154212] bg-[#154212]/10 shadow-lg scale-105'
                    : simulatingPlatform
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-[#bcf0ae] hover:shadow-md active:scale-95'
                }`}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: p.bgColor, color: p.color }}
                >
                  {p.icon}
                </div>
                <span className="text-xs font-semibold text-gray-700">{p.name}</span>
                {simulatingPlatform === p.id && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#154212] animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Active Simulation */}
        {simulationSteps.length > 0 && (
          <GlassCard className="p-4" tone="green">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-3 rounded-full bg-[#154212] animate-pulse" />
              <h3 className="font-serif text-sm font-bold text-[#154212]">
                Simulation in Progress
              </h3>
            </div>
            <div className="space-y-2">
              {simulationSteps.map((s, i) => {
                const notif = getNotificationText(
                  platforms.find((p) => p.id === s.platform)!,
                  s.merchant,
                  s.step
                );
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl bg-white/80 p-3 border border-[#bcf0ae]/50 animate-in slide-in-from-right-4 duration-300"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#bcf0ae]/50">
                      {notif.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#154212]">{notif.title}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(s.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5">{notif.body}</p>
                      <span className="text-[10px] text-[#154212]/70 mt-1 inline-block">
                        ~{s.kgCo2e.toFixed(2)} kg CO₂e
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Activity Detection */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[#154212]" />
              <h2 className="font-serif text-base font-bold text-[#154212]">Activity Detection</h2>
            </div>
            <button
              onClick={toggleMonitoring}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                monitoring
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-[#154212] text-white hover:bg-[#1a5a18]'
              }`}
            >
              {monitoring ? (
                <>
                  <Pause size={16} /> Stop
                </>
              ) : (
                <>
                  <Play size={16} /> Start Monitoring
                </>
              )}
            </button>
          </div>

          {monitoring && (
            <div className="mb-4 p-3 rounded-xl bg-[#154212]/10 border border-[#154212]/20">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#154212] animate-pulse" />
                <span className="text-xs font-semibold text-[#154212]">
                  GPS tracking active - Simulating movement patterns
                </span>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="space-y-2">
            {detectedActivities.length === 0 ? (
              <div className="text-center py-8">
                <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  {monitoring ? 'Detecting activities...' : 'Start monitoring to detect activities'}
                </p>
              </div>
            ) : (
              detectedActivities.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-gray-100"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#bcf0ae]/50 text-[#154212]">
                    {getActivityIcon(event.detectedMode)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#154212]">
                        {getActivityLabel(event.detectedMode)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(event.occurredAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-500">
                        {event.distanceKm} km · {event.durationMinutes} min
                      </span>
                      <span className="text-[10px] text-[#154212]/70">
                        {event.kgCo2e} kg CO₂e
                      </span>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    event.confidence > 0.85 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {Math.round(event.confidence * 100)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Recent Monitoring Events */}
        {monitoringEvents.length > 0 && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={18} className="text-[#154212]" />
              <h3 className="font-serif text-sm font-bold text-[#154212]">Recent Events</h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {monitoringEvents.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 text-xs text-gray-600 py-1.5 border-b border-gray-100 last:border-0"
                >
                  <div className="h-6 w-6 rounded-full bg-[#bcf0ae]/30 flex items-center justify-center text-[#154212]">
                    {getActivityIcon(event.detectedMode)}
                  </div>
                  <span className="flex-1 font-medium">{getActivityLabel(event.detectedMode)}</span>
                  <span className="text-gray-400">{event.distanceKm} km</span>
                  <span className="text-[#154212] font-semibold">{event.kgCo2e} kg</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}