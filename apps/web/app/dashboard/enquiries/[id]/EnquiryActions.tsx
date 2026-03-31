"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface ReplyHistoryEntry {
  date: string;
  status: string;
  subject: string;
  message: string;
  isUserReply?: boolean;
}

interface EnquiryActionsProps {
  id: string;
  currentStatus: string;
  guestName: string;
  listingTitle: string;
  replyHistory: ReplyHistoryEntry[];
}

export function EnquiryActions({
  id,
  currentStatus,
  guestName,
  listingTitle,
  replyHistory,
}: EnquiryActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Status
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  // Reply
  const [replySubject, setReplySubject] = useState(
    listingTitle ? `Re: Your enquiry about ${listingTitle}` : "Re: Your enquiry on Klickenya"
  );
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState<string>("info");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  async function handleStatusUpdate(newStatus: string) {
    setStatusLoading(newStatus);
    try {
      const res = await fetch(`/api/dashboard/enquiries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      startTransition(() => router.refresh());
    } catch {
      // silent
    } finally {
      setStatusLoading(null);
    }
  }

  async function handleSendReply() {
    if (!replyMessage.trim()) return;
    setReplyLoading(true);
    setReplySuccess(false);
    try {
      const res = await fetch(`/api/dashboard/enquiries/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyMessage,
          subject: replySubject,
          status: replyStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setReplyMessage("");
      setReplySuccess(true);
      startTransition(() => router.refresh());
      setTimeout(() => setReplySuccess(false), 3000);
    } catch {
      // silent
    } finally {
      setReplyLoading(false);
    }
  }

  const statuses = [
    { value: "responded", label: "Mark Responded", className: "bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20" },
    { value: "converted", label: "Mark Converted", className: "bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20" },
    { value: "closed", label: "Mark Closed", className: "bg-[#9C9485]/10 text-[#9C9485] hover:bg-[#9C9485]/20" },
  ];

  const responseTypes = [
    { value: "approved", label: "✓ Approved", cls: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30 hover:bg-[#22C55E]/20" },
    { value: "rejected", label: "✗ Declined", cls: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/20" },
    { value: "pending", label: "⏳ Pending", cls: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/20" },
    { value: "info", label: "ℹ Update", cls: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30 hover:bg-[#3B82F6]/20" },
  ];

  const statusColors: Record<string, string> = {
    approved: "text-[#22C55E] bg-[#22C55E]/10",
    rejected: "text-[#EF4444] bg-[#EF4444]/10",
    pending: "text-[#F59E0B] bg-[#F59E0B]/10",
    info: "text-[#3B82F6] bg-[#3B82F6]/10",
    "user-reply": "text-[#8B5CF6] bg-[#8B5CF6]/10",
  };

  return (
    <div className="space-y-5">
      {/* Status Update */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] p-5 space-y-3">
        <h2 className="text-[15px] font-bold text-[#16130C]">Update Status</h2>
        <div className="flex flex-wrap gap-2">
          {statuses
            .filter((s) => s.value !== currentStatus)
            .map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatusUpdate(s.value)}
                disabled={!!statusLoading || isPending}
                className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 ${s.className}`}
              >
                {statusLoading === s.value ? "Updating..." : s.label}
              </button>
            ))}
        </div>
      </div>

      {/* Reply to Guest */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] p-5 space-y-4">
        <h2 className="text-[15px] font-bold text-[#16130C]">Reply to {guestName}</h2>

        {/* Response type */}
        <div>
          <p className="text-[11px] text-[#9C9485] uppercase tracking-wider font-medium mb-2">Response type</p>
          <div className="flex flex-wrap gap-2">
            {responseTypes.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReplyStatus(opt.value)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${
                  replyStatus === opt.value
                    ? opt.cls + " ring-2 ring-offset-1 ring-current"
                    : "bg-white text-[#9C9485] border-[#E2DDD5] hover:bg-[#F5F3F0]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={replySubject}
          onChange={(e) => setReplySubject(e.target.value)}
          placeholder="Subject line..."
          className="w-full px-4 py-2.5 text-[13px] rounded-xl border border-[#E2DDD5] bg-[#FAFAF8] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30 focus:border-[#E8A020]"
        />

        <textarea
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          placeholder="Write your reply to the guest..."
          rows={5}
          className="w-full px-4 py-3 text-[13px] rounded-xl border border-[#E2DDD5] bg-[#FAFAF8] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30 focus:border-[#E8A020] resize-none"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSendReply}
            disabled={!replyMessage.trim() || replyLoading || isPending}
            className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-[#E8A020] text-white hover:bg-[#d4911c] transition-colors disabled:opacity-50"
          >
            {replyLoading ? "Sending..." : "Send Reply"}
          </button>
          {replySuccess && (
            <span className="text-[13px] text-[#22C55E] font-medium">Reply sent!</span>
          )}
        </div>
      </div>

      {/* Email History */}
      {replyHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E2DDD5] p-5 space-y-3">
          <h2 className="text-[15px] font-bold text-[#16130C]">Conversation History</h2>
          <div className="space-y-3">
            {replyHistory.map((entry, i) => {
              const cls = statusColors[entry.status] || statusColors.info;
              return (
                <div
                  key={i}
                  className={`border rounded-xl p-4 space-y-2 ${
                    entry.isUserReply
                      ? "border-[#8B5CF6]/30 bg-[#8B5CF6]/[0.02]"
                      : "border-[#E2DDD5]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${cls}`}>
                        {entry.isUserReply ? "Guest reply" : entry.status}
                      </span>
                      <span className="text-[11px] text-[#9C9485]">{entry.date}</span>
                    </div>
                  </div>
                  {entry.subject && (
                    <p className="text-[13px] text-[#16130C] font-medium">{entry.subject}</p>
                  )}
                  <p className="text-[13px] text-[#9C9485] leading-relaxed whitespace-pre-wrap">{entry.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
