/**
 * Status store for the POS terminal.
 *
 * A tiny module-scoped store with a subscriber list. Updated by:
 *   - `posFetch` — records success/failure + latency on every API call
 *   - the realtime subscription helpers — record CONNECTED / DISCONNECTED
 *   - browser online/offline events (wired in PosShellProvider)
 *
 * Read by `usePosStatus()` which subscribes to changes and re-renders.
 *
 * Status rules (Stage 1):
 *   green  — online + ≥1 successful fetch in the last 30s + realtime healthy
 *   amber  — last fetch took >3s, OR realtime heartbeat >15s ago
 *   red    — navigator.offline, OR last 2 consecutive fetches failed,
 *            OR realtime disconnected for >20s
 */

export type PosStatusLevel = "green" | "amber" | "red";
export type RealtimeStatus = "connected" | "connecting" | "disconnected" | "idle";

export interface PosStatusState {
  online:           boolean;
  lastFetchAt:      number | null;          // unix ms
  lastFetchOkAt:    number | null;
  lastFetchMs:      number | null;          // latency
  consecutiveFails: number;
  realtime:         RealtimeStatus;
  realtimeHeartbeatAt: number | null;
}

const initialState: PosStatusState = {
  online:               typeof navigator === "undefined" ? true : navigator.onLine,
  lastFetchAt:          null,
  lastFetchOkAt:        null,
  lastFetchMs:          null,
  consecutiveFails:     0,
  realtime:             "idle",
  realtimeHeartbeatAt:  null,
};

let state: PosStatusState = { ...initialState };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getPosStatusState(): PosStatusState {
  return state;
}

export function subscribePosStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/* ── Mutations (called by posFetch / realtime helpers) ──────────────────────── */

export function recordFetchSuccess(latencyMs: number) {
  state = {
    ...state,
    lastFetchAt:      Date.now(),
    lastFetchOkAt:    Date.now(),
    lastFetchMs:      latencyMs,
    consecutiveFails: 0,
  };
  emit();
}

export function recordFetchFailure() {
  state = {
    ...state,
    lastFetchAt:      Date.now(),
    consecutiveFails: state.consecutiveFails + 1,
  };
  emit();
}

export function setOnline(online: boolean) {
  if (state.online === online) return;
  state = { ...state, online };
  emit();
}

export function setRealtimeStatus(rt: RealtimeStatus) {
  state = {
    ...state,
    realtime:            rt,
    realtimeHeartbeatAt: rt === "connected" ? Date.now() : state.realtimeHeartbeatAt,
  };
  emit();
}

export function recordRealtimeHeartbeat() {
  state = { ...state, realtimeHeartbeatAt: Date.now() };
  emit();
}

/* ── Derive a simple status level for the chip ──────────────────────────────── */

const SLOW_FETCH_MS = 3_000;
const STALE_RT_MS   = 15_000;
const DEAD_RT_MS    = 20_000;

export function deriveStatusLevel(s: PosStatusState): PosStatusLevel {
  if (!s.online) return "red";
  if (s.consecutiveFails >= 2) return "red";

  if (s.realtime === "disconnected" && s.realtimeHeartbeatAt &&
      Date.now() - s.realtimeHeartbeatAt > DEAD_RT_MS) {
    return "red";
  }

  if (s.lastFetchMs != null && s.lastFetchMs > SLOW_FETCH_MS) return "amber";

  if (s.realtime !== "idle" && s.realtime !== "connected" &&
      s.realtimeHeartbeatAt && Date.now() - s.realtimeHeartbeatAt > STALE_RT_MS) {
    return "amber";
  }

  return "green";
}
