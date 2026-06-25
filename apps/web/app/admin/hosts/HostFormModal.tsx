"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

const INPUT_CLASS =
  "w-full px-4 py-2.5 text-[16px] rounded-xl border border-border bg-canvas text-dark outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-text3 uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

interface HostFormModalProps {
  mode: "create" | "edit";
  hostId?: string;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  triggerLabel: string;
  triggerClassName: string;
}

export function HostFormModal({
  mode,
  hostId,
  initialName = "",
  initialEmail = "",
  initialPhone = "",
  triggerLabel,
  triggerClassName,
}: HostFormModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordValid =
    mode === "edit"
      ? password === "" || password.length >= 8
      : password.length >= 8;
  const canSubmit =
    !!name.trim() && !!email.trim() && passwordValid && !loading;

  function reset() {
    setName(initialName);
    setEmail(initialEmail);
    setPhone(initialPhone);
    setPassword("");
    setError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const url =
        mode === "create"
          ? "/api/admin/hosts/create"
          : `/api/admin/hosts/${hostId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      };
      if (mode === "create" || password) body.password = password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        if (mode === "create") reset();
        else setPassword("");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-[20px] font-bold text-dark mb-4">
              {mode === "create" ? "Create New Host" : "Edit Host"}
            </h2>

            <div className="space-y-3">
              <Field label="Name *">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Email *">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="email@example.com"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="+254..."
                />
              </Field>
              <Field label={mode === "create" ? "Password *" : "New Password"}>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={
                    mode === "create"
                      ? "Min 8 characters"
                      : "Leave blank to keep current"
                  }
                />
                {password !== "" && password.length < 8 && (
                  <p className="mt-1 text-[12px] text-red-500">
                    At least 8 characters.
                  </p>
                )}
              </Field>
            </div>

            {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}
            {success && (
              <p className="mt-3 text-[13px] text-[#22C55E] font-medium">
                {mode === "create"
                  ? "Host created! Welcome email sent."
                  : "Host updated."}
              </p>
            )}

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : mode === "create"
                    ? "Create Host"
                    : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
