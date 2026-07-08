import { FormEvent, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../components/auth-context";
import { apiSend } from "../lib/api";
import { isLocalDemoMode } from "../lib/demoAuth";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function LoginPage() {
  const { session, signInDemo, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = normalizeNextPath(searchParams.get("next"));
  const requestedMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const intent = searchParams.get("intent");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">(requestedMode);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={nextPath} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    if (isLocalDemoMode) {
      await signInDemo(email, fullName || undefined);
      setBusy(false);
      await continueAfterAuth();
      return;
    }
    const { data, error } = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (mode === "signup") {
      if (data.session) {
        await continueAfterAuth();
        return;
      }
      setMessage("Account created. Check your email if confirmation is required, then come back to continue.");
      return;
    }
    await continueAfterAuth();
  }

  async function continueAfterAuth() {
    if (intent === "host") {
      await apiSend("/api/auth/me", "PATCH", { role: "host" }).catch(() => null);
      await refreshProfile().catch(() => null);
    }
    navigate(nextPath, { replace: true });
  }

  async function signInWith(provider: "google" | "apple") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${nextPath}` },
    });
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-66px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <h1 className="text-5xl font-black leading-tight">{mode === "signup" ? "Create your OpenDriveway account." : "Access your OpenDriveway account."}</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-ink/70">
          {intent === "book"
            ? "Create an account or log in to reserve this driveway space."
            : intent === "host"
              ? "Create an account or log in to list your driveway and manage bookings."
              : "Drivers manage reservations. Hosts manage spaces, payout onboarding, and published driveway listings."}
        </p>
      </div>
      <div className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
        {isLocalDemoMode ? (
          <p className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-900">
            Local demo mode is enabled. Accounts are stored only in this browser and authenticated to the API with demo headers.
          </p>
        ) : null}
        {!isSupabaseConfigured && !isLocalDemoMode ? (
          <p className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm font-medium text-yellow-900">
            Supabase environment variables are required before authentication can run.
          </p>
        ) : null}
        <div className="grid grid-cols-2 rounded-md bg-curb p-1">
          <button onClick={() => setMode("login")} className={`rounded-md px-4 py-2 font-bold ${mode === "login" ? "bg-white shadow-sm" : "text-ink/60"}`}>Login</button>
          <button onClick={() => setMode("signup")} className={`rounded-md px-4 py-2 font-bold ${mode === "signup" ? "bg-white shadow-sm" : "text-ink/60"}`}>Sign up</button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <label className="block">
              <span className="text-sm font-bold">Full name</span>
              <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 w-full rounded-md border border-ink/15 px-3 py-3 outline-none focus:border-moss" />
            </label>
          ) : null}
          <label className="block">
            <span className="text-sm font-bold">Email</span>
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-ink/15 px-3 py-3 outline-none focus:border-moss" />
          </label>
          <label className="block">
            <span className="text-sm font-bold">Password</span>
            <input
              type="password"
              required={!isLocalDemoMode}
              minLength={isLocalDemoMode ? undefined : 8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-ink/15 px-3 py-3 outline-none focus:border-moss"
            />
          </label>
          <button disabled={busy || (!isSupabaseConfigured && !isLocalDemoMode)} className="w-full rounded-md bg-ink px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button disabled={!isSupabaseConfigured || isLocalDemoMode} onClick={() => signInWith("google")} className="rounded-md border border-ink/15 px-4 py-3 font-bold disabled:opacity-50">Google Sign In</button>
          <button disabled={!isSupabaseConfigured || isLocalDemoMode} onClick={() => signInWith("apple")} className="rounded-md border border-ink/15 px-4 py-3 font-bold disabled:opacity-50">Apple Sign In</button>
        </div>
        {message ? <p className="mt-4 rounded-md bg-curb p-3 text-sm font-medium">{message}</p> : null}
      </div>
    </section>
  );
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
