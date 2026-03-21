import Link from "next/link";
import { Check } from "lucide-react";

interface HostBadgeProps {
  hostName: string;
  isVerified?: boolean;
  listingSlug?: string;
}

function HostBadge({ hostName, isVerified, listingSlug }: HostBadgeProps) {
  const initials = hostName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between gap-4 mb-7">
      {/* Left: avatar + host info */}
      <div className="flex items-center gap-4">
        <div className="relative size-12 rounded-full bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[16px] font-bold shrink-0">
          {initials}
          {isVerified && (
            <span className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-[#16A34A] border-2 border-white flex items-center justify-center">
              <Check className="size-3 text-white" strokeWidth={3} />
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-semibold text-text">
              Hosted by {hostName}
            </p>
            {isVerified && (
              <span className="text-[11px] font-semibold text-[#16A34A]">Verified</span>
            )}
          </div>
          <p className="text-[13px] text-text2">Joined Klickenya</p>
        </div>
      </div>

      {/* Right: claim link for unverified */}
      {!isVerified && listingSlug && (
        <Link
          href={`/contact?listing=${encodeURIComponent(listingSlug)}`}
          className="shrink-0 text-[12px] font-medium text-[#E8A020] hover:text-[#d4911c] transition-colors hidden sm:block"
        >
          Are you the owner?
        </Link>
      )}
    </div>
  );
}

export { HostBadge };
export type { HostBadgeProps };
