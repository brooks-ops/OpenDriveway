import { Crosshair, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ListingCard } from "../components/ListingCard";
import { OpenDrivewayMap } from "../components/OpenDrivewayMapLazy";
import { apiGet } from "../lib/api";
import { getBrowserLocation, type BrowserLocation } from "../lib/location";
import type { ListingSearchResult } from "../types/domain";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<ListingSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const location = locationFromParams(searchParams);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set("limit", "24");
    apiGet<ListingSearchResult>(`/api/listings?${params.toString()}`)
      .then((data) => {
        setResults(data);
        setError(null);
      })
      .catch(() => setError("Search is unavailable right now."));
  }, [searchParams]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (location) {
      next.set("lat", String(location.latitude));
      next.set("lng", String(location.longitude));
      next.set("radius_miles", searchParams.get("radius_miles") || "25");
    }
    setSearchParams(next);
  }

  async function useCurrentLocation() {
    setLocating(true);
    setLocationMessage(null);
    try {
      const current = await getBrowserLocation();
      const next = new URLSearchParams(searchParams);
      next.set("lat", String(current.latitude));
      next.set("lng", String(current.longitude));
      next.set("radius_miles", "25");
      setSearchParams(next);
      setLocationMessage("Searching near your current location.");
    } catch (err) {
      setLocationMessage(err instanceof Error ? err.message : "Could not use your current location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black sm:text-4xl">Search parking</h1>
        <form onSubmit={submit} className="mt-5 rounded-md border border-ink/10 bg-white p-2 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="flex min-h-12 items-center gap-3 rounded-md bg-curb px-4">
              <Search className="text-moss" size={19} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="City, venue, airport, or destination" />
            </label>
            <button className="rounded-md bg-ink px-5 py-3 font-bold text-white">Search</button>
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-moss/20 bg-curb px-4 text-sm font-black text-moss disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Crosshair size={17} /> {locating ? "Locating..." : "Use my location"}
            </button>
            {locationMessage ? <p className="text-sm font-bold text-ink/65">{locationMessage}</p> : null}
          </div>
        </form>
      </div>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}
      {!results && !error ? <p className="rounded-md bg-curb p-4 text-ink/65">Loading listings...</p> : null}
      {results ? (
        <p className="mb-4 text-sm font-semibold text-ink/60">
          {results.total} active listing{results.total === 1 ? "" : "s"}
          {location ? ` within ${searchParams.get("radius_miles") || "25"} miles` : ""}
        </p>
      ) : null}
      <OpenDrivewayMap
        listings={results?.items || []}
        userLocation={location ? [location.longitude, location.latitude] : undefined}
        className="mb-6 h-[19rem] sm:h-[23rem] lg:h-[28rem]"
      />
      {results && results.items.length === 0 ? (
        <div className="rounded-md border border-ink/10 bg-white p-8">
          <h2 className="text-xl font-black">No spaces found</h2>
          <p className="mt-2 text-ink/65">Try a broader destination, or check back as hosts publish new spaces.</p>
        </div>
      ) : null}
      {results && results.items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      ) : null}
    </section>
  );
}

function locationFromParams(params: URLSearchParams): BrowserLocation | null {
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}
