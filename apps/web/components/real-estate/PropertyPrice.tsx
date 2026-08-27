"use client";

import { cn } from "@/lib/utils";
import { formatPrice, priceSuffix } from "@/lib/real-estate/format";
import { toCurrency, type Currency } from "@/lib/real-estate/currency";
import { useDisplayCurrency } from "@/components/currency/CurrencyProvider";

/**
 * A property price, shown in the viewer's chosen currency with the seller's own
 * figure kept underneath.
 *
 * The seller is paid in the currency they quoted. Klickenya does not take the
 * money, so a converted number is a comparison aid and never the price. It
 * leads because a grid mixing euro and shillings is otherwise impossible to
 * scan, but the quoted figure is never hidden and the conversion is always
 * marked approximate.
 */
function PropertyPrice({
  price,
  currency,
  listingCategory,
  priceType,
  size = "card",
  className,
}: {
  price: number;
  currency: Currency | string;
  listingCategory?: string;
  priceType?: string;
  size?: "card" | "large" | "detail" | "bar";
  className?: string;
}) {
  const source = toCurrency(currency);
  const { currency: display, convertFor } = useDisplayCurrency();
  const converted = price > 0 ? convertFor(price, source) : null;
  const suffix = priceSuffix(listingCategory, priceType);

  const headline =
    converted != null ? formatPrice(converted, display) : formatPrice(price, source);

  const headlineCls = {
    card: "text-[20px]",
    large: "text-[26px]",
    detail: "font-display text-[32px] tracking-[-0.03em]",
    bar: "font-display text-[20px] tracking-[-0.02em]",
  }[size];

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn("font-bold tracking-[-0.02em] text-text", headlineCls)}
          title={
            converted != null
              ? `Approximate, converted from ${formatPrice(price, source)}`
              : undefined
          }
        >
          {/* The tilde belongs on the same line as the figure it qualifies. */}
          {converted != null && <span aria-hidden="true">≈ </span>}
          {headline}
        </span>
        {suffix && (
          <span className="text-[13px] font-normal text-text2">{suffix}</span>
        )}
      </div>

      {/* What the seller actually asks. */}
      {converted != null && (
        <p className="mt-0.5 text-[12.5px] text-text3">
          {formatPrice(price, source)} asking
        </p>
      )}
    </div>
  );
}

export { PropertyPrice };
