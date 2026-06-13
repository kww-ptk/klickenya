import Link from "next/link";

interface SliderListing {
  _id: string;
  title: string;
  slug: { current: string };
  type: string;
  subcategory?: string;
  city?: string;
  pricePerNight?: number;
  priceUnit?: string;
  rating?: number;
  reviewCount?: number;
  mainImageUrl?: string;
  isVerified?: boolean;
  hostName?: string;
}

const TYPE_PLURAL: Record<string, string> = {
  stay: "stays",
  experience: "experiences",
  event: "events",
  service: "services",
};

export function ListingSliderBlock({
  value,
}: {
  value: { heading?: string; listings?: SliderListing[] };
}) {
  const { heading = "Featured stays", listings } = value;
  if (!listings || listings.length === 0) return null;

  return (
    <div className="my-10">
      <h3 className="text-[11px] font-extrabold tracking-[.08em] uppercase text-amber mb-4">
        {heading}
      </h3>
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
        {listings.map((l) => {
          const typePlural = TYPE_PLURAL[l.type] || l.type;
          const href = `/${typePlural}/${(l.city || "").toLowerCase().replace(/ /g, "-")}/${l.slug.current}`;
          return (
            <Link
              key={l._id}
              href={href}
              className="shrink-0 w-[220px] group rounded-xl border border-border overflow-hidden bg-white hover:shadow-md transition-shadow duration-200"
            >
              <div className="relative h-[140px] bg-surface">
                {l.mainImageUrl ? (
                  <img
                    src={l.mainImageUrl}
                    alt={l.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text3 text-sm">
                    No image
                  </div>
                )}
                {l.isVerified && (
                  <span className="absolute top-2 right-2 size-5 rounded-full bg-green flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-[13px] font-semibold text-dark line-clamp-1 group-hover:text-amber transition-colors">
                  {l.title}
                </p>
                <p className="text-[11px] text-text3 mt-0.5">
                  {l.city}
                  {l.rating ? ` · ⭐ ${l.rating.toFixed(1)}` : ""}
                </p>
                {l.pricePerNight != null && l.pricePerNight > 0 && (
                  <p className="text-[12px] font-semibold text-dark mt-1.5">
                    KSh {l.pricePerNight.toLocaleString()}
                    <span className="font-normal text-text3"> / {l.priceUnit || "night"}</span>
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
