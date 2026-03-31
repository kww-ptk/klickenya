"use client";

import { useCallback, useRef } from "react";

interface TrackConfig {
  listingSlug: string;
  listingType: string;
  city?: string | null;
  hostUserId?: string | null;
}

export function useTrack(config: TrackConfig) {
  const configRef = useRef(config);
  configRef.current = config;

  const track = useCallback((eventType: string) => {
    const c = configRef.current;
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingSlug: c.listingSlug,
        listingType: c.listingType,
        city: c.city ?? null,
        hostUserId: c.hostUserId ?? null,
        eventType,
        referrer: typeof document !== "undefined" ? document.referrer : null,
      }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  return { track };
}
