import { useState, useMemo, useEffect } from "react";
import {
  Leaf,
  User,
  Shield,
  Bell,
  MapPin,
  Mail,
  ScanLine,
  Sparkles,
  Pause,
  Download,
  Trash2,
  HardDrive,
  LogOut,
  Info,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { supabase } from "../services/supabase";

function getStorageUsed(): string {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || "";
        total += key.length + value.length;
      }
    }
    if (total < 1024) return `${total} B`;
    if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
    return `${(total / (1024 * 1024)).toFixed(1)} MB`;
  } catch {
    return "Unknown";
  }
}

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#154212]/30 ${
        enabled ? "bg-[#154212]" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#bcf0ae] shadow-[0_4px_30px_rgba(21,66,18,0.06)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-[#154212]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function ProfileScreen() {
  const store = useAppStore();
  const [pauseMonitoring, setPauseMonitoring] = useState(false);
  const [locationTracking, setLocationTracking] = useState(true);
  const [emailParsing, setEmailParsing] = useState(false);
  const [receiptOCR, setReceiptOCR] = useState(false);
  const [aiPersonalization, setAiPersonalization] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const storageUsed = useMemo(() => getStorageUsed(), []);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      appName: "EcoGuardian AI",
      score: store.score,
      entries: store.entries,
      electricityLogs: store.electricityLogs,
      flightLogs: store.flightLogs,
      shoppingLogs: store.shoppingLogs,
      monitoringEvents: store.monitoringEvents,
      smartAlerts: store.smartAlerts,
      streaks: store.streaks,
      challenges: store.challenges,
      userPoints: store.userPoints,
      recommendations: store.recommendations,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecoguardian-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash("Data exported successfully");
  }

  function clearOfflineQueue() {
    localStorage.removeItem("ecoguardian.offlineQueue");
    flash("Offline queue cleared");
  }

  function deleteAllData() {
    localStorage.removeItem("ecoguardian.appState");
    localStorage.removeItem("ecoguardian.offlineQueue");
    localStorage.removeItem("ecoguardian.userPrefs");
    setShowDeleteConfirm(false);
    flash("All data deleted. Reloading...");
    setTimeout(() => window.location.reload(), 1500);
  }

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.hash = "#/";
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0faf0] to-[#e8f5e8] pb-24">
      <div className="sticky top-0 z-20 bg-[#154212]/95 backdrop-blur-md px-4 pt-4 pb-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Leaf className="text-[#bcf0ae]" size={22} />
          <h1 className="text-white text-lg font-semibold tracking-tight">Profile & Settings</h1>
        </div>
      </div>

      {message && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-[#154212] text-[#bcf0ae] text-sm font-medium shadow-lg animate-pulse">
          {message}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* User Info */}
        <SectionCard title="User Info" icon={<User size={18} className="text-[#154212]" />}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#bcf0ae]/50 border-2 border-[#154212]/20">
              <Leaf size={32} className="text-[#154212]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#154212]">Eco Warrior</p>
              <p className="text-sm text-[#42493e]">{userEmail || "eco@guardian.ai"}</p>
              <p className="text-xs text-gray-400 mt-1">Level {store.userPoints.level} • {store.userPoints.total} pts</p>
            </div>
          </div>
        </SectionCard>

        {/* Privacy & Settings */}
        <SectionCard title="Privacy & Settings" icon={<Shield size={18} className="text-[#154212]" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Pause size={16} className="text-[#42493e]" />
                <div>
                  <p className="text-sm font-medium text-[#154212]">Pause Monitoring</p>
                  <p className="text-xs text-gray-400">Stop all carbon tracking</p>
                </div>
              </div>
              <ToggleSwitch enabled={pauseMonitoring} onChange={setPauseMonitoring} />
            </div>

            <div className="h-px bg-[#bcf0ae]/50" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-[#42493e]" />
                <div>
                  <p className="text-sm font-medium text-[#154212]">Location Tracking</p>
                  <p className="text-xs text-gray-400">Use GPS for commute detection</p>
                </div>
              </div>
              <ToggleSwitch enabled={locationTracking} onChange={setLocationTracking} />
            </div>

            <div className="h-px bg-[#bcf0ae]/50" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[#42493e]" />
                <div>
                  <p className="text-sm font-medium text-[#154212]">Email Parsing / Gmail</p>
                  <p className="text-xs text-gray-400">Scan receipts from email</p>
                </div>
              </div>
              <ToggleSwitch enabled={emailParsing} onChange={setEmailParsing} />
            </div>

            <div className="h-px bg-[#bcf0ae]/50" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ScanLine size={16} className="text-[#42493e]" />
                <div>
                  <p className="text-sm font-medium text-[#154212]">Receipt OCR uploads</p>
                  <p className="text-xs text-gray-400">Upload receipts for auto-tracking</p>
                </div>
              </div>
              <ToggleSwitch enabled={receiptOCR} onChange={setReceiptOCR} />
            </div>

            <div className="h-px bg-[#bcf0ae]/50" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles size={16} className="text-[#42493e]" />
                <div>
                  <p className="text-sm font-medium text-[#154212]">AI Personalization</p>
                  <p className="text-xs text-gray-400">Personalized tips & insights</p>
                </div>
              </div>
              <ToggleSwitch enabled={aiPersonalization} onChange={setAiPersonalization} />
            </div>
          </div>
        </SectionCard>

        {/* Data Management */}
        <SectionCard title="Data Management" icon={<HardDrive size={18} className="text-[#154212]" />}>
          <div className="space-y-3">
            <button
              onClick={exportData}
              className="flex w-full items-center justify-between rounded-xl border border-[#bcf0ae] bg-[#bcf0ae]/20 px-4 py-3 text-sm font-medium text-[#154212] hover:bg-[#bcf0ae]/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <Download size={16} />
                <span>Export Data</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>

            <button
              onClick={clearOfflineQueue}
              className="flex w-full items-center justify-between rounded-xl border border-[#bcf0ae] bg-[#bcf0ae]/20 px-4 py-3 text-sm font-medium text-[#154212] hover:bg-[#bcf0ae]/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={16} />
                <span>Clear Offline Queue</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={16} />
                <span>Delete All Data</span>
              </div>
              <ChevronRight size={16} className="text-red-300" />
            </button>
          </div>
        </SectionCard>

        {/* App Info */}
        <SectionCard title="App Info" icon={<Info size={18} className="text-[#154212]" />}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#42493e]">Version</span>
              <span className="text-sm font-semibold text-[#154212]">9.0.0</span>
            </div>
            <div className="h-px bg-[#bcf0ae]/50" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#42493e]">Storage Used</span>
              <span className="text-sm font-semibold text-[#154212]">{storageUsed}</span>
            </div>
          </div>
        </SectionCard>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#154212]/20 bg-white/80 px-4 py-3.5 text-sm font-bold text-[#154212] hover:bg-[#bcf0ae]/20 transition-all active:scale-[0.98]"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete All Data</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              This will permanently delete all your carbon tracking data, badges, challenges, and settings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={deleteAllData}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all active:scale-[0.98]"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
