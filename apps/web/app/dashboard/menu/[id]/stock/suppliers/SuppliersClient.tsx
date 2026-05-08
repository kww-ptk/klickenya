"use client";

import { useState } from "react";

export interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  archived: boolean;
  updated_at: string;
}

const inputCls =
  "w-full border border-[#E2DDD5] rounded-xl px-3 py-3 text-[15px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 bg-white";

export function SuppliersClient({ initial }: { initial: SupplierRow[] }) {
  const [rows, setRows] = useState<SupplierRow[]>(initial);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function save(payload: Partial<SupplierRow> & { id?: string }) {
    const isEdit = !!payload.id;
    const res = await fetch("/api/stock/suppliers", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error ?? "Save failed");
    const row: SupplierRow = await res.json();
    setRows((prev) => {
      const next = isEdit ? prev.map((r) => (r.id === row.id ? row : r)) : [...prev, row];
      return next.filter((r) => !r.archived).sort((a, b) => a.name.localeCompare(b.name));
    });
    setAdding(false);
    setEditingId(null);
  }

  async function archive(id: string) {
    if (!confirm("Archive this supplier?")) return;
    await save({ id, archived: true });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => { setAdding(true); setEditingId(null); }}
        className="w-full sm:w-auto bg-[#E8A020] text-[#16130C] font-bold text-[14px] px-5 h-[48px] rounded-full hover:bg-[#d4911c] shadow-sm"
      >+ New supplier</button>

      {adding && <Form onSubmit={save} onCancel={() => setAdding(false)} />}

      <ul className="bg-white rounded-2xl border border-[#E2DDD5] divide-y divide-[#F4F1EC] overflow-hidden">
        {rows.length === 0 && !adding && <li className="p-6 text-center text-[14px] text-[#9C9485]">No suppliers yet.</li>}
        {rows.map((r) => editingId === r.id ? (
          <li key={r.id} className="p-3"><Form initial={r} onSubmit={save} onCancel={() => setEditingId(null)} /></li>
        ) : (
          <li key={r.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <p className="text-[15px] font-semibold text-[#16130C]">{r.name}</p>
              <p className="text-[12px] text-[#9C9485]">{[r.phone, r.email].filter(Boolean).join(" · ") || "No contact details"}</p>
            </div>
            <button onClick={() => setEditingId(r.id)} className="h-11 px-4 rounded-full text-[13px] font-semibold border border-[#E2DDD5] hover:border-[#E8A020] hover:text-[#E8A020]">Edit</button>
            <button onClick={() => archive(r.id)} className="h-11 px-4 rounded-full text-[13px] font-semibold border border-[#E2DDD5] hover:border-[#DC2626] hover:text-[#DC2626]">Archive</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Form({ initial, onSubmit, onCancel }: { initial?: SupplierRow; onSubmit: (v: Partial<SupplierRow> & { id?: string }) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit({ id: initial?.id, name: name.trim(), phone: phone.trim() || null, email: email.trim() || null, notes: notes.trim() || null }); }}
      className="border border-[#E2DDD5] rounded-2xl p-4 bg-[#FAFAF8] space-y-2"
    >
      <input className={inputCls} placeholder="Supplier name *" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={inputCls} type="tel" inputMode="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className={inputCls} type="email" inputMode="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <textarea className={inputCls} rows={2} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <button type="submit" className="bg-[#E8A020] text-[#16130C] font-bold text-[14px] px-5 h-[44px] rounded-full hover:bg-[#d4911c]">Save</button>
        <button type="button" onClick={onCancel} className="h-[44px] px-3 text-[14px] font-semibold text-[#9C9485] hover:text-[#16130C]">Cancel</button>
      </div>
    </form>
  );
}
