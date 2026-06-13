/**
 * POS-wide loading screen. This sits one level above /pos/[slug] so it
 * acts as the Suspense fallback for the entire POS subtree — including
 * /pos/[slug]/layout.tsx's awaits (slug → menu lookup, cookie read, staff
 * row, fetchPosMenu). That's the heaviest path on a cold start: the full
 * menu (sections + items + option groups + options, ~50–200 KB) plus
 * Vercel function spin-up.
 *
 * Repeat loads use the warm function + the localStorage menu cache and
 * barely flash this. First load of the morning gets the most value.
 */
export default function PosLoading() {
  return (
    <div className="min-h-screen bg-[#0F0D08] text-surface flex flex-col items-center justify-center px-6 py-10">
      {/* Spinner */}
      <div className="relative mb-5">
        <div className="w-14 h-14 rounded-full border-4 border-[#252019]" />
        <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-amber animate-spin" />
      </div>

      <p className="font-display text-[18px] font-bold text-white tracking-tight">
        Loading POS
      </p>
      <p className="mt-2 text-[13px] text-text3 text-center max-w-[280px] leading-snug">
        Don&apos;t worry, it&apos;s only the first time
        <span aria-hidden="true"> :)</span>
      </p>

      {/* Faded skeleton of the tables grid so the layout doesn't feel
          empty under the spinner. */}
      <div className="w-full max-w-md mt-10 grid grid-cols-3 gap-2 opacity-40 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-2xl border border-[#2A2520] bg-[#1A170F] p-3 flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="h-2.5 w-10 rounded bg-[#252019]" />
              <div className="h-4 w-14 rounded bg-[#252019]" />
            </div>
            <div className="h-2.5 w-12 rounded bg-[#252019]" />
          </div>
        ))}
      </div>
    </div>
  );
}
