"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/** Snapshot of a chosen add-on. Mirrors what POST /api/orders expects, and
 *  what order_items.selected_options stores — never a live join back. */
export type SelectedOption = {
  option_id: string;
  group: string;
  choice: string;
  price_add: number;
};

export type CartLine = {
  itemId: string;
  name: string;
  /** Base price. Add-ons are priced separately so the line can be re-read. */
  priceKes: number;
  qty: number;
  note: string;
  options: SelectedOption[];
};

export type Cart = {
  menuId: string;
  menuSlug: string;
  restaurant: string;
  /** Where the order gets sent; "" when the kitchen has not set a number. */
  whatsappPhone: string;
  /** Delivery is on for this kitchen — its own riders or Klickenya's. */
  canDeliver: boolean;
  /** Pickup (takeaway) is on. False for a delivery-only kitchen. */
  canOrder: boolean;
  /** The kitchen's delivery charge; 0 when unset. Shown, never trusted —
   *  the server re-reads it when the order is placed. */
  deliveryFeeKes: number;
  /** Smallest food total the kitchen delivers for; null when there is none. */
  minOrderKes: number | null;
  lines: CartLine[];
};

/** Everything about the kitchen a basket carries, minus the lines. */
export type CartMeta = Omit<Cart, "lines">;

/**
 * The most recent order placed from this device.
 *
 * Kept separately from the basket, which is emptied the moment an order is
 * saved: a reload after ordering must still offer the tracking link and the
 * WhatsApp thread, or the guest has no way back to what they just paid for.
 */
export type LastOrder = {
  orderId: string;
  shortId: string;
  restaurant: string;
  trackUrl: string;
  waUrl: string | null;
  /** ISO timestamp. */
  placedAt: string;
};

const KEY = "eatklick.cart.v2"; // v1 lines had no options
const LAST_ORDER_KEY = "eatklick.lastOrder";

/** Base plus add-ons, times quantity. */
export function lineTotal(l: CartLine): number {
  const addOns = (l.options ?? []).reduce((n, o) => n + (o.price_add ?? 0), 0);
  return (l.priceKes + addOns) * l.qty;
}

/**
 * A cart for one restaurant at a time.
 *
 * Single-restaurant on purpose: an order is placed with one kitchen, which
 * accepts it and cooks it. A basket spanning two restaurants cannot be
 * submitted to either, so switching restaurant asks before clearing rather
 * than silently dropping what was chosen.
 *
 * Persisted to localStorage so a refresh — or a tab restored hours later —
 * does not lose the basket. Wrapped in try/catch because private browsing and
 * blocked site data both make storage throw rather than return null.
 */
export function useEatCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Read after mount: localStorage does not exist during SSR, and reading it
  // during render would produce a hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        // Baskets saved before the fee fields existed get the pre-fee
        // defaults — pickup on, no fee, no minimum. The next add refreshes
        // them from the live menu, so nothing stays stale for long.
        const stored = JSON.parse(raw) as Partial<Cart>;
        setCart({ canOrder: true, deliveryFeeKes: 0, minOrderKes: null, ...stored } as Cart);
      }
    } catch {
      /* private mode, blocked storage — start empty */
    }
    try {
      const raw = localStorage.getItem(LAST_ORDER_KEY);
      if (raw) setLastOrder(JSON.parse(raw) as LastOrder);
    } catch {
      /* same — no last order to offer */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (cart && cart.lines.length > 0) {
        localStorage.setItem(KEY, JSON.stringify(cart));
      } else {
        localStorage.removeItem(KEY);
      }
    } catch {
      /* nothing we can do; the cart still works for this session */
    }
  }, [cart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (lastOrder) localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(lastOrder));
      else localStorage.removeItem(LAST_ORDER_KEY);
    } catch {
      /* the confirmation screen still shows the links for this session */
    }
  }, [lastOrder, hydrated]);

  const add = useCallback(
    (
      menu: CartMeta,
      item: { id: string; name: string; priceKes: number },
      qty: number,
      note: string,
      options: SelectedOption[] = [],
    ) => {
      setCart((prev) => {
        // Same kitchen: keep the lines but REFRESH the metadata. A kitchen
        // that switches delivery on, changes its fee or its WhatsApp number
        // must not stay frozen in a basket started before the change.
        const base: Cart =
          prev && prev.menuId === menu.menuId
            ? { ...prev, ...menu }
            : { ...menu, lines: [] };

        // Same item with the same note AND the same add-ons stacks. Change
        // either and it is a different thing to cook, so it gets its own line.
        const sig = (o: SelectedOption[]) =>
          o.map((x) => x.option_id).sort().join(",");
        const target = sig(options);
        const idx = base.lines.findIndex(
          (l) => l.itemId === item.id && l.note === note && sig(l.options) === target,
        );
        const lines = [...base.lines];
        if (idx >= 0) {
          lines[idx] = { ...lines[idx], qty: lines[idx].qty + qty };
        } else {
          lines.push({
            itemId: item.id,
            name: item.name,
            priceKes: item.priceKes,
            qty,
            note,
            options,
          });
        }
        return { ...base, lines };
      });
    },
    [],
  );

  const setQty = useCallback((idx: number, qty: number) => {
    setCart((prev) => {
      if (!prev) return prev;
      const lines = [...prev.lines];
      if (qty <= 0) lines.splice(idx, 1);
      else lines[idx] = { ...lines[idx], qty };
      return lines.length > 0 ? { ...prev, lines } : null;
    });
  }, []);

  const clear = useCallback(() => setCart(null), []);

  /**
   * The order is saved server-side: remember where to find it and empty the
   * basket. Clearing here rather than in the panel keeps the two in step —
   * a basket that survives its own order is how duplicates get placed.
   */
  const recordPlacedOrder = useCallback((o: LastOrder) => {
    setLastOrder(o);
    setCart(null);
  }, []);

  const total = useMemo(
    () => (cart?.lines ?? []).reduce((n, l) => n + lineTotal(l), 0),
    [cart],
  );
  const count = useMemo(
    () => (cart?.lines ?? []).reduce((n, l) => n + l.qty, 0),
    [cart],
  );

  return { cart, hydrated, add, setQty, clear, total, count, lastOrder, recordPlacedOrder };
}
