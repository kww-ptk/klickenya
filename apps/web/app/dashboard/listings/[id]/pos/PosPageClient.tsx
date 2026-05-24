"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { StaffSection } from "@/components/dashboard/listings/StaffSection";

interface Props {
  listingId: string;
  menuId:    string;
  menuName:  string;
  menuSlug:  string;
  /**
   * "full"     — legacy /dashboard; back link to /dashboard/listings/<id>.
   * "pos-only" — /eat shell; back link to overview; adds Related: Table
   *              ordering hint (POS is the staff-side of the ordering flow).
   */
  mode?: "full" | "pos-only";
  /** URL prefix for /eat hints. Required when mode === "pos-only". */
  featureBaseHref?: string;
}

export function PosPageClient(props: Props) {
  return (
    <ToastProvider>
      <PosPageInner {...props} />
    </ToastProvider>
  );
}

function PosPageInner({ listingId, menuId, menuName, menuSlug, mode = "full", featureBaseHref }: Props) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const posUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/pos/${menuSlug}`
      : `https://klickenya.com/pos/${menuSlug}`;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(posUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("Could not copy URL", "error");
    }
  }

  const overviewHref =
    mode === "pos-only" && featureBaseHref
      ? featureBaseHref
      : `/dashboard/listings/${listingId}`;
  const ordersHref =
    mode === "pos-only" && featureBaseHref
      ? `${featureBaseHref}/orders`
      : `/dashboard/listings/${listingId}/orders`;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={overviewHref}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
        >
          {mode === "pos-only" ? "← Back to overview" : "← Back to dashboard"}
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          POS terminal
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Tablet sign-in for waiters, kitchen and managers — for {menuName}.
        </p>
      </div>

      {/* Open + URL block — the two things owners actually look for */}
      <div className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm p-5 space-y-4">
        <div>
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wide mb-2">
            POS sign-in URL
          </p>
          <div className="flex items-center gap-2 bg-[#FDFCFB] border border-[#E2DDD5] rounded-xl px-3 py-3">
            <code className="flex-1 text-[13px] text-[#16130C] truncate">{posUrl}</code>
            <button
              type="button"
              onClick={copyUrl}
              className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#16130C] hover:text-[#E8A020] px-2 h-9 rounded-full"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[12px] text-[#9C9485] mt-2 leading-relaxed">
            Open this on your kitchen tablet. Each staff member signs in with their own 4-digit PIN — no email, no password.
          </p>
        </div>
        <a
          href={`/pos/${menuSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full sm:w-auto sm:inline-block bg-[#E8A020] text-[#16130C] font-bold text-[14px] px-6 h-[48px] leading-[48px] text-center rounded-full hover:bg-[#d4911c] transition-colors"
        >
          📱 Open POS terminal in new tab →
        </a>
      </div>

      {/* Staff CRUD — extracted from the old reservations-settings page */}
      <div>
        <h2 className="font-display text-[16px] font-bold text-[#16130C] mb-2">Staff &amp; PINs</h2>
        <StaffSection
          menuId={menuId}
          menuSlug={menuSlug}
          showToast={showToast}
          showPosUrl={false}
        />
      </div>

      {/* /eat-only: related-feature hint pointing back to Ordering setup —
          POS and Table Ordering share the same order pipeline; POS is just
          the staff-driven side. */}
      {mode === "pos-only" && (
        <a
          href={ordersHref}
          title="Configure tables, toggle table ordering on/off, see live operational links (kitchen view, QR codes, audit log)."
          className="group flex items-start gap-3 bg-white rounded-xl border border-[#E2DDD5] shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all p-4"
        >
          <span className="shrink-0 text-[22px] leading-none mt-0.5">🛒</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#16130C] group-hover:text-[#E8A020] transition-colors">
              Related: Table ordering setup
            </p>
            <p className="text-[12px] text-[#9C9485] mt-0.5 leading-snug">
              Tables, on/off toggle, and live kitchen view — POS and table ordering share the same order pipeline.
            </p>
          </div>
          <span className="shrink-0 text-[#C5BFB5] text-[16px] mt-1 group-hover:text-[#E8A020] transition-colors">→</span>
        </a>
      )}
    </div>
  );
}
