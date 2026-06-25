"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteHostButton({
  hostId,
  hostName,
}: {
  hostId: string;
  hostName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const canDelete = confirmText.trim() === hostName.trim() && !loading;

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hosts/${hostId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      router.push("/admin/hosts");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-[13px] font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
      >
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-[20px] font-bold text-dark mb-2">
              Delete host?
            </h2>
            <p className="text-[13px] text-text3 leading-relaxed mb-4">
              This permanently deletes{" "}
              <strong className="text-dark">{hostName}</strong>&apos;s account and
              all of their dashboard data (properties, bookings, menus, kitchen
              records). Their listings will be unassigned and stay live. This
              cannot be undone.
            </p>
            <label className="block text-[12px] font-semibold text-text3 uppercase tracking-wide mb-1">
              Type the host name to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={hostName}
              className="w-full px-4 py-2.5 text-[16px] rounded-xl border border-border bg-canvas text-dark outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            />

            {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleDelete}
                disabled={!canDelete}
                className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete Host"}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                  setError(null);
                }}
                className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
