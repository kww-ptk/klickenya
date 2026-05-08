"use client";

import { useCallback, useRef } from "react";

/**
 * Pointer-drag hook for the floor-map editor.
 *
 * Native pointer events — no react-dnd dependency. Touch and mouse share the
 * same pointer pipeline so iPad behaves the same as a desktop browser.
 *
 * Touch UX guard: a 200 ms long-press threshold so accidental finger taps on
 * a tile don't move it. Mouse drags fire immediately.
 *
 * The hook is canvas-relative: callers pass a ref to the canvas element, and
 * the hook converts client pointer coordinates into percent-of-canvas. That
 * keeps the layout responsive — tiles stay positioned correctly across phone
 * / tablet / desktop without recomputing on resize.
 */

export interface DragHandlers {
  /** Bind to the draggable tile element. */
  onPointerDown: (e: React.PointerEvent) => void;
}

interface Options {
  /** Ref to the canvas element (the percentage origin). */
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** Disable drag entirely (e.g. live mode). */
  disabled?: boolean;
  /** Snap percent step. 2 = snap to every 2 % both axes. */
  snapPct?: number;
  /** Long-press threshold for touch — mouse ignores it. */
  touchHoldMs?: number;
  /** Fired during drag (every pointermove). */
  onMove: (pctX: number, pctY: number) => void;
  /** Fired once on pointerup IF the pointer actually moved. */
  onCommit?: (pctX: number, pctY: number) => void;
  /** Fired on pointerdown without drag (i.e. a real tap). */
  onTap?: () => void;
}

export function usePointerDrag({
  canvasRef,
  disabled,
  snapPct = 2,
  touchHoldMs = 200,
  onMove,
  onCommit,
  onTap,
}: Options): DragHandlers {
  // Active drag state — null while idle.
  const stateRef = useRef<{
    pointerId: number;
    startedAt: number;
    moved: boolean;
    armed: boolean;       // touch only: becomes true after the hold timer fires
    lastPct: { x: number; y: number };
  } | null>(null);
  const holdTimerRef = useRef<number | null>(null);

  const clearHold = () => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const computePct = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return null;
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;
      // Snap + clamp to [0, 100]
      const x = Math.min(100, Math.max(0, Math.round(rawX / snapPct) * snapPct));
      const y = Math.min(100, Math.max(0, Math.round(rawY / snapPct) * snapPct));
      return { x, y };
    },
    [canvasRef, snapPct],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      // Right-click / middle-click ignored. Pointer types: mouse | touch | pen.
      if (e.button !== undefined && e.button !== 0) return;
      e.stopPropagation();

      const isTouch = e.pointerType === "touch";
      stateRef.current = {
        pointerId: e.pointerId,
        startedAt: performance.now(),
        moved: false,
        armed: !isTouch,
        lastPct: { x: -1, y: -1 },
      };

      // Capture so move/up keep firing even when the pointer leaves the tile.
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture?.(e.pointerId);

      if (isTouch) {
        clearHold();
        holdTimerRef.current = window.setTimeout(() => {
          if (stateRef.current && stateRef.current.pointerId === e.pointerId) {
            stateRef.current.armed = true;
            // Subtle haptic-style affordance: tile transform is owned by the
            // caller (via FloorTile's data-armed attribute). The hook just
            // unblocks onMove from this point forward.
          }
        }, touchHoldMs);
      }

      const onPointerMove = (ev: PointerEvent) => {
        const s = stateRef.current;
        if (!s || s.pointerId !== ev.pointerId || !s.armed) return;
        const pct = computePct(ev.clientX, ev.clientY);
        if (!pct) return;
        if (pct.x === s.lastPct.x && pct.y === s.lastPct.y) return;
        s.lastPct = pct;
        s.moved = true;
        onMove(pct.x, pct.y);
      };

      const onPointerUp = (ev: PointerEvent) => {
        const s = stateRef.current;
        if (!s || s.pointerId !== ev.pointerId) return;
        clearHold();
        target.releasePointerCapture?.(ev.pointerId);
        stateRef.current = null;

        if (s.moved && onCommit) {
          onCommit(s.lastPct.x, s.lastPct.y);
        } else if (!s.moved && onTap) {
          onTap();
        }
        target.removeEventListener("pointermove", onPointerMove);
        target.removeEventListener("pointerup", onPointerUp);
        target.removeEventListener("pointercancel", onPointerUp);
      };

      target.addEventListener("pointermove", onPointerMove);
      target.addEventListener("pointerup", onPointerUp);
      target.addEventListener("pointercancel", onPointerUp);
    },
    [disabled, touchHoldMs, computePct, onMove, onCommit, onTap],
  );

  return { onPointerDown };
}
