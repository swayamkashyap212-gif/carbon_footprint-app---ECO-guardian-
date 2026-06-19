import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  Leaf,
  LayoutDashboard,
  Cpu,
  Lightbulb,
  Trophy,
  User,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "./services/supabase";

import AuthScreen from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import AutomationHubScreen from "./screens/AutomationHubScreen";
import InsightsScreen from "./screens/InsightsScreen";
import CoachScreen from "./screens/CoachScreen";
import ProfileScreen from "./screens/ProfileScreen";
import TrackScreen from "./screens/TrackScreen";
import FlightScreen from "./screens/FlightScreen";
import ShoppingScreen from "./screens/ShoppingScreen";
import MonitoringScreen from "./screens/MonitoringScreen";
import AlertsScreen from "./screens/AlertsScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import RecommendationsScreen from "./screens/RecommendationsScreen";

const AUTH_KEY = "ecoguardian.authenticated";
const DEMO_KEY = "ecoguardian.demoMode";

const navItems = [
  { path: "/", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { path: "/automate", label: "Automate", icon: <Cpu size={20} /> },
  { path: "/insights", label: "Insights", icon: <Lightbulb size={20} /> },
  { path: "/challenges", label: "Coach", icon: <Trophy size={20} /> },
  { path: "/profile", label: "Profile", icon: <User size={20} /> },
];

function Sidebar({ isDemo, onClose }: { isDemo: boolean; onClose?: () => void }) {
  const location = useLocation();

  return (
    <div className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#154212] z-40 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#bcf0ae]/20">
            <Leaf size={20} className="text-[#bcf0ae]" />
          </div>
          <span className="font-serif text-lg font-bold text-white">EcoGuardian AI</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#bcf0ae]/20 text-[#bcf0ae]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isDemo && (
        <div className="mx-3 mb-4 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
          <p className="text-xs font-medium text-amber-300">Demo Mode</p>
          <p className="text-[10px] text-amber-400/60">Data is local only</p>
        </div>
      )}
    </div>
  );
}

function BottomBar() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? "text-[#154212]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MainLayout() {
  const [isDemo, setIsDemo] = useState(() => {
    try {
      return localStorage.getItem(DEMO_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [authenticated, setAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(AUTH_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [checkingSession, setCheckingSession] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthenticated(true);
        try { localStorage.setItem(AUTH_KEY, "true"); } catch {}
      }
      setCheckingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthenticated(true);
        try { localStorage.setItem(AUTH_KEY, "true"); } catch {}
      } else {
        setAuthenticated(false);
        try { localStorage.removeItem(AUTH_KEY); } catch {}
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function handleAuth() {
    setAuthenticated(true);
    try {
      localStorage.setItem(AUTH_KEY, "true");
    } catch {
      // ignore
    }
  }

  function enterDemo() {
    setIsDemo(true);
    setAuthenticated(true);
    try {
      localStorage.setItem(DEMO_KEY, "true");
      localStorage.setItem(AUTH_KEY, "true");
    } catch {
      // ignore
    }
  }

  if (!authenticated && !isDemo) {
    if (checkingSession) {
      return (
        <div className="min-h-screen bg-[#154212] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-[#bcf0ae] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#bcf0ae]/60">Loading...</p>
          </div>
        </div>
      );
    }
    return (
      <AuthScreen
        onAuth={() => {
          handleAuth();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf8]">
      {/* Desktop sidebar */}
      {!isMobile && <Sidebar isDemo={isDemo} />}

      {/* Mobile top bar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#154212] px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Leaf size={20} className="text-[#bcf0ae]" />
            <span className="font-serif text-base font-bold text-white">EcoGuardian AI</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white/80 hover:text-white"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Sidebar isDemo={isDemo} onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main
        className={`min-h-screen overflow-y-auto ${
          isMobile ? "pt-[52px] pb-20" : "ml-[280px]"
        }`}
      >
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/automate" element={<AutomationHubScreen />} />
          <Route path="/insights" element={<InsightsScreen />} />
          <Route path="/challenges" element={<CoachScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/track" element={<TrackScreen />} />
          <Route path="/flights" element={<FlightScreen />} />
          <Route path="/shopping" element={<ShoppingScreen />} />
          <Route path="/monitoring" element={<MonitoringScreen />} />
          <Route path="/alerts" element={<AlertsScreen />} />
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/recommendations" element={<RecommendationsScreen />} />
        </Routes>
      </main>

      {/* Mobile bottom bar */}
      {isMobile && <BottomBar />}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <MainLayout />
    </HashRouter>
  );
}
