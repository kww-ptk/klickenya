"use client";

import Link from "next/link";
import { EventCard } from "@/components/home/EventCard";
import { mapSanityEventToCard } from "@/lib/mappers/eventMapper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EventSliderBlock({ value }: { value: any }) {
  const { heading = "Upcoming events", events, ctaText, ctaLink } = value;
  if (!events || events.length === 0) return null;

  const cards = events.map(mapSanityEventToCard);

  return (
    <div className="my-10">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-[20px] font-bold text-[#16130C]">
          {heading}
        </h3>
        {ctaText && ctaLink && (
          <Link
            href={ctaLink}
            className="text-[13px] font-semibold text-[#E8A020] hover:underline"
          >
            {ctaText}
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
        {cards.map((card: ReturnType<typeof mapSanityEventToCard>, i: number) => (
          <EventCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
}
