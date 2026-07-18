"use client";
import { useState } from "react";

export default function DoorCodeEntry() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/events/tickets/door", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Invalid code"); return; }
      window.location.reload(); // cookie is set → server renders the scanner
    } catch {
      setError("Network error — please retry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-xl font-bold">Ticket scanner</h1>
      <p className="mt-1 text-sm text-neutral-500">Enter the door code from the event host to start scanning.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ENTER CODE"
          autoCapitalize="characters"
          maxLength={6}
          className="w-full rounded-lg border border-neutral-300 px-4 py-4 text-center text-[22px] font-mono tracking-[0.4em] uppercase"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy || code.trim().length < 6}
          className="w-full rounded-xl bg-[#16130C] py-3.5 font-bold text-white disabled:opacity-50">
          {busy ? "Checking…" : "Start scanning"}
        </button>
      </form>
    </main>
  );
}
