"use client";

import { useState } from "react";
import { Copy, Check, Monitor } from "lucide-react";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { StaffSection } from "@/components/dashboard/listings/StaffSection";

/**
 * Everything needed to put this order queue on a tablet, on the Orders page.
 *
 * Called the FOOD DELIVERY ORDERS, not the kitchen terminal. "Kitchen" already means
 * Klickenya Kitchen here — stock, recipes, costing — and two different things
 * sharing a word is how an owner ends up on the wrong screen.
 *
 * It needs nothing from POS. It once lived only on the POS tab, which is
 * hidden when pos_enabled is off, so a delivery-only restaurant could not
 * reach the tablet, could not create the PINs it needs, and was given no hint
 * either existed. Orders are the reason to open it, so the Orders page is
 * where it belongs.
 */
export function OrderTabletPanel(props: {
  menuId: string;
  menuSlug: string;
  /** The auto-created Food Delivery Station, when there is one. */
  stationPin?: string | null;
}) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({
  menuId,
  menuSlug,
  stationPin,
}: {
  menuId: string;
  menuSlug: string;
  stationPin?: string | null;
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://klickenya.com";
  const tabletUrl = `${origin}/tablet/${menuSlug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(tabletUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("Could not copy URL", "error");
    }
  }

  return (
    <details open className="rounded-2xl border border-[#E2DDD5] bg-white">
      <summary className="cursor-pointer list-none p-4 flex items-center gap-2 text-[13.5px] font-bold text-[#16130C]">
        <Monitor className="size-4 text-[#9C9485]" aria-hidden />
        Food Delivery Orders — open on a tablet
      </summary>

      <div className="border-t border-[#F4F1EC] p-4 space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#9C9485] mb-2">
            Food Delivery Orders URL
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-[#E2DDD5] bg-[#FDFCFB] px-3 py-3">
            <code className="flex-1 truncate text-[13px] text-[#16130C]">{tabletUrl}</code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-[12px] font-semibold text-[#16130C] hover:text-[#E8A020]"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-[#6B6355] leading-relaxed">
            The same orders you see here, on the counter. Staff sign in with a 4-digit PIN —
            they never need your password, and this works whether or not POS is switched on.
            Two views, switched in its header: <strong>Orders</strong> for whole orders,
            deliveries and the rider handover code, and <strong>Stations</strong> for what
            each section is cooking.
          </p>
          {/* The PIN belongs beside the link. Splitting them across two
              screens is what turned "open this on a tablet" into a support
              question. */}
          {stationPin && (
            <div className="mt-3 rounded-xl border border-[#E2DDD5] bg-[#FDFCFB] p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9C9485]">
                Sign in with this PIN
              </p>
              <p className="font-mono text-[26px] font-bold tracking-[0.3em] text-[#16130C] mt-0.5">
                {stationPin}
              </p>
              <p className="text-[12px] text-[#6B6355] mt-1">
                Created for you when delivery was switched on. Change it below like any
                other staff PIN.
              </p>
            </div>
          )}

          <a
            href={`/tablet/${menuSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-full bg-[#16130C] px-6 h-[44px] leading-[44px] text-[13.5px] font-bold text-white hover:bg-[#2A251A]"
          >
            Open Food Delivery Orders →
          </a>
        </div>

        <div className="border-t border-[#F4F1EC] pt-4">
          <h3 className="font-display text-[15px] font-bold text-[#16130C] mb-1">
            Staff &amp; PINs
          </h3>
          <p className="text-[12.5px] text-[#6B6355] mb-3">
            Anyone who should open Food Delivery Orders needs a PIN here.
          </p>
          <StaffSection
            menuId={menuId}
            menuSlug={menuSlug}
            showToast={showToast}
            showPosUrl={false}
          />
        </div>
      </div>
    </details>
  );
}
