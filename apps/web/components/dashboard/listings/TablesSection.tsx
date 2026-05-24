"use client";

import { useCallback, useState } from "react";
import { TableSetup } from "@/components/dashboard/menu/TableSetup";
import { FloorMapCanvas, type FloorMapTableRow } from "@/components/dashboard/listings/floor-map/FloorMapCanvas";

/**
 * Shape that TableSetup emits from its internal state — strict subset of
 * InitialTable (no pos_x/pos_y/area_id, since the list view doesn't care
 * about positions). We merge these back onto our floor-map state by id,
 * preserving the geometry we already had for existing tables.
 */
interface TableSetupRow {
  id: string;
  table_number: string;
  capacity: number;
  floor_section: string | null;
  is_active: boolean;
}

export interface AreaOption {
  id: string;
  name: string;
  color_hex?: string | null;
}

/**
 * Subset of restaurant_tables fed to the floor-map canvas. List view doesn't
 * need pos_x/pos_y/area_id; the floor map does. floor_section is the legacy
 * text label (migration 045) — canvas falls back to it when area_id is null.
 */
export interface InitialTable {
  id:            string;
  table_number:  string;
  capacity:      number;
  pos_x:         number | null;
  pos_y:         number | null;
  area_id:       string | null;
  floor_section: string | null;
  is_active:     boolean;
}

interface TablesSectionProps {
  menuId:        string;
  areas:         AreaOption[];
  initialTables: InitialTable[];
  showToast:     (msg: string, type?: "success" | "error") => void;
  /**
   * Optional override for the section heading. Defaults to "Tables".
   * Reservations dashboard renders this inside its Floor tab, where the tab
   * label already says "Floor", so a different heading reads better.
   */
  heading?: string;
  /**
   * Optional override for the list-mode explanatory subtitle.
   */
  listSubtitle?: string;
}

/**
 * Shared tables editor — List view (TableSetup CRUD) + Floor map view
 * (FloorMapCanvas in edit mode with drag-to-position).
 *
 * Origin: extracted from /dashboard/listings/[id]/orders/TableOrderingClient.tsx.
 * Same logic, no behaviour change — just exported so the Reservations dashboard
 * Floor tab can reuse it for full add/arrange capability instead of being
 * stuck in read-only mode.
 *
 * View choice is persisted to localStorage so each owner lands on their
 * preferred view next session.
 */
export function TablesSection({
  menuId,
  areas,
  initialTables,
  showToast,
  heading = "Tables",
  listSubtitle = "Add a row per table — these become QR-scannable destinations and identify orders to the kitchen.",
}: TablesSectionProps) {
  const [view, setView] = useState<"list" | "map">(() => {
    // Lazy initialiser reads localStorage once on mount. Render-time access
    // to window.localStorage is safe in a "use client" component.
    if (typeof window === "undefined") return "list";
    try {
      const saved = window.localStorage.getItem("klickenya:tables-view");
      if (saved === "list" || saved === "map") return saved;
    } catch {
      // localStorage unavailable (privacy mode) -- fall back to default
    }
    return "list";
  });
  const [tables, setTables] = useState<InitialTable[]>(initialTables);

  function persistView(next: "list" | "map") {
    setView(next);
    try { window.localStorage.setItem("klickenya:tables-view", next); } catch { /* ignore */ }
  }

  /**
   * Reconcile TableSetup's table list into our floor-map state.
   *
   * TableSetup is the source of truth for list-view fields (number, capacity,
   * floor_section, is_active). For new tables it doesn't know positions —
   * those default to null (canvas auto-arranges). For existing tables we
   * keep the pos_x/pos_y/area_id we already had so dragged positions don't
   * vanish when an unrelated edit happens elsewhere in the list.
   *
   * Net effect: adding a table in List view → it shows up in Floor map view
   * immediately (no reload). Same component instance, same source of truth.
   */
  const handleTableSetupChange = useCallback((next: TableSetupRow[]) => {
    setTables((prev) => {
      const prevById = new Map(prev.map((t) => [t.id, t]));
      return next.map((t) => {
        const existing = prevById.get(t.id);
        return {
          id:            t.id,
          table_number:  t.table_number,
          capacity:      t.capacity,
          floor_section: t.floor_section,
          is_active:     t.is_active,
          pos_x:         existing?.pos_x ?? null,
          pos_y:         existing?.pos_y ?? null,
          area_id:       existing?.area_id ?? null,
        };
      });
    });
  }, []);

  // Floor-map save handler. Returns true iff every row persisted.
  async function savePositions(
    positions: Array<{ id: string; pos_x: number; pos_y: number }>,
  ): Promise<boolean> {
    try {
      const res = await fetch("/api/menu/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, positions }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.error ?? "Failed to save layout", "error");
        return false;
      }
      // Optimistic in-memory update so the next view-switch shows persisted positions.
      const map = new Map(positions.map((p) => [p.id, p]));
      setTables((prev) =>
        prev.map((t) => {
          const p = map.get(t.id);
          return p ? { ...t, pos_x: p.pos_x, pos_y: p.pos_y } : t;
        }),
      );
      showToast("Floor map saved");
      return true;
    } catch {
      showToast("Failed to save layout", "error");
      return false;
    }
  }

  const canvasAreas = areas.map((a) => ({
    id:        a.id,
    name:      a.name,
    color_hex: a.color_hex ?? null,
  }));

  const canvasTables: FloorMapTableRow[] = tables;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display text-[16px] font-bold text-[#16130C] flex-1">{heading}</h2>
        <div className="inline-flex border border-[#E2DDD5] rounded-full overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => persistView("list")}
            className={`h-9 px-4 text-[12px] font-bold transition-colors ${
              view === "list" ? "bg-[#16130C] text-white" : "text-[#5E5848] hover:text-[#16130C]"
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => persistView("map")}
            className={`h-9 px-4 text-[12px] font-bold transition-colors ${
              view === "map" ? "bg-[#16130C] text-white" : "text-[#5E5848] hover:text-[#16130C]"
            }`}
          >
            Floor map
          </button>
        </div>
      </div>

      {view === "list" ? (
        <>
          <p className="text-[12px] text-[#9C9485] mb-3">{listSubtitle}</p>
          <TableSetup
            menuId={menuId}
            showToast={showToast}
            areas={areas}
            onTablesChange={handleTableSetupChange}
          />
        </>
      ) : (
        <FloorMapCanvas
          mode="edit"
          areas={canvasAreas}
          tables={canvasTables}
          onSavePositions={savePositions}
        />
      )}
    </div>
  );
}
