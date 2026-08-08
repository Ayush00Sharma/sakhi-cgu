import { Lock, MapPinOff, Play, ShieldCheck } from "lucide-react";

import { useSafetySettings } from "@/hooks/useSafetySettings";
import { Button } from "@/components/ui/button";

const PAUSE_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "8 hours", minutes: 8 * 60 },
  { label: "Until I resume", minutes: 365 * 24 * 60 },
];

export function PrivacyControlsCard() {
  const { settings, trackingPaused, update } = useSafetySettings();

  const pausedUntil = settings.tracking_paused_until ? new Date(settings.tracking_paused_until) : null;
  const indefinite = pausedUntil ? pausedUntil.getTime() - Date.now() > 30 * 24 * 60 * 60 * 1000 : false;

  function pause(minutes: number) {
    update.mutate({ tracking_paused_until: new Date(Date.now() + minutes * 60_000).toISOString() });
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Privacy controls</h2>
      </div>

      <div className="mt-4 rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <MapPinOff className={`mt-0.5 h-5 w-5 ${trackingPaused ? "text-destructive" : "text-muted-foreground"}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Continuous location tracking</p>
            <p className="text-xs text-muted-foreground">
              {trackingPaused
                ? indefinite
                  ? "Paused — no location trail is recorded and live shares stop updating until you resume."
                  : `Paused until ${pausedUntil?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
                : "Active — your trail is recorded and any live share keeps updating."}
            </p>
          </div>
        </div>

        {trackingPaused ? (
          <Button
            size="lg"
            className="mt-4 h-12 w-full"
            onClick={() => update.mutate({ tracking_paused_until: null })}
          >
            <Play className="mr-1.5 h-4 w-4" /> Resume tracking
          </Button>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {PAUSE_OPTIONS.map((o) => (
              <Button key={o.minutes} size="sm" variant="outline" className="h-10" onClick={() => pause(o.minutes)}>
                Pause {o.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Location sharing on SOS</p>
            <p className="text-xs text-muted-foreground">
              Choose whether a live location link opens the moment an SOS fires, or only after you confirm it.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            { key: false, title: "Start automatically", body: "Fastest — the link opens with the alert." },
            { key: true, title: "Ask me first", body: "SOS still fires; sharing waits for one tap." },
          ].map((opt) => {
            const active = settings.confirm_share_on_sos === opt.key;
            return (
              <button
                key={String(opt.key)}
                onClick={() => update.mutate({ confirm_share_on_sos: opt.key })}
                aria-pressed={active}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  active ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
                }`}
              >
                <p className="text-sm font-medium">{opt.title}</p>
                <p className="text-xs text-muted-foreground">{opt.body}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
