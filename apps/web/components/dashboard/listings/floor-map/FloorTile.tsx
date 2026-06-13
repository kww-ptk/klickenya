"use client";

import { useRef } from "react";
import { usePointerDrag } from "./usePointerDrag";

/* ── Types ─────────────────────────────────────────── */

export type TileState =
  | "available"      // grey, no session, no soon-reservation
  | "reserved_soon"  // amber outline, reservation starts ≤30 min
  | "occupied"       // orange, open table_session
  | "billed";        // blue, session.status='billed'

export interface FloorTileData {
  id:            string;
  table_number:  string;
  capacity:      number;
  pos_x:         number;     // 0-100 (caller resolves null → auto-arrange before passing in)
  pos_y:         number;     // 0-100
  state:         TileState;
}

/* ── Sizing by capacity ────────────────────────────── */
//
// Tile grows with the party it seats. Avoids a width/height column on
// restaurant_tables in V1 — capacity already carries enough info.

function tileSizePx(capacity: number): number {
  if (capacity <= 2) return 56;
  if (capacity <= 4) return 72;
  if (capacity <= 6) return 88;
  return 104;
}

/* ── State styling ─────────────────────────────────── */
//
// Two themes:
//   light  — owner dashboard (white surface). Mirrors how PosTablesGrid
//            cards look on the dashboard's cream background.
//   dark   — POS terminal (charcoal surface). Matches the existing
//            PosTablesGrid TableCard palette so floor and list views
//            look consistent.

const STATE_CLS_LIGHT: Record<TileState, string> = {
  available:     "border-border bg-white text-text2",
  reserved_soon: "border-amber bg-white text-dark",
  occupied:      "border-amber bg-[#FCF4E5] text-dark",
  billed:        "border-sky-400 bg-sky-50 text-sky-900",
};

const STATE_CLS_DARK: Record<TileState, string> = {
  available:     "border-[#3A342B] bg-[#1A170F] text-text3",
  reserved_soon: "border-amber bg-[#1A170F] text-amber",
  occupied:      "border-amber bg-[#231D12] text-amber",
  billed:        "border-[#5BA1FF] bg-[#192034] text-sky-300",
};

/* ── Component ─────────────────────────────────────── */

interface Props {
  table:    FloorTileData;
  /** ref to the canvas; required so usePointerDrag knows the bounds. */
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** Edit mode unlocks drag; live mode unlocks tap. */
  mode:     "edit" | "live";
  /** Visual theme. Light is the owner dashboard default; dark is for the
   *  POS terminal where the surrounding chrome is charcoal. */
  theme?:   "light" | "dark";
  /** Called as the tile drags (every frame). Used for the optimistic local move. */
  onMove?:  (id: string, pctX: number, pctY: number) => void;
  /** Called on pointerup IF the tile actually moved. Used for the persistence flag. */
  onCommit?: (id: string, pctX: number, pctY: number) => void;
  /** Live mode tap handler (and edit mode "click without move"). */
  onTap?:   (id: string) => void;
}

export function FloorTile({ table, canvasRef, mode, theme = "light", onMove, onCommit, onTap }: Props) {
  const elRef = useRef<HTMLButtonElement>(null);

  const drag = usePointerDrag({
    canvasRef,
    disabled: mode !== "edit",
    onMove:   (x, y) => onMove?.(table.id, x, y),
    onCommit: (x, y) => onCommit?.(table.id, x, y),
    onTap:    () => onTap?.(table.id),
  });

  const size = tileSizePx(table.capacity);
  const stateCls = (theme === "dark" ? STATE_CLS_DARK : STATE_CLS_LIGHT)[table.state];

  return (
    <button
      ref={elRef}
      type="button"
      // Live mode taps fire the click handler directly; edit mode taps go via
      // usePointerDrag (because pointerdown captures and calls preventDefault).
      onClick={mode === "live" ? () => onTap?.(table.id) : undefined}
      onPointerDown={drag.onPointerDown}
      aria-label={`Table ${table.table_number}, ${table.capacity} covers, ${table.state.replace("_", " ")}`}
      className={[
        "absolute select-none touch-none",
        // Tile colour by state
        stateCls,
        // Border + radius. Square tiles read better on a tablet at distance
        // than rounded "pills". Slightly rounded so they don't look rigid.
        "border-2 rounded-xl shadow-sm",
        // Stack info vertically so capacity number reads under the table number
        "flex flex-col items-center justify-center gap-0.5",
        "font-semibold leading-none",
        // Mode polish: in edit mode add a subtle reposition cursor; in live
        // mode show the click affordance.
        mode === "edit"
          ? "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-amber/60"
          : "cursor-pointer hover:shadow-md hover:scale-[1.03] transition-transform",
      ].join(" ")}
      style={{
        width:  size,
        height: size,
        left:   `${table.pos_x}%`,
        top:    `${table.pos_y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <span className="text-[14px]">{table.table_number}</span>
      <span className="text-[10px] opacity-70">{table.capacity} pax</span>
    </button>
  );
}
