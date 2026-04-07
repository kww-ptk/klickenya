"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import type { MenuSection, MenuItem } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuTabBar } from "@/components/menu/MenuTabBar";
import { DietaryFilter } from "@/components/menu/DietaryFilter";

/* ── Types ─────────────────────────────────────────── */

interface CartEntry {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

type View = "browse" | "cart" | "confirmed";

interface ConfirmData {
  orderId: string;
  shortId: string;
  tableNumber: string;
  estimatedMinutes: number;
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

/* ── Quantity control ──────────────────────────────── */

interface QtyControlProps {
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

function QtyControl({ quantity, onAdd, onRemove }: QtyControlProps) {
  if (quantity === 0) {
    return (
      <button
        onClick={onAdd}
        className="shrink-0 h-[32px] px-4 rounded-full bg-amber text-dark text-[13px] font-bold hover:bg-[#d4911c] transition-colors active:scale-95"
        aria-label="Add to order"
      >
        Add
      </button>
    );
  }

  return (
    <div className="shrink-0 flex items-center gap-2">
      <button
        onClick={onRemove}
        className="size-[28px] rounded-full bg-[#F4F1EC] text-dark text-[17px] font-bold flex items-center justify-center hover:bg-[#E2DDD5] transition-colors active:scale-95"
        aria-label="Remove one"
      >
        −
      </button>
      <span className="text-[14px] font-bold text-dark w-[18px] text-center tabular-nums">
        {quantity}
      </span>
      <button
        onClick={onAdd}
        className="size-[28px] rounded-full bg-amber text-dark text-[17px] font-bold flex items-center justify-center hover:bg-[#d4911c] transition-colors active:scale-95"
        aria-label="Add one more"
      >
        +
      </button>
    </div>
  );
}

/* ── Item card with cart controls ──────────────────── */

interface CartItemCardProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

function CartItemCard({ item, quantity, onAdd, onRemove }: CartItemCardProps) {
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
          <QtyControl quantity={quantity} onAdd={onAdd} onRemove={onRemove} />
        )}
      </div>
    </div>
  );
}

/* ── Cart panel ────────────────────────────────────── */

interface CartPanelProps {
  cart: Map<string, CartEntry>;
  menuId: string;
  onBack: () => void;
  onConfirmed: (data: ConfirmData) => void;
  onUpdateQty: (id: string, delta: number) => void;
}

function CartPanel({ cart, menuId, onBack, onConfirmed, onUpdateQty }: CartPanelProps) {
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = Array.from(cart.values()).filter((e) => e.quantity > 0);
  const subtotal = entries.reduce((sum, e) => sum + e.price * e.quantity, 0);

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
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      onConfirmed({
        orderId: data.order_id,
        shortId: data.short_id,
        tableNumber: tableNumber.trim(),
        estimatedMinutes: data.estimated_minutes ?? 20,
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
      {/* Header */}
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
        <h2 className="font-display text-[18px] font-bold text-dark tracking-tight">
          Your order
        </h2>
        <span className="ml-auto text-[13px] font-semibold text-text3">
          {entries.reduce((s, e) => s + e.quantity, 0)} items
        </span>
      </header>

      {/* Items */}
      <div className="flex-1 max-w-[480px] w-full mx-auto px-4 py-4 space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.menu_item_id}
            className="flex items-center gap-3 bg-white rounded-xl border border-border px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-dark truncate">{entry.name}</p>
              <p className="text-[13px] text-text2 mt-0.5">
                {formatPrice(entry.price)} × {entry.quantity}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <QtyControl
                quantity={entry.quantity}
                onAdd={() => onUpdateQty(entry.menu_item_id, 1)}
                onRemove={() => onUpdateQty(entry.menu_item_id, -1)}
              />
            </div>
            <span className="text-[14px] font-bold text-dark shrink-0 w-[72px] text-right tabular-nums">
              {formatPrice(entry.price * entry.quantity)}
            </span>
          </div>
        ))}

        {/* Subtotal */}
        <div className="bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between mt-2">
          <span className="text-[14px] font-semibold text-text2">Subtotal</span>
          <span className="text-[16px] font-bold text-dark tabular-nums">
            {formatPrice(subtotal)}
          </span>
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
              Your name <span className="text-text3 font-normal normal-case">(optional)</span>
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

        {/* Place order */}
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

function ConfirmationScreen({ data }: { data: ConfirmData }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
        <svg className="size-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="font-display text-[26px] font-extrabold text-dark tracking-[-0.03em] leading-tight mb-2">
        Order received!
      </h1>
      <p className="text-[16px] text-text2 leading-relaxed mb-1">
        We&apos;ll bring it to <strong className="text-dark">table {data.tableNumber}</strong> shortly.
      </p>
      <p className="text-[14px] text-text3 mb-8">
        Estimated time: ~{data.estimatedMinutes} minutes
      </p>

      <div className="bg-white rounded-2xl border border-border px-6 py-4 shadow-sm">
        <p className="text-[12px] font-bold text-text3 uppercase tracking-widest mb-1">
          Order reference
        </p>
        <p className="font-display text-[28px] font-extrabold text-dark tracking-[0.05em]">
          #{data.shortId}
        </p>
      </div>

      <p className="text-[12px] text-text3 mt-8">
        Powered by{" "}
        <a href="https://klickenya.com" className="text-amber hover:underline">
          Klickenya
        </a>
      </p>
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
  const [cart, setCart] = useState<Map<string, CartEntry>>(new Map());
  const [view, setView] = useState<View>("browse");
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);

  /* ── Dietary filter helpers ──────────────────────── */

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const section of sections) {
      for (const item of section.menu_items) {
        for (const tag of item.dietary_tags) tags.add(tag);
      }
    }
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

  /* ── Cart helpers ────────────────────────────────── */

  const addItem = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        next.set(item.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(item.id, {
          menu_item_id: item.id,
          name: item.name,
          price: item.price_kes,
          quantity: 1,
        });
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        next.delete(itemId);
      } else {
        next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
      }
      return next;
    });
  }, []);

  const updateQty = useCallback((itemId: string, delta: number) => {
    if (delta > 0) {
      setCart((prev) => {
        const next = new Map(prev);
        const existing = next.get(itemId);
        if (existing) next.set(itemId, { ...existing, quantity: existing.quantity + delta });
        return next;
      });
    } else {
      removeItem(itemId);
    }
  }, [removeItem]);

  const totalItems = useMemo(() => {
    let count = 0;
    cart.forEach((e) => { count += e.quantity; });
    return count;
  }, [cart]);

  const totalKes = useMemo(() => {
    let sum = 0;
    cart.forEach((e) => { sum += e.price * e.quantity; });
    return sum;
  }, [cart]);

  /* ── Confirmed ───────────────────────────────────── */

  if (view === "confirmed" && confirmData) {
    return <ConfirmationScreen data={confirmData} />;
  }

  /* ── Cart view ───────────────────────────────────── */

  if (view === "cart") {
    return (
      <CartPanel
        cart={cart}
        menuId={menuId}
        onBack={() => setView("browse")}
        onConfirmed={(data) => {
          setConfirmData(data);
          setView("confirmed");
        }}
        onUpdateQty={updateQty}
      />
    );
  }

  /* ── Browse view ─────────────────────────────────── */

  return (
    <>
      <MenuTabBar tabs={tabs} />

      <DietaryFilter
        availableTags={availableTags}
        activeTags={activeTags}
        onChange={setActiveTags}
      />

      {/* Items — extra bottom padding when cart bar is visible */}
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
                    quantity={cart.get(item.id)?.quantity ?? 0}
                    onAdd={() => addItem(item)}
                    onRemove={() => removeItem(item.id)}
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
              {/* Item count badge */}
              <span className="size-[26px] rounded-lg bg-amber text-dark text-[12px] font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                {totalItems}
              </span>

              <span className="flex-1 text-center text-[15px] font-bold">
                View order
              </span>

              <span className="text-[14px] font-semibold text-white/80 tabular-nums shrink-0">
                {formatPrice(totalKes)}
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
