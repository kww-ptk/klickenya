"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────── */

interface PropertyEnquiryFormProps {
  propertyId: string;
  propertyTitle: string;
  price?: number;
  priceType?: string;
  agentName?: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  enquiryType: string;
  message: string;
  mortgageInterest: boolean;
}

type Status = "idle" | "loading" | "success" | "error";

const inputCls =
  "w-full border-[1.5px] border-border rounded-[10px] px-3.5 py-3 text-[14px] text-text bg-white outline-none focus:border-purple2 transition-colors placeholder:text-text3";

/* ─── Component ──────────────────────────────────── */

function PropertyEnquiryForm({
  propertyId,
  propertyTitle,
  price,
  priceType,
  agentName,
}: PropertyEnquiryFormProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    enquiryType: "I want more information",
    message: "",
    mortgageInterest: false,
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/real-estate/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          propertyTitle,
          name: form.name,
          email: form.email,
          phone: form.phone,
          enquiryType: form.enquiryType,
          message: form.message || undefined,
          mortgageInterest: form.mortgageInterest,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send enquiry");
      }

      setStatus("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  /* ─── Success state ──────────────────────────── */
  if (status === "success") {
    return (
      <div className="text-center py-6">
        <div className="size-12 rounded-full bg-[#22C55E]/15 flex items-center justify-center mx-auto mb-3">
          <svg className="size-6 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4 className="text-[16px] font-bold text-text mb-1">Enquiry sent!</h4>
        <p className="text-[13px] text-text2 leading-[1.5] max-w-[240px] mx-auto">
          {agentName ? `${agentName} will` : "The agent will"} get back to you within 2 hours. Check your email for confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {/* ─── Heading ─────────────────────────────── */}
      <h3 className="font-display text-[18px] font-bold text-text tracking-[-0.02em]">
        Enquire about this property
      </h3>

      {/* ─── Price display ───────────────────────── */}
      {price != null && (
        <div className="flex items-baseline gap-1.5 -mt-1 mb-1">
          <span className="font-display text-[24px] font-extrabold tracking-[-0.02em] text-dark">
            KSh {price.toLocaleString()}
          </span>
          {priceType === "per-month" && (
            <span className="text-[14px] text-text2">/ month</span>
          )}
        </div>
      )}

      {/* ─── Contact fields ──────────────────────── */}
      <input
        type="text"
        placeholder="Full name"
        className={inputCls}
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email address"
        className={inputCls}
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
        required
      />
      <input
        type="tel"
        placeholder="Phone (07XX XXX XXX or +254...)"
        className={inputCls}
        value={form.phone}
        onChange={(e) => update("phone", e.target.value)}
        required
      />

      {/* ─── Enquiry type ────────────────────────── */}
      <select
        value={form.enquiryType}
        onChange={(e) => update("enquiryType", e.target.value)}
        className={inputCls}
      >
        <option>I want to buy</option>
        <option>I want to rent</option>
        <option>I want to arrange a viewing</option>
        <option>I want more information</option>
      </select>

      {/* ─── Message ─────────────────────────────── */}
      <textarea
        placeholder="Message (optional)"
        rows={3}
        className={cn(inputCls, "resize-none")}
        value={form.message}
        onChange={(e) => update("message", e.target.value)}
      />

      {/* ─── Mortgage checkbox ───────────────────── */}
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={form.mortgageInterest}
          onChange={(e) => update("mortgageInterest", e.target.checked)}
          className="mt-0.5 size-4 rounded border-border accent-purple2"
        />
        <span className="text-[13px] text-text2 leading-[1.4]">
          I&apos;m interested in mortgage options
        </span>
      </label>

      {/* ─── Submit button ───────────────────────── */}
      <button
        type="submit"
        disabled={status === "loading"}
        className={cn(
          "w-full py-3.5 rounded-[16px] text-[14.5px] font-bold transition-all duration-200",
          "bg-purple2 text-white",
          "shadow-[0_4px_14px_rgba(139,77,171,0.35)]",
          "hover:bg-[#9B5ABF] hover:-translate-y-0.5",
          "active:translate-y-0",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
      >
        {status === "loading" ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </span>
        ) : (
          "Send enquiry"
        )}
      </button>

      {/* ─── Error message ───────────────────────── */}
      {status === "error" && error && (
        <p className="text-[12px] text-[#DC2626] text-center">{error}</p>
      )}

      {/* ─── Trust signals ───────────────────────── */}
      <div className="flex items-center justify-center gap-2.5 text-[11.5px] text-text3">
        <span>&#128274; Secure</span>
        <span className="text-border">&#183;</span>
        <span>&#128241; Agent replies within 2hrs</span>
        <span className="text-border">&#183;</span>
        <span>&#10003; Free to enquire</span>
      </div>
    </form>
  );
}

export { PropertyEnquiryForm };
export type { PropertyEnquiryFormProps };
