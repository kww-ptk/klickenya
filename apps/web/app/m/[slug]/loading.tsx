/**
 * Customer-facing menu loading screen. Shown while the server resolves the
 * menu for /m/[slug] (Sanity + Supabase + sections fetch + cold-start time
 * on the first hit). Friendly first-time message reassures the guest that
 * the wait is a one-off — subsequent QR scans hit the cache and the page
 * is near-instant.
 *
 * Repeat visitors barely see this; a fresh device on a cold serverless
 * function gets the most value from it.
 */
export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 py-10">
      {/* Spinner */}
      <div className="relative mb-5">
        <div className="w-14 h-14 rounded-full border-4 border-[#E2DDD5]" />
        <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-[#E8A020] animate-spin" />
      </div>

      <p className="font-display text-[18px] font-bold text-dark tracking-tight">
        Loading menu
      </p>
      <p className="mt-2 text-[13px] text-[#5E5848] text-center max-w-[260px] leading-snug">
        Don&apos;t worry, it&apos;s only the first time
        <span aria-hidden="true"> :)</span>
      </p>

      {/* Subtle skeleton hint of menu rows beneath, so the layout doesn't
          feel empty while the spinner is up. */}
      <div className="w-full max-w-md mt-10 space-y-3 opacity-50 animate-pulse">
        <div className="h-5 w-32 rounded bg-[#E2DDD5]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E2DDD5] p-3 flex gap-3">
            <div className="w-14 h-14 rounded-lg bg-[#F4F1EC] shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-4 w-3/4 rounded bg-[#E2DDD5]" />
              <div className="h-3 w-1/2 rounded bg-[#F4F1EC]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
