import { Session } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { isSupabaseConfigured, supabase } from "../services/supabase";
import { resetHydration, hydrateFromDatabase } from "../services/dataBridge";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  refreshSession: async () => {},
  signOut: async () => {},
});

const SESSION_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes

async function ensureProfile(userId: string, user: { email?: string; phone?: string; user_metadata?: Record<string, unknown> }) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (existing) return;
    const fullName = (user.user_metadata?.full_name as string) || "EcoGuardian User";
    const profilePayload: Record<string, unknown> = { id: userId, full_name: fullName };
    if (user.phone) {
      profilePayload.phone = user.phone;
      profilePayload.phone_number = user.phone;
    }
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });
    if (profileErr) {
      // Profile upsert error
    }
    const { error: pointsErr } = await supabase
      .from("user_points")
      .upsert({ user_id: userId, total_points: 0, level: 1, points_to_next_level: 100 }, { onConflict: "user_id" });
    if (pointsErr) {
      // Points upsert error
    }
  } catch (err) {
    console.warn("[Auth] ensureProfile fallback error:", err);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialSessionResolved = useRef(false);

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        return;
      }
      setSession(data.session);
    } catch (err) {
      // Silent fail
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      await supabase.auth.signOut();
      setSession(null);
    } catch (err) {
      console.warn("Sign out error:", err);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Add timeout to prevent hanging on splash screen
    const sessionTimeout = setTimeout(() => {
      if (!cancelled) {
        setSession(null);
        initialSessionResolved.current = true;
        setLoading(false);
      }
    }, 10000);

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        clearTimeout(sessionTimeout);
        if (!cancelled) {
          if (error) {
            console.warn("[Auth] Session load error:", error.message);
          }
          setSession(data.session);
          initialSessionResolved.current = true;
          setLoading(false);
          if (data.session?.user) {
            ensureProfile(data.session.user.id, data.session.user);
          }
        }
      })
      .catch((err) => {
        clearTimeout(sessionTimeout);
        if (!cancelled) {
          console.warn("[Auth] getSession exception:", err);
          initialSessionResolved.current = true;
          setLoading(false);
        }
      });

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const result = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!cancelled) {
          if (!initialSessionResolved.current) {
            initialSessionResolved.current = true;
          }
          setSession(nextSession);
          setLoading(false);

          if (event === "SIGNED_IN" && nextSession?.user) {
            resetHydration();
            ensureProfile(nextSession.user.id, nextSession.user);
            hydrateFromDatabase().catch(() => {});
          } else if (event === "SIGNED_OUT") {
            // User signed out
          } else if (event === "TOKEN_REFRESHED") {
            // Token refreshed
          }
        }
      });
      subscription = result.data.subscription;
    } catch (err) {
      if (!cancelled) setLoading(false);
    }

    refreshTimerRef.current = setInterval(() => {
      refreshSession();
    }, SESSION_REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      if (subscription) subscription.unsubscribe();
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshSession]);

  const value = useMemo(
    () => ({ session, loading, refreshSession, signOut }),
    [session, loading, refreshSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
