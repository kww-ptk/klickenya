"use client";

import { useState } from "react";
import { Delete } from "lucide-react";

/**
 * Modal that asks for a manager's PIN + an optional reason before performing
 * a restricted action (large discount, void after kitchen send, void on
 * billed/paid session). Caller wires the resolved { pin, reason } into the
 * follow-up API call so the server can validate + log the audit row.
 *
 * The modal does NOT validate the PIN itself — it just collects it. The
 * server is the source of truth and rejects invalid PINs with 403; the
 * caller flows that error back into the UI.
 */

interface ManagerOverridePromptProps {
  title:    string;     // e.g. "Discount above 10%"
  message?: string;     // e.g. "Discounts above the threshold need a manager."
  /** When true, the reason field is required (void session/void order). */
  reasonRequired?: boolean;
  reasonPlaceholder?: string;
  onCancel:  () => void;
  onConfirm: (args: { pin: string; reason: string | null }) => void;
}

const PIN_LEN = 4;

/**
 * The parent should mount this component only when the override is active
 * (e.g. {pending && <ManagerOverridePrompt ... />}). State resets cleanly
 * each time it mounts — no useEffect-driven reset required.
 */
export function ManagerOverridePrompt({
  title,
  message,
  reasonRequired = false,
  reasonPlaceholder = "Reason (e.g. wrong order, customer complaint)",
  onCancel,
  onConfirm,
}: ManagerOverridePromptProps) {
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");

  const reasonOk = reasonRequired ? reason.trim().length > 0 : true;
  const canConfirm = pin.length === PIN_LEN && reasonOk;

  const press = (digit: string) => {
    setPin((p) => (p.length >= PIN_LEN ? p : p + digit));
  };
  const backspace = () => setPin((p) => p.slice(0, -1));
  const clear = () => setPin("");

  const submit = () => {
    if (!canConfirm) return;
    onConfirm({ pin, reason: reason.trim() || null });
  };

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
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber font-bold">Manager required</p>
          <h2 className="mt-1 text-[18px] font-bold text-white">{title}</h2>
          {message && (
            <p className="mt-1 text-[12px] text-text3 leading-snug">{message}</p>
          )}
        </div>

        {/* Reason input */}
        <label className="block">
          <span className="block text-[11px] text-text3 mb-1">
            Reason {reasonRequired && <span className="text-[#FF8A6B]">*</span>}
          </span>
          <input
            type="text"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            className="w-full h-11 rounded-lg bg-[#252019] border border-[#2A2520] text-white text-[13px] px-3"
          />
        </label>

        {/* PIN dots */}
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

        {/* PIN pad */}
        <div className="grid grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <PinKey key={d} onClick={() => press(d)}>
              {d}
            </PinKey>
          ))}
          <PinKey onClick={clear} variant="muted">
            <span className="text-[11px] font-semibold tracking-wide">CLEAR</span>
          </PinKey>
          <PinKey onClick={() => press("0")}>0</PinKey>
          <PinKey onClick={backspace} variant="muted">
            <Delete className="w-5 h-5" />
          </PinKey>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 pt-1">
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
