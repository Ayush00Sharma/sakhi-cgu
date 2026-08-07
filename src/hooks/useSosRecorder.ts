import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RecorderState = "idle" | "recording" | "uploading" | "saved" | "denied";

export function useSosRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertId = useRef<string | null>(null);

  const start = useCallback(async (linkedAlertId?: string | null) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      alertId.current = linkedAlertId ?? null;
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (ticker.current) clearInterval(ticker.current);
        setState("uploading");
        try {
          const blob = new Blob(chunks.current, { type: "audio/webm" });
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id;
          if (!userId) throw new Error("Not signed in");
          const path = `${userId}/${Date.now()}.webm`;
          const { error } = await supabase.storage.from("incident-evidence").upload(path, blob, {
            contentType: "audio/webm",
          });
          if (error) throw error;
          if (alertId.current) {
            await supabase
              .from("safety_alerts")
              .update({ has_recording: true, recording_path: path })
              .eq("id", alertId.current);
          }
          setState("saved");
        } catch {
          setState("idle");
        }
      };
      mr.start();
      recorder.current = mr;
      setSeconds(0);
      setState("recording");
      ticker.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return true;
    } catch {
      setState("denied");
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    recorder.current = null;
  }, []);

  return { state, seconds, start, stop };
}