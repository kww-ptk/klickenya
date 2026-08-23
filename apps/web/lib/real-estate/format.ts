/** Price / label formatting shared by every real-estate surface. */

/** Compact price for cards and headings: "KSh 12.5M", "KSh 850,000". */
export function formatPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "Price on request";
  if (price >= 1_000_000_000) {
    const b = price / 1_000_000_000;
    return `KSh ${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)}B`;
  }
  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    return `KSh ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `KSh ${price.toLocaleString("en-KE")}`;
}

/** Full price with every digit — used in JSON-LD and the admin table. */
export function formatPriceFull(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "Price on request";
  return `KSh ${new Intl.NumberFormat("en-KE").format(price)}`;
}

/**
 * Rent is charged per month. The old card checked `status === "for-rent"`,
 * which is never true (status is available/sold/let), so rental prices rendered
 * as if they were purchase prices.
 */
export function isMonthlyPrice(
  listingCategory?: string,
  priceType?: string
): boolean {
  return priceType === "per-month" || listingCategory === "for-rent";
}

export function priceSuffix(
  listingCategory?: string,
  priceType?: string
): string {
  return isMonthlyPrice(listingCategory, priceType) ? "/month" : "";
}

export function getReductionPercent(
  previous?: number | null,
  current?: number | null
): number | null {
  if (previous == null || current == null) return null;
  if (previous <= current) return null;
  return Math.round(((previous - current) / previous) * 100);
}

/** "3 beds" / "1 bed" — the old card always wrote "1 beds". */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : plural ?? `${singular}s`}`;
}

export function capitalizeWords(str: string): string {
  return str
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function formatArea(sqm?: number | null): string | null {
  if (sqm == null || sqm <= 0) return null;
  return `${sqm.toLocaleString("en-KE")} m²`;
}

export function formatAcres(acres?: number | null): string | null {
  if (acres == null || acres <= 0) return null;
  return `${acres.toLocaleString("en-KE")} ${acres === 1 ? "acre" : "acres"}`;
}

/** Price per square metre — a headline metric on every serious portal. */
export function pricePerSqm(price?: number | null, sqm?: number | null): number | null {
  if (!price || !sqm || sqm <= 0) return null;
  return Math.round(price / sqm);
}

/** Digits-only phone for tel:/wa.me links. Kenyan local numbers get +254. */
export function toWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return digits || null;
}
