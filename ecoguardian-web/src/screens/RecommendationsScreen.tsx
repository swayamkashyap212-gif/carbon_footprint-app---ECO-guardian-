import { useState, useMemo } from 'react';
import {
  Lightbulb,
  TrendingDown,
  CheckCircle,
  Target,
  Leaf,
  Zap,
  Train,
  Utensils,
  ShoppingBag,
  BarChart3,
  MessageCircle,
  Send,
  Bot,
  User,
  Sparkles,
  Flame,
  Award,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { askCarbonCoach, type CoachMessage } from '../services/ai';
import GlassCard from '../components/GlassCard';

const difficultyConfig = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  hard: { label: 'Hard', color: 'bg-red-100 text-red-700' },
};

const categoryIcons: Record<string, React.ReactNode> = {
  transport: <Train size={16} />,
  electricity: <Zap size={16} />,
  food: <Utensils size={16} />,
  shopping: <ShoppingBag size={16} />,
  food_delivery: <ShoppingBag size={16} />,
  grocery_delivery: <ShoppingBag size={16} />,
  flight: <Leaf size={16} />,
  food_waste: <Utensils size={16} />,
  ride_booking: <Leaf size={16} />,
  routine: <Leaf size={16} />,
};

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

export default function RecommendationsScreen() {
  const { entries, recommendations, addPoints } = useAppStore();
  const [adoptedIds, setAdoptedIds] = useState<Set<string>>(new Set());
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([
    { role: 'assistant', content: 'Need help with any recommendation? Ask me for tips on how to adopt it!' },
  ]);
  const [coachInput, setCoachInput] = useState('');
  const [coachTyping, setCoachTyping] = useState(false);

  const hotspots = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.kgCo2e;
    });
    return Object.entries(totals)
      .map(([cat, kg]) => ({ category: cat, kg }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 3);
  }, [entries]);

  const adoptedRecommendations = useMemo(
    () => recommendations.filter((r) => adoptedIds.has(r.id)),
    [recommendations, adoptedIds]
  );

  const totalImpact = useMemo(
    () => adoptedRecommendations.reduce((sum, r) => sum + r.impactKg, 0),
    [adoptedRecommendations]
  );

  const behavioralSummary = useMemo(() => {
    const transportCount = entries.filter((e) => e.category === 'transport').length;
    const foodDeliveryCount = entries.filter((e) => e.category === 'food_delivery').length;
    const shoppingCount = entries.filter((e) => e.category === 'shopping').length;
    const electricityCount = entries.filter((e) => e.category === 'electricity').length;

    const parts: string[] = [];
    if (transportCount > 3) parts.push(`You have ${transportCount} transport entries — consider switching to public transit more often.`);
    if (foodDeliveryCount > 2) parts.push(`Food delivery frequency is high with ${foodDeliveryCount} orders. Walking or cooking could significantly reduce emissions.`);
    if (shoppingCount > 2) parts.push(`${shoppingCount} shopping entries detected. Grouping deliveries and choosing standard shipping helps.`);
    if (electricityCount > 1) parts.push(`Electricity usage tracked across ${electricityCount} logs. LED and AC optimization are quick wins.`);
    if (parts.length === 0) parts.push('Keep logging your activities! More data helps generate better insights and personalized recommendations.');

    return parts;
  }, [entries]);

  const handleAdopt = (id: string) => {
    if (adoptedIds.has(id)) return;
    setAdoptedIds(prev => new Set([...prev, id]));
    const rec = recommendations.find(r => r.id === id);
    if (rec) {
      addPoints(50, 'recommendation_adopted', `Adopted: ${rec.title}`);
    }
  };

  const handleCoachSend = async (text?: string) => {
    const content = (text || coachInput).trim();
    if (!content) return;
    setCoachInput('');
    const userMsg: CoachMessage = { role: 'user', content };
    setCoachMessages(prev => [...prev, userMsg]);
    setCoachTyping(true);
    try {
      const response = await askCarbonCoach([...coachMessages, userMsg], { entries, dailyKg: 12.4 });
      setTimeout(() => {
        setCoachMessages(prev => [...prev, response]);
        setCoachTyping(false);
      }, 600);
    } catch {
      setTimeout(() => {
        setCoachMessages(prev => [...prev, { role: 'assistant', content: 'Try asking about specific recommendations!' }]);
        setCoachTyping(false);
      }, 600);
    }
  };

  const handleCoachKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCoachSend();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf8] pb-24">
      {/* Header */}
      <div className="bg-[#154212] px-5 pt-12 pb-8">
        <p className="text-sm font-medium text-[#bcf0ae]/80">Personalized for you</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-white">Recommendations</h1>
      </div>

      {/* Recommendation Cards */}
      <div className="relative -mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Your Recommendations</h2>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const adopted = adoptedIds.has(rec.id);
              const diff = difficultyConfig[rec.difficulty];
              return (
                <div
                  key={rec.id}
                  className={`rounded-xl border p-4 transition-all ${
                    adopted
                      ? 'border-[#154212]/30 bg-[#bcf0ae]/20'
                      : 'border-gray-100 bg-[#f8faf8]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${categoryColors[rec.category] || '#154212'}20` }}
                      >
                        <span style={{ color: categoryColors[rec.category] || '#154212' }}>
                          {categoryIcons[rec.category] || <Leaf size={16} />}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[#154212]">{rec.title}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${diff.color}`}>
                            {diff.label}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <TrendingDown size={12} className="text-[#154212]" />
                          <span className="text-xs font-semibold text-[#154212]">Save {rec.impactKg} kg CO₂</span>
                          <span className="text-[10px] text-gray-400">• {rec.category.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{rec.reason}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    {adopted ? (
                      <div className="flex items-center gap-1 text-xs font-bold text-[#154212]">
                        <CheckCircle size={14} />
                        Adopted (+50 pts)
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAdopt(rec.id)}
                        className="rounded-lg bg-[#154212] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1a5416] transition-colors"
                      >
                        Adopt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Behavioral Analysis */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Behavioral Analysis</h2>
          </div>
          <div className="space-y-2">
            {behavioralSummary.map((text, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-[#bcf0ae]/20 px-3 py-2.5">
                <Sparkles size={12} className="mt-0.5 shrink-0 text-[#154212]" />
                <p className="text-xs leading-relaxed text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Carbon Hotspots */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={18} className="text-orange-500" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Carbon Hotspots</h2>
          </div>
          <p className="mb-3 text-xs text-gray-500">Top 3 categories by emission</p>
          <div className="space-y-3">
            {hotspots.map((spot, i) => {
              const maxKg = hotspots[0]?.kg || 1;
              const percent = Math.round((spot.kg / maxKg) * 100);
              return (
                <div key={spot.category} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#bcf0ae]/50 text-[#154212]">
                    {categoryIcons[spot.category] || <Leaf size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">{spot.category.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold text-[#154212]">{spot.kg.toFixed(1)} kg</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percent}%`, backgroundColor: categoryColors[spot.category] || '#154212' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Learning Loop */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Learning Loop</h2>
          </div>
          {adoptedRecommendations.length > 0 ? (
            <>
              <p className="mb-3 text-xs text-gray-500">You've adopted {adoptedRecommendations.length} recommendation{adoptedRecommendations.length > 1 ? 's' : ''} — saving {totalImpact.toFixed(1)} kg CO₂</p>
              <div className="space-y-2">
                {adoptedRecommendations.map((rec) => (
                  <div key={rec.id} className="flex items-center gap-3 rounded-xl bg-[#bcf0ae]/30 px-4 py-2.5">
                    <CheckCircle size={14} className="shrink-0 text-[#154212]" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[#154212]">{rec.title}</p>
                      <p className="text-[10px] text-gray-500">-{rec.impactKg} kg CO₂</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-xs text-gray-400 py-4">No recommendations adopted yet. Tap "Adopt" to start saving!</p>
          )}
        </GlassCard>
      </div>

      {/* Coach Chat Mini */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Coach Chat</h2>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
            {coachMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-gray-200 text-gray-800 rounded-br-md'
                      : 'bg-[#bcf0ae] text-[#154212] rounded-bl-md'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    {msg.role === 'assistant' && <Bot size={12} className="mt-0.5 shrink-0" />}
                    <p className="text-xs leading-relaxed">{msg.content}</p>
                    {msg.role === 'user' && <User size={12} className="mt-0.5 shrink-0 text-gray-500" />}
                  </div>
                </div>
              </div>
            ))}
            {coachTyping && (
              <div className="flex justify-start">
                <div className="bg-[#bcf0ae] rounded-2xl rounded-bl-md px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#154212]/40" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#154212]/40" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#154212]/40" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={coachInput}
              onChange={(e) => setCoachInput(e.target.value)}
              onKeyDown={handleCoachKeyDown}
              placeholder="Ask about a recommendation..."
              className="flex-1 rounded-xl border border-gray-200 bg-[#f8faf8] px-3 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-[#154212] focus:ring-1 focus:ring-[#154212]/30 transition-colors"
            />
            <button
              onClick={() => handleCoachSend()}
              disabled={!coachInput.trim() || coachTyping}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#154212] text-white hover:bg-[#1a5416] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={12} />
            </button>
          </div>
        </GlassCard>
      </div>

      <div className="h-8" />
    </div>
  );
}
