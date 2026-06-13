"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  table: string;
  id: string;
  label?: string;
  size?: "sm" | "md";
}

export function DeleteButton({ table, id, label, size = "sm" }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, id }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete. Please try again.");
      }
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-2.5 py-1 text-[11px] font-semibold bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2.5 py-1 text-[11px] font-semibold text-text2 bg-surface rounded-md hover:bg-border transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`inline-flex items-center gap-1 text-text3 hover:text-red-500 transition-colors ${
        size === "sm" ? "text-[11px]" : "text-[13px]"
      }`}
      title={label ?? "Delete"}
    >
      <Trash2 className={size === "sm" ? "size-3.5" : "size-4"} />
      {label && <span>{label}</span>}
    </button>
  );
}
