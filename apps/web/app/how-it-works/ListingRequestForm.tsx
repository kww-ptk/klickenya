"use client";

import { useState } from "react";

const LISTING_TYPES = [
  "Stay",
  "Experience",
  "Restaurant",
  "Event",
  "Rental",
  "Service",
  "Real Estate",
];

export function ListingRequestForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    listingType: "",
    location: "",
    description: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/listing-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          listingType: form.listingType,
          location: form.location || undefined,
          description: form.description || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-8 md:p-10 text-center">
        <p className="text-[32px] mb-4">&#127881;</p>
        <h3 className="text-[20px] font-semibold text-white mb-2">
          Thanks! We&apos;ll be in touch within 24 hours
        </h3>
        <p className="text-[14px] text-white/50">
          We personally review every submission. Check your email for a
          confirmation.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-8 md:p-10"
    >
      <h3 className="text-[20px] font-semibold text-white mb-6 text-center">
        Submit listing request
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Name */}
        <div>
          <label className="block text-[13px] text-white/60 font-medium mb-1.5">
            Name <span className="text-amber">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
            placeholder="Your name"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[13px] text-white/60 font-medium mb-1.5">
            Email <span className="text-amber">*</span>
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[13px] text-white/60 font-medium mb-1.5">
            Phone <span className="text-amber">*</span>
          </label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
            placeholder="+254..."
          />
        </div>

        {/* Listing type */}
        <div>
          <label className="block text-[13px] text-white/60 font-medium mb-1.5">
            Listing type <span className="text-amber">*</span>
          </label>
          <select
            required
            value={form.listingType}
            onChange={(e) => update("listingType", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] text-white focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors appearance-none"
          >
            <option value="" disabled className="bg-zinc-900">
              Select type...
            </option>
            {LISTING_TYPES.map((t) => (
              <option key={t} value={t} className="bg-zinc-900">
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="mb-4">
        <label className="block text-[13px] text-white/60 font-medium mb-1.5">
          Location / city
        </label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
          placeholder="e.g. Watamu, Nairobi, Diani Beach"
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-[13px] text-white/60 font-medium mb-1.5">
          Brief description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          maxLength={300}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors resize-none"
          placeholder="Tell us briefly about your listing..."
        />
        <p className="text-[12px] text-white/30 mt-1 text-right">
          {form.description.length}/300
        </p>
      </div>

      {status === "error" && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
          <p className="text-[13px] text-red-400">{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-amber text-zinc-950 font-semibold text-[15px] shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
      >
        {status === "loading" ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}
