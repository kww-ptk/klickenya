"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type CartLine = {
  itemId: string;
  name: string;
  priceKes: number;
  qty: number;
  note: string;
};

export type Cart = {
  menuId: string;
  menuSlug: string;
  restaurant: string;
  lines: CartLine[];
};

const KEY = "eatklick.cart.v1";

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
  const [hydrated, setHydrated] = useState(false);

  // Read after mount: localStorage does not exist during SSR, and reading it
  // during render would produce a hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCart(JSON.parse(raw) as Cart);
    } catch {
      /* private mode, blocked storage — start empty */
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

  const add = useCallback(
    (
      menu: { menuId: string; menuSlug: string; restaurant: string },
      item: { id: string; name: string; priceKes: number },
      qty: number,
      note: string,
    ) => {
      setCart((prev) => {
        const base: Cart =
          prev && prev.menuId === menu.menuId
            ? prev
            : { ...menu, lines: [] };

        // Same item with the same note stacks; a different note is a
        // different thing to cook, so it gets its own line.
        const idx = base.lines.findIndex(
          (l) => l.itemId === item.id && l.note === note,
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

  const total = useMemo(
    () => (cart?.lines ?? []).reduce((n, l) => n + l.priceKes * l.qty, 0),
    [cart],
  );
  const count = useMemo(
    () => (cart?.lines ?? []).reduce((n, l) => n + l.qty, 0),
    [cart],
  );

  return { cart, hydrated, add, setQty, clear, total, count };
}
