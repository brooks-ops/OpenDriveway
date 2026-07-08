import maplibregl, { type Map, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef } from "react";

import type { Listing } from "../types/domain";

export interface OpenDrivewayMapProps {
  listings?: Listing[];
  center?: [number, number];
  zoom?: number;
  selectedListing?: Listing;
  userLocation?: [number, number];
  className?: string;
  showBrandBadge?: boolean;
}

const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
const DEFAULT_CENTER: [number, number] = [-87.6224, 41.86];

function listingCenter(listing: Listing): [number, number] {
  return [Number(listing.longitude), Number(listing.latitude)];
}

function validListing(listing: Listing) {
  return Number.isFinite(Number(listing.longitude)) && Number.isFinite(Number(listing.latitude));
}

function applyOpenDrivewayColors(map: Map) {
  const style = map.getStyle();
  if (!style.layers) return;

  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();
    if (layer.type === "background") {
      map.setPaintProperty(layer.id, "background-color", "#eef8e8");
    }
    if (layer.type === "fill") {
      if (id.includes("water")) map.setPaintProperty(layer.id, "fill-color", "#b8ead1");
      else if (id.includes("park") || id.includes("landcover") || id.includes("landuse")) map.setPaintProperty(layer.id, "fill-color", "#d8f2ce");
      else map.setPaintProperty(layer.id, "fill-color", "#f7fbf0");
    }
    if (layer.type === "line") {
      if (id.includes("road") || id.includes("street")) {
        map.setPaintProperty(layer.id, "line-color", "#eff7df");
        map.setPaintProperty(layer.id, "line-opacity", 0.95);
      } else if (id.includes("water")) {
        map.setPaintProperty(layer.id, "line-color", "#6ed99e");
      } else {
        map.setPaintProperty(layer.id, "line-color", "#70b978");
      }
    }
    if (layer.type === "symbol") {
      if (id.includes("label") || id.includes("name")) {
        map.setPaintProperty(layer.id, "text-color", "#082512");
        map.setPaintProperty(layer.id, "text-halo-color", "#eff7df");
        map.setPaintProperty(layer.id, "text-halo-width", 1.4);
      }
      if (id.includes("poi")) {
        map.setLayoutProperty(layer.id, "visibility", "none");
      }
    }
  }
}

function createMarkerElement(label?: string) {
  const element = document.createElement("div");
  element.className = "opendriveway-map-marker";
  element.setAttribute("aria-label", label || "OpenDriveway parking location");
  return element;
}

function createUserLocationElement() {
  const element = document.createElement("div");
  element.className = "opendriveway-user-marker";
  element.setAttribute("aria-label", "Your current location");
  return element;
}

export function OpenDrivewayMap({
  listings = [],
  center = DEFAULT_CENTER,
  zoom = 12.7,
  selectedListing,
  userLocation,
  className = "",
  showBrandBadge = true,
}: OpenDrivewayMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const selected = selectedListing && validListing(selectedListing) ? selectedListing : undefined;
  const usableListings = useMemo(() => listings.filter(validListing), [listings]);
  const resolvedCenter = useMemo(
    () => (selected ? listingCenter(selected) : userLocation || (usableListings[0] ? listingCenter(usableListings[0]) : center)),
    [center, selected, usableListings, userLocation],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE_URL,
      center: resolvedCenter,
      zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "OpenFreeMap | OpenDriveway colors",
      }),
      "bottom-right",
    );
    map.on("load", () => applyOpenDrivewayColors(map));
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [resolvedCenter, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const markerListings = selected ? [selected] : usableListings;
    markerListings.forEach((listing) => {
      const popupContent = document.createElement("div");
      const title = document.createElement("strong");
      const location = document.createElement("p");
      title.textContent = listing.title;
      location.textContent = `${listing.city}, ${listing.state}`;
      location.className = "mt-1 text-sm";
      popupContent.append(title, location);

      const marker = new maplibregl.Marker({ element: createMarkerElement(listing.title), anchor: "bottom" })
        .setLngLat(listingCenter(listing))
        .setPopup(new maplibregl.Popup({ offset: 22, closeButton: false }).setDOMContent(popupContent))
        .addTo(map);
      markersRef.current.push(marker);
    });

    map.easeTo({ center: resolvedCenter, zoom: selected ? Math.max(zoom, 14.2) : zoom, duration: 600 });
  }, [resolvedCenter, selected, usableListings, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!userLocation) return;

    userMarkerRef.current = new maplibregl.Marker({ element: createUserLocationElement(), anchor: "center" })
      .setLngLat(userLocation)
      .addTo(map);
    map.easeTo({ center: userLocation, zoom: Math.max(zoom, 13.4), duration: 600 });
  }, [userLocation, zoom]);

  return (
    <div className={`relative h-full min-h-[18rem] overflow-hidden rounded-md border border-glow/25 bg-asphalt shadow-glow ${className}`}>
      <div ref={containerRef} className="h-full min-h-[18rem] w-full" aria-label="OpenDriveway OpenFreeMap parking map" />
      {showBrandBadge ? (
        <div className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-4.5rem)] rounded-md border border-glow/25 bg-cream/95 px-2.5 py-2 shadow-glow sm:left-3 sm:top-3 sm:px-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-moss">OpenFreeMap</p>
          <p className="truncate text-sm font-bold text-ink">OpenDriveway colors</p>
        </div>
      ) : null}
    </div>
  );
}
