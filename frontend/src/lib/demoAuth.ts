import type { User } from "../types/domain";

const DEMO_SESSION_KEY = "opendriveway.demoSession";

export interface DemoSession {
  demo: true;
  email: string;
  fullName: string;
}

export const isLocalDemoMode = import.meta.env.VITE_LOCAL_DEMO_MODE === "true";

export function getDemoSession(): DemoSession | null {
  if (!isLocalDemoMode) return null;
  const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
  return raw ? (JSON.parse(raw) as DemoSession) : null;
}

export function setDemoSession(email: string, fullName?: string): DemoSession {
  const session: DemoSession = {
    demo: true,
    email,
    fullName: fullName || email.split("@")[0] || "Local Demo User",
  };
  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearDemoSession() {
  window.localStorage.removeItem(DEMO_SESSION_KEY);
}

export function demoHeaders(): HeadersInit {
  const session = getDemoSession();
  return session
    ? {
        "X-Demo-Email": session.email,
        "X-Demo-Name": session.fullName,
      }
    : {};
}

export function demoUserFromSession(session: DemoSession): User {
  return {
    id: `demo-${session.email}`,
    email: session.email,
    full_name: session.fullName,
    role: "driver",
    created_at: new Date().toISOString(),
  };
}
