import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/safety/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({
    meta: [
      { title: "Trusted Contacts — Sakhi" },
      { name: "description", content: "Manage the people Sakhi reaches for you in an emergency." },
      { property: "og:title", content: "Trusted Contacts — Sakhi" },
      { property: "og:description", content: "Add, prioritise and remove your emergency contacts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contacts,
});

function Contacts() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  const contacts = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trusted_contacts").select("*").order("priority");
      if (error) throw error;
      return data;
    },
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase.from("trusted_contacts").insert({
        user_id: userId,
        name,
        phone,
        relationship: relationship || null,
        priority: (contacts.data?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName(""); setPhone(""); setRelationship("");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact added to your circle.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add contact"),
  });

  const removeContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trusted_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Trusted contacts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        These are the people you can reach in one tap when something feels wrong.
      </p>

      <form
        className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5"
        onSubmit={(e) => { e.preventDefault(); addContact.mutate(); }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Name</Label>
          <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Meera" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Phone</Label>
            <Input id="c-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-rel">Relationship</Label>
            <Input id="c-rel" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Sister" />
          </div>
        </div>
        <Button type="submit" disabled={addContact.isPending} className="w-full sm:w-auto">
          <UserPlus className="mr-1.5 h-4 w-4" /> Add contact
        </Button>
      </form>

      <ul className="mt-6 space-y-2">
        {(contacts.data ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.relationship ?? "Contact"} · {c.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              {c.verified_at ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Unverified</span>
              )}
              <Button variant="ghost" size="icon" onClick={() => removeContact.mutate(c.id)} aria-label={`Remove ${c.name}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
        {(contacts.data ?? []).length === 0 && !contacts.isLoading && (
          <li className="text-sm text-muted-foreground">No contacts yet.</li>
        )}
      </ul>
    </AppShell>
  );
}
