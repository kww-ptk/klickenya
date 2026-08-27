/**
 * Normalize a Kenyan mobile number to +254XXXXXXXXX.
 * Accepts 07XX/01XX local, 254…, +254…, and generic +international.
 * Returns null when the input can't be a valid phone number.
 */
export function normalizeKenyanPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (/^\+254[17]\d{8}$/.test(cleaned)) return cleaned;
  if (/^254[17]\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0[17]\d{8}$/.test(cleaned)) return `+254${cleaned.slice(1)}`;
  // Non-Kenyan guests (tourists) — same rule reservations use: + then 7–15 digits.
  if (/^\+\d{7,15}$/.test(cleaned)) return cleaned;
  return null;
}
