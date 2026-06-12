"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBCATEGORIES_BY_TYPE, SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";
import {
  KENYAN_COUNTIES,
  AMENITIES,
  TAG_SUGGESTIONS,
  TAG_SUGGESTIONS_BY_TYPE,
  DEFAULT_PRICE_UNIT_BY_TYPE,
} from "@/lib/constants/listing";
import { ImageUploader, UploadedImage } from "@/components/shared/ImageUploader";

/* ---------- Constants ---------- */

const LISTING_TYPES = [
  { value: "stay", label: "Stay", icon: "🏡" },
  { value: "experience", label: "Experience", icon: "🦁" },
  { value: "event", label: "Event", icon: "🎉" },
  { value: "service", label: "Service", icon: "🔧" },
  { value: "real_estate", label: "Real Estate", icon: "🏠" },
];

const KENYAN_CITIES = [
  "Nairobi", "Mombasa", "Diani", "Watamu", "Malindi", "Kilifi", "Lamu",
  "Nanyuki", "Nakuru", "Kisumu", "Eldoret", "Nyeri", "Naivasha", "Amboseli",
  "Maasai Mara", "Tsavo", "Samburu", "Isiolo", "Thika", "Machakos",
];

const PRICE_UNITS = [
  { value: "night", label: "/ night" },
  { value: "person", label: "/ person" },
  { value: "day", label: "/ day" },
  { value: "session", label: "/ session" },
  { value: "ticket", label: "/ ticket" },
  { value: "once", label: "fixed" },
];

const BOOKING_TYPES = [
  { value: "contact_form", label: "Contact Form" },
  { value: "instant", label: "Instant Book" },
  { value: "request", label: "Request to Book" },
];

const RENTING_TYPES = [
  { value: "entire_place", label: "Entire place only" },
  { value: "by_room", label: "By room only" },
  { value: "both", label: "Both — guests can choose" },
];

const CUISINE_OPTIONS = [
  "Kenyan", "Swahili", "Indian", "Chinese", "Italian", "Mediterranean",
  "BBQ", "Seafood", "Vegetarian", "Fast Food", "Japanese", "French", "Fusion", "Vegan",
];

const ATMOSPHERE_OPTIONS = [
  { value: "casual", label: "Casual" }, { value: "romantic", label: "Romantic" },
  { value: "family", label: "Family-Friendly" }, { value: "lively", label: "Lively / Vibrant" },
  { value: "fine-dining", label: "Fine Dining" }, { value: "beachfront", label: "Beachfront" },
  { value: "rooftop", label: "Rooftop" }, { value: "garden", label: "Garden" },
];

const PRICE_RANGE_OPTIONS = [
  { value: "budget", label: "$ Budget" },
  { value: "mid-range", label: "$$ Mid-Range" },
  { value: "fine-dining", label: "$$$ Fine Dining" },
];

const DURATION_OPTIONS = [
  { value: "1-hour", label: "1 hour" }, { value: "2-hours", label: "2 hours" },
  { value: "3-hours", label: "3 hours" }, { value: "half-day", label: "Half day (4–5 hrs)" },
  { value: "full-day", label: "Full day (6–8 hrs)" }, { value: "multi-day", label: "Multi-day" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy — suitable for everyone" },
  { value: "moderate", label: "Moderate — basic fitness required" },
  { value: "advanced", label: "Advanced — experience required" },
];

const LANGUAGE_OPTIONS = ["English", "Swahili", "Italian", "French", "German", "Spanish"];

const AGE_RESTRICTION_OPTIONS = [
  { value: "all-ages", label: "All Ages" }, { value: "18+", label: "18+" }, { value: "21+", label: "21+" },
];

const RESPONSE_TIME_OPTIONS = [
  { value: "within-1-hour", label: "Within 1 hour" }, { value: "same-day", label: "Same day" },
  { value: "within-24-hours", label: "Within 24 hours" }, { value: "within-48-hours", label: "Within 48 hours" },
];

const PHOTO_CONSENT_OPTIONS = [
  { value: "yes_all", label: "Yes — use all photos" },
  { value: "yes_logo_only", label: "Logo and key photos only" },
  { value: "no", label: "No" },
];

function makeSlug(title: string) {
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

/* ---------- Shared input components ---------- */

const inputCls =
  "w-full border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-dark placeholder-text3 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber bg-white disabled:bg-[#F7F5F2] disabled:cursor-not-allowed";

function Field({ label, hint, children, optional }: {
  label: string; hint?: string; children: React.ReactNode; optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-dark mb-1.5">
        {label}
        {optional && <span className="ml-1 font-normal text-text3 text-[12px]">(optional)</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-text3">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; disabled?: boolean; className?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className={`${inputCls} ${className}`}
    />
  );
}

function Select({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      disabled={disabled} className={inputCls}>
      {children}
    </select>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
      <h2 className="text-[15px] font-bold text-dark">{title}</h2>
      {children}
    </div>
  );
}

function Chips({ options, selected, onToggle, colorScheme = "amber" }: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  colorScheme?: "amber" | "dark";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all ${
              active
                ? colorScheme === "amber"
                  ? "bg-amber text-white border-amber"
                  : "bg-dark text-white border-dark"
                : "bg-white text-text2 border-border hover:border-amber/60"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- AI Suggestion banner ---------- */

type AiSuggestion = {
  description: string;
  tags: string[];
  amenities: string[];
  seoTitle: string;
  seoDescription: string;
  priceSuggestion: string;
};

type AppliedField = { label: string; value: string };

/* ---------- Page ---------- */

export default function AdminNewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiApplied, setAiApplied] = useState<AppliedField[]>([]);
  const [aiFieldsApplied, setAiFieldsApplied] = useState<Set<string>>(new Set());

  // Tags UI
  const [showAllTags, setShowAllTags] = useState(false);

  const [form, setForm] = useState({
    title: "", slug: "", type: "stay", subcategory: "", city: "", county: "", address: "",
    status: "draft" as "draft" | "published", description: "",
    price: "", priceUnit: "night", bookingType: "contact_form", maxGuests: "", rentingType: "entire_place",
    website: "", instagram: "", facebook: "", phone: "", email: "",
    notificationEmail: "", notificationEmail2: "", hostEmail: "",
    amenities: [] as string[], tags: [] as string[],
    photos: [] as UploadedImage[], photoConsent: "",
    cuisine: [] as string[], priceRange: "", openingHours: "", atmosphere: "", reservationRequired: false,
    duration: "", maxGroupSize: "", difficulty: "", minAge: "", languages: [] as string[], meetingPoint: "",
    eventDate: "", eventEndDate: "", venue: "", ageRestriction: "", dresscode: "",
    venueAddress: "", doorsOpen: "", isFree: false, priceFrom: "", ticketLink: "", organizer: "",
    serviceArea: "", responseTime: "", providerInfo: "",
    seoTitle: "", seoDescription: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear AI highlight when user edits a field
    if (aiFieldsApplied.has(key)) {
      setAiFieldsApplied((s) => { const next = new Set(s); next.delete(key); return next; });
    }
  }

  function toggleMulti<K extends keyof typeof form>(key: K, item: string) {
    setForm((f) => {
      const arr = (f[key] as string[]);
      return { ...f, [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] };
    });
  }

  /* Auto-slug */
  useEffect(() => {
    if (!slugManuallyEdited) set("slug", makeSlug(form.title));
  }, [form.title, slugManuallyEdited]);

  /* Reset subcategory + smart priceUnit when type changes */
  useEffect(() => {
    set("subcategory", "");
    const defaultUnit = DEFAULT_PRICE_UNIT_BY_TYPE[form.type] ?? "night";
    set("priceUnit", defaultUnit);
    setShowAllTags(false);
    setAiApplied([]);
    setAiFieldsApplied(new Set());
  }, [form.type]);

  const subcats = SUBCATEGORIES_BY_TYPE[form.type] ?? [];
  const isRestaurant = form.subcategory === "restaurants";
  const isExperience = form.type === "experience" && !isRestaurant;
  const isEvent = form.type === "event";
  const isService = form.type === "service";
  const isStay = form.type === "stay";

  /* Filtered tags for the current type */
  const tagKey = isRestaurant ? "restaurants" : form.type;
  const relevantTags = TAG_SUGGESTIONS_BY_TYPE[tagKey] ?? [];
  const otherTags = TAG_SUGGESTIONS.filter((t) => !relevantTags.includes(t));
  const displayedTags = showAllTags ? TAG_SUGGESTIONS : relevantTags;

  /* Description quality */
  const wc = wordCount(form.description);
  const wcColor = wc === 0 ? "text-text3" : wc < 50 ? "text-red-500" : wc < 80 ? "text-amber-500" : "text-green-600";
  const wcLabel = wc === 0 ? "No description yet" : wc < 50 ? `${wc} words — too short` : wc < 80 ? `${wc} words — a bit short` : `${wc} words ✓`;

  /* AI Suggest */
  async function handleAiSuggest() {
    setAiError("");
    setAiLoading(true);
    setAiApplied([]);
    try {
      const res = await fetch("/api/admin/listings/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          subcategory: form.subcategory || undefined,
          city: form.city || undefined,
          description: form.description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiError(json.error ?? "AI request failed.");
        return;
      }
      const s: AiSuggestion = json.suggestion;
      const applied: AppliedField[] = [];
      const appliedKeys = new Set<string>();

      setForm((f) => {
        const next = { ...f };
        // Always fill description (improve if exists, create if empty)
        if (s.description) {
          next.description = s.description;
          applied.push({ label: "Description", value: `${wordCount(s.description)} words` });
          appliedKeys.add("description");
        }
        // Tags: merge AI suggestions with existing selections
        if (s.tags?.length) {
          const merged = Array.from(new Set([...f.tags, ...s.tags]));
          next.tags = merged;
          applied.push({ label: "Tags", value: `${s.tags.length} suggested` });
          appliedKeys.add("tags");
        }
        // Amenities: only if currently empty
        if (!f.amenities.length && s.amenities?.length) {
          next.amenities = s.amenities;
          applied.push({ label: "Amenities", value: s.amenities.join(", ") });
          appliedKeys.add("amenities");
        }
        // SEO: only if blank
        if (!f.seoTitle && s.seoTitle) {
          next.seoTitle = s.seoTitle.slice(0, 60);
          applied.push({ label: "SEO title", value: s.seoTitle });
          appliedKeys.add("seoTitle");
        }
        if (!f.seoDescription && s.seoDescription) {
          next.seoDescription = s.seoDescription.slice(0, 160);
          applied.push({ label: "SEO description", value: "" });
          appliedKeys.add("seoDescription");
        }
        return next;
      });

      setAiApplied(applied);
      setAiFieldsApplied(appliedKeys);
    } catch {
      setAiError("Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  /* Submit */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, slug: form.slug, type: form.type,
          subcategory: form.subcategory || undefined,
          city: form.city, county: form.county || undefined, address: form.address || undefined,
          status: form.status, description: form.description || undefined,
          price: form.price ? parseFloat(form.price) : undefined,
          priceUnit: form.priceUnit || undefined,
          bookingType: form.bookingType || undefined,
          maxGuests: form.maxGuests ? parseInt(form.maxGuests, 10) : undefined,
          rentingType: isStay ? form.rentingType : undefined,
          website: form.website || undefined, instagram: form.instagram || undefined,
          facebook: form.facebook || undefined, phone: form.phone || undefined,
          email: form.email || undefined,
          notificationEmail: form.notificationEmail || undefined,
          notificationEmail2: form.notificationEmail2 || undefined,
          hostEmail: form.hostEmail || undefined,
          amenities: form.amenities.length ? form.amenities : undefined,
          tags: form.tags.length ? form.tags : undefined,
          photos: form.photos.length ? form.photos : undefined,
          photoConsent: form.photoConsent || undefined,
          cuisine: isRestaurant && form.cuisine.length ? form.cuisine : undefined,
          priceRange: isRestaurant && form.priceRange ? form.priceRange : undefined,
          openingHours: isRestaurant && form.openingHours ? form.openingHours : undefined,
          atmosphere: isRestaurant && form.atmosphere ? form.atmosphere : undefined,
          reservationRequired: isRestaurant ? form.reservationRequired : undefined,
          duration: isExperience && form.duration ? form.duration : undefined,
          maxGroupSize: isExperience && form.maxGroupSize ? parseInt(form.maxGroupSize, 10) : undefined,
          difficulty: isExperience && form.difficulty ? form.difficulty : undefined,
          minAge: isExperience && form.minAge ? parseInt(form.minAge, 10) : undefined,
          languages: isExperience && form.languages.length ? form.languages : undefined,
          meetingPoint: isExperience && form.meetingPoint ? form.meetingPoint : undefined,
          eventDate: isEvent && form.eventDate ? form.eventDate : undefined,
          eventEndDate: isEvent && form.eventEndDate ? form.eventEndDate : undefined,
          venue: isEvent && form.venue ? form.venue : undefined,
          ageRestriction: isEvent && form.ageRestriction ? form.ageRestriction : undefined,
          dresscode: isEvent && form.dresscode ? form.dresscode : undefined,
          venueAddress: isEvent && form.venueAddress ? form.venueAddress : undefined,
          doorsOpen: isEvent && form.doorsOpen ? form.doorsOpen : undefined,
          isFree: isEvent ? form.isFree : undefined,
          priceFrom: isEvent && form.priceFrom ? parseFloat(form.priceFrom) : undefined,
          ticketLink: isEvent && form.ticketLink ? form.ticketLink : undefined,
          organizer: isEvent && form.organizer ? form.organizer : undefined,
          serviceArea: isService && form.serviceArea ? form.serviceArea : undefined,
          responseTime: isService && form.responseTime ? form.responseTime : undefined,
          providerInfo: isService && form.providerInfo ? form.providerInfo : undefined,
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
          submissionSource: "admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong."); return; }
      router.push(`/admin/listings?created=${encodeURIComponent(form.title)}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = form.title.trim().length >= 2 && form.slug.trim().length >= 2 && form.type && form.city;
  const aiReady = form.title.trim().length >= 3;

  /* Highlight wrapper */
  function AiHighlight({ field, children }: { field: string; children: React.ReactNode }) {
    if (!aiFieldsApplied.has(field)) return <>{children}</>;
    return (
      <div className="ring-2 ring-amber/40 rounded-xl">
        {children}
        <p className="text-[11px] text-amber mt-0.5 px-1">✨ AI filled</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/listings"
          className="flex items-center gap-1.5 text-[13px] text-text3 hover:text-dark transition-colors mb-4">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to listings
        </Link>
        <h1 className="font-display text-[24px] font-bold text-dark">New Listing</h1>
        <p className="mt-1 text-[14px] text-text3">
          Creates a listing directly in Sanity. Edit all details in Sanity Studio afterwards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Core ── */}
        <SectionCard title="Core details">
          {/* Type selector */}
          <div>
            <p className="text-[13px] font-semibold text-dark mb-2">Type *</p>
            <div className="grid grid-cols-5 gap-2">
              {LISTING_TYPES.map((t) => (
                <button key={t.value} type="button"
                  onClick={() => set("type", t.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all text-center ${
                    form.type === t.value
                      ? "border-amber bg-[#FDF8F0]"
                      : "border-[#F0EDE8] hover:border-border bg-white"
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className={`text-[11px] font-semibold ${form.type === t.value ? "text-amber" : "text-text2"}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Field label="Title *">
            <Input value={form.title} onChange={(v) => set("title", v)}
              placeholder="e.g. Watamu Beach House" />
          </Field>

          {/* Slug with URL preview */}
          <Field label="Slug *" hint="URL-safe identifier — lowercase, hyphens only. Must be unique.">
            <div className="relative">
              <Input value={form.slug}
                onChange={(v) => {
                  setSlugManuallyEdited(true);
                  set("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
                }}
                placeholder="watamu-beach-house" className="pr-16" />
              {!slugManuallyEdited && form.title && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text3 pointer-events-none">auto</span>
              )}
            </div>
            {form.slug && (
              <p className="mt-1 text-[11px] text-text3 font-mono truncate">
                klickenya.com/listings/{form.type}/{form.slug}
              </p>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Subcategory">
              <Select value={form.subcategory} onChange={(v) => set("subcategory", v)} disabled={subcats.length === 0}>
                <option value="">— none —</option>
                {subcats.map((s) => <option key={s} value={s}>{SUBCATEGORY_LABELS[s] ?? s}</option>)}
              </Select>
            </Field>

            <Field label="City *">
              <Select value={form.city} onChange={(v) => set("city", v)}>
                <option value="">Select city…</option>
                {KENYAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="other">Other</option>
              </Select>
            </Field>

            <Field label="County" optional>
              <Select value={form.county} onChange={(v) => set("county", v)}>
                <option value="">Select county…</option>
                {KENYAN_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>

            <Field label="Status *">
              <Select value={form.status} onChange={(v) => set("status", v as "draft" | "published")}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
          </div>

          <Field label="Address" optional>
            <textarea value={form.address} onChange={(e) => set("address", e.target.value)}
              placeholder="e.g. Watamu Marine Park Road, Watamu" rows={2}
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-dark placeholder-text3 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber bg-white resize-none"
            />
          </Field>
        </SectionCard>

        {/* ── AI Assist ── */}
        <div className={`rounded-2xl border p-5 transition-all ${
          aiReady ? "border-amber/40 bg-[#FDF8F0]" : "border-[#F0EDE8] bg-canvas"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-dark">✨ AI Content Assistant</p>
              <p className="text-[12px] text-text3 mt-0.5">
                {aiReady
                  ? "Generate description, tags, and SEO from the title and type above."
                  : "Enter a title first to enable AI suggestions."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAiSuggest}
              disabled={!aiReady || aiLoading}
              className="shrink-0 flex items-center gap-2 bg-amber hover:bg-[#D4901C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[13px] px-4 py-2 rounded-xl transition-colors"
            >
              {aiLoading ? (
                <>
                  <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                "Generate →"
              )}
            </button>
          </div>

          {aiError && (
            <p className="mt-3 text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{aiError}</p>
          )}

          {aiApplied.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {aiApplied.map((f) => (
                <span key={f.label}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber/15 text-[#C47C10] rounded-full px-2.5 py-0.5">
                  ✓ {f.label}{f.value ? `: ${f.value}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Description ── */}
        <SectionCard title="Description">
          <AiHighlight field="description">
            <textarea value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the listing in 80–300 words…"
              rows={7}
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-dark placeholder-text3 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber bg-white resize-none"
            />
          </AiHighlight>
          <p className={`text-[12px] ${wcColor}`}>{wcLabel}</p>
        </SectionCard>

        {/* ── Pricing & Booking ── */}
        <SectionCard title="Pricing & booking">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Price (KES)" optional>
              <div className="flex gap-2">
                <input type="number" min="0" value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0"
                  className="w-28 border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-dark focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber bg-white"
                />
                <Select value={form.priceUnit} onChange={(v) => set("priceUnit", v)}>
                  {PRICE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </Select>
              </div>
            </Field>

            <Field label="Booking method" optional>
              <Select value={form.bookingType} onChange={(v) => set("bookingType", v)}>
                {BOOKING_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </Select>
            </Field>

            <Field label="Max guests" optional>
              <Input value={form.maxGuests} onChange={(v) => set("maxGuests", v)} placeholder="e.g. 8" type="number" />
            </Field>

            {isStay && (
              <Field label="Renting type">
                <Select value={form.rentingType} onChange={(v) => set("rentingType", v)}>
                  {RENTING_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
              </Field>
            )}
          </div>
        </SectionCard>

        {/* ── Photos ── */}
        <SectionCard title="Photos">
          <ImageUploader value={form.photos} onChange={(imgs) => set("photos", imgs)}
            maxImages={15} hint="Upload up to 15 photos. JPEG, PNG, or WebP, max 10 MB each." />
          <Field label="Photo consent" optional hint="Whether Klickenya may use these photos for marketing.">
            <Select value={form.photoConsent} onChange={(v) => set("photoConsent", v)}>
              <option value="">— not set —</option>
              {PHOTO_CONSENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
        </SectionCard>

        {/* ── Amenities ── */}
        <SectionCard title="Amenities">
          <AiHighlight field="amenities">
            <Chips options={AMENITIES} selected={form.amenities}
              onToggle={(v) => toggleMulti("amenities", v)} colorScheme="amber" />
          </AiHighlight>
        </SectionCard>

        {/* ── Tags ── */}
        <SectionCard title="Tags">
          <p className="text-[12px] text-text3 -mt-2">
            Showing {showAllTags ? "all" : `${relevantTags.length} ${form.type}`} tags.
            {form.tags.length > 0 && (
              <span className="ml-1 font-semibold text-dark">{form.tags.length} selected.</span>
            )}
          </p>
          <AiHighlight field="tags">
            <Chips options={displayedTags} selected={form.tags}
              onToggle={(v) => toggleMulti("tags", v)} colorScheme="dark" />
          </AiHighlight>

          {!showAllTags && otherTags.length > 0 && (
            <button type="button" onClick={() => setShowAllTags(true)}
              className="text-[12px] text-text3 hover:text-dark underline underline-offset-2 transition-colors">
              + Show all {TAG_SUGGESTIONS.length} tags ({otherTags.length} more)
            </button>
          )}
          {showAllTags && (
            <button type="button" onClick={() => setShowAllTags(false)}
              className="text-[12px] text-text3 hover:text-dark underline underline-offset-2 transition-colors">
              Show fewer tags
            </button>
          )}
        </SectionCard>

        {/* ── Contact & Social ── */}
        <SectionCard title="Contact & social">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Website" optional>
              <Input value={form.website} onChange={(v) => set("website", v)} placeholder="https://…" type="url" />
            </Field>
            <Field label="Instagram" optional hint="Without @">
              <Input value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="yourbusiness" />
            </Field>
            <Field label="Facebook URL" optional>
              <Input value={form.facebook} onChange={(v) => set("facebook", v)} placeholder="https://facebook.com/…" type="url" />
            </Field>
            <Field label="Phone" optional>
              <Input value={form.phone} onChange={(v) => set("phone", v)} placeholder="+254 7XX XXX XXX" type="tel" />
            </Field>
            <Field label="Business email" optional>
              <Input value={form.email} onChange={(v) => set("email", v)} placeholder="hello@business.com" type="email" />
            </Field>
            <Field label="Notification email 1" optional hint="Enquiry alerts">
              <Input value={form.notificationEmail} onChange={(v) => set("notificationEmail", v)} placeholder="owner@business.com" type="email" />
            </Field>
            <Field label="Notification email 2" optional hint="Co-host copy">
              <Input value={form.notificationEmail2} onChange={(v) => set("notificationEmail2", v)} placeholder="manager@business.com" type="email" />
            </Field>
          </div>
        </SectionCard>

        {/* ── Restaurant ── */}
        {isRestaurant && (
          <SectionCard title="🍽️ Restaurant details">
            <Field label="Cuisine" optional>
              <Chips options={CUISINE_OPTIONS} selected={form.cuisine}
                onToggle={(v) => toggleMulti("cuisine", v)} colorScheme="amber" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Price range" optional>
                <Select value={form.priceRange} onChange={(v) => set("priceRange", v)}>
                  <option value="">— select —</option>
                  {PRICE_RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Atmosphere" optional>
                <Select value={form.atmosphere} onChange={(v) => set("atmosphere", v)}>
                  <option value="">— select —</option>
                  {ATMOSPHERE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Opening hours" optional hint={'e.g. "Daily 8 AM – 10:30 PM"'}>
              <textarea value={form.openingHours} onChange={(e) => set("openingHours", e.target.value)}
                rows={2} placeholder="Daily 8:00 AM – 10:30 PM"
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-dark placeholder-text3 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber bg-white resize-none"
              />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.reservationRequired}
                onChange={(e) => set("reservationRequired", e.target.checked)}
                className="w-4 h-4 accent-amber" />
              <span className="text-[13px] font-semibold text-dark">Reservation required</span>
            </label>
          </SectionCard>
        )}

        {/* ── Experience ── */}
        {isExperience && (
          <SectionCard title="🧭 Experience details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Duration" optional>
                <Select value={form.duration} onChange={(v) => set("duration", v)}>
                  <option value="">— select —</option>
                  {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Difficulty" optional>
                <Select value={form.difficulty} onChange={(v) => set("difficulty", v)}>
                  <option value="">— select —</option>
                  {DIFFICULTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Max group size" optional>
                <Input value={form.maxGroupSize} onChange={(v) => set("maxGroupSize", v)} placeholder="e.g. 12" type="number" />
              </Field>
              <Field label="Minimum age" optional>
                <Input value={form.minAge} onChange={(v) => set("minAge", v)} placeholder="e.g. 8" type="number" />
              </Field>
            </div>
            <Field label="Languages" optional>
              <Chips options={LANGUAGE_OPTIONS} selected={form.languages}
                onToggle={(v) => toggleMulti("languages", v)} colorScheme="amber" />
            </Field>
            <Field label="Meeting point" optional>
              <Input value={form.meetingPoint} onChange={(v) => set("meetingPoint", v)}
                placeholder='e.g. "Watamu Marine Park gate"' />
            </Field>
          </SectionCard>
        )}

        {/* ── Event ── */}
        {isEvent && (
          <SectionCard title="🎫 Event details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Start date & time" optional>
                <Input value={form.eventDate} onChange={(v) => set("eventDate", v)} type="datetime-local" />
              </Field>
              <Field label="End date & time" optional>
                <Input value={form.eventEndDate} onChange={(v) => set("eventEndDate", v)} type="datetime-local" />
              </Field>
              <Field label="Venue name" optional>
                <Input value={form.venue} onChange={(v) => set("venue", v)} placeholder='"Papa Remo Beach Club"' />
              </Field>
              <Field label="Venue address" optional>
                <Input value={form.venueAddress} onChange={(v) => set("venueAddress", v)} placeholder="Full address" />
              </Field>
              <Field label="Doors open" optional>
                <Input value={form.doorsOpen} onChange={(v) => set("doorsOpen", v)} placeholder="e.g. 18:00" />
              </Field>
              <Field label="Age restriction" optional>
                <Select value={form.ageRestriction} onChange={(v) => set("ageRestriction", v)}>
                  <option value="">— none —</option>
                  {AGE_RESTRICTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Dress code" optional>
                <Input value={form.dresscode} onChange={(v) => set("dresscode", v)} placeholder='"Smart casual"' />
              </Field>
              <Field label="Organizer" optional>
                <Input value={form.organizer} onChange={(v) => set("organizer", v)} placeholder="Organizer name" />
              </Field>
              <Field label="Price from (KES)" optional>
                <Input value={form.priceFrom} onChange={(v) => set("priceFrom", v)} placeholder="0" type="number" />
              </Field>
              <Field label="Ticket link" optional>
                <Input value={form.ticketLink} onChange={(v) => set("ticketLink", v)} placeholder="https://…" type="url" />
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFree}
                onChange={(e) => set("isFree", e.target.checked)}
                className="w-4 h-4 accent-amber" />
              <span className="text-[13px] font-semibold text-dark">Free event</span>
            </label>
          </SectionCard>
        )}

        {/* ── Service ── */}
        {isService && (
          <SectionCard title="🔧 Service details">
            <Field label="Service area" optional hint='e.g. "Watamu & Kilifi" or "Nationwide"'>
              <Input value={form.serviceArea} onChange={(v) => set("serviceArea", v)} placeholder="Watamu & Kilifi" />
            </Field>
            <Field label="Response time" optional>
              <Select value={form.responseTime} onChange={(v) => set("responseTime", v)}>
                <option value="">— select —</option>
                {RESPONSE_TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="Provider info" optional hint="Background, qualifications, or certifications">
              <textarea value={form.providerInfo} onChange={(e) => set("providerInfo", e.target.value)}
                rows={3} placeholder="Brief bio or credentials of the service provider…"
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-dark placeholder-text3 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber bg-white resize-none"
              />
            </Field>
          </SectionCard>
        )}

        {/* ── SEO ── */}
        <SectionCard title="SEO">
          <Field label="SEO title" optional hint="Overrides the default page title. Max 60 chars.">
            <AiHighlight field="seoTitle">
              <Input value={form.seoTitle} onChange={(v) => set("seoTitle", v.slice(0, 60))}
                placeholder="e.g. Watamu Beach House — Luxury Villa Kenya" />
            </AiHighlight>
            <p className="mt-1 text-[12px] text-text3">{form.seoTitle.length}/60</p>
          </Field>
          <Field label="Meta description" optional hint="Shown in search results. Max 160 chars.">
            <AiHighlight field="seoDescription">
              <textarea value={form.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value.slice(0, 160))}
                placeholder="Short description for search engines…" rows={3}
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-dark placeholder-text3 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber bg-white resize-none"
              />
            </AiHighlight>
            <p className="mt-1 text-[12px] text-text3">{form.seoDescription.length}/160</p>
          </Field>
        </SectionCard>

        {/* ── Host assignment ── */}
        <SectionCard title="Host assignment">
          <p className="text-[13px] text-text3 -mt-2">
            Optional. Links the listing to an existing host document in Sanity.
          </p>
          <Field label="Host email" optional>
            <Input value={form.hostEmail} onChange={(v) => set("hostEmail", v)}
              placeholder="host@example.com" type="email" />
          </Field>
        </SectionCard>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-600">{error}</div>
        )}

        <div className="flex items-center gap-3 pb-8">
          <button type="submit" disabled={!canSubmit || loading}
            className="flex-1 sm:flex-none sm:px-8 py-3 bg-amber hover:bg-[#D4901C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[14px] rounded-xl transition-colors">
            {loading ? "Creating…" : "Create listing"}
          </button>
          <Link href="/admin/listings"
            className="px-6 py-3 text-[14px] font-semibold text-text2 hover:text-dark transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
