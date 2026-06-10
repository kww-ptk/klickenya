"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Heart, Calendar, Mail, MapPin, ArrowRight, Globe, LogOut, Settings, Compass, X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanityBrowserClient } from "@/lib/sanity/browser";

/* ── Types ────────────────────────────────────────── */

interface Rsvp {
  id: string;
  event_title: string;
  event_date: string | null;
  event_city: string | null;
  event_slug: string | null;
  sanity_event_id: string;
  status: string;
  created_at: string;
}

interface Enquiry {
  id: string;
  listing_title: string | null;
  listing_type: string | null;
  listing_sanity_id: string | null;
  message: string | null;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
  calendar_status: string | null;
  created_at: string;
}

export interface GuestBooking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  guest_count: number;
  status: string;
  payment_status: string;
  total_kes: number;
  amount_paid_kes: number;
  balance_kes: number;
  rate_per_night: number;
  subtotal_kes: number;
  discount_kes: number;
  extras_kes: number | null;
  property: { name: string; address: string | null; check_in_time: string | null } | { name: string; address: string | null; check_in_time: string | null }[] | null;
  room: { name: string } | { name: string }[] | null;
  booking_fees: Array<{ name: string; amount_kes: number }>;
  booking_payments: Array<{ amount_kes: number; method: string | null; created_at: string }>;
}

interface SavedRow {
  id: string;
  sanity_listing_id: string;
  saved_at: string;
}

interface SanityListing {
  _id: string;
  title: string;
  slug: string | null;
  listingType: string | null;
  city: string | null;
  photo: string | null;
}

interface ProfileClientProps {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  location: string | null;
  savedListings: SavedRow[];
  rsvps: Rsvp[];
  enquiries: Enquiry[];
  bookings: GuestBooking[];
  initialTab?: string;
  isHost?: boolean;
}

/* ── Tabs ─────────────────────────────────────────── */

const TABS = [
  { key: "profile",   label: "Profile",   icon: User },
  { key: "bookings",  label: "Bookings",  icon: BookOpen },
  { key: "enquiries", label: "Enquiries", icon: Mail },
  { key: "events",    label: "Events",    icon: Calendar },
  { key: "saved",     label: "Saved",     icon: Heart },
] as const;
type Tab = (typeof TABS)[number]["key"];

/* ── Location data ────────────────────────────────── */

const COUNTRIES: Record<string, string[]> = {
  Kenya: ["Watamu", "Kilifi", "Diani", "Nairobi", "Lamu", "Mombasa", "Malindi", "Nanyuki", "Nakuru"],
  Tanzania: ["Zanzibar", "Dar es Salaam", "Arusha"],
  Uganda: ["Kampala", "Entebbe", "Jinja"],
  Other: [],
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtKes(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

const BOOKING_STATUS: Record<string, { label: string; className: string }> = {
  confirmed:   { label: "Confirmed",  className: "bg-[#4F46E5]/15 text-[#4F46E5]" },
  checked_in:  { label: "Checked in", className: "bg-[#22C55E]/15 text-[#22C55E]" },
  checked_out: { label: "Completed",  className: "bg-text3/15 text-text3" },
  cancelled:   { label: "Cancelled",  className: "bg-red-100 text-red-600" },
  no_show:     { label: "No show",    className: "bg-red-100 text-red-600" },
};

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  paid:     { label: "Paid",            className: "bg-[#22C55E]/15 text-[#22C55E]" },
  partial:  { label: "Deposit paid",    className: "bg-amber/15 text-amber" },
  pending:  { label: "Payment pending", className: "bg-red-100 text-red-600" },
  refunded: { label: "Refunded",        className: "bg-text3/15 text-text3" },
};

const ENQUIRY_STATUS: Record<string, { label: string; className: string }> = {
  pending:   { label: "Awaiting response", className: "bg-amber/15 text-amber" },
  held:      { label: "On hold",           className: "bg-[#4F46E5]/15 text-[#4F46E5]" },
  converted: { label: "Booking confirmed", className: "bg-[#22C55E]/15 text-[#22C55E]" },
  declined:  { label: "Declined",          className: "bg-text3/15 text-text3" },
};

function parseLocation(loc: string | null): { country: string; city: string } {
  if (!loc) return { country: "", city: "" };
  const parts = loc.split(", ");
  if (parts.length === 2) return { country: parts[1], city: parts[0] };
  // Check if it's a known city
  for (const [country, cities] of Object.entries(COUNTRIES)) {
    if (cities.includes(loc)) return { country, city: loc };
  }
  return { country: "", city: loc };
}

/* ── Component ────────────────────────────────────── */

export function ProfileClient({
  userId,
  displayName,
  email,
  avatarUrl,
  location,
  savedListings: initialSavedListings,
  rsvps,
  enquiries,
  bookings,
  initialTab,
  isHost = false,
}: ProfileClientProps) {
  const validTabs: Tab[] = ["profile", "bookings", "events", "enquiries", "saved"];
  const startTab = validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : "profile";
  const [activeTab, setActiveTab] = useState<Tab>(startTab);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(displayName);
  const parsed = parseLocation(location);
  const [country, setCountry] = useState(parsed.country);
  const [city, setCity] = useState(parsed.city);
  const [saving, setSaving] = useState(false);
  const [savedRows, setSavedRows] = useState(initialSavedListings);
  const [sanityListings, setSanityListings] = useState<Map<string, SanityListing>>(new Map());
  const [sanityLoaded, setSanityLoaded] = useState(false);
  const router = useRouter();

  const savedCount = savedRows.length;

  // Fetch live listing data from Sanity when saved tab opens
  useEffect(() => {
    if (activeTab !== "saved" || savedRows.length === 0 || sanityLoaded) return;
    const ids = savedRows.map((r) => r.sanity_listing_id);
    sanityBrowserClient
      .fetch<SanityListing[]>(
        `*[_type == "listing" && _id in $ids]{ _id, title, "slug": slug.current, "listingType": type, city, "photo": photos[0].asset->url }`,
        { ids }
      )
      .then((results) => {
        setSanityListings(new Map(results.map((r) => [r._id, r])));
        setSanityLoaded(true);
      })
      .catch(() => setSanityLoaded(true));
  }, [activeTab, savedRows, sanityLoaded]);

  async function handleUnsave(sanityListingId: string) {
    const prev = savedRows;
    setSavedRows((rows) => rows.filter((r) => r.sanity_listing_id !== sanityListingId));
    const res = await fetch("/api/listings/save", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sanityListingId }),
    });
    if (!res.ok) setSavedRows(prev);
  }

  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const goingEvents = rsvps.filter((r) => r.status === "going");

  // ── Helpers ──────────────────────────────────────────────────────────
  const interestedEvents = rsvps.filter((r) => r.status === "interested");
  const locationDisplay = city && country ? `${city}, ${country}` : city || country || "";
  const availableCities = country ? (COUNTRIES[country] ?? []) : [];

  async function saveProfile(updates?: { displayName?: string; location?: string }) {
    setSaving(true);
    try {
      const loc = updates?.location ?? (city && country ? `${city}, ${country}` : city || country || "");
      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: updates?.displayName ?? name,
          location: loc,
        }),
      });
      router.refresh();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* ── Hero header with gradient ── */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-dark" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 100%, rgba(232,160,32,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 0%, rgba(107,45,139,0.12) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Nav */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 max-w-[720px] mx-auto">
          <Link href="/" className="text-white/50 text-[13px] font-medium hover:text-white transition-colors">
            ← Back to Klickenya
          </Link>
          <div className="flex items-center gap-4">
            {isHost && (
              <Link href="/dashboard" className="text-amber text-[13px] font-medium hover:text-amber2 transition-colors">
                Host Dashboard →
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-white/40 text-[13px] font-medium hover:text-white/70 transition-colors"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </div>
        </div>

        {/* Profile card */}
        <div className="relative z-10 px-5 pt-10 pb-20 max-w-[720px] mx-auto">
          <div className="flex items-center gap-5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="size-20 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
              />
            ) : (
              <div className="size-20 rounded-2xl bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[26px] font-bold border-2 border-white/20 shadow-lg">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[24px] font-bold text-white tracking-[-0.02em]">{name}</h1>
              <p className="text-[13px] text-white/40 mt-0.5">{email}</p>
              {locationDisplay && (
                <div className="flex items-center gap-1.5 mt-2">
                  <MapPin className="size-3.5 text-amber" />
                  <span className="text-[13px] text-white/60 font-medium">{locationDisplay}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-6 mt-6">
            {[
              { label: "Bookings",  value: bookings.length,  icon: BookOpen },
              { label: "Events",    value: rsvps.length,     icon: Calendar },
              { label: "Enquiries", value: enquiries.length, icon: Mail },
              { label: "Saved",     value: savedCount,       icon: Heart },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-[20px] font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/40 font-medium uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-border shadow-sm -mt-10">
        <div className="max-w-[720px] mx-auto">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tab.key === "bookings"  ? bookings.length
                : tab.key === "events"    ? rsvps.length
                : tab.key === "enquiries" ? enquiries.length
                : tab.key === "saved"     ? savedCount
                : 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-5 py-3.5 border-b-2 text-[13px] font-semibold whitespace-nowrap transition-colors shrink-0",
                    activeTab === tab.key
                      ? "border-amber text-amber"
                      : "border-transparent text-text3 hover:text-dark"
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      "ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                      activeTab === tab.key ? "bg-amber/15 text-amber" : "bg-border text-text3"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-[720px] mx-auto px-5 py-8 pb-24">

        {/* ═══ PROFILE TAB ═══ */}
        {activeTab === "profile" && (
          <div className="space-y-5">
            {/* Name */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <User className="size-4 text-text3" />
                <label className="text-[12px] font-semibold text-text3 uppercase tracking-wide">
                  Display name
                </label>
              </div>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-border px-4 py-2.5 text-[14px] text-dark outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => { saveProfile({ displayName: name }); setEditingName(false); }}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-amber text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors disabled:opacity-50"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => { setName(displayName); setEditingName(false); }}
                    className="px-3 py-2.5 rounded-xl border border-border text-[13px] font-medium text-text3 hover:bg-[#F5F3F0] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-semibold text-dark">{name}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-[12px] font-semibold text-amber hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Location — country + city */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="size-4 text-text3" />
                <label className="text-[12px] font-semibold text-text3 uppercase tracking-wide">
                  Where are you based?
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setCity("");
                  }}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-[14px] text-dark outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber bg-white transition-all appearance-none"
                >
                  <option value="">Country…</option>
                  {Object.keys(COUNTRIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {country && availableCities.length > 0 ? (
                  <select
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      const loc = e.target.value ? `${e.target.value}, ${country}` : country;
                      saveProfile({ location: loc });
                    }}
                    className="w-full rounded-xl border border-border px-4 py-2.5 text-[14px] text-dark outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber bg-white transition-all appearance-none"
                  >
                    <option value="">City…</option>
                    {availableCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : country === "Other" ? (
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={() => {
                      if (city) saveProfile({ location: `${city}, ${country}` });
                    }}
                    placeholder="Your city…"
                    className="w-full rounded-xl border border-border px-4 py-2.5 text-[14px] text-dark outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber transition-all"
                  />
                ) : null}
              </div>
            </div>

            {/* Email */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="size-4 text-text3" />
                <label className="text-[12px] font-semibold text-text3 uppercase tracking-wide">
                  Email
                </label>
              </div>
              <p className="text-[16px] text-dark">{email}</p>
            </div>

            {/* Explore CTA */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-xl bg-purple-600/10 flex items-center justify-center shrink-0">
                  <Compass className="size-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-dark mb-0.5">
                    Discover Kenya
                  </h3>
                  <p className="text-[13px] text-text2 mb-3">
                    Browse stays, experiences, events and more across the country.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/events-in-kenya" className="px-3 py-1.5 rounded-full bg-purple-600/10 text-purple-600 text-[12px] font-semibold hover:bg-purple-600/20 transition-colors">
                      Events
                    </Link>
                    <Link href="/stays" className="px-3 py-1.5 rounded-full bg-amber/10 text-amber text-[12px] font-semibold hover:bg-amber/20 transition-colors">
                      Stays
                    </Link>
                    <Link href="/experiences" className="px-3 py-1.5 rounded-full bg-emerald-600/10 text-emerald-600 text-[12px] font-semibold hover:bg-emerald-600/20 transition-colors">
                      Experiences
                    </Link>
                    <Link href="/destinations" className="px-3 py-1.5 rounded-full bg-blue-600/10 text-blue-600 text-[12px] font-semibold hover:bg-blue-600/20 transition-colors">
                      Destinations
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Become a host CTA */}
            <div className="relative rounded-2xl overflow-hidden p-6"
              style={{
                background: "linear-gradient(135deg, #16130C 0%, #2d2520 100%)",
              }}
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: "radial-gradient(ellipse 80% 80% at 100% 100%, rgba(232,160,32,0.3) 0%, transparent 60%)",
                }}
              />
              <div className="relative z-10">
                <h3 className="text-[17px] font-bold text-white mb-1">
                  Own a business or organise events?
                </h3>
                <p className="text-[13px] text-white/50 mb-4 leading-[1.6]">
                  List your place or create events on Klickenya — let the world find what you&apos;ve built.
                </p>
                <Link
                  href="/become-a-host"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber text-dark text-[13px] font-bold hover:bg-amber2 transition-colors"
                >
                  Become a host
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══ BOOKINGS TAB ═══ */}
        {activeTab === "bookings" && (
          <div>
            {bookings.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No bookings yet"
                description="Once a host confirms your enquiry, your booking will appear here with full details."
                ctaLabel="Browse stays"
                ctaHref="/stays"
              />
            ) : (
              <div className="space-y-4">
                {bookings.map((b) => {
                  const prop = Array.isArray(b.property) ? b.property[0] : b.property;
                  const room = Array.isArray(b.room) ? b.room[0] : b.room;
                  const fees = b.booking_fees ?? [];
                  const payments = b.booking_payments ?? [];
                  const balance = b.balance_kes ?? (b.total_kes - b.amount_paid_kes);
                  const bBadge = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.confirmed;
                  const pBadge = PAYMENT_STATUS[b.payment_status] ?? PAYMENT_STATUS.pending;
                  return (
                    <div key={b.id} className="rounded-2xl border border-border bg-white overflow-hidden">
                      {/* Card header */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-dark truncate">{prop?.name ?? "Property"}</p>
                            <p className="text-[13px] text-text3 mt-0.5">{room?.name ?? "Room"}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${bBadge.className}`}>
                              {bBadge.label}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${pBadge.className}`}>
                              {pBadge.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-dark">
                          <span><span className="text-text3">In:</span> {fmtDate(b.check_in_date)}</span>
                          <span><span className="text-text3">Out:</span> {fmtDate(b.check_out_date)}</span>
                          <span className="text-text3">{b.nights}n · {b.guest_count} guest{b.guest_count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
                          <span><span className="text-text3">Total:</span> <span className="font-semibold">{fmtKes(b.total_kes)}</span></span>
                          <span><span className="text-text3">Paid:</span> <span className="font-semibold text-[#22C55E]">{fmtKes(b.amount_paid_kes)}</span></span>
                          {balance > 0 && <span><span className="text-text3">Balance:</span> <span className="font-semibold text-red-600">{fmtKes(balance)}</span></span>}
                        </div>
                      </div>
                      {/* Expandable breakdown */}
                      <details className="group">
                        <summary className="flex items-center gap-1.5 px-5 py-3 border-t border-border text-[12px] font-medium text-text3 hover:text-dark cursor-pointer transition-colors select-none list-none">
                          <svg className="size-3.5 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                          Full breakdown · Ref {b.id.slice(0, 8).toUpperCase()}
                        </summary>
                        <div className="px-5 pb-5 pt-3 border-t border-border space-y-3 text-[13px]">
                          <div className="space-y-1.5">
                            <div className="flex justify-between"><span className="text-text3">{fmtKes(b.rate_per_night)} × {b.nights}n</span><span>{fmtKes(b.subtotal_kes)}</span></div>
                            {b.discount_kes > 0 && <div className="flex justify-between"><span className="text-[#22C55E]">Discount</span><span className="text-[#22C55E]">−{fmtKes(b.discount_kes)}</span></div>}
                            {fees.map((f, i) => <div key={i} className="flex justify-between"><span className="text-text3">{f.name}</span><span>{fmtKes(f.amount_kes)}</span></div>)}
                            {(b.extras_kes ?? 0) > 0 && <div className="flex justify-between"><span className="text-text3">Extras</span><span>{fmtKes(b.extras_kes!)}</span></div>}
                            <div className="flex justify-between font-semibold border-t border-border pt-1.5"><span>Total</span><span>{fmtKes(b.total_kes)}</span></div>
                            <div className="flex justify-between"><span className="text-text3">Paid</span><span className="text-[#22C55E] font-medium">{fmtKes(b.amount_paid_kes)}</span></div>
                            {balance > 0 && <div className="flex justify-between font-semibold"><span className="text-red-600">Balance due</span><span className="text-red-600">{fmtKes(balance)}</span></div>}
                            {payments.length > 0 && (
                              <div className="border-t border-border pt-2 space-y-1">
                                <p className="text-[11px] text-text3 uppercase tracking-wider font-medium">Payments</p>
                                {payments.map((p, i) => (
                                  <div key={i} className="flex justify-between text-[12px]">
                                    <span className="text-text3">
                                      {p.method ?? "cash"} · {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                    <span className="text-[#22C55E] font-medium">{fmtKes(p.amount_kes)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {prop && (prop.address || prop.check_in_time) && (
                            <div className="pt-1 space-y-1 text-text3">
                              {prop.address && <p>{prop.address}</p>}
                              {prop.check_in_time && <p>Check-in from {prop.check_in_time}</p>}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ EVENTS TAB ═══ */}
        {activeTab === "events" && (
          <div>
            {rsvps.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No events yet"
                description="Browse events happening across Kenya — join the ones you like and they'll show up here."
                ctaLabel="Browse events"
                ctaHref="/events-in-kenya"
              />
            ) : (
              <div className="space-y-6">
                {goingEvents.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-bold text-text3 uppercase tracking-wide mb-3">Going</h3>
                    <div className="space-y-3">
                      {goingEvents.map((r) => <RsvpCard key={r.id} rsvp={r} />)}
                    </div>
                  </div>
                )}
                {interestedEvents.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-bold text-text3 uppercase tracking-wide mb-3">Interested</h3>
                    <div className="space-y-3">
                      {interestedEvents.map((r) => <RsvpCard key={r.id} rsvp={r} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ ENQUIRIES TAB ═══ */}
        {activeTab === "enquiries" && (
          <div>
            {enquiries.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No enquiries yet"
                description="When you contact a host about a stay, experience or service, it'll show up here."
                ctaLabel="Browse listings"
                ctaHref="/stays"
              />
            ) : (
              <div className="space-y-3">
                {enquiries.map((e) => {
                  const badge = ENQUIRY_STATUS[e.calendar_status ?? "pending"] ?? ENQUIRY_STATUS.pending;
                  const nights = e.check_in && e.check_out
                    ? Math.max(1, Math.ceil((new Date(e.check_out + "T00:00:00").getTime() - new Date(e.check_in + "T00:00:00").getTime()) / 86_400_000))
                    : null;
                  return (
                    <div key={e.id} className="rounded-2xl border border-border bg-white p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-dark truncate">
                            {e.listing_title ?? "Listing"}
                          </p>
                          <p className="text-[11px] text-text3 mt-0.5">
                            {new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      {e.check_in && e.check_out && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text3">
                          <span>{fmtDate(e.check_in)} → {fmtDate(e.check_out)}</span>
                          {nights ? <span>{nights}n{e.guests ? ` · ${e.guests} guest${e.guests !== 1 ? "s" : ""}` : ""}</span> : null}
                        </div>
                      )}
                      {e.calendar_status === "converted" && (
                        <button onClick={() => setActiveTab("bookings")} className="text-[12px] font-medium text-[#22C55E] hover:underline">
                          View booking →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ SAVED TAB ═══ */}
        {activeTab === "saved" && (
          <div>
            {savedRows.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No saved listings yet"
                description="Heart any listing to save it here — stays, restaurants, experiences and more."
                ctaLabel="Start exploring"
                ctaHref="/"
              />
            ) : (
              <div className="space-y-3">
                {savedRows.map((row) => {
                  const listing = sanityListings.get(row.sanity_listing_id);
                  return (
                    <div key={row.id} className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 hover:shadow-sm transition-shadow">
                      {/* Thumbnail */}
                      <div className="relative size-14 rounded-xl overflow-hidden shrink-0 bg-[#F5F3F0]">
                        {listing?.photo ? (
                          <img
                            src={`${listing.photo}?w=112&h=112&fit=crop&auto=format`}
                            alt={listing.title ?? ""}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center">
                            <Heart className="size-5 text-text3" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-dark truncate">
                          {listing?.title ?? "Loading..."}
                        </p>
                        <div className="flex items-center gap-2 text-[12px] text-text3 mt-0.5">
                          {listing?.listingType && (
                            <span className="capitalize">{listing.listingType}</span>
                          )}
                          {listing?.city && (
                            <>
                              <span className="text-border">·</span>
                              <span>{listing.city}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {listing?.slug && listing?.listingType && listing?.city && (
                          <Link
                            href={`/${listing.listingType}s/${listing.city.toLowerCase().replace(/\s+/g, "-")}/${listing.slug}`}
                            className="px-3 py-1.5 rounded-lg bg-amber/10 text-amber text-[12px] font-semibold hover:bg-amber/20 transition-colors"
                          >
                            View
                          </Link>
                        )}
                        <button
                          onClick={() => handleUnsave(row.sanity_listing_id)}
                          className="size-8 rounded-lg flex items-center justify-center text-text3 hover:bg-red-50 hover:text-red-500 transition-colors"
                          aria-label="Remove from saved"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────── */

function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  icon: typeof User;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center">
      <div className="size-14 rounded-2xl bg-[#F5F3F0] flex items-center justify-center mx-auto mb-4">
        <Icon className="size-6 text-text3" />
      </div>
      <p className="text-[16px] font-semibold text-dark mb-1">{title}</p>
      <p className="text-[13px] text-text3 max-w-[320px] mx-auto leading-[1.6]">
        {description}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 rounded-full bg-amber text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors"
        >
          {ctaLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

function RsvpCard({ rsvp }: { rsvp: Rsvp }) {
  const citySlug = (rsvp.event_city ?? "").toLowerCase().replace(/\s+/g, "-");
  const eventDate = rsvp.event_date
    ? new Date(rsvp.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="size-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
        <Calendar className="size-5 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-dark truncate">{rsvp.event_title}</p>
        <div className="flex items-center gap-2 text-[12px] text-text3 mt-0.5">
          {eventDate && <span>{eventDate}</span>}
          {rsvp.event_city && (
            <>
              <span className="text-border">·</span>
              <span>{rsvp.event_city}</span>
            </>
          )}
        </div>
      </div>
      {rsvp.event_slug && (
        <Link
          href={`/events/${citySlug}/${rsvp.event_slug}`}
          className="px-3 py-1.5 rounded-lg bg-amber/10 text-amber text-[12px] font-semibold hover:bg-amber/20 transition-colors shrink-0"
        >
          View
        </Link>
      )}
    </div>
  );
}
