import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MapPin, ShieldQuestion, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getPosition } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "harassment", label: "Harassment" },
  { value: "stalking", label: "Stalking / being followed" },
  { value: "poor_lighting", label: "Poor lighting" },
  { value: "unsafe_crowd", label: "Unsafe crowd or loitering" },
  { value: "no_transport", label: "No safe transport" },
  { value: "other", label: "Something else" },
];

export function IncidentReportForm() {
  const [category, setCategory] = useState("harassment");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; accuracy?: number | null }>({
    lat: null,
    lng: null,
  });
  const [tagging, setTagging] = useState(false);

  async function tagLocation() {
    setTagging(true);
    const p = await getPosition();
    setTagging(false);
    setCoords(p);
    if (p.lat === null) toast.error("Location unavailable — you can still report without it.");
  }

  const submit = useMutation({
    mutationFn: async () => {
      const point = coords.lat === null ? await getPosition() : coords;
      const { error } = await supabase.from("incident_reports").insert({
        category,
        notes: notes.trim() || null,
        latitude: point.lat,
        longitude: point.lng,
        accuracy: point.accuracy ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNotes("");
      toast.success("Report submitted anonymously. Thank you.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit the report"),
  });

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <ShieldQuestion className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Report an unsafe spot</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Reports are anonymous — they are never linked back to your account.
      </p>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="incident-category">What happened?</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="incident-category" className="h-12">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="incident-notes">Notes (optional)</Label>
          <Textarea
            id="incident-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
            placeholder="Anything that would help someone else stay safe here."
            rows={3}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="lg" onClick={tagLocation} disabled={tagging}>
            <MapPin className="mr-1.5 h-4 w-4" />
            {coords.lat === null ? (tagging ? "Locating…" : "Tag my location") : "Location tagged"}
          </Button>
          {coords.lat !== null && (
            <span className="text-xs text-muted-foreground">
              {coords.lat.toFixed(4)}, {coords.lng?.toFixed(4)}
            </span>
          )}
          <Button
            type="button"
            size="lg"
            className="ml-auto"
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
          >
            <Send className="mr-1.5 h-4 w-4" /> Submit report
          </Button>
        </div>
      </div>
    </section>
  );
}