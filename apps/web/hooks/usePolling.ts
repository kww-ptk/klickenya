"use client";

import { useEffect } from "react";

/**
 * Poll `fn` every `ms` while the tab is visible, and immediately when it
 * becomes visible again.
 *
 * Every live surface here used to hand-roll its own interval, and only some
 * paused when hidden: a queue tablet left open overnight kept hitting
 * /api/menu/orders every ten seconds for nobody, and a phone coming back
 * from the pocket showed a stale list for up to a full tick.
 *
 * `fn` should be a stable reference (useCallback) or the interval restarts
 * on every render.
 */
export function usePolling(fn: () => void | Promise<void>, ms: number, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void fn();
    };
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [fn, ms, enabled]);
}
