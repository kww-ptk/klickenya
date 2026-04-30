"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";
import { readMenuCache, writeMenuCache } from "./menuCache";
import { setOnline } from "./status";

/* ── Public types ───────────────────────────────────────────────────────────── */

export interface PosMenuMeta {
  id:   string;
  slug: string;
  name: string;
}

export interface PosStaff {
  id:      string;
  menu_id: string;
  name:    string;
  role:    "waiter" | "manager" | "cashier" | "kitchen";
}

export interface PosShellValue {
  menu:     PosMenuMeta;
  staff:    PosStaff | null;
  /** Full menu sections — empty on the login page (no staff signed in). */
  sections: MenuSection[];
}

const PosShellContext = createContext<PosShellValue | null>(null);

/* ── Provider ───────────────────────────────────────────────────────────────── */
//
// The server layout passes the menu identity, the (optional) staff row, and
// optionally the freshly-fetched sections. Initial render takes server data
// straight through (avoids hydration mismatch). After mount, we mirror the
// server sections to localStorage so subsequent loads have a warm cache —
// useful for Stage 3 service-worker caching down the line. Cache reads are
// not used for the *current* render: we trust the server, and we use the
// localStorage copy purely as a write-through for now.
//
// On the login page (no staff), `serverSections` is null — we don't load the
// menu at all (50–200 KB we don't need).

interface ProviderProps {
  menu:               PosMenuMeta;
  staff:              PosStaff | null;
  serverSections:     MenuSection[] | null;
  serverMenuVersion:  string | null;
  children:           React.ReactNode;
}

export function PosShellProvider({
  menu,
  staff,
  serverSections,
  serverMenuVersion,
  children,
}: ProviderProps) {
  // Lazy initialiser runs once at mount only — no setState-in-effect.
  // Prefers server-supplied sections, falls back to cached copy if the server
  // didn't ship any (only happens on routes where staff is null, which is the
  // login page — no rendering of menu there).
  const [sections] = useState<MenuSection[]>(() => {
    if (serverSections && serverSections.length > 0) return serverSections;
    if (typeof window === "undefined") return [];
    const cached = readMenuCache(menu.id);
    return cached?.sections ?? [];
  });

  // Mirror server sections to localStorage as a side-effect. This is the
  // write-through cache — keeps the cached copy in sync with the latest
  // version stamp the server reports. No state change, no cascading renders.
  useEffect(() => {
    if (!staff || !serverSections || !serverMenuVersion) return;
    const cached = readMenuCache(menu.id);
    if (!cached || cached.version !== serverMenuVersion) {
      writeMenuCache({
        menuId:   menu.id,
        version:  serverMenuVersion,
        sections: serverSections,
      });
    }
  }, [menu.id, staff, serverSections, serverMenuVersion]);

  // Online/offline event listeners feed the status store.
  useEffect(() => {
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const value = useMemo<PosShellValue>(
    () => ({ menu, staff, sections }),
    [menu, staff, sections],
  );

  return <PosShellContext.Provider value={value}>{children}</PosShellContext.Provider>;
}

/* ── Hook ───────────────────────────────────────────────────────────────────── */

export function usePosShell(): PosShellValue {
  const ctx = useContext(PosShellContext);
  if (!ctx) {
    throw new Error("usePosShell must be used within <PosShellProvider>");
  }
  return ctx;
}

// NOTE: do NOT re-export computeMenuVersion from this "use client" file —
// the server layout calls it, and Next.js 16 forbids servers from calling
// functions exported by client modules. Import it from "./menuCache" instead.
