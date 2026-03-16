import { cn } from "@/lib/utils";
import { ListingCard, type ListingCardProps } from "./ListingCard";

interface ListingGridProps {
  listings: ListingCardProps[];
  columns?: 2 | 3 | 4 | "auto";
  gap?: "sm" | "md" | "lg";
  className?: string;
}

const colClasses = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  auto: "grid-cols-[repeat(auto-fill,minmax(260px,1fr))]",
};

const gapClasses = {
  sm: "gap-4",
  md: "gap-x-[22px] gap-y-7",
  lg: "gap-8",
};

function ListingGrid({
  listings,
  columns = "auto",
  gap = "md",
  className,
}: ListingGridProps) {
  return (
    <div className={cn("grid", colClasses[columns], gapClasses[gap], className)}>
      {listings.map((listing) => (
        <ListingCard key={listing.id} {...listing} />
      ))}
    </div>
  );
}

export { ListingGrid };
