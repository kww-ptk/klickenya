"use client";

import { useState, useMemo } from "react";
import { ListingCard, type ListingCardProps } from "@/components/listings/ListingCard";
import { CityFilterBar } from "@/components/listings/CityFilterBar";

interface FeaturedListingsSectionProps {
  listings: ListingCardProps[];
  maxVisible?: number;
}

function FeaturedListingsSection({ listings, maxVisible = 8 }: FeaturedListingsSectionProps) {
  const [activeCity, setActiveCity] = useState<string | null>(null);

  // Extract unique cities with counts from the full listings array
  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) {
      const city = l.city?.trim();
      if (!city) continue;
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  }, [listings]);

  // Filter and limit
  const visible = useMemo(() => {
    const filtered = activeCity
      ? listings.filter((l) => l.city === activeCity)
      : listings;
    return filtered.slice(0, maxVisible);
  }, [listings, activeCity, maxVisible]);

  // Don't show filter if only 1 city
  const showFilter = cities.length > 1;

  return (
    <div>
      {showFilter && (
        <div className="mb-6">
          <CityFilterBar
            cities={cities}
            activeCity={activeCity}
            onCityChange={setActiveCity}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
        {visible.map((listing) => (
          <ListingCard key={listing.id} {...listing} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-center text-text2 py-12">No listings found in this city yet.</p>
      )}
    </div>
  );
}

export { FeaturedListingsSection };
