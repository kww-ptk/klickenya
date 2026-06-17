"use client";

import { useEffect } from "react";
import type { MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuWithFilters } from "@/components/menu/MenuWithFilters";

interface EmbeddedMenuProps {
  menuName: string;
  sections: MenuSection[];
  theme: "light" | "dark";
  /** CSS color (already prefixed with #) */
  accent: string;
  /** CSS color string or "transparent" or "white" */
  background: string;
}

/**
 * Client wrapper for the menu embed. Mounts MenuWithFilters and:
 *   1. Sends postMessage height updates so picky embedders can auto-resize
 *      their iframe (parents that don't listen still get a fixed-height
 *      iframe based on the snippet's `height` attribute).
 *   2. Applies theme CSS variables on the root container.
 *
 * Listening side (for embedders who want auto-resize):
 *   window.addEventListener("message", (e) => {
 *     if (e.data?.type === "klickenya:resize") {
 *       document.querySelector("iframe[src*='klickenya.com/embed']")
 *         .style.height = e.data.height + "px";
 *     }
 *   });
 */
export function EmbeddedMenu({
  menuName,
  sections,
  theme,
  accent,
  background,
}: EmbeddedMenuProps) {
  // postMessage height bridge — same shape as the reservations embed so
  // owners can use one listener for both widgets.
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

  const cssVars = {
    "--klickenya-accent": accent,
  } as React.CSSProperties;

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
      <header className="mb-4">
        <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark">
          {menuName}
        </h1>
      </header>

      <MenuWithFilters sections={sections} />

      {/* Powered-by attribution — same as reservations embed. Free growth
          channel, common pattern. Can be hidden behind a paid white-label
          tier later. */}
      <p
        style={{
          marginTop: 16,
          textAlign: "center",
          fontSize: 11,
          color: "#9C9485",
        }}
      >
        Menu powered by{" "}
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
