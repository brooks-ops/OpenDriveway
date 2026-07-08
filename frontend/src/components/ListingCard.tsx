import { BatteryCharging, MapPin, Umbrella } from "lucide-react";
import { Link } from "react-router-dom";

import { formatMoney } from "../lib/format";
import type { Listing } from "../types/domain";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group block rounded-md border border-ink/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="flex aspect-[5/3] items-center justify-center rounded-md bg-curb">
        <MapPin className="text-moss" size={34} aria-hidden="true" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="line-clamp-2 text-base font-bold">{listing.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink/65">
            <MapPin size={14} /> {listing.city}, {listing.state}
          </p>
        </div>
        <p className="shrink-0 text-right text-base font-black text-moss">{formatMoney(listing.price_cents, listing.currency)}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-ink/70">
        <span className="rounded-md bg-curb px-2 py-1">{listing.capacity} space{listing.capacity === 1 ? "" : "s"}</span>
        {listing.covered ? <span className="inline-flex items-center gap-1 rounded-md bg-curb px-2 py-1"><Umbrella size={13} /> Covered</span> : null}
        {listing.ev_charging ? <span className="inline-flex items-center gap-1 rounded-md bg-curb px-2 py-1"><BatteryCharging size={13} /> EV</span> : null}
      </div>
    </Link>
  );
}
