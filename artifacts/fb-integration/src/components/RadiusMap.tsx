import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon resolution issue with bundlers
import L from "leaflet";
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface GeoResult {
  lat: number;
  lng: number;
}

const MILES_TO_METERS = 1609.34;

// Cache geocode results to avoid redundant Nominatim calls
const geocodeCache = new Map<string, GeoResult | null>();

async function geocodeAddress(address: string): Promise<GeoResult | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "hvcg-fb-integration/1.0" },
    });
    if (!res.ok) throw new Error("Nominatim returned " + res.status);
    const data = await res.json();
    if (!data.length) {
      geocodeCache.set(address, null);
      return null;
    }
    const result: GeoResult = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache.set(address, result);
    return result;
  } catch {
    return null;
  }
}

interface RadiusMapProps {
  address: string | null;
  radiusMiles: number;
}

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; lat: number; lng: number }
  | { status: "not-found" }
  | { status: "no-address" };

export function RadiusMap({ address, radiusMiles }: RadiusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [geoState, setGeoState] = useState<GeoState>({ status: "idle" });

  // Geocode when address changes
  useEffect(() => {
    if (!address || address.trim() === "") {
      setGeoState({ status: "no-address" });
      return;
    }
    let cancelled = false;
    setGeoState({ status: "loading" });
    geocodeAddress(address.trim()).then((result) => {
      if (cancelled) return;
      if (result) {
        setGeoState({ status: "ok", lat: result.lat, lng: result.lng });
      } else {
        setGeoState({ status: "not-found" });
      }
    });
    return () => { cancelled = true; };
  }, [address]);

  // Initialize / destroy the Leaflet map instance
  useEffect(() => {
    if (geoState.status !== "ok") return;
    if (!mapContainerRef.current) return;

    const { lat, lng } = geoState;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([lat, lng], 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      markerRef.current = L.marker([lat, lng]).addTo(map);
      circleRef.current = L.circle([lat, lng], {
        radius: radiusMiles * MILES_TO_METERS,
        color: "hsl(221, 83%, 53%)",
        fillColor: "hsl(221, 83%, 53%)",
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);

      mapRef.current = map;
    } else {
      // Update center if address changed
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
      markerRef.current?.setLatLng([lat, lng]);
      circleRef.current?.setLatLng([lat, lng]);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        circleRef.current = null;
        markerRef.current = null;
      }
    };
    // Only re-run when geo coordinates change (address), not radius
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoState]);

  // Update circle radius in real time without re-initialising the map
  useEffect(() => {
    if (!circleRef.current || !mapRef.current || geoState.status !== "ok") return;
    const radiusMeters = radiusMiles * MILES_TO_METERS;
    circleRef.current.setRadius(radiusMeters);
    // Fit map view to the circle bounds
    mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20] });
  }, [radiusMiles, geoState]);

  const mapHeight = "h-52";

  if (geoState.status === "no-address") {
    return (
      <div className={`${mapHeight} rounded-lg border border-dashed border-border bg-secondary/20 flex flex-col items-center justify-center gap-2 text-center px-4`}>
        <MapPin className="w-6 h-6 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">
          Set your address in Profile to see your targeting area on the map.
        </p>
      </div>
    );
  }

  if (geoState.status === "not-found") {
    return (
      <div className={`${mapHeight} rounded-lg border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 flex flex-col items-center justify-center gap-2 text-center px-4`}>
        <MapPin className="w-6 h-6 text-amber-500" />
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Couldn't find that address on the map.
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-500">
          Try being more specific, e.g. "Austin, TX" or a full street address.
        </p>
      </div>
    );
  }

  if (geoState.status === "loading" || geoState.status === "idle") {
    return (
      <div className={`${mapHeight} rounded-lg border border-border bg-secondary/20 flex items-center justify-center`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading map…</span>
        </div>
      </div>
    );
  }

  // status === "ok" — render the Leaflet container
  return (
    <div
      ref={mapContainerRef}
      className={`${mapHeight} rounded-lg overflow-hidden border border-border`}
      style={{ zIndex: 0 }}
    />
  );
}
