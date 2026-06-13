"use client";

import { useState } from "react";
import Link from "next/link";
import { Toggle } from "@/components/ui/Toggle";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { TablesSection } from "@/components/dashboard/listings/TablesSection";

// Re-exported for callers (page.tsx server components) that need the types.
// TablesSection now owns the canonical definitions.
export type { AreaOption, InitialTable } from "@/components/dashboard/listings/TablesSection";
import type { AreaOption, InitialTable } from "@/components/dashboard/listings/TablesSection";

interface Props {
  listingId: string;
  menuId:    string;
  menuName:  string;
  menuSlug:  string;
  initialTableOrdering: boolean;
  areas:     AreaOption[];
  initialTables: InitialTable[];
  /**
   * "full"          — legacy /dashboard layout; back link to /dashboard/listings/<id>.
   * "ordering-only" — /eat layout; back link to /eat/listings/<id>; live-ops links
   *                   bounce back to /eat after; surface POS related card +
   *                   "Next: Kitchen costing" hint.
   */
  mode?: "full" | "ordering-only";
  /** URL prefix for /eat hints. Required when mode === "ordering-only". */
  featureBaseHref?: string;
}

export function TableOrderingClient(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({
  listingId,
  menuId,
  menuName,
  menuSlug,
  initialTableOrdering,
  areas,
  initialTables,
  mode = "full",
  featureBaseHref,
}: Props) {
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

  // Back-link target for the legacy /dashboard/menu/<id>/* operational pages
  // (kitchen view, QR, audit) so they know where to return. In ordering-only
  // mode we hand them the /eat URL so the user stays in the eat shell.
  const ordersOwnHref =
    mode === "ordering-only" && featureBaseHref
      ? `${featureBaseHref}/orders`
      : `/dashboard/listings/${listingId}/orders`;
  const back = `back=${encodeURIComponent(ordersOwnHref)}`;
  const overviewHref =
    mode === "ordering-only" && featureBaseHref
      ? featureBaseHref
      : `/dashboard/listings/${listingId}`;
  // POS is the natural next step after Orders in the setup chain — same
  // order pipeline, staff-driven side. Tab nav order: Orders → POS → Kitchen.
  const nextFeatureHref =
    mode === "ordering-only" && featureBaseHref
      ? `${featureBaseHref}/pos`
      : null;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={overviewHref}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
        >
          {mode === "ordering-only" ? "← Back to overview" : "← Back to dashboard"}
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mt-2">
          Table ordering
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          Guests scan a table QR code and order directly from their seat — for {menuName}.
        </p>
      </div>

      {/* Toggle card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[14px] font-bold text-dark">Table ordering</p>
            <p className="text-[12px] text-text3 mt-0.5 max-w-[480px]">
              {enabled
                ? "Active — guests can place orders by scanning the table QR code."
                : "Off. Turn it on to start accepting orders from guest tables."}
            </p>
          </div>
          <Toggle checked={enabled} onChange={toggle} disabled={toggling} />
        </div>

        {enabled && (
          <div className="mt-4 p-3 rounded-lg bg-amber/8 border border-amber/20">
            <p className="text-[12px] text-text2">
              <span className="font-bold">Heads up:</span> Make sure someone is watching the kitchen view when ordering is active.
            </p>
          </div>
        )}
      </div>

      {/* Tables — switch between list (CRUD) and floor map (positions) */}
      <TablesSection
        menuId={menuId}
        areas={areas}
        initialTables={initialTables}
        showToast={showToast}
      />


      {/* Operational deep links — only useful once ordering is on */}
      {enabled && (
        <div>
          <h2 className="font-display text-[16px] font-bold text-dark mb-2">Live operations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href={`/dashboard/menu/${menuId}/orders?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
            >
              <span className="text-[22px] shrink-0">🍳</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-dark">Kitchen view</p>
                <p className="text-[11px] text-text3 truncate">Live order screen</p>
              </div>
              <span className="text-text3 text-[16px] shrink-0">›</span>
            </Link>
            <Link
              href={`/dashboard/menu/${menuId}/qr?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
            >
              <span className="text-[22px] shrink-0">🔳</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-dark">QR codes</p>
                <p className="text-[11px] text-text3 truncate">Print one per table</p>
              </div>
              <span className="text-text3 text-[16px] shrink-0">›</span>
            </Link>
            <Link
              href={`/dashboard/menu/${menuId}/audit?${back}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-border p-3.5 shadow-sm hover:shadow-md hover:border-amber/40 transition-all"
            >
              <span className="text-[22px] shrink-0">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-dark">Audit log</p>
                <p className="text-[11px] text-text3 truncate">Voids and overrides</p>
              </div>
              <span className="text-text3 text-[16px] shrink-0">›</span>
            </Link>
          </div>
        </div>
      )}

      {/* Help text — using menuSlug here keeps the unused-var lint happy and
          gives the owner a way to copy the public URL pattern. */}
      <p className="text-[11px] text-text3">
        Public menu lives at <code>/m/{menuSlug}</code>. Each table also has its own QR code that
        encodes the table number into the URL.
      </p>

      {/* /eat-only: single "Next: POS" hint. POS is the natural next step
          (same order pipeline, staff-driven side). Kitchen costing comes
          after POS in the new tab order. */}
      {mode === "ordering-only" && nextFeatureHref && (
        <a
          href={nextFeatureHref}
          title="Tablet POS for waiters and managers: take orders at the table, settle bills, manage table sessions. Sign-in is per-staff with a 4-digit PIN — no email, no password. Same orders pipeline as table ordering; same kitchen view."
          className="group flex items-start gap-3 bg-white rounded-xl border border-[#E2DDD5] shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all p-4"
        >
          <span className="shrink-0 text-[22px] leading-none mt-0.5">📱</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#16130C] group-hover:text-[#E8A020] transition-colors">
              Next: POS terminal
            </p>
            <p className="text-[12px] text-[#9C9485] mt-0.5 leading-snug">
              Tablet sign-in for waiters; same orders, same kitchen view — just staff-driven instead of guest-scanned.
            </p>
          </div>
          <span className="shrink-0 text-[#C5BFB5] text-[16px] mt-1 group-hover:text-[#E8A020] transition-colors">→</span>
        </a>
      )}
    </div>
  );
}

// (TablesSection lives in components/dashboard/listings/TablesSection.tsx now.
//  It's shared with the Reservations Floor tab so both surfaces can manage
//  the same restaurant_tables data.)
