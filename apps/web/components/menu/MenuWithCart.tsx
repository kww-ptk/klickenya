"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import type { MenuSection, MenuItem, ItemOptionGroup } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuTabBar } from "@/components/menu/MenuTabBar";
import { DietaryFilter } from "@/components/menu/DietaryFilter";

/* ── Types ─────────────────────────────────────────── */

/** One resolved option choice stored per cart entry */
interface SelectedOption {
  group: string;       // group name (snapshot)
  choice: string;      // option name (snapshot)
  price_add: number;   // price_modifier at add time (snapshot)
}

interface CartEntry {
  menu_item_id: string;
  name: string;
  base_price: number;
  selected_options: SelectedOption[];
  allergy_notes: string;
  /** (base_price + sum(price_add)) × quantity */
  line_total: number;
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

function unitPriceFromOptions(basePrice: number, opts: SelectedOption[]): number {
  return basePrice + opts.reduce((s, o) => s + o.price_add, 0);
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

/* ── Option group section (inside sheet) ───────────── */

interface OptionGroupSectionProps {
  group: ItemOptionGroup;
  singleSelected: string | null;
  multiSelected: Set<string>;
  onSingleChange: (optionId: string) => void;
  onMultiToggle: (optionId: string) => void;
}

function OptionGroupSection({
  group, singleSelected, multiSelected, onSingleChange, onMultiToggle
}: OptionGroupSectionProps) {
  const options = [...group.item_options].sort((a, b) => a.display_order - b.display_order);

  const subtitle = group.group_type === "single"
    ? group.is_required ? "Required · Choose one" : "Optional · Choose one"
    : group.group_type === "allergy"
    ? "Select all that apply"
    : group.max_select
    ? `Choose up to ${group.max_select}`
    : "Select all that apply";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[14px] font-bold text-dark">{group.name}</p>
        <span className="text-[11px] text-text3 font-medium">{subtitle}</span>
      </div>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const isChecked = group.group_type === "single"
            ? singleSelected === opt.id
            : multiSelected.has(opt.id);
          const isRadio = group.group_type === "single";

          return (
            <button
              key={opt.id}
              disabled={!opt.is_available}
              onClick={() => {
                if (isRadio) onSingleChange(opt.id);
                else onMultiToggle(opt.id);
              }}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-40 ${
                isChecked
                  ? "border-amber bg-amber/5"
                  : "border-border bg-white hover:border-amber/50"
              }`}
            >
              <span
                className={`shrink-0 size-4 flex items-center justify-center transition-colors border-2 ${
                  isRadio ? "rounded-full" : "rounded-md"
                } ${isChecked ? "border-amber bg-amber" : "border-[#D4CFC8]"}`}
              >
                {isChecked && (
                  <svg className="size-2.5 text-dark" fill="none" viewBox="0 0 10 10">
                    {isRadio
                      ? <circle cx="5" cy="5" r="2.5" fill="currentColor" />
                      : <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
                  </svg>
                )}
              </span>
              <span className="flex-1 text-[14px] text-dark">{opt.name}</span>
              {opt.price_modifier > 0 && (
                <span className="text-[13px] font-semibold text-text2 shrink-0">
                  +{formatPrice(opt.price_modifier)}
                </span>
              )}
              {!opt.is_available && (
                <span className="text-[11px] text-text3 shrink-0">Unavailable</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Item option sheet ─────────────────────────────── */

interface OptionSheetProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (opts: SelectedOption[], allergyNotes: string) => void;
}

function OptionSheet({ item, onClose, onAddToCart }: OptionSheetProps) {
  const groups = [...(item.item_option_groups ?? [])]
    .filter((g) => g.item_options.length > 0)
    .sort((a, b) => a.display_order - b.display_order);

  const [singleSelections, setSingleSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) {
      if (g.group_type === "single" && g.is_required) {
        const first = [...g.item_options]
          .filter((o) => o.is_available)
          .sort((a, b) => a.display_order - b.display_order)[0];
        if (first) init[g.id] = first.id;
      }
    }
    return init;
  });

  const [multiSelections, setMultiSelections] = useState<Record<string, Set<string>>>({});
  const [allergyNotes, setAllergyNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function toggleMulti(groupId: string, optionId: string) {
    setMultiSelections((prev) => {
      const next = { ...prev };
      const set = new Set(prev[groupId] ?? []);
      if (set.has(optionId)) set.delete(optionId);
      else set.add(optionId);
      next[groupId] = set;
      return next;
    });
  }

  const optionTotal = useMemo(() => {
    let total = 0;
    for (const g of groups) {
      if (g.group_type === "single") {
        const selId = singleSelections[g.id];
        if (selId) {
          const opt = g.item_options.find((o) => o.id === selId);
          if (opt) total += opt.price_modifier;
        }
      } else {
        const set = multiSelections[g.id] ?? new Set();
        for (const optId of set) {
          const opt = g.item_options.find((o) => o.id === optId);
          if (opt) total += opt.price_modifier;
        }
      }
    }
    return total;
  }, [groups, singleSelections, multiSelections]);

  function handleAdd() {
    for (const g of groups) {
      if (g.group_type === "single" && g.is_required && !singleSelections[g.id]) {
        setValidationError(`Please select a ${g.name}.`);
        return;
      }
      if (g.group_type === "multi" && g.min_select > 0) {
        const count = (multiSelections[g.id] ?? new Set()).size;
        if (count < g.min_select) {
          setValidationError(`Please select at least ${g.min_select} option(s) for ${g.name}.`);
          return;
        }
      }
    }

    const resolved: SelectedOption[] = [];
    for (const g of groups) {
      if (g.group_type === "single") {
        const selId = singleSelections[g.id];
        if (selId) {
          const opt = g.item_options.find((o) => o.id === selId);
          if (opt) resolved.push({ group: g.name, choice: opt.name, price_add: opt.price_modifier });
        }
      } else {
        const set = multiSelections[g.id] ?? new Set();
        for (const optId of set) {
          const opt = g.item_options.find((o) => o.id === optId);
          if (opt) resolved.push({ group: g.name, choice: opt.name, price_add: g.group_type === "allergy" ? 0 : opt.price_modifier });
        }
      }
    }

    onAddToCart(resolved, allergyNotes.trim());
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
          {item.photo_url && (
            <div className="relative w-[56px] h-[56px] rounded-lg overflow-hidden shrink-0">
              <Image src={item.photo_url} alt={item.name} width={56} height={56} className="object-cover w-full h-full" sizes="56px" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-[17px] font-bold text-dark leading-snug">{item.name}</h3>
            {item.description && (
              <p className="text-[13px] text-text2 mt-0.5 line-clamp-2">{item.description}</p>
            )}
            <p className="text-[14px] font-bold text-amber mt-1">{formatPrice(item.price_kes)}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 text-text3 hover:text-dark transition-colors" aria-label="Close">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {groups.map((group) => (
            <OptionGroupSection
              key={group.id}
              group={group}
              singleSelected={singleSelections[group.id] ?? null}
              multiSelected={multiSelections[group.id] ?? new Set()}
              onSingleChange={(optId) => setSingleSelections((p) => ({ ...p, [group.id]: optId }))}
              onMultiToggle={(optId) => toggleMulti(group.id, optId)}
            />
          ))}

          <div>
            <label className="block text-[12px] font-bold text-dark mb-1.5 uppercase tracking-wide">
              Allergy or special request <span className="text-text3 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={allergyNotes}
              onChange={(e) => setAllergyNotes(e.target.value)}
              placeholder="e.g. No nuts, extra spicy…"
              maxLength={300}
              className="w-full border border-border rounded-xl px-3.5 py-3 text-[14px] text-dark placeholder:text-text3 focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 resize-none bg-white transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-border shrink-0">
          {validationError && (
            <p className="text-[13px] text-red-600 font-medium mb-2">{validationError}</p>
          )}
          <button
            onClick={handleAdd}
            className="w-full h-[52px] rounded-full bg-dark text-white font-bold text-[15px] hover:bg-[#2A2520] transition-colors active:scale-[0.98]"
          >
            {`Add to order · ${formatPrice(item.price_kes + optionTotal)}`}
          </button>
        </div>
      </div>
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
  const hasOptions = (item.item_option_groups ?? []).some((g) => g.item_options.length > 0);

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
        {hasOptions && item.is_available && (
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
  onUpdateQty: (key: string, delta: number) => void;
}

function CartPanel({ cart, menuId, onBack, onConfirmed, onUpdateQty }: CartPanelProps) {
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = Array.from(cart.values()).filter((e) => e.quantity > 0);
  const subtotal = entries.reduce((sum, e) => sum + e.line_total, 0);

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
            selected_options: e.selected_options,
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

      <div className="flex-1 max-w-[480px] w-full mx-auto px-4 py-4 space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.menu_item_id}
            className="bg-white rounded-xl border border-border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-dark truncate">{entry.name}</p>
                <p className="text-[13px] text-text2 mt-0.5">
                  {formatPrice(unitPriceFromOptions(entry.base_price, entry.selected_options))} × {entry.quantity}
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
                {formatPrice(entry.line_total)}
              </span>
            </div>

            {/* Selected options summary */}
            {entry.selected_options.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/60 space-y-0.5">
                {entry.selected_options.map((o, i) => (
                  <p key={i} className="text-[12px] text-text3">
                    {o.choice}{o.price_add > 0 ? ` (+${formatPrice(o.price_add)})` : ""}
                  </p>
                ))}
              </div>
            )}
            {entry.allergy_notes && (
              <p className="text-[12px] text-text3 italic mt-1">{entry.allergy_notes}</p>
            )}
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
  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);

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

  function addItem(item: MenuItem, selectedOptions: SelectedOption[], allergyNotes: string) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        next.set(item.id, {
          ...existing,
          quantity: newQty,
          line_total: unitPriceFromOptions(existing.base_price, existing.selected_options) * newQty,
        });
      } else {
        const unit = unitPriceFromOptions(item.price_kes, selectedOptions);
        next.set(item.id, {
          menu_item_id: item.id,
          name: item.name,
          base_price: item.price_kes,
          selected_options: selectedOptions,
          allergy_notes: allergyNotes,
          line_total: unit,
          quantity: 1,
        });
      }
      return next;
    });
  }

  const handleAddPress = useCallback((item: MenuItem) => {
    const hasOptions = (item.item_option_groups ?? []).some((g) => g.item_options.length > 0);
    // If item already in cart, just increment (don't re-open sheet)
    if (cart.has(item.id)) {
      addItem(item, cart.get(item.id)!.selected_options, cart.get(item.id)!.allergy_notes);
      return;
    }
    if (hasOptions) {
      setSheetItem(item);
    } else {
      addItem(item, [], "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  const removeItem = useCallback((itemId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        next.delete(itemId);
      } else {
        const newQty = existing.quantity - 1;
        next.set(itemId, {
          ...existing,
          quantity: newQty,
          line_total: unitPriceFromOptions(existing.base_price, existing.selected_options) * newQty,
        });
      }
      return next;
    });
  }, []);

  const updateQty = useCallback((itemId: string, delta: number) => {
    if (delta > 0) {
      setCart((prev) => {
        const next = new Map(prev);
        const existing = next.get(itemId);
        if (existing) {
          const newQty = existing.quantity + delta;
          next.set(itemId, {
            ...existing,
            quantity: newQty,
            line_total: unitPriceFromOptions(existing.base_price, existing.selected_options) * newQty,
          });
        }
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
    cart.forEach((e) => { sum += e.line_total; });
    return sum;
  }, [cart]);

  /* ── Views ───────────────────────────────────────── */

  if (view === "confirmed" && confirmData) {
    return <ConfirmationScreen data={confirmData} />;
  }

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
                    quantity={cart.get(item.id)?.quantity ?? 0}
                    onAdd={() => handleAddPress(item)}
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

      {/* Option selection bottom sheet */}
      {sheetItem && (
        <OptionSheet
          item={sheetItem}
          onClose={() => setSheetItem(null)}
          onAddToCart={(opts, notes) => {
            addItem(sheetItem, opts, notes);
            setSheetItem(null);
          }}
        />
      )}
    </>
  );
}
