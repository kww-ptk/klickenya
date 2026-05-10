"use client";

/**
 * Step 4 client. Two add-forms (tables + staff) plus the live counts.
 * The "Continue" button is enabled once both counts ≥ 1.
 *
 * Uses the existing /api/menu/tables and /api/menu/staff endpoints — this
 * step is a guided wrapper around them, no new API surface.
 */

import { useState } from "react";
import Link from "next/link";

type Counts = { tables: number; staff: number };

const ROLE_OPTIONS = ["waiter", "manager", "cashier", "kitchen"] as const;
type Role = (typeof ROLE_OPTIONS)[number];

export function PosStepClient({
  menuId,
  initialCounts,
  nextHref,
}: {
  menuId: string;
  initialCounts: Counts;
  nextHref: string;
}) {
  const [counts, setCounts] = useState(initialCounts);

  return (
    <div className="space-y-5">
      <TablesPanel
        menuId={menuId}
        count={counts.tables}
        onAdded={(n) => setCounts((c) => ({ ...c, tables: c.tables + n }))}
      />
      <StaffPanel
        menuId={menuId}
        count={counts.staff}
        onAdded={() => setCounts((c) => ({ ...c, staff: c.staff + 1 }))}
      />

      {counts.tables >= 1 && counts.staff >= 1 ? (
        <Link
          href={nextHref}
          className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
        >
          Continue →
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="block w-full text-center bg-[#E2DDD5] text-[#9C9485] font-bold text-[14px] h-[48px] leading-[48px] rounded-full cursor-not-allowed"
        >
          Add at least one table and one staff PIN
        </button>
      )}
    </div>
  );
}

// ── Tables ────────────────────────────────────────────────────────────────

function TablesPanel({
  menuId,
  count,
  onAdded,
}: {
  menuId: string;
  count: number;
  onAdded: (added: number) => void;
}) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [single, setSingle] = useState({ table_number: "", capacity: "4" });
  const [bulk, setBulk] = useState("T1-T10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body =
        mode === "single"
          ? {
              menu_id: menuId,
              table_number: single.table_number.trim(),
              capacity: single.capacity ? Number(single.capacity) : undefined,
            }
          : { bulk: true, menu_id: menuId, range: bulk.trim() };
      const res = await fetch("/api/menu/tables", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not add table.");
        setBusy(false);
        return;
      }
      const added = mode === "single" ? 1 : Array.isArray(data?.tables) ? data.tables.length : 1;
      onAdded(added);
      if (mode === "single") setSingle({ table_number: "", capacity: "4" });
      setBusy(false);
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#E2DDD5] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#16130C]">Tables</p>
        <span className="text-[12px] text-[#9C9485]">
          {count} added
        </span>
      </div>
      <div className="flex gap-2">
        {(["single", "bulk"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              "flex-1 text-[12px] font-semibold h-[32px] rounded-full transition-colors " +
              (mode === m
                ? "bg-[#16130C] text-white"
                : "bg-[#F4F1EC] text-[#9C9485]")
            }
          >
            {m === "single" ? "Add one" : "Add a range"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "single" ? (
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Table number"
              value={single.table_number}
              onChange={(e) => setSingle((s) => ({ ...s, table_number: e.target.value }))}
              className="text-[16px] text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-3 py-2 focus:outline-none focus:border-[#E8A020]"
            />
            <input
              type="number"
              min={1}
              max={50}
              placeholder="Seats"
              value={single.capacity}
              onChange={(e) => setSingle((s) => ({ ...s, capacity: e.target.value }))}
              className="text-[16px] text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-3 py-2 focus:outline-none focus:border-[#E8A020]"
            />
          </div>
        ) : (
          <input
            required
            placeholder="T1-T10"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            className="w-full text-[16px] text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-3 py-2 focus:outline-none focus:border-[#E8A020]"
          />
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#16130C] hover:bg-[#2a2418] disabled:opacity-50 text-white font-bold text-[13px] h-[40px] rounded-full transition-colors"
        >
          {busy ? "Adding…" : "Add table" + (mode === "bulk" ? "s" : "")}
        </button>
      </form>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </section>
  );
}

// ── Staff ─────────────────────────────────────────────────────────────────

function StaffPanel({
  menuId,
  count,
  onAdded,
}: {
  menuId: string;
  count: number;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>("waiter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN must be 4–8 digits.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/menu/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, name: name.trim(), pin, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not add staff.");
        setBusy(false);
        return;
      }
      onAdded();
      setName("");
      setPin("");
      setRole("waiter");
      setBusy(false);
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#E2DDD5] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#16130C]">Staff PINs</p>
        <span className="text-[12px] text-[#9C9485]">
          {count} added
        </span>
      </div>
      <form onSubmit={submit} className="space-y-2">
        <input
          required
          placeholder="Name (e.g. Asha)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-[16px] text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-3 py-2 focus:outline-none focus:border-[#E8A020]"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            required
            inputMode="numeric"
            pattern="\d{4,8}"
            placeholder="PIN (4–8 digits)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="text-[16px] text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-3 py-2 focus:outline-none focus:border-[#E8A020]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="text-[16px] text-[#16130C] bg-[#F4F1EC] border border-[#E2DDD5] rounded-md px-3 py-2 focus:outline-none focus:border-[#E8A020]"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r[0].toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#16130C] hover:bg-[#2a2418] disabled:opacity-50 text-white font-bold text-[13px] h-[40px] rounded-full transition-colors"
        >
          {busy ? "Adding…" : "Add staff member"}
        </button>
      </form>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </section>
  );
}
