import { lazy, Suspense } from "react";

import type { OpenDrivewayMapProps } from "./OpenDrivewayMap";

const LazyOpenDrivewayMap = lazy(() =>
  import("./OpenDrivewayMap").then((module) => ({ default: module.OpenDrivewayMap })),
);

export function OpenDrivewayMap(props: OpenDrivewayMapProps) {
  return (
    <Suspense
      fallback={
        <div className={`grid min-h-[18rem] place-items-center rounded-md border border-glow/25 bg-asphalt text-cream shadow-glow ${props.className || ""}`}>
          <div className="text-center">
            <img src="/brand/opendriveway-badge.jpeg" alt="" className="mx-auto mb-3 h-12 w-12 rounded-full object-cover shadow-glow" />
            <p className="text-sm font-bold text-cream/82">Loading OpenDriveway map...</p>
          </div>
        </div>
      }
    >
      <LazyOpenDrivewayMap {...props} />
    </Suspense>
  );
}
