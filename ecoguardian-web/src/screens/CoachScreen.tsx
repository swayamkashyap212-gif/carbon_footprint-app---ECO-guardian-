import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Leaf,
  Zap,
  Train,
  Trophy,
  Utensils,
  Star,
  Heart,
  Flame,
  Map,
  Bell,
  Footprints,
  Bike,
  Car,
  Plane,
  Bot,
  User,
  Sparkles,
  MessageCircle,
  CheckCircle,
  Clock,
  Award,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { askCarbonCoach, buildActionPlan, type CoachMessage } from '../services/ai';
import GlassCard from '../components/GlassCard';

const quickQuestions = [
  'How to reduce carbon?',
  'Metro vs Cab',
  'Electricity tips',
  'Food delivery alternatives',
];

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
  ribbon: <Star size={20} />,
  map: <Map size={20} />,
  scan: <Sparkles size={20} />,
  notifications: <Bell size={20} />,
  walk: <Footprints size={20} />,
  bicycle: <Bike size={20} />,
  car: <Car size={20} />,
  airplane: <Plane size={20} />,
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#154212]/40" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#154212]/40" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#154212]/40" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="ml-2 text-xs text-gray-400">EcoCoach is thinking...</span>
    </div>
  );
}

export default function CoachScreen() {
  const { entries, electricityLogs, foodDeliveries, streaks, score, recommendations } = useAppStore();
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI Carbon Coach. Ask me anything about reducing your carbon footprint — from transport choices to electricity savings!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content) return;
    setInput('');

    const userMsg: CoachMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await askCarbonCoach([...messages, userMsg], {
        entries,
        electricityLogs,
        foodDeliveries,
        streaks,
        dailyKg: score.dailyKg,
      });
      setTimeout(() => {
        setMessages(prev => [...prev, response]);
        setIsTyping(false);
      }, 800);
    } catch {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Something went wrong. Please try again.' },
        ]);
        setIsTyping(false);
      }, 800);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const actionPlan = buildActionPlan(recommendations.slice(0, 4));

  return (
    <div className="min-h-screen bg-[#f8faf8] pb-24">
      {/* Header */}
      <div className="bg-[#154212] px-5 pt-12 pb-8">
        <div className="flex items-center gap-2">
          <Bot size={22} className="text-[#bcf0ae]" />
          <div>
            <p className="text-sm font-medium text-[#bcf0ae]/80">AI Carbon Coach</p>
            <h1 className="font-serif text-2xl font-bold text-white">Coach</h1>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="mx-4 mt-4">
        <GlassCard className="flex flex-col" style={{ height: 'calc(100vh - 380px)', minHeight: 320 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-gray-200 text-gray-800 rounded-br-md'
                      : 'bg-[#bcf0ae] text-[#154212] rounded-bl-md'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {msg.role === 'assistant' && (
                      <Leaf size={14} className="mt-0.5 shrink-0 text-[#154212]" />
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    {msg.role === 'user' && (
                      <User size={14} className="mt-0.5 shrink-0 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="border-t border-gray-100 px-4 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Quick questions</p>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="rounded-full bg-[#bcf0ae]/40 px-3 py-1 text-[11px] font-medium text-[#154212] hover:bg-[#bcf0ae] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your carbon coach..."
                className="flex-1 rounded-xl border border-gray-200 bg-[#f8faf8] px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#154212] focus:ring-1 focus:ring-[#154212]/30 transition-colors"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#154212] text-white hover:bg-[#1a5416] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Weekly Action Plan */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Weekly Action Plan</h2>
          </div>
          <div className="space-y-3">
            {actionPlan.map((step) => (
              <div key={step.step} className="flex items-start gap-3 rounded-xl bg-[#bcf0ae]/20 px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#154212] text-xs font-bold text-white">
                  {step.step}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#154212]">{step.title}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{step.reason}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#154212]">Save {step.impactKg} kg CO₂</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Eco Badges Grid */}
      <div className="mt-4 px-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-[#154212]" />
            <h2 className="font-serif text-lg font-bold text-[#154212]">Eco Badges</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {useAppStore.getState().badges.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-xl p-3 transition-all ${
                  badge.earned
                    ? 'bg-[#bcf0ae]/40 ring-1 ring-[#154212]/20'
                    : 'bg-gray-100 opacity-70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      badge.earned ? 'bg-[#154212] text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {badgeIcons[badge.icon] || <Leaf size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${badge.earned ? 'text-[#154212]' : 'text-gray-500'}`}>
                      {badge.title}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{badge.description}</p>
                  </div>
                </div>
                {!badge.earned && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[9px] text-gray-400">
                      <span>{badge.progress}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#154212]/50"
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {badge.earned && (
                  <div className="mt-2 flex items-center gap-1">
                    <CheckCircle size={10} className="text-[#154212]" />
                    <span className="text-[9px] font-bold text-[#154212]">Earned</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="h-8" />
    </div>
  );
}
