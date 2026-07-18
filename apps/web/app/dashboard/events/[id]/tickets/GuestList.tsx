"use client";
import { useState } from "react";

type Guest = { id: string; attendee_name: string; attendee_email: string; tier_name: string; status: string; coupon_code: string | null };

export default function GuestList({ guests }: { guests: Guest[] }) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? guests.filter((g) => (g.attendee_name + " " + g.attendee_email).toLowerCase().includes(q.trim().toLowerCase()))
    : guests;
  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Guests ({guests.length})</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email"
          className="w-48 rounded border border-neutral-300 px-3 py-2 text-[16px]" />
      </div>
      <div className="mt-3 divide-y divide-neutral-100">
        {filtered.length === 0 && <p className="py-2 text-sm text-neutral-500">No matches.</p>}
        {filtered.map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold">{g.attendee_name}</p>
              <p className="truncate text-xs text-neutral-500">
                {g.tier_name} · {g.attendee_email}{g.coupon_code ? ` · 🎟 ${g.coupon_code}` : ""}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${g.status === "checked_in" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"}`}>
              {g.status === "checked_in" ? "Checked in" : "Issued"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
