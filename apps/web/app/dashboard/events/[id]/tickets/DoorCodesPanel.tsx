"use client";
import { useState } from "react";

type Code = { id: string; label: string | null; created_at: string };

export default function DoorCodesPanel({ eventId, initialCodes }: { eventId: string; initialCodes: Code[] }) {
  const [codes, setCodes] = useState<Code[]>(initialCodes);
  const [busy, setBusy] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true); setError(null); setJustCreated(null);
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}/door-codes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Could not create code"); return; }
      setJustCreated(json.code);
      setCodes((c) => [{ id: json.id, label: json.label, created_at: json.created_at }, ...c]);
    } finally { setBusy(false); }
  }

  async function revoke(codeId: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}/door-codes`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codeId }),
      });
      if (!res.ok) { setError("Could not revoke"); return; }
      setCodes((c) => c.filter((x) => x.id !== codeId));
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Door codes</h2>
          <p className="text-sm text-neutral-500">
            Give gate staff a code so they can scan tickets at <span className="font-mono">/scan</span> without your login.
          </p>
        </div>
        <button onClick={generate} disabled={busy}
          className="shrink-0 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "…" : "Generate code"}
        </button>
      </div>

      {justCreated && (
        <div className="mt-4 rounded-lg bg-amber-50 p-4 text-center">
          <p className="text-xs text-amber-700">Share this code with your gate staff — shown once.</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-amber-900">{justCreated}</p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 divide-y divide-neutral-100">
        {codes.length === 0 && <p className="py-2 text-sm text-neutral-500">No active door codes.</p>}
        {codes.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-neutral-600">
              {c.label ? `${c.label} · ` : ""}created {new Date(c.created_at).toLocaleDateString("en-KE")}
            </span>
            <button onClick={() => revoke(c.id)} disabled={busy} className="text-red-600 hover:underline disabled:opacity-50">
              Revoke
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
