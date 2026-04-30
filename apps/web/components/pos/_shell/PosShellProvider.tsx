"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  // Cached copy from localStorage, loaded once at mount. Used as a fallback
  // when the server didn't ship sections (login page) — for everything else
  // we derive sections directly from the latest serverSections prop on each
  // render so a layout refresh immediately propagates fresh menu data.
  const [cachedSections] = useState<MenuSection[]>(() => {
    if (typeof window === "undefined") return [];
    const cached = readMenuCache(menu.id);
    return cached?.sections ?? [];
  });

  // Derived state — recomputed every render. If the server has fresh data,
  // always trust it; otherwise fall back to the cached copy. No setState
  // in effects, so a router.refresh() that brings new sections is picked
  // up on the next render automatically.
  const sections =
    serverSections && serverSections.length > 0 ? serverSections : cachedSections;

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

  // Self-heal on the rare first render where the layout reported zero
  // sections but a staff cookie is present (cold-start race / Supabase
  // hiccup / stale Vercel cache). Trigger a one-shot router.refresh() so
  // the layout runs again and ships real data; the version-keyed effect
  // above adopts the result. Guarded with a ref so we don't loop on a
  // genuinely empty (unpublished) menu.
  const selfHealedRef = useRef(false);
  useEffect(() => {
    if (!staff) return;
    if (sections.length > 0) return;
    if (selfHealedRef.current) return;
    selfHealedRef.current = true;
    router.refresh();
  }, [staff, sections.length, router]);

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
