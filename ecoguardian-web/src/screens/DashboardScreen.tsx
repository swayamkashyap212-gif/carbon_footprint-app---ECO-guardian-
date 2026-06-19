import { useMemo } from 'react';
import {
  Leaf,
  TrendingDown,
  TrendingUp,
  MapPin,
  ShoppingBag,
  UtensilsCrossed,
  Zap,
  Car,
  Plane,
  Bike,
  Sparkles,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { CarbonEntry } from '../types/domain';
import GlassCard from '../components/GlassCard';
import EcoGauge from '../components/EcoGauge';

function getScoreClassification(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: 'Low', color: 'text-[#154212]', bg: 'bg-[#bcf0ae]' };
  if (score >= 50) return { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-100' };
  return { label: 'High', color: 'text-red-700', bg: 'bg-red-100' };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, Eco Warrior!';
  if (h < 17) return 'Good afternoon, Eco Warrior!';
  return 'Good evening, Eco Warrior!';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const categoryColors: Record<string, string> = {
  transport: '#154212',
  electricity: '#f59e0b',
  food: '#10b981',
  shopping: '#3b82f6',
  food_delivery: '#f97316',
  grocery_delivery: '#8b5cf6',
  flight: '#ef4444',
  food_waste: '#84cc16',
  ride_booking: '#06b6d4',
  routine: '#6b7280',
};

const categoryIcons: Record<string, React.ReactNode> = {
  transport: <Car size={16} />,
  electricity: <Zap size={16} />,
  food: <UtensilsCrossed size={16} />,
  shopping: <ShoppingBag size={16} />,
  food_delivery: <ShoppingBag size={16} />,
  grocery_delivery: <ShoppingBag size={16} />,
  flight: <Plane size={16} />,
  food_waste: <UtensilsCrossed size={16} />,
  ride_booking: <Car size={16} />,
  routine: <Bike size={16} />,
};

interface EarthPulseProps {
  dailyKg: number;
  goalKg: number;
}

function EarthPulse({ dailyKg, goalKg }: EarthPulseProps) {
  const ratio = dailyKg / goalKg;
  const pulseColor = ratio <= 0.6 ? '#154212' : ratio <= 1.0 ? '#f59e0b' : '#ef4444';
  const intensity = Math.min(ratio, 1.5);

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute rounded-full animate-ping opacity-20"
        style={{
          width: 120 + intensity * 40,
          height: 120 + intensity * 40,
          backgroundColor: pulseColor,
        }}
      />
      <div
        className="absolute rounded-full opacity-10"
        style={{
          width: 160 + intensity * 30,
          height: 160 + intensity * 30,
          backgroundColor: pulseColor,
        }}
      />
      <div
        className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full"
        style={{ backgroundColor: `${pulseColor}18`, border: `3px solid ${pulseColor}40` }}
      >
        <Leaf size={40} style={{ color: pulseColor }} className="drop-shadow-sm" />
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: { day: string; kg: number }[] }) {
  const max = Math.max(...data.map((d) => d.kg));
  const min = Math.min(...data.map((d) => d.kg));
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-2 h-32 px-2">
      {data.map((d) => {
        const height = ((d.kg - min) / range) * 100 + 10;
        const color = d.kg <= 9 ? '#154212' : d.kg <= 13 ? '#f59e0b' : '#ef4444';
        return (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-gray-500">{d.kg}</span>
            <div
              className="w-full rounded-t-lg transition-all duration-700 ease-out"
              style={{
                height: `${height}%`,
                backgroundColor: color,
                minHeight: 8,
              }}
            />
            <span className="text-[10px] font-semibold text-gray-600">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

const metricConfig = [
  { key: 'distance' as const, label: 'Distance', icon: <MapPin size={18} />, unit: 'km', get: (e: CarbonEntry[], _s: number) => e.filter((x) => x.category === 'transport').reduce((s, x) => s + (x.metadata?.distanceKm as number || 0), 0) },
  { key: 'eco' as const, label: 'Eco Score', icon: <Leaf size={18} />, unit: '/100', get: (_e: CarbonEntry[], s: number) => s },
  { key: 'food' as const, label: 'Food Delivery CO₂', icon: <ShoppingBag size={18} />, unit: 'kg', get: (e: CarbonEntry[], _s: number) => e.filter((x) => x.category === 'food_delivery').reduce((s, x) => s + x.kgCo2e, 0) },
  { key: 'grocery' as const, label: 'Grocery CO₂', icon: <ShoppingBag size={18} />, unit: 'kg', get: (e: CarbonEntry[], _s: number) => e.filter((x) => x.category === 'grocery_delivery').reduce((s, x) => s + x.kgCo2e, 0) },
];

export default function DashboardScreen() {
  const { score, entries, weeklyTrend, recommendations } = useAppStore();

  const classification = useMemo(() => getScoreClassification(score.sustainabilityScore), [score.sustainabilityScore]);

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.kgCo2e;
    });
    const totalKg = Object.values(totals).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(totals)
      .map(([cat, kg]) => ({ category: cat, kg, percent: Math.round((kg / totalKg) * 100) }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 6);
  }, [entries]);

  const recentActivity = useMemo(() => entries.slice(0, 5), [entries]);

  const insightCards = [
    {
      title: 'Transport Opportunity',
      body: `Metro commute saved ${(2.4).toFixed(1)} kg CO₂ vs cab today. Keep it up!`,
      icon: <TrendingDown size={18} className="text-[#154212]" />,
      tone: 'green' as const,
    },
    {
      title: 'Electricity Watch',
      body: 'Your evening usage spiked 18% over 3 days. Consider shifting heavy loads.',
      icon: <Zap size={18} className="text-amber-600" />,
      tone: 'default' as const,
    },
    {
      title: 'Delivery Impact',
      body: 'Food delivery produced 1.8 kg CO₂. Walking 700m would save 100% of that.',
      icon: <TrendingUp size={18} className="text-red-500" />,
      tone: 'default' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8faf8] pb-24">
      {/* Header */}
      <div className="bg-[#154212] px-5 pt-12 pb-8">
        <p className="text-sm font-medium text-[#bcf0ae]/80">{formatDate()}</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-white">{getGreeting()}</h1>
      </div>

      {/* Earth Pulse + Eco Gauge */}
      <div className="relative -mt-4 mx-4">
        <GlassCard className="p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-3">
              <EarthPulse dailyKg={score.dailyKg} goalKg={score.goalKg} />
              <span className="text-xs font-medium text-gray-500">Earth Pulse</span>
            </div>
            <div className="flex-1 flex justify-center">
              <EcoGauge value={score.dailyKg} goal={score.goalKg} size={180} />
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <span className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${classification.bg} ${classification.color}`}>
                {classification.label} Carbon
              </span>
              <p className="mt-1 text-center text-xs text-gray-500 sm:text-left">
                {(score.goalKg - score.dailyKg).toFixed(1)} kg remaining today
              </p>
              <p className="text-center text-xs text-gray-500 sm:text-left">
                {score.savingsKg} kg saved this week
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Metric Tiles Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        {metricConfig.map((m) => {
          const val = m.key === 'eco' ? score.sustainabilityScore : m.get(entries, score.sustainabilityScore);
          return (
            <GlassCard key={m.key} className="p-4" tone="green">
              <div className="flex items-center gap-2 text-[#154212]">{m.icon}</div>
              <p className="mt-2 text-2xl font-bold text-[#154212]">
                {typeof val === 'number' ? val.toFixed(m.key === 'eco' ? 0 : 1) : '0'}
                <span className="ml-1 text-xs font-normal text-gray-500">{m.unit}</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{m.label}</p>
            </GlassCard>
          );
        })}
      </div>

      {/* Category Breakdown */}
      <div className="mt-6 px-4">
        <GlassCard className="p-5">
          <h2 className="font-serif text-lg font-bold text-[#154212]">Category Breakdown</h2>
          <div className="mt-4 space-y-3">
            {categoryBreakdown.map((c) => (
              <div key={c.category} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#bcf0ae]/50 text-[#154212]">
                  {categoryIcons[c.category] || <Leaf size={16} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 capitalize">{c.category.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-semibold text-gray-500">{c.percent}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${c.percent}%`,
                        backgroundColor: categoryColors[c.category] || '#154212',
                      }}
                    />
                  </div>
                </div>
                <span className="min-w-[48px] text-right text-xs font-bold text-[#154212]">{c.kg.toFixed(1)} kg</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Weekly Trend */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <h2 className="font-serif text-lg font-bold text-[#154212]">Weekly Trend</h2>
          <p className="mt-1 text-xs text-gray-500">Daily CO₂ emissions over the past week</p>
          <div className="mt-4">
            <TrendChart data={weeklyTrend} />
          </div>
        </GlassCard>
      </div>

      {/* AI Insights */}
      <div className="mt-4 px-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-[#154212]" />
          <h2 className="font-serif text-lg font-bold text-[#154212]">AI Insights</h2>
        </div>
        <div className="space-y-3">
          {insightCards.map((card, i) => (
            <GlassCard key={i} className="p-4" tone={card.tone}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#bcf0ae]/60">
                  {card.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-[#154212]">{card.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">{card.body}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-4 px-4">
          <GlassCard className="p-5">
            <h2 className="font-serif text-lg font-bold text-[#154212]">Recommendations</h2>
            <div className="mt-3 space-y-2">
              {recommendations.slice(0, 3).map((rec) => (
                <div key={rec.id} className="flex items-center justify-between rounded-xl bg-[#bcf0ae]/30 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#154212]">{rec.title}</p>
                    <p className="text-xs text-gray-500">Save {rec.impactKg} kg CO₂</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    rec.difficulty === 'easy' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {rec.difficulty}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Recent Activity */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-[#154212]">Recent Activity</h2>
            <Activity size={16} className="text-[#154212]" />
          </div>
          <div className="mt-3 space-y-2">
            {recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-[#f8faf8] px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#bcf0ae]/60 text-[#154212]">
                  {categoryIcons[entry.category] || <Leaf size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{entry.label}</p>
                  <p className="text-[11px] text-gray-400">{getTimeAgo(entry.occurredAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-[#154212]">-{entry.kgCo2e.toFixed(1)}</span>
                  <span className="text-[10px] text-gray-400">kg</span>
                </div>
              </div>
            ))}
          </div>
          {entries.length > 5 && (
            <button className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#154212] hover:underline">
              View all <ChevronRight size={14} />
            </button>
          )}
        </GlassCard>
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
