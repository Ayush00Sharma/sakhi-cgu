import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type LocationShare = Tables<"location_shares">;

const PING_MS = 5000;

export function shareUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/share/${token}`;
}

/**
 * Live location sharing. Pass `{ watch: true }` in exactly one place (the
 * global background worker) so position streaming continues across pages
 * without duplicating geolocation watchers.
 */
export function useLiveShare(options: { watch?: boolean } = {}) {
  const { watch = false } = options;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  const activeShare = useQuery({
    queryKey: ["active-share"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_shares")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LocationShare | null;
    },
  });

  const share = activeShare.data ?? null;
  const shareId = share?.id ?? null;

  // Stream the device position into the share row while it is active.
  useEffect(() => {
    if (!watch || !shareId || typeof navigator === "undefined" || !navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent.current < PING_MS) return;
        lastSent.current = now;
        void supabase
          .from("location_shares")
          .update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            last_ping_at: new Date().toISOString(),
          })
          .eq("id", shareId);
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [shareId, watch]);

  const startShare = useCallback(
    async (reason: string, opts: { label?: string; alert?: boolean } = {}) => {
      setBusy(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Not signed in");
        if (share) {
          if (opts.alert && !share.alert_active) {
            await supabase.from("location_shares").update({ alert_active: true }).eq("id", share.id);
            await queryClient.invalidateQueries({ queryKey: ["active-share"] });
          }
          return share;
        }
        const { data, error } = await supabase
          .from("location_shares")
          .insert({
            user_id: userId,
            reason,
            label: opts.label ?? null,
            alert_active: opts.alert ?? false,
          })
          .select("*")
          .single();
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["active-share"] });
        return data as LocationShare;
      } finally {
        setBusy(false);
      }
    },
    [queryClient, share],
  );

  const stopShare = useCallback(async () => {
    if (!shareId) return;
    setBusy(true);
    try {
      await supabase
        .from("location_shares")
        .update({ is_active: false, alert_active: false })
        .eq("id", shareId);
      await queryClient.invalidateQueries({ queryKey: ["active-share"] });
    } finally {
      setBusy(false);
    }
  }, [queryClient, shareId]);

  return { share, isLoading: activeShare.isLoading, busy, startShare, stopShare };
}
