"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Props {
  menuId: string;
  initialMode: "combined" | "split";
}

export function OrderViewModeForm({ menuId, initialMode }: Props) {
  const [mode, setMode] = useState<"combined" | "split">(initialMode);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function pick(next: "combined" | "split") {
    if (next === mode) return;
    const prev = mode;
    setMode(next);
    setSaving(true);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, order_view_mode: next }),
      });
      if (!res.ok) {
        setMode(prev);
        showToast("Couldn't save", "error");
        return;
      }
      showToast("Saved", "success");
    } catch {
      setMode(prev);
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset className="max-w-xl space-y-3" disabled={saving}>
      <legend className="text-[13px] font-bold text-dark mb-2">Order screen mode</legend>

      <label className="flex items-start gap-3 bg-white border border-border rounded-xl p-4 cursor-pointer">
        <input
          type="radio"
          name="mode"
          value="combined"
          checked={mode === "combined"}
          onChange={() => pick("combined")}
          className="mt-1"
        />
        <div>
          <p className="font-semibold text-dark">Combined</p>
          <p className="text-[12px] text-text2">
            One screen shows kitchen + bar tickets together. Default.
          </p>
        </div>
      </label>

      <label className="flex items-start gap-3 bg-white border border-border rounded-xl p-4 cursor-pointer">
        <input
          type="radio"
          name="mode"
          value="split"
          checked={mode === "split"}
          onChange={() => pick("split")}
          className="mt-1"
        />
        <div>
          <p className="font-semibold text-dark">Split</p>
          <p className="text-[12px] text-text2">
            Each station gets its own URL — give the bar a tablet of its own.
          </p>
        </div>
      </label>
    </fieldset>
  );
}
