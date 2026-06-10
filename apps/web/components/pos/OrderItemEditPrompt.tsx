"use client";

import { useState } from "react";
import { Delete, Minus, Plus, Trash2 } from "lucide-react";

/**
 * Edit-quantity-or-remove modal for a sent order item. Built specifically
 * for this flow — separate from ManagerOverridePrompt because the quantity
 * stepper is integral to the action, not an after-thought.
 *
 * Common case: customer ordered 3 pizzas, only wants 2 → reduce to 2.
 * Edge case: full removal → tap "Remove entirely" → quantity goes to 0
 * which the API treats as a void.
 *
 * Either way: reason is required and a manager PIN unlocks the action
 * (the server bypasses the PIN check when the acting staff is already a
 * manager — the modal still asks because we don't know the role here).
 */

interface OrderItemEditPromptProps {
  itemName:         string;
  currentQuantity:  number;
  onCancel:         () => void;
  onConfirm:        (args: { newQuantity: number; pin: string; reason: string }) => void;
}

const PIN_LEN = 4;

export function OrderItemEditPrompt({
  itemName,
  currentQuantity,
  onCancel,
  onConfirm,
}: OrderItemEditPromptProps) {
  const [quantity, setQuantity] = useState(Math.max(0, currentQuantity - 1));
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");

  const reasonOk = reason.trim().length > 0;
  const quantityOk = quantity >= 0 && quantity < currentQuantity;
  const canConfirm = pin.length === PIN_LEN && reasonOk && quantityOk;

  const inc = () => setQuantity((q) => Math.min(currentQuantity - 1, q + 1));
  const dec = () => setQuantity((q) => Math.max(0, q - 1));
  const removeAll = () => setQuantity(0);

  const press = (digit: string) =>
    setPin((p) => (p.length >= PIN_LEN ? p : p + digit));
  const backspace = () => setPin((p) => p.slice(0, -1));
  const clearPin = () => setPin("");

  const submit = () => {
    if (!canConfirm) return;
    onConfirm({ newQuantity: quantity, pin, reason: reason.trim() });
  };

  const removed = currentQuantity - quantity;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 grid place-items-center px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[#1A170F] border border-[#2A2520] p-5 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber font-bold">
            Edit · Manager required
          </p>
          <h2 className="mt-1 text-[18px] font-bold text-white">{itemName}</h2>
          <p className="mt-1 text-[12px] text-text3">
            Currently {currentQuantity} on the bill. Reduce or remove entirely.
          </p>
        </div>

        {/* Quantity stepper */}
        <div className="rounded-2xl border border-[#2A2520] bg-[#0F0D08] p-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={dec}
              disabled={quantity <= 0}
              className="w-12 h-12 rounded-full bg-[#252019] text-white grid place-items-center disabled:opacity-30"
              aria-label="Decrease"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-[36px] font-bold text-white tabular-nums leading-none">{quantity}</p>
              <p className="text-[10px] text-text3 uppercase tracking-wide mt-1">
                new quantity
              </p>
            </div>
            <button
              type="button"
              onClick={inc}
              disabled={quantity >= currentQuantity - 1}
              className="w-12 h-12 rounded-full bg-[#252019] text-white grid place-items-center disabled:opacity-30"
              aria-label="Increase"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={removeAll}
            disabled={quantity === 0}
            className="mt-3 w-full h-10 rounded-full bg-[#3A1F1F] text-[#FF8A6B] text-[12px] font-bold disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Remove entirely
          </button>
          {removed > 0 && (
            <p className="mt-3 text-center text-[11px] text-amber">
              Removing {removed} of {currentQuantity}
            </p>
          )}
        </div>

        {/* Reason */}
        <label className="block">
          <span className="block text-[11px] text-text3 mb-1">
            Reason <span className="text-[#FF8A6B]">*</span>
          </span>
          <input
            type="text"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Wrong order, customer changed mind, etc."
            className="w-full h-11 rounded-lg bg-[#252019] border border-[#2A2520] text-white text-[13px] px-3"
          />
        </label>

        {/* PIN dots */}
        <div>
          <p className="text-[11px] text-text3 mb-2 text-center">Manager PIN</p>
          <div className="flex justify-center gap-3">
            {Array.from({ length: PIN_LEN }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full border ${
                  i < pin.length
                    ? "bg-amber border-amber"
                    : "bg-transparent border-[#3A342B]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* PIN pad */}
        <div className="grid grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <PinKey key={d} onClick={() => press(d)}>
              {d}
            </PinKey>
          ))}
          <PinKey onClick={clearPin} variant="muted">
            <span className="text-[11px] font-semibold tracking-wide">CLEAR</span>
          </PinKey>
          <PinKey onClick={() => press("0")}>0</PinKey>
          <PinKey onClick={backspace} variant="muted">
            <Delete className="w-5 h-5" />
          </PinKey>
        </div>

        {/* Footer */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-full bg-[#252019] text-surface text-[13px] font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canConfirm}
            className="flex-1 h-11 rounded-full bg-amber text-dark text-[13px] font-bold disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

interface PinKeyProps {
  onClick:  () => void;
  variant?: "primary" | "muted";
  children: React.ReactNode;
}

function PinKey({ onClick, variant = "primary", children }: PinKeyProps) {
  const base =
    "h-12 rounded-xl text-[20px] font-semibold transition-colors active:scale-[0.97] grid place-items-center";
  const cls =
    variant === "muted"
      ? `${base} bg-[#2A2520] text-text3`
      : `${base} bg-[#252019] text-white`;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
