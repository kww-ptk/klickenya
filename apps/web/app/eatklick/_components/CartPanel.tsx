"use client";

import { useState } from "react";
import { X, Minus, Plus, ShoppingBag, Loader2 } from "lucide-react";
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
}: {
  cart: Cart | null;
  total: number;
  open: boolean;
  onClose: () => void;
  onSetQty: (idx: number, qty: number) => void;
  onCleared: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);

  const submit = async () => {
    if (!cart) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: cart.menuId,
          order_type: "takeaway",
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          order_note: note.trim() || undefined,
          items: cart.lines.map((l) => ({
            menu_item_id: l.itemId,
            quantity: l.qty,
            allergy_notes: l.note || undefined,
          })),
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 400 && /takeaway/i.test(JSON.stringify(body))
            ? "This kitchen isn't taking online orders yet. Your basket is saved — call them or book a table instead."
            : (body?.error ?? "Couldn't place that order. Try again in a moment."),
        );
        return;
      }
      setPlaced(body.order_id ?? "");
      onCleared();
    } catch {
      setError("Couldn't reach the kitchen. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = Boolean(cart?.lines.length) && name.trim() && phone.trim() && !busy;

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
              Sent to {cart?.restaurant ?? "the kitchen"}. They&apos;ll confirm with a
              ready time — keep an eye on your phone.
            </p>
            <a
              href={placed ? `/m/${cart?.menuSlug}/order/${placed}` : "#"}
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-amber text-dark text-[14px] font-extrabold"
            >
              Track your order
            </a>
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
                      <ShoppingBag className="size-4" />
                      Place order
                    </>
                  )}
                </button>
                <p className="text-text3 text-[11.5px] text-center mt-2">
                  Pay at the counter when you collect.
                </p>
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
}
