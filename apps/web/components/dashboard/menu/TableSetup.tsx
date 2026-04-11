"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ─────────────────────────────────────────── */

interface RestaurantTable {
  id: string;
  table_number: string;
  capacity: number;
  floor_section: string | null;
  is_active: boolean;
  display_order: number;
}

interface AreaOption {
  id: string;
  name: string;
}

interface TableSetupProps {
  menuId: string;
  showToast: (msg: string, type?: "success" | "error") => void;
  /** Seating areas — when provided, floor section becomes a dropdown instead of free text */
  areas?: AreaOption[];
}

/* ── Input style ───────────────────────────────────── */

const inputCls =
  "border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] bg-white transition-colors";

/* ── Table row ─────────────────────────────────────── */

interface TableRowProps {
  table: RestaurantTable;
  index: number;
  total: number;
  isEditing: boolean;
  areas?: AreaOption[];
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (updates: Partial<RestaurantTable>) => Promise<void>;
  onDelete: () => void;
  onToggleActive: () => void;
  onMove: (direction: "up" | "down") => void;
}

function TableRow({
  table, index, total,
  isEditing, areas, onEdit, onCancelEdit, onSaveEdit,
  onDelete, onToggleActive, onMove,
}: TableRowProps) {
  const [editNumber, setEditNumber]  = useState(table.table_number);
  const [editCap, setEditCap]        = useState(String(table.capacity));
  const [editFloor, setEditFloor]    = useState(table.floor_section ?? "");
  const [saving, setSaving]          = useState(false);

  // Reset fields when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditNumber(table.table_number);
      setEditCap(String(table.capacity));
      setEditFloor(table.floor_section ?? "");
    }
  }, [isEditing, table]);

  async function handleSave() {
    if (!editNumber.trim()) return;
    setSaving(true);
    await onSaveEdit({
      table_number:  editNumber.trim(),
      capacity:      parseInt(editCap, 10) || 4,
      floor_section: editFloor || null,
    });
    setSaving(false);
  }

  if (isEditing) {
    return (
      <div className="px-3 py-3 border-b border-[#F4F1EC] bg-[#FDFCFB] space-y-2">
        <div className="flex gap-2 flex-wrap">
          <input
            value={editNumber}
            onChange={(e) => setEditNumber(e.target.value)}
            placeholder="Table number"
            className={`${inputCls} w-[90px]`}
            autoFocus
          />
          <input
            type="number"
            min={1}
            max={50}
            value={editCap}
            onChange={(e) => setEditCap(e.target.value)}
            placeholder="Capacity"
            className={`${inputCls} w-[80px]`}
          />
          {areas && areas.length > 0 ? (
            <select
              value={editFloor}
              onChange={(e) => setEditFloor(e.target.value)}
              className={`${inputCls} flex-1 min-w-[120px]`}
            >
              <option value="">No area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          ) : (
            <input
              value={editFloor}
              onChange={(e) => setEditFloor(e.target.value)}
              placeholder="Floor section (optional)"
              className={`${inputCls} flex-1 min-w-[120px]`}
            />
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !editNumber.trim()}
            className="text-[12px] font-bold text-white bg-[#16130C] px-3 h-[28px] rounded-full hover:bg-[#2A2520] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onCancelEdit}
            className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 border-b border-[#F4F1EC] last:border-0 ${
        !table.is_active ? "opacity-50" : ""
      }`}
    >
      {/* Up/Down */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={() => onMove("up")}
          disabled={index === 0}
          className="text-[10px] text-[#D4CFC8] hover:text-[#9C9485] disabled:opacity-0 transition-colors leading-none px-0.5"
          title="Move up"
        >
          ▲
        </button>
        <button
          onClick={() => onMove("down")}
          disabled={index === total - 1}
          className="text-[10px] text-[#D4CFC8] hover:text-[#9C9485] disabled:opacity-0 transition-colors leading-none px-0.5"
          title="Move down"
        >
          ▼
        </button>
      </div>

      {/* Table info */}
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-semibold text-[#16130C]">{table.table_number}</span>
        <span className="text-[12px] text-[#9C9485] ml-2">{table.capacity} guests</span>
        {table.floor_section && (
          <span className="text-[11px] text-[#9C9485] ml-2 italic">{table.floor_section}</span>
        )}
      </div>

      {/* Active toggle */}
      <button
        onClick={onToggleActive}
        title={table.is_active ? "Deactivate" : "Activate"}
        className={`shrink-0 text-[11px] font-semibold px-2 h-[22px] rounded-full border transition-colors ${
          table.is_active
            ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            : "border-[#E2DDD5] text-[#9C9485] bg-white hover:border-[#9C9485]"
        }`}
      >
        {table.is_active ? "Active" : "Off"}
      </button>

      {/* Edit */}
      <button
        onClick={onEdit}
        className="text-[#E2DDD5] hover:text-[#E8A020] transition-colors text-[14px] shrink-0"
        title="Edit table"
      >
        ✏️
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="text-[#E2DDD5] hover:text-[#DC2626] transition-colors text-[14px] shrink-0"
        title="Delete table"
      >
        🗑
      </button>
    </div>
  );
}

/* ── Main component ────────────────────────────────── */

export function TableSetup({ menuId, showToast, areas }: TableSetupProps) {
  const [tables, setTables]       = useState<RestaurantTable[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Single add form
  const [showAdd, setShowAdd]     = useState(false);
  const [addNumber, setAddNumber] = useState("");
  const [addCap, setAddCap]       = useState("4");
  const [addFloor, setAddFloor]   = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Bulk add form
  const [showBulk, setShowBulk]   = useState(false);
  const [bulkRange, setBulkRange] = useState("");
  const [bulkPreview, setBulkPreview] = useState<string[] | null>(null);
  const [bulkSaving, setBulkSaving]   = useState(false);

  /* ── Load ──────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/menu/tables?menu_id=${menuId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setTables(d.tables ?? []); })
      .catch(() => { if (!cancelled) showToast("Failed to load tables", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [menuId, showToast]);

  /* ── Bulk range preview ────────────────────────── */

  function previewBulkRange(range: string) {
    setBulkRange(range);
    if (!range.trim()) { setBulkPreview(null); return; }
    // client-side preview using same logic as server
    const m = range.trim().match(/^([A-Za-z ]*?)(\d+)\s*-\s*([A-Za-z ]*?)(\d+)$/);
    if (!m) { setBulkPreview(null); return; }
    const [, p1, s, p2, e] = m;
    if (p1.trim().toLowerCase() !== p2.trim().toLowerCase()) { setBulkPreview(null); return; }
    const start = parseInt(s, 10);
    const end = parseInt(e, 10);
    if (end < start || end - start + 1 > 100) { setBulkPreview(null); return; }
    const prefix = p1.trim();
    const labels = [];
    for (let i = start; i <= end; i++) labels.push(prefix ? `${prefix}${i}` : `${i}`);
    setBulkPreview(labels);
  }

  /* ── Add single ────────────────────────────────── */

  const handleAddSingle = useCallback(async () => {
    const number = addNumber.trim();
    if (!number) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/menu/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id:       menuId,
          table_number:  number,
          capacity:      parseInt(addCap, 10) || 4,
          floor_section: addFloor.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to add table", "error"); return; }
      setTables((prev) => [...prev, data.table]);
      setAddNumber(""); setAddCap("4"); setAddFloor(""); setShowAdd(false);
      showToast("Table added");
    } catch {
      showToast("Failed to add table", "error");
    } finally {
      setAddSaving(false);
    }
  }, [menuId, addNumber, addCap, addFloor, showToast]);

  /* ── Bulk add ──────────────────────────────────── */

  const handleBulkAdd = useCallback(async () => {
    if (!bulkPreview || bulkPreview.length === 0) return;
    setBulkSaving(true);
    try {
      const res = await fetch("/api/menu/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, menu_id: menuId, range: bulkRange }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to bulk add tables", "error"); return; }
      setTables((prev) => [...prev, ...data.tables]);
      setBulkRange(""); setBulkPreview(null); setShowBulk(false);
      showToast(`${data.created} table${data.created !== 1 ? "s" : ""} added`);
    } catch {
      showToast("Failed to bulk add tables", "error");
    } finally {
      setBulkSaving(false);
    }
  }, [menuId, bulkRange, bulkPreview, showToast]);

  /* ── Save edit ─────────────────────────────────── */

  const handleSaveEdit = useCallback(async (id: string, updates: Partial<RestaurantTable>) => {
    // Optimistic
    setTables((prev) =>
      prev.map((t) => t.id === id ? { ...t, ...updates } : t)
    );
    setEditingId(null);
    try {
      const res = await fetch(`/api/menu/tables?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        // Rollback not trivial — just re-fetch
        showToast(data.error ?? "Failed to save", "error");
        fetch(`/api/menu/tables?menu_id=${menuId}`).then((r) => r.json()).then((d) => setTables(d.tables ?? []));
      }
    } catch {
      showToast("Failed to save", "error");
    }
  }, [menuId, showToast]);

  /* ── Toggle active ─────────────────────────────── */

  const handleToggleActive = useCallback(async (id: string, current: boolean) => {
    setTables((prev) =>
      prev.map((t) => t.id === id ? { ...t, is_active: !current } : t)
    );
    try {
      const res = await fetch(`/api/menu/tables?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTables((prev) =>
        prev.map((t) => t.id === id ? { ...t, is_active: current } : t)
      );
      showToast("Failed to update table", "error");
    }
  }, [showToast]);

  /* ── Delete ────────────────────────────────────── */

  const handleDelete = useCallback(async (id: string, tableNumber: string) => {
    if (!confirm(`Delete table ${tableNumber}? This cannot be undone.`)) return;
    setTables((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/menu/tables?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Failed to delete", "error");
        fetch(`/api/menu/tables?menu_id=${menuId}`).then((r) => r.json()).then((d) => setTables(d.tables ?? []));
        return;
      }
      showToast("Table deleted");
    } catch {
      showToast("Failed to delete", "error");
    }
  }, [menuId, showToast]);

  /* ── Move (reorder) ────────────────────────────── */

  const handleMove = useCallback(async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= tables.length) return;

    const a = tables[index];
    const b = tables[swapIndex];
    const newOrderA = b.display_order;
    const newOrderB = a.display_order;

    // Optimistic swap
    setTables((prev) => {
      const next = [...prev];
      next[index]    = { ...a, display_order: newOrderA };
      next[swapIndex] = { ...b, display_order: newOrderB };
      return next.sort((x, y) => x.display_order - y.display_order);
    });

    // Persist both
    await Promise.allSettled([
      fetch(`/api/menu/tables?id=${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: newOrderA }),
      }),
      fetch(`/api/menu/tables?id=${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: newOrderB }),
      }),
    ]);
  }, [tables]);

  /* ── Render ────────────────────────────────────── */

  const sortedTables = [...tables].sort((a, b) => {
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return a.table_number.localeCompare(b.table_number);
  });

  return (
    <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F4F1EC]">
        <span className="text-[15px] font-bold text-[#16130C]">Tables</span>
        <span className="text-[11px] font-bold text-[#9C9485] bg-[#F4F1EC] px-2 py-0.5 rounded-full">
          {tables.length} {tables.length === 1 ? "table" : "tables"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setShowBulk((v) => !v); setShowAdd(false); }}
            className="text-[11px] font-semibold text-[#9C9485] hover:text-[#E8A020] transition-colors"
          >
            Bulk add
          </button>
          <button
            onClick={() => { setShowAdd((v) => !v); setShowBulk(false); }}
            className="text-[12px] font-bold text-[#E8A020] hover:text-[#d4911c] transition-colors"
          >
            + Add table
          </button>
        </div>
      </div>

      {/* Table list */}
      {loading ? (
        <p className="text-[12px] text-[#9C9485] px-4 py-3">Loading…</p>
      ) : sortedTables.length === 0 && !showAdd && !showBulk ? (
        <p className="text-[12px] text-[#9C9485] italic px-4 py-3">
          No tables yet. Add your first table below.
        </p>
      ) : (
        <div>
          {sortedTables.map((table, index) => (
            <TableRow
              key={table.id}
              table={table}
              index={index}
              total={sortedTables.length}
              isEditing={editingId === table.id}
              areas={areas}
              onEdit={() => setEditingId(table.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={(updates) => handleSaveEdit(table.id, updates)}
              onDelete={() => handleDelete(table.id, table.table_number)}
              onToggleActive={() => handleToggleActive(table.id, table.is_active)}
              onMove={(dir) => handleMove(index, dir)}
            />
          ))}
        </div>
      )}

      {/* Add single table form */}
      {showAdd && (
        <div className="px-4 py-3 border-t border-[#F4F1EC] bg-[#FAFAF8] space-y-2.5">
          <p className="text-[12px] font-bold text-[#16130C] uppercase tracking-wide">Add table</p>
          <div className="flex gap-2 flex-wrap">
            <input
              value={addNumber}
              onChange={(e) => setAddNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSingle(); if (e.key === "Escape") setShowAdd(false); }}
              placeholder="T1"
              className={`${inputCls} w-[80px]`}
              autoFocus
            />
            <input
              type="number"
              min={1}
              max={50}
              value={addCap}
              onChange={(e) => setAddCap(e.target.value)}
              placeholder="Capacity"
              className={`${inputCls} w-[80px]`}
            />
            {areas && areas.length > 0 ? (
              <select
                value={addFloor}
                onChange={(e) => setAddFloor(e.target.value)}
                className={`${inputCls} flex-1 min-w-[140px]`}
              >
                <option value="">No area</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            ) : (
              <input
                value={addFloor}
                onChange={(e) => setAddFloor(e.target.value)}
                placeholder="Floor section (optional)"
                className={`${inputCls} flex-1 min-w-[140px]`}
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddSingle}
              disabled={addSaving || !addNumber.trim()}
              className="text-[12px] font-bold text-white bg-[#16130C] px-4 h-[30px] rounded-full hover:bg-[#2A2520] transition-colors disabled:opacity-50"
            >
              {addSaving ? "Adding…" : "Add table"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddNumber(""); setAddCap("4"); setAddFloor(""); }}
              className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk add form */}
      {showBulk && (
        <div className="px-4 py-3 border-t border-[#F4F1EC] bg-[#FAFAF8] space-y-2">
          <p className="text-[12px] font-bold text-[#16130C] uppercase tracking-wide">Bulk add tables</p>
          <p className="text-[11px] text-[#9C9485]">
            Enter a range like <span className="font-mono text-[#5E5848]">T1-T10</span> or <span className="font-mono text-[#5E5848]">1-20</span>
          </p>
          <div className="flex gap-2">
            <input
              value={bulkRange}
              onChange={(e) => previewBulkRange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleBulkAdd(); if (e.key === "Escape") setShowBulk(false); }}
              placeholder="e.g. T1-T10"
              className={`${inputCls} w-[140px]`}
              autoFocus
            />
          </div>
          {bulkPreview && bulkPreview.length > 0 && (
            <p className="text-[12px] text-emerald-700 font-semibold">
              This will create {bulkPreview.length} table{bulkPreview.length !== 1 ? "s" : ""}: {bulkPreview.slice(0, 5).join(", ")}{bulkPreview.length > 5 ? `… +${bulkPreview.length - 5} more` : ""}
            </p>
          )}
          {bulkRange && !bulkPreview && (
            <p className="text-[12px] text-[#DC2626]">Invalid range format</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleBulkAdd}
              disabled={bulkSaving || !bulkPreview || bulkPreview.length === 0}
              className="text-[12px] font-bold text-white bg-[#16130C] px-4 h-[30px] rounded-full hover:bg-[#2A2520] transition-colors disabled:opacity-50"
            >
              {bulkSaving ? "Adding…" : `Add ${bulkPreview?.length ?? 0} tables`}
            </button>
            <button
              onClick={() => { setShowBulk(false); setBulkRange(""); setBulkPreview(null); }}
              className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
