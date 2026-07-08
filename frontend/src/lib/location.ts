export interface BrowserLocation {
  latitude: number;
  longitude: number;
}

export function getBrowserLocation(): Promise<BrowserLocation> {
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("Location services are not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location permission was denied."));
          return;
        }
        if (error.code === error.TIMEOUT) {
          reject(new Error("Location lookup timed out."));
          return;
        }
        reject(new Error("Could not determine your current location."));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  });
}
