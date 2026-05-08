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
}

export function PosPageClient(props: Props) {
  return (
    <ToastProvider>
      <PosPageInner {...props} />
    </ToastProvider>
  );
}

function PosPageInner({ listingId, menuId, menuName, menuSlug }: Props) {
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
    </div>
  );
}
