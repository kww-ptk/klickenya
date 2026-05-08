"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBCATEGORIES_BY_TYPE, SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";

/* ---------- Constants ---------- */

const LISTING_TYPES = [
  { value: "stay", label: "Stay" },
  { value: "experience", label: "Experience" },
  { value: "event", label: "Event" },
  { value: "service", label: "Service" },
  { value: "real_estate", label: "Real Estate" },
];

const KENYAN_CITIES = [
  "Nairobi", "Mombasa", "Diani", "Watamu", "Malindi", "Kilifi", "Lamu",
  "Nanyuki", "Nakuru", "Kisumu", "Eldoret", "Nyeri", "Naivasha", "Amboseli",
  "Maasai Mara", "Tsavo", "Samburu", "Isiolo", "Thika", "Machakos",
];

function makeSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

/* ---------- Input components ---------- */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[#16130C] mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-[#9C9485]">{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = "text", disabled, className = "",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; disabled?: boolean; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white disabled:bg-[#F7F5F2] disabled:cursor-not-allowed ${className}`}
    />
  );
}

function Select({
  value, onChange, children, disabled,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white disabled:bg-[#F7F5F2] disabled:cursor-not-allowed"
    >
      {children}
    </select>
  );
}

/* ---------- Page ---------- */

export default function AdminNewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "stay",
    subcategory: "",
    city: "",
    status: "draft" as "draft" | "published",
    description: "",
    website: "",
    instagram: "",
    facebook: "",
    phone: "",
    email: "",
    notificationEmail: "",
    hostEmail: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /* Auto-generate slug from title */
  useEffect(() => {
    if (!slugManuallyEdited) {
      set("slug", makeSlug(form.title));
    }
  }, [form.title, slugManuallyEdited]);

  /* Reset subcategory when type changes */
  useEffect(() => {
    set("subcategory", "");
  }, [form.type]);

  const subcats = SUBCATEGORIES_BY_TYPE[form.type] ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          type: form.type,
          subcategory: form.subcategory || undefined,
          city: form.city,
          status: form.status,
          description: form.description || undefined,
          website: form.website || undefined,
          instagram: form.instagram || undefined,
          facebook: form.facebook || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          notificationEmail: form.notificationEmail || undefined,
          hostEmail: form.hostEmail || undefined,
          submissionSource: "admin",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }

      router.push(`/admin/listings?created=${encodeURIComponent(form.title)}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    form.title.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    form.type &&
    form.city;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/listings"
          className="flex items-center gap-1.5 text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to listings
        </Link>
      </div>

      <div>
        <h1 className="font-display text-[24px] font-bold text-[#16130C]">New Listing</h1>
        <p className="mt-1 text-[14px] text-[#9C9485]">
          Creates a listing directly in Sanity. You can edit all fields in Sanity Studio afterwards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Core */}
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
          <h2 className="text-[16px] font-bold text-[#16130C]">Core details</h2>

          <Field label="Title *">
            <Input
              value={form.title}
              onChange={(v) => set("title", v)}
              placeholder="e.g. Watamu Beach House"
            />
          </Field>

          <Field
            label="Slug *"
            hint="URL-safe identifier — lowercase, hyphens only. Must be unique."
          >
            <div className="relative">
              <Input
                value={form.slug}
                onChange={(v) => {
                  setSlugManuallyEdited(true);
                  set("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
                }}
                placeholder="watamu-beach-house"
                className="pr-28"
              />
              {!slugManuallyEdited && form.title && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9C9485] pointer-events-none">
                  auto
                </span>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Type *">
              <Select value={form.type} onChange={(v) => set("type", v)}>
                {LISTING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Subcategory">
              <Select
                value={form.subcategory}
                onChange={(v) => set("subcategory", v)}
                disabled={subcats.length === 0}
              >
                <option value="">— none —</option>
                {subcats.map((s) => (
                  <option key={s} value={s}>{SUBCATEGORY_LABELS[s] ?? s}</option>
                ))}
              </Select>
            </Field>

            <Field label="City *">
              <Select value={form.city} onChange={(v) => set("city", v)}>
                <option value="">Select city…</option>
                {KENYAN_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="other">Other</option>
              </Select>
            </Field>

            <Field label="Status *">
              <Select value={form.status} onChange={(v) => set("status", v as "draft" | "published")}>
                <option value="draft">Draft (not publicly visible)</option>
                <option value="published">Published (live immediately)</option>
              </Select>
            </Field>
          </div>

          <Field label="Description" hint="Written in Sanity as Portable Text. Plain text here, can be formatted in Studio.">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the listing in 80–300 words…"
              rows={5}
              className="w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white resize-none"
            />
          </Field>
        </div>

        {/* Contact & Social */}
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
          <h2 className="text-[16px] font-bold text-[#16130C]">Contact & social</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Website">
              <Input value={form.website} onChange={(v) => set("website", v)} placeholder="https://…" type="url" />
            </Field>
            <Field label="Instagram handle" hint="Without @">
              <Input value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="yourbusiness" />
            </Field>
            <Field label="Facebook URL">
              <Input value={form.facebook} onChange={(v) => set("facebook", v)} placeholder="https://facebook.com/…" type="url" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(v) => set("phone", v)} placeholder="+254 7XX XXX XXX" type="tel" />
            </Field>
            <Field label="Business email">
              <Input value={form.email} onChange={(v) => set("email", v)} placeholder="hello@business.com" type="email" />
            </Field>
            <Field label="Notification email" hint="Receives enquiry alerts. Defaults to business email.">
              <Input value={form.notificationEmail} onChange={(v) => set("notificationEmail", v)} placeholder="owner@business.com" type="email" />
            </Field>
          </div>
        </div>

        {/* Host assignment */}
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
          <div>
            <h2 className="text-[16px] font-bold text-[#16130C]">Host assignment</h2>
            <p className="text-[13px] text-[#9C9485] mt-0.5">
              Optional. If a host with this email exists, the listing will be linked to their Sanity host document.
            </p>
          </div>
          <Field label="Host email">
            <Input
              value={form.hostEmail}
              onChange={(v) => set("hostEmail", v)}
              placeholder="host@example.com"
              type="email"
            />
          </Field>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-600">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pb-8">
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="flex-1 sm:flex-none sm:px-8 py-3 bg-[#E8A020] hover:bg-[#D4901C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[14px] rounded-xl transition-colors"
          >
            {loading ? "Creating…" : "Create listing"}
          </button>
          <Link
            href="/admin/listings"
            className="px-6 py-3 text-[14px] font-semibold text-[#5E5848] hover:text-[#16130C] transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
