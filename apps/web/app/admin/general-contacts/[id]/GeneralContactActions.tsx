"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface GeneralContactActionsProps {
  id: string;
  originalSubject: string;
}

export function GeneralContactActions({
  id,
  originalSubject,
}: GeneralContactActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Reply
  const [replySubject, setReplySubject] = useState(
    originalSubject ? `Re: ${originalSubject}` : ""
  );
  const [replyMessage, setReplyMessage] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  async function handleDraftReply() {
    setDraftLoading(true);
    try {
      const res = await fetch("/api/admin/ai/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "general_contact", id }),
      });
      if (!res.ok) throw new Error("Failed to draft reply");
      const data = await res.json();
      if (data.subject) setReplySubject(data.subject);
      if (data.message) setReplyMessage(data.message);
    } catch (err) {
      console.error("AI draft failed:", err);
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleSendReply() {
    if (!replyMessage.trim()) return;
    setReplyLoading(true);
    setReplySuccess(false);
    try {
      const res = await fetch(`/api/admin/general-contacts/${id}/send-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyMessage,
          subject: replySubject,
        }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      setReplyMessage("");
      setReplySubject("");
      setReplySuccess(true);
      startTransition(() => router.refresh());
      setTimeout(() => setReplySuccess(false), 3000);
    } catch (err) {
      console.error("Send reply failed:", err);
    } finally {
      setReplyLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Reply */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-display font-bold text-dark">
            Reply
          </h2>
          <button
            onClick={handleDraftReply}
            disabled={draftLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-amber/10 text-amber hover:bg-amber/20 transition-colors disabled:opacity-50"
          >
            {draftLoading ? (
              <>
                <svg
                  className="animate-spin size-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Drafting...
              </>
            ) : (
              <>
                <svg
                  className="size-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
                Draft reply with AI
              </>
            )}
          </button>
        </div>

        <input
          type="text"
          value={replySubject}
          onChange={(e) => setReplySubject(e.target.value)}
          placeholder="Subject line..."
          className="w-full px-4 py-2.5 text-[14px] rounded-xl border border-[#F0EDE8] bg-[#F7F5F2] text-dark placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber"
        />

        <textarea
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          placeholder="Write your reply..."
          rows={6}
          className="w-full px-4 py-3 text-[14px] rounded-xl border border-[#F0EDE8] bg-[#F7F5F2] text-dark placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber resize-none"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSendReply}
            disabled={!replyMessage.trim() || replyLoading || isPending}
            className="px-5 py-2 text-[13px] font-medium rounded-lg bg-amber text-white hover:bg-[#C78A1A] transition-colors disabled:opacity-50"
          >
            {replyLoading ? "Sending..." : "Send Reply"}
          </button>
          {replySuccess && (
            <span className="text-[13px] text-[#22C55E] font-medium">
              Reply sent successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
