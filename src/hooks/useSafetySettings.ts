import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type SafetySettings = Tables<"safety_settings">;

export const DEFAULT_SETTINGS = {
  silent_mode: false,
  auto_record: true,
  auto_share_location: true,
  fake_caller_name: "Mom",
  fake_caller_photo_url: null as string | null,
  fake_call_delay_seconds: 5,
  alert_sound: true,
  track_history: true,
};

export function useSafetySettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["safety-settings"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await supabase.from("safety_settings").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (data) return data;
      const { data: created, error: insertError } = await supabase
        .from("safety_settings")
        .insert({ user_id: userId })
        .select("*")
        .single();
      if (insertError) throw insertError;
      return created;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: TablesUpdate<"safety_settings">) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase.from("safety_settings").update(patch).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["safety-settings"] }),
  });

  const settings = { ...DEFAULT_SETTINGS, ...(query.data ?? {}) };

  return { settings, isLoading: query.isLoading, update };
}