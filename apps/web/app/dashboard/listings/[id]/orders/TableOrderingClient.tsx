"use client";

import { useState } from "react";
import Link from "next/link";
import { TableSetup } from "@/components/dashboard/menu/TableSetup";
import { Toggle } from "@/components/ui/Toggle";
import { ToastProvider, useToast } from "@/components/ui/Toast";

export interface AreaOption {
  id: string;
  name: string;
}

interface Props {
  listingId: string;
  menuId:    string;
  menuName:  string;
  menuSlug:  string;
  initialTableOrdering: boolean;
  areas:     AreaOption[];
}

export function TableOrderingClient(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ listingId, menuId, menuName, menuSlug, initialTableOrdering, areas }: Props) {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(initialTableOrdering);
  const [toggling, setToggling] = useState(false);

  // Same toggle endpoint the menu builder's Publish panel uses, so behaviour
  // (warnings about open orders etc) stays consistent.
  async function toggle() {
    const next = !enabled;
    if (!next) {
      if (!confirm("Disable table ordering? Guests will no longer be able to place orders from their table.")) {
        return;
      }
    }
    setToggling(true);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, table_ordering: next }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!next && data.open_order_count > 0) {
        showToast(
          `Table ordering disabled. ${data.open_order_count} order${data.open_order_count > 1 ? "s" : ""} still in progress.`,
          "error",
        );
      } else {
        showToast(next ? "Table ordering enabled" : "Table ordering disabled");
      }
      setEnabled(next);
    } catch {
      showToast("Failed to update table ordering setting", "error");
    } finally {
      setToggling(false);
    }
  }

  const back = `back=${encodeURIComponent(`/dashboard/listings/${listingId}/orders`)}`;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/dashboard/listings/${listingId}`}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Table ordering
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Guests scan a table QR code and order directly from their seat — for {menuName}.
        </p>
      </div>

      {/* Toggle card */}
      <div className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[14px] font-bold text-[#16130C]">Table ordering</p>
            <p className="text-[12px] text-[#9C9485] mt-0.5 max-w-[480px]">
              {enabled
                ? "Active — guests can place orders by scanning the table QR code."
                : "Off. Turn it on to start accepting orders from guest tables."}
            </p>
          </div>
          <Toggle checked={enabled} onChange={toggle} disabled={toggling} />
        </div>

        {enabled && (
          <div className="mt-4 p-3 rounded-lg bg-[#E8A020]/8 border border-[#E8A020]/20">
            <p className="text-[12px] text-[#5E5848]">
              <span className="font-bold">Heads up:</span> Make sure someone is watching the kitchen view when ordering is active.
            </p>
          </div>
        )}
      </div>

      {/* Tables CRUD */}
      <div>
        <h2 className="font-display text-[16px] font-bold text-[#16130C] mb-2">Tables</h2>
        <p className="text-[12px] text-[#9C9485] mb-3">
          Add a row per table — these become QR-scannable destinations and identify orders to the kitchen.
        </p>
        <TableSetup menuId={menuId} showToast={showToast} areas={areas} />
      </div>

      {/* Operational deep links — only useful once ordering is on */}
      {enabled && (
        <div>
          <h2 className="font-display text-[16px] font-bold text-[#16130C] mb-2">Live operations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href={`/dashboard/menu/${menuId}/orders?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-[#E2DDD5] p-3.5 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all"
            >
              <span className="text-[22px] shrink-0">🍳</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#16130C]">Kitchen view</p>
                <p className="text-[11px] text-[#9C9485] truncate">Live order screen</p>
              </div>
              <span className="text-[#9C9485] text-[16px] shrink-0">›</span>
            </Link>
            <Link
              href={`/dashboard/menu/${menuId}/qr?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-[#E2DDD5] p-3.5 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all"
            >
              <span className="text-[22px] shrink-0">🔳</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#16130C]">QR codes</p>
                <p className="text-[11px] text-[#9C9485] truncate">Print one per table</p>
              </div>
              <span className="text-[#9C9485] text-[16px] shrink-0">›</span>
            </Link>
            <Link
              href={`/dashboard/menu/${menuId}/audit?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-[#E2DDD5] p-3.5 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all"
            >
              <span className="text-[22px] shrink-0">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#16130C]">Audit log</p>
                <p className="text-[11px] text-[#9C9485] truncate">Voids and overrides</p>
              </div>
              <span className="text-[#9C9485] text-[16px] shrink-0">›</span>
            </Link>
          </div>
        </div>
      )}

      {/* Help text — using menuSlug here keeps the unused-var lint happy and
          gives the owner a way to copy the public URL pattern. */}
      <p className="text-[11px] text-[#9C9485]">
        Public menu lives at <code>/m/{menuSlug}</code>. Each table also has its own QR code that
        encodes the table number into the URL.
      </p>
    </div>
  );
}
