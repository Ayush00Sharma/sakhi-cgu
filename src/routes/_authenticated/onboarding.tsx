import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, UserPlus, Send, CheckCircle2, MapPin, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/safety/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your safety circle — Sakhi" },
      { name: "description", content: "A guided walkthrough to add and verify your trusted contacts before you rely on SOS." },
      { property: "og:title", content: "Set up your safety circle — Sakhi" },
      { property: "og:description", content: "Add trusted contacts, send them a test alert and verify they received it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Welcome", "Add contacts", "Verify", "Ready"];

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [locationOk, setLocationOk] = useState<boolean | null>(null);
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

  const list = contacts.data ?? [];
  const verifiedCount = list.filter((c) => c.verified_at).length;

  const addContact = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase.from("trusted_contacts").insert({
        user_id: userId,
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim() || null,
        priority: list.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName(""); setPhone(""); setRelationship("");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact added.");
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

  const markSent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trusted_contacts")
        .update({ verification_sent_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const setVerified = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("trusted_contacts")
        .update({ verified_at: value ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const finish = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setLocationOk(false); return; }
    navigator.geolocation.getCurrentPosition(
      () => { setLocationOk(true); toast.success("Location access granted."); },
      () => { setLocationOk(false); toast.error("Location blocked — SOS will still work without coordinates."); },
      { timeout: 8000 },
    );
  }

  function smsLink(phoneNumber: string) {
    const body = encodeURIComponent(
      "Hi! I've added you as a trusted contact on Sakhi, my personal safety app. If I ever send an SOS, you'll be one of the first people I reach. Please reply OK so I know this number works.",
    );
    return `sms:${phoneNumber}?&body=${body}`;
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Set up your safety circle</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Four quick steps so SOS actually reaches someone when it matters.
      </p>

      <ol className="mt-5 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
            <span className={`text-[11px] ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">How Sakhi protects you</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>· One tap on SOS logs an emergency alert with your location.</li>
            <li>· Your trusted circle is who you call first — one tap each.</li>
            <li>· A safe-arrival timer raises an alert if you don't check in.</li>
          </ul>
          <div className="rounded-xl bg-accent/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" /> Allow location
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Alerts are far more useful with coordinates attached.
            </p>
            <Button size="sm" variant={locationOk ? "outline" : "default"} className="mt-3" onClick={requestLocation}>
              {locationOk === true ? "Location enabled" : locationOk === false ? "Try again" : "Enable location"}
            </Button>
          </div>
          <Button className="w-full" onClick={() => setStep(1)}>
            Continue <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </section>
      )}

      {step === 1 && (
        <section className="mt-6 space-y-4">
          <form
            className="space-y-4 rounded-2xl border border-border bg-card p-5"
            onSubmit={(e) => { e.preventDefault(); addContact.mutate(); }}
          >
            <h2 className="font-semibold">Add at least one trusted contact</h2>
            <div className="space-y-1.5">
              <Label htmlFor="o-name">Name</Label>
              <Input id="o-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Meera" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="o-phone">Phone</Label>
                <Input id="o-phone" required maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-rel">Relationship</Label>
                <Input id="o-rel" maxLength={50} value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Sister" />
              </div>
            </div>
            <Button type="submit" disabled={addContact.isPending} className="w-full sm:w-auto">
              <UserPlus className="mr-1.5 h-4 w-4" /> Add contact
            </Button>
          </form>

          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.relationship ?? "Contact"} · {c.phone}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeContact.mutate(c.id)} aria-label={`Remove ${c.name}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
            <Button className="flex-1" disabled={list.length === 0} onClick={() => setStep(2)}>
              {list.length === 0 ? "Add a contact to continue" : "Verify them"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Verify each contact</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a test message, then mark them verified once they confirm they got it. Unverified numbers are the
              number one reason SOS alerts go nowhere.
            </p>
          </div>

          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="rounded-xl border border-border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  {c.verified_at ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {c.verification_sent_at ? "Test sent" : "Not verified"}
                    </span>
                  )}
                </div>
                {!c.verified_at && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" onClick={() => markSent.mutate(c.id)}>
                      <a href={smsLink(c.phone)}><Send className="mr-1.5 h-4 w-4" /> Send test message</a>
                    </Button>
                    <Button size="sm" onClick={() => setVerified.mutate({ id: c.id, value: true })}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> They confirmed
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
            <Button className="flex-1" disabled={verifiedCount === 0} onClick={() => setStep(3)}>
              {verifiedCount === 0 ? "Verify at least one contact" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h2 className="text-lg font-semibold">You're ready</h2>
          <p className="text-sm text-muted-foreground">
            {verifiedCount} of {list.length} contact{list.length === 1 ? "" : "s"} verified. SOS is now safe to rely on —
            you can add more people any time from Contacts.
          </p>
          <Button className="w-full" disabled={finish.isPending} onClick={() => finish.mutate()}>
            Go to my safety dashboard
          </Button>
        </section>
      )}
    </AppShell>
  );
}
