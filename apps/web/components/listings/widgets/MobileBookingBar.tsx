"use client";

import { ContactForm } from "@/components/listings/ContactForm";
import { cn } from "@/lib/utils";

/* ── Type-specific CTA config ─────────────────────── */

interface CtaConfig {
  label: string;
  bg: string;
  shadow: string;
  text: string;
}

const CTA_MAP: Record<string, CtaConfig> = {
  stay: {
    label: "Reserve",
    bg: "bg-gradient-to-r from-amber to-amber2",
    shadow: "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
    text: "text-dark",
  },
  restaurant: {
    label: "Reserve a table",
    bg: "bg-gradient-to-r from-amber to-amber2",
    shadow: "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
    text: "text-dark",
  },
  experience: {
    label: "Book now",
    bg: "bg-teal-600",
    shadow: "shadow-[0_4px_14px_rgba(13,148,136,0.35)]",
    text: "text-white",
  },
  event: {
    label: "Get tickets",
    bg: "bg-purple-600",
    shadow: "shadow-[0_4px_14px_rgba(147,51,234,0.35)]",
    text: "text-white",
  },
  service: {
    label: "Request service",
    bg: "bg-emerald-600",
    shadow: "shadow-[0_4px_14px_rgba(5,150,105,0.35)]",
    text: "text-white",
  },
};

const DEFAULT_CTA: CtaConfig = {
  label: "Reserve",
  bg: "bg-gradient-to-r from-amber to-amber2",
  shadow: "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
  text: "text-dark",
};

/* ── Price range symbol helper ────────────────────── */

function priceRangeSymbol(range?: string): string {
  switch (range) {
    case "budget":
      return "$";
    case "mid-range":
      return "$$";
    case "fine-dining":
      return "$$$";
    default:
      return "$$";
  }
}

/* ── Price display per type ───────────────────────── */

function PriceDisplay({
  type,
  price,
  priceUnit,
  cuisine,
  priceRange,
}: {
  type: string;
  price: number;
  priceUnit: string;
  cuisine?: string[];
  priceRange?: string;
}) {
  const formatted = `KSh ${price.toLocaleString()}`;

  switch (type) {
    case "stay":
      return (
        <>
          <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-dark">
            {formatted}
          </span>
          <span className="text-[14px] text-text2"> / {priceUnit}</span>
        </>
      );

    case "restaurant": {
      const symbol = priceRangeSymbol(priceRange);
      const cuisineLabel = cuisine?.slice(0, 2).join(", ") ?? "";
      return (
        <span className="text-[16px] font-semibold text-dark">
          {symbol}
          {cuisineLabel ? ` · ${cuisineLabel}` : ""}
        </span>
      );
    }

    case "experience":
      return (
        <>
          <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-dark">
            {formatted}
          </span>
          <span className="text-[14px] text-text2"> / person</span>
        </>
      );

    case "event":
      return (
        <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-dark">
          From {formatted}
        </span>
      );

    case "service":
      return (
        <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-dark">
          From {formatted}
        </span>
      );

    default:
      return (
        <>
          <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-dark">
            {formatted}
          </span>
          <span className="text-[14px] text-text2"> / {priceUnit}</span>
        </>
      );
  }
}

/* ── Component ────────────────────────────────────── */

interface MobileBookingBarProps {
  type: string;
  price: number;
  priceUnit: string;
  listingId: string;
  listingTitle: string;
  /** For restaurant price display */
  cuisine?: string[];
  /** For restaurant price display */
  priceRange?: string;
  maxGuests?: number;
  ticketTypes?: string[];
}

function MobileBookingBar({
  type,
  price,
  priceUnit,
  listingId,
  listingTitle,
  cuisine,
  priceRange,
  maxGuests,
  ticketTypes,
}: MobileBookingBarProps) {
  const cta = CTA_MAP[type] ?? DEFAULT_CTA;

  return (
    <>
      {/* ── Fixed bottom bar ───────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-[150] bg-white border-t border-border px-5 py-3.5 flex items-center justify-between lg:hidden">
        <div>
          <PriceDisplay
            type={type}
            price={price}
            priceUnit={priceUnit}
            cuisine={cuisine}
            priceRange={priceRange}
          />
        </div>
        <a
          href="#mobile-contact"
          className={cn(
            "px-6 py-3 rounded-[18px] text-[14px] font-bold",
            cta.bg,
            cta.text,
            cta.shadow
          )}
        >
          {cta.label}
        </a>
      </div>

      {/* ── Mobile booking form ────────────── */}
      <div
        id="mobile-contact"
        className="lg:hidden max-w-[560px] mx-auto px-5 pb-24"
      >
        <div className="border border-border rounded-[32px] shadow-lg p-7 bg-white">
          <ContactForm
            listingId={listingId}
            listingTitle={listingTitle}
            listingType={type}
            price={price}
            priceUnit={priceUnit}
            maxGuests={maxGuests}
            ticketTypes={ticketTypes}
          />
        </div>
      </div>
    </>
  );
}

export { MobileBookingBar };
export type { MobileBookingBarProps };
