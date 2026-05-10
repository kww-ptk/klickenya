"use client";

/**
 * "No, skip this" button. POSTs to /api/setup/decline with the right step
 * key, then routes to nextHref. Same shape as a "Skip for now" link except
 * it stamps <step>_decided_at — telling the resolver that the owner has
 * been asked and chose no, so the step isn't suggested again.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "reservations" | "table_ordering" | "stock";

export function DeclineButton({
  menuId,
  step,
  nextHref,
  label,
}: {
  menuId: string;
  step: Step;
  nextHref: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await fetch("/api/setup/decline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, step }),
      });
    } catch {
      // Non-blocking: continue to next step even if the decline write fails.
      // The banner will still show this step on next dashboard visit.
    }
    router.push(nextHref);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-[12px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors disabled:opacity-50"
    >
      {busy ? "Saving…" : label}
    </button>
  );
}
