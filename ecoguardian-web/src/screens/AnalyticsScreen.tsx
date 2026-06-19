import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Sparkles,
  Leaf,
  Zap,
  Car,
  ShoppingBag,
  Activity,
  Target,
  Shield,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import type { CarbonEntry } from '../types/domain';
import GlassCard from '../components/GlassCard';
import EcoGauge from '../components/EcoGauge';

type Period = '7D' | '30D' | '3M' | '1Y';

const periods: { key: Period; label: string }[] = [
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
];

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

const categoryLabels: Record<string, string> = {
  transport: 'Transport',
  electricity: 'Electricity',
  food: 'Food',
  shopping: 'Shopping',
  food_delivery: 'Food Delivery',
  grocery_delivery: 'Grocery',
  flight: 'Flight',
  food_waste: 'Food Waste',
  ride_booking: 'Ride Booking',
  routine: 'Routine',
};

function filterEntriesByPeriod(entries: CarbonEntry[], period: Period): CarbonEntry[] {
  const now = Date.now();
  let cutoff: number;
  switch (period) {
    case '7D':
      cutoff = now - 7 * 86400000;
      break;
    case '30D':
      cutoff = now - 30 * 86400000;
      break;
    case '3M':
      cutoff = now - 90 * 86400000;
      break;
    case '1Y':
      cutoff = now - 365 * 86400000;
      break;
  }
  return entries.filter((e) => new Date(e.occurredAt).getTime() >= cutoff);
}

function generateForecast(entries: CarbonEntry[], period: Period) {
  const recentEntries = filterEntriesByPeriod(entries, '7D');
  const avgDaily =
    recentEntries.reduce((s, e) => s + e.kgCo2e, 0) / (recentEntries.length || 1) / 7 || 5;

  const data: { label: string; projected: number; optimal: number; current: number }[] = [];
  const days = period === '7D' ? 7 : period === '30D' ? 30 : period === '3M' ? 12 : 12;
  const unit = period === '3M' || period === '1Y' ? 'month' : 'day';

  for (let i = 0; i < days; i++) {
    const date = new Date();
    if (unit === 'month') {
      date.setMonth(date.getMonth() + i);
      data.push({
        label: date.toLocaleString('en', { month: 'short' }),
        projected: Math.round(avgDaily * 30 * (1 - i * 0.02) * 10) / 10,
        optimal: Math.round(avgDaily * 30 * 0.7 * 10) / 10,
        current: i < 2 ? Math.round(avgDaily * 30 * 10) / 10 : 0,
      });
    } else {
      date.setDate(date.getDate() + i);
      data.push({
        label: `D${i + 1}`,
        projected: Math.round(avgDaily * (1 - i * 0.01) * 10) / 10,
        optimal: Math.round(avgDaily * 0.7 * 10) / 10,
        current: i < 3 ? Math.round(avgDaily * 10) / 10 : 0,
      });
    }
  }
  return data;
}

function generateMonthlyComparison(entries: CarbonEntry[]) {
  const months: Record<string, number> = {};
  entries.forEach((e) => {
    const d = new Date(e.occurredAt);
    const key = d.toLocaleString('en', { month: 'short', year: '2-digit' });
    months[key] = (months[key] || 0) + e.kgCo2e;
  });
  return Object.entries(months)
    .map(([month, kg]) => ({ month, kg: Math.round(kg * 10) / 10 }))
    .slice(-6);
}

function getCategoryBreakdown(entries: CarbonEntry[]) {
  const totals: Record<string, number> = {};
  entries.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + e.kgCo2e;
  });
  return Object.entries(totals)
    .map(([category, value]) => ({
      category,
      label: categoryLabels[category] || category,
      value: Math.round(value * 10) / 10,
      color: categoryColors[category] || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);
}

function getRiskLevel(entries: CarbonEntry[]): { level: string; color: string; bg: string; description: string } {
  const weeklyEntries = filterEntriesByPeriod(entries, '7D');
  const weeklyKg = weeklyEntries.reduce((s, e) => s + e.kgCo2e, 0);
  const avgDaily = weeklyKg / 7 || 5;

  if (avgDaily <= 5) {
    return { level: 'Low', color: 'text-[#154212]', bg: 'bg-[#bcf0ae]', description: 'Your emissions are below the sustainable target.' };
  }
  if (avgDaily <= 10) {
    return { level: 'Medium', color: 'text-amber-700', bg: 'bg-amber-100', description: 'You are near the target. Small changes can help.' };
  }
  return { level: 'High', color: 'text-red-700', bg: 'bg-red-100', description: 'Consider switching to lower-carbon alternatives.' };
}

function getAIInsights(entries: CarbonEntry[]) {
  const weeklyEntries = filterEntriesByPeriod(entries, '7D');
  const transportKg = weeklyEntries.filter((e) => e.category === 'transport').reduce((s, e) => s + e.kgCo2e, 0);
  const foodDeliveryKg = weeklyEntries.filter((e) => e.category === 'food_delivery').reduce((s, e) => s + e.kgCo2e, 0);
  const electricityKg = weeklyEntries.filter((e) => e.category === 'electricity').reduce((s, e) => s + e.kgCo2e, 0);

  return [
    {
      title: 'Transport Forecast',
      body: `Based on current patterns, your transport emissions may ${transportKg > 15 ? 'increase' : 'decrease'} by 12% next month. ${transportKg > 15 ? 'Consider metro for daily commute.' : 'Great job keeping transport low!'}`,
      icon: <Car size={18} className="text-[#154212]" />,
      trend: transportKg > 15 ? 'up' : 'down',
    },
    {
      title: 'Delivery Impact',
      body: `Food delivery accounts for ${foodDeliveryKg.toFixed(1)} kg this week. Grouping orders could save ${(foodDeliveryKg * 0.3).toFixed(1)} kg CO₂e.`,
      icon: <ShoppingBag size={18} className="text-amber-600" />,
      trend: 'neutral',
    },
    {
      title: 'Electricity Insight',
      body: `Your electricity usage is ${electricityKg > 20 ? 'above' : 'within'} the recommended range. ${electricityKg > 20 ? 'Shifting heavy loads to off-peak hours can help.' : 'Keep maintaining good habits!'}`,
      icon: <Zap size={18} className="text-blue-600" />,
      trend: electricityKg > 20 ? 'up' : 'down',
    },
  ];
}

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-[#bcf0ae]/50">
        <p className="text-xs font-bold text-[#154212] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-[11px]" style={{ color: entry.color }}>
            {entry.name}: {entry.value} kg CO₂e
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsScreen() {
  const { entries, score } = useAppStore();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('7D');

  const filteredEntries = useMemo(() => filterEntriesByPeriod(entries, selectedPeriod), [entries, selectedPeriod]);
  const forecast = useMemo(() => generateForecast(entries, selectedPeriod), [entries, selectedPeriod]);
  const monthlyComparison = useMemo(() => generateMonthlyComparison(entries), [entries]);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(filteredEntries), [filteredEntries]);
  const risk = useMemo(() => getRiskLevel(entries), [entries]);
  const aiInsights = useMemo(() => getAIInsights(entries), [entries]);

  const totalKg = useMemo(() => filteredEntries.reduce((s, e) => s + e.kgCo2e, 0), [filteredEntries]);
  const avgDaily = useMemo(() => totalKg / (selectedPeriod === '7D' ? 7 : selectedPeriod === '30D' ? 30 : selectedPeriod === '3M' ? 90 : 365) || 0, [totalKg, selectedPeriod]);

  return (
    <div className="min-h-screen bg-[#f8faf8] pb-24">
      {/* Header */}
      <div className="bg-[#154212] px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={20} className="text-[#bcf0ae]" />
              <h1 className="text-white text-lg font-semibold">Analytics</h1>
            </div>
            <p className="text-[#bcf0ae]/70 text-xs">Your carbon footprint insights</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition-colors">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Period Selector */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPeriod(p.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                selectedPeriod === p.key
                  ? 'bg-[#154212] text-white shadow-md'
                  : 'bg-white border border-[#bcf0ae]/50 text-[#42493e] hover:bg-[#bcf0ae]/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-4" tone="green">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Total Emissions</p>
            <p className="mt-1 text-2xl font-bold text-[#154212]">{totalKg.toFixed(1)}</p>
            <p className="text-[10px] text-gray-400">kg CO₂e</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Daily Average</p>
            <p className="mt-1 text-2xl font-bold text-[#154212]">{avgDaily.toFixed(1)}</p>
            <p className="text-[10px] text-gray-400">kg CO₂e/day</p>
          </GlassCard>
        </div>

        {/* Carbon Forecast Chart */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#154212]" />
            <h2 className="font-serif text-base font-bold text-[#154212]">Carbon Forecast</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast}>
                <defs>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#154212" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#154212" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOptimal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e9e7" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#42493e' }} />
                <YAxis tick={{ fontSize: 10, fill: '#42493e' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="projected"
                  name="Projected"
                  stroke="#154212"
                  strokeWidth={2}
                  fill="url(#colorProjected)"
                />
                <Area
                  type="monotone"
                  dataKey="optimal"
                  name="Optimal Target"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#colorOptimal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Risk Score + Sustainability Score */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={18} className="text-[#154212]" />
              <h3 className="font-serif text-sm font-bold text-[#154212]">Risk Assessment</h3>
            </div>
            <div className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold uppercase ${risk.bg} ${risk.color}`}>
              {risk.level} Risk
            </div>
            <p className="mt-2 text-xs text-gray-600">{risk.description}</p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Sustainability Score</span>
                <span className="font-bold text-[#154212]">{score.sustainabilityScore}/100</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-[#154212]" />
              <h3 className="font-serif text-sm font-bold text-[#154212]">Sustainability Gauge</h3>
            </div>
            <div className="flex justify-center">
              <EcoGauge value={score.dailyKg} goal={score.goalKg} size={140} />
            </div>
          </GlassCard>
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-[#154212]" />
            <h2 className="font-serif text-base font-bold text-[#154212]">AI Insights</h2>
          </div>
          <div className="space-y-3">
            {aiInsights.map((insight, i) => (
              <GlassCard key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#bcf0ae]/60">
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#154212]">{insight.title}</h3>
                      {insight.trend === 'up' && <TrendingUp size={14} className="text-red-500" />}
                      {insight.trend === 'down' && <TrendingDown size={14} className="text-green-500" />}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">{insight.body}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-[#154212]" />
            <h2 className="font-serif text-base font-bold text-[#154212]">Category Breakdown</h2>
          </div>
          {categoryBreakdown.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={2}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-[#bcf0ae]/50">
                              <p className="text-xs font-bold text-[#154212]">{data.label}</p>
                              <p className="text-[11px] text-gray-600">{data.value} kg CO₂e</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full mt-3">
                {categoryBreakdown.map((item) => (
                  <div key={item.category} className="flex items-center gap-2 text-xs">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.label}</span>
                    <span className="ml-auto font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Leaf size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No data available for this period</p>
            </div>
          )}
        </GlassCard>

        {/* Monthly Comparison Bar Chart */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-[#154212]" />
            <h2 className="font-serif text-base font-bold text-[#154212]">Monthly Comparison</h2>
          </div>
          {monthlyComparison.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e9e7" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#42493e' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#42493e' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="kg" name="Total Emissions" fill="#154212" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Not enough data for comparison</p>
            </div>
          )}
        </GlassCard>

        {/* Emissions by Period */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Leaf size={18} className="text-[#154212]" />
            <h2 className="font-serif text-sm font-bold text-[#154212]">Emissions Summary</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Total entries this period</span>
              <span className="text-xs font-bold text-[#154212]">{filteredEntries.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Highest single emission</span>
              <span className="text-xs font-bold text-[#154212]">
                {filteredEntries.length > 0
                  ? Math.max(...filteredEntries.map((e) => e.kgCo2e)).toFixed(1)
                  : '0'} kg
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Most active category</span>
              <span className="text-xs font-bold text-[#154212]">
                {categoryBreakdown.length > 0 ? categoryBreakdown[0].label : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-500">Savings this week</span>
              <span className="text-xs font-bold text-green-600">{score.savingsKg} kg</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}