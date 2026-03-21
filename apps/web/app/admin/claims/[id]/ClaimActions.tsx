"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface ClaimActionsProps {
  claimId: string;
  currentStatus: string;
}

export function ClaimActions({ claimId, currentStatus }: ClaimActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setIsLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setDone(action === "approve" ? "approved" : "rejected");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(null);
    }
  }

  if (done) {
    return (
      <div className={`rounded-2xl p-6 text-center ${done === "approved" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <p className={`text-sm font-semibold ${done === "approved" ? "text-green-700" : "text-red-700"}`}>
          {done === "approved"
            ? "✓ Claim approved. Listing is now verified in Sanity and owner has been notified."
            : "✗ Claim rejected. Owner has been notified."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6">
      <h2 className="font-display text-[16px] font-bold text-[#16130C] mb-4">Admin Actions</h2>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleAction("approve")}
          disabled={isLoading !== null}
          className="flex-1 bg-[#16A34A] text-white font-bold text-sm rounded-full py-3 hover:bg-[#15803d] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading === "approve" && <Loader2 className="size-4 animate-spin" />}
          ✓ Approve & Verify
        </button>
        <button
          onClick={() => handleAction("reject")}
          disabled={isLoading !== null}
          className="flex-1 bg-white border border-red-300 text-red-600 font-bold text-sm rounded-full py-3 hover:bg-red-50 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading === "reject" && <Loader2 className="size-4 animate-spin" />}
          ✗ Reject
        </button>
      </div>

      <p className="text-xs text-[#9C9485] mt-3 text-center">
        Approving sets isVerified = true in Sanity and sends a verification email to the owner.
      </p>
    </div>
  );
}
