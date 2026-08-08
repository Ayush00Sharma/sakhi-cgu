import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getPosition } from "@/lib/geo";
import { notifyContactsOfAlert } from "@/lib/sms.functions";
import { useLiveShare, shareUrl } from "@/hooks/useLiveShare";
import { useSafetySettings } from "@/hooks/useSafetySettings";
import { useAlertTone } from "@/hooks/useAlertTone";

export type RaiseAlertInput = { type: string; message: string; onAlertCreated?: (alertId: string) => void };

/** Shared emergency pipeline: location → live share → alert row → SMS fan-out → alert tone. */
export function useRaiseAlert() {
  const queryClient = useQueryClient();
  const { settings } = useSafetySettings();
  const liveShare = useLiveShare();
  const tone = useAlertTone();
  const notify = useServerFn(notifyContactsOfAlert);

  const silent = settings.silent_mode;

  function say(message: string, kind: "success" | "error" = "success") {
    if (silent) return;
    if (kind === "error") toast.error(message);
    else toast.success(message);
  }

  const mutation = useMutation({
    mutationFn: async ({ type, message, onAlertCreated }: RaiseAlertInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { lat, lng } = await getPosition();
      const isEmergency = type === "sos" || type === "checkin_missed";

      let shareId: string | null = null;
      let link: string | null = null;
      if (isEmergency && settings.auto_share_location) {
        try {
          const created = await liveShare.startShare(type === "sos" ? "sos" : "checkin", { alert: true });
          shareId = created?.id ?? null;
          link = created?.token ? shareUrl(created.token) : null;
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

      onAlertCreated?.(alert.id);

      let sms: { configured: boolean; sent: number; failed: number } | null = null;
      if (isEmergency) {
        if (!silent && settings.alert_sound) tone.play(5);
        try {
          sms = await notify({
            data: { alertId: alert.id, alertType: type, link, lat, lng },
          });
        } catch {
          sms = null;
        }
      }

      return { lat, sms };
    },
    onSuccess: ({ lat, sms }) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-deliveries"] });
      if (sms && !sms.configured) {
        say("Alert logged, but text messages aren't set up yet.", "error");
      } else if (sms) {
        say(`Alert raised · ${sms.sent} contact${sms.sent === 1 ? "" : "s"} texted${sms.failed ? `, ${sms.failed} failed` : ""}.`);
      } else {
        say(lat ? "Alert raised with your location." : "Alert raised (location unavailable).");
      }
    },
    onError: (e) => say(e instanceof Error ? e.message : "Could not raise the alert", "error"),
  });

  return { raiseAlert: mutation, silent, tone };
}
