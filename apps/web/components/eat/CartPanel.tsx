"use client";

import { useState } from "react";
import { X, Minus, Plus, Loader2, Bike, ShoppingBag as Bag, MapPin } from "lucide-react";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  type Fulfilment,
} from "@/lib/eat/whatsappOrder";
import type { Cart } from "./useEatCart";

/**
 * Cart and checkout.
 *
 * Submits to POST /api/orders as a takeaway order — the same endpoint
 * /m/[slug] uses, rather than a second ordering path to keep in step.
 *
 * Today every published menu has takeaway_enabled false, so the API answers
 * 400. That is surfaced as what it is ("this kitchen isn't taking online
 * orders yet") instead of a generic failure, because it is a setting the
 * restaurant controls, not a bug the guest can retry their way out of.
 */
export function CartPanel({
  cart,
  total,
  open,
  onClose,
  onSetQty,
  onCleared,
  whatsappPhone,
  canDeliver,
}: {
  cart: Cart | null;
  total: number;
  open: boolean;
  onClose: () => void;
  onSetQty: (idx: number, qty: number) => void;
  onCleared: () => void;
  /** Number that receives the order; "" when the kitchen has not set one. */
  whatsappPhone: string;
  /** This kitchen delivers with its own rider. */
  canDeliver: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [fulfilment, setFulfilment] = useState<Fulfilment>("pickup");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);

  /**
   * Hand the order to the kitchen over WhatsApp.
   *
   * Opened in a new tab rather than replacing this one, so the basket and the
   * page survive if the guest comes straight back — and on desktop, where
   * WhatsApp Web may not be signed in, they are not stranded on a dead page.
   */
  const submit = () => {
    if (!cart || !whatsappPhone) return;
    setBusy(true);
    setError(null);

    const message = buildOrderMessage({
      restaurant: cart.restaurant,
      lines: cart.lines,
      totalKes: total,
      fulfilment,
      deliveryAddress: address.trim(),
      customerName: name.trim(),
      customerPhone: phone.trim(),
      note: note.trim() || undefined,
    });

    const win = window.open(buildWhatsAppUrl(whatsappPhone, message), "_blank", "noopener");
    setBusy(false);

    if (!win) {
      setError("Your browser blocked the WhatsApp window. Allow pop-ups and try again.");
      return;
    }
    // Deliberately NOT clearing the basket: the guest still has to press send
    // inside WhatsApp, and we cannot know whether they did.
    setPlaced("sent");
  };

  const canSubmit =
    Boolean(cart?.lines.length) &&
    Boolean(whatsappPhone) &&
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    (fulfilment !== "delivery" || address.trim().length > 0) &&
    !busy;

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close basket"
        onClick={onClose}
        className="absolute inset-0 bg-purple-dark/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your basket"
        className={`absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[420px] max-h-[92dvh] md:max-h-none rounded-t-[26px] md:rounded-t-none bg-canvas text-text flex flex-col transition-transform duration-400 ease-out motion-reduce:transition-none ${
          open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="font-display text-[18px] font-extrabold tracking-[-0.02em]">
              {placed ? "Order sent" : "Your basket"}
            </h2>
            {cart && !placed && (
              <p className="text-text2 text-[12.5px] truncate">{cart.restaurant}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-9 rounded-full bg-surface hover:bg-surface2 flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="size-4" />
          </button>
        </header>

        {placed ? (
          <div className="flex-1 px-5 py-8">
            <p className="text-text2 text-[15px] leading-[1.6]">
              Your order is written out in WhatsApp — press send there to reach{" "}
              {cart?.restaurant ?? "the kitchen"}. They&apos;ll reply with a ready
              time. Your basket is still here until you do.
            </p>

          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!cart || cart.lines.length === 0 ? (
                <p className="text-text2 text-[14px] py-8">Your basket is empty.</p>
              ) : (
                <ul className="space-y-3">
                  {cart.lines.map((l, i) => (
                    <li
                      key={`${l.itemId}-${i}`}
                      className="flex items-start gap-3 pb-3 border-b border-border last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[14px] font-extrabold leading-[1.25]">
                          {l.name}
                        </p>
                        {l.note && (
                          <p className="text-text3 text-[12px] italic mt-0.5 line-clamp-2">
                            “{l.note}”
                          </p>
                        )}
                        <p className="text-amber-700 text-[13px] font-extrabold mt-1 tabular-nums">
                          KSh {(l.priceKes * l.qty).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSetQty(i, l.qty - 1)}
                          aria-label={`Remove one ${l.name}`}
                          className="size-8 rounded-full border border-border flex items-center justify-center hover:border-amber transition-colors"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-5 text-center text-[14px] font-extrabold tabular-nums">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSetQty(i, l.qty + 1)}
                          aria-label={`Add one ${l.name}`}
                          className="size-8 rounded-full border border-border flex items-center justify-center hover:border-amber transition-colors"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {cart && cart.lines.length > 0 && (
                <div className="mt-5 space-y-2.5">
                  {/* How it gets to them. Delivery is a real intention with no
                      riders behind it yet, so it is visible but not selectable —
                      hiding it would lose the signal that people want it. */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFulfilment("pickup")}
                      aria-pressed={fulfilment === "pickup"}
                      className={`rounded-[12px] border px-3 py-3 text-left transition-colors ${
                        fulfilment === "pickup"
                          ? "border-amber bg-amber-dim"
                          : "border-border bg-white hover:border-amber"
                      }`}
                    >
                      <Bag className="size-4 text-amber-700 mb-1.5" />
                      <p className="text-[13px] font-extrabold leading-tight">
                        I&apos;ll pick it up
                      </p>
                      <p className="text-text3 text-[11px] mt-0.5">Collect at the counter</p>
                    </button>

                    <button
                      type="button"
                      disabled={!canDeliver}
                      onClick={() => setFulfilment("delivery")}
                      aria-pressed={fulfilment === "delivery"}
                      className={`rounded-[12px] border px-3 py-3 text-left transition-colors ${
                        fulfilment === "delivery"
                          ? "border-amber bg-amber-dim"
                          : "border-border bg-white"
                      } ${canDeliver ? "hover:border-amber" : "opacity-55 cursor-not-allowed"}`}
                    >
                      <Bike className="size-4 text-text3 mb-1.5" />
                      <p className="text-[13px] font-extrabold leading-tight">
                        Arrange delivery
                      </p>
                      <p className="text-text3 text-[11px] mt-0.5">
                        {canDeliver ? "To your address" : "This kitchen doesn\u2019t deliver"}
                      </p>
                    </button>
                  </div>

                  {fulfilment === "delivery" && (
                    <div className="relative">
                      <MapPin className="size-4 text-text3 absolute left-3.5 top-3.5" />
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Where are you? Landmark, road, house — whatever gets a rider to you"
                        rows={2}
                        className="w-full rounded-[12px] border border-border bg-white pl-10 pr-4 py-3 text-[16px] outline-none focus:border-amber resize-none"
                      />
                    </div>
                  )}

                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full rounded-[12px] border border-border bg-white px-4 py-3 text-[16px] outline-none focus:border-amber"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    inputMode="tel"
                    autoComplete="tel"
                    className="w-full rounded-[12px] border border-border bg-white px-4 py-3 text-[16px] outline-none focus:border-amber"
                  />
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note for the kitchen (optional)"
                    rows={2}
                    className="w-full rounded-[12px] border border-border bg-white px-4 py-3 text-[16px] outline-none focus:border-amber resize-none"
                  />
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-[12px] bg-amber-dim border border-amber px-4 py-3 text-[13px] text-text leading-[1.5]">
                  {error}
                </p>
              )}
            </div>

            {cart && cart.lines.length > 0 && (
              <footer className="border-t border-border px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text2 text-[13px] font-bold">Total</span>
                  <span className="font-display text-[19px] font-extrabold tabular-nums">
                    KSh {total.toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={submit}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-amber text-dark text-[15px] font-extrabold disabled:opacity-45 disabled:cursor-not-allowed hover:bg-amber2 transition-colors"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending
                    </>
                  ) : (
                    <>
                      <WhatsAppGlyph />
                      Send order on WhatsApp
                    </>
                  )}
                </button>
                <p className="text-text3 text-[11.5px] text-center mt-2">
                  {whatsappPhone
                    ? "Opens WhatsApp with your order written out — press send."
                    : "This kitchen hasn't added a WhatsApp number yet."}
                </p>
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
}


/** WhatsApp mark. lucide has no brand glyphs, and an inline path avoids
 *  pulling a whole icon pack for one logo. */
function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.23 8.23 0 0 1 8.24 8.24c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.89 2.38 1.01 2.54c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}
