import { useState, useMemo, useCallback } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Trash2,
  Eye,
  Filter,
  Leaf,
  Zap,
  Car,
  ShoppingBag,
  Plane,
  UtensilsCrossed,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { SmartAlert } from '../types/domain';
import GlassCard from '../components/GlassCard';

type FilterTab = 'all' | 'unread' | 'warnings' | 'critical';

const filterTabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Bell size={14} /> },
  { key: 'unread', label: 'Unread', icon: <Eye size={14} /> },
  { key: 'warnings', label: 'Warnings', icon: <AlertTriangle size={14} /> },
  { key: 'critical', label: 'Critical', icon: <Flame size={14} /> },
];

const severityConfig: Record<
  SmartAlert['severity'],
  { bg: string; border: string; badge: string; icon: React.ReactNode }
> = {
  info: {
    bg: 'bg-[#e0f2fe]',
    border: 'border-[#bae6fd]',
    badge: 'bg-blue-500 text-white',
    icon: <Info size={18} className="text-blue-600" />,
  },
  warning: {
    bg: 'bg-[#fef3c7]',
    border: 'border-[#fde68a]',
    badge: 'bg-amber-500 text-white',
    icon: <AlertTriangle size={18} className="text-amber-600" />,
  },
  critical: {
    bg: 'bg-[#fee2e2]',
    border: 'border-[#fecaca]',
    badge: 'bg-red-500 text-white',
    icon: <AlertCircle size={18} className="text-red-600" />,
  },
};

const typeIcons: Record<SmartAlert['type'], React.ReactNode> = {
  high_carbon: <TrendingUp size={16} />,
  travel: <Car size={16} />,
  shopping: <ShoppingBag size={16} />,
  electricity: <Zap size={16} />,
  food: <UtensilsCrossed size={16} />,
  ride_booking: <Car size={16} />,
  flight: <Plane size={16} />,
  weekly_summary: <Bell size={16} />,
  streak: <Flame size={16} />,
};

function generateSampleAlerts(): SmartAlert[] {
  const now = new Date().toISOString();
  return [
    {
      id: `alert-${Date.now()}-1`,
      type: 'high_carbon',
      title: 'High Carbon Day',
      body: "You've generated 4.2 kg more CO₂ today than your daily average. Consider switching to metro for your next trip.",
      severity: 'critical',
      impactKg: 4.2,
      actionLabel: 'View alternatives',
      actionRoute: 'Track',
      createdAt: now,
      read: false,
    },
    {
      id: `alert-${Date.now()}-2`,
      type: 'electricity',
      title: 'Electricity Spike Detected',
      body: 'Your evening electricity usage is 23% above baseline. Consider turning off standby devices.',
      severity: 'warning',
      impactKg: 3.8,
      createdAt: now,
      read: false,
    },
    {
      id: `alert-${Date.now()}-3`,
      type: 'food',
      title: 'Walking Distance',
      body: 'Restaurant is only 800 meters away. Walking would save 1.2 kg CO₂ delivery emissions.',
      severity: 'info',
      impactKg: 1.2,
      actionLabel: 'See route',
      createdAt: now,
      read: false,
    },
    {
      id: `alert-${Date.now()}-4`,
      type: 'shopping',
      title: 'Express Delivery Impact',
      body: 'Express delivery produces 2.5x more emissions than standard. Consider grouped delivery.',
      severity: 'info',
      impactKg: 1.5,
      createdAt: now,
      read: false,
    },
    {
      id: `alert-${Date.now()}-5`,
      type: 'ride_booking',
      title: 'Metro Alternative',
      body: 'Metro is available for your current route and would save 3.6 kg CO₂.',
      severity: 'warning',
      impactKg: 3.6,
      actionLabel: 'Compare routes',
      actionRoute: 'Track',
      createdAt: now,
      read: false,
    },
    {
      id: `alert-${Date.now()}-6`,
      type: 'flight',
      title: 'Flight Emissions Alert',
      body: 'Your upcoming flight DEL-BOM will produce 292 kg CO₂e. Consider offsetting through tree planting.',
      severity: 'critical',
      impactKg: 292,
      actionLabel: 'Offset now',
      createdAt: now,
      read: false,
    },
  ];
}

export default function AlertsScreen() {
  const { smartAlerts, markAlertRead, clearAlerts } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const alerts = useMemo(() => {
    if (smartAlerts.length === 0) {
      return generateSampleAlerts();
    }
    return smartAlerts;
  }, [smartAlerts]);

  const filteredAlerts = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return alerts.filter((a) => !a.read);
      case 'warnings':
        return alerts.filter((a) => a.severity === 'warning');
      case 'critical':
        return alerts.filter((a) => a.severity === 'critical');
      default:
        return alerts;
    }
  }, [alerts, activeFilter]);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  const handleMarkRead = useCallback(
    (id: string) => {
      markAlertRead(id);
    },
    [markAlertRead]
  );

  const handleClearAll = useCallback(() => {
    clearAlerts();
  }, [clearAlerts]);

  const handleAction = useCallback((alert: SmartAlert) => {
    console.log('Alert action:', alert.actionRoute);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8faf8] pb-24">
      {/* Header */}
      <div className="bg-[#154212] px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell size={20} className="text-[#bcf0ae]" />
              <h1 className="text-white text-lg font-semibold">Smart Alerts</h1>
            </div>
            <p className="text-[#bcf0ae]/70 text-xs">
              {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
            </p>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition-colors"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeFilter === tab.key
                  ? 'bg-[#154212] text-white shadow-md'
                  : 'bg-white border border-[#bcf0ae]/50 text-[#42493e] hover:bg-[#bcf0ae]/20'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'unread' && unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-[#bcf0ae]/30 flex items-center justify-center mb-4">
                <Leaf size={32} className="text-[#154212]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#154212]">No alerts!</h3>
              <p className="mt-1 text-sm text-gray-500">You're doing great! Keep up the eco-friendly habits.</p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              return (
                <GlassCard
                  key={alert.id}
                  className={`p-4 border-l-4 ${
                    alert.read ? 'opacity-70' : ''
                  }`}
                  style={{
                    borderLeftColor:
                      alert.severity === 'critical'
                        ? '#ef4444'
                        : alert.severity === 'warning'
                        ? '#f59e0b'
                        : '#3b82f6',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-gray-800">{alert.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config.badge}`}>
                            {alert.severity}
                          </span>
                          {alert.read && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">
                              Read
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {typeIcons[alert.type]}
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{alert.body}</p>
                      {alert.impactKg !== undefined && alert.impactKg > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-[#154212]">
                            Impact: {alert.impactKg} kg CO₂e
                          </span>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        {!alert.read && (
                          <button
                            onClick={() => handleMarkRead(alert.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <CheckCircle size={12} /> Mark as Read
                          </button>
                        )}
                        {alert.actionLabel && (
                          <button
                            onClick={() => handleAction(alert)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#154212] text-white text-[11px] font-semibold hover:bg-[#1a5a18] transition-colors"
                          >
                            {alert.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Stats Summary */}
        {alerts.length > 0 && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-[#154212]" />
              <h3 className="text-xs font-bold text-[#154212]">Alert Summary</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-xl bg-blue-50">
                <p className="text-lg font-bold text-blue-600">
                  {alerts.filter((a) => a.severity === 'info').length}
                </p>
                <p className="text-[10px] text-blue-500 font-medium">Info</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-amber-50">
                <p className="text-lg font-bold text-amber-600">
                  {alerts.filter((a) => a.severity === 'warning').length}
                </p>
                <p className="text-[10px] text-amber-500 font-medium">Warnings</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-red-50">
                <p className="text-lg font-bold text-red-600">
                  {alerts.filter((a) => a.severity === 'critical').length}
                </p>
                <p className="text-[10px] text-red-500 font-medium">Critical</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Total CO₂ impact from alerts</span>
                <span className="font-bold text-[#154212]">
                  {alerts.reduce((sum, a) => sum + (a.impactKg || 0), 0).toFixed(1)} kg
                </span>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}