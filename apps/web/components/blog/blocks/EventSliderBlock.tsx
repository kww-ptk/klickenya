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
  eventDate?: string;
  hostName?: string;
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
        {events.map((e) => {
          const href = `/events/${(e.city || "").toLowerCase().replace(/ /g, "-")}/${e.slug.current}`;
          const hostInitials = e.hostName
            ? e.hostName.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
            : "K";

          return (
            <Link
              key={e._id}
              href={href}
              className="shrink-0 w-[280px] rounded-[24px] bg-white border border-[#E2DDD5] overflow-hidden group hover:shadow-md transition-shadow duration-300"
            >
              {/* Cover image */}
              <div className="h-[150px] relative overflow-hidden bg-[#F4F1EC]">
                {e.mainImageUrl ? (
                  <img
                    src={e.mainImageUrl}
                    alt={e.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl opacity-30">🎟</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
              </div>

              {/* Body */}
              <div className="p-4">
                {/* Host */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="size-5 rounded-full bg-gradient-to-br from-[#6b2d8b] to-[#E8A020] flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">{hostInitials}</span>
                  </div>
                  <span className="text-[11px] text-[#9C9485] font-medium">{e.hostName || "Klickenya"}</span>
                </div>

                {/* Title */}
                <h4 className="text-[15px] font-semibold text-[#16130C] leading-[1.35] line-clamp-2 mb-2 group-hover:text-[#E8A020] transition-colors">
                  {e.title}
                </h4>

                {/* Location */}
                <p className="text-[12px] text-[#9C9485]">{e.city || "Watamu"}</p>

                {/* Price */}
                {e.pricePerNight != null && e.pricePerNight > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E2DDD5]">
                    <span className="text-[13px] font-semibold text-[#E8A020] bg-[#E8A020]/10 px-2.5 py-1 rounded-full">
                      KSh {e.pricePerNight.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
