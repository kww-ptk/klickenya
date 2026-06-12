"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StockEnableButton({ menuId }: { menuId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function enable() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stock/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, enabled: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to enable");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to enable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className="bg-amber text-dark font-bold text-[14px] px-6 h-[48px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50 shadow-sm"
      >
        {busy ? "Enabling…" : "Enable Klickenya Kitchen"}
      </button>
      {err && <p className="text-[12px] text-[#DC2626] mt-2">{err}</p>}
    </>
  );
}
