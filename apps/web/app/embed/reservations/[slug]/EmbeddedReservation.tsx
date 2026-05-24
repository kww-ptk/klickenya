"use client";

import { useEffect, useRef } from "react";
import {
  ReservationSheet,
  type RestaurantArea,
} from "@/components/reservations/ReservationSheet";

interface EmbeddedReservationProps {
  menuId: string;
  menuName: string;
  areas: RestaurantArea[];
  timeWindows: Array<{ open_time: string; close_time: string; is_active?: boolean }>;
  maxPartySize: number;
  maxAdvanceDays: number;
  leadTimeHours: number;
  sourceOrigin: string | null;
  sourceRef: string | null;
  theme: "light" | "dark";
  /** CSS color string, e.g. "#E8A020" */
  accent: string;
  /** CSS color string or "transparent" or "white" */
  background: string;
}

export function EmbeddedReservation({
  menuId,
  menuName,
  areas,
  timeWindows,
  maxPartySize,
  maxAdvanceDays,
  leadTimeHours,
  sourceOrigin,
  sourceRef,
  theme,
  accent,
  background,
}: EmbeddedReservationProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // ── postMessage height auto-resize ──────────────────────────────────────
  // Parent iframe can listen for { type: "klickenya:resize", height }
  // messages and update its iframe.style.height. Most embedders won't bother,
  // but for those who do this lets the form grow as the user expands fields.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage(
        { type: "klickenya:resize", height },
        "*",
      );
    };

    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  // CSS custom properties drive the themable colors. The reservation form's
  // accent classes (bg-amber, text-amber) still apply — for V1 we only theme
  // the outer container background; full accent override is a follow-up.
  const cssVars = {
    "--klickenya-accent": accent,
    "--klickenya-bg": background,
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      style={{
        ...cssVars,
        background: background,
        minHeight: "100vh",
        padding: "16px",
        // Reset margins the root layout might inherit.
        margin: 0,
      }}
      data-theme={theme}
    >
      <ReservationSheet
        menuId={menuId}
        menuName={menuName}
        source="embed"
        sourceOrigin={sourceOrigin}
        sourceRef={sourceRef}
        areas={areas}
        timeWindows={timeWindows}
        maxPartySize={maxPartySize}
        maxAdvanceDays={maxAdvanceDays}
        leadTimeHours={leadTimeHours}
        inline
      />

      {/* Powered-by attribution — free growth channel, common pattern */}
      <p style={{
        marginTop: 12,
        textAlign: "center",
        fontSize: 11,
        color: theme === "dark" ? "#9C9485" : "#9C9485",
      }}>
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
