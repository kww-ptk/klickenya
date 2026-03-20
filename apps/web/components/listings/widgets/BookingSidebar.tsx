import { ContactForm } from "@/components/listings/ContactForm";

interface BookingSidebarProps {
  listingId: string;
  listingTitle: string;
  listingType: string;
  price: number;
  priceUnit: string;
  maxGuests?: number;
  ticketTypes?: string[];
}

function BookingSidebar(props: BookingSidebarProps) {
  return (
    <aside className="hidden lg:block w-[380px] shrink-0">
      <div className="sticky top-[88px] border border-border rounded-[32px] shadow-lg p-7 bg-white">
        <ContactForm {...props} />
      </div>
    </aside>
  );
}

export { BookingSidebar };
export type { BookingSidebarProps };
