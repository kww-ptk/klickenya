"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FloorTile, type FloorTileData, type TileState } from "./FloorTile";
import { FloorMapPicker, type PickerArea } from "./FloorMapPicker";

/* ── Public types ──────────────────────────────────── */

/** Caller-side row shape — same projection getTablesForMenu returns. */
export interface FloorMapTableRow {
  id:            string;
  table_number:  string;
  capacity:      number;
  pos_x:         number | null;
  pos_y:         number | null;
  area_id:       string | null;
  is_active:     boolean;
}

export interface FloorMapArea {
  id:        string;
  name:      string;
  color_hex: string | null;
}

/** Live-state lookup: id → state. Caller keeps this updated via polling. */
export type StateLookup = (tableId: string) => TileState;

interface Props {
  /** All active areas for this menu — must include color_hex. */
  areas:      FloorMapArea[];
  /** All tables (any area). The canvas filters by selected area itself. */
  tables:     FloorMapTableRow[];
  /** "edit" enables drag + Save; "live" enables tap + auto-poll layout from caller. */
  mode:       "edit" | "live";
  /** Live-mode only: state per tile id. Defaults to "available" if absent. */
  getState?:  StateLookup;
  /** Live-mode only: tap a tile. */
  onTileTap?: (tableId: string) => void;
  /** Edit-mode only: persist a save. Returns true on success. */
  onSavePositions?: (
    positions: Array<{ id: string; pos_x: number; pos_y: number }>,
  ) => Promise<boolean>;
  /** Optional pre-selected area id; defaults to first area. */
  defaultAreaId?: string;
}

/* ── Auto-arrange ─────────────────────────────────── */
//
// Places tiles with no pos_x/pos_y in a 4-column grid, biggest tables
// first. Used both for first-time editor empty-state and as a "Reset
// positions" fallback. Positions are within the area canvas, percent.

function autoArrange(rows: FloorMapTableRow[]): Map<string, { x: number; y: number }> {
  const sorted = [...rows].sort((a, b) => b.capacity - a.capacity || a.table_number.localeCompare(b.table_number));
  const cols = 4;
  const colStep = 100 / (cols + 1); // 20%, 40%, 60%, 80%
  const rowStep = 18;                // ~5 rows fit in 100% with margin
  const out = new Map<string, { x: number; y: number }>();
  sorted.forEach((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out.set(t.id, {
      x: Math.round((col + 1) * colStep),
      y: Math.round(8 + row * rowStep),
    });
  });
  return out;
}

/* ── Component ─────────────────────────────────────── */

export function FloorMapCanvas({
  areas,
  tables,
  mode,
  getState,
  onTileTap,
  onSavePositions,
  defaultAreaId,
}: Props) {
  /* Selected area */
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(
    defaultAreaId ?? areas[0]?.id ?? null,
  );
  const selectedArea = useMemo(
    () => areas.find((a) => a.id === selectedAreaId) ?? null,
    [areas, selectedAreaId],
  );

  /* Active tables for the selected area. We include unassigned (area_id = null)
     when there's no selected area or there's only one area, so a single-area
     restaurant isn't blocked by missing area_id values. */
  const visibleTables = useMemo(() => {
    if (!selectedAreaId) return tables.filter((t) => t.is_active);
    return tables.filter(
      (t) =>
        t.is_active &&
        (t.area_id === selectedAreaId ||
          // Single-area listings often haven't set area_id — show them anyway.
          (areas.length === 1 && t.area_id == null)),
    );
  }, [tables, areas.length, selectedAreaId]);

  /* Local position state: map of id → {x, y} percent. Initialises from
     the row's pos_x/pos_y when present, else from autoArrange. Tracked
     separately so drag is optimistic. */
  const initialPositions = useMemo(() => {
    const auto = autoArrange(visibleTables);
    const out = new Map<string, { x: number; y: number }>();
    for (const t of visibleTables) {
      if (t.pos_x != null && t.pos_y != null) {
        out.set(t.id, { x: t.pos_x, y: t.pos_y });
      } else {
        out.set(t.id, auto.get(t.id) ?? { x: 50, y: 50 });
      }
    }
    return out;
  }, [visibleTables]);

  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(initialPositions);

  /* Dirty tracking: lights up the "Save layout" button. We compare to the
     original DB-backed map (tables.pos_x/pos_y), not the auto-arranged
     fallback, so an empty restaurant's first auto-arrange isn't saved
     until the owner deliberately moves something. */
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  /* Reset position + dirty state when the area or table set changes. We
     do this during render (not in useEffect) per the React docs
     "Adjusting some state when a prop changes" pattern -- avoids the
     extra render the effect-then-update path would cost. */
  const [prevInitial, setPrevInitial] = useState(initialPositions);
  if (prevInitial !== initialPositions) {
    setPrevInitial(initialPositions);
    setPositions(initialPositions);
    setDirty(false);
  }

  const handleMove = useCallback(
    (id: string, x: number, y: number) => {
      setPositions((prev) => {
        const next = new Map(prev);
        next.set(id, { x, y });
        return next;
      });
      setDirty(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!onSavePositions) return;
    setSaving(true);
    const payload = visibleTables.map((t) => {
      const p = positions.get(t.id);
      return p ? { id: t.id, pos_x: p.x, pos_y: p.y } : null;
    }).filter((x): x is { id: string; pos_x: number; pos_y: number } => x != null);
    const ok = await onSavePositions(payload);
    setSaving(false);
    if (ok) {
      setDirty(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1500);
    }
  }, [onSavePositions, visibleTables, positions]);

  const handleAutoArrange = useCallback(() => {
    setPositions(autoArrange(visibleTables));
    setDirty(true);
  }, [visibleTables]);

  /* Tiles for render */
  const canvasRef = useRef<HTMLDivElement>(null);

  const tilesForRender: FloorTileData[] = useMemo(
    () =>
      visibleTables.map((t) => {
        const p = positions.get(t.id) ?? { x: 50, y: 50 };
        const state: TileState = getState ? getState(t.id) : "available";
        return {
          id:           t.id,
          table_number: t.table_number,
          capacity:     t.capacity,
          pos_x:        p.x,
          pos_y:        p.y,
          state,
        };
      }),
    [visibleTables, positions, getState],
  );

  /* Picker area data with optional badges. In live mode we count
     available tables per area so owners glance the picker and know
     where they have capacity. */
  const pickerAreas: PickerArea[] = useMemo(() => {
    return areas.map((a) => {
      if (mode !== "live" || !getState) return { ...a };
      const inArea = tables.filter(
        (t) => t.is_active && (t.area_id === a.id || (areas.length === 1 && t.area_id == null)),
      );
      const available = inArea.filter((t) => getState(t.id) === "available").length;
      return {
        ...a,
        badge: inArea.length > 0 ? `${available}/${inArea.length}` : undefined,
      };
    });
  }, [areas, tables, mode, getState]);

  /* ── Render ─────────────────────────────────────── */

  return (
    <div className="space-y-3">
      {/* Picker (hidden when ≤1 area) */}
      <FloorMapPicker
        areas={pickerAreas}
        selectedId={selectedAreaId}
        onSelect={setSelectedAreaId}
      />

      {/* Toolbar — edit mode only */}
      {mode === "edit" && (
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={handleAutoArrange}
            className="h-10 px-4 rounded-full border border-[#E2DDD5] text-[13px] font-bold text-[#5E5848] hover:border-[#E8A020] hover:text-[#E8A020]"
          >
            Auto-arrange
          </button>
          <div className="flex-1" />
          {savedFlash && (
            <span className="text-[12px] font-semibold text-emerald-700">✓ Saved</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="h-10 px-5 rounded-full bg-[#E8A020] text-[#16130C] font-bold text-[13px] hover:bg-[#d4911c] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save layout"}
          </button>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full bg-[#FAFAF8] border border-[#E2DDD5] rounded-2xl overflow-hidden touch-none"
        style={{
          // Fixed aspect ratio so percent positions render the same on every
          // screen size. 4:3 reads well as a "floor".
          aspectRatio: "4 / 3",
          // Subtle grid hint in edit mode so dragging feels precise.
          backgroundImage:
            mode === "edit"
              ? "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)"
              : undefined,
          backgroundSize: mode === "edit" ? "5% 6.66%" : undefined,
        }}
      >
        {visibleTables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#9C9485] text-center px-6">
            No tables in this area yet. Add tables in the list below — they&apos;ll
            appear on the map.
          </div>
        ) : (
          tilesForRender.map((t) => (
            <FloorTile
              key={t.id}
              table={t}
              canvasRef={canvasRef}
              mode={mode}
              onMove={mode === "edit" ? handleMove : undefined}
              onCommit={mode === "edit" ? handleMove : undefined}
              onTap={mode === "live" ? onTileTap : undefined}
            />
          ))
        )}

        {/* Area name watermark — subtle bottom-right label so the floor
            communicates which space we're looking at. */}
        {selectedArea && (
          <span
            className="absolute bottom-2 right-3 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: selectedArea.color_hex ?? "#9C9485", opacity: 0.6 }}
          >
            {selectedArea.name}
          </span>
        )}
      </div>

      {/* Footer hint — touch UX, only in edit mode */}
      {mode === "edit" && (
        <p className="text-[11px] text-[#9C9485]">
          On a tablet, hold a tile for a moment then drag. Positions snap to a 2 % grid.
        </p>
      )}
    </div>
  );
}
