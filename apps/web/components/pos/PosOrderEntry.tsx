"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Search, X } from "lucide-react";
import type {
  MenuSection,
  MenuItem,
} from "@/components/listings/detail/restaurant/MenuDisplay";
import { ItemModal, type CartItem } from "@/components/menu/ItemModal";
import { posFetch } from "./_shell/posFetch";
import {
  clearDraft as clearStoredDraft,
  loadDraft,
  saveDraft,
} from "./_shell/draftStorage";

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
  /**
   * Optional content rendered inside the right column (md+) directly below
   * the current-order draft. Lets the parent stack Previous orders / Bill /
   * Payment under the draft *within the same grid* so the right sidebar
   * sticks to the top of the page instead of starting below the menu's
   * full height. On mobile this slot renders below the floating draft
   * sheet; layout is the same single-column stack.
   */
  rightSidebarSlot?: React.ReactNode;
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
  rightSidebarSlot,
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
  const restoredRef = useRef(false);

  /* ── Restore persisted draft on mount ─────────────────────────────────────
   * Keyed by session_id. Survives tab close, browser crash, accidental
   * navigation. Cleared on successful Send and manual Clear. */
  useEffect(() => {
    if (!sessionId || restoredRef.current) return;
    restoredRef.current = true;
    const persisted = loadDraft(sessionId);
    if (persisted && persisted.length > 0) {
      setDraft(persisted);
      const itemCount = persisted.reduce((s, l) => s + l.quantity, 0);
      showToast(`Restored unsaved order — ${itemCount} ${itemCount === 1 ? "item" : "items"}`);
    }
  }, [sessionId, showToast]);

  /* ── Mirror draft → localStorage on every change ─────────────────────────── */
  useEffect(() => {
    if (!sessionId) return;
    if (draft.length === 0) {
      // Don't write empty drafts — clearStoredDraft has already happened (or
      // there was nothing there). Avoids churning localStorage for nothing.
      return;
    }
    saveDraft(sessionId, draft);
  }, [sessionId, draft]);

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
      // Don't auto-open the cart sheet — the floating "View order" pill is
      // enough feedback. Lets the waiter chain quick-adds.
    },
    [addSimpleItem],
  );

  /** Decrement the most recently added simple-line for this menu item. Items
   *  with option-driven lines must be edited from the cart sheet (which line?). */
  const quickRemove = useCallback((menuItemId: string) => {
    setDraft((prev) => {
      // Walk backwards to find the latest line with no options.
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].menu_item_id === menuItemId && prev[i].selected_options.length === 0) {
          if (prev[i].quantity > 1) {
            const next = [...prev];
            next[i] = { ...next[i], quantity: next[i].quantity - 1 };
            return next;
          }
          return prev.filter((_, idx) => idx !== i);
        }
      }
      return prev;
    });
  }, []);

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
    if (sessionId) clearStoredDraft(sessionId);
  }, [draft.length, sessionId]);

  const subtotal = draft.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const draftItemCount = draft.reduce((s, l) => s + l.quantity, 0);

  /** Sum of qty per menu_item_id across all lines (incl. option-driven ones).
   *  Drives the "you have N of this in the draft" badge on each menu card. */
  const draftQtyByItemId = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of draft) m.set(l.menu_item_id, (m.get(l.menu_item_id) ?? 0) + l.quantity);
    return m;
  }, [draft]);

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
    // Clear persisted copy too so a refresh during the in-flight POST doesn't
    // ressurect the just-sent order. If the POST fails we re-persist below.
    clearStoredDraft(sessionId);

    try {
      const res = await posFetch("/api/pos/orders", {
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
            <Search className="w-4 h-4 text-text3 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu…"
              className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-text2"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-text3 hover:text-white"
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
                      ? "bg-amber text-dark"
                      : "bg-[#252019] text-surface hover:bg-[#3A342B]"
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
              <p className="col-span-full text-center text-[12px] text-text3 py-8">
                {search ? "No items match." : "No items in this section."}
              </p>
            ) : (
              visibleItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  inDraftQty={draftQtyByItemId.get(item.id) ?? 0}
                  onTap={() => handleItemTap(item)}
                  onQuickRemove={() => quickRemove(item.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right panel: draft + parent-supplied sidebar (Previous orders,
          bill, payment). Both stack inside the same col-span-2 so the
          sidebar starts directly under "Current order" instead of below
          the menu's full height. */}
      <div className="hidden md:block md:col-span-2 mt-3 md:mt-0 space-y-3">
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
        {rightSidebarSlot}
      </div>

      {/* Mobile floating "View order" button */}
      {!draftOpen && draft.length > 0 && (
        <button
          type="button"
          onClick={() => setDraftOpen(true)}
          className="md:hidden fixed bottom-20 left-3 right-3 z-30 h-14 rounded-full bg-amber text-dark text-[14px] font-bold shadow-2xl flex items-center justify-between px-5"
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
              <button onClick={() => setDraftOpen(false)} className="text-text3">
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
                compact
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

      {/* Mobile sidebar slot — rendered after the menu, since the desktop
          slot lives inside `hidden md:block` above. */}
      {rightSidebarSlot && (
        <div className="md:hidden mt-3 space-y-3">{rightSidebarSlot}</div>
      )}
    </div>
  );
}

/* ── MenuItemCard ───────────────────────────────────────────────────────────── */
//
// Text-only by design. The waiter POS doesn't render item photos — speed
// matters more than recognition during service, and the waiter knows the menu.
//
// Quick-add behaviour:
// - 0 in draft: full card is tappable → adds 1 (or opens option modal).
// - ≥1 in draft, simple item (no options): shows inline [- N +] stepper so
//   the waiter can rapidly stack qty without opening the cart sheet.
// - ≥1 in draft, item with options: shows a "× N" badge + Add button (each
//   add opens the modal so the waiter can pick a different size/extras).

function MenuItemCard({
  item,
  inDraftQty,
  onTap,
  onQuickRemove,
}: {
  item:          MenuItem;
  inDraftQty:    number;
  onTap:         () => void;
  onQuickRemove: () => void;
}) {
  const customisable = hasRealVariants(item);
  const showStepper = inDraftQty > 0 && !customisable && item.is_available;
  const showBadgePlus = inDraftQty > 0 && customisable && item.is_available;

  return (
    <div
      className={`relative min-h-[72px] rounded-xl border p-3 flex flex-col justify-between transition-colors ${
        item.is_available
          ? "border-[#3A342B] bg-[#252019]"
          : "border-[#2A2520] bg-[#1A170F] opacity-50"
      } ${inDraftQty > 0 ? "ring-2 ring-amber/60" : ""}`}
    >
      <button
        type="button"
        onClick={onTap}
        disabled={!item.is_available}
        className="text-left active:scale-[0.98] disabled:cursor-not-allowed"
      >
        <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2">
          {item.name}
        </p>
      </button>

      <div className="flex items-center justify-between gap-2 mt-1.5">
        <span className="text-[13px] font-bold text-amber">
          {formatKes(item.price_kes)}
        </span>

        {!item.is_available ? (
          <span className="text-[10px] text-[#FF8A6B] uppercase tracking-wide">Unavailable</span>
        ) : showStepper ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onQuickRemove}
              className="w-9 h-9 rounded-full bg-[#0F0D08] text-surface grid place-items-center active:scale-95"
              aria-label="Remove one"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="min-w-5 text-center text-[13px] font-bold text-white tabular-nums">
              {inDraftQty}
            </span>
            <button
              type="button"
              onClick={onTap}
              className="w-9 h-9 rounded-full bg-amber text-dark grid place-items-center active:scale-95"
              aria-label="Add one more"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : showBadgePlus ? (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0F0D08] text-amber">
              ×{inDraftQty}
            </span>
            <button
              type="button"
              onClick={onTap}
              className="w-9 h-9 rounded-full bg-amber text-dark grid place-items-center active:scale-95"
              aria-label="Add another with options"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onTap}
            className="px-3 h-9 rounded-full bg-amber text-dark text-[12px] font-bold active:scale-95 flex items-center gap-1"
            aria-label={customisable ? "Configure and add" : "Add to order"}
          >
            <Plus className="w-3.5 h-3.5" />
            {customisable ? "Add…" : "Add"}
          </button>
        )}
      </div>
    </div>
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
  compact,
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
  /** One-row-per-line dense layout for mobile sheets. Notes hidden behind a
   *  small "+ note" button so 8–10 items fit on a phone screen. */
  compact?:      boolean;
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
              className="text-[11px] text-text3 hover:text-[#FF8A6B]"
            >
              Clear
            </button>
          )}
        </div>
      )}
      {draft.length === 0 ? (
        <div className="px-4 py-10 text-center text-[12px] text-text3">
          Tap items on the left to start a new order.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {draft.map((line) => (
            <DraftLineRow
              key={line.cart_id}
              line={line}
              compact={!!compact}
              onUpdateQty={onUpdateQty}
              onUpdateNotes={onUpdateNotes}
              onRemoveLine={onRemoveLine}
            />
          ))}
        </div>
      )}

      <div className="px-4 py-3 border-t border-[#2A2520] bg-[#1A170F] sticky bottom-0">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] text-text3">Subtotal</span>
          <span className="text-[16px] font-bold text-white">{formatKes(subtotal)}</span>
        </div>
        {onContinue ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onContinue}
              disabled={submitting}
              className="h-14 rounded-full bg-[#252019] text-surface text-[13px] font-semibold disabled:opacity-40"
            >
              Add to order
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={submitting || draft.length === 0 || !sessionOpen}
              className="h-14 rounded-full bg-amber text-dark text-[13px] font-bold disabled:opacity-40"
            >
              {submitting ? "Sending…" : !sessionOpen ? "Session not open" : "Send to kitchen"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={submitting || draft.length === 0 || !sessionOpen}
            className="w-full h-14 rounded-full bg-amber text-dark text-[14px] font-bold disabled:opacity-40"
          >
            {submitting ? "Sending…" : !sessionOpen ? "Session not open" : "Send to kitchen"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── DraftLineRow ───────────────────────────────────────────────────────────── */
//
// Compact mode (mobile sheet): single-row layout — name + stepper + total + ×.
// Notes hidden behind a small "+ note" toggle so big orders stay scannable.
// Tablet mode keeps the original stacked layout (more breathing room).

function DraftLineRow({
  line,
  compact,
  onUpdateQty,
  onUpdateNotes,
  onRemoveLine,
}: {
  line:          DraftLine;
  compact:       boolean;
  onUpdateQty:   (cartId: string, delta: number) => void;
  onUpdateNotes: (cartId: string, notes: string) => void;
  onRemoveLine:  (cartId: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(line.notes.length > 0);
  const lineTotal = line.unit_price * line.quantity;

  if (compact) {
    return (
      <div className="px-3 py-2 border-b border-[#2A2520] last:border-0">
        <div className="flex items-center gap-2">
          {/* Stepper — left */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onUpdateQty(line.cart_id, -1)}
              className="w-9 h-9 rounded-full bg-[#252019] text-white grid place-items-center active:scale-95"
              aria-label="Decrease"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-5 text-center text-[14px] font-bold text-white tabular-nums">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQty(line.cart_id, 1)}
              className="w-9 h-9 rounded-full bg-amber text-dark grid place-items-center active:scale-95"
              aria-label="Increase"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Name + options summary — middle */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{line.item_name}</p>
            {line.selected_options.length > 0 && (
              <p className="text-[11px] text-text3 truncate">
                {line.selected_options.map((o) => o.choice).join(", ")}
              </p>
            )}
          </div>

          {/* Total + remove — right */}
          <div className="flex items-center gap-2 shrink-0">
            <p className="text-[13px] font-bold text-white whitespace-nowrap">
              {formatKes(lineTotal)}
            </p>
            <button
              type="button"
              onClick={() => onRemoveLine(line.cart_id)}
              aria-label="Remove line"
              className="w-7 h-7 rounded-full bg-[#252019] text-text3 hover:text-[#FF8A6B] grid place-items-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notes — collapsed by default. Tap to expand, persists if non-empty. */}
        {noteOpen ? (
          <input
            value={line.notes}
            onChange={(e) => onUpdateNotes(line.cart_id, e.target.value)}
            placeholder="Special requests"
            autoFocus={!line.notes}
            onBlur={() => { if (!line.notes) setNoteOpen(false); }}
            className="mt-2 ml-[88px] w-[calc(100%-88px)] bg-[#0F0D08] border border-[#2A2520] rounded-lg px-2 py-1.5 text-[12px] text-surface placeholder:text-text2 outline-none focus:border-amber"
          />
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="ml-[88px] mt-1 text-[11px] text-text3 hover:text-amber"
          >
            + Add note
          </button>
        )}
      </div>
    );
  }

  // Tablet / desktop layout — keeps the existing stacked card.
  return (
    <div className="px-3 py-3 border-b border-[#2A2520] last:border-0">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{line.item_name}</p>
          {line.selected_options.length > 0 && (
            <p className="text-[11px] text-text3 mt-0.5 line-clamp-2">
              {line.selected_options.map((o) => o.choice).join(", ")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemoveLine(line.cart_id)}
          aria-label="Remove"
          className="w-7 h-7 rounded-full bg-[#252019] text-text3 hover:text-[#FF8A6B] grid place-items-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        value={line.notes}
        onChange={(e) => onUpdateNotes(line.cart_id, e.target.value)}
        placeholder="Special requests"
        className="mt-2 w-full bg-[#0F0D08] border border-[#2A2520] rounded-lg px-2 py-1.5 text-[12px] text-surface placeholder:text-text2 outline-none focus:border-amber"
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
            className="w-12 h-12 rounded-full bg-amber text-dark grid place-items-center"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[13px] font-bold text-white">{formatKes(lineTotal)}</p>
      </div>
    </div>
  );
}
