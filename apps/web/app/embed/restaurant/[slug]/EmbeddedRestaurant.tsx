"use client";

import { useEffect, useState } from "react";
import type { MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuWithFilters } from "@/components/menu/MenuWithFilters";
import {
  ReservationSheet,
  type RestaurantArea,
} from "@/components/reservations/ReservationSheet";

interface ReservationsConfig {
  menuId: string;
  menuName: string;
  areas: RestaurantArea[];
  timeWindows: Array<{ open_time: string; close_time: string; is_active?: boolean }>;
  maxPartySize: number;
  maxAdvanceDays: number;
  leadTimeHours: number;
  restaurantPhone: string | null;
  sourceOrigin: string | null;
  sourceRef: string | null;
}

interface EmbeddedRestaurantProps {
  menuName: string;
  sections: MenuSection[];
  showMenu: boolean;
  showReservations: boolean;
  reservationsConfig: ReservationsConfig | null;
  theme: "light" | "dark";
  /** CSS color (with #) */
  accent: string;
  /** CSS color string or "transparent" or "white" */
  background: string;
}

/**
 * Client wrapper for the combo restaurant embed.
 *
 * Layout decisions:
 * - On wide iframes (≥720px) menu and reservations sit side-by-side.
 * - Below that the booking widget collapses into a sticky button at the top
 *   that opens the ReservationSheet dialog — same UX as the /m/[slug] page.
 *   This keeps menu items above the fold on phones where the form would
 *   otherwise dominate.
 *
 * postMessage height bridge included so picky parents can auto-resize.
 */
export function EmbeddedRestaurant({
  menuName,
  sections,
  showMenu,
  showReservations,
  reservationsConfig,
  theme,
  accent,
  background,
}: EmbeddedRestaurantProps) {
  // Wide-iframe detection — opt-in side-by-side layout. We watch viewport
  // width inside the iframe (the parent's outer size doesn't matter for our
  // own layout decision).
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsWide(window.innerWidth >= 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // postMessage height bridge — same shape as the other embeds.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const send = () => {
      window.parent.postMessage(
        { type: "klickenya:resize", height: document.documentElement.scrollHeight },
        "*",
      );
    };
    send();
    const observer = new ResizeObserver(send);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  const cssVars = { "--klickenya-accent": accent } as React.CSSProperties;

  return (
    <div
      style={{
        ...cssVars,
        background,
        minHeight: "100vh",
        padding: "16px",
        margin: 0,
      }}
      data-theme={theme}
    >
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark">
          {menuName}
        </h1>
        {/* On narrow iframes the booking widget collapses into a CTA up here. */}
        {showReservations && reservationsConfig && !isWide && (
          <ReservationSheet
            menuId={reservationsConfig.menuId}
            menuName={reservationsConfig.menuName}
            source="embed"
            sourceOrigin={reservationsConfig.sourceOrigin}
            sourceRef={reservationsConfig.sourceRef}
            timeWindows={reservationsConfig.timeWindows}
            areas={reservationsConfig.areas}
            maxPartySize={reservationsConfig.maxPartySize}
            maxAdvanceDays={reservationsConfig.maxAdvanceDays}
            leadTimeHours={reservationsConfig.leadTimeHours}
            restaurantPhone={reservationsConfig.restaurantPhone}
            triggerLabel="Book a table"
          />
        )}
      </header>

      <div
        className={
          isWide && showReservations && reservationsConfig && showMenu
            ? "grid grid-cols-[1fr_320px] gap-6"
            : ""
        }
      >
        {showMenu && (
          <div className="min-w-0">
            <MenuWithFilters sections={sections} />
          </div>
        )}

        {/* Wide iframe: inline booking widget in the right rail. */}
        {showReservations && reservationsConfig && isWide && (
          <aside className="shrink-0">
            <div className="sticky top-4 rounded-2xl border border-border bg-white shadow-sm">
              <ReservationSheet
                menuId={reservationsConfig.menuId}
                menuName={reservationsConfig.menuName}
                source="embed"
                sourceOrigin={reservationsConfig.sourceOrigin}
                sourceRef={reservationsConfig.sourceRef}
                timeWindows={reservationsConfig.timeWindows}
                areas={reservationsConfig.areas}
                maxPartySize={reservationsConfig.maxPartySize}
                maxAdvanceDays={reservationsConfig.maxAdvanceDays}
                leadTimeHours={reservationsConfig.leadTimeHours}
                restaurantPhone={reservationsConfig.restaurantPhone}
                inline
              />
            </div>
          </aside>
        )}
      </div>

      <p
        style={{
          marginTop: 16,
          textAlign: "center",
          fontSize: 11,
          color: "#9C9485",
        }}
      >
        Powered by{" "}
        <a
          href="https://klickenya.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: accent, textDecoration: "none", fontWeight: 600 }}
        >
          Klickenya
        </a>
      </p>
    </div>
  );
}
