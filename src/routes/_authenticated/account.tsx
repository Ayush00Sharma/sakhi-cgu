import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { UserRound, Save } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/safety/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your Account — Sakhi" },
      { name: "description", content: "Manage the name and phone number Sakhi shares with your trusted contacts during an alert." },
      { property: "og:title", content: "Your Account — Sakhi" },
      { property: "og:description", content: "Keep your Sakhi account details up to date so contacts know who to call." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const account = useQuery({
    queryKey: ["account"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, phone, created_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return { email: user.email ?? "", id: user.id, profile };
    },
  });

  useEffect(() => {
    if (!account.data?.profile) return;
    setDisplayName(account.data.profile.display_name ?? "");
    setPhone(account.data.profile.phone ?? "");
  }, [account.data]);

  const save = useMutation({
    mutationFn: async () => {
      const id = account.data?.id;
      if (!id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null, phone: phone.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account details saved.");
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your details"),
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        These details are included in your SOS messages and on your live-location link, so contacts know who
        needs help and can call you back.
      </p>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Profile</h2>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="display-name">Your name</Label>
            <Input
              id="display-name"
              className="mt-1.5 h-12"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Ananya"
            />
          </div>
          <div>
            <Label htmlFor="phone">Your phone number</Label>
            <Input
              id="phone"
              type="tel"
              className="mt-1.5 h-12"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <Label>Email</Label>
            <p className="mt-1.5 rounded-xl bg-accent/60 px-4 py-3 text-sm">
              {account.data?.email ?? "…"}
            </p>
          </div>
          {account.data?.profile?.created_at && (
            <p className="text-xs text-muted-foreground">
              Member since {new Date(account.data.profile.created_at).toLocaleDateString()}
            </p>
          )}
          <Button className="h-12 w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            <Save className="mr-1.5 h-4 w-4" /> {save.isPending ? "Saving…" : "Save details"}
          </Button>
        </div>
      </section>
    </AppShell>
  );
}