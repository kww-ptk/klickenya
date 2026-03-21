import Link from "next/link";

interface UnverifiedBannerProps {
  listingSlug: string;
}

export function UnverifiedBanner({ listingSlug }: UnverifiedBannerProps) {
  return (
    <div className="bg-[#E8A020]/10 border border-[#E8A020]/25 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4 flex-col sm:flex-row">
      <div>
        <p className="font-medium text-sm text-[#16130C]">
          ⚠️ This listing hasn&apos;t been claimed yet.
        </p>
        <p className="text-xs text-[#5E5848] mt-0.5">
          Details may not be fully up to date.
        </p>
      </div>
      <Link
        href={`/contact?listing=${encodeURIComponent(listingSlug)}`}
        className="shrink-0 bg-[#E8A020] text-[#16130C] font-bold text-xs rounded-full px-4 py-2 transition-colors hover:bg-[#d4911c]"
      >
        Are you the owner? Get in touch →
      </Link>
    </div>
  );
}
