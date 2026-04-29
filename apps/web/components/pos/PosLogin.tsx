"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
import { posFetch } from "./_shell/posFetch";

interface PosLoginProps {
  slug:     string;
  menuId:   string;
  menuName: string;
  /**
   * Where to send the staff member after a successful PIN sign-in.
   * Defaults to the waiter tables grid; the kitchen entry overrides this
   * to land on /kitchen/[slug]/orders. Layouts on the destination route
   * enforce role match (e.g. a kitchen-role staff signing in here gets
   * redirected to /kitchen/[slug] by the destination layout).
   */
  redirectTo?: string;
  /** Override the "POS Terminal" label above the restaurant name. */
  contextLabel?: string;
}

const PIN_LEN = 4;

export function PosLogin({ slug, menuId, menuName, redirectTo, contextLabel }: PosLoginProps) {
  const destination = redirectTo ?? `/pos/${slug}/tables`;
  const label = contextLabel ?? "POS Terminal";
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const submittedFor = useRef<string | null>(null);

  const submit = useCallback(
    async (value: string) => {
      if (submittedFor.current === value) return;
      submittedFor.current = value;
      setSubmitting(true);
      setError(null);
      try {
        const res = await posFetch("/api/pos/auth", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ menu_id: menuId, pin: value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Invalid PIN");
          setShake(true);
          setTimeout(() => setShake(false), 400);
          setPin("");
          submittedFor.current = null;
          return;
        }
        router.replace(destination);
        router.refresh();
      } catch {
        setError("Network error. Try again.");
        setPin("");
        submittedFor.current = null;
      } finally {
        setSubmitting(false);
      }
    },
    [menuId, router, destination],
  );

  useEffect(() => {
    if (pin.length === PIN_LEN) {
      submit(pin);
    }
  }, [pin, submit]);

  const press = (digit: string) => {
    if (submitting) return;
    setError(null);
    setPin((p) => (p.length >= PIN_LEN ? p : p + digit));
  };
  const backspace = () => {
    if (submitting) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
    submittedFor.current = null;
  };
  const clear = () => {
    if (submitting) return;
    setError(null);
    setPin("");
    submittedFor.current = null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div
        className={`w-full max-w-[420px] rounded-3xl bg-[#1A170F] border border-[#2A2520] shadow-2xl px-6 py-8 sm:px-8 sm:py-10 transition-transform ${
          shake ? "animate-pos-shake" : ""
        }`}
      >
        {/* Restaurant identity */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#E8A020] text-[#16130C] grid place-items-center text-[22px] font-bold mb-3">
            {menuName.slice(0, 1).toUpperCase()}
          </div>
          <p className="text-[12px] uppercase tracking-[0.18em] text-[#9C9485]">{label}</p>
          <h1 className="mt-1 text-[22px] font-bold text-white truncate">{menuName}</h1>
          <p className="text-[12px] text-[#9C9485] mt-2">Enter your 4-digit staff PIN</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-3">
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border ${
                i < pin.length
                  ? "bg-[#E8A020] border-[#E8A020]"
                  : "bg-transparent border-[#3A342B]"
              }`}
            />
          ))}
        </div>

        {/* Error / status */}
        <div className="h-6 text-center text-[12px] mb-3">
          {error ? (
            <span className="text-[#FF8A6B] font-semibold">{error}</span>
          ) : submitting ? (
            <span className="text-[#9C9485]">Signing in…</span>
          ) : null}
        </div>

        {/* PIN pad */}
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <PinKey key={d} onClick={() => press(d)} disabled={submitting}>
              {d}
            </PinKey>
          ))}
          <PinKey onClick={clear} disabled={submitting} variant="muted">
            <span className="text-[12px] font-semibold tracking-wide">CLEAR</span>
          </PinKey>
          <PinKey onClick={() => press("0")} disabled={submitting}>
            0
          </PinKey>
          <PinKey onClick={backspace} disabled={submitting} variant="muted">
            <Delete className="w-6 h-6" />
          </PinKey>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pos-shake {
          0%, 100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        .animate-pos-shake { animation: pos-shake 0.4s ease-out; }
      `}</style>
    </div>
  );
}

interface PinKeyProps {
  onClick:  () => void;
  disabled: boolean;
  variant?: "primary" | "muted";
  children: React.ReactNode;
}

function PinKey({ onClick, disabled, variant = "primary", children }: PinKeyProps) {
  const base =
    "h-[68px] rounded-2xl text-[26px] font-semibold transition-colors active:scale-[0.97] disabled:opacity-40 grid place-items-center";
  const cls =
    variant === "muted"
      ? `${base} bg-[#2A2520] text-[#9C9485] hover:bg-[#3A342B]`
      : `${base} bg-[#252019] text-white hover:bg-[#3A342B]`;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
