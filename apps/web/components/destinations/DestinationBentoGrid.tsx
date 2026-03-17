import Link from "next/link";

interface DestinationDisplay {
  name: string;
  slug: string;
  tagline: string;
  tag?: string;
  color: string;
  imageUrl?: string;
}

interface DestinationBentoGridProps {
  destinations: DestinationDisplay[];
  currentSlug?: string;
}

const DESTINATION_COLORS = [
  "#6B4E3D",
  "#2D6B7A",
  "#3D5A3E",
  "#8B6B4E",
  "#4A5E6B",
];

const PLACEHOLDER_DESTINATIONS: DestinationDisplay[] = [
  {
    name: "Watamu",
    slug: "watamu",
    tagline: "Kenya's most beautiful beach town",
    tag: "Marine Park \u00b7 Turtles \u00b7 Coral reef",
    color: "#6B4E3D",
  },
  {
    name: "Kilifi",
    slug: "kilifi",
    tagline: "Kenya's best-kept secret",
    tag: "Creek \u00b7 Bioluminescence \u00b7 Bohemian vibes",
    color: "#2D6B7A",
  },
  {
    name: "Diani Beach",
    slug: "diani",
    tagline: "The perfect white sand escape",
    tag: "Beach \u00b7 Water sports \u00b7 Nightlife",
    color: "#3D5A3E",
  },
  {
    name: "Nairobi",
    slug: "nairobi",
    tagline: "The city that never stops",
    tag: "Safari \u00b7 Food scene \u00b7 Culture",
    color: "#8B6B4E",
  },
  {
    name: "Lamu",
    slug: "lamu",
    tagline: "Step back in time",
    tag: "UNESCO \u00b7 Swahili culture \u00b7 Dhow sailing",
    color: "#4A5E6B",
  },
];

function DestinationBentoGrid({
  destinations,
  currentSlug,
}: DestinationBentoGridProps) {
  // Merge fetched data with placeholders
  const merged: DestinationDisplay[] = PLACEHOLDER_DESTINATIONS.map(
    (placeholder, i) => {
      const match = destinations.find((d) => d.slug === placeholder.slug);
      return match
        ? {
            name: match.name,
            slug: match.slug,
            tagline: match.tagline || placeholder.tagline,
            tag: placeholder.tag,
            color: DESTINATION_COLORS[i % DESTINATION_COLORS.length],
            imageUrl: match.imageUrl,
          }
        : {
            ...placeholder,
            color: DESTINATION_COLORS[i % DESTINATION_COLORS.length],
          };
    }
  );

  // Filter out current destination if provided
  const filtered = currentSlug
    ? merged.filter((d) => d.slug !== currentSlug)
    : merged;

  // Take up to 5 for full bento, or 4 if one was filtered out
  const items = filtered.slice(0, currentSlug ? 4 : 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-[260px_200px] gap-4">
      {items.map((dest, i) => {
        // When showing 5 items: 0 = 2x2, 1 = 1x2, rest = 1x1
        // When showing 4 items: 0 = 2x2, rest = 1x1 (no row-span-2 for index 1)
        const gridClass =
          i === 0
            ? "md:col-span-2 md:row-span-2"
            : i === 1 && items.length === 5
              ? "md:row-span-2"
              : "";

        return (
          <Link
            key={dest.name}
            href={`/destinations/${dest.slug}`}
            className={`relative rounded-[24px] overflow-hidden group min-h-[200px] ${gridClass}`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundColor: dest.color,
                backgroundImage: dest.imageUrl
                  ? `url(${dest.imageUrl})`
                  : undefined,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-white font-semibold text-[18px] leading-tight">
                {dest.name}
              </h3>
              <p className="text-white/60 text-[13px] mt-1">{dest.tagline}</p>
              {dest.tag && (
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-[8px] text-[11px] font-medium text-white/80">
                  {dest.tag}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export { DestinationBentoGrid, PLACEHOLDER_DESTINATIONS, DESTINATION_COLORS };
export type { DestinationDisplay, DestinationBentoGridProps };
