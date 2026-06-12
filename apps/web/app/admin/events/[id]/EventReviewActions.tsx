"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface EventReviewActionsProps {
  eventId: string;
  eventTitle: string;
}

export function EventReviewActions({ eventId, eventTitle }: EventReviewActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function handleAction(action: "approve" | "reject") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "reject" ? { reason: rejectReason } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Action failed");
        return;
      }

      router.refresh();
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
      setShowRejectModal(false);
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          disabled={loading}
          onClick={() => handleAction("approve")}
          className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-[14px] hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Approve & publish
        </button>
        <button
          disabled={loading}
          onClick={() => setShowRejectModal(true)}
          className="flex-1 py-3 rounded-xl border border-red-300 text-red-600 font-semibold text-[14px] hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          Reject
        </button>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-[440px] bg-white rounded-2xl p-6 shadow-xl">
            <h3 className="text-[18px] font-bold text-text mb-2">Reject event</h3>
            <p className="text-[13px] text-text2 mb-4">
              Rejecting &quot;{eventTitle}&quot;. The host will be notified with your reason.
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              className="w-full rounded-xl border border-border px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-text font-semibold text-[14px] hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={loading || !rejectReason.trim()}
                onClick={() => handleAction("reject")}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-[14px] hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
