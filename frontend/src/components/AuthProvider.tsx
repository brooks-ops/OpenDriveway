import { useEffect, useMemo, useState } from "react";

import { apiGet } from "../lib/api";
import { clearDemoSession, demoUserFromSession, getDemoSession, isLocalDemoMode, setDemoSession } from "../lib/demoAuth";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { User } from "../types/domain";
import { AuthContext } from "./auth-context";
import type { AppSession } from "./auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    if (isLocalDemoMode) {
      const demoSession = getDemoSession();
      setSession(demoSession);
      if (!demoSession) {
        setUser(null);
        return;
      }
      try {
        setUser(await apiGet<User>("/api/auth/me"));
      } catch {
        setUser(demoUserFromSession(demoSession));
      }
      return;
    }
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (!data.session) {
      setUser(null);
      return;
    }
    setUser(await apiGet<User>("/api/auth/me"));
  }

  useEffect(() => {
    let active = true;
    if (isLocalDemoMode) {
      refreshProfile().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    refreshProfile()
      .catch(() => setUser(null))
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setUser(null);
        return;
      }
      apiGet<User>("/api/auth/me").then(setUser).catch(() => setUser(null));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signInDemo(email: string, fullName?: string) {
    const demoSession = setDemoSession(email, fullName);
    setSession(demoSession);
    setUser(await apiGet<User>("/api/auth/me").catch(() => demoUserFromSession(demoSession)));
  }

  async function signOut() {
    if (isLocalDemoMode) {
      clearDemoSession();
      setSession(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  }

  const value = useMemo(
    () => ({ session, user, loading, signInDemo, signOut, refreshProfile }),
    [session, user, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
