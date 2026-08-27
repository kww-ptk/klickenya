import { cn } from "@/lib/utils";
import type { PropertyCardData } from "@/lib/real-estate/mappers";
import { formatPrice, formatPriceFull, pricePerSqm } from "@/lib/real-estate/format";
import { neighbourhoodPath } from "@/lib/real-estate/constants";
import Link from "next/link";

/**
 * Market snapshot computed from the live listings on the site.
 *
 * This block used to render four hardcoded figures with invented month on month
 * deltas under the heading "Real-time insights from thousands of listings".
 * None of it came from data. Everything here is derived from the properties
 * currently published, and the copy says exactly that. Where there is not
 * enough data to compute a figure honestly, the figure is not shown.
 */

interface MarketDataStripProps {
  properties: PropertyCardData[];
  /** Slug lookup so bars can link to the neighbourhood page when one exists. */
  neighbourhoodSlugs?: Record<string, string>;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function MarketDataStrip({
  properties,
  neighbourhoodSlugs = {},
}: MarketDataStripProps) {
  // Medians are computed from shilling listings only. Folding a euro asking
  // price into the same median would produce a number that means nothing, and
  // converting at a hand-maintained rate would make the headline figure move
  // whenever somebody edited that constant. The caption says which it is.
  const inKes = properties.filter((p) => p.currency === "KES");
  const excluded = properties.length - inKes.length;

  const forSale = inKes.filter((p) => p.listingCategory === "for-sale");
  const forRent = inKes.filter((p) => p.listingCategory === "for-rent");

  const medianSalePrice = median(forSale.map((p) => p.price).filter((n) => n > 0));
  const medianRent = median(forRent.map((p) => p.price).filter((n) => n > 0));

  const sqmRates = forSale
    .map((p) => pricePerSqm(p.price, p.sizeSqm))
    .filter((n): n is number => n != null);
  const medianSqm = median(sqmRates);

  const stats = [
    medianSalePrice
      ? {
          icon: "🏙",
          label: "Median asking price, for sale",
          value: formatPrice(medianSalePrice),
          note: `${forSale.length} listings`,
        }
      : null,
    medianRent
      ? {
          icon: "🔑",
          label: "Median monthly rent",
          value: `${formatPrice(medianRent)} / mo`,
          note: `${forRent.length} rentals`,
        }
      : null,
    medianSqm
      ? {
          icon: "📊",
          label: "Median price per m²",
          value: formatPriceFull(medianSqm),
          note: `${sqmRates.length} listings with a stated size`,
        }
      : null,
    {
      icon: "📍",
      label: "Areas with live listings",
      value: String(new Set(properties.map((p) => p.neighbourhood).filter(Boolean)).size),
      note: (() => {
        const towns = new Set(properties.map((p) => p.city).filter(Boolean)).size;
        return towns === 1 ? "in 1 town" : `across ${towns} towns and cities`;
      })(),
    },
  ].filter(Boolean) as {
    icon: string;
    label: string;
    value: string;
    note: string;
  }[];

  // Price per square metre by neighbourhood, from listings that state a size.
  const byArea = new Map<string, number[]>();
  for (const p of forSale) {
    const rate = pricePerSqm(p.price, p.sizeSqm);
    if (!rate || !p.neighbourhood) continue;
    byArea.set(p.neighbourhood, [...(byArea.get(p.neighbourhood) ?? []), rate]);
  }

  const bars = Array.from(byArea.entries())
    // One listing is an anecdote, not a rate. Require at least two.
    .filter(([, rates]) => rates.length >= 2)
    .map(([name, rates]) => ({ name, value: median(rates) ?? 0, count: rates.length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const maxBar = Math.max(...bars.map((b) => b.value), 1);
  const hasChart = bars.length > 0;

  // Literal classes so Tailwind keeps them. The count varies: rentals add a
  // median rent card, and any figure without enough data to stand behind is
  // dropped entirely, so a fixed column count would orphan a card.
  const COLUMNS: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  };

  // Nothing priced in shillings means nothing to average honestly.
  if (stats.length === 0 || inKes.length === 0) return null;

  return (
    <section className="bg-dark px-5 py-14 md:px-10">
      <div
        className={cn(
          "mx-auto grid max-w-[1320px] grid-cols-1 gap-[60px]",
          hasChart ? "items-center lg:grid-cols-2" : "max-w-[1100px]"
        )}
      >
        <div>
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-amber">
            Market data
          </span>
          <h2 className="text-[clamp(22px,2.8vw,34px)] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
            Kenya property
            <br />
            market at a glance
          </h2>
          <p className="mt-2.5 text-[14px] leading-[1.55] text-white/45">
            Calculated from the {inKes.length}{" "}
            {inKes.length === 1 ? "property" : "properties"} priced in shillings
            on Klickenya. These are asking prices, not sale prices.
            {excluded > 0 && (
              <>
                {" "}
                {excluded} {excluded === 1 ? "listing" : "listings"} priced in
                another currency {excluded === 1 ? "is" : "are"} not included.
              </>
            )}
          </p>

          <div
            className={cn(
              "mt-7 gap-3",
              hasChart
                ? "flex flex-col"
                : cn(
                    "grid grid-cols-1 sm:grid-cols-2",
                    COLUMNS[Math.min(stats.length, 4)] ?? "lg:grid-cols-3"
                  )
            )}
          >
            {stats.map((card) => (
              <div
                key={card.label}
                className={cn(
                  "rounded-[16px] border border-white/[0.07] bg-white/5 px-5 py-4 transition-colors hover:bg-white/[0.09]",
                  // Beside the chart there is width for a row. In the wider
                  // grid each card is only a third, so the label and the figure
                  // wrapped against a right-aligned note; stack instead.
                  hasChart ? "flex items-center gap-4" : "flex flex-col gap-3"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-amber/[0.12] text-[18px]">
                    <span aria-hidden="true">{card.icon}</span>
                  </div>
                  {hasChart && (
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-[12px] font-medium text-white/40">
                        {card.label}
                      </p>
                      <p className="text-[20px] font-bold tracking-[-0.03em] text-white">
                        {card.value}
                      </p>
                    </div>
                  )}
                  {!hasChart && (
                    <p className="text-[12.5px] font-medium leading-[1.4] text-white/40">
                      {card.label}
                    </p>
                  )}
                </div>

                {!hasChart && (
                  <p className="text-[26px] font-bold leading-none tracking-[-0.03em] text-white">
                    {card.value}
                  </p>
                )}

                <span
                  className={cn(
                    "text-[11.5px] font-medium text-white/35",
                    hasChart ? "shrink-0 text-right" : "mt-auto"
                  )}
                >
                  {card.note}
                </span>
              </div>
            ))}
          </div>
        </div>

        {hasChart && (
          <div>
            <h3 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.02em] text-white/50">
              Median asking price per m&sup2; by neighbourhood
            </h3>
            <div className="flex h-[180px] items-end gap-2.5">
              {bars.map((bar, i) => {
                const slug = neighbourhoodSlugs[bar.name];
                const pct = Math.max(6, (bar.value / maxBar) * 100);
                const inner = (
                  <>
                    <span className="mb-1.5 block text-center text-[11px] font-bold text-white/70">
                      {Math.round(bar.value / 1000)}k
                    </span>
                    <div
                      className={cn(
                        "w-full rounded-t-[4px]",
                        i === 0
                          ? "bg-gradient-to-t from-amber/80 to-amber"
                          : "bg-gradient-to-t from-purple2/60 to-purple2"
                      )}
                      style={{ height: `${pct}%` }}
                    />
                    <span className="mt-2 block text-center text-[11px] font-medium text-white/35">
                      {bar.name}
                    </span>
                  </>
                );

                return (
                  <div
                    key={bar.name}
                    className="flex h-full flex-1 flex-col justify-end"
                    title={`${bar.name}: ${formatPriceFull(bar.value)} per m² across ${bar.count} listings`}
                  >
                    {slug ? (
                      <Link href={neighbourhoodPath(slug)} className="flex h-full flex-col justify-end">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[12px] leading-[1.6] text-white/30">
              Median of the listings in each area that state a floor size. Areas
              with fewer than two such listings are not shown.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export { MarketDataStrip };
