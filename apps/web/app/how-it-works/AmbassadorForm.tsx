"use client";

import { useState } from "react";

const ROLES = [
  { value: "content_creator", label: "Content Creator" },
  { value: "local_guide", label: "Local Guide" },
  { value: "influencer", label: "Influencer" },
  { value: "community_champion", label: "Community Champion" },
];

export function AmbassadorForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    socialHandle: "",
    role: "",
    city: "",
    message: "",
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
      const res = await fetch("/api/ambassador-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          socialHandle: form.socialHandle || undefined,
          role: form.role,
          city: form.city || undefined,
          message: form.message || undefined,
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
      <div className="rounded-[24px] border border-amber/20 bg-amber/5 p-8 md:p-10 text-center">
        <p className="text-[32px] mb-4">&#127881;</p>
        <h3 className="text-[20px] font-semibold text-zinc-900 mb-2">
          Thanks for applying!
        </h3>
        <p className="text-[14px] text-zinc-500">
          We&apos;ll review your application and get back to you within 48 hours.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] border border-amber/20 bg-white p-8 md:p-10 shadow-sm"
    >
      <h3 className="text-[20px] font-semibold text-zinc-900 mb-6 text-center">
        Apply to become an ambassador
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Name */}
        <div>
          <label className="block text-[13px] text-zinc-500 font-medium mb-1.5">
            Name <span className="text-amber">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
            placeholder="Your name"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[13px] text-zinc-500 font-medium mb-1.5">
            Email <span className="text-amber">*</span>
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        {/* Social handle */}
        <div>
          <label className="block text-[13px] text-zinc-500 font-medium mb-1.5">
            Instagram / social handle
          </label>
          <input
            type="text"
            value={form.socialHandle}
            onChange={(e) => update("socialHandle", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
            placeholder="@yourhandle"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-[13px] text-zinc-500 font-medium mb-1.5">
            Role interest <span className="text-amber">*</span>
          </label>
          <select
            required
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors appearance-none"
          >
            <option value="" disabled>
              Select a role...
            </option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* City */}
      <div className="mb-4">
        <label className="block text-[13px] text-zinc-500 font-medium mb-1.5">
          City / area
        </label>
        <input
          type="text"
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
          placeholder="e.g. Watamu, Nairobi, Diani Beach"
        />
      </div>

      {/* Message */}
      <div className="mb-6">
        <label className="block text-[13px] text-zinc-500 font-medium mb-1.5">
          Why do you want to be an ambassador?
        </label>
        <textarea
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          maxLength={300}
          rows={3}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors resize-none"
          placeholder="Tell us a bit about yourself and why you'd be a great ambassador..."
        />
        <p className="text-[12px] text-zinc-400 mt-1 text-right">
          {form.message.length}/300
        </p>
      </div>

      {status === "error" && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
          <p className="text-[13px] text-red-500">{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-amber text-zinc-950 font-semibold text-[15px] shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
      >
        {status === "loading" ? "Submitting..." : "Apply now"}
      </button>
    </form>
  );
}
