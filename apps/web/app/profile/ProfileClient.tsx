"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Heart, Calendar, Mail, MapPin, ArrowRight, Globe, LogOut, Settings, Compass, X } from "lucide-react";
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
  message: string | null;
  created_at: string;
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
}

/* ── Tabs ─────────────────────────────────────────── */

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "events", label: "Events", icon: Calendar },
  { key: "enquiries", label: "Enquiries", icon: Mail },
  { key: "saved", label: "Saved", icon: Heart },
] as const;
type Tab = (typeof TABS)[number]["key"];

/* ── Location data ────────────────────────────────── */

const COUNTRIES: Record<string, string[]> = {
  Kenya: ["Watamu", "Kilifi", "Diani", "Nairobi", "Lamu", "Mombasa", "Malindi", "Nanyuki", "Nakuru"],
  Tanzania: ["Zanzibar", "Dar es Salaam", "Arusha"],
  Uganda: ["Kampala", "Entebbe", "Jinja"],
  Other: [],
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
}: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
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
        `*[_type == "listing" && _id in $ids]{ _id, title, "slug": slug.current, "listingType": type, city, "photo": photos[0] }`,
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
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── Hero header with gradient ── */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-[#16130C]" />
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
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-white/40 text-[13px] font-medium hover:text-white/70 transition-colors"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
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
              <div className="size-20 rounded-2xl bg-gradient-to-br from-[#E8A020] to-[#6B2D8B] flex items-center justify-center text-white text-[26px] font-bold border-2 border-white/20 shadow-lg">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[24px] font-bold text-white tracking-[-0.02em]">{name}</h1>
              <p className="text-[13px] text-white/40 mt-0.5">{email}</p>
              {locationDisplay && (
                <div className="flex items-center gap-1.5 mt-2">
                  <MapPin className="size-3.5 text-[#E8A020]" />
                  <span className="text-[13px] text-white/60 font-medium">{locationDisplay}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-6 mt-6">
            {[
              { label: "Events", value: rsvps.length, icon: Calendar },
              { label: "Enquiries", value: enquiries.length, icon: Mail },
              { label: "Saved", value: savedCount, icon: Heart },
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
      <div className="sticky top-0 z-20 bg-white border-b border-[#E2DDD5] shadow-sm -mt-10">
        <div className="max-w-[720px] mx-auto">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tab.key === "events" ? rsvps.length
                : tab.key === "enquiries" ? enquiries.length
                : tab.key === "saved" ? savedCount
                : 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-5 py-3.5 border-b-2 text-[13px] font-semibold whitespace-nowrap transition-colors shrink-0",
                    activeTab === tab.key
                      ? "border-[#E8A020] text-[#E8A020]"
                      : "border-transparent text-[#9C9485] hover:text-[#16130C]"
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      "ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                      activeTab === tab.key ? "bg-[#E8A020]/15 text-[#E8A020]" : "bg-[#E2DDD5] text-[#9C9485]"
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
            <div className="rounded-2xl border border-[#E2DDD5] bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <User className="size-4 text-[#9C9485]" />
                <label className="text-[12px] font-semibold text-[#9C9485] uppercase tracking-wide">
                  Display name
                </label>
              </div>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-[#E2DDD5] px-4 py-2.5 text-[14px] text-[#16130C] outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => { saveProfile({ displayName: name }); setEditingName(false); }}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-[#E8A020] text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors disabled:opacity-50"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => { setName(displayName); setEditingName(false); }}
                    className="px-3 py-2.5 rounded-xl border border-[#E2DDD5] text-[13px] font-medium text-[#9C9485] hover:bg-[#F5F3F0] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-semibold text-[#16130C]">{name}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-[12px] font-semibold text-[#E8A020] hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Location — country + city */}
            <div className="rounded-2xl border border-[#E2DDD5] bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="size-4 text-[#9C9485]" />
                <label className="text-[12px] font-semibold text-[#9C9485] uppercase tracking-wide">
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
                  className="w-full rounded-xl border border-[#E2DDD5] px-4 py-2.5 text-[14px] text-[#16130C] outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white transition-all appearance-none"
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
                    className="w-full rounded-xl border border-[#E2DDD5] px-4 py-2.5 text-[14px] text-[#16130C] outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] bg-white transition-all appearance-none"
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
                    className="w-full rounded-xl border border-[#E2DDD5] px-4 py-2.5 text-[14px] text-[#16130C] outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all"
                  />
                ) : null}
              </div>
            </div>

            {/* Email */}
            <div className="rounded-2xl border border-[#E2DDD5] bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="size-4 text-[#9C9485]" />
                <label className="text-[12px] font-semibold text-[#9C9485] uppercase tracking-wide">
                  Email
                </label>
              </div>
              <p className="text-[16px] text-[#16130C]">{email}</p>
            </div>

            {/* Explore CTA */}
            <div className="rounded-2xl border border-[#E2DDD5] bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-xl bg-purple-600/10 flex items-center justify-center shrink-0">
                  <Compass className="size-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-[#16130C] mb-0.5">
                    Discover Kenya
                  </h3>
                  <p className="text-[13px] text-[#5E5848] mb-3">
                    Browse stays, experiences, events and more across the country.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/events-in-kenya" className="px-3 py-1.5 rounded-full bg-purple-600/10 text-purple-600 text-[12px] font-semibold hover:bg-purple-600/20 transition-colors">
                      Events
                    </Link>
                    <Link href="/stays" className="px-3 py-1.5 rounded-full bg-[#E8A020]/10 text-[#E8A020] text-[12px] font-semibold hover:bg-[#E8A020]/20 transition-colors">
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E8A020] text-[#16130C] text-[13px] font-bold hover:bg-[#f5c842] transition-colors"
                >
                  Become a host
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
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
                    <h3 className="text-[13px] font-bold text-[#9C9485] uppercase tracking-wide mb-3">Going</h3>
                    <div className="space-y-3">
                      {goingEvents.map((r) => <RsvpCard key={r.id} rsvp={r} />)}
                    </div>
                  </div>
                )}
                {interestedEvents.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-bold text-[#9C9485] uppercase tracking-wide mb-3">Interested</h3>
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
                {enquiries.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-[#E2DDD5] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#16130C] truncate">
                          {e.listing_title ?? "Listing"}
                        </p>
                        {e.listing_type && (
                          <span className="text-[11px] text-[#9C9485] capitalize">{e.listing_type}</span>
                        )}
                        {e.message && (
                          <p className="text-[13px] text-[#5E5848] mt-1 line-clamp-2">{e.message}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-[#9C9485] whitespace-nowrap shrink-0">
                        {new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                ))}
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
                    <div key={row.id} className="flex items-center gap-4 rounded-2xl border border-[#E2DDD5] bg-white p-4 hover:shadow-sm transition-shadow">
                      {/* Thumbnail */}
                      <div className="relative size-14 rounded-xl overflow-hidden shrink-0 bg-[#F5F3F0]">
                        {listing?.photo ? (
                          <Image
                            src={`${listing.photo}?w=112&h=112&fit=crop&auto=format`}
                            alt={listing.title ?? ""}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center">
                            <Heart className="size-5 text-[#9C9485]" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#16130C] truncate">
                          {listing?.title ?? "Loading..."}
                        </p>
                        <div className="flex items-center gap-2 text-[12px] text-[#9C9485] mt-0.5">
                          {listing?.listingType && (
                            <span className="capitalize">{listing.listingType}</span>
                          )}
                          {listing?.city && (
                            <>
                              <span className="text-[#E2DDD5]">·</span>
                              <span>{listing.city}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {listing?.slug && listing?.listingType && (
                          <Link
                            href={`/listings/${listing.listingType}/${listing.slug}`}
                            className="px-3 py-1.5 rounded-lg bg-[#E8A020]/10 text-[#E8A020] text-[12px] font-semibold hover:bg-[#E8A020]/20 transition-colors"
                          >
                            View
                          </Link>
                        )}
                        <button
                          onClick={() => handleUnsave(row.sanity_listing_id)}
                          className="size-8 rounded-lg flex items-center justify-center text-[#9C9485] hover:bg-red-50 hover:text-red-500 transition-colors"
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
    <div className="rounded-2xl border border-dashed border-[#E2DDD5] bg-white p-12 text-center">
      <div className="size-14 rounded-2xl bg-[#F5F3F0] flex items-center justify-center mx-auto mb-4">
        <Icon className="size-6 text-[#9C9485]" />
      </div>
      <p className="text-[16px] font-semibold text-[#16130C] mb-1">{title}</p>
      <p className="text-[13px] text-[#9C9485] max-w-[320px] mx-auto leading-[1.6]">
        {description}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 rounded-full bg-[#E8A020] text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors"
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
    <div className="flex items-center gap-4 rounded-2xl border border-[#E2DDD5] bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="size-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
        <Calendar className="size-5 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#16130C] truncate">{rsvp.event_title}</p>
        <div className="flex items-center gap-2 text-[12px] text-[#9C9485] mt-0.5">
          {eventDate && <span>{eventDate}</span>}
          {rsvp.event_city && (
            <>
              <span className="text-[#E2DDD5]">·</span>
              <span>{rsvp.event_city}</span>
            </>
          )}
        </div>
      </div>
      {rsvp.event_slug && (
        <Link
          href={`/events/${citySlug}/${rsvp.event_slug}`}
          className="px-3 py-1.5 rounded-lg bg-[#E8A020]/10 text-[#E8A020] text-[12px] font-semibold hover:bg-[#E8A020]/20 transition-colors shrink-0"
        >
          View
        </Link>
      )}
    </div>
  );
}
