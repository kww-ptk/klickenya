import Link from "next/link";

/**
 * /eat/inbox — placeholder. Will surface restaurant-only enquiries and
 * (eventually) reservation requests, contact-form messages, and reviews.
 *
 * For now: links to the legacy /dashboard/enquiries which shows all enquiry
 * types across all listings.
 */
export default function EatInboxPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
          Inbox
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-0.5">
          Enquiries, reservation requests, and reviews — restaurant-scoped.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
        <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
          Using the legacy enquiries page for now
        </p>
        <p className="text-[13px] text-[#9C9485] mb-4 max-w-[320px] mx-auto">
          Reservation requests already live inside each restaurant&apos;s Reservations tab.
          The full enquiry stream is at /dashboard/enquiries — we&apos;ll fold the
          restaurant-only slice into eat once requirements are clearer.
        </p>
        <Link
          href="/dashboard/enquiries"
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
        >
          Open /dashboard/enquiries →
        </Link>
      </div>
    </div>
  );
}
