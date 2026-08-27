import {
  APPROX_KES_RATES,
  CURRENCIES,
  type Currency,
} from "@/lib/real-estate/currency";

/**
 * Exchange rates, server side.
 *
 * Kenyan coastal property is quoted in euro while the rest of the country
 * quotes shillings, so a marketplace covering both has to convert something
 * for a buyer to compare anything. This fetches real rates rather than shipping
 * a number somebody typed once and forgot.
 *
 * open.er-api.com is used because it publishes KES. The obvious alternative,
 * the ECB feed behind Frankfurter, does not carry KES at all, which rules it
 * out for a Kenyan site.
 *
 * The service is free and unauthenticated, so it is treated as best effort: a
 * failed or malformed response falls back to the constants in
 * lib/real-estate/currency.ts, and the UI always says which it is using and
 * when the rates were published. A conversion presented without a date is a
 * number nobody can check.
 */

const ENDPOINT = "https://open.er-api.com/v6/latest/KES";

/** Twelve hours. The upstream publishes once a day. */
const REVALIDATE_SECONDS = 43_200;

export interface RateTable {
  /** How many shillings one unit of each currency buys. */
  kesPer: Record<Currency, number>;
  /** When the upstream published these, or null when using the fallback. */
  updatedAt: string | null;
  source: "live" | "fallback";
}

export const FALLBACK_RATES: RateTable = {
  kesPer: { ...APPROX_KES_RATES },
  updatedAt: null,
  source: "fallback",
};

function isSaneRate(value: unknown): value is number {
  // A plausible KES rate is somewhere between 1 and a few thousand. Anything
  // outside that is a malformed response, not a currency movement.
  return typeof value === "number" && Number.isFinite(value) && value > 0.5 && value < 5000;
}

export async function getRates(): Promise<RateTable> {
  try {
    const res = await fetch(ENDPOINT, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return FALLBACK_RATES;

    const body = (await res.json()) as {
      result?: string;
      base_code?: string;
      time_last_update_utc?: string;
      rates?: Record<string, number>;
    };

    if (body.result !== "success" || body.base_code !== "KES" || !body.rates) {
      return FALLBACK_RATES;
    }

    const kesPer = { ...APPROX_KES_RATES };
    let matched = 0;

    for (const code of CURRENCIES) {
      if (code === "KES") continue;
      // The feed gives KES -> code; we want code -> KES.
      const perKes = body.rates[code];
      if (typeof perKes !== "number" || perKes <= 0) continue;
      const rate = 1 / perKes;
      if (!isSaneRate(rate)) continue;
      kesPer[code] = rate;
      matched++;
    }

    // If nothing usable came back, the stale constants beat a half-filled table.
    if (matched === 0) return FALLBACK_RATES;

    return {
      kesPer,
      updatedAt: body.time_last_update_utc ?? null,
      source: "live",
    };
  } catch {
    return FALLBACK_RATES;
  }
}
