import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

import type { User } from "../types/domain";
import type { DemoSession } from "../lib/demoAuth";

export type AppSession = Session | DemoSession;

export interface AuthContextValue {
  session: AppSession | null;
  user: User | null;
  loading: boolean;
  signInDemo: (email: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
