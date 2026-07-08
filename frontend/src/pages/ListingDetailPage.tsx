import { BatteryCharging, CalendarDays, MapPin, Umbrella } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../components/auth-context";
import { OpenDrivewayMap } from "../components/OpenDrivewayMapLazy";
import { apiGet, apiSend } from "../lib/api";
import { formatMoney } from "../lib/format";
import type { Listing } from "../types/domain";

export function ListingDetailPage() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (listingId) apiGet<Listing>(`/api/listings/${listingId}`).then(setListing).catch(() => setListing(null));
  }, [listingId]);

  async function reserve(event: FormEvent) {
    event.preventDefault();
    if (!listing) return;
    if (!session) {
      const next = encodeURIComponent(`/listings/${listing.id}`);
      navigate(`/login?mode=signup&intent=book&next=${next}`);
      return;
    }
    try {
      await apiSend("/api/bookings", "POST", {
        listing_id: listing.id,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
      });
      setMessage("Reservation created. Payment confirmation can now be completed through the backend payment flow.");
    } catch {
      setMessage("Could not create this reservation. Please confirm your account and try again.");
    }
  }

  if (!listing) {
    return <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">Loading listing...</section>;
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:px-8">
      <div>
        <OpenDrivewayMap selectedListing={listing} className="h-[20rem] sm:h-[24rem] lg:h-[27rem]" />
        <h1 className="mt-6 text-3xl font-black sm:text-4xl">{listing.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-ink/65"><MapPin size={18} /> {listing.city}, {listing.state} {listing.postal_code}</p>
        <p className="mt-5 max-w-3xl leading-8 text-ink/75">{listing.description}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
          <span className="rounded-md bg-curb px-3 py-2">{listing.capacity} space{listing.capacity === 1 ? "" : "s"}</span>
          {listing.covered ? <span className="inline-flex items-center gap-2 rounded-md bg-curb px-3 py-2"><Umbrella size={16} /> Covered</span> : null}
          {listing.ev_charging ? <span className="inline-flex items-center gap-2 rounded-md bg-curb px-3 py-2"><BatteryCharging size={16} /> EV charging</span> : null}
        </div>
      </div>
      <aside className="h-fit rounded-md border border-ink/10 bg-white p-5 shadow-soft lg:sticky lg:top-24">
        <p className="text-2xl font-black text-moss sm:text-3xl">{formatMoney(listing.price_cents, listing.currency)} <span className="text-sm font-bold text-ink/50">/ hour</span></p>
        <form onSubmit={reserve} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-bold">Start</span>
            <input type="datetime-local" required value={startAt} onChange={(event) => setStartAt(event.target.value)} className="mt-1 w-full rounded-md border border-ink/15 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-bold">End</span>
            <input type="datetime-local" required value={endAt} onChange={(event) => setEndAt(event.target.value)} className="mt-1 w-full rounded-md border border-ink/15 px-3 py-3" />
          </label>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white">
            <CalendarDays size={18} /> {session ? "Reserve" : "Create account to reserve"}
          </button>
        </form>
        {message ? <p className="mt-4 rounded-md bg-curb p-3 text-sm font-medium">{message}</p> : null}
      </aside>
    </section>
  );
}
