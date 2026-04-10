"use client";

import { useState, useCallback } from "react";
import { TableSetup } from "@/components/dashboard/menu/TableSetup";

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface RestaurantArea {
  id: string;
  name: string;
  capacity_total: number;
  display_order: number;
  color_hex: string | null;
  is_active: boolean;
}

interface ReservationsSettingsProps {
  menuId: string;
  listingCity: string | null;
  initialReservationsEnabled: boolean;
  initialDuration: number;
  initialLeadTime: number;
  initialMaxParty: number;
  initialMaxAdvance: number;
  initialAreas: RestaurantArea[];
  tableOrdering: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
  onAreasChange: (areas: RestaurantArea[]) => void;
  onReservationsToggle: (enabled: boolean) => void;
}

/* ── Toggle switch ──────────────────────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative w-10 h-[22px] rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-[#16A34A]" : "bg-[#E2DDD5]"
      }`}
    >
      <span
        className={`absolute top-[2px] size-[18px] rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[20px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

/* ── Section header ─────────────────────────────────────────────────────────── */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[14px] font-bold text-[#16130C]">{title}</p>
      {subtitle && <p className="text-[12px] text-[#9C9485] mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ── Area row ───────────────────────────────────────────────────────────────── */

interface AreaRowProps {
  area: RestaurantArea;
  menuId: string;
  onUpdate: (updated: RestaurantArea) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

function AreaRow({ area, menuId, onUpdate, onDelete, showToast }: AreaRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(area.name);
  const [editCap, setEditCap] = useState(String(area.capacity_total));
  const [editColor, setEditColor] = useState(area.color_hex ?? "#E8A020");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/menu/areas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: area.id,
          menu_id: menuId,
          name: editName.trim(),
          capacity_total: Math.max(1, parseInt(editCap, 10) || area.capacity_total),
          color_hex: editColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data.area);
      setEditing(false);
    } catch {
      showToast("Failed to save area.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    setTogglingActive(true);
    try {
      const res = await fetch("/api/menu/areas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: area.id, menu_id: menuId, is_active: !area.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data.area);
    } catch {
      showToast("Failed to update area.", "error");
    } finally {
      setTogglingActive(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${area.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/menu/areas?id=${area.id}&menu_id=${menuId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onDelete(area.id);
      showToast("Area deleted.");
    } catch {
      showToast("Failed to delete area.", "error");
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div className="px-4 py-3 bg-[#FDFCFB] border-b border-[#F4F1EC] space-y-2">
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">Name</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
              className="w-full border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
            />
          </div>
          <div className="w-[80px]">
            <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">Capacity</label>
            <input
              type="number"
              min={1}
              max={9999}
              value={editCap}
              onChange={e => setEditCap(e.target.value)}
              className="w-full border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">Color</label>
            <input
              type="color"
              value={editColor}
              onChange={e => setEditColor(e.target.value)}
              className="h-[34px] w-[48px] rounded-lg border border-[#E2DDD5] cursor-pointer p-0.5 bg-white"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !editName.trim()}
            className="text-[12px] font-bold text-white bg-[#16130C] px-3 h-[28px] rounded-full hover:bg-[#2A2520] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-[#F4F1EC] last:border-0 ${!area.is_active ? "opacity-50" : ""}`}>
      {/* Color swatch */}
      <div
        className="shrink-0 size-3 rounded-full"
        style={{ backgroundColor: area.color_hex ?? "#E2DDD5" }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#16130C] truncate">{area.name}</p>
        <p className="text-[11px] text-[#9C9485]">{area.capacity_total} covers</p>
      </div>

      {/* Active toggle */}
      <Toggle
        checked={area.is_active}
        onChange={handleToggleActive}
        disabled={togglingActive}
      />

      {/* Edit */}
      <button
        onClick={() => setEditing(true)}
        className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors px-1"
      >
        Edit
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-[12px] text-[#DC2626] hover:text-red-700 transition-colors px-1 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}

/* ── Add area form ──────────────────────────────────────────────────────────── */

interface AddAreaFormProps {
  menuId: string;
  onAdd: (area: RestaurantArea) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

function AddAreaForm({ menuId, onAdd, showToast }: AddAreaFormProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [color, setColor] = useState("#E8A020");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/menu/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          name: name.trim(),
          capacity_total: Math.max(1, parseInt(capacity, 10) || 20),
          color_hex: color,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdd(data.area);
      setName("");
      setCapacity("20");
      setColor("#E8A020");
      setOpen(false);
      showToast("Area added.");
    } catch {
      showToast("Failed to add area.", "error");
    } finally {
      setAdding(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-[36px] rounded-full border border-dashed border-[#E2DDD5] text-[12px] font-semibold text-[#9C9485] hover:border-[#E8A020]/50 hover:text-[#E8A020] transition-colors"
      >
        + Add area
      </button>
    );
  }

  return (
    <div className="border border-[#E2DDD5] rounded-xl p-4 space-y-3 bg-[#FDFCFB]">
      <p className="text-[12px] font-bold text-[#16130C]">New area</p>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Rooftop"
            autoFocus
            className="w-full border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
          />
        </div>
        <div className="w-[80px]">
          <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">Capacity</label>
          <input
            type="number"
            min={1}
            max={9999}
            value={capacity}
            onChange={e => setCapacity(e.target.value)}
            className="w-full border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-1">Color</label>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-[34px] w-[48px] rounded-lg border border-[#E2DDD5] cursor-pointer p-0.5 bg-white"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={adding || !name.trim()}
          className="text-[12px] font-bold text-white bg-[#E8A020] px-4 h-[30px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add area"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Main Settings component ────────────────────────────────────────────────── */

export function ReservationsSettings({
  menuId,
  listingCity,
  initialReservationsEnabled,
  initialDuration,
  initialLeadTime,
  initialMaxParty,
  initialMaxAdvance,
  initialAreas,
  tableOrdering,
  showToast,
  onAreasChange,
  onReservationsToggle,
}: ReservationsSettingsProps) {
  /* ── Reservation rules state ── */
  const [enabled, setEnabled] = useState(initialReservationsEnabled);
  const [toggling, setToggling] = useState(false);
  const [duration, setDuration] = useState(initialDuration);
  const [leadTime, setLeadTime] = useState(initialLeadTime);
  const [maxParty, setMaxParty] = useState(initialMaxParty);
  const [maxAdvance, setMaxAdvance] = useState(initialMaxAdvance);
  const [savingRule, setSavingRule] = useState<string | null>(null);

  /* ── Areas state ── */
  const [areas, setAreas] = useState<RestaurantArea[]>(initialAreas);

  const patchSetting = useCallback(
    async (field: string, value: unknown) => {
      setSavingRule(field);
      try {
        const res = await fetch("/api/menu/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menu_id: menuId, listing_city: listingCity, [field]: value }),
        });
        if (!res.ok) throw new Error();
      } catch {
        showToast("Failed to save setting.", "error");
      } finally {
        setSavingRule(null);
      }
    },
    [menuId, listingCity, showToast],
  );

  const toggleReservations = useCallback(async () => {
    setToggling(true);
    const next = !enabled;
    setEnabled(next);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          listing_city: listingCity,
          reservations_enabled: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      onReservationsToggle(next);
      // If areas were seeded on first enable, refresh areas list
      if (data.seeded_areas) {
        const areasRes = await fetch(`/api/menu/areas?menu_id=${menuId}`);
        const areasData = await areasRes.json();
        if (areasData.areas) {
          setAreas(areasData.areas);
          onAreasChange(areasData.areas);
        }
      }
      showToast(next ? "Reservations enabled." : "Reservations disabled.");
    } catch {
      setEnabled(!next);
      showToast("Failed to update reservations setting.", "error");
    } finally {
      setToggling(false);
    }
  }, [enabled, menuId, listingCity, showToast, onAreasChange, onReservationsToggle]);

  const handleAreaUpdate = (updated: RestaurantArea) => {
    const next = areas.map(a => a.id === updated.id ? updated : a);
    setAreas(next);
    onAreasChange(next);
  };

  const handleAreaDelete = (id: string) => {
    const next = areas.filter(a => a.id !== id);
    setAreas(next);
    onAreasChange(next);
  };

  const handleAreaAdd = (area: RestaurantArea) => {
    const next = [...areas, area];
    setAreas(next);
    onAreasChange(next);
  };

  const inputCls = "w-full border border-[#E2DDD5] rounded-lg px-2.5 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 disabled:opacity-40 disabled:bg-[#F4F1EC] bg-white";

  return (
    <div className="space-y-6">

      {/* ── Reservation rules ── */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F4F1EC]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold text-[#16130C]">Table reservations</p>
              <p className="text-[12px] text-[#9C9485] mt-0.5">
                {enabled
                  ? "Active — guests can request tables via your listing and menu page."
                  : "Enable to accept table reservation requests from guests."}
              </p>
            </div>
            <Toggle checked={enabled} onChange={toggleReservations} disabled={toggling} />
          </div>
        </div>

        <div className="p-4 space-y-1">
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wide mb-3">Booking rules</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {/* Duration */}
            <div>
              <label className="block text-[11px] font-semibold text-[#5E5848] mb-1">Booking duration</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={15} max={240} step={15}
                  value={duration}
                  disabled={!enabled || savingRule === "default_reservation_duration"}
                  onChange={e => setDuration(Math.max(15, Math.min(240, Number(e.target.value))))}
                  onBlur={() => patchSetting("default_reservation_duration", duration)}
                  className={inputCls}
                />
                <span className="text-[11px] text-[#9C9485] shrink-0">min</span>
              </div>
            </div>

            {/* Lead time */}
            <div>
              <label className="block text-[11px] font-semibold text-[#5E5848] mb-1">Lead time</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0} max={168}
                  value={leadTime}
                  disabled={!enabled || savingRule === "reservations_lead_time_hours"}
                  onChange={e => setLeadTime(Math.max(0, Math.min(168, Number(e.target.value))))}
                  onBlur={() => patchSetting("reservations_lead_time_hours", leadTime)}
                  className={inputCls}
                />
                <span className="text-[11px] text-[#9C9485] shrink-0">hrs</span>
              </div>
            </div>

            {/* Max party size */}
            <div>
              <label className="block text-[11px] font-semibold text-[#5E5848] mb-1">Max party size</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={1} max={50}
                  value={maxParty}
                  disabled={!enabled || savingRule === "reservations_max_party_size"}
                  onChange={e => setMaxParty(Math.max(1, Math.min(50, Number(e.target.value))))}
                  onBlur={() => patchSetting("reservations_max_party_size", maxParty)}
                  className={inputCls}
                />
                <span className="text-[11px] text-[#9C9485] shrink-0">guests</span>
              </div>
            </div>

            {/* Max advance days */}
            <div>
              <label className="block text-[11px] font-semibold text-[#5E5848] mb-1">Book up to</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={1} max={365}
                  value={maxAdvance}
                  disabled={!enabled || savingRule === "reservations_max_advance_days"}
                  onChange={e => setMaxAdvance(Math.max(1, Math.min(365, Number(e.target.value))))}
                  onBlur={() => patchSetting("reservations_max_advance_days", maxAdvance)}
                  className={inputCls}
                />
                <span className="text-[11px] text-[#9C9485] shrink-0">days ahead</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Seating areas ── */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F4F1EC]">
          <SectionHeader
            title="Seating areas"
            subtitle="Define your dining zones (Indoor, Terrace, Rooftop…) so guests can choose a preference when booking."
          />
        </div>

        {areas.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-[#9C9485]">
            No areas yet. Add one below.
          </div>
        ) : (
          <div>
            {areas
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map(area => (
                <AreaRow
                  key={area.id}
                  area={area}
                  menuId={menuId}
                  onUpdate={handleAreaUpdate}
                  onDelete={handleAreaDelete}
                  showToast={showToast}
                />
              ))}
          </div>
        )}

        <div className="p-4">
          <AddAreaForm menuId={menuId} onAdd={handleAreaAdd} showToast={showToast} />
        </div>
      </div>

      {/* ── Ordering tables ── */}
      {tableOrdering && (
        <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#F4F1EC]">
            <SectionHeader
              title="Ordering tables"
              subtitle="Physical table numbers for QR-code ordering. Each table gets its own scan URL."
            />
          </div>
          <div className="p-4">
            <TableSetup
              menuId={menuId}
              showToast={showToast}
              areas={areas.filter(a => a.is_active).map(a => ({ id: a.id, name: a.name }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
