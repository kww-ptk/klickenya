"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBCATEGORIES_BY_TYPE, SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";
import { KENYAN_COUNTIES, AMENITIES, TAG_SUGGESTIONS } from "@/lib/constants/listing";
import { ImageUploader, UploadedImage } from "@/components/shared/ImageUploader";

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

const PRICE_UNITS = [
  { value: "night", label: "Per Night" },
  { value: "person", label: "Per Person" },
  { value: "day", label: "Per Day" },
  { value: "session", label: "Per Session" },
  { value: "ticket", label: "Per Ticket" },
  { value: "once", label: "Fixed Price" },
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
  { value: "casual", label: "Casual" },
  { value: "romantic", label: "Romantic" },
  { value: "family", label: "Family-Friendly" },
  { value: "lively", label: "Lively / Vibrant" },
  { value: "fine-dining", label: "Fine Dining" },
  { value: "beachfront", label: "Beachfront" },
  { value: "rooftop", label: "Rooftop" },
  { value: "garden", label: "Garden" },
];

const PRICE_RANGE_OPTIONS = [
  { value: "budget", label: "$ Budget" },
  { value: "mid-range", label: "$$ Mid-Range" },
  { value: "fine-dining", label: "$$$ Fine Dining" },
];

const DURATION_OPTIONS = [
  { value: "1-hour", label: "1 hour" },
  { value: "2-hours", label: "2 hours" },
  { value: "3-hours", label: "3 hours" },
  { value: "half-day", label: "Half day (4–5 hrs)" },
  { value: "full-day", label: "Full day (6–8 hrs)" },
  { value: "multi-day", label: "Multi-day" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy — suitable for everyone" },
  { value: "moderate", label: "Moderate — basic fitness required" },
  { value: "advanced", label: "Advanced — experience required" },
];

const LANGUAGE_OPTIONS = ["English", "Swahili", "Italian", "French", "German", "Spanish"];

const AGE_RESTRICTION_OPTIONS = [
  { value: "all-ages", label: "All Ages" },
  { value: "18+", label: "18+" },
  { value: "21+", label: "21+" },
];

const RESPONSE_TIME_OPTIONS = [
  { value: "within-1-hour", label: "Within 1 hour" },
  { value: "same-day", label: "Same day" },
  { value: "within-24-hours", label: "Within 24 hours" },
  { value: "within-48-hours", label: "Within 48 hours" },
];

const PHOTO_CONSENT_OPTIONS = [
  { value: "yes_all", label: "Yes — use all photos" },
  { value: "yes_logo_only", label: "Logo and key photos only" },
  { value: "no", label: "No" },
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

function Field({ label, hint, children, optional }: { label: string; hint?: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[#16130C] mb-1.5">
        {label}
        {optional && <span className="ml-1 font-normal text-[#9C9485] text-[12px]">(optional)</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-[#9C9485]">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white disabled:bg-[#F7F5F2] disabled:cursor-not-allowed";

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
      className={`${inputCls} ${className}`}
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
      className={inputCls}
    >
      {children}
    </select>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
      <h2 className="text-[16px] font-bold text-[#16130C]">{title}</h2>
      {children}
    </div>
  );
}

/* ---------- Page ---------- */

export default function AdminNewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [form, setForm] = useState({
    // Core
    title: "",
    slug: "",
    type: "stay",
    subcategory: "",
    city: "",
    county: "",
    address: "",
    status: "draft" as "draft" | "published",
    description: "",
    // Pricing
    price: "",
    priceUnit: "night",
    bookingType: "contact_form",
    maxGuests: "",
    rentingType: "entire_place",
    // Contact
    website: "",
    instagram: "",
    facebook: "",
    phone: "",
    email: "",
    notificationEmail: "",
    notificationEmail2: "",
    // Host
    hostEmail: "",
    // Features
    amenities: [] as string[],
    tags: [] as string[],
    // Photos
    photos: [] as UploadedImage[],
    photoConsent: "",
    // Restaurant
    cuisine: [] as string[],
    priceRange: "",
    openingHours: "",
    atmosphere: "",
    reservationRequired: false,
    // Experience
    duration: "",
    maxGroupSize: "",
    difficulty: "",
    minAge: "",
    languages: [] as string[],
    meetingPoint: "",
    // Event
    eventDate: "",
    eventEndDate: "",
    venue: "",
    ageRestriction: "",
    dresscode: "",
    venueAddress: "",
    doorsOpen: "",
    isFree: false,
    priceFrom: "",
    ticketLink: "",
    organizer: "",
    // Service
    serviceArea: "",
    responseTime: "",
    providerInfo: "",
    // SEO
    seoTitle: "",
    seoDescription: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleMulti<K extends keyof typeof form>(key: K, item: string) {
    setForm((f) => {
      const arr = (f[key] as string[]);
      return {
        ...f,
        [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item],
      };
    });
  }

  /* Auto-generate slug */
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
  const isRestaurant = form.subcategory === "restaurants";
  const isExperience = form.type === "experience" && !isRestaurant;
  const isEvent = form.type === "event";
  const isService = form.type === "service";
  const isStay = form.type === "stay";

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
          county: form.county || undefined,
          address: form.address || undefined,
          status: form.status,
          description: form.description || undefined,
          price: form.price ? parseFloat(form.price) : undefined,
          priceUnit: form.priceUnit || undefined,
          bookingType: form.bookingType || undefined,
          maxGuests: form.maxGuests ? parseInt(form.maxGuests, 10) : undefined,
          rentingType: isStay ? form.rentingType : undefined,
          website: form.website || undefined,
          instagram: form.instagram || undefined,
          facebook: form.facebook || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          notificationEmail: form.notificationEmail || undefined,
          notificationEmail2: form.notificationEmail2 || undefined,
          hostEmail: form.hostEmail || undefined,
          amenities: form.amenities.length ? form.amenities : undefined,
          tags: form.tags.length ? form.tags : undefined,
          photos: form.photos.length ? form.photos : undefined,
          photoConsent: form.photoConsent || undefined,
          // Restaurant
          cuisine: isRestaurant && form.cuisine.length ? form.cuisine : undefined,
          priceRange: isRestaurant && form.priceRange ? form.priceRange : undefined,
          openingHours: isRestaurant && form.openingHours ? form.openingHours : undefined,
          atmosphere: isRestaurant && form.atmosphere ? form.atmosphere : undefined,
          reservationRequired: isRestaurant ? form.reservationRequired : undefined,
          // Experience
          duration: isExperience && form.duration ? form.duration : undefined,
          maxGroupSize: isExperience && form.maxGroupSize ? parseInt(form.maxGroupSize, 10) : undefined,
          difficulty: isExperience && form.difficulty ? form.difficulty : undefined,
          minAge: isExperience && form.minAge ? parseInt(form.minAge, 10) : undefined,
          languages: isExperience && form.languages.length ? form.languages : undefined,
          meetingPoint: isExperience && form.meetingPoint ? form.meetingPoint : undefined,
          // Event
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
          // Service
          serviceArea: isService && form.serviceArea ? form.serviceArea : undefined,
          responseTime: isService && form.responseTime ? form.responseTime : undefined,
          providerInfo: isService && form.providerInfo ? form.providerInfo : undefined,
          // SEO
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
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
        <SectionCard title="Core details">
          <Field label="Title *">
            <Input value={form.title} onChange={(v) => set("title", v)} placeholder="e.g. Watamu Beach House" />
          </Field>

          <Field label="Slug *" hint="URL-safe identifier — lowercase, hyphens only. Must be unique.">
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
              <Select value={form.subcategory} onChange={(v) => set("subcategory", v)} disabled={subcats.length === 0}>
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

            <Field label="County" optional>
              <Select value={form.county} onChange={(v) => set("county", v)}>
                <option value="">Select county…</option>
                {KENYAN_COUNTIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Address" optional>
            <textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="e.g. Watamu Marine Park Road, Watamu"
              rows={2}
              className="w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white resize-none"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Status *">
              <Select value={form.status} onChange={(v) => set("status", v as "draft" | "published")}>
                <option value="draft">Draft (not publicly visible)</option>
                <option value="published">Published (live immediately)</option>
              </Select>
            </Field>
          </div>

          <Field label="Description" hint="Saved as Portable Text. Can be formatted further in Studio.">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the listing in 80–300 words…"
              rows={5}
              className="w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white resize-none"
            />
          </Field>
        </SectionCard>

        {/* Pricing & Booking */}
        <SectionCard title="Pricing & booking">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Price (KES)" optional>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0"
                  className="w-28 border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white"
                />
                <Select value={form.priceUnit} onChange={(v) => set("priceUnit", v)}>
                  {PRICE_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </Select>
              </div>
            </Field>

            <Field label="Booking method" optional>
              <Select value={form.bookingType} onChange={(v) => set("bookingType", v)}>
                {BOOKING_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Max guests" optional>
              <Input value={form.maxGuests} onChange={(v) => set("maxGuests", v)} placeholder="e.g. 8" type="number" />
            </Field>

            {isStay && (
              <Field label="Renting type">
                <Select value={form.rentingType} onChange={(v) => set("rentingType", v)}>
                  {RENTING_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        </SectionCard>

        {/* Photos */}
        <SectionCard title="Photos">
          <ImageUploader
            value={form.photos}
            onChange={(imgs) => set("photos", imgs)}
            maxImages={15}
            hint="Upload up to 15 photos. JPEG, PNG, or WebP, max 10 MB each."
          />

          <Field label="Photo consent" optional hint="Whether Klickenya may use these photos for marketing.">
            <Select value={form.photoConsent} onChange={(v) => set("photoConsent", v)}>
              <option value="">— not set —</option>
              {PHOTO_CONSENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
        </SectionCard>

        {/* Amenities */}
        <SectionCard title="Amenities & tags">
          <Field label="Amenities" optional>
            <div className="flex flex-wrap gap-2 mt-1">
              {AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleMulti("amenities", a)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                    form.amenities.includes(a)
                      ? "bg-[#E8A020] text-white border-[#E8A020]"
                      : "bg-white text-[#5E5848] border-[#E2DDD5] hover:border-[#E8A020]/50"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Tags" optional hint="Select keywords to help guests discover this listing.">
            <div className="flex flex-wrap gap-1.5 mt-1 max-h-40 overflow-y-auto">
              {TAG_SUGGESTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleMulti("tags", t)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    form.tags.includes(t)
                      ? "bg-[#16130C] text-white border-[#16130C]"
                      : "bg-white text-[#5E5848] border-[#E2DDD5] hover:border-[#16130C]/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
        </SectionCard>

        {/* Contact & Social */}
        <SectionCard title="Contact & social">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Website" optional>
              <Input value={form.website} onChange={(v) => set("website", v)} placeholder="https://…" type="url" />
            </Field>
            <Field label="Instagram handle" optional hint="Without @">
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
            <Field label="Notification email 1" optional hint="Receives enquiry alerts.">
              <Input value={form.notificationEmail} onChange={(v) => set("notificationEmail", v)} placeholder="owner@business.com" type="email" />
            </Field>
            <Field label="Notification email 2" optional hint="Co-host or manager copy.">
              <Input value={form.notificationEmail2} onChange={(v) => set("notificationEmail2", v)} placeholder="manager@business.com" type="email" />
            </Field>
          </div>
        </SectionCard>

        {/* Restaurant fields */}
        {isRestaurant && (
          <SectionCard title="Restaurant details">
            <Field label="Cuisine" optional>
              <div className="flex flex-wrap gap-2 mt-1">
                {CUISINE_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleMulti("cuisine", c)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                      form.cuisine.includes(c)
                        ? "bg-[#E8A020] text-white border-[#E8A020]"
                        : "bg-white text-[#5E5848] border-[#E2DDD5] hover:border-[#E8A020]/50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Price range" optional>
                <Select value={form.priceRange} onChange={(v) => set("priceRange", v)}>
                  <option value="">— select —</option>
                  {PRICE_RANGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Atmosphere" optional>
                <Select value={form.atmosphere} onChange={(v) => set("atmosphere", v)}>
                  <option value="">— select —</option>
                  {ATMOSPHERE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Opening hours" optional hint={'e.g. "Daily 8:00 AM – 10:30 PM"'}>
              <textarea
                value={form.openingHours}
                onChange={(e) => set("openingHours", e.target.value)}
                rows={2}
                placeholder={"Daily 8:00 AM – 10:30 PM"}
                className="w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white resize-none"
              />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.reservationRequired}
                onChange={(e) => set("reservationRequired", e.target.checked)}
                className="w-4 h-4 accent-[#E8A020]"
              />
              <span className="text-[13px] font-semibold text-[#16130C]">Reservation required</span>
            </label>
          </SectionCard>
        )}

        {/* Experience fields */}
        {isExperience && (
          <SectionCard title="Experience details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Duration" optional>
                <Select value={form.duration} onChange={(v) => set("duration", v)}>
                  <option value="">— select —</option>
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Difficulty" optional>
                <Select value={form.difficulty} onChange={(v) => set("difficulty", v)}>
                  <option value="">— select —</option>
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
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
              <div className="flex flex-wrap gap-2 mt-1">
                {LANGUAGE_OPTIONS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleMulti("languages", l)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                      form.languages.includes(l)
                        ? "bg-[#E8A020] text-white border-[#E8A020]"
                        : "bg-white text-[#5E5848] border-[#E2DDD5] hover:border-[#E8A020]/50"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Meeting point" optional>
              <Input value={form.meetingPoint} onChange={(v) => set("meetingPoint", v)} placeholder='e.g. "Watamu Marine Park gate"' />
            </Field>
          </SectionCard>
        )}

        {/* Event fields */}
        {isEvent && (
          <SectionCard title="Event details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Start date & time" optional>
                <Input value={form.eventDate} onChange={(v) => set("eventDate", v)} type="datetime-local" />
              </Field>
              <Field label="End date & time" optional>
                <Input value={form.eventEndDate} onChange={(v) => set("eventEndDate", v)} type="datetime-local" />
              </Field>
              <Field label="Venue name" optional>
                <Input value={form.venue} onChange={(v) => set("venue", v)} placeholder='e.g. "Papa Remo Beach Club"' />
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
                  {AGE_RESTRICTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Dress code" optional>
                <Input value={form.dresscode} onChange={(v) => set("dresscode", v)} placeholder='e.g. "Smart casual"' />
              </Field>
              <Field label="Organizer" optional>
                <Input value={form.organizer} onChange={(v) => set("organizer", v)} placeholder="Event organizer name" />
              </Field>
              <Field label="Price from (KES)" optional>
                <Input value={form.priceFrom} onChange={(v) => set("priceFrom", v)} placeholder="0" type="number" />
              </Field>
              <Field label="Ticket link" optional>
                <Input value={form.ticketLink} onChange={(v) => set("ticketLink", v)} placeholder="https://…" type="url" />
              </Field>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) => set("isFree", e.target.checked)}
                className="w-4 h-4 accent-[#E8A020]"
              />
              <span className="text-[13px] font-semibold text-[#16130C]">Free event</span>
            </label>
          </SectionCard>
        )}

        {/* Service fields */}
        {isService && (
          <SectionCard title="Service details">
            <Field label="Service area" optional hint='e.g. "Watamu & Kilifi" or "Nationwide"'>
              <Input value={form.serviceArea} onChange={(v) => set("serviceArea", v)} placeholder="Watamu & Kilifi" />
            </Field>

            <Field label="Response time" optional>
              <Select value={form.responseTime} onChange={(v) => set("responseTime", v)}>
                <option value="">— select —</option>
                {RESPONSE_TIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Provider info" optional hint="Background, qualifications, or certifications">
              <textarea
                value={form.providerInfo}
                onChange={(e) => set("providerInfo", e.target.value)}
                rows={3}
                placeholder="Brief bio or credentials of the service provider…"
                className="w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white resize-none"
              />
            </Field>
          </SectionCard>
        )}

        {/* SEO */}
        <SectionCard title="SEO">
          <Field label="SEO title" optional hint="Overrides the default page title. Max 60 characters.">
            <Input
              value={form.seoTitle}
              onChange={(v) => set("seoTitle", v.slice(0, 60))}
              placeholder="e.g. Watamu Beach House — Luxury Villa Kenya"
            />
            <p className="mt-1 text-[12px] text-[#9C9485]">{form.seoTitle.length}/60</p>
          </Field>

          <Field label="Meta description" optional hint="Shown in search results. Max 160 characters.">
            <textarea
              value={form.seoDescription}
              onChange={(e) => set("seoDescription", e.target.value.slice(0, 160))}
              placeholder="Short description for search engines…"
              rows={3}
              className="w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white resize-none"
            />
            <p className="mt-1 text-[12px] text-[#9C9485]">{form.seoDescription.length}/160</p>
          </Field>
        </SectionCard>

        {/* Host assignment */}
        <SectionCard title="Host assignment">
          <p className="text-[13px] text-[#9C9485] -mt-2">
            Optional. If a host with this email exists, the listing will be linked to their Sanity host document.
          </p>
          <Field label="Host email" optional>
            <Input value={form.hostEmail} onChange={(v) => set("hostEmail", v)} placeholder="host@example.com" type="email" />
          </Field>
        </SectionCard>

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
