"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompleteButton({ menuId }: { menuId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ menu_id: menuId }),
      });
    } catch {
      // Non-blocking: we still send the owner to the dashboard.
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] disabled:opacity-50 text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
    >
      {busy ? "Finishing…" : "Finish setup →"}
    </button>
  );
}
