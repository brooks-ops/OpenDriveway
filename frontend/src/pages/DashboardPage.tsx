import { ExternalLink, LogOut, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../components/auth-context";
import { apiGet, apiSend } from "../lib/api";
import { formatMoney } from "../lib/format";
import type { Booking, Listing } from "../types/domain";

export function DashboardPage() {
  const { user, refreshProfile, signOut } = useAuth();
  const [hostListings, setHostListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (user) {
      apiGet<Booking[]>("/api/bookings/mine").then(setBookings).catch(() => setBookings([]));
    }
    if (user?.role === "host" || user?.role === "admin") {
      apiGet<Listing[]>("/api/listings/host/mine").then(setHostListings).catch(() => setHostListings([]));
    }
  }, [user]);

  async function becomeHost() {
    await apiSend("/api/auth/me", "PATCH", { role: "host" });
    await refreshProfile();
  }

  async function startStripeOnboarding() {
    const response = await apiSend<{ url: string }>("/api/payments/connect/onboarding-link", "POST");
    window.location.assign(response.url);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-black">Dashboard</h1>
          <p className="mt-1 text-ink/65">{user?.email}</p>
        </div>
        <button onClick={signOut} className="inline-flex items-center justify-center gap-2 rounded-md border border-ink/15 px-4 py-2 font-bold">
          <LogOut size={16} /> Sign out
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-md border border-ink/10 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink/60">Role</dt><dd className="font-bold capitalize">{user?.role}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink/60">Name</dt><dd className="font-bold">{user?.full_name || "Not set"}</dd></div>
          </dl>
          {user?.role === "driver" ? (
            <button onClick={becomeHost} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white">
              <ShieldCheck size={18} /> Become a Host
            </button>
          ) : (
            <button onClick={startStripeOnboarding} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white">
              Stripe Connect <ExternalLink size={18} />
            </button>
          )}
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black">Host listings</h2>
            {(user?.role === "host" || user?.role === "admin") ? (
              <Link to="/dashboard/listings/new" className="inline-flex items-center gap-2 rounded-md bg-leaf px-3 py-2 text-sm font-bold text-white">
                <Plus size={16} /> New
              </Link>
            ) : null}
          </div>
          {user?.role === "driver" ? <p className="mt-4 text-ink/65">Upgrade to host to create and manage driveway spaces.</p> : null}
          {(user?.role === "host" || user?.role === "admin") && hostListings.length === 0 ? (
            <p className="mt-4 rounded-md bg-curb p-4 text-ink/65">No listings yet. Create your first real driveway listing when your address and pricing are ready.</p>
          ) : null}
          {hostListings.length > 0 ? (
            <div className="mt-4 divide-y divide-ink/10">
              {hostListings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-bold">{listing.title}</p>
                    <p className="text-sm text-ink/60">{listing.city}, {listing.state} · {listing.status}</p>
                  </div>
                  {listing.status === "active" ? (
                    <Link to={`/listings/${listing.id}`} className="rounded-md border border-ink/15 px-3 py-2 text-sm font-bold">View</Link>
                  ) : (
                    <span className="rounded-md bg-curb px-3 py-2 text-sm font-bold text-ink/55">Not public</span>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <section className="mt-5 rounded-md border border-ink/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Bookings</h2>
        {bookings.length === 0 ? (
          <p className="mt-4 rounded-md bg-curb p-4 text-ink/65">No bookings yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-ink/10">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold capitalize">{booking.status.replace("_", " ")}</p>
                  <p className="text-sm text-ink/60">
                    {new Date(booking.start_at).toLocaleString()} to {new Date(booking.end_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-moss">{formatMoney(booking.total_cents, booking.currency)}</span>
                  <Link to={`/listings/${booking.listing_id}`} className="rounded-md border border-ink/15 px-3 py-2 text-sm font-bold">View listing</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
