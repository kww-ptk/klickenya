import Link from "next/link";

/**
 * /eat/stats — placeholder. Cross-restaurant analytics will land here.
 *
 * For now we punt to the legacy /dashboard/stats which already aggregates
 * across listings. When eat moves to its own subdomain, this becomes the
 * canonical stats home and the redirect flips direction.
 */
export default function EatStatsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
          Stats
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-0.5">
          Cross-restaurant analytics — coming to eat soon.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
        <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
          Using the legacy stats page for now
        </p>
        <p className="text-[13px] text-[#9C9485] mb-4 max-w-[320px] mx-auto">
          The full analytics view lives at /dashboard/stats. We&apos;ll fold it into eat
          once the IA settles.
        </p>
        <Link
          href="/dashboard/stats"
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
        >
          Open /dashboard/stats →
        </Link>
      </div>
    </div>
  );
}
