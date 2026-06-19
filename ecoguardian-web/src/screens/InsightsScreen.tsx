import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Cloud,
  Droplets,
  Thermometer,
  Sun,
  Leaf,
  Trophy,
  Star,
  Flame,
  Target,
  Zap,
  Train,
  Utensils,
  Map,
  Heart,
  Bell,
  Footprints,
  Bike,
  Car,
  Plane,
  CheckCircle,
  Award,
  Clock,
  ChevronRight,
  Sparkles,
  Activity,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { calculateGreenScore, getSustainabilityLevel } from '../services/carbonEngine';
import GlassCard from '../components/GlassCard';
import { Prediction } from '../types/domain';

const riskConfig = {
  low: { label: 'Low Risk', color: 'text-[#154212]', bg: 'bg-[#bcf0ae]', icon: <TrendingDown size={16} /> },
  medium: { label: 'Medium Risk', color: 'text-amber-700', bg: 'bg-amber-100', icon: <AlertTriangle size={16} /> },
  high: { label: 'High Risk', color: 'text-red-700', bg: 'bg-red-100', icon: <TrendingUp size={16} /> },
};

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getWeatherSuggestion(temp: number, humidity: number): string {
  if (temp > 35) return 'Extreme heat! Use fans before AC and keep curtains closed during peak sun.';
  if (temp > 30) return 'Warm weather. Consider natural ventilation and light clothing to reduce AC usage.';
  if (humidity > 80) return 'High humidity. Dehumidifier can help AC work more efficiently.';
  if (temp < 18) return 'Cool weather. No AC needed — open windows for fresh air.';
  return 'Pleasant weather! Perfect for walking or cycling instead of driving.';
}

function getStreakLabel(type: string): string {
  const labels: Record<string, string> = {
    no_food_delivery: 'No Delivery',
    metro_commute: 'Metro Commute',
    low_electricity: 'Low Electricity',
    walk_or_cycle: 'Walk / Cycle',
    no_shopping: 'No Shopping',
  };
  return labels[type] || type;
}

const badgeIcons: Record<string, React.ReactNode> = {
  leaf: <Leaf size={20} />,
  flash: <Zap size={20} />,
  train: <Train size={20} />,
  trophy: <Trophy size={20} />,
  basket: <Utensils size={20} />,
  restaurant: <Utensils size={20} />,
  star: <Star size={20} />,
  heart: <Heart size={20} />,
  flame: <Flame size={20} />,
  ribbon: <Award size={20} />,
  map: <Map size={20} />,
  scan: <Activity size={20} />,
  notifications: <Bell size={20} />,
  walk: <Footprints size={20} />,
  bicycle: <Bike size={20} />,
  car: <Car size={20} />,
  airplane: <Plane size={20} />,
};

function generateLocalPrediction(entries: any[]): Prediction {
  if (entries.length === 0) {
    return { nextWeekKg: 0, nextMonthKg: 0, nextQuarterKg: 0, annualKg: 0, risk: "low", sustainabilityScore: 0, drivers: ["Log some activities to see predictions."] };
  }
  const dailyAvg = entries.reduce((s, e) => s + e.kgCo2e, 0) / Math.max(entries.length, 1);
  const transportKg = entries.filter(e => e.category === "transport").reduce((s, e) => s + e.kgCo2e, 0);
  const foodKg = entries.filter(e => e.category === "food" || e.category === "food_delivery").reduce((s, e) => s + e.kgCo2e, 0);
  const electricityKg = entries.filter(e => e.category === "electricity").reduce((s, e) => s + e.kgCo2e, 0);
  const drivers: string[] = [];
  if (transportKg > 5) drivers.push(`Transport contributed ${Math.round(transportKg)} kg CO₂`);
  if (foodKg > 3) drivers.push(`Food delivery contributed ${Math.round(foodKg)} kg CO₂`);
  if (electricityKg > 10) drivers.push(`Electricity contributed ${Math.round(electricityKg)} kg CO₂`);
  if (drivers.length === 0) drivers.push("Keep logging activities for detailed predictions.");
  const risk = dailyAvg > 15 ? "high" : dailyAvg > 8 ? "medium" : "low";
  const score = Math.max(0, Math.min(100, Math.round(100 - dailyAvg * 4)));
  return {
    nextWeekKg: Math.round(dailyAvg * 7 * 100) / 100,
    nextMonthKg: Math.round(dailyAvg * 30 * 100) / 100,
    nextQuarterKg: Math.round(dailyAvg * 90 * 100) / 100,
    annualKg: Math.round(dailyAvg * 365),
    risk,
    sustainabilityScore: score,
    drivers
  };
}

export default function InsightsScreen() {
  const { score, entries, electricityLogs, streaks, challenges, userPoints, completeChallenge } = useAppStore();

  const greenScore = useMemo(() => calculateGreenScore(entries, electricityLogs), [entries, electricityLogs]);
  const sustainabilityLevel = useMemo(() => getSustainabilityLevel(greenScore), [greenScore]);
  const prediction = useMemo(() => generateLocalPrediction(entries), [entries]);

  const risk = riskConfig[prediction.risk];

  const weatherTemp = 32;
  const weatherHumidity = 65;
  const weatherSuggestion = getWeatherSuggestion(weatherTemp, weatherHumidity);

  const recentPoints = useMemo(() => userPoints.history.slice(0, 10), [userPoints.history]);

  return (
    <div className="min-h-screen bg-[#f8faf8] pb-24">
      {/* Header */}
      <div className="bg-[#154212] px-5 pt-12 pb-8">
        <p className="text-sm font-medium text-[#bcf0ae]/80">Deep Dive Analytics</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-white">Insights</h1>
      </div>

      {/* Predictions Section */}
      <div className="relative -mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Carbon Predictions</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#bcf0ae]/30 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Next Week</p>
              <p className="mt-1 text-xl font-bold text-[#154212]">{prediction.nextWeekKg} <span className="text-xs font-normal text-gray-500">kg</span></p>
            </div>
            <div className="rounded-xl bg-[#bcf0ae]/30 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Next Month</p>
              <p className="mt-1 text-xl font-bold text-[#154212]">{prediction.nextMonthKg} <span className="text-xs font-normal text-gray-500">kg</span></p>
            </div>
            <div className="rounded-xl bg-[#bcf0ae]/30 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Next Quarter</p>
              <p className="mt-1 text-xl font-bold text-[#154212]">{prediction.nextQuarterKg} <span className="text-xs font-normal text-gray-500">kg</span></p>
            </div>
            <div className="rounded-xl bg-[#bcf0ae]/30 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Annual</p>
              <p className="mt-1 text-xl font-bold text-[#154212]">{prediction.annualKg.toLocaleString()} <span className="text-xs font-normal text-gray-500">kg</span></p>
            </div>
          </div>

          {/* Risk Level */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f8faf8] px-4 py-3">
            <div className="flex items-center gap-2">
              {risk.icon}
              <span className={`text-sm font-bold ${risk.color}`}>{risk.label}</span>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${risk.bg} ${risk.color}`}>
              Score: {prediction.sustainabilityScore}/100
            </span>
          </div>

          {/* Drivers */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Key Drivers</p>
            <div className="space-y-2">
              {prediction.drivers.map((driver, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-[#f8faf8] px-3 py-2">
                  <ChevronRight size={14} className="mt-0.5 shrink-0 text-[#154212]" />
                  <span className="text-xs leading-relaxed text-gray-600">{driver}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Weather & Climate Section */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cloud size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Weather &amp; Climate</h2>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-[#154212] to-[#2d5a27] p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sun size={28} className="text-amber-300" />
                  <span className="text-3xl font-bold">{weatherTemp}°C</span>
                </div>
                <p className="mt-1 text-sm text-[#bcf0ae]/80">Partly Cloudy</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Droplets size={14} className="text-blue-300" />
                  <span className="text-sm font-medium">{weatherHumidity}%</span>
                </div>
                <p className="mt-0.5 text-xs text-[#bcf0ae]/60">Humidity</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
              <Thermometer size={14} className="text-amber-300" />
              <p className="text-xs leading-relaxed text-[#bcf0ae]">{weatherSuggestion}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Sustainability Level */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Leaf size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Sustainability Level</h2>
          </div>

          <div className="flex items-center gap-4 rounded-xl bg-[#f8faf8] p-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${sustainabilityLevel.color}20`, border: `2px solid ${sustainabilityLevel.color}40` }}
            >
              {badgeIcons[sustainabilityLevel.icon] || <Leaf size={24} style={{ color: sustainabilityLevel.color }} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: sustainabilityLevel.color }}>
                  {sustainabilityLevel.level}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${greenScore}%`, backgroundColor: sustainabilityLevel.color }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{greenScore}/100 green score</p>
            </div>
          </div>

          {/* All levels */}
          <div className="mt-4 grid grid-cols-5 gap-1">
            {(['Eco Beginner', 'Eco Explorer', 'Eco Champion', 'Earth Guardian', 'Climate Hero'] as const).map((lvl) => {
              const isActive = sustainabilityLevel.level === lvl;
              const colors: Record<string, string> = {
                'Eco Beginner': '#666',
                'Eco Explorer': '#b86e00',
                'Eco Champion': '#4a9e3f',
                'Earth Guardian': '#2d5a27',
                'Climate Hero': '#154212',
              };
              return (
                <div key={lvl} className="text-center">
                  <div
                    className={`mx-auto h-3 rounded-full transition-all ${isActive ? 'ring-2 ring-offset-1' : ''}`}
                    style={{ backgroundColor: isActive ? colors[lvl] : '#e5e7eb', boxShadow: isActive ? `0 0 0 2px ${colors[lvl]}` : undefined }}
                  />
                  <p className={`mt-1 text-[9px] leading-tight ${isActive ? 'font-bold text-[#154212]' : 'text-gray-400'}`}>
                    {lvl.split(' ')[1]}
                  </p>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Gamification Section */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Gamification</h2>
          </div>

          {/* User Points Display */}
          <div className="rounded-xl bg-gradient-to-r from-[#154212] to-[#2d5a27] p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#bcf0ae]/70">Total Points</p>
                <p className="text-2xl font-bold">{userPoints.total.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#bcf0ae]/70">Level</p>
                <p className="text-2xl font-bold">{userPoints.level}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-[#bcf0ae]/70">
                <span>XP: {userPoints.xp}</span>
                <span>Next: {userPoints.xpToNextLevel}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${(userPoints.xp / userPoints.xpToNextLevel) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Active Streaks */}
          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Active Streaks</p>
            <div className="space-y-2">
              {streaks.filter(s => s.active).map((streak) => (
                <div key={streak.id} className="flex items-center justify-between rounded-xl bg-[#bcf0ae]/30 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Flame size={14} className="text-orange-500" />
                    <span className="text-sm font-medium text-[#154212]">{getStreakLabel(streak.type)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#154212]">{streak.count} days</span>
                    <span className="text-[10px] text-gray-400">best: {streak.bestCount}</span>
                  </div>
                </div>
              ))}
              {streaks.filter(s => s.active).length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">No active streaks. Start one today!</p>
              )}
            </div>
          </div>

          {/* Active Challenges */}
          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Active Challenges</p>
            <div className="space-y-3">
              {challenges.filter(c => !c.completed).slice(0, 4).map((challenge) => (
                <div key={challenge.id} className="rounded-xl bg-[#f8faf8] p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#154212]">{challenge.title}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">{challenge.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      +{challenge.reward} pts
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>{challenge.progress}/{challenge.target} {challenge.unit}</span>
                      <span>{Math.round((challenge.progress / challenge.target) * 100)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#154212] transition-all"
                        style={{ width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {challenge.progress >= challenge.target && (
                    <button
                      onClick={() => completeChallenge(challenge.id)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-[#154212] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1a5416] transition-colors"
                    >
                      <CheckCircle size={12} />
                      Complete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Points History Timeline */}
          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Points History</p>
            <div className="space-y-2">
              {recentPoints.map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded-lg bg-[#f8faf8] px-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#bcf0ae]/60">
                    <Star size={14} className="text-[#154212]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium text-gray-700">{event.description}</p>
                    <p className="text-[10px] text-gray-400">{getTimeAgo(event.timestamp)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-[#154212]">+{event.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="h-8" />
    </div>
  );
}
