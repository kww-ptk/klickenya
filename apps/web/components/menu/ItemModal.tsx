"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import type { MenuItem, ItemOptionGroup } from "@/components/listings/detail/restaurant/MenuDisplay";

/* ── Exported types ─────────────────────────────────── */

export interface SelectedOption {
  option_id: string;
  group: string;
  choice: string;
  price_add: number; // UI only — not sent to server
}

export interface CartItem {
  cart_id: string;       // uuid per cart line — same item + different options = separate lines
  menu_item_id: string;
  item_name: string;
  base_price: number;
  selected_options: SelectedOption[];
  allergy_notes: string;
  quantity: number;
  display_total: number; // (base_price + sum(price_add)) × quantity — UI only
}

/* ── Helpers ─────────────────────────────────────────── */

function formatPrice(n: number): string {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

/* ── Allergen group — chip pills, "I contain:" framing ─ */

function AllergenGroupSection({
  group,
  selected,
  onToggle,
}: {
  group: ItemOptionGroup;
  selected: Set<string>;
  onToggle: (optionId: string) => void;
}) {
  const options = [...group.item_options].sort((a, b) => a.display_order - b.display_order);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <p className="text-[14px] font-bold text-dark">{group.name}</p>
        <span className="text-[11px] text-text3 font-medium italic">I contain:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              disabled={!opt.is_available}
              onClick={() => onToggle(opt.id)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all border disabled:opacity-40 ${
                isSelected
                  ? "bg-amber/15 border-amber text-amber"
                  : "bg-white border-border text-text2 hover:border-amber/50"
              }`}
            >
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Choice group — radio or checkbox rows ─────────── */

function ChoiceGroupSection({
  group,
  singleSelected,
  multiSelected,
  onSingleChange,
  onMultiToggle,
}: {
  group: ItemOptionGroup;
  singleSelected: string | null;
  multiSelected: Set<string>;
  onSingleChange: (optId: string) => void;
  onMultiToggle: (optId: string) => void;
}) {
  const options = [...group.item_options].sort((a, b) => a.display_order - b.display_order);
  const isRadio = group.group_type === "single";

  const subtitle = isRadio
    ? group.is_required
      ? "Required · Choose one"
      : "Optional · Choose one"
    : group.max_select
    ? `Choose up to ${group.max_select}`
    : "Select all that apply";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <p className="text-[14px] font-bold text-dark">{group.name}</p>
        <span
          className={`text-[11px] font-medium ${
            group.is_required ? "text-amber font-bold" : "text-text3"
          }`}
        >
          {subtitle}
        </span>
      </div>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const isChecked = isRadio ? singleSelected === opt.id : multiSelected.has(opt.id);
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
                    {isRadio ? (
                      <circle cx="5" cy="5" r="2.5" fill="currentColor" />
                    ) : (
                      <path
                        d="M1.5 5l2.5 2.5 4.5-4.5"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
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

/* ── ItemModal ───────────────────────────────────────── */

interface ItemModalProps {
  item: MenuItem;
  existingCartItem?: CartItem; // if provided: "Update cart" mode
  onClose: () => void;
  onConfirm: (cartItem: CartItem) => void;
}

export function ItemModal({ item, existingCartItem, onClose, onConfirm }: ItemModalProps) {
  const groups = useMemo(
    () =>
      [...(item.item_option_groups ?? [])]
        .filter((g) => g.item_options.some((o) => o.is_available))
        .sort((a, b) => a.display_order - b.display_order),
    [item]
  );

  /* ── Initial state ── */

  const [singleSelections, setSingleSelections] = useState<Record<string, string>>(() => {
    if (existingCartItem) {
      const init: Record<string, string> = {};
      for (const g of groups) {
        if (g.group_type === "single") {
          const match = existingCartItem.selected_options.find((o) =>
            g.item_options.some((opt) => opt.id === o.option_id)
          );
          if (match) init[g.id] = match.option_id;
        }
      }
      return init;
    }
    // Auto-select first available option for required single groups
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

  const [multiSelections, setMultiSelections] = useState<Record<string, Set<string>>>(() => {
    if (existingCartItem) {
      const init: Record<string, Set<string>> = {};
      for (const g of groups) {
        if (g.group_type !== "single") {
          const matched = new Set<string>(
            existingCartItem.selected_options
              .filter((o) => g.item_options.some((opt) => opt.id === o.option_id))
              .map((o) => o.option_id)
          );
          if (matched.size > 0) init[g.id] = matched;
        }
      }
      return init;
    }
    return {};
  });

  const [specialInstructions, setSpecialInstructions] = useState(
    existingCartItem?.allergy_notes ?? ""
  );
  const [quantity, setQuantity] = useState(existingCartItem?.quantity ?? 1);
  const [shakeGroupId, setShakeGroupId] = useState<string | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* ── Live total ── */

  const optionExtra = useMemo(() => {
    let total = 0;
    for (const g of groups) {
      if (g.group_type === "single") {
        const opt = g.item_options.find((o) => o.id === singleSelections[g.id]);
        if (opt) total += opt.price_modifier;
      } else if (g.group_type === "multi") {
        for (const optId of multiSelections[g.id] ?? new Set()) {
          const opt = g.item_options.find((o) => o.id === optId);
          if (opt) total += opt.price_modifier;
        }
      }
      // allergy groups don't add price
    }
    return total;
  }, [groups, singleSelections, multiSelections]);

  const displayTotal = (item.price_kes + optionExtra) * quantity;

  /* ── Validation ── */

  function findFirstInvalid(): ItemOptionGroup | null {
    for (const g of groups) {
      if (g.group_type === "single" && g.is_required && !singleSelections[g.id]) return g;
      if (g.group_type === "multi" && g.min_select > 0) {
        if ((multiSelections[g.id] ?? new Set()).size < g.min_select) return g;
      }
    }
    return null;
  }

  const isValid = findFirstInvalid() === null;

  /* ── Actions ── */

  function toggleMulti(groupId: string, optId: string) {
    setMultiSelections((prev) => {
      const set = new Set(prev[groupId] ?? []);
      if (set.has(optId)) set.delete(optId);
      else set.add(optId);
      return { ...prev, [groupId]: set };
    });
  }

  function handleConfirm() {
    const invalid = findFirstInvalid();
    if (invalid) {
      setShakeGroupId(invalid.id);
      setTimeout(() => setShakeGroupId(null), 500);
      groupRefs.current[invalid.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const resolved: SelectedOption[] = [];
    for (const g of groups) {
      if (g.group_type === "single") {
        const selId = singleSelections[g.id];
        if (selId) {
          const opt = g.item_options.find((o) => o.id === selId);
          if (opt)
            resolved.push({ option_id: opt.id, group: g.name, choice: opt.name, price_add: opt.price_modifier });
        }
      } else if (g.group_type === "multi") {
        for (const optId of multiSelections[g.id] ?? new Set()) {
          const opt = g.item_options.find((o) => o.id === optId);
          if (opt)
            resolved.push({ option_id: opt.id, group: g.name, choice: opt.name, price_add: opt.price_modifier });
        }
      } else if (g.group_type === "allergy") {
        for (const optId of multiSelections[g.id] ?? new Set()) {
          const opt = g.item_options.find((o) => o.id === optId);
          if (opt)
            resolved.push({ option_id: opt.id, group: g.name, choice: opt.name, price_add: 0 });
        }
      }
    }

    onConfirm({
      cart_id: existingCartItem?.cart_id ?? crypto.randomUUID(),
      menu_item_id: item.id,
      item_name: item.name,
      base_price: item.price_kes,
      selected_options: resolved,
      allergy_notes: specialInstructions.trim(),
      quantity,
      display_total: displayTotal,
    });
  }

  const isUpdate = !!existingCartItem;

  /* ── Render ── */

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      {/*
        Mobile: full-width bottom sheet, slides up
        Desktop (md+): centred modal, fades+scales in
        NOTE: the desktop variant uses absolute positioning via CSS class,
        not the Tailwind translate shorthand, because the animation keyframe
        already incorporates the -50% translate.
      */}
      <div
        role="dialog"
        aria-modal
        aria-label={item.name}
        className="item-modal fixed z-50 bg-white flex flex-col shadow-2xl
          bottom-0 left-0 right-0 max-h-[92vh] rounded-t-2xl animate-slide-up
          md:bottom-auto md:top-1/2 md:left-1/2 md:w-[520px] md:max-h-[88vh]
          md:rounded-2xl md:animate-fade-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo */}
        {item.photo_url && (
          <div className="relative w-full h-[200px] md:h-[240px] shrink-0">
            <Image
              src={item.photo_url}
              alt={item.name}
              fill
              className="object-cover rounded-t-2xl"
              sizes="(min-width: 768px) 520px, 100vw"
              priority
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 size-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              aria-label="Close"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* Item header */}
          <div className="px-5 pt-5 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-[20px] font-extrabold text-dark leading-tight tracking-[-0.02em]">
                {item.name}
              </h2>
              {item.description && (
                <p className="text-[14px] text-text2 mt-1.5 leading-relaxed">{item.description}</p>
              )}
              <p className="text-[16px] font-bold text-amber mt-2">{formatPrice(item.price_kes)}</p>
            </div>
            {/* Close button when there's no photo */}
            {!item.photo_url && (
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 text-text3 hover:text-dark transition-colors mt-0.5"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Option groups */}
          {groups.length > 0 && (
            <div className="px-5 mt-5 space-y-6">
              {groups.map((group) => (
                <div
                  key={group.id}
                  ref={(el) => {
                    groupRefs.current[group.id] = el;
                  }}
                  className={shakeGroupId === group.id ? "animate-shake" : ""}
                >
                  {group.group_type === "allergy" ? (
                    <AllergenGroupSection
                      group={group}
                      selected={multiSelections[group.id] ?? new Set()}
                      onToggle={(optId) => toggleMulti(group.id, optId)}
                    />
                  ) : (
                    <ChoiceGroupSection
                      group={group}
                      singleSelected={singleSelections[group.id] ?? null}
                      multiSelected={multiSelections[group.id] ?? new Set()}
                      onSingleChange={(optId) =>
                        setSingleSelections((p) => ({ ...p, [group.id]: optId }))
                      }
                      onMultiToggle={(optId) => toggleMulti(group.id, optId)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Special instructions */}
          <div className="px-5 mt-5 pb-6">
            <label className="block text-[12px] font-bold text-dark mb-1.5 uppercase tracking-wide">
              Special instructions{" "}
              <span className="text-text3 font-normal normal-case">(optional)</span>
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))}
                placeholder="e.g. No onions, extra sauce…"
                className="w-full border border-border rounded-xl px-3.5 py-3 text-[14px] text-dark placeholder:text-text3 focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 resize-none bg-white transition-colors"
              />
              <span
                className={`absolute bottom-3 right-3 text-[11px] pointer-events-none ${
                  specialInstructions.length >= 180 ? "text-amber" : "text-text3"
                }`}
              >
                {specialInstructions.length}/200
              </span>
            </div>
          </div>
        </div>

        {/* Sticky footer: qty selector + CTA */}
        <div className="shrink-0 px-5 py-4 border-t border-border bg-white">
          <div className="flex items-center gap-3">
            {/* Quantity */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="size-[36px] rounded-full bg-[#F4F1EC] text-dark text-[20px] font-bold flex items-center justify-center hover:bg-[#E2DDD5] transition-colors active:scale-95 disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="text-[16px] font-bold text-dark w-[26px] text-center tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                disabled={quantity >= 20}
                className="size-[36px] rounded-full bg-amber text-dark text-[20px] font-bold flex items-center justify-center hover:bg-[#d4911c] transition-colors active:scale-95 disabled:opacity-30"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            {/* Add / Update CTA */}
            <button
              onClick={handleConfirm}
              className={`flex-1 h-[48px] rounded-full font-bold text-[15px] transition-all active:scale-[0.98] ${
                isValid
                  ? "bg-dark text-white hover:bg-[#2A2520]"
                  : "bg-white text-red-500 border-2 border-red-300 cursor-not-allowed"
              }`}
            >
              {isUpdate
                ? `Update cart · ${formatPrice(displayTotal)}`
                : `Add to cart · ${formatPrice(displayTotal)}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
