"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { useEatCart } from "./useEatCart";
import { CartPanel } from "./CartPanel";

/**
 * Header for the eat surfaces.
 *
 * Replaces the marketplace Nav on purpose. That nav is built for browsing
 * stays, experiences and real estate — a search bar, Explore, List your space,
 * Sign in. None of it belongs over a menu, and it pushes the one control that
 * does matter here, the basket, off the screen entirely.
 *
 * Fixed rather than sticky so it never lifts off the dark hero on scroll, and
 * transparent over the hero with a blurred ground once the page moves under it.
 */
export function EatHeader({ backHref }: { backHref?: string }) {
  const { cart, count, total, setQty, clear } = useEatCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-[100] bg-purple-dark/80 backdrop-blur-[12px] border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 h-[60px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Back"
                className="size-9 -ml-1 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="size-4.5" />
              </Link>
            )}
            <Link
              href="/eat"
              className="font-display text-[18px] font-extrabold tracking-[-0.025em] text-white"
            >
              klick<span className="text-amber">.</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={count > 0 ? `Basket, ${count} items` : "Basket, empty"}
            className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-extrabold transition-colors ${
              count > 0
                ? "bg-amber text-dark hover:bg-amber2"
                : "border border-white/20 text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <ShoppingBag className="size-4" />
            {count > 0 ? (
              <span className="tabular-nums">
                {count} · KSh {total.toLocaleString()}
              </span>
            ) : (
              <span className="hidden sm:inline">Basket</span>
            )}
          </button>
        </div>
      </header>

      <CartPanel
        cart={cart}
        total={total}
        open={open}
        onClose={() => setOpen(false)}
        onSetQty={setQty}
        onCleared={clear}
        whatsappPhone={cart?.whatsappPhone ?? ""}
        canDeliver={cart?.canDeliver ?? false}
      />
    </>
  );
}
