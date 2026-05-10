"use client";

import { useState } from "react";

export function WaitlistToggle({
  menuId,
  feature,
  initialValue,
  label,
  body,
  icon,
}: {
  menuId: string;
  feature: "takeaway" | "delivery";
  initialValue: boolean;
  label: string;
  body: string;
  icon: string;
}) {
  const [on, setOn] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const next = !on;
    try {
      const res = await fetch("/api/setup/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, feature, value: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Could not update.");
        setBusy(false);
        return;
      }
      setOn(next);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E2DDD5] bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="text-[24px] shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#16130C]">{label}</p>
          <p className="text-[12.5px] text-[#5E5848] mt-1">{body}</p>
          {error && <p className="text-[12px] text-red-600 mt-1">{error}</p>}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={
            "shrink-0 text-[12px] font-bold h-[36px] px-4 rounded-full transition-colors disabled:opacity-50 " +
            (on
              ? "bg-[#16A34A]/15 text-[#16A34A]"
              : "bg-[#16130C] text-white hover:bg-[#2a2418]")
          }
        >
          {busy ? "…" : on ? "On the list ✓" : "Notify me"}
        </button>
      </div>
    </div>
  );
}
