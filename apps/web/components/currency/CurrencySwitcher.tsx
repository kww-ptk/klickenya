"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CURRENCIES,
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  type Currency,
} from "@/lib/real-estate/currency";
import { useDisplayCurrency } from "./CurrencyProvider";

/**
 * Currency picker.
 *
 * Prices across the marketplace are quoted in whatever the seller uses, which
 * on the coast is usually euro. Without this, comparing a Watamu villa against
 * a Nairobi apartment means doing arithmetic in your head.
 */
function CurrencySwitcher({ className }: { className?: string }) {
  const id = useId();
  const { currency, setCurrency, ratesUpdatedAt, isLive } = useDisplayCurrency();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const published = ratesUpdatedAt
    ? new Date(ratesUpdatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Display currency: ${CURRENCY_LABELS[currency]}. Change it.`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2",
          "text-[13.5px] font-semibold text-text2 transition-colors hover:border-text3 hover:text-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple2"
        )}
      >
        <span aria-hidden="true">{CURRENCY_SYMBOLS[currency]}</span>
        {currency}
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute right-0 top-[calc(100%+8px)] z-[220] w-[248px] overflow-hidden rounded-[18px] border border-border bg-white py-1.5 shadow-xl"
        >
          {CURRENCIES.map((code: Currency) => {
            const active = code === currency;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setCurrency(code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  active ? "bg-purple2/8" : "hover:bg-surface"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    active ? "bg-purple2 text-white" : "bg-surface text-text2"
                  )}
                >
                  {CURRENCY_SYMBOLS[code]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-text">
                    {code}
                  </span>
                  <span className="block truncate text-[12px] text-text3">
                    {CURRENCY_LABELS[code]}
                  </span>
                </span>
                {active && <Check className="size-4 shrink-0 text-purple2" />}
              </button>
            );
          })}

          {/*
            A converted price with no provenance is a number nobody can check,
            so the source and date travel with the control that produces them.
          */}
          <p className="border-t border-border px-4 pb-1 pt-2.5 text-[11.5px] leading-[1.5] text-text3">
            {isLive && published
              ? `Approximate, using rates published ${published}. Sellers are paid in the listing's own currency.`
              : "Approximate, using indicative rates. Sellers are paid in the listing's own currency."}
          </p>
        </div>
      )}
    </div>
  );
}

export { CurrencySwitcher };
