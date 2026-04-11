import { ContactForm } from "@/components/listings/ContactForm";
import { ReservationInline } from "@/components/reservations/ReservationInline";
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
}

function BookingSidebar(props: BookingSidebarProps) {
  const { reservationsConfig, ...contactProps } = props;

  return (
    <aside className="hidden lg:block w-[350px] shrink-0">
      <div className="sticky top-[76px] border border-border rounded-[24px] shadow-lg p-5 bg-white max-h-[calc(100vh-92px)] overflow-y-auto scrollbar-none">
        {reservationsConfig?.enabled ? (
          /* ── Inline reservation widget ── */
          <div className="space-y-1">
            <div className="mb-4">
              <p className="font-display text-[18px] font-bold tracking-[-0.02em] text-dark mb-1">
                Reserve a table
              </p>
              <p className="text-[13px] text-text2">
                Instant confirmation once {reservationsConfig.menuName} approves.
              </p>
            </div>
            <ReservationInline
              menuId={reservationsConfig.menuId}
              menuName={reservationsConfig.menuName}
              timeWindows={reservationsConfig.timeWindows}
              areas={reservationsConfig.areas}
              maxPartySize={reservationsConfig.maxPartySize}
              maxAdvanceDays={reservationsConfig.maxAdvanceDays}
              leadTimeHours={reservationsConfig.leadTimeHours}
              durationMinutes={reservationsConfig.durationMinutes}
              restaurantPhone={reservationsConfig.restaurantPhone}
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
