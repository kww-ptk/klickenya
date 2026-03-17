import Image from "next/image";
import Link from "next/link";
import { Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  name: string;
  slug: string;
  agency?: string;
  isVerified?: boolean;
  photoUrl?: string;
  rating?: number;
  reviewCount?: number;
  specialisations?: string[];
  listingsCount?: number;
  salesCount?: number;
}

function AgentCard({
  name,
  slug,
  agency,
  isVerified,
  photoUrl,
  rating,
  reviewCount,
  specialisations,
  listingsCount,
  salesCount,
}: AgentCardProps) {
  return (
    <Link
      href={`/real-estate/agent/${slug}`}
      className="block border border-border rounded-[22px] p-6 pt-6 text-center hover:shadow-md hover:-translate-y-[3px] transition-all duration-250 cursor-pointer"
    >
      {/* Avatar */}
      <div className="relative inline-block mb-3">
        <div className="size-[72px] rounded-full overflow-hidden border-[3px] border-white shadow-[0_0_0_2px_var(--color-border)] bg-surface2">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              width={72}
              height={72}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full flex items-center justify-center text-[24px] font-bold text-text3">
              {name.charAt(0)}
            </div>
          )}
        </div>

        {/* Verified badge */}
        {isVerified && (
          <span className="absolute bottom-0.5 right-0.5 size-[22px] rounded-full bg-purple2 border-2 border-white flex items-center justify-center">
            <Check className="size-[11px] text-white" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-[15px] font-bold text-text mb-0.5">{name}</p>

      {/* Agency */}
      {agency && (
        <p className="text-[12.5px] text-text3 mb-2.5">{agency}</p>
      )}

      {/* Rating */}
      {rating != null && rating > 0 && (
        <div className="inline-flex items-center gap-1 text-[13px] font-semibold text-text mb-3">
          <Star className="size-3.5 fill-amber text-amber" />
          {rating.toFixed(1)}
          {reviewCount != null && reviewCount > 0 && (
            <span className="text-text3 font-normal">
              ({reviewCount})
            </span>
          )}
        </div>
      )}

      {/* Specialisation tags */}
      {specialisations && specialisations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {specialisations.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 rounded-full bg-purple-dim border border-purple2/18 text-[11px] font-semibold text-purple2"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex gap-0 border-t border-border pt-3.5">
        {listingsCount != null && (
          <div className="flex-1 text-center border-r border-border last:border-r-0">
            <div className="text-[16px] font-bold text-text">
              {listingsCount}
            </div>
            <div className="text-[11px] text-text3 mt-0.5">Listings</div>
          </div>
        )}
        {salesCount != null && (
          <div className="flex-1 text-center border-r border-border last:border-r-0">
            <div className="text-[16px] font-bold text-text">
              {salesCount}
            </div>
            <div className="text-[11px] text-text3 mt-0.5">Sales</div>
          </div>
        )}
        {rating != null && (
          <div className="flex-1 text-center">
            <div className="text-[16px] font-bold text-text">
              {rating.toFixed(1)}
            </div>
            <div className="text-[11px] text-text3 mt-0.5">Rating</div>
          </div>
        )}
      </div>
    </Link>
  );
}

export { AgentCard };
export type { AgentCardProps };
