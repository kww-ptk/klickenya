"use client";

import { Star } from "lucide-react";
import { ContactForm } from "@/components/listings/ContactForm";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import type { ReservationsConfig } from "@/components/listings/detail/RestaurantDetail";
import { cn } from "@/lib/utils";

/* ── Type-specific CTA config ─────────────────────── */

interface CtaConfig {
  label: string;
  bg: string;
  text: string;
}

const CTA_MAP: Record<string, CtaConfig> = {
  stay: {
    label: "Reserve",
    bg: "bg-gradient-to-r from-amber to-amber2",
    text: "text-dark",
  },
  restaurant: {
    label: "Reserve a table",
    bg: "bg-gradient-to-r from-amber to-amber2",
    text: "text-dark",
  },
  experience: {
    label: "Book now",
    bg: "bg-teal-600",
    text: "text-white",
  },
  event: {
    label: "Get tickets",
    bg: "bg-purple-600",
    text: "text-white",
  },
  service: {
    label: "Request service",
    bg: "bg-emerald-600",
    text: "text-white",
  },
};

const DEFAULT_CTA: CtaConfig = {
  label: "Reserve",
  bg: "bg-gradient-to-r from-amber to-amber2",
  text: "text-dark",
};

/* ── Component ────────────────────────────────────── */

interface MobileBookingBarProps {
  type: string;
  price: number;
  priceUnit: string;
  listingId: string;
  listingTitle: string;
  cuisine?: string[];
  priceRange?: string;
  maxGuests?: number;
  ticketTypes?: string[];
  menuSlug?: string | null;
  onDatesChange?: (checkIn: string, checkOut: string) => void;
  /** Passed by RestaurantDetail when reservations_enabled = true */
  reservationsConfig?: ReservationsConfig | null;
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
  menuSlug,
  onDatesChange,
  reservationsConfig,
}: MobileBookingBarProps) {
  const cta = CTA_MAP[type] ?? DEFAULT_CTA;
  const isRestaurant = type === "restaurant";
  const useRealReservations = isRestaurant && reservationsConfig?.enabled === true;

  function trackClick() {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingSlug: listingId, listingType: type, eventType: "contact_click" }),
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <>
      {/* ── Fixed bottom bar ───────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-[150] lg:hidden">
        <div className="bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)] px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {isRestaurant ? (
            <div className="flex items-center gap-3">
              {/* Left: rating */}
              <div className="flex items-center gap-1 min-w-0 shrink-0">
                <Star className="size-3.5 fill-amber text-amber" />
                <span className="text-[13px] font-semibold text-dark">4.9</span>
              </div>
              {/* Right: actions */}
              <div className="flex items-center gap-2 ml-auto shrink-0">
                {menuSlug && (
                  <a
                    href="#menu-section"
                    className="h-[36px] px-4 rounded-full text-[13px] font-semibold text-dark border border-border flex items-center hover:bg-surface transition-colors"
                  >
                    Menu
                  </a>
                )}
                {/* Real ReservationSheet replaces scroll-to-form anchor when enabled */}
                {useRealReservations && reservationsConfig ? (
                  <ReservationSheet
                    menuId={reservationsConfig.menuId}
                    menuName={reservationsConfig.menuName}
                    source="listing"
                    timeWindows={reservationsConfig.timeWindows}
                    areas={reservationsConfig.areas}
                    maxPartySize={reservationsConfig.maxPartySize}
                    maxAdvanceDays={reservationsConfig.maxAdvanceDays}
                    leadTimeHours={reservationsConfig.leadTimeHours}
                    restaurantPhone={reservationsConfig.restaurantPhone}
                    triggerLabel="Book a table"
                    triggerClassName="h-[36px] px-4 text-[13px]"
                  />
                ) : (
                  <a
                    href="#mobile-contact"
                    onClick={trackClick}
                    className="h-[36px] px-4 rounded-full text-[13px] font-bold bg-gradient-to-r from-amber to-amber2 text-dark flex items-center"
                  >
                    Book a table
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-dark">
                  KSh {price.toLocaleString()}
                </span>
                <span className="text-[13px] text-text2"> / {priceUnit}</span>
              </div>
              <a
                href="#mobile-contact"
                onClick={trackClick}
                className={cn(
                  "h-[36px] px-5 rounded-full text-[13px] font-bold flex items-center shrink-0",
                  cta.bg,
                  cta.text,
                )}
              >
                {cta.label}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile booking form (hidden when real reservations are enabled) ── */}
      {!useRealReservations && (
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
              onDatesChange={onDatesChange}
            />
          </div>
        </div>
      )}
    </>
  );
}

export { MobileBookingBar };
export type { MobileBookingBarProps };
