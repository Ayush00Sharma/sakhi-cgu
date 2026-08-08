import { toE164, alertLabel } from "./phone";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export type SmsResult = { ok: boolean; sid?: string; error?: string };

export function smsConfigured() {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["TWILIO_API_KEY"] && process.env["TWILIO_FROM_NUMBER"]);
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  const from = process.env["TWILIO_FROM_NUMBER"];
  if (!lovableKey || !twilioKey) return { ok: false, error: "SMS provider is not connected yet." };
  if (!from) return { ok: false, error: "No sending phone number is configured." };

  const normalized = toE164(to);
  if (!normalized) return { ok: false, error: "Invalid phone number." };

  try {
    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: normalized, From: from, Body: body.slice(0, 1500) }),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`Twilio send failed [${response.status}]: ${text}`);
      return { ok: false, error: `Provider error [${response.status}]: ${text.slice(0, 300)}` };
    }
    const json = JSON.parse(text) as { sid?: string };
    return json.sid ? { ok: true, sid: json.sid } : { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMS error";
    console.error("Twilio send threw:", message);
    return { ok: false, error: message };
  }
}

export function buildAlertBody(opts: {
  name: string;
  alertType: string;
  link: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const parts = [`${alertLabel(opts.alertType)} — ${opts.name} needs help (sent via Sakhi).`];
  if (opts.lat != null && opts.lng != null) {
    parts.push(`Last location: https://www.google.com/maps?q=${opts.lat},${opts.lng}`);
  }
  if (opts.link) parts.push(`Live location: ${opts.link}`);
  parts.push("Please call them now.");
  return parts.join("\n");
}

export function buildVerificationBody(name: string) {
  return `${name} added you as a trusted contact on Sakhi, a personal safety app. If they ever trigger an SOS, you'll get a text like this with their live location. Reply OK to confirm this number works.`;
}
