import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./auth-context";

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-ink/70">Loading account...</div>;
  }
  const next = `${location.pathname}${location.search}`;
  return session ? <Outlet /> : <Navigate to={`/login?mode=signup&next=${encodeURIComponent(next)}`} replace />;
}
