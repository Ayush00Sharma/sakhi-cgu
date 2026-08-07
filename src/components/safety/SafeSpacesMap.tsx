import { useCallback, useEffect, useState } from "react";
import { Building2, Hospital, Landmark, Navigation, RefreshCw, Fuel } from "lucide-react";

import { getPosition, osmEmbedUrl, distanceKm } from "@/lib/geo";
import { Button } from "@/components/ui/button";

type Place = { id: string; name: string; kind: "police" | "hospital" | "open24"; lat: number; lng: number; km: number };

const KIND_META = {
  police: { label: "Police", icon: Landmark },
  hospital: { label: "Hospital", icon: Hospital },
  open24: { label: "Open 24h", icon: Fuel },
} as const;

const OVERPASS = "https://overpass-api.de/api/interpreter";

function buildQuery(lat: number, lng: number) {
  const r = 3000;
  return `[out:json][timeout:20];(
    node["amenity"="police"](around:${r},${lat},${lng});
    node["amenity"="hospital"](around:${r},${lat},${lng});
    node["opening_hours"="24/7"]["amenity"](around:${r},${lat},${lng});
  );out center 40;`;
}

function kindOf(tags: Record<string, string>): Place["kind"] {
  if (tags["amenity"] === "police") return "police";
  if (tags["amenity"] === "hospital") return "hospital";
  return "open24";
}

export function SafeSpacesMap() {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getPosition();
      if (p.lat === null || p.lng === null) {
        setError("Location permission is needed to find safe spaces near you.");
        return;
      }
      setCenter({ lat: p.lat, lng: p.lng });
      const res = await fetch(OVERPASS, { method: "POST", body: buildQuery(p.lat, p.lng) });
      if (!res.ok) throw new Error("Could not load nearby places right now.");
      const json = (await res.json()) as { elements: Array<{ id: number; lat: number; lon: number; tags?: Record<string, string> }> };
      const list = (json.elements ?? [])
        .filter((el) => el.lat && el.lon && el.tags?.["name"])
        .map((el) => ({
          id: String(el.id),
          name: el.tags?.["name"] ?? "Unnamed",
          kind: kindOf(el.tags ?? {}),
          lat: el.lat,
          lng: el.lon,
          km: distanceKm(p.lat as number, p.lng as number, el.lat, el.lon),
        }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 12);
      setPlaces(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load nearby places.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Nearby safe spaces</h2>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Police stations, hospitals and 24-hour places within 3 km of you.
      </p>

      {center && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <iframe
            title="Map of your current area"
            src={osmEmbedUrl(center.lat, center.lng)}
            className="h-56 w-full"
            loading="lazy"
          />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-muted-foreground">{error}</p>}
      {loading && <p className="mt-3 text-sm text-muted-foreground">Finding places near you…</p>}

      <ul className="mt-3 space-y-2">
        {places.map((p) => {
          const Icon = KIND_META[p.kind].icon;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl bg-accent/60 px-4 py-3">
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {KIND_META[p.kind].label} · {p.km < 1 ? `${Math.round(p.km * 1000)} m` : `${p.km.toFixed(1)} km`} away
                </p>
              </div>
              <a
                href={`https://www.openstreetmap.org/directions?to=${p.lat}%2C${p.lng}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Directions to ${p.name}`}
                className="rounded-full bg-primary p-2.5 text-primary-foreground"
              >
                <Navigation className="h-4 w-4" />
              </a>
            </li>
          );
        })}
        {!loading && !error && places.length === 0 && (
          <li className="text-sm text-muted-foreground">No mapped safe spaces found nearby.</li>
        )}
      </ul>
    </section>
  );
}