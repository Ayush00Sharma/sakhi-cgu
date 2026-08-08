import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SmsFanoutResult = {
  configured: boolean;
  sent: number;
  failed: number;
  results: { contact: string; ok: boolean; error?: string }[];
};

/** Text every trusted contact about an alert and log each delivery attempt. */
export const notifyContactsOfAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { alertId: string; alertType: string; link: string | null; lat: number | null; lng: number | null }) => data)
  .handler(async ({ data, context }): Promise<SmsFanoutResult> => {
    const { sendSms, buildAlertBody, smsConfigured } = await import("./sms.server");
    const { supabase, userId } = context;

    const { data: contacts } = await supabase
      .from("trusted_contacts")
      .select("id, name, phone")
      .order("priority", { ascending: true });

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("id", userId)
      .maybeSingle();
    const name = profile?.display_name?.trim() || "A Sakhi user";

    const list = contacts ?? [];
    if (!smsConfigured()) {
      return { configured: false, sent: 0, failed: list.length, results: [] };
    }

    const body = buildAlertBody({
      name,
      phone: profile?.phone?.trim() || null,
      alertType: data.alertType,
      link: data.link,
      lat: data.lat,
      lng: data.lng,
    });
    const results: SmsFanoutResult["results"] = [];
    let sent = 0;
    let failed = 0;

    for (const contact of list) {
      const result = await sendSms(contact.phone, body);
      if (result.ok) sent += 1;
      else failed += 1;
      results.push({ contact: contact.name, ok: result.ok, ...(result.error ? { error: result.error } : {}) });
      await supabase.from("alert_deliveries").insert({
        user_id: userId,
        alert_id: data.alertId,
        contact_id: contact.id,
        contact_name: contact.name,
        phone: contact.phone,
        channel: "sms",
        status: result.ok ? "sent" : "failed",
        provider_message_id: result.sid ?? null,
        error: result.error ?? null,
      });
    }

    return { configured: true, sent, failed, results };
  });

/** Send a one-off verification text to a single trusted contact. */
export const sendContactVerificationSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string }) => data)
  .handler(async ({ data, context }) => {
    const { sendSms, buildVerificationBody, smsConfigured } = await import("./sms.server");
    const { supabase, userId } = context;

    const { data: contact } = await supabase
      .from("trusted_contacts")
      .select("id, name, phone")
      .eq("id", data.contactId)
      .maybeSingle();
    if (!contact) throw new Error("Contact not found");

    if (!smsConfigured()) return { configured: false, ok: false, error: "SMS provider is not connected yet." };

    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    const result = await sendSms(contact.phone, buildVerificationBody(profile?.display_name?.trim() || "Someone"));

    await supabase
      .from("trusted_contacts")
      .update({ verification_sent_at: new Date().toISOString() })
      .eq("id", contact.id);

    return { configured: true, ok: result.ok, error: result.error ?? null };
  });
