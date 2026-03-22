import Link from "next/link";

interface SliderEvent {
  _id: string;
  title: string;
  slug: { current: string };
  type: string;
  subcategory?: string;
  city?: string;
  pricePerNight?: number;
  priceUnit?: string;
  mainImageUrl?: string;
}

export function EventSliderBlock({
  value,
}: {
  value: {
    heading?: string;
    events?: SliderEvent[];
    ctaText?: string;
    ctaLink?: string;
  };
}) {
  const { heading = "Upcoming events", events, ctaText, ctaLink } = value;
  if (!events || events.length === 0) return null;

  return (
    <div className="my-10 p-6 rounded-2xl bg-[#16130C]">
      <h3 className="text-[11px] font-extrabold tracking-[.08em] uppercase text-[#E8A020] mb-4">
        {heading}
      </h3>
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
        {events.map((e) => {
          const href = `/events/${(e.city || "").toLowerCase().replace(/ /g, "-")}/${e.slug.current}`;
          return (
            <Link
              key={e._id}
              href={href}
              className="shrink-0 w-[200px] group rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-[#E8A020]/40 transition-all duration-200"
            >
              <div className="relative h-[120px] bg-white/5">
                {e.mainImageUrl ? (
                  <img
                    src={e.mainImageUrl}
                    alt={e.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-2xl">
                    🎟
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-[13px] font-semibold text-white line-clamp-2 group-hover:text-[#E8A020] transition-colors leading-tight">
                  {e.title}
                </p>
                <p className="text-[11px] text-white/40 mt-1">{e.city}</p>
              </div>
            </Link>
          );
        })}
      </div>
      {ctaText && ctaLink && (
        <Link
          href={ctaLink}
          className="inline-block mt-4 text-[12px] font-bold text-[#E8A020] hover:underline"
        >
          {ctaText}
        </Link>
      )}
    </div>
  );
}
