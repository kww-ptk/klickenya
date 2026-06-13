"use client";

import { useEffect, useState } from "react";
import { usePosStatus } from "./_shell/usePosStatus";

/**
 * Small connection-status chip that lives in the POS header.
 *
 * - Coloured dot + short label (Online / Slow / Offline)
 * - Tap to toggle a popover with last-sync time, latency, and realtime status
 * - Pure information — never blocks any action. Stage 2 will wire the offline
 *   queue to this same status; for now we just surface state.
 */
export function PosStatusChip() {
  const status = usePosStatus();
  const [open, setOpen] = useState(false);

  const dot =
    status.level === "green" ? "bg-emerald-400" :
    status.level === "amber" ? "bg-amber"   :
                               "bg-[#FF6B6B]";
  const label =
    status.level === "green" ? "Online" :
    status.level === "amber" ? "Slow"   :
                               "Offline";

  // Refresh the relative time once a second while popover is open.
  // Avoids calling Date.now() during render (impure) — see usePopoverNow.
  const now = usePopoverNow(open);
  const lastSync = status.lastFetchOkAt
    ? formatRelativeTime(now - status.lastFetchOkAt)
    : "never";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-3 rounded-full bg-[#252019] hover:bg-[#3A342B] flex items-center gap-1.5 text-[11px] font-semibold text-surface"
        aria-label={`Connection status: ${label}`}
        aria-expanded={open}
      >
        <span className={`w-2 h-2 rounded-full ${dot} ${status.level === "green" ? "" : "animate-pulse"}`} />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open && (
        <>
          {/* invisible scrim closes popover on outside-tap */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-[220px] rounded-xl border border-[#2A2520] bg-[#1A170F] shadow-2xl p-3 space-y-1.5">
            <Row label="Connection" value={label} />
            <Row label="Last sync" value={lastSync} />
            <Row
              label="Latency"
              value={status.lastFetchMs != null ? `${Math.round(status.lastFetchMs)} ms` : "—"}
            />
            <Row label="Realtime" value={prettyRealtime(status.realtime)} />
            {status.consecutiveFails > 0 && (
              <Row label="Failed calls" value={String(status.consecutiveFails)} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-text3">{label}</span>
      <span className="text-[11px] font-semibold text-white">{value}</span>
    </div>
  );
}

function prettyRealtime(s: string): string {
  switch (s) {
    case "connected":     return "Live";
    case "connecting":    return "Connecting…";
    case "disconnected":  return "Disconnected";
    case "idle":
    default:              return "Idle";
  }
}

/** Returns a Date.now() snapshot that updates once a second while `open`,
 *  and stays frozen otherwise. Keeps the render pure — Date.now() is only
 *  invoked inside the interval callback, never at render time. The initial
 *  tick is deferred via a 0-ms timeout so the effect body itself never calls
 *  setState. */
function usePopoverNow(open: boolean): number {
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setNow(Date.now()), 0);
    const i = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [open]);
  return now;
}

function formatRelativeTime(ms: number): string {
  if (ms < 1_000) return "just now";
  const s = Math.round(ms / 1_000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}
