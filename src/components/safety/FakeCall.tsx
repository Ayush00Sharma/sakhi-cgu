import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, Mic, MessageSquare, User } from "lucide-react";

type Props = {
  open: boolean;
  callerName: string;
  photoUrl?: string | null;
  onClose: () => void;
};

function useRingtone(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    let stopped = false;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    ctxRef.current = ctx;
    const ring = () => {
      if (stopped) return;
      [0, 0.4].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 480;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.4);
      });
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([400, 200, 400]);
    };
    ring();
    const id = setInterval(ring, 2500);
    return () => {
      stopped = true;
      clearInterval(id);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(0);
      void ctx.close();
    };
  }, [active]);
}

export function FakeCall({ open, callerName, photoUrl, onClose }: Props) {
  const [answered, setAnswered] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useRingtone(open && !answered);

  useEffect(() => {
    if (!open) { setAnswered(false); setElapsed(0); return; }
    if (!answered) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [open, answered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-foreground px-6 py-14 text-background">
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-background/70">{answered ? "Ongoing call" : "Incoming call"}</p>
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-background/15">
          {photoUrl ? (
            <img src={photoUrl} alt={`${callerName} calling`} className="h-full w-full object-cover" />
          ) : (
            <User className="h-12 w-12 text-background/80" />
          )}
        </div>
        <h2 className="text-3xl font-semibold tracking-tight">{callerName}</h2>
        <p className="text-sm tabular-nums text-background/70">
          {answered
            ? `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`
            : "mobile"}
        </p>
      </div>

      {answered && (
        <div className="flex gap-10 text-background/70">
          <div className="flex flex-col items-center gap-1 text-xs"><Mic className="h-6 w-6" />mute</div>
          <div className="flex flex-col items-center gap-1 text-xs"><Video className="h-6 w-6" />video</div>
          <div className="flex flex-col items-center gap-1 text-xs"><MessageSquare className="h-6 w-6" />message</div>
        </div>
      )}

      <div className="flex w-full max-w-xs items-center justify-around">
        <button
          onClick={onClose}
          aria-label="Decline call"
          className="flex h-18 w-18 flex-col items-center justify-center gap-1 rounded-full bg-destructive p-5 text-destructive-foreground shadow-xl active:scale-95"
        >
          <PhoneOff className="h-7 w-7" />
        </button>
        {!answered && (
          <button
            onClick={() => setAnswered(true)}
            aria-label="Answer call"
            className="flex flex-col items-center justify-center rounded-full bg-emerald-500 p-5 text-white shadow-xl active:scale-95"
          >
            <Phone className="h-7 w-7" />
          </button>
        )}
      </div>
    </div>
  );
}