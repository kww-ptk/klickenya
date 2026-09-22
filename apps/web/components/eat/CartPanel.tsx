"use client";

import { useState } from "react";
import { X, Minus, Plus, Loader2, Bike, ShoppingBag as Bag, MapPin } from "lucide-react";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  type Fulfilment,
} from "@/lib/eat/whatsappOrder";
import type { Cart, LastOrder } from "./useEatCart";
import { lineTotal } from "./useEatCart";

/**
 * Cart and checkout.
 *
 * Two steps, in this order and never the other way round:
 *
 *   1. POST /api/orders — the same endpoint /m/[slug] uses, so there is one
 *      ordering path and one order table, not a parallel one to keep in step.
 *   2. Open WhatsApp, carrying the saved order's reference.
 *
 * Recording first is the whole point. Before this, placing an order only
 * opened WhatsApp: the kitchen got a message and the owner's dashboard got
 * nothing — no ticket, no status, no history, nothing to report on.
 *
 * If step 1 fails the handoff does NOT happen. An order the owner cannot see
 * in their dashboard is the bug being fixed here, so sending one anyway would
 * reintroduce it. The API's own message is shown instead, because the usual
 * cause ("this kitchen isn't delivering yet") is a setting the restaurant
 * controls rather than something the guest can retry their way out of.
 *
 * Once step 1 succeeds the basket is emptied (via `onPlaced`) and the order is
 * remembered as `lastOrder`, so a reload still offers the tracking link and
 * the WhatsApp thread. The server notifies the restaurant by email as well,
 * so the WhatsApp message is the guest's copy of the thread, not the only
 * way the kitchen hears about the order.
 *
 * Money: `total` is the food. On a delivery the kitchen's fee is added on
 * top and shown as its own line, and the figure on the confirmation is the
 * server's `order_total` — the number the guest will actually be asked for.
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
  canOrder = true,
  deliveryFeeKes = 0,
  minOrderKes = null,
  lastOrder = null,
  onPlaced,
}: {
  cart: Cart | null;
  /** Food total, before any delivery fee. */
  total: number;
  open: boolean;
  onClose: () => void;
  onSetQty: (idx: number, qty: number) => void;
  /** Fallback for callers that do not pass `onPlaced`: still empties the
   *  basket once the order is saved, just without remembering it. */
  onCleared?: () => void;
  /** Number that receives the order; "" when the kitchen has not set one. */
  whatsappPhone: string;
  /** Delivery is on for this kitchen. */
  canDeliver: boolean;
  /** Pickup is on. False for a delivery-only kitchen. */
  canOrder?: boolean;
  /** The kitchen's delivery charge; 0 when unset. */
  deliveryFeeKes?: number;
  /** Smallest food total it delivers for; null when there is none. */
  minOrderKes?: number | null;
  /** The last order placed from this device, for the empty-basket card. */
  lastOrder?: LastOrder | null;
  /** The order is saved: the caller clears the basket and remembers it. */
  onPlaced?: (o: LastOrder) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  /** The guest's explicit pick, if any. Not the answer itself: the kitchen's
   *  settings decide what is allowed, and they can change under a basket. */
  const [fulfilmentChoice, setFulfilmentChoice] = useState<Fulfilment | null>(null);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Snapshot taken at placement. The basket is cleared right after, so the
   *  confirmation cannot read restaurant, total or fulfilment off `cart`. */
  const [placed, setPlaced] = useState<{
    shortId: string | null;
    restaurant: string;
    totalKes: number;
    fulfilment: Fulfilment;
  } | null>(null);
  const [trackUrl, setTrackUrl] = useState<string | null>(null);
  const [waUrl, setWaUrl] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Derived, not synced: the default follows the kitchen (pickup unless it is
  // delivery-only), and a pick the kitchen no longer offers falls back to it
  // rather than sticking on a disabled button. That covers a different
  // restaurant landing in the basket and refreshed metadata alike — a
  // delivery-only kitchen must never start the guest on "pickup".
  const fulfilment: Fulfilment =
    fulfilmentChoice && (fulfilmentChoice === "pickup" ? canOrder : canDeliver)
      ? fulfilmentChoice
      : canDeliver && !canOrder
        ? "delivery"
        : "pickup";

  const fee = fulfilment === "delivery" ? deliveryFeeKes : 0;
  const grand = total + fee;
  const belowMinimum =
    fulfilment === "delivery" && minOrderKes != null && minOrderKes > 0 && total < minOrderKes;

  /**
   * The confirmation stays up until the sheet is closed. The reset waits for
   * the slide-out so the screen does not flip to an empty basket mid-animation;
   * the next open then shows the basket, or the last-order card.
   */
  const close = () => {
    onClose();
    if (!placed) return;
    window.setTimeout(() => {
      setPlaced(null);
      setTrackUrl(null);
      setWaUrl(null);
      setPopupBlocked(false);
    }, 350);
  };

  /**
   * Hand the order to the kitchen over WhatsApp.
   *
   * Opened in a new tab rather than replacing this one, so the basket and the
   * page survive if the guest comes straight back — and on desktop, where
   * WhatsApp Web may not be signed in, they are not stranded on a dead page.
   */
  /**
   * Ask the device where it is.
   *
   * Failure here is never fatal — the written address is the real field and
   * this is a shortcut. Denying the permission must not block the order, so
   * the message says what to do instead rather than treating it as an error.
   */
  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("This browser can't share a location. Type or paste it instead.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        // Give the field something readable if it is still empty, so the
        // kitchen never receives a delivery with a blank "where".
        setAddress((prev) =>
          prev.trim() ? prev : `Pinned location (±${Math.round(pos.coords.accuracy)}m)`,
        );
      },
      () => {
        setLocating(false);
        setLocationError(
          "Couldn't get your location. Paste a Maps link or type directions instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = async () => {
    if (!cart || !whatsappPhone) return;
    setBusy(true);
    setError(null);

    // Open the tab NOW, synchronously, while we are still inside the click.
    //
    // Safari only allows window.open during a user gesture, and an `await`
    // ends that gesture — so opening WhatsApp after the order POST is blocked
    // on iPhone even when the guest has never disabled anything. Claiming a
    // blank tab first and pointing it at WhatsApp once the order is saved is
    // the standard way round it.
    //
    // No "noopener" in the feature string: per spec that makes window.open
    // return null, leaving nothing to navigate. The same protection comes
    // from clearing `opener` on the handle instead.
    const win = window.open("", "_blank");
    if (win) {
      try {
        win.opener = null;
      } catch {
        /* cross-origin about:blank in some browsers — not worth failing over */
      }
    }

    // ── Step 1: record the order ──────────────────────────────────────
    let orderId: string | undefined;
    let orderRef: string | undefined;
    let track: string | undefined;
    // What the guest will be asked for. The server's figure, not ours: it
    // re-reads every price and the fee, so its total is the one on the ticket.
    let orderTotal = grand;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: cart.menuId,
          order_type: fulfilment === "delivery" ? "delivery" : "takeaway",
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          delivery_address: fulfilment === "delivery" ? address.trim() : undefined,
          delivery_lat: fulfilment === "delivery" ? coords?.lat : undefined,
          delivery_lng: fulfilment === "delivery" ? coords?.lng : undefined,
          order_note: note.trim() || undefined,
          items: cart.lines.map((l) => ({
            menu_item_id: l.itemId,
            quantity: l.qty,
            // Prices are deliberately NOT sent — the server re-reads every
            // price and add-on from the database. Nothing the client says
            // about money is trusted.
            selected_options: (l.options ?? []).map((o) => ({
              option_id: o.option_id,
              group: o.group,
              choice: o.choice,
            })),
            allergy_notes: l.note || undefined,
          })),
        }),
      });
      // short_id, not id: the API already derives the reference, and using
      // its value keeps the WhatsApp thread, the guest's status page and the
      // dashboard ticket showing the same string.
      const payload = (await res.json().catch(() => null)) as
        | { order_id?: string; short_id?: string; order_total?: number; error?: string }
        | null;

      if (!res.ok) {
        win?.close(); // don't leave the guest staring at a blank tab
        setError(payload?.error ?? "Could not place the order. Please try again.");
        setBusy(false);
        return;
      }
      orderId = payload?.order_id ?? undefined;
      orderRef = payload?.short_id ?? orderId?.slice(0, 8).toUpperCase();
      if (typeof payload?.order_total === "number") orderTotal = payload.order_total;
      if (orderId) {
        // window.location.origin, not a configured base: the guest should
        // stay on whichever host they are already on.
        track = `${window.location.origin}/order/${orderId}`;
        setTrackUrl(track);
      }
    } catch {
      win?.close();
      setError("Could not reach the kitchen. Check your connection and try again.");
      setBusy(false);
      return;
    }

    // ── Step 2: hand it to the kitchen over WhatsApp ──────────────────
    const message = buildOrderMessage({
      restaurant: cart.restaurant,
      lines: cart.lines,
      totalKes: grand,
      subtotalKes: total,
      deliveryFeeKes: fee,
      fulfilment,
      deliveryAddress: address.trim(),
      deliveryCoords: fulfilment === "delivery" ? coords : null,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      note: note.trim() || undefined,
      orderRef,
      trackUrl: track,
    });

    const url = buildWhatsAppUrl(whatsappPhone, message);
    // Kept regardless of what happens next: the confirmation screen always
    // offers a tap-to-open link, and a link tap is a navigation, not a popup,
    // so it cannot be blocked by anything.
    setWaUrl(url);
    setBusy(false);

    if (win) {
      win.location.href = url;
    } else {
      // Blocked despite claiming the tab early. Nothing is lost: the order is
      // already saved and the kitchen can see it. The guest taps the link on
      // the confirmation screen instead — so this is not an error state, and
      // saying "blocked" here would only invite a duplicate order.
      setPopupBlocked(true);
    }

    setPlaced({
      shortId: orderRef ?? null,
      restaurant: cart.restaurant,
      totalKes: orderTotal,
      fulfilment,
    });

    // The order exists server-side and the kitchen has been told, so the
    // basket has done its job. Leaving it full is how the same order gets
    // placed twice. The caller remembers the order so a reload can still
    // reach the tracking page and the WhatsApp thread.
    if (orderId && orderRef && track && onPlaced) {
      onPlaced({
        orderId,
        shortId: orderRef,
        restaurant: cart.restaurant,
        trackUrl: track,
        waUrl: url,
        placedAt: new Date().toISOString(),
      });
    } else {
      onCleared?.();
    }
  };

  const canSubmit =
    Boolean(cart?.lines.length) &&
    Boolean(whatsappPhone) &&
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    (fulfilment !== "delivery" || address.trim().length > 0) &&
    !belowMinimum &&
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
        onClick={close}
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
              {placed ? "Order placed" : "Your basket"}
            </h2>
            {cart && !placed && (
              <p className="text-text2 text-[12.5px] truncate">{cart.restaurant}</p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="size-9 rounded-full bg-surface hover:bg-surface2 flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="size-4" />
          </button>
        </header>

        {placed ? (
          <div className="flex-1 overflow-y-auto px-5 py-8">
            <p className="text-text2 text-[15px] leading-[1.6]">
              {popupBlocked ? (
                <>
                  Your order is saved and {placed.restaurant} has been notified.
                  Tap below to send them the details on WhatsApp too, so you
                  have the thread.
                </>
              ) : (
                <>
                  Your order is saved and {placed.restaurant} has been notified.
                  WhatsApp is open with the details — press send there too, so
                  you have the thread. Track it from the link below.
                </>
              )}
            </p>

            {/* Always offered, not only when the popup failed: a tap on a link
                is a navigation, which no browser blocks, so this is the path
                that always works. It doubles as "it didn't open, try again". */}
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-5 flex items-center justify-center gap-2 w-full rounded-full py-3.5 text-[15px] font-extrabold ${
                  popupBlocked
                    ? "bg-[#25D366] text-white"
                    : "border border-border text-dark"
                }`}
              >
                {popupBlocked ? "Open WhatsApp" : "WhatsApp didn't open? Tap here"}
              </a>
            )}

            {placed.shortId && (
              <div className="mt-6 rounded-2xl border border-border bg-white p-5 text-center">
                <p className="text-[11px] font-bold text-text3 uppercase tracking-widest">
                  Your order code
                </p>
                <p className="font-mono text-[22px] font-bold text-dark mt-1">
                  #{placed.shortId}
                </p>
                <p className="text-[12.5px] text-text2 mt-1.5">
                  Quote this if you call the restaurant.
                </p>
                <p className="text-[14px] font-extrabold text-dark mt-3 tabular-nums">
                  Total to pay KSh {placed.totalKes.toLocaleString()}
                  <span className="font-bold text-text2">
                    {" "}
                    {placed.fulfilment === "delivery" ? "on delivery" : "at pickup"}
                  </span>
                </p>

                {trackUrl && (
                  <a
                    href={trackUrl}
                    className="mt-4 inline-block w-full rounded-full bg-dark text-white text-[14px] font-extrabold py-3"
                  >
                    Track my order
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!cart || cart.lines.length === 0 ? (
                <div className="py-6">
                  <p className="text-text2 text-[14px]">Your basket is empty.</p>

                  {/* The way back after a reload. The basket is emptied the
                      moment an order is saved, so without this a refreshed
                      page has no trace of the order the guest just placed. */}
                  {lastOrder && (
                    <div className="mt-5 rounded-2xl border border-border bg-white p-5">
                      <p className="text-[11px] font-bold text-text3 uppercase tracking-widest">
                        Your last order
                      </p>
                      <p className="font-display text-[15px] font-extrabold text-dark mt-1">
                        #{lastOrder.shortId} at {lastOrder.restaurant}
                      </p>
                      <a
                        href={lastOrder.trackUrl}
                        className="mt-4 block w-full rounded-full bg-dark text-white text-[14px] font-extrabold py-3 text-center"
                      >
                        Track my order
                      </a>
                      {lastOrder.waUrl && (
                        <a
                          href={lastOrder.waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block w-full rounded-full border border-border text-dark text-[14px] font-extrabold py-3 text-center"
                        >
                          Open WhatsApp again
                        </a>
                      )}
                    </div>
                  )}
                </div>
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
                        {(l.options ?? []).length > 0 && (
                          <p className="text-text2 text-[12px] mt-0.5">
                            {l.options
                              .map((o) => o.choice + (o.price_add ? ` +${o.price_add}` : ""))
                              .join(", ")}
                          </p>
                        )}
                        {l.note && (
                          <p className="text-text3 text-[12px] italic mt-0.5 line-clamp-2">
                            “{l.note}”
                          </p>
                        )}
                        <p className="text-amber-700 text-[13px] font-extrabold mt-1 tabular-nums">
                          KSh {lineTotal(l).toLocaleString()}
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
                  {/* How it gets to them. Both options stay visible even when
                      one is off, so the guest learns what this kitchen offers
                      rather than wondering why a button is missing. */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!canOrder}
                      onClick={() => setFulfilmentChoice("pickup")}
                      aria-pressed={fulfilment === "pickup"}
                      className={`rounded-[12px] border px-3 py-3 text-left transition-colors ${
                        fulfilment === "pickup"
                          ? "border-amber bg-amber-dim"
                          : "border-border bg-white"
                      } ${canOrder ? "hover:border-amber" : "opacity-55 cursor-not-allowed"}`}
                    >
                      <Bag className="size-4 text-amber-700 mb-1.5" />
                      <p className="text-[13px] font-extrabold leading-tight">
                        I&apos;ll pick it up
                      </p>
                      <p className="text-text3 text-[11px] mt-0.5">
                        {canOrder ? "Collect at the counter" : "Not offered here"}
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={!canDeliver}
                      onClick={() => setFulfilmentChoice("delivery")}
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
                    <div className="space-y-2">
                      <label
                        htmlFor="delivery-address"
                        className="block text-[13px] font-bold text-dark"
                      >
                        Where should we bring it?
                      </label>

                      {/* The one-tap path. Offered first because typing
                          directions on a phone, in the dark, is the worst way
                          to do this — and a pin is what the rider actually
                          wants. */}
                      <button
                        type="button"
                        onClick={useMyLocation}
                        disabled={locating}
                        className={`w-full flex items-center justify-center gap-2 rounded-[12px] border py-3 text-[14px] font-bold transition-colors ${
                          coords
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-border bg-white text-dark hover:border-amber"
                        }`}
                      >
                        <MapPin className="size-4" aria-hidden />
                        {locating
                          ? "Finding you…"
                          : coords
                          ? "Location pinned ✓  Tap to redo"
                          : "Use my current location"}
                      </button>

                      <p className="text-[12px] text-text3 leading-snug">
                        Or paste a Google Maps link — open Maps, hold your spot,
                        tap <span className="font-semibold">Share</span>, and paste
                        it below. Plain directions are fine too.
                      </p>

                      <div className="relative">
                        <MapPin className="size-4 text-text3 absolute left-3.5 top-3.5" />
                        <textarea
                          id="delivery-address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Paste a Maps link, or: blue gate past Sunset Lab, Watamu"
                          rows={2}
                          className="w-full rounded-[12px] border border-border bg-white pl-10 pr-4 py-3 text-[16px] outline-none focus:border-amber resize-none"
                        />
                      </div>

                      {locationError && (
                        <p className="text-[12px] text-[#B4541A]">{locationError}</p>
                      )}
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
                {/* The fee is its own line, never folded into the food: a
                    total that quietly grew is read as the menu being wrong. */}
                {fulfilment === "delivery" && (
                  <dl className="mb-2 space-y-1 text-[13px] text-text2">
                    <div className="flex items-center justify-between">
                      <dt>Food</dt>
                      <dd className="tabular-nums">KSh {total.toLocaleString()}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Delivery fee</dt>
                      <dd className="tabular-nums">KSh {deliveryFeeKes.toLocaleString()}</dd>
                    </div>
                  </dl>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text2 text-[13px] font-bold">Total</span>
                  <span className="font-display text-[19px] font-extrabold tabular-nums">
                    KSh {grand.toLocaleString()}
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
                {belowMinimum && minOrderKes != null && (
                  <p className="text-[12.5px] font-bold text-[#B4541A] text-center mt-2">
                    Minimum order for delivery is KSh {minOrderKes.toLocaleString()}.
                  </p>
                )}
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
