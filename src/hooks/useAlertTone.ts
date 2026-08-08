import { useCallback, useEffect, useRef } from "react";

/**
 * A distinctive two-tone rising siren, deliberately different from ordinary
 * notification sounds so an incoming Sakhi emergency is instantly recognisable.
 */
export function useAlertTone() {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  useEffect(() => () => stopRef.current?.(), []);

  const play = useCallback(
    (cycles = 4) => {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      stopRef.current?.();

      const ctx = ctxRef.current ?? new AudioCtx();
      ctxRef.current = ctx;
      void ctx.resume();

      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.connect(gain);

      const start = ctx.currentTime;
      const cycle = 0.9;
      for (let i = 0; i < cycles; i += 1) {
        const t = start + i * cycle;
        osc.frequency.setValueAtTime(620, t);
        osc.frequency.exponentialRampToValueAtTime(1180, t + 0.45);
        osc.frequency.exponentialRampToValueAtTime(620, t + 0.85);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.22, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.86);
      }

      const end = start + cycles * cycle;
      osc.start(start);
      osc.stop(end);

      stopRef.current = () => {
        try {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          osc.stop();
        } catch {
          /* already stopped */
        }
      };
    },
    [],
  );

  return { play, stop };
}
