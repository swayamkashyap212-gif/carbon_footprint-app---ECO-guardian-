import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Leaf,
  Plane,
  ShoppingBag,
  Activity,
  Bell,
  BarChart3,
  Footprints,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  route: string;
  getCount: (state: ReturnType<typeof useAppStore.getState>) => number;
}

const modules: ModuleCard[] = [
  {
    id: "flights",
    title: "Flight Tracking",
    description: "Track flights & find train alternatives",
    icon: <Plane size={24} />,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    route: "/flights",
    getCount: (s) => s.flightLogs.length,
  },
  {
    id: "shopping",
    title: "Shopping Tracker",
    description: "Log purchases & delivery carbon",
    icon: <ShoppingBag size={24} />,
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    route: "/shopping",
    getCount: (s) => s.shoppingLogs.length,
  },
  {
    id: "monitoring",
    title: "Activity Monitoring",
    description: "Auto-detect transport modes",
    icon: <Activity size={24} />,
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    route: "/monitoring",
    getCount: (s) => s.monitoringEvents.length,
  },
  {
    id: "alerts",
    title: "Smart Alerts",
    description: "Intelligent carbon warnings",
    icon: <Bell size={24} />,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    route: "/alerts",
    getCount: (s) => s.smartAlerts.filter((a) => !a.read).length,
  },
  {
    id: "analytics",
    title: "Carbon Analytics",
    description: "Deep insights & predictions",
    icon: <BarChart3 size={24} />,
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    route: "/analytics",
    getCount: (s) => s.weeklyTrend.length,
  },
  {
    id: "track",
    title: "Core Tracking",
    description: "Electricity, transport & more",
    icon: <Footprints size={24} />,
    color: "text-lime-700",
    bg: "bg-lime-50",
    border: "border-lime-200",
    route: "/track",
    getCount: (s) => s.entries.length,
  },
  {
    id: "recommendations",
    title: "Recommendations",
    description: "AI-powered eco suggestions",
    icon: <Sparkles size={24} />,
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    route: "/recommendations",
    getCount: (s) => s.recommendations.length,
  },
];

export default function AutomationHubScreen() {
  const navigate = useNavigate();
  const store = useAppStore();

  const moduleCounts = useMemo(() => {
    return modules.map((m) => ({
      ...m,
      count: m.getCount(store),
    }));
  }, [store]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0faf0] to-[#e8f5e8] pb-24">
      <div className="sticky top-0 z-20 bg-[#154212]/95 backdrop-blur-md px-4 pt-4 pb-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Leaf className="text-[#bcf0ae]" size={22} />
          <h1 className="text-white text-lg font-semibold tracking-tight">Automation Hub</h1>
        </div>
        <p className="mt-1 text-xs text-[#bcf0ae]/60">Connect all your carbon tracking modules</p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {moduleCounts.map((mod) => (
            <button
              key={mod.id}
              onClick={() => navigate(mod.route)}
              className={`group relative overflow-hidden rounded-2xl border ${mod.border} ${mod.bg} p-5 text-left transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${mod.bg} ${mod.color} border ${mod.border}`}>
                  {mod.icon}
                </div>
                <div className="flex items-center gap-1">
                  {mod.count > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[24px] h-6 rounded-full px-2 text-xs font-bold ${mod.color} ${mod.bg} border ${mod.border}`}>
                      {mod.count}
                    </span>
                  )}
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </div>
              <h3 className="mt-3 text-base font-bold text-[#154212]">{mod.title}</h3>
              <p className="mt-1 text-xs text-[#42493e]/70 leading-relaxed">{mod.description}</p>
            </button>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 bg-white/80 backdrop-blur-md rounded-2xl border border-[#bcf0ae] shadow-[0_4px_30px_rgba(21,66,18,0.06)] p-5">
          <h2 className="font-serif text-lg font-bold text-[#154212]">Quick Summary</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-center">
              <p className="text-2xl font-bold text-[#154212]">{store.entries.length}</p>
              <p className="text-xs text-[#42493e]">Total Entries</p>
            </div>
            <div className="p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-center">
              <p className="text-2xl font-bold text-[#154212]">{store.flightLogs.length + store.shoppingLogs.length + store.monitoringEvents.length}</p>
              <p className="text-xs text-[#42493e]">Automation Logs</p>
            </div>
            <div className="p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-center">
              <p className="text-2xl font-bold text-[#154212]">{store.smartAlerts.filter((a) => !a.read).length}</p>
              <p className="text-xs text-[#42493e]">Unread Alerts</p>
            </div>
            <div className="p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-center">
              <p className="text-2xl font-bold text-[#154212]">{store.recommendations.length}</p>
              <p className="text-xs text-[#42493e]">Recommendations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
