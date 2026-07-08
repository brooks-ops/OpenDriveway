import { ArrowRight, Crosshair, Home, ListFilter, Search, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { OpenDrivewayMap } from "../components/OpenDrivewayMapLazy";
import { apiGet } from "../lib/api";
import { formatMoney } from "../lib/format";
import { getBrowserLocation, type BrowserLocation } from "../lib/location";
import type { ListingSearchResult } from "../types/domain";

export function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [featured, setFeatured] = useState<ListingSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<BrowserLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    apiGet<ListingSearchResult>("/api/listings?limit=3")
      .then(setFeatured)
      .catch(() => setError("Listings are unavailable right now."));
  }, []);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location) {
      params.set("lat", String(location.latitude));
      params.set("lng", String(location.longitude));
      params.set("radius_miles", "25");
    }
    navigate(`/search?${params.toString()}`);
  }

  async function useCurrentLocation() {
    setLocating(true);
    setLocationMessage(null);
    try {
      const current = await getBrowserLocation();
      setLocation(current);
      const params = new URLSearchParams({
        lat: String(current.latitude),
        lng: String(current.longitude),
        radius_miles: "25",
        limit: "6",
      });
      const nearby = await apiGet<ListingSearchResult>(`/api/listings?${params.toString()}`);
      setFeatured(nearby);
      setError(null);
      setLocationMessage("Showing driveway spaces near your current location.");
    } catch (err) {
      setLocationMessage(err instanceof Error ? err.message : "Could not use your current location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <section className="relative h-[calc(100svh-5.1rem)] min-h-[40rem] overflow-hidden bg-asphalt">
      <OpenDrivewayMap
        listings={featured?.items || []}
        userLocation={location ? [location.longitude, location.latitude] : undefined}
        showBrandBadge={false}
        className="!absolute inset-0 !h-full !min-h-full rounded-none border-0 shadow-none"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-asphalt/45 to-transparent px-3 py-3 sm:px-5 sm:py-5 lg:px-8 xl:px-10">
        <div className="pointer-events-auto mx-auto flex max-w-[1280px] flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <form onSubmit={submitSearch} className="w-full rounded-md border border-glow/25 bg-cream/96 p-2.5 shadow-glow backdrop-blur lg:max-w-3xl">
            <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
              <label className="flex min-h-14 items-center gap-3 rounded-md bg-curb px-4 sm:min-h-16 sm:px-5">
                <Search className="shrink-0 text-moss" size={22} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search parking"
                  className="w-full bg-transparent text-lg font-semibold text-ink outline-none placeholder:text-ink/45 sm:text-xl"
                />
              </label>
              <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-moss px-6 text-lg font-black text-cream shadow-glow sm:min-h-16 sm:px-8">
                Search <ArrowRight size={20} />
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-moss/20 bg-white px-4 text-sm font-black text-moss disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Crosshair size={17} /> {locating ? "Locating..." : "Use my location"}
              </button>
              {locationMessage ? <p className="text-sm font-bold text-ink/65">{locationMessage}</p> : null}
            </div>
          </form>

          <Link
            to="/become-a-host"
            className="hidden min-h-16 items-center justify-center gap-2 rounded-md border border-glow/25 bg-cream/96 px-5 text-lg font-black text-moss shadow-glow backdrop-blur lg:inline-flex"
          >
            <Home size={20} /> Become a Host
          </Link>
        </div>
      </div>

      <aside className="absolute bottom-0 left-0 right-0 z-10 max-h-[44svh] overflow-hidden border-t border-glow/25 bg-cream/96 shadow-glow backdrop-blur lg:bottom-auto lg:left-[max(2rem,calc((100vw-1280px)/2+2.5rem))] lg:right-auto lg:top-36 lg:flex lg:max-h-[calc(100svh-12rem)] lg:w-[30rem] lg:flex-col lg:rounded-md lg:border xl:w-[32rem]">
        <div className="flex items-start justify-between gap-4 border-b border-moss/15 p-5 sm:p-6">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-moss sm:text-sm">
              <ShieldCheck size={16} /> OpenDriveway
            </p>
            <h1 className="mt-2 text-3xl font-black leading-[1.04] text-ink sm:text-4xl lg:text-5xl">Find driveway parking on the map.</h1>
          </div>
          <Link to="/search" className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-moss text-cream sm:h-14 sm:w-14" aria-label="Open full search">
            <ListFilter size={22} />
          </Link>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 lg:flex-1">
          {error ? <p className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-base font-bold text-yellow-900">Live listings unavailable. The map is still available.</p> : null}
          {!featured && !error ? <p className="rounded-md bg-curb p-4 text-base font-bold text-ink/65">Loading live listings...</p> : null}
          {featured && featured.items.length === 0 ? (
            <div className="rounded-md border border-ink/10 bg-white p-5">
              <p className="text-lg font-black">No active listings yet.</p>
              <p className="mt-1 text-base text-ink/65">When hosts publish real spaces, they will appear on this map.</p>
            </div>
          ) : null}
          {featured && featured.items.length > 0 ? (
            <div className="grid gap-3">
              {featured.items.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.id}`}
                  className="rounded-md border border-ink/10 bg-white p-4 shadow-sm transition hover:border-moss/40 hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="line-clamp-1 text-base font-black text-ink">{listing.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-ink/60">
                        {listing.city}, {listing.state} · {listing.capacity} space{listing.capacity === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-black text-moss">{formatMoney(listing.price_cents, listing.currency)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
