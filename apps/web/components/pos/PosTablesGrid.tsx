"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Clock, Search, X } from "lucide-react";
import { PosHeader } from "./PosHeader";
import { PosTabBar } from "./PosTabBar";
import { usePosShell } from "./_shell/PosShellProvider";
import { posFetch } from "./_shell/posFetch";
import { FloorMapCanvas } from "@/components/dashboard/listings/floor-map/FloorMapCanvas";
import type { TileState } from "@/components/dashboard/listings/floor-map/FloorTile";

/* ── Types ──────────────────────────────────────────────────────────────────── */

export interface PosTable {
  id:            string;
  table_number:  string;
  capacity:      number;
  // Floor-map fields. POS uses these read-only -- staff see the layout
  // owners set up; they don't move tiles.
  pos_x:         number | null;
  pos_y:         number | null;
  area_id:       string | null;
  floor_section: string | null;
  is_active:     boolean;
}

export interface PosFloorArea {
  id:        string;
  name:      string;
  color_hex: string | null;
}

interface PosSession {
  id:                    string;
  table_id:              string;
  table_number:          string | null;
  status:                "open" | "billed" | "paid" | "void";
  covers:                number;
  subtotal_kes:          number;
  total_kes:             number;
  payment_method:        string | null;
  opened_at:             string;
  open_duration_minutes: number;
  order_count:           number;
  item_count:            number;
  opened_by_staff:       { id: string; name: string; role: string } | null;
}

interface PosTablesGridProps {
  initialTables: PosTable[];
  /** Reservation areas for the floor-map picker. Optional -- without
   *  them we still render a single-pane canvas with no picker. */
  initialAreas?: PosFloorArea[];
}

// 5s polling — realtime is too many channels when watching every table at
// once (one channel per session × ~30 tables). 5s is the right tradeoff for
// the grid view; the session-detail view drops to true realtime.
const POLL_MS = 5_000;

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function formatKes(n: number): string {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

function formatMins(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

/* ── Main grid ──────────────────────────────────────────────────────────────── */

export function PosTablesGrid({ initialTables, initialAreas = [] }: PosTablesGridProps) {
  const { menu } = usePosShell();
  const slug = menu.slug;
  const menuId = menu.id;
  const router = useRouter();
  const [sessions, setSessions] = useState<PosSession[]>([]);
  // List vs floor-map view. Sticky in localStorage so a tablet that's
  // been swiped to "floor map" stays there across reloads.
  const [view, setView] = useState<"list" | "map">(() => {
    if (typeof window === "undefined") return "list";
    try {
      const saved = window.localStorage.getItem("klickenya:pos-tables-view");
      if (saved === "list" || saved === "map") return saved;
    } catch { /* ignore */ }
    return "list";
  });
  const [openingTableId, setOpeningTableId] = useState<string | null>(null);
  const [paymentBusyId, setPaymentBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "available" | "occupied" | "billed">("all");
  const sessionsRef = useRef<PosSession[]>([]);

  /* ── Counts per status for the filter pills ── */
  const occupiedCount = sessions.filter((s) => s.status === "open").length;
  const billedCount   = sessions.filter((s) => s.status === "billed").length;
  const availableCount = initialTables.length - occupiedCount - billedCount;

  /* ── Apply search + status filter to the table list ── */
  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialTables.filter((t) => {
      if (q && !t.table_number.toLowerCase().includes(q)) return false;
      if (statusFilter === "all") return true;
      const s = sessions.find((x) => x.table_id === t.id);
      const status = s?.status ?? "available";
      if (statusFilter === "available") return !s;
      if (statusFilter === "occupied")  return status === "open";
      if (statusFilter === "billed")    return status === "billed";
      return true;
    });
  }, [initialTables, sessions, search, statusFilter]);

  /* ── Poll sessions every 5s ── */
  const fetchSessions = useCallback(async () => {
    try {
      const res = await posFetch(`/api/menu/sessions?menu_id=${menuId}&status=all`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: PosSession[] = (data.sessions ?? []).filter(
        (s: PosSession) => s.status === "open" || s.status === "billed",
      );
      sessionsRef.current = incoming;
      setSessions(incoming);
    } catch {
      /* network error — try again next tick */
    }
  }, [menuId]);

  useEffect(() => {
    fetchSessions();
    const onVis = () => {
      if (document.visibilityState === "visible") fetchSessions();
    };
    document.addEventListener("visibilitychange", onVis);
    const interval = setInterval(fetchSessions, POLL_MS);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchSessions]);

  /* ── Tick for elapsed-time refresh every 30s ── */
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  /* ── Open session for a table ──────────────────────────────────────────────
   * After successful creation we navigate straight to the session detail page
   * (order entry) rather than dropping the waiter back on the grid. The grid
   * poll picks up the change for any other terminal viewing it. */
  const openSession = useCallback(
    async (tableId: string, covers: number) => {
      setOpeningTableId(tableId);
      try {
        const res = await posFetch("/api/menu/sessions", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ menu_id: menuId, table_id: tableId, covers }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Could not open session.");
          return;
        }
        // Jump straight to the order-entry screen so the waiter can start
        // taking the order immediately without an extra tap.
        router.push(`/pos/${slug}/tables/${tableId}`);
      } finally {
        setOpeningTableId(null);
      }
    },
    [menuId, router, slug],
  );

  /* ── Pay action ── */
  const payNow = useCallback(
    async (sessionId: string, method: "cash" | "card" | "mpesa") => {
      setPaymentBusyId(sessionId);
      try {
        const res = await posFetch(`/api/menu/sessions/${sessionId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ status: "paid", payment_method: method }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Could not record payment.");
          return;
        }
        await fetchSessions();
      } finally {
        setPaymentBusyId(null);
      }
    },
    [fetchSessions],
  );

  /* ── Modal: open table ── */
  const [openModalTable, setOpenModalTable] = useState<PosTable | null>(null);

  /* ── View persistence + tile-state lookup for floor map ─────────────
   *
   * Map view uses the same FloorMapCanvas as the dashboard, in mode='live'.
   * Tile state is derived from the session list we already poll every 5 s
   * -- no extra round-trip. Tap a tile = same handler as the list cards
   * (open modal if no session, navigate to detail if one exists).
   */
  function persistView(next: "list" | "map") {
    setView(next);
    try { window.localStorage.setItem("klickenya:pos-tables-view", next); } catch { /* ignore */ }
  }

  const tileStateFor = useCallback((tableId: string): TileState => {
    const s = sessions.find((x) => x.table_id === tableId);
    if (!s) return "available";
    if (s.status === "billed") return "billed";
    if (s.status === "open") return "occupied";
    return "available";
  }, [sessions]);

  const handleTileTap = useCallback((tableId: string) => {
    const t = initialTables.find((x) => x.id === tableId);
    if (!t) return;
    const s = sessions.find((x) => x.table_id === tableId);
    if (!s) {
      setOpenModalTable(t);
    } else {
      router.push(`/pos/${slug}/tables/${tableId}`);
    }
  }, [initialTables, sessions, router, slug]);

  return (
    <div className="min-h-screen flex flex-col">
      <PosHeader />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 pt-4 pb-24">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h1 className="text-[20px] font-bold text-white">Tables</h1>
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-[#9C9485] hidden sm:block">
              Live · {sessions.length} occupied
            </p>
            {/* List / Floor toggle. Stays even with no tables so a fresh
                staff doesn't think the toggle is missing. Disabled in
                map mode if no positions yet -- canvas auto-arranges so
                tiles still render. */}
            <div className="inline-flex border border-[#2A2520] rounded-full overflow-hidden bg-[#1A170F]">
              <button
                type="button"
                onClick={() => persistView("list")}
                className={`h-9 px-4 text-[12px] font-bold transition-colors ${
                  view === "list" ? "bg-[#E8A020] text-[#16130C]" : "text-[#9C9485] hover:text-white"
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => persistView("map")}
                className={`h-9 px-4 text-[12px] font-bold transition-colors ${
                  view === "map" ? "bg-[#E8A020] text-[#16130C]" : "text-[#9C9485] hover:text-white"
                }`}
              >
                Floor map
              </button>
            </div>
          </div>
        </div>

        {/* Search + status filter — list view only */}
        {view === "list" && initialTables.length > 0 && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2 rounded-2xl border border-[#2A2520] bg-[#1A170F] px-3 py-2">
              <Search className="w-4 h-4 text-[#9C9485] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by table number…"
                className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-[#5E5848]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[#9C9485] hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {(["all", "available", "occupied", "billed"] as const).map((f) => {
                const count =
                  f === "all"       ? initialTables.length :
                  f === "available" ? availableCount :
                  f === "occupied"  ? occupiedCount :
                                      billedCount;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`shrink-0 h-9 px-3 rounded-full text-[12px] font-semibold transition-colors capitalize ${
                      statusFilter === f
                        ? "bg-[#E8A020] text-[#16130C]"
                        : "bg-[#252019] text-[#F4F1EC] hover:bg-[#3A342B]"
                    }`}
                  >
                    {f} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {initialTables.length === 0 ? (
          <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-8 text-center">
            <p className="text-[14px] text-[#9C9485]">
              No tables registered yet. Ask the owner to add tables in the dashboard.
            </p>
          </div>
        ) : view === "map" ? (
          /* Floor-map view -- read-only for staff. Tap a tile = same handler
             as the list cards (open modal if no session, navigate to detail
             if one exists). Tile colors come from the session list we're
             already polling, no extra round-trip. The dashboard FloorMapCanvas
             expects a light-on-dark caller environment, so we wrap it in a
             panel that matches the POS chrome. */
          <div className="rounded-2xl border border-[#2A2520] bg-white p-3 sm:p-4">
            <FloorMapCanvas
              mode="live"
              areas={initialAreas}
              tables={initialTables}
              getState={tileStateFor}
              onTileTap={handleTileTap}
            />
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-8 text-center">
            <p className="text-[14px] text-[#9C9485]">No tables match the current filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredTables.map((table) => {
              const session = sessions.find((s) => s.table_id === table.id);
              return (
                <TableCard
                  key={table.id}
                  table={table}
                  slug={slug}
                  session={session}
                  busy={openingTableId === table.id || paymentBusyId === session?.id}
                  onOpenClick={() => setOpenModalTable(table)}
                  onClick={() => {
                    if (!session) {
                      setOpenModalTable(table);
                    } else {
                      router.push(`/pos/${slug}/tables/${table.id}`);
                    }
                  }}
                  onPay={(method) => session && payNow(session.id, method)}
                />
              );
            })}
          </div>
        )}
      </main>

      <PosTabBar />

      {openModalTable && (
        <OpenTableModal
          table={openModalTable}
          submitting={openingTableId === openModalTable.id}
          onCancel={() => setOpenModalTable(null)}
          onConfirm={async (covers) => {
            await openSession(openModalTable.id, covers);
            setOpenModalTable(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Table card ─────────────────────────────────────────────────────────────── */

function TableCard({
  table,
  session,
  busy,
  onClick,
  onPay,
}: {
  table:       PosTable;
  slug:        string;
  session?:    PosSession;
  busy:        boolean;
  onOpenClick: () => void;
  onClick:     () => void;
  onPay:       (method: "cash" | "card" | "mpesa") => void;
}) {
  const status = session?.status ?? "available";

  const borderCls =
    status === "open"     ? "border-[#E8A020]" :
    status === "billed"   ? "border-[#5BA1FF]" :
                            "border-[#3A342B]";
  const bgCls =
    status === "open"     ? "bg-[#231D12]" :
    status === "billed"   ? "bg-[#192034]" :
                            "bg-[#1A170F]";
  const labelCls =
    status === "open"     ? "text-[#E8A020]" :
    status === "billed"   ? "text-[#5BA1FF]" :
                            "text-[#9C9485]";
  const label =
    status === "open"     ? "Occupied" :
    status === "billed"   ? "Billed" :
                            "Available";

  return (
    <div
      className={`rounded-2xl border-2 ${borderCls} ${bgCls} p-3 min-h-[140px] flex flex-col transition-colors ${
        busy ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="text-left flex-1 flex flex-col"
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[26px] font-bold text-white leading-none">
            {table.table_number}
          </span>
          <span className={`text-[10px] uppercase tracking-wide font-bold ${labelCls}`}>
            {label}
          </span>
        </div>

        {session ? (
          <div className="space-y-1 mt-2 flex-1">
            <div className="flex items-center gap-2 text-[12px] text-[#F4F1EC]">
              <Users className="w-3.5 h-3.5 text-[#9C9485]" />
              <span>×{session.covers}</span>
              <span className="text-[#9C9485]">·</span>
              <Clock className="w-3.5 h-3.5 text-[#9C9485]" />
              <span>{formatMins(session.open_duration_minutes)}</span>
            </div>
            <p className="text-[15px] font-bold text-white">
              {formatKes(session.total_kes || session.subtotal_kes)}
            </p>
            {session.opened_by_staff && (
              <p className="text-[11px] text-[#9C9485] truncate">
                {session.opened_by_staff.name}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-2 text-[12px] text-[#5E5848]">
            Cap. {table.capacity}
          </div>
        )}
      </button>

      {session?.status === "billed" && (
        <div className="mt-2 grid grid-cols-3 gap-1">
          <PayButton onClick={() => onPay("cash")}  disabled={busy} label="Cash" />
          <PayButton onClick={() => onPay("card")}  disabled={busy} label="Card" />
          <PayButton onClick={() => onPay("mpesa")} disabled={busy} label="M-Pesa" />
        </div>
      )}
    </div>
  );
}

function PayButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className="h-12 rounded-xl bg-[#5BA1FF] text-[#0F0D08] text-[11px] font-bold hover:bg-[#7AB6FF] disabled:opacity-40"
    >
      {label}
    </button>
  );
}

/* ── Open-table modal ───────────────────────────────────────────────────────── */

function OpenTableModal({
  table,
  submitting,
  onCancel,
  onConfirm,
}: {
  table:      PosTable;
  submitting: boolean;
  onCancel:   () => void;
  onConfirm:  (covers: number) => void | Promise<void>;
}) {
  const [covers, setCovers] = useState(2);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-[#1A170F] border border-[#2A2520] p-5">
        <p className="text-[12px] uppercase tracking-wide text-[#9C9485]">Open table</p>
        <h2 className="mt-1 text-[26px] font-bold text-white">Table {table.table_number}</h2>

        <div className="mt-5">
          <p className="text-[12px] uppercase tracking-wide text-[#9C9485] mb-2">Covers</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCovers((c) => Math.max(1, c - 1))}
              disabled={submitting}
              className="w-12 h-12 rounded-full bg-[#2A2520] text-white text-[22px] font-bold disabled:opacity-40"
            >
              −
            </button>
            <span className="flex-1 text-center text-[34px] font-bold text-white">{covers}</span>
            <button
              type="button"
              onClick={() => setCovers((c) => Math.min(99, c + 1))}
              disabled={submitting}
              className="w-12 h-12 rounded-full bg-[#2A2520] text-white text-[22px] font-bold disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-12 rounded-full bg-[#252019] text-[#F4F1EC] text-[13px] font-semibold disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(covers)}
            disabled={submitting}
            className="h-12 rounded-full bg-[#E8A020] text-[#16130C] text-[13px] font-bold disabled:opacity-40"
          >
            {submitting ? "Opening…" : "Open table"}
          </button>
        </div>
      </div>
    </div>
  );
}
