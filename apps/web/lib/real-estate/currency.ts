/**
 * Property currencies.
 *
 * Kenyan coastal property is routinely priced in euro for European buyers, and
 * that is exactly how the Claris stock is listed. Until now `price` was a bare
 * number the schema described as "Price in KES", so a euro asking price of
 * 485,000 rendered as "KSh 485,000" — off by a factor of roughly 150 and
 * completely misleading. Currency is now explicit on the document.
 */

export const CURRENCIES = ["KES", "EUR", "USD", "GBP"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "KES";

/** Symbol shown before the amount. KSh is the local convention, not "KES". */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  KES: "KSh",
  EUR: "€",
  USD: "$",
  GBP: "£",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  KES: "Kenyan shillings (KSh)",
  EUR: "Euro (€)",
  USD: "US dollars ($)",
  GBP: "Pounds sterling (£)",
};

/**
 * "KSh 850,000" but "€850,000". A word-like symbol needs the space; a glyph
 * looks wrong with one.
 */
export function withSymbol(amount: string, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return /^[A-Za-z]/.test(symbol) ? `${symbol} ${amount}` : `${symbol}${amount}`;
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export function toCurrency(value: unknown): Currency {
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
}

/**
 * Approximate rates to KES, maintained by hand.
 *
 * These are used ONLY to compare prices with each other: the min/max price
 * filter, price sorting, and nothing else. They are never used to display a
 * converted figure to anyone, because a stale rate shown as a real price is a
 * lie, whereas a stale rate used for sorting just means two similarly priced
 * listings might swap places.
 *
 * Review these when they drift far enough to reorder results noticeably. There
 * is no live FX feed in this codebase and adding one to sort a property list
 * is not worth the failure modes.
 */
export const APPROX_KES_RATES: Record<Currency, number> = {
  KES: 1,
  EUR: 150,
  USD: 130,
  GBP: 175,
};

/** Comparable value in shillings. Sorting and filtering only, never display. */
export function toComparableKes(price: number, currency: Currency): number {
  return price * (APPROX_KES_RATES[currency] ?? 1);
}

/* ── Conversion ────────────────────────────────────── */

/** How many shillings one unit of each currency buys. */
export type KesRates = Record<Currency, number>;

/**
 * Convert between any two currencies through shillings.
 *
 * Displayed conversions are always approximate and must be labelled as such
 * wherever they appear, alongside the price the seller actually quoted. The
 * seller is paid in their own currency; this is a comparison aid.
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: KesRates
): number {
  if (from === to) return amount;
  const kes = amount * (rates[from] ?? 1);
  const perTarget = rates[to] ?? 1;
  return perTarget === 0 ? kes : kes / perTarget;
}

/**
 * Rounds a converted figure to a precision the rate can actually support.
 * Printing "KSh 30,961,150" from a daily rate implies precision that is not
 * there; the magnitude is the useful part.
 */
export function roundConverted(amount: number): number {
  if (amount >= 10_000_000) return Math.round(amount / 100_000) * 100_000;
  if (amount >= 1_000_000) return Math.round(amount / 10_000) * 10_000;
  if (amount >= 100_000) return Math.round(amount / 1_000) * 1_000;
  if (amount >= 1_000) return Math.round(amount / 100) * 100;
  return Math.round(amount);
}
