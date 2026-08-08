import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Siren, MapPin, Timer, PhoneCall, CheckCircle2, X, ShieldAlert, Mic, PhoneIncoming, MessageSquare } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/safety/AppShell";
import { Button } from "@/components/ui/button";
import { FakeCall } from "@/components/safety/FakeCall";
import { LiveShareCard } from "@/components/safety/LiveShareCard";
import { SafeSpacesMap } from "@/components/safety/SafeSpacesMap";
import { IncidentReportForm } from "@/components/safety/IncidentReportForm";
import { SafetySettingsCard } from "@/components/safety/SafetySettingsCard";
import { PrivacyControlsCard } from "@/components/safety/PrivacyControlsCard";
import { useSafetySettings } from "@/hooks/useSafetySettings";
import { useLiveShare } from "@/hooks/useLiveShare";
import { useSosRecorder } from "@/hooks/useSosRecorder";
import { useCheckinSession } from "@/hooks/useCheckinSession";
import { useRaiseAlert } from "@/hooks/useRaiseAlert";

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
  const [fakeCallOpen, setFakeCallOpen] = useState(false);

  const { settings, trackingPaused } = useSafetySettings();
  const liveShare = useLiveShare();
  const recorder = useSosRecorder();
  const checkin = useCheckinSession();
  const { raiseAlert, silent } = useRaiseAlert();

  function triggerSos() {
    raiseAlert.mutate({
      type: "sos",
      message: "Emergency SOS triggered.",
      onAlertCreated: (alertId) => {
        if (settings.auto_record && recorder.state !== "recording") void recorder.start(alertId);
      },
    });
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

  const deliveries = useQuery({
    queryKey: ["alert-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_deliveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("safety_alerts").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

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
          onClick={triggerSos}
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
          <h2 className="font-semibold">Repeating safety check-ins</h2>
        </div>
        {!checkin.session ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Sakhi will ask "are you safe?" at the interval you pick, over and over. Miss one and your trusted
              contacts are alerted automatically.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {[5, 10, 15, 30].map((m) => (
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
                  void checkin.start(minutes);
                  if (settings.auto_share_location && !settings.confirm_share_on_sos && !trackingPaused)
                    void liveShare.startShare("checkin");
                }}
              >
                Start
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              Checking in every {checkin.session.interval_minutes} minutes · {checkin.session.grace_minutes} min grace.
              Next prompt {new Date(checkin.session.next_due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
            </p>
            <div className="mt-4 flex gap-2">
              <Button className="h-12 flex-1" onClick={() => void checkin.checkIn()}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> I'm safe
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => {
                  void checkin.stop();
                  void liveShare.stopShare();
                  raiseAlert.mutate({ type: "safe_arrival", message: "Checked in safely — journey ended." });
                }}
              >
                <X className="mr-1.5 h-4 w-4" /> End journey
              </Button>
            </div>
          </div>
        )}
      </section>

      {(deliveries.data ?? []).length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Alert messages sent</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {(deliveries.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-xl bg-accent/50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.contact_name ?? d.phone}</p>
                  <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</p>
                </div>
                <span
                  className={`text-xs font-medium ${d.status === "sent" ? "text-primary" : "text-muted-foreground"}`}
                >
                  {d.status === "sent" ? "Delivered" : d.status === "skipped" ? "SMS not set up" : "Failed"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      <PrivacyControlsCard />

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
