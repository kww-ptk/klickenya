"use client";

import { useState } from "react";
import Link from "next/link";
import { TableSetup } from "@/components/dashboard/menu/TableSetup";
import { Toggle } from "@/components/ui/Toggle";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { FloorMapCanvas, type FloorMapTableRow } from "@/components/dashboard/listings/floor-map/FloorMapCanvas";

export interface AreaOption {
  id: string;
  name: string;
  /** Hex colour for the floor-map picker pill. Optional. */
  color_hex?: string | null;
}

/** Subset of restaurant_tables fed to the floor-map canvas. List view
 *  doesn't need pos_x/pos_y/area_id; the floor map does. floor_section is
 *  the legacy text label -- canvas falls back to it when area_id is null. */
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

interface Props {
  listingId: string;
  menuId:    string;
  menuName:  string;
  menuSlug:  string;
  initialTableOrdering: boolean;
  areas:     AreaOption[];
  initialTables: InitialTable[];
}

export function TableOrderingClient(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({
  listingId,
  menuId,
  menuName,
  menuSlug,
  initialTableOrdering,
  areas,
  initialTables,
}: Props) {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(initialTableOrdering);
  const [toggling, setToggling] = useState(false);

  // Same toggle endpoint the menu builder's Publish panel uses, so behaviour
  // (warnings about open orders etc) stays consistent.
  async function toggle() {
    const next = !enabled;
    if (!next) {
      if (!confirm("Disable table ordering? Guests will no longer be able to place orders from their table.")) {
        return;
      }
    }
    setToggling(true);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, table_ordering: next }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!next && data.open_order_count > 0) {
        showToast(
          `Table ordering disabled. ${data.open_order_count} order${data.open_order_count > 1 ? "s" : ""} still in progress.`,
          "error",
        );
      } else {
        showToast(next ? "Table ordering enabled" : "Table ordering disabled");
      }
      setEnabled(next);
    } catch {
      showToast("Failed to update table ordering setting", "error");
    } finally {
      setToggling(false);
    }
  }

  const back = `back=${encodeURIComponent(`/dashboard/listings/${listingId}/orders`)}`;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/dashboard/listings/${listingId}`}
          className="text-[13px] text-text3 hover:text-dark"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mt-2">
          Table ordering
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          Guests scan a table QR code and order directly from their seat — for {menuName}.
        </p>
      </div>

      {/* Toggle card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[14px] font-bold text-dark">Table ordering</p>
            <p className="text-[12px] text-text3 mt-0.5 max-w-[480px]">
              {enabled
                ? "Active — guests can place orders by scanning the table QR code."
                : "Off. Turn it on to start accepting orders from guest tables."}
            </p>
          </div>
          <Toggle checked={enabled} onChange={toggle} disabled={toggling} />
        </div>

        {enabled && (
          <div className="mt-4 p-3 rounded-lg bg-amber/8 border border-amber/20">
            <p className="text-[12px] text-text2">
              <span className="font-bold">Heads up:</span> Make sure someone is watching the kitchen view when ordering is active.
            </p>
          </div>
        )}
      </div>

      {/* Tables — switch between list (CRUD) and floor map (positions) */}
      <TablesSection
        menuId={menuId}
        areas={areas}
        initialTables={initialTables}
        showToast={showToast}
      />


      {/* Operational deep links — only useful once ordering is on */}
      {enabled && (
        <div>
          <h2 className="font-display text-[16px] font-bold text-dark mb-2">Live operations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href={`/dashboard/menu/${menuId}/orders?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
            >
              <span className="text-[22px] shrink-0">🍳</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-dark">Kitchen view</p>
                <p className="text-[11px] text-text3 truncate">Live order screen</p>
              </div>
              <span className="text-text3 text-[16px] shrink-0">›</span>
            </Link>
            <Link
              href={`/dashboard/menu/${menuId}/qr?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
            >
              <span className="text-[22px] shrink-0">🔳</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-dark">QR codes</p>
                <p className="text-[11px] text-text3 truncate">Print one per table</p>
              </div>
              <span className="text-text3 text-[16px] shrink-0">›</span>
            </Link>
            <Link
              href={`/dashboard/menu/${menuId}/audit?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
            >
              <span className="text-[22px] shrink-0">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-dark">Audit log</p>
                <p className="text-[11px] text-text3 truncate">Voids and overrides</p>
              </div>
              <span className="text-text3 text-[16px] shrink-0">›</span>
            </Link>
          </div>
        </div>
      )}

      {/* Help text — using menuSlug here keeps the unused-var lint happy and
          gives the owner a way to copy the public URL pattern. */}
      <p className="text-[11px] text-text3">
        Public menu lives at <code>/m/{menuSlug}</code>. Each table also has its own QR code that
        encodes the table number into the URL.
      </p>
    </div>
  );
}

/* ── TablesSection ─────────────────────────────────────
 *
 * List / Floor map sub-tabs. Default = List (familiar). Sub-tab choice
 * is sticky in localStorage so an owner who prefers the visual layout
 * lands there next session. Floor map mode is "edit": positions persist
 * via batched PATCH /api/menu/tables.
 */

function TablesSection({
  menuId,
  areas,
  initialTables,
  showToast,
}: {
  menuId:        string;
  areas:         AreaOption[];
  initialTables: InitialTable[];
  showToast:     (msg: string, type?: "success" | "error") => void;
}) {
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

  // Areas need color_hex on the canvas, but list view doesn't care.
  const canvasAreas = areas.map((a) => ({
    id:        a.id,
    name:      a.name,
    color_hex: a.color_hex ?? null,
  }));

  // The canvas type is FloorMapTableRow (id/number/capacity/pos/area_id/is_active).
  // InitialTable already matches; cast for clarity.
  const canvasTables: FloorMapTableRow[] = tables;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display text-[16px] font-bold text-dark flex-1">Tables</h2>
        <div className="inline-flex border border-border rounded-full overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => persistView("list")}
            className={`h-9 px-4 text-[12px] font-bold transition-colors ${
              view === "list" ? "bg-dark text-white" : "text-text2 hover:text-dark"
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => persistView("map")}
            className={`h-9 px-4 text-[12px] font-bold transition-colors ${
              view === "map" ? "bg-dark text-white" : "text-text2 hover:text-dark"
            }`}
          >
            Floor map
          </button>
        </div>
      </div>

      {view === "list" ? (
        <>
          <p className="text-[12px] text-text3 mb-3">
            Add a row per table — these become QR-scannable destinations and identify orders to the kitchen.
          </p>
          <TableSetup menuId={menuId} showToast={showToast} areas={areas} />
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
