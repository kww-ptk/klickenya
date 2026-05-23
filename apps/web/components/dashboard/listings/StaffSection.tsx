"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { Copy, Check } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface StaffMember {
  id: string;
  name: string;
  role: "waiter" | "manager" | "cashier" | "kitchen" | "bar";
  is_active: boolean;
  created_at: string;
}

interface StaffSectionProps {
  menuId:    string;
  menuSlug:  string;
  showToast: (msg: string, type?: "success" | "error") => void;
  /** Show the POS-URL block at the top. Default true. Pass false when
   *  embedded somewhere that already shows the URL (e.g. the new POS page). */
  showPosUrl?: boolean;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[14px] font-bold text-[#16130C]">{title}</p>
      {subtitle && <p className="text-[12px] text-[#9C9485] mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ── StaffSection ──────────────────────────────────────────────────────────── */
//
// Owner-facing CRUD for restaurant_staff. Staff log into /pos/[slug] with the
// 4-digit PIN. PIN is unique within a menu, never returned by the API.
//
// Lifted out of ReservationsSettings -- staff management is part of the POS
// surface, not reservations.

export function StaffSection({
  menuId,
  menuSlug,
  showToast,
  showPosUrl = true,
}: StaffSectionProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPin, setAddPin] = useState("");
  const [addRole, setAddRole] = useState<StaffMember["role"]>("waiter");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const posUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/pos/${menuSlug}`
      : `https://klickenya.com/pos/${menuSlug}`;

  useEffect(() => {
    fetch(`/api/menu/staff?menu_id=${menuId}`)
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []))
      .catch(() => showToast("Failed to load staff", "error"))
      .finally(() => setLoading(false));
  }, [menuId, showToast]);

  const visibleStaff = showInactive ? staff : staff.filter((s) => s.is_active);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    if (!/^\d{4}$/.test(addPin)) {
      showToast("PIN must be exactly 4 digits", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/menu/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, name: addName.trim(), pin: addPin, role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStaff((prev) => [...prev, data.staff]);
      setAddName("");
      setAddPin("");
      setAddRole("waiter");
      setAdding(false);
      showToast("Staff member added.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to add staff", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (
    id: string,
    patch: Partial<Omit<StaffMember, "id" | "created_at">> & { pin?: string },
  ) => {
    try {
      const res = await fetch(`/api/menu/staff?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStaff((prev) => prev.map((s) => (s.id === id ? data.staff : s)));
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update staff", "error");
      return false;
    }
  };

  const handleToggleActive = async (s: StaffMember) => {
    await handleUpdate(s.id, { is_active: !s.is_active });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(posUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("Could not copy URL", "error");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#F4F1EC]">
        <SectionHeader
          title="Staff"
          subtitle="Add waiters, managers, and cashiers. Each one logs into the POS terminal with their own 4-digit PIN."
        />
        {showPosUrl && (
          <>
            <div className="mt-3 flex items-center gap-2 bg-[#FDFCFB] border border-[#E2DDD5] rounded-lg px-3 py-2">
              <code className="flex-1 text-[12px] text-[#16130C] truncate">{posUrl}</code>
              <button
                type="button"
                onClick={copy}
                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-[#16130C] hover:text-[#E8A020]"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-[#9C9485] mt-2">
              Each PIN must be unique within your restaurant. Staff don&apos;t sign in with email — just their PIN.
            </p>
          </>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="px-4 py-6 text-center text-[12px] text-[#9C9485]">Loading staff…</div>
      ) : visibleStaff.length === 0 ? (
        <div className="px-4 py-5 text-center text-[12px] text-[#9C9485]">
          {showInactive ? "No staff yet." : "No active staff yet. Add one below."}
        </div>
      ) : (
        <div>
          {visibleStaff.map((s) => (
            <StaffRow
              key={s.id}
              staff={s}
              isEditing={editingId === s.id}
              onEdit={() => setEditingId(s.id)}
              onCancel={() => setEditingId(null)}
              onSave={async (patch) => {
                const ok = await handleUpdate(s.id, patch);
                if (ok) setEditingId(null);
              }}
              onToggleActive={() => handleToggleActive(s)}
            />
          ))}
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Toggle inactive */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#9C9485]">{staff.filter((s) => !s.is_active).length} inactive</span>
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className="text-[#9C9485] hover:text-[#16130C] underline"
          >
            {showInactive ? "Hide inactive" : "Show inactive"}
          </button>
        </div>

        {/* Add form */}
        {adding ? (
          <div className="border border-[#E2DDD5] rounded-xl p-3 space-y-2 bg-[#FDFCFB]">
            <p className="text-[12px] font-bold text-[#16130C]">Add staff</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Name"
                autoFocus
                className="border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
              />
              <input
                value={addPin}
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                onChange={(e) => setAddPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4-digit PIN"
                className="border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
              />
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as StaffMember["role"])}
                className="border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
              >
                <option value="waiter">Waiter</option>
                <option value="kitchen">Kitchen</option>
                <option value="bar">Bar</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={submitting || !addName.trim() || addPin.length !== 4}
                className="text-[12px] font-bold text-white bg-[#E8A020] px-4 h-[30px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50"
              >
                {submitting ? "Adding…" : "Add staff"}
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setAddName(""); setAddPin(""); setAddRole("waiter"); }}
                className="text-[12px] text-[#9C9485] hover:text-[#16130C]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full h-[36px] rounded-full border border-dashed border-[#E2DDD5] text-[12px] font-semibold text-[#9C9485] hover:border-[#E8A020]/50 hover:text-[#E8A020] transition-colors"
          >
            + Add staff
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Row + edit row (private) ──────────────────────────────────────────────── */

function StaffRow({
  staff,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onToggleActive,
}: {
  staff:    StaffMember;
  isEditing: boolean;
  onEdit:    () => void;
  onCancel:  () => void;
  onSave:    (patch: { name?: string; role?: StaffMember["role"]; pin?: string }) => Promise<void>;
  onToggleActive: () => void;
}) {
  if (isEditing) {
    return <StaffRowEdit staff={staff} onCancel={onCancel} onSave={onSave} />;
  }
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-[#F4F1EC] last:border-0 ${!staff.is_active ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#16130C] truncate">{staff.name}</p>
        <p className="text-[11px] text-[#9C9485] capitalize">{staff.role}</p>
      </div>
      <Toggle checked={staff.is_active} onChange={onToggleActive} />
      <button
        onClick={onEdit}
        className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors px-1"
      >
        Edit
      </button>
    </div>
  );
}

function StaffRowEdit({
  staff,
  onCancel,
  onSave,
}: {
  staff: StaffMember;
  onCancel: () => void;
  onSave: (patch: { name?: string; role?: StaffMember["role"]; pin?: string }) => Promise<void>;
}) {
  const [editName, setEditName] = useState(staff.name);
  const [editRole, setEditRole] = useState<StaffMember["role"]>(staff.role);
  const [editPin, setEditPin] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const patch: { name?: string; role?: StaffMember["role"]; pin?: string } = {};
    if (editName.trim() && editName.trim() !== staff.name) patch.name = editName.trim();
    if (editRole !== staff.role) patch.role = editRole;
    if (editPin && /^\d{4}$/.test(editPin)) patch.pin = editPin;
    if (Object.keys(patch).length === 0) {
      onCancel();
      setSaving(false);
      return;
    }
    await onSave(patch);
    setSaving(false);
  };

  return (
    <div className="px-4 py-3 bg-[#FDFCFB] border-b border-[#F4F1EC] space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Name"
          className="border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
        />
        <input
          value={editPin}
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          onChange={(e) => setEditPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="New PIN (leave blank to keep)"
          className="border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
        />
        <select
          value={editRole}
          onChange={(e) => setEditRole(e.target.value as StaffMember["role"])}
          className="border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] focus:outline-none focus:border-[#E8A020] bg-white"
        >
          <option value="waiter">Waiter</option>
          <option value="kitchen">Kitchen</option>
          <option value="bar">Bar</option>
          <option value="manager">Manager</option>
          <option value="cashier">Cashier</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !editName.trim() || (editPin !== "" && !/^\d{4}$/.test(editPin))}
          className="text-[12px] font-bold text-white bg-[#16130C] px-3 h-[28px] rounded-full hover:bg-[#2A2520] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="text-[12px] text-[#9C9485] hover:text-[#16130C]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
