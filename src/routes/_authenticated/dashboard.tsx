import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Siren, MapPin, Timer, PhoneCall, CheckCircle2, X, ShieldAlert, Mic, PhoneIncoming } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/safety/AppShell";
import { Button } from "@/components/ui/button";
import { FakeCall } from "@/components/safety/FakeCall";
import { LiveShareCard } from "@/components/safety/LiveShareCard";
import { SafeSpacesMap } from "@/components/safety/SafeSpacesMap";
import { IncidentReportForm } from "@/components/safety/IncidentReportForm";
import { SafetySettingsCard } from "@/components/safety/SafetySettingsCard";
import { useSafetySettings } from "@/hooks/useSafetySettings";
import { useLiveShare } from "@/hooks/useLiveShare";
import { useSosRecorder } from "@/hooks/useSosRecorder";
import { getPosition } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Safety Dashboard — Sakhi" },
      { name: "description", content: "Trigger an SOS alert, start a safe-arrival timer and reach your trusted contacts." },
      { property: "og:title", content: "Safety Dashboard — Sakhi" },
      { property: "og:description", content: "Your SOS button, check-in timer and emergency helplines in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const HELPLINES = [
  { label: "Police", number: "112" },
  { label: "Women's helpline", number: "1091" },
  { label: "Domestic abuse", number: "181" },
];

function Dashboard() {
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(15);
  const [remaining, setRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fakeCallOpen, setFakeCallOpen] = useState(false);

  const { settings } = useSafetySettings();
  const liveShare = useLiveShare();
  const recorder = useSosRecorder();
  const silent = settings.silent_mode;

  function notify(message: string, kind: "success" | "error" = "success") {
    if (silent) return;
    if (kind === "error") toast.error(message);
    else toast.success(message);
  }

  const contacts = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trusted_contacts")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const alerts = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const raiseAlert = useMutation({
    mutationFn: async ({ type, message }: { type: string; message: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { lat, lng } = await getPosition();
      const isEmergency = type === "sos" || type === "checkin_missed";

      let shareId: string | null = null;
      if (isEmergency && settings.auto_share_location) {
        try {
          const created = await liveShare.startShare("sos");
          shareId = created?.id ?? null;
        } catch {
          shareId = null;
        }
      }

      const { data: alert, error } = await supabase
        .from("safety_alerts")
        .insert({
          user_id: userId,
          alert_type: type,
          message,
          latitude: lat,
          longitude: lng,
          share_id: shareId,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (isEmergency && settings.auto_record && recorder.state !== "recording") {
        void recorder.start(alert.id);
      }
      return { lat, lng };
    },
    onSuccess: ({ lat }) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      notify(lat ? "Alert raised with your location." : "Alert raised (location unavailable).");
    },
    onError: (e) => notify(e instanceof Error ? e.message : "Could not raise the alert", "error"),
  });

  const resolveAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("safety_alerts").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      setRemaining(null);
      raiseAlert.mutate({ type: "checkin_missed", message: "Safe-arrival check-in was missed." });
      return;
    }
    timerRef.current = setInterval(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const activeAlerts = (alerts.data ?? []).filter((a) => a.is_active);
  const verifiedContacts = (contacts.data ?? []).filter((c) => c.verified_at);
  const needsSetup = !contacts.isLoading && verifiedContacts.length === 0;

  return (
    <AppShell>
      <FakeCall
        open={fakeCallOpen}
        callerName={settings.fake_caller_name}
        photoUrl={settings.fake_caller_photo_url}
        onClose={() => setFakeCallOpen(false)}
      />

      <button
        onClick={() => setFakeCallOpen(true)}
        aria-label="Trigger a fake incoming call"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95"
      >
        <PhoneIncoming className="h-6 w-6" />
      </button>

      {recorder.state === "recording" && !silent && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <span className="flex h-3 w-3 animate-pulse rounded-full bg-destructive" />
          <Mic className="h-4 w-4 text-destructive" />
          <p className="flex-1 text-sm font-medium">
            Recording audio · {String(Math.floor(recorder.seconds / 60)).padStart(2, "0")}:
            {String(recorder.seconds % 60).padStart(2, "0")}
          </p>
          <Button size="sm" variant="outline" onClick={recorder.stop}>Stop &amp; save</Button>
        </div>
      )}
      {recorder.state === "uploading" && !silent && (
        <p className="mb-4 text-sm text-muted-foreground">Saving your recording…</p>
      )}
      {recorder.state === "denied" && !silent && (
        <p className="mb-4 text-sm text-muted-foreground">
          Microphone access was blocked, so auto-recording is off for this alert.
        </p>
      )}

      {needsSetup && (
        <section className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <ShieldAlert className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-40 flex-1">
            <p className="text-sm font-medium">Finish setting up SOS</p>
            <p className="text-xs text-muted-foreground">
              Add and verify at least one trusted contact so your alerts actually reach someone.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/onboarding">Start setup</Link>
          </Button>
        </section>
      )}
      <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-muted-foreground">In danger? Hold nothing back.</p>
        <button
          onClick={() => raiseAlert.mutate({ type: "sos", message: "Emergency SOS triggered." })}
          disabled={raiseAlert.isPending}
          className="mx-auto mt-4 flex h-40 w-40 flex-col items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xl transition-transform active:scale-95 disabled:opacity-70"
        >
          <Siren className="h-10 w-10" />
          <span className="mt-2 text-2xl font-bold tracking-wide">SOS</span>
        </button>
        <p className="mt-4 text-xs text-muted-foreground">
          Sends an alert with your current location to your safety log and shows your trusted circle below.
        </p>
      </section>

      {activeAlerts.length > 0 && (
        <section className="mt-6 space-y-2">
          {activeAlerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
              <div>
                <p className="text-sm font-medium capitalize">{a.alert_type.replace("_", " ")} active</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                  {a.latitude ? ` · ${a.latitude.toFixed(4)}, ${a.longitude?.toFixed(4)}` : ""}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => resolveAlert.mutate(a.id)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> I'm safe
              </Button>
            </div>
          ))}
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Safe-arrival timer</h2>
        </div>
        {remaining === null ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a countdown before you travel. If you don't check in, an alert is logged automatically.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {[10, 15, 30, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${m === minutes ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  {m}m
                </button>
              ))}
              <Button
                className="ml-auto h-12"
                onClick={() => {
                  setRemaining(minutes * 60);
                  if (settings.auto_share_location) void liveShare.startShare("checkin");
                }}
              >
                Start
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-3xl font-semibold tabular-nums">
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRemaining(null)}><X className="mr-1.5 h-4 w-4" />Cancel</Button>
              <Button
                onClick={() => {
                  setRemaining(null);
                  void liveShare.stopShare();
                  raiseAlert.mutate({ type: "safe_arrival", message: "Checked in safely." });
                }}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> I arrived
              </Button>
            </div>
          </div>
        )}
      </section>

      <LiveShareCard
        share={liveShare.share}
        busy={liveShare.busy}
        onStart={() => void liveShare.startShare("manual")}
        onStop={() => void liveShare.stopShare()}
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Your trusted circle</h2>
        {contacts.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : (contacts.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No contacts yet — add them from the Contacts tab so you can reach them in one tap.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(contacts.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-accent/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.relationship ?? "Contact"} · {c.phone}</p>
                </div>
                <a href={`tel:${c.phone}`} className="rounded-full bg-primary p-2 text-primary-foreground">
                  <PhoneCall className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Emergency helplines</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {HELPLINES.map((h) => (
            <a key={h.number} href={`tel:${h.number}`} className="rounded-xl border border-border px-4 py-3 text-center">
              <p className="text-sm font-medium">{h.label}</p>
              <p className="text-lg font-semibold text-primary">{h.number}</p>
            </a>
          ))}
        </div>
      </section>

      <SafeSpacesMap />

      <IncidentReportForm />

      <SafetySettingsCard />

      <section className="mt-6">
        <h2 className="font-semibold">Recent activity</h2>
        <ul className="mt-3 space-y-2">
          {(alerts.data ?? []).map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-xl border border-border px-4 py-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm capitalize">{a.alert_type.replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
              </div>
            </li>
          ))}
          {(alerts.data ?? []).length === 0 && !alerts.isLoading && (
            <li className="text-sm text-muted-foreground">Nothing logged yet.</li>
          )}
        </ul>
      </section>
    </AppShell>
  );
}
