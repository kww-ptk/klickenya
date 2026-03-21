"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

interface HostBadgeProps {
  hostName: string;
  isVerified?: boolean;
  listingSlug?: string;
}

function HostBadge({ hostName, isVerified, listingSlug }: HostBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const initials = hostName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mb-7">
      <div className="flex items-center justify-between gap-4">
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

        {/* Right: unverified indicator (desktop) */}
        {!isVerified && listingSlug && (
          <div
            className="relative shrink-0 hidden sm:flex items-center gap-2"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <span className="relative flex items-center justify-center size-2.5">
              <span className="absolute size-2.5 rounded-full bg-[#E8A020] animate-ping opacity-30" />
              <span className="relative size-2 rounded-full bg-gradient-to-br from-[#F5CE6E] to-[#E8A020]" />
            </span>
            <Link
              href={`/claim/${encodeURIComponent(listingSlug)}`}
              className="text-[12px] font-medium text-[#9C9485] hover:text-[#E8A020] transition-colors"
            >
              Not verified · Are you the owner?
            </Link>
            {showTooltip && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[220px] bg-[#16130C] text-white text-[11px] leading-[1.5] rounded-lg px-3 py-2 shadow-lg pointer-events-none">
                This listing has not been verified yet. Information may not be fully up to date.
                <div className="absolute -top-1 right-6 size-2 bg-[#16130C] rotate-45" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile: unverified claim link below host info */}
      {!isVerified && listingSlug && (
        <Link
          href={`/claim/${encodeURIComponent(listingSlug)}`}
          className="flex sm:hidden items-center gap-2 mt-3 ml-16 text-[12px] font-medium text-[#9C9485] active:text-[#E8A020]"
        >
          <span className="relative flex items-center justify-center size-2">
            <span className="absolute size-2 rounded-full bg-[#E8A020] animate-ping opacity-30" />
            <span className="relative size-1.5 rounded-full bg-[#E8A020]" />
          </span>
          Not verified · Are you the owner?
        </Link>
      )}
    </div>
  );
}

export { HostBadge };
export type { HostBadgeProps };
