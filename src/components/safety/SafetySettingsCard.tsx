import { useEffect, useState } from "react";
import { BellOff, BellRing, Settings2, History } from "lucide-react";

import { useSafetySettings } from "@/hooks/useSafetySettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SafetySettingsCard() {
  const { settings, update } = useSafetySettings();
  const [callerName, setCallerName] = useState(settings.fake_caller_name);
  const [photo, setPhoto] = useState(settings.fake_caller_photo_url ?? "");

  useEffect(() => {
    setCallerName(settings.fake_caller_name);
    setPhoto(settings.fake_caller_photo_url ?? "");
  }, [settings.fake_caller_name, settings.fake_caller_photo_url]);

  const rows = [
    {
      key: "silent_mode" as const,
      icon: BellOff,
      title: "Silent alarm mode",
      body: "Trigger SOS with no sound, no vibration and no visible change on screen.",
      value: settings.silent_mode,
    },
    {
      key: "auto_record" as const,
      icon: Settings2,
      title: "Auto-record on SOS",
      body: "Start an audio recording automatically and save it privately as evidence.",
      value: settings.auto_record,
    },
    {
      key: "auto_share_location" as const,
      icon: Settings2,
      title: "Auto live-share on SOS",
      body: "Open a live location link whenever SOS or a check-in timer starts.",
      value: settings.auto_share_location,
    },
    {
      key: "alert_sound" as const,
      icon: BellRing,
      title: "Distinct emergency tone",
      body: "Play the unique rising siren — clearly different from a normal notification — on alerts and check-in prompts.",
      value: settings.alert_sound,
    },
    {
      key: "track_history" as const,
      icon: History,
      title: "Record location history",
      body: "Keep a private trail of where you've been for the last 10 days.",
      value: settings.track_history,
    },
  ];

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Safety settings</h2>
      </div>

      <ul className="mt-3 divide-y divide-border">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.body}</p>
            </div>
            <Switch
              checked={row.value}
              aria-label={row.title}
              onCheckedChange={(checked) => update.mutate({ [row.key]: checked })}
            />
          </li>
        ))}
      </ul>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="caller-name">Fake call — caller name</Label>
          <Input
            id="caller-name"
            value={callerName}
            onChange={(e) => setCallerName(e.target.value.slice(0, 60))}
            onBlur={() => callerName.trim() && update.mutate({ fake_caller_name: callerName.trim() })}
            placeholder="Mom"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="caller-photo">Caller photo URL (optional)</Label>
          <Input
            id="caller-photo"
            value={photo}
            onChange={(e) => setPhoto(e.target.value)}
            onBlur={() => update.mutate({ fake_caller_photo_url: photo.trim() || null })}
            placeholder="https://…"
          />
        </div>
      </div>
    </section>
  );
}