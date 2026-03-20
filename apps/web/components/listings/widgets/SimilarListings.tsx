import { ListingGrid } from "@/components/listings/ListingGrid";
import type { ListingCardProps } from "@/components/listings/ListingCard";

interface SimilarListingsProps {
  listings: ListingCardProps[];
  /** Plural label, e.g. "stays", "restaurants" */
  typeLabel: string;
}

function SimilarListings({ listings, typeLabel }: SimilarListingsProps) {
  if (listings.length === 0) return null;

  return (
    <section className="mt-16 mb-8">
      <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
        Similar {typeLabel.toLowerCase()} nearby
      </h2>
      <ListingGrid listings={listings} columns={3} />
    </section>
  );
}

export { SimilarListings };
export type { SimilarListingsProps };
