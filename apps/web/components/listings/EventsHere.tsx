import { WeekendEventCard } from "@/components/events/WeekendEventCard";

/**
 * One event linked to the listing being viewed (via its `venueListing`
 * reference). Shape mirrors WeekendEventCard's props so the reused, fully
 * designed event card renders without extra mapping in the section.
 */
interface EventsHereItem {
  id: string;
  title: string;
  slug: string;
  city: string;
  subcategory: string | null;
  coverPhotoUrl: string | null;
  eventDate: string;
  isFree: boolean;
  priceFrom: number | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
}

interface EventsHereProps {
  events: EventsHereItem[];
}

/**
 * "Events happening here" — shown on ANY listing's detail page for events whose
 * `venueListing` points at this listing. Renders nothing when there are none.
 *
 * Matches the trailing related-section pattern used by SimilarListings
 * (`mt-16 mb-8` + the same `font-display` heading treatment) and reuses the
 * WeekendEventCard grid card so it sits in the page's existing visual rhythm.
 */
function EventsHere({ events }: EventsHereProps) {
  if (events.length === 0) return null;

  return (
    <section className="mt-16 mb-8">
      <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
        Events happening here
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((e) => (
          <WeekendEventCard
            key={e.id}
            title={e.title}
            slug={e.slug}
            city={e.city}
            subcategory={e.subcategory}
            coverPhotoUrl={e.coverPhotoUrl}
            eventDate={e.eventDate}
            isFree={e.isFree}
            priceFrom={e.priceFrom}
            recurrenceRule={e.isRecurring ? e.recurrenceRule : null}
          />
        ))}
      </div>
    </section>
  );
}

export { EventsHere };
export type { EventsHereItem, EventsHereProps };
