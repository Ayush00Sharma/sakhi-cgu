import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { distanceKm } from "@/lib/geo";
import type { Tables } from "@/integrations/supabase/types";

export type LocationPoint = Tables<"location_history">;

const RECORD_EVERY_MS = 2 * 60 * 1000; // sample at most every 2 minutes
const MIN_MOVE_KM = 0.05; // ~50 m of movement before a new point is stored

/** Background recorder: stores a location point periodically while the app is open. */
export function useLocationHistoryRecorder(enabled: boolean) {
  const last = useRef<{ lat: number; lng: number; at: number } | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) return;

    async function record() {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const now = Date.now();
          const prev = last.current;
          if (prev && now - prev.at < RECORD_EVERY_MS) return;
          if (prev && distanceKm(prev.lat, prev.lng, latitude, longitude) < MIN_MOVE_KM) {
            last.current = { lat: latitude, lng: longitude, at: now };
            return;
          }
          last.current = { lat: latitude, lng: longitude, at: now };
          void supabase.from("location_history").insert({
            user_id: userId,
            latitude,
            longitude,
            accuracy,
          });
        },
        () => undefined,
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 },
      );
    }

    void record();
    const id = setInterval(() => void record(), RECORD_EVERY_MS);
    return () => clearInterval(id);
  }, [enabled]);
}

/** Read the last 10 days of recorded points, newest first. */
export function useLocationHistory() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["location-history"],
    queryFn: async () => {
      const since = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("location_history")
        .select("*")
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data as LocationPoint[];
    },
  });

  const clear = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase.from("location_history").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["location-history"] }),
  });

  return { points: query.data ?? [], isLoading: query.isLoading, clear };
}
