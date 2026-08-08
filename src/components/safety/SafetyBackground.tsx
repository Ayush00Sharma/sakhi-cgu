import { useEffect, useRef, useState } from "react";
import { ShieldQuestion, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCheckinSession } from "@/hooks/useCheckinSession";
import { useLiveShare } from "@/hooks/useLiveShare";
import { useLocationHistoryRecorder } from "@/hooks/useLocationHistory";
import { useRaiseAlert } from "@/hooks/useRaiseAlert";
import { useSafetySettings } from "@/hooks/useSafetySettings";

/**
 * Always-mounted worker inside the app shell: keeps live sharing streaming
 * across pages, records the location trail, and runs repeating check-ins.
 */
export function SafetyBackground() {
  const { settings, trackingPaused } = useSafetySettings();
  const { session, checkIn, stop, markEscalated } = useCheckinSession();
  const { raiseAlert, silent, tone } = useRaiseAlert();
  const [now, setNow] = useState(() => Date.now());
  const escalating = useRef(false);

  // Continuous position streaming for any active share (single watcher app-wide).
  useLiveShare({ watch: !trackingPaused });
  useLocationHistoryRecorder(settings.track_history && !trackingPaused);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const dueAt = session ? new Date(session.next_due_at).getTime() : null;
  const deadline = session && dueAt ? dueAt + session.grace_minutes * 60_000 : null;
  const isDue = dueAt !== null && now >= dueAt;
  const graceLeft = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;

  // Escalate when the grace period runs out with no check-in.
  useEffect(() => {
    if (!session || !deadline || escalating.current) return;
    if (now < deadline) return;
    escalating.current = true;
    raiseAlert.mutate(
      { type: "checkin_missed", message: "Safety check-in was missed." },
      {
        onSettled: () => {
          void markEscalated().finally(() => {
            escalating.current = false;
          });
        },
      },
    );
  }, [now, deadline, session, raiseAlert, markEscalated]);

  // Distinctive tone when a check-in prompt appears.
  const promptedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!session || !isDue) return;
    if (promptedFor.current === session.next_due_at) return;
    promptedFor.current = session.next_due_at;
    if (!silent && settings.alert_sound) tone.play(1);
  }, [session, isDue, silent, settings.alert_sound, tone]);

  if (!session) return null;

  const minutesToNext = dueAt ? Math.max(0, Math.ceil((dueAt - now) / 60_000)) : 0;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-4 pb-2">
      <div
        className={`mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
          isDue ? "border-destructive/50 bg-destructive/10" : "border-border bg-card/95"
        }`}
      >
        <ShieldQuestion className={`h-5 w-5 shrink-0 ${isDue ? "text-destructive" : "text-primary"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {isDue ? "Are you safe?" : "Safety check-ins running"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isDue
              ? `Alerting your contacts in ${String(Math.floor(graceLeft / 60)).padStart(2, "0")}:${String(graceLeft % 60).padStart(2, "0")}`
              : `Next check-in in ${minutesToNext} min · every ${session.interval_minutes} min`}
          </p>
        </div>
        <Button size="sm" className="h-11" onClick={() => void checkIn()}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> I'm safe
        </Button>
        <Button size="icon" variant="ghost" aria-label="Stop safety check-ins" onClick={() => void stop()}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
