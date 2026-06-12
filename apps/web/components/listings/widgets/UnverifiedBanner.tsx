import Link from "next/link";

interface UnverifiedBannerProps {
  listingSlug: string;
}

export function UnverifiedBanner({ listingSlug }: UnverifiedBannerProps) {
  return (
    <div className="bg-amber/10 border border-amber/25 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4 flex-col sm:flex-row">
      <div>
        <p className="font-medium text-sm text-dark">
          ⚠️ This listing hasn&apos;t been claimed yet.
        </p>
        <p className="text-xs text-text2 mt-0.5">
          Details may not be fully up to date.
        </p>
      </div>
      <Link
        href={`/claim/${encodeURIComponent(listingSlug)}`}
        className="shrink-0 bg-amber text-dark font-bold text-xs rounded-full px-4 py-2 transition-colors hover:bg-[#d4911c]"
      >
        Are you the owner? Get in touch →
      </Link>
    </div>
  );
}
