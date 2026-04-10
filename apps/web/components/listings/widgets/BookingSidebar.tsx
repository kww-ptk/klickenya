import { ContactForm } from "@/components/listings/ContactForm";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import type { ReservationsConfig } from "@/components/listings/detail/RestaurantDetail";

interface BookingSidebarProps {
  listingId: string;
  listingTitle: string;
  listingType: string;
  price: number;
  priceUnit: string;
  maxGuests?: number;
  ticketTypes?: string[];
  onDatesChange?: (checkIn: string, checkOut: string) => void;
  /** Passed by RestaurantDetail when reservations_enabled = true */
  reservationsConfig?: ReservationsConfig | null;
  /** Sanity plain-text openingHours string, used by ReservationSheet for slot generation */
  openingHours?: string | null;
}

function BookingSidebar(props: BookingSidebarProps) {
  const { reservationsConfig, openingHours, ...contactProps } = props;

  return (
    <aside className="hidden lg:block w-[350px] shrink-0">
      <div className="sticky top-[76px] border border-border rounded-[24px] shadow-lg p-5 bg-white max-h-[calc(100vh-92px)] overflow-y-auto scrollbar-none">
        {reservationsConfig?.enabled ? (
          /* ── Real reservation system ── */
          <div className="space-y-4">
            <div>
              <p className="font-display text-[18px] font-bold tracking-[-0.02em] text-dark mb-1">
                Reserve a table
              </p>
              <p className="text-[13px] text-text2">
                Book your spot at {reservationsConfig.menuName}. Instant confirmation once the restaurant approves.
              </p>
            </div>
            <ReservationSheet
              menuId={reservationsConfig.menuId}
              menuName={reservationsConfig.menuName}
              source="listing"
              openingHours={openingHours ?? null}
              areas={reservationsConfig.areas}
              maxPartySize={reservationsConfig.maxPartySize}
              maxAdvanceDays={reservationsConfig.maxAdvanceDays}
              leadTimeHours={reservationsConfig.leadTimeHours}
              restaurantPhone={reservationsConfig.restaurantPhone}
              triggerLabel="Book a table"
              triggerClassName="w-full"
            />
          </div>
        ) : (
          /* ── Generic contact / enquiry form (unchanged) ── */
          <ContactForm {...contactProps} />
        )}
      </div>
    </aside>
  );
}

export { BookingSidebar };
export type { BookingSidebarProps };
