"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Guided step 2 of restaurant onboarding, shown on the dashboard home once a
 * listing has been fully claimed.
 *
 * Why this exists: `reservations_enabled` lives on the `menus` row, not on the
 * listing, so the only way to switch reservations on used to be the features
 * page, which lists every feature at once (digital menu, POS, ordering, stock).
 * For a brand new host that is a wall of options at the exact moment they only
 * want one thing. This does the single thing and gets out of the way.
 *
 * The PATCH also seeds two default areas (Indoor 30, Terrace 20) and a default
 * time window server side when reservations flip false → true, so one click
 * leaves the restaurant genuinely able to take a booking rather than dropping
 * the host into an empty settings screen.
 */
export function StartReservationsCard({
  menuId,
  listingId,
  title,
  listingCity,
}: {
  menuId: string;
  listingId: string;
  title: string;
  listingCity: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          reservations_enabled: true,
          ...(listingCity ? { listing_city: listingCity } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not turn on reservations");
      }
      router.push(`/dashboard/listings/${listingId}/reservations`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div
      className="mb-5 rounded-xl lg:rounded-2xl border border-teal/20 bg-teal/[0.06] p-4 shadow-sm"
      style={{ borderLeft: "4px solid #0D7377" }}
    >
      <div className="flex items-start gap-3">
        <span className="text-[24px] shrink-0 leading-none mt-0.5">📅</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-dark">
            Start receiving reservations
          </p>
          <p className="text-[12.5px] text-text2 mt-0.5">
            Turn this on and {title} can take table bookings straight from its
            Klickenya page. We will set up two areas and your opening hours to
            begin with, and you can change them afterwards.
          </p>

          {error && (
            <p className="text-[12px] text-red-600 mt-2" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="mt-3 bg-teal text-white font-bold text-[12px] px-4 h-[36px] inline-flex items-center rounded-full hover:bg-[#0A5C5F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Turning on…" : "Turn on reservations →"}
          </button>
        </div>
      </div>
    </div>
  );
}
