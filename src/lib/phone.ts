/** Normalize a user-entered phone number to E.164. Defaults to +91 (India) when no country code is given. */
export function toE164(raw: string, defaultCountryCode = "91"): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (hasPlus) return digits.length >= 8 ? `+${digits}` : null;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length > 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function alertLabel(type: string) {
  if (type === "sos") return "EMERGENCY SOS";
  if (type === "checkin_missed") return "MISSED SAFETY CHECK-IN";
  if (type === "safe_arrival") return "SAFE ARRIVAL";
  return type.replace(/_/g, " ").toUpperCase();
}
