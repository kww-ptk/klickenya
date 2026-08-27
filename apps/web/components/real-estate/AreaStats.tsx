import { cn } from "@/lib/utils";
import type { PropertyCardData } from "@/lib/real-estate/mappers";
import { formatPrice, pricePerSqm, formatPriceFull } from "@/lib/real-estate/format";
import { CURRENCY_LABELS, type Currency } from "@/lib/real-estate/currency";
import { CATEGORY_LABELS, type PropertyCategory } from "@/lib/real-estate/constants";

/**
 * Market snapshot for one town.
 *
 * MarketDataStrip deliberately computes shilling medians only and renders
 * nothing when there are no shilling listings, which is the right call for a
 * national average. On the coast it is the wrong call: Watamu stock is largely
 * quoted in euro, so that component renders an empty section on exactly the
 * page that most needs a market panel.
 *
 * This one medians each currency separately and labels which is which. It
 * never converts, for the same reason MarketDataStrip does not: a headline
 * figure derived from a hand maintained rate is a number nobody agreed to.
 */

interface AreaStatsProps {
  placeName: string;
  cards: PropertyCardData[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function AreaStats({ placeName, cards }: AreaStatsProps) {
  if (cards.length === 0) return null;

  const priced = cards.filter((c) => c.price > 0);

  /* ── Asking prices, one median per currency ─────── */
  // A single listing is an anecdote, not a median, so a currency needs at
  // least two before it gets a headline figure of its own.
  const saleByCurrency = new Map<Currency, number[]>();
  for (const c of priced) {
    if (c.listingCategory === "for-rent") continue;
    saleByCurrency.set(c.currency, [...(saleByCurrency.get(c.currency) ?? []), c.price]);
  }

  const saleMedians = Array.from(saleByCurrency.entries())
    .filter(([, prices]) => prices.length >= 2)
    .map(([currency, prices]) => ({
      currency,
      value: median(prices) as number,
      count: prices.length,
    }))
    .sort((a, b) => b.count - a.count);

  const rents = priced.filter((c) => c.listingCategory === "for-rent");
  const rentByCurrency = new Map<Currency, number[]>();
  for (const c of rents) {
    rentByCurrency.set(c.currency, [...(rentByCurrency.get(c.currency) ?? []), c.price]);
  }
  const rentMedians = Array.from(rentByCurrency.entries())
    .filter(([, prices]) => prices.length >= 2)
    .map(([currency, prices]) => ({
      currency,
      value: median(prices) as number,
      count: prices.length,
    }))
    .sort((a, b) => b.count - a.count);

  /* ── Rate per m², in the dominant sale currency ──── */
  const dominant = saleMedians[0]?.currency;
  const sqmRates = dominant
    ? priced
        .filter((c) => c.currency === dominant && c.listingCategory !== "for-rent")
        .map((c) => pricePerSqm(c.price, c.sizeSqm))
        .filter((n): n is number => n != null)
    : [];
  const medianSqm = sqmRates.length >= 2 ? median(sqmRates) : null;

  /* ── Category counts ────────────────────────────── */
  const byCategory = (["for-sale", "for-rent", "land", "commercial"] as PropertyCategory[])
    .map((category) => ({
      category,
      count: cards.filter((c) => c.listingCategory === category).length,
    }))
    .filter((row) => row.count > 0);

  /**
   * Asking range in the dominant currency. This slot used to hold a count of
   * distinct `neighbourhood` values, which is meaningless on a town page:
   * hosts fill that field in as a street address, so eight properties produced
   * "8 areas with live listings" and told nobody anything.
   */
  const dominantPrices = dominant
    ? priced
        .filter((c) => c.currency === dominant && c.listingCategory !== "for-rent")
        .map((c) => c.price)
        .sort((a, b) => a - b)
    : [];
  const range =
    dominantPrices.length >= 2 && dominant
      ? {
          low: dominantPrices[0],
          high: dominantPrices[dominantPrices.length - 1],
          currency: dominant,
        }
      : null;

  const stats = [
    {
      label: `Properties listed in ${placeName}`,
      value: String(cards.length),
      note:
        byCategory.length > 1
          ? `across ${byCategory.length} categories`
          : CATEGORY_LABELS[byCategory[0]?.category] ?? "",
    },
    ...saleMedians.map((row) => ({
      label:
        saleMedians.length > 1
          ? `Median asking price, ${row.currency}`
          : "Median asking price",
      value: formatPrice(row.value, row.currency),
      note: `${row.count} ${row.count === 1 ? "listing" : "listings"} quoted in ${CURRENCY_LABELS[row.currency]}`,
    })),
    ...rentMedians.slice(0, 1).map((row) => ({
      label: "Median monthly rent",
      value: `${formatPrice(row.value, row.currency)} / mo`,
      note: `${row.count} rentals`,
    })),
    medianSqm && dominant
      ? {
          label: "Median price per m²",
          value: formatPriceFull(medianSqm, dominant),
          note: `${sqmRates.length} listings with a stated size`,
        }
      : null,
    range
      ? {
          label: "Asking price range",
          value: `${formatPrice(range.low, range.currency)} to ${formatPrice(range.high, range.currency)}`,
          note: `across ${dominantPrices.length} listings priced to buy`,
        }
      : null,
  ].filter(Boolean) as { label: string; value: string; note: string }[];

  const COLUMNS: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  };

  return (
    <section className="bg-dark px-5 py-14 md:px-10">
      <div className="mx-auto max-w-[1320px]">
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-amber">
          Market data
        </span>
        <h2 className="max-w-[720px] text-[clamp(22px,2.8vw,34px)] font-semibold leading-[1.15] tracking-[-0.03em] text-white">
          The {placeName} market at a glance
        </h2>
        <p className="mt-2.5 max-w-[640px] text-[14px] leading-[1.6] text-white/45">
          Calculated from the {cards.length}{" "}
          {cards.length === 1 ? "property" : "properties"} currently listed in{" "}
          {placeName} on Klickenya. These are asking prices, not sale prices, and
          each currency is averaged on its own rather than converted.
        </p>

        <div
          className={cn(
            "mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2",
            COLUMNS[Math.min(stats.length, 4)] ?? "lg:grid-cols-4"
          )}
        >
          {stats.map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-2 rounded-[16px] border border-white/[0.07] bg-white/5 px-5 py-4 transition-colors hover:bg-white/[0.09]"
            >
              <p className="text-[12.5px] font-medium leading-[1.4] text-white/40">
                {card.label}
              </p>
              <p className="text-[26px] font-bold leading-none tracking-[-0.03em] text-white">
                {card.value}
              </p>
              <span className="mt-auto text-[11.5px] font-medium text-white/35">
                {card.note}
              </span>
            </div>
          ))}
        </div>

        {byCategory.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-2.5">
            {byCategory.map((row) => (
              <span
                key={row.category}
                className="rounded-full border border-white/10 px-4 py-2 text-[13.5px] font-semibold text-white/70"
              >
                {CATEGORY_LABELS[row.category]}
                <span className="ml-2 text-white/35">{row.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export { AreaStats };
