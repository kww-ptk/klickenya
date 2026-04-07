"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import type { MenuSection, MenuItem } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuTabBar } from "@/components/menu/MenuTabBar";
import { DietaryFilter } from "@/components/menu/DietaryFilter";
import { ItemModal, type CartItem } from "@/components/menu/ItemModal";

/* ── Types ─────────────────────────────────────────── */

type View = "browse" | "cart" | "confirmed";

interface ReceiptLineItem {
  name: string;
  options_summary: string | null;
  line_total: number;
  quantity: number;
}

interface ConfirmData {
  orderId: string;
  shortId: string;
  tableNumber: string;
  estimatedMinutes: number;
  lineItems: ReceiptLineItem[];
  orderTotal: number;
}

/* ── Constants ─────────────────────────────────────── */

const TAG_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  V:  { label: "V",  bg: "bg-green-100",  text: "text-green-700" },
  VG: { label: "VG", bg: "bg-green-100",  text: "text-green-800" },
  GF: { label: "GF", bg: "bg-amber-100",  text: "text-amber-700" },
  H:  { label: "H",  bg: "bg-teal-100",   text: "text-teal-700" },
  S:  { label: "S",  bg: "bg-red-100",    text: "text-red-700" },
};

/* ── Helpers ───────────────────────────────────────── */

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

function unitPrice(cartItem: CartItem): number {
  return cartItem.base_price + cartItem.selected_options.reduce((s, o) => s + o.price_add, 0);
}

/* ── Item card ─────────────────────────────────────── */

interface CartItemCardProps {
  item: MenuItem;
  totalQty: number;  // sum across all cart lines for this menu_item_id
  onAdd: () => void; // open fresh ItemModal
  onRemove: () => void; // remove one unit from last cart line
}

function CartItemCard({ item, totalQty, onAdd, onRemove }: CartItemCardProps) {
  const hasPhoto = !!item.photo_url;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-border bg-white p-3.5 ${
        item.is_available ? "" : "opacity-40"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-dark leading-snug">{item.name}</p>
        {item.description && (
          <p className="text-[13px] text-text2 mt-0.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        {item.dietary_tags.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {item.dietary_tags.map((tag) => {
              const style = TAG_STYLES[tag];
              if (!style) return null;
              return (
                <span
                  key={tag}
                  className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}
                >
                  {style.label}
                </span>
              );
            })}
          </div>
        )}
        {item.is_available ? (
          <p className="text-[14px] font-bold text-amber mt-1.5">
            {formatPrice(item.price_kes)}
          </p>
        ) : (
          <span className="inline-block mt-1.5 rounded-full bg-border px-2 py-0.5 text-[11px] font-semibold text-text3">
            Unavailable
          </span>
        )}
        {(item.item_option_groups ?? []).some((g) => g.item_options.length > 0) &&
          item.is_available && (
            <p className="text-[11px] text-text3 mt-0.5">Customisable</p>
          )}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        {hasPhoto && (
          <div className="relative w-[72px] h-[72px] rounded-lg overflow-hidden">
            <Image
              src={item.photo_url!}
              alt={item.name}
              width={72}
              height={72}
              className="object-cover w-full h-full"
              sizes="72px"
            />
          </div>
        )}
        {item.is_available && (
          totalQty === 0 ? (
            <button
              onClick={onAdd}
              className="shrink-0 h-[32px] px-4 rounded-full bg-amber text-dark text-[13px] font-bold hover:bg-[#d4911c] transition-colors active:scale-95"
              aria-label="Add to order"
            >
              Add
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={onRemove}
                className="size-[28px] rounded-full bg-[#F4F1EC] text-dark text-[17px] font-bold flex items-center justify-center hover:bg-[#E2DDD5] transition-colors active:scale-95"
                aria-label="Remove one"
              >
                −
              </button>
              <span className="text-[14px] font-bold text-dark w-[18px] text-center tabular-nums">
                {totalQty}
              </span>
              <button
                onClick={onAdd}
                className="size-[28px] rounded-full bg-amber text-dark text-[17px] font-bold flex items-center justify-center hover:bg-[#d4911c] transition-colors active:scale-95"
                aria-label="Add one more"
              >
                +
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ── Cart panel ────────────────────────────────────── */

interface CartPanelProps {
  cart: Map<string, CartItem>;
  menuId: string;
  onBack: () => void;
  onConfirmed: (data: ConfirmData) => void;
  onUpdateQty: (cartId: string, delta: number) => void;
  onEditLine: (cartItem: CartItem) => void;
}

function CartPanel({ cart, menuId, onBack, onConfirmed, onUpdateQty, onEditLine }: CartPanelProps) {
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = Array.from(cart.values()).filter((e) => e.quantity > 0);
  const subtotal = entries.reduce((sum, e) => sum + e.display_total, 0);

  async function handlePlaceOrder() {
    if (!tableNumber.trim()) {
      setError("Please enter your table number.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          table_number: tableNumber.trim(),
          customer_name: customerName.trim() || undefined,
          items: entries.map((e) => ({
            menu_item_id: e.menu_item_id,
            quantity: e.quantity,
            // Strip price_add — server fetches prices from DB
            selected_options: e.selected_options.map(({ option_id, group, choice }) => ({
              option_id,
              group,
              choice,
            })),
            allergy_notes: e.allergy_notes || undefined,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      onConfirmed({
        orderId:           data.order_id,
        shortId:           data.short_id,
        tableNumber:       data.table_number ?? tableNumber.trim(),
        estimatedMinutes:  data.estimated_minutes ?? 20,
        lineItems:         data.line_items ?? [],
        orderTotal:        data.order_total ?? 0,
      });
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full border border-border rounded-xl px-3.5 py-3 text-[15px] text-dark placeholder:text-text3 focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 bg-white transition-colors";

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="bg-white border-b border-border px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 text-text2 hover:text-dark transition-colors"
          aria-label="Back to menu"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h2 className="font-display text-[18px] font-bold text-dark tracking-tight">Your order</h2>
        <span className="ml-auto text-[13px] font-semibold text-text3">
          {entries.reduce((s, e) => s + e.quantity, 0)} items
        </span>
      </header>

      <div className="flex-1 max-w-[480px] w-full mx-auto px-4 py-4 space-y-2">
        {entries.map((entry) => (
          <div key={entry.cart_id} className="bg-white rounded-xl border border-border px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Name + edit icon */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold text-dark leading-snug">{entry.item_name}</p>
                  <button
                    onClick={() => onEditLine(entry)}
                    className="shrink-0 text-text3 hover:text-dark transition-colors p-0.5 mt-0.5"
                    aria-label="Edit item"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-[13px] text-text2 mt-0.5">
                  {formatPrice(unitPrice(entry))} × {entry.quantity}
                </p>

                {/* Option tags */}
                {entry.selected_options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.selected_options.map((o, i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full bg-[#F4F1EC] px-2 py-0.5 text-[11px] text-text2 font-medium"
                      >
                        {o.choice}
                        {o.price_add > 0 ? ` +${formatPrice(o.price_add)}` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* Special instructions / allergy notes */}
                {entry.allergy_notes && (
                  <div className="flex items-start gap-1.5 mt-1.5">
                    <span className="text-[12px] mt-px">⚠</span>
                    <span className="text-[12px] text-amber font-semibold">{entry.allergy_notes}</span>
                  </div>
                )}
              </div>

              {/* Qty control + line total */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[14px] font-bold text-dark tabular-nums">
                  {formatPrice(entry.display_total)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onUpdateQty(entry.cart_id, -1)}
                    className="size-[26px] rounded-full bg-[#F4F1EC] text-dark text-[15px] font-bold flex items-center justify-center hover:bg-[#E2DDD5] transition-colors active:scale-95"
                    aria-label="Remove one"
                  >
                    −
                  </button>
                  <span className="text-[13px] font-bold text-dark w-[18px] text-center tabular-nums">
                    {entry.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQty(entry.cart_id, 1)}
                    className="size-[26px] rounded-full bg-amber text-dark text-[15px] font-bold flex items-center justify-center hover:bg-[#d4911c] transition-colors active:scale-95"
                    aria-label="Add one more"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Subtotal */}
        <div className="bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between mt-2">
          <span className="text-[14px] font-semibold text-text2">Subtotal</span>
          <span className="text-[16px] font-bold text-dark tabular-nums">{formatPrice(subtotal)}</span>
        </div>

        {/* Table number + name */}
        <div className="bg-white rounded-xl border border-border px-4 py-4 mt-2 space-y-3">
          <div>
            <label className="block text-[12px] font-bold text-dark mb-1.5 uppercase tracking-wide">
              Table number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. 4"
              maxLength={20}
              className={inputCls}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-dark mb-1.5 uppercase tracking-wide">
              Your name{" "}
              <span className="text-text3 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. James"
              maxLength={100}
              className={inputCls}
            />
          </div>
        </div>

        {error && (
          <p className="text-[13px] text-red-600 font-medium px-1">{error}</p>
        )}

        <button
          onClick={handlePlaceOrder}
          disabled={submitting || entries.length === 0}
          className="w-full h-[52px] rounded-full bg-dark text-white font-bold text-[15px] hover:bg-[#2A2520] transition-colors disabled:opacity-50 mt-2"
        >
          {submitting ? "Placing order…" : `Place order · ${formatPrice(subtotal)}`}
        </button>

        <p className="text-[12px] text-text3 text-center pb-8">
          We&apos;ll bring your order to the table — no payment needed now.
        </p>
      </div>
    </div>
  );
}

/* ── Confirmation screen ───────────────────────────── */

function ConfirmationScreen({ data, onDone }: { data: ConfirmData; onDone: () => void }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="max-w-[480px] w-full mx-auto px-5 py-10">
        {/* Success mark */}
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg className="size-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-[22px] font-extrabold text-dark tracking-[-0.02em] leading-tight">
              Order confirmed
            </h1>
            <p className="text-[13px] text-text3">
              Table {data.tableNumber} · #{data.shortId}
            </p>
          </div>
        </div>

        {/* Receipt */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Line items */}
          <div className="divide-y divide-border">
            {data.lineItems.map((item, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-semibold text-dark leading-snug">
                    ×{item.quantity} {item.name}
                  </span>
                  <span className="text-[14px] font-bold text-dark tabular-nums shrink-0">
                    {formatPrice(item.line_total)}
                  </span>
                </div>
                {item.options_summary && (
                  <p className="text-[12px] text-text3 mt-0.5">{item.options_summary}</p>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="px-5 py-3 bg-[#FAFAF8] border-t border-border flex items-center justify-between">
            <span className="text-[14px] font-bold text-dark">Total</span>
            <span className="text-[16px] font-extrabold text-dark tabular-nums">
              {formatPrice(data.orderTotal)}
            </span>
          </div>
        </div>

        {/* ETA */}
        <p className="text-[14px] text-text2 text-center mt-5 leading-relaxed">
          We&apos;ll bring it to{" "}
          <strong className="text-dark">table {data.tableNumber}</strong> in ~{data.estimatedMinutes} min.
        </p>

        {/* Done */}
        <button
          onClick={onDone}
          className="w-full h-[52px] rounded-full bg-dark text-white font-bold text-[15px] mt-6 hover:bg-[#2A2520] transition-colors active:scale-[0.98]"
        >
          Done
        </button>

        <p className="text-[12px] text-text3 text-center mt-5">
          Powered by{" "}
          <a href="https://klickenya.com" className="text-amber hover:underline">
            Klickenya
          </a>
        </p>
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────── */

interface MenuWithCartProps {
  sections: MenuSection[];
  menuId: string;
}

export function MenuWithCart({ sections, menuId }: MenuWithCartProps) {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  // Cart keyed by cart_id — same item with different options = separate lines
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [view, setView] = useState<View>("browse");
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);
  // Modal state: which item is open, and optionally which cart line is being edited
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | undefined>(undefined);

  /* ── Dietary filter helpers ── */

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const section of sections)
      for (const item of section.menu_items)
        for (const tag of item.dietary_tags) tags.add(tag);
    return Array.from(tags);
  }, [sections]);

  const filteredSections = useMemo(() => {
    if (activeTags.length === 0) return sections;
    return sections
      .map((s) => ({
        ...s,
        menu_items: s.menu_items.filter((item) =>
          activeTags.every((tag) => item.dietary_tags.includes(tag))
        ),
      }))
      .filter((s) => s.menu_items.length > 0);
  }, [sections, activeTags]);

  const tabs = filteredSections.map((s) => ({ id: s.id, title: s.title }));
  const noResults = activeTags.length > 0 && filteredSections.length === 0;

  /* ── Cart helpers ── */

  // Total quantity per menu_item_id (for card display)
  const itemQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((entry) => {
      map.set(entry.menu_item_id, (map.get(entry.menu_item_id) ?? 0) + entry.quantity);
    });
    return map;
  }, [cart]);

  function upsertCartItem(cartItem: CartItem) {
    setCart((prev) => new Map(prev).set(cartItem.cart_id, cartItem));
  }

  // Remove one unit from the most-recently-inserted cart line for a given menu_item_id
  const removeOneUnit = useCallback((menuItemId: string) => {
    setCart((prev) => {
      let lastKey: string | null = null;
      prev.forEach((entry, key) => {
        if (entry.menu_item_id === menuItemId) lastKey = key;
      });
      if (!lastKey) return prev;
      const next = new Map(prev);
      const existing = next.get(lastKey)!;
      if (existing.quantity <= 1) {
        next.delete(lastKey);
      } else {
        const newQty = existing.quantity - 1;
        next.set(lastKey, {
          ...existing,
          quantity: newQty,
          display_total: unitPrice(existing) * newQty,
        });
      }
      return next;
    });
  }, []);

  const updateCartQty = useCallback((cartId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.get(cartId);
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      const next = new Map(prev);
      if (newQty <= 0) {
        next.delete(cartId);
      } else {
        next.set(cartId, {
          ...existing,
          quantity: newQty,
          display_total: unitPrice(existing) * newQty,
        });
      }
      return next;
    });
  }, []);

  const totalItems = useMemo(() => {
    let count = 0;
    cart.forEach((e) => { count += e.quantity; });
    return count;
  }, [cart]);

  const totalKes = useMemo(() => {
    let sum = 0;
    cart.forEach((e) => { sum += e.display_total; });
    return sum;
  }, [cart]);

  function handleDone() {
    setCart(new Map());
    setConfirmData(null);
    setView("browse");
  }

  /* ── Modal handlers ── */

  function openFreshModal(item: MenuItem) {
    setEditingCartItem(undefined);
    setModalItem(item);
  }

  function openEditModal(cartItem: CartItem) {
    // Find the corresponding MenuItem across all sections
    for (const section of sections) {
      const item = section.menu_items.find((m) => m.id === cartItem.menu_item_id);
      if (item) {
        setEditingCartItem(cartItem);
        setModalItem(item);
        return;
      }
    }
  }

  function handleModalConfirm(cartItem: CartItem) {
    upsertCartItem(cartItem);
    setModalItem(null);
    setEditingCartItem(undefined);
  }

  function closeModal() {
    setModalItem(null);
    setEditingCartItem(undefined);
  }

  /* ── Views ── */

  if (view === "confirmed" && confirmData) {
    return <ConfirmationScreen data={confirmData} onDone={handleDone} />;
  }

  if (view === "cart") {
    return (
      <>
        <CartPanel
          cart={cart}
          menuId={menuId}
          onBack={() => setView("browse")}
          onConfirmed={(data) => {
            setConfirmData(data);
            setView("confirmed");
          }}
          onUpdateQty={updateCartQty}
          onEditLine={openEditModal}
        />
        {/* Allow editing from cart panel too */}
        {modalItem && (
          <ItemModal
            item={modalItem}
            existingCartItem={editingCartItem}
            onClose={closeModal}
            onConfirm={handleModalConfirm}
          />
        )}
      </>
    );
  }

  return (
    <>
      <MenuTabBar tabs={tabs} />

      <DietaryFilter
        availableTags={availableTags}
        activeTags={activeTags}
        onChange={setActiveTags}
      />

      <main className={`max-w-[480px] mx-auto px-4 ${totalItems > 0 ? "pb-28" : "pb-16"}`}>
        {noResults ? (
          <div className="pt-12 text-center">
            <p className="text-[15px] font-semibold text-text2 mb-1">
              No items match your filters
            </p>
            <button
              onClick={() => setActiveTags([])}
              className="text-[13px] text-amber font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredSections.map((section) => (
            <section key={section.id} id={`section-${section.id}`} className="pt-6">
              <h2 className="font-display text-[18px] font-bold text-dark mb-3 px-1">
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.menu_items.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    totalQty={itemQtyMap.get(item.id) ?? 0}
                    onAdd={() => openFreshModal(item)}
                    onRemove={() => removeOneUnit(item.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Sticky cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-5 pointer-events-none">
          <div className="max-w-[480px] mx-auto pointer-events-auto">
            <button
              onClick={() => setView("cart")}
              className="w-full h-[56px] rounded-2xl bg-dark text-white flex items-center px-5 shadow-xl shadow-dark/20 hover:bg-[#2A2520] transition-colors active:scale-[0.98]"
            >
              <span className="size-[26px] rounded-lg bg-amber text-dark text-[12px] font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                {totalItems}
              </span>
              <span className="flex-1 text-center text-[15px] font-bold">View order</span>
              <span className="text-[14px] font-semibold text-white/80 tabular-nums shrink-0">
                {formatPrice(totalKes)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Item modal */}
      {modalItem && (
        <ItemModal
          item={modalItem}
          existingCartItem={editingCartItem}
          onClose={closeModal}
          onConfirm={handleModalConfirm}
        />
      )}
    </>
  );
}
