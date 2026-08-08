import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CheckinSession = Tables<"checkin_sessions">;

export function useCheckinSession() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["checkin-session"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkin_sessions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CheckinSession | null;
    },
  });

  const session = query.data ?? null;

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["checkin-session"] }),
    [queryClient],
  );

  const start = useCallback(
    async (intervalMinutes: number, graceMinutes = 2) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not signed in");
      await supabase.from("checkin_sessions").update({ is_active: false }).eq("is_active", true);
      const { error } = await supabase.from("checkin_sessions").insert({
        user_id: userId,
        interval_minutes: intervalMinutes,
        grace_minutes: graceMinutes,
        next_due_at: new Date(Date.now() + intervalMinutes * 60_000).toISOString(),
      });
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const checkIn = useCallback(async () => {
    if (!session) return;
    const { error } = await supabase
      .from("checkin_sessions")
      .update({
        last_checkin_at: new Date().toISOString(),
        next_due_at: new Date(Date.now() + session.interval_minutes * 60_000).toISOString(),
        escalated_at: null,
      })
      .eq("id", session.id);
    if (error) throw error;
    await refresh();
  }, [session, refresh]);

  const markEscalated = useCallback(async () => {
    if (!session) return;
    await supabase
      .from("checkin_sessions")
      .update({
        escalated_at: new Date().toISOString(),
        next_due_at: new Date(Date.now() + session.interval_minutes * 60_000).toISOString(),
      })
      .eq("id", session.id);
    await refresh();
  }, [session, refresh]);

  const stop = useCallback(async () => {
    if (!session) return;
    await supabase.from("checkin_sessions").update({ is_active: false }).eq("id", session.id);
    await refresh();
  }, [session, refresh]);

  return { session, isLoading: query.isLoading, start, checkIn, stop, markEscalated, refresh };
}
