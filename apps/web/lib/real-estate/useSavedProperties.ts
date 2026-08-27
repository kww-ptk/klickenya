"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Saved properties, per device.
 *
 * The card's heart used to be a decorative <div> nested inside the card's <a> —
 * clicking it just navigated. Property portals are browsed logged-out, so this
 * keeps saves in localStorage rather than gating them behind an account. The
 * `saved_listings` Supabase table is deliberately untouched: it is keyed to
 * `listing` documents and the /profile saved tab resolves those ids as
 * listings, so writing property ids into it would break that page.
 */

const STORAGE_KEY = "klickenya:saved-properties";

let cache: string[] = [];
let cacheKey = "";
const listeners = new Set<() => void>();

function read(): string[] {
  if (typeof window === "undefined") return [];
  let raw = "";
  try {
    raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return [];
  }
  // useSyncExternalStore compares snapshots by reference, so hand back the same
  // array until the serialised value actually changes.
  if (raw === cacheKey) return cache;
  cacheKey = raw;
  try {
    const parsed = JSON.parse(raw || "[]");
    cache = Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* private mode / quota — saves simply don't persist */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const EMPTY: string[] = [];

export function useSavedProperties() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id)
      ? current.filter((v) => v !== id)
      : [...current, id];
    write(next);
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  return { savedIds: ids, toggle, isSaved };
}
