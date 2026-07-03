"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  editHref: string;
  variant: "host" | "admin";
  status?: string;
}

export function ListingRowActions({ id, editHref, variant, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isArchived = status === "archived";
  const base = variant === "admin" ? `/api/admin/listings/${id}` : `/api/dashboard/listings/${id}`;

  async function call(url: string, body: object, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch(url, { method: url.endsWith("/archive") ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "Failed"); return; }
      router.refresh();
    } catch { setErr("Network error"); } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={editHref} className="text-[13px] font-semibold text-dark hover:text-amber transition-colors">Edit</Link>
      {isArchived ? (
        <button disabled={busy} onClick={() => call(`${base}/archive`, { status: "published" })}
          className="text-[13px] font-semibold text-emerald-600 hover:underline">Restore</button>
      ) : (
        <button disabled={busy} onClick={() => call(`${base}/archive`, { status: "archived" }, "Archive this listing? It will be removed from the marketplace but can be restored.")}
          className="text-[13px] font-semibold text-amber hover:underline">{variant === "host" ? "Delete" : "Archive"}</button>
      )}
      {variant === "admin" && (
        <button disabled={busy} onClick={() => call(base, {}, "PERMANENTLY delete this listing? This cannot be undone.")}
          className="text-[13px] font-semibold text-red-600 hover:underline">Delete</button>
      )}
      {err && <span className="text-[12px] text-red-600">{err}</span>}
    </div>
  );
}
