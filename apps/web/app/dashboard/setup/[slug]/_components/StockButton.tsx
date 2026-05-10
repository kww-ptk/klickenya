"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StockButton({
  menuId,
  managePath,
}: {
  menuId: string;
  managePath: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/setup/stock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ menu_id: menuId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(managePath);
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] disabled:opacity-50 disabled:cursor-not-allowed text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
      >
        {busy ? "Turning on…" : "Yes — start tracking →"}
      </button>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
