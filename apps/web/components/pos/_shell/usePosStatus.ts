"use client";

import { useSyncExternalStore } from "react";
import {
  deriveStatusLevel,
  getPosStatusState,
  subscribePosStatus,
  type PosStatusLevel,
  type PosStatusState,
} from "./status";

/**
 * React hook that returns the live POS connection status.
 *
 * Wraps the module-scoped status store via `useSyncExternalStore` so any
 * mutation (fetch result, online/offline event, realtime channel state)
 * triggers a re-render in subscribed components.
 *
 * Server snapshot is the same module state — getServerSnapshot() returns
 * a known-stable initial because the store is not populated server-side.
 */
export interface PosStatusHookValue extends PosStatusState {
  level: PosStatusLevel;
}

export function usePosStatus(): PosStatusHookValue {
  const state = useSyncExternalStore(
    subscribePosStatus,
    getPosStatusState,
    getPosStatusState, // server snapshot — same shape, all defaults
  );
  return { ...state, level: deriveStatusLevel(state) };
}
