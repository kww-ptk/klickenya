import { ContactForm } from "@/components/listings/ContactForm";

interface BookingSidebarProps {
  listingId: string;
  listingTitle: string;
  listingType: string;
  price: number;
  priceUnit: string;
  maxGuests?: number;
  ticketTypes?: string[];
  onDatesChange?: (checkIn: string, checkOut: string) => void;
}

function BookingSidebar(props: BookingSidebarProps) {
  return (
    <aside className="hidden lg:block w-[350px] shrink-0">
      <div className="sticky top-[76px] border border-border rounded-[24px] shadow-lg p-5 bg-white max-h-[calc(100vh-92px)] overflow-y-auto scrollbar-none">
        <ContactForm {...props} />
      </div>
    </aside>
  );
}

export { BookingSidebar };
export type { BookingSidebarProps };
