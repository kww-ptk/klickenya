"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Minus, Search, X } from "lucide-react";
import type {
  MenuSection,
  MenuItem,
} from "@/components/listings/detail/restaurant/MenuDisplay";
import { ItemModal, type CartItem } from "@/components/menu/ItemModal";

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface DraftLine {
  cart_id:           string;
  menu_item_id:      string;
  item_name:         string;
  base_price:        number;
  quantity:          number;
  notes:             string;
  selected_options:  Array<{ option_id: string; group: string; choice: string; price_add: number }>;
  /** unit price including option add-ons */
  unit_price:        number;
}

export interface PosOrderEntryProps {
  sessionId:    string | null;
  sessionOpen:  boolean;
  menuSections: MenuSection[];
  /** Called once an order has been sent successfully — parent should refresh session detail. */
  onOrderSent: (info: { itemsCount: number; total: number }) => void;
  /** Toast helper from the parent. */
  showToast:   (msg: string, type?: "success" | "error") => void;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function formatKes(n: number): string {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

function unitPriceFromCartItem(c: CartItem): number {
  return c.base_price + c.selected_options.reduce((s, o) => s + o.price_add, 0);
}

function hasRealVariants(item: MenuItem): boolean {
  return (item.item_option_groups ?? []).some(
    (g) => g.group_type !== "allergy" && g.item_options.some((o) => o.is_available),
  );
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export function PosOrderEntry({
  sessionId,
  sessionOpen,
  menuSections,
  onOrderSent,
  showToast,
}: PosOrderEntryProps) {
  const visibleSections = useMemo(
    () =>
      menuSections
        .filter((s) => s.is_visible && s.menu_items.length > 0)
        .sort((a, b) => a.display_order - b.display_order),
    [menuSections],
  );

  const [activeSectionId, setActiveSectionId] = useState<string>(
    visibleSections[0]?.id ?? "",
  );
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [optionModalItem, setOptionModalItem] = useState<MenuItem | null>(null);
  const [draftOpen, setDraftOpen] = useState(false); // mobile sheet

  /* ── Filter shown items by search OR active section ── */
  const visibleItems = useMemo<MenuItem[]>(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      const all: MenuItem[] = [];
      for (const s of visibleSections) {
        for (const it of s.menu_items) {
          if (it.name.toLowerCase().includes(q)) all.push(it);
        }
      }
      return all.sort((a, b) => a.display_order - b.display_order);
    }
    const section = visibleSections.find((s) => s.id === activeSectionId) ?? visibleSections[0];
    return section
      ? [...section.menu_items].sort((a, b) => a.display_order - b.display_order)
      : [];
  }, [search, visibleSections, activeSectionId]);

  /* ── Adding to draft ──────────────────────────────────────────────────────── */

  const addSimpleItem = useCallback((item: MenuItem) => {
    setDraft((prev) => {
      // Same item with no options -> just bump qty on the existing simple line.
      const idx = prev.findIndex(
        (l) => l.menu_item_id === item.id && l.selected_options.length === 0,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      const line: DraftLine = {
        cart_id:           crypto.randomUUID(),
        menu_item_id:      item.id,
        item_name:         item.name,
        base_price:        item.price_kes,
        quantity:          1,
        notes:             "",
        selected_options:  [],
        unit_price:        item.price_kes,
      };
      return [...prev, line];
    });
  }, []);

  const handleItemTap = useCallback(
    (item: MenuItem) => {
      if (!item.is_available) return;
      if (hasRealVariants(item)) {
        // Item has size/extras → open the modal so the waiter picks them.
        setOptionModalItem(item);
        return;
      }
      addSimpleItem(item);
      setDraftOpen(true);
    },
    [addSimpleItem],
  );

  const handleOptionConfirm = useCallback(
    (cartItem: CartItem) => {
      const unit = unitPriceFromCartItem(cartItem);
      setDraft((prev) => [
        ...prev,
        {
          cart_id:          cartItem.cart_id,
          menu_item_id:     cartItem.menu_item_id,
          item_name:        cartItem.item_name,
          base_price:       cartItem.base_price,
          quantity:         cartItem.quantity,
          notes:            cartItem.allergy_notes,
          selected_options: cartItem.selected_options.map((o) => ({
            option_id: o.option_id,
            group:     o.group,
            choice:    o.choice,
            price_add: o.price_add,
          })),
          unit_price:       unit,
        },
      ]);
      setOptionModalItem(null);
      setDraftOpen(true);
    },
    [],
  );

  const updateQty = useCallback((cartId: string, delta: number) => {
    setDraft((prev) =>
      prev
        .map((l) => (l.cart_id === cartId ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const updateNotes = useCallback((cartId: string, notes: string) => {
    setDraft((prev) =>
      prev.map((l) => (l.cart_id === cartId ? { ...l, notes } : l)),
    );
  }, []);

  const removeLine = useCallback((cartId: string) => {
    setDraft((prev) => prev.filter((l) => l.cart_id !== cartId));
  }, []);

  const clearDraft = useCallback(() => {
    if (draft.length === 0) return;
    if (!confirm("Clear current order?")) return;
    setDraft([]);
  }, [draft.length]);

  const subtotal = draft.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const draftItemCount = draft.reduce((s, l) => s + l.quantity, 0);

  /* ── Send ─────────────────────────────────────────────────────────────────── */

  const handleSend = useCallback(async () => {
    if (!sessionId || !sessionOpen) {
      showToast("Session is not open.", "error");
      return;
    }
    if (draft.length === 0) return;
    setSubmitting(true);

    // Optimistic: snapshot the draft and clear immediately so the UI feels
    // instant. If the POST fails we restore it.
    const snapshot = draft;
    setDraft([]);
    setDraftOpen(false);

    try {
      const res = await fetch("/api/pos/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          session_id: sessionId,
          items: snapshot.map((l) => ({
            menu_item_id:     l.menu_item_id,
            quantity:         l.quantity,
            notes:            l.notes || undefined,
            selected_options: l.selected_options.map((o) => ({ option_id: o.option_id })),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDraft(snapshot);
        showToast(data.error || "Failed to send order.", "error");
        return;
      }
      showToast(
        `Order sent — ${data.items_count ?? snapshot.reduce((s, l) => s + l.quantity, 0)} items`,
      );
      onOrderSent({
        itemsCount: data.items_count ?? snapshot.reduce((s, l) => s + l.quantity, 0),
        total:      data.total_amount ?? subtotal,
      });
    } catch {
      setDraft(snapshot);
      showToast("Network error — order not sent.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, sessionOpen, draft, showToast, onOrderSent, subtotal]);

  /* ── Render ───────────────────────────────────────────────────────────────── */

  return (
    <div className="md:grid md:grid-cols-5 md:gap-3">
      {/* Left panel: menu browser (60%) */}
      <div className="md:col-span-3">
        <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2 border-b border-[#2A2520] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#9C9485] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu…"
              className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-[#5E5848]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-[#9C9485] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Section tabs (hidden during search) */}
          {!search && visibleSections.length > 0 && (
            <div className="px-2 py-2 border-b border-[#2A2520] flex gap-1 overflow-x-auto scrollbar-hide">
              {visibleSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSectionId(s.id)}
                  className={`shrink-0 h-12 px-4 rounded-full text-[13px] font-semibold transition-colors ${
                    s.id === activeSectionId
                      ? "bg-[#E8A020] text-[#16130C]"
                      : "bg-[#252019] text-[#F4F1EC] hover:bg-[#3A342B]"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}

          {/* Item grid */}
          <div className="p-2 grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[64vh] md:max-h-[68vh] overflow-y-auto">
            {visibleItems.length === 0 ? (
              <p className="col-span-full text-center text-[12px] text-[#9C9485] py-8">
                {search ? "No items match." : "No items in this section."}
              </p>
            ) : (
              visibleItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onTap={() => handleItemTap(item)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right panel: draft + (parent renders previous orders below) */}
      <div className="hidden md:block md:col-span-2 mt-3 md:mt-0">
        <DraftPanel
          draft={draft}
          subtotal={subtotal}
          submitting={submitting}
          sessionOpen={sessionOpen}
          onUpdateQty={updateQty}
          onUpdateNotes={updateNotes}
          onRemoveLine={removeLine}
          onClear={clearDraft}
          onSend={handleSend}
        />
      </div>

      {/* Mobile floating "View order" button */}
      {!draftOpen && draft.length > 0 && (
        <button
          type="button"
          onClick={() => setDraftOpen(true)}
          className="md:hidden fixed bottom-20 left-3 right-3 z-30 h-14 rounded-full bg-[#E8A020] text-[#16130C] text-[14px] font-bold shadow-2xl flex items-center justify-between px-5"
        >
          <span>View order · {draftItemCount} {draftItemCount === 1 ? "item" : "items"}</span>
          <span>{formatKes(subtotal)}</span>
        </button>
      )}

      {/* Mobile bottom sheet */}
      {draftOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setDraftOpen(false)}>
          <div
            className="absolute bottom-0 inset-x-0 max-h-[88vh] bg-[#1A170F] rounded-t-3xl border-t border-[#2A2520] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#2A2520] flex items-center justify-between">
              <p className="text-[14px] font-bold text-white">Current order</p>
              <button onClick={() => setDraftOpen(false)} className="text-[#9C9485]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <DraftPanel
                draft={draft}
                subtotal={subtotal}
                submitting={submitting}
                sessionOpen={sessionOpen}
                onUpdateQty={updateQty}
                onUpdateNotes={updateNotes}
                onRemoveLine={removeLine}
                onClear={clearDraft}
                onSend={handleSend}
                onContinue={() => setDraftOpen(false)}
                bare
              />
            </div>
          </div>
        </div>
      )}

      {/* Option-group modal (reuses guest UI) */}
      {optionModalItem && (
        <ItemModal
          item={optionModalItem}
          onClose={() => setOptionModalItem(null)}
          onConfirm={handleOptionConfirm}
        />
      )}
    </div>
  );
}

/* ── MenuItemCard ───────────────────────────────────────────────────────────── */
//
// Text-only by design. The waiter POS doesn't render item photos — speed
// matters more than recognition during service, and the waiter knows the menu.

function MenuItemCard({ item, onTap }: { item: MenuItem; onTap: () => void }) {
  const customisable = hasRealVariants(item);
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!item.is_available}
      className={`min-h-[72px] rounded-xl border p-3 text-left flex flex-col justify-between transition-colors active:scale-[0.98] ${
        item.is_available
          ? "border-[#3A342B] bg-[#252019] hover:bg-[#3A342B]"
          : "border-[#2A2520] bg-[#1A170F] opacity-50 cursor-not-allowed"
      }`}
    >
      <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2">{item.name}</p>
      <div className="flex items-baseline justify-between gap-2 mt-1.5">
        <span className="text-[13px] font-bold text-[#E8A020]">
          {formatKes(item.price_kes)}
        </span>
        {customisable && item.is_available && (
          <span className="text-[10px] text-[#9C9485] uppercase tracking-wide">Custom</span>
        )}
        {!item.is_available && (
          <span className="text-[10px] text-[#FF8A6B] uppercase tracking-wide">Unavailable</span>
        )}
      </div>
    </button>
  );
}

/* ── DraftPanel ─────────────────────────────────────────────────────────────── */

function DraftPanel({
  draft,
  subtotal,
  submitting,
  sessionOpen,
  onUpdateQty,
  onUpdateNotes,
  onRemoveLine,
  onClear,
  onSend,
  onContinue,
  bare,
}: {
  draft:         DraftLine[];
  subtotal:      number;
  submitting:    boolean;
  sessionOpen:   boolean;
  onUpdateQty:   (cartId: string, delta: number) => void;
  onUpdateNotes: (cartId: string, notes: string) => void;
  onRemoveLine:  (cartId: string) => void;
  onClear:       () => void;
  onSend:        () => void;
  /** When provided, the action row shows two buttons side-by-side: continue
   *  building the order (closes the mobile sheet) vs send to kitchen. */
  onContinue?:   () => void;
  bare?:         boolean;
}) {
  const wrapper = bare
    ? "flex flex-col"
    : "rounded-2xl border border-[#2A2520] bg-[#1A170F] overflow-hidden flex flex-col";
  return (
    <div className={wrapper}>
      {!bare && (
        <div className="px-4 py-3 border-b border-[#2A2520] flex items-baseline justify-between">
          <p className="text-[13px] font-bold text-white">Current order</p>
          {draft.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-[#9C9485] hover:text-[#FF8A6B]"
            >
              Clear
            </button>
          )}
        </div>
      )}
      {draft.length === 0 ? (
        <div className="px-4 py-10 text-center text-[12px] text-[#9C9485]">
          Tap items on the left to start a new order.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {draft.map((line) => (
            <div key={line.cart_id} className="px-3 py-3 border-b border-[#2A2520] last:border-0">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{line.item_name}</p>
                  {line.selected_options.length > 0 && (
                    <p className="text-[11px] text-[#9C9485] mt-0.5 line-clamp-2">
                      {line.selected_options.map((o) => o.choice).join(", ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveLine(line.cart_id)}
                  aria-label="Remove"
                  className="w-7 h-7 rounded-full bg-[#252019] text-[#9C9485] hover:text-[#FF8A6B] grid place-items-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                value={line.notes}
                onChange={(e) => onUpdateNotes(line.cart_id, e.target.value)}
                placeholder="Special requests"
                className="mt-2 w-full bg-[#0F0D08] border border-[#2A2520] rounded-lg px-2 py-1.5 text-[12px] text-[#F4F1EC] placeholder:text-[#5E5848] outline-none focus:border-[#E8A020]"
              />

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(line.cart_id, -1)}
                    className="w-12 h-12 rounded-full bg-[#252019] text-white grid place-items-center"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center text-[15px] font-bold text-white tabular-nums">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(line.cart_id, 1)}
                    className="w-12 h-12 rounded-full bg-[#E8A020] text-[#16130C] grid place-items-center"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[13px] font-bold text-white">
                  {formatKes(line.unit_price * line.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3 border-t border-[#2A2520] bg-[#1A170F] sticky bottom-0">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] text-[#9C9485]">Subtotal</span>
          <span className="text-[16px] font-bold text-white">{formatKes(subtotal)}</span>
        </div>
        {onContinue ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onContinue}
              disabled={submitting}
              className="h-14 rounded-full bg-[#252019] text-[#F4F1EC] text-[13px] font-semibold disabled:opacity-40"
            >
              Add to order
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={submitting || draft.length === 0 || !sessionOpen}
              className="h-14 rounded-full bg-[#E8A020] text-[#16130C] text-[13px] font-bold disabled:opacity-40"
            >
              {submitting ? "Sending…" : !sessionOpen ? "Session not open" : "Send to kitchen"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={submitting || draft.length === 0 || !sessionOpen}
            className="w-full h-14 rounded-full bg-[#E8A020] text-[#16130C] text-[14px] font-bold disabled:opacity-40"
          >
            {submitting ? "Sending…" : !sessionOpen ? "Session not open" : "Send to kitchen"}
          </button>
        )}
      </div>
    </div>
  );
}
