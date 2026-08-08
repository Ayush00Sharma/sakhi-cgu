import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Trash2, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/safety/AppShell";
import { Button } from "@/components/ui/button";
import { useLocationHistory } from "@/hooks/useLocationHistory";
import { useSafetySettings } from "@/hooks/useSafetySettings";
import { Switch } from "@/components/ui/switch";
import { osmEmbedUrl } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Location History — Sakhi" },
      { name: "description", content: "See where you've been over the last 10 days, day by day, on a private map trail." },
      { property: "og:title", content: "Location History — Sakhi" },
      { property: "og:description", content: "A private 10-day record of your movements, deleted automatically after 10 days." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function HistoryPage() {
  const { points, isLoading, clear } = useLocationHistory();
  const { settings, update } = useSafetySettings();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const days = useMemo(() => {
    const map = new Map<string, typeof points>();
    for (const p of points) {
      const key = dayKey(p.recorded_at);
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [points]);

  const activeDay = selectedDay ?? days[0]?.[0] ?? null;
  const dayPoints = days.find(([d]) => d === activeDay)?.[1] ?? [];
  const latest = dayPoints[0];

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Location history</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A private record of where you've been. Only you can see it, and anything older than 10 days is deleted
        automatically.
      </p>

      <section className="mt-5 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Record my location trail</p>
          <p className="text-xs text-muted-foreground">
            Saves a point every few minutes while Sakhi is open and you're moving.
          </p>
        </div>
        <Switch
          checked={settings.track_history}
          aria-label="Record my location trail"
          onCheckedChange={(checked) => update.mutate({ track_history: checked })}
        />
      </section>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading your trail…</p>
      ) : days.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Nothing recorded yet. Keep Sakhi open while you travel and your last 10 days will appear here.
        </p>
      ) : (
        <>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {days.map(([day, list]) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
                  day === activeDay ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                <span className="ml-1.5 text-xs opacity-70">{list.length}</span>
              </button>
            ))}
          </div>

          {latest && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <iframe
                title="Location history map"
                src={osmEmbedUrl(latest.latitude, latest.longitude)}
                className="h-80 w-full"
              />
            </div>
          )}

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <RouteIcon className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Timeline</h2>
            </div>
            <ul className="mt-3 space-y-2">
              {dayPoints.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-accent/50 px-4 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm tabular-nums">
                      {new Date(p.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                      {p.accuracy ? ` · ±${Math.round(p.accuracy)}m` : ""}
                    </p>
                  </div>
                  <a
                    className="text-xs text-primary underline"
                    href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Map
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <Button
            variant="outline"
            className="mt-5 w-full"
            disabled={clear.isPending}
            onClick={() => {
              clear.mutate(undefined, { onSuccess: () => toast.success("Location history deleted.") });
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete my history
          </Button>
        </>
      )}
    </AppShell>
  );
}
