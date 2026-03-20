import { Check } from "lucide-react";

interface AmenitiesListProps {
  amenities: string[];
  /** Override the section heading. Defaults to "What this place offers". */
  heading?: string;
}

function AmenitiesList({
  amenities,
  heading = "What this place offers",
}: AmenitiesListProps) {
  if (amenities.length === 0) return null;

  return (
    <div className="mb-7">
      <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-5">
        {heading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
        {amenities.map((amenity) => (
          <div
            key={amenity}
            className="flex items-center gap-3 text-[14.5px] text-text2"
          >
            <Check className="size-4 text-amber shrink-0" />
            <span>{amenity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { AmenitiesList };
export type { AmenitiesListProps };
