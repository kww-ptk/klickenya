"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, X, Send, Loader2 } from "lucide-react";

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  joined_at: string;
}

interface AttendeeActionsProps {
  attendees: Attendee[];
  eventTitle: string;
  eventSanityId: string;
}

export function AttendeeActions({ attendees, eventTitle, eventSanityId }: AttendeeActionsProps) {
  const router = useRouter();
  const [emailModal, setEmailModal] = useState<{ open: boolean; attendeeId?: string; attendeeName?: string }>({ open: false });
  const [removeModal, setRemoveModal] = useState<{ open: boolean; attendeeId?: string; attendeeName?: string }>({ open: false });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const confirmed = attendees.filter((a) => a.status === "confirmed");

  function openEmailModal(attendeeId?: string, attendeeName?: string) {
    setSubject(`Update: ${eventTitle}`);
    setMessage("");
    setFeedback(null);
    setEmailModal({ open: true, attendeeId, attendeeName });
  }

  function openRemoveModal(attendeeId: string, attendeeName: string) {
    setFeedback(null);
    setRemoveModal({ open: true, attendeeId, attendeeName });
  }

  async function handleSendEmail() {
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/dashboard/events/attendees/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSanityId,
          attendeeIds: emailModal.attendeeId ? [emailModal.attendeeId] : undefined,
          subject,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeedback({ type: "success", text: `Email sent to ${data.sent} attendee${data.sent !== 1 ? "s" : ""}` });
      setTimeout(() => {
        setEmailModal({ open: false });
        setFeedback(null);
      }, 1500);
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to send" });
    } finally {
      setSending(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/dashboard/events/attendees/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeId: removeModal.attendeeId,
          eventSanityId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRemoveModal({ open: false });
      router.refresh();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to remove" });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      {/* Email All button — rendered in header area */}
      {confirmed.length > 0 && (
        <button
          onClick={() => openEmailModal()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber/10 text-amber text-[13px] font-semibold hover:bg-amber/20 transition-colors"
        >
          <Mail className="size-3.5" />
          Email All ({confirmed.length})
        </button>
      )}

      {/* Attendee table */}
      <div className="rounded-xl border border-border overflow-hidden mt-6">
        <table className="w-full text-left">
          <thead className="bg-surface text-[12px] font-semibold text-text2 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 hidden md:table-cell">Email</th>
              <th className="px-4 py-3 hidden md:table-cell">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden md:table-cell">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attendees.map((a) => (
              <tr key={a.id} className="hover:bg-surface/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-[14px] font-medium text-text">{a.name}</p>
                  <p className="text-[12px] text-text2 md:hidden">{a.email}</p>
                </td>
                <td className="px-4 py-3 text-[13px] text-text2 hidden md:table-cell">
                  {a.email}
                </td>
                <td className="px-4 py-3 text-[13px] text-text2 hidden md:table-cell">
                  {a.phone ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    a.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] text-text2 hidden md:table-cell">
                  {new Date(a.joined_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {a.status === "confirmed" && (
                      <>
                        <button
                          onClick={() => openEmailModal(a.id, a.name)}
                          className="flex size-8 items-center justify-center rounded-lg text-text2 hover:bg-amber/10 hover:text-amber transition-colors"
                          title={`Email ${a.name}`}
                        >
                          <Mail className="size-4" />
                        </button>
                        <button
                          onClick={() => openRemoveModal(a.id, a.name)}
                          className="flex size-8 items-center justify-center rounded-lg text-text2 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title={`Remove ${a.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Email Modal */}
      {emailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !sending && setEmailModal({ open: false })} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl p-6">
            <h2 className="text-[18px] font-bold text-text mb-1">
              {emailModal.attendeeName ? `Email ${emailModal.attendeeName}` : `Email All Attendees (${confirmed.length})`}
            </h2>
            <p className="text-[13px] text-text2 mb-5">{eventTitle}</p>

            <label className="block text-[13px] font-medium text-text mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-text focus:outline-none focus:ring-2 focus:ring-amber/30 mb-4"
            />

            <label className="block text-[13px] font-medium text-text mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-border text-[14px] text-text focus:outline-none focus:ring-2 focus:ring-amber/30 resize-none mb-4"
              placeholder="Write your message to attendees..."
            />

            {feedback && (
              <p className={`text-[13px] font-medium mb-3 ${feedback.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
                {feedback.text}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setEmailModal({ open: false })}
                disabled={sending}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-text2 hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !subject.trim() || !message.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {removeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !removing && setRemoveModal({ open: false })} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h2 className="text-[18px] font-bold text-text mb-2">Remove attendee?</h2>
            <p className="text-[14px] text-text2 mb-6">
              Remove <strong>{removeModal.attendeeName}</strong> from {eventTitle}? They will be notified by email.
            </p>

            {feedback && feedback.type === "error" && (
              <p className="text-[13px] font-medium text-red-500 mb-3">{feedback.text}</p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRemoveModal({ open: false })}
                disabled={removing}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-text2 hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {removing ? <Loader2 className="size-4 animate-spin" /> : null}
                {removing ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
