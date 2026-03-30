"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Heart, Calendar, Mail, MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardSignOut } from "@/app/dashboard/_components/DashboardSignOut";

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

interface ProfileClientProps {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  location: string | null;
  savedCount: number;
  rsvps: Rsvp[];
  enquiries: Enquiry[];
}

/* ── Tabs ─────────────────────────────────────────── */

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "enquiries", label: "Enquiries", icon: Mail },
  { key: "saved", label: "Saved", icon: Heart },
  { key: "events", label: "Events", icon: Calendar },
] as const;
type Tab = (typeof TABS)[number]["key"];

/* ── Cities ───────────────────────────────────────── */

const CITIES = ["Watamu", "Kilifi", "Diani", "Nairobi", "Lamu", "Mombasa", "Malindi"];

/* ── Component ────────────────────────────────────── */

export function ProfileClient({
  userId,
  displayName,
  email,
  avatarUrl,
  location,
  savedCount,
  rsvps,
  enquiries,
}: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(displayName);
  const [userLocation, setUserLocation] = useState(location ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const goingEvents = rsvps.filter((r) => r.status === "going");
  const interestedEvents = rsvps.filter((r) => r.status === "interested");

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, location: userLocation }),
      });
      setEditingName(false);
      router.refresh();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-[#16130C] pt-8 pb-16 px-5">
        <div className="max-w-[640px] mx-auto">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="size-16 rounded-full object-cover border-2 border-white/20"
              />
            ) : (
              <div className="size-16 rounded-full bg-gradient-to-br from-[#E8A020] to-[#6B2D8B] flex items-center justify-center text-white text-[20px] font-bold border-2 border-white/20">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-[22px] font-bold text-white">{name}</h1>
              <p className="text-[13px] text-white/50">{email}</p>
              {userLocation && (
                <div className="flex items-center gap-1 mt-1 text-[12px] text-white/40">
                  <MapPin className="size-3" />
                  <span>{userLocation}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E2DDD5] -mt-8">
        <div className="max-w-[640px] mx-auto flex overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 border-b-2 text-[13px] font-semibold whitespace-nowrap transition-colors shrink-0",
                  activeTab === tab.key
                    ? "border-[#E8A020] text-[#E8A020]"
                    : "border-transparent text-[#9C9485] hover:text-[#16130C]"
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[640px] mx-auto px-5 py-8">

        {/* ═══ PROFILE TAB ═══ */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Name */}
            <div className="rounded-xl border border-[#E2DDD5] bg-white p-5">
              <label className="block text-[12px] font-semibold text-[#9C9485] uppercase tracking-wide mb-2">
                Display name
              </label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-[#E2DDD5] px-3 py-2 text-[14px] text-[#16130C] outline-none focus:ring-2 focus:ring-[#E8A020]/40"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-[#E8A020] text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-medium text-[#16130C]">{name}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-[12px] font-semibold text-[#E8A020] hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="rounded-xl border border-[#E2DDD5] bg-white p-5">
              <label className="block text-[12px] font-semibold text-[#9C9485] uppercase tracking-wide mb-2">
                Where are you based?
              </label>
              <select
                value={userLocation}
                onChange={(e) => {
                  setUserLocation(e.target.value);
                  // Auto-save location
                  fetch("/api/profile/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ displayName: name, location: e.target.value }),
                  });
                }}
                className="w-full rounded-lg border border-[#E2DDD5] px-3 py-2.5 text-[14px] text-[#16130C] outline-none focus:ring-2 focus:ring-[#E8A020]/40 bg-white"
              >
                <option value="">Select a city…</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="rounded-xl border border-[#E2DDD5] bg-white p-5">
              <label className="block text-[12px] font-semibold text-[#9C9485] uppercase tracking-wide mb-2">
                Email
              </label>
              <p className="text-[15px] text-[#16130C]">{email}</p>
            </div>

            {/* Become a host CTA */}
            <div className="rounded-xl border border-[#E8A020]/30 bg-[#E8A020]/5 p-6">
              <h3 className="text-[16px] font-bold text-[#16130C] mb-1">
                Do you own a business or organise events?
              </h3>
              <p className="text-[13px] text-[#5E5848] mb-4">
                List your place or add your events on Klickenya — reach thousands of visitors and locals.
              </p>
              <Link
                href="/become-a-host"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E8A020] text-white text-[14px] font-semibold hover:bg-[#d4911c] transition-colors"
              >
                Become a host
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Sign out */}
            <div className="pt-4">
              <DashboardSignOut />
            </div>
          </div>
        )}

        {/* ═══ ENQUIRIES TAB ═══ */}
        {activeTab === "enquiries" && (
          <div>
            {enquiries.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No enquiries yet"
                description="Browse listings and get in touch with hosts. Your enquiry history will appear here."
              />
            ) : (
              <div className="space-y-3">
                {enquiries.map((e) => (
                  <div key={e.id} className="rounded-xl border border-[#E2DDD5] bg-white p-4">
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
          <EmptyState
            icon={Heart}
            title="No saved listings yet"
            description="Heart any listing to save it here. Browse stays, experiences and more."
          />
        )}

        {/* ═══ EVENTS TAB ═══ */}
        {activeTab === "events" && (
          <div>
            {rsvps.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No events yet"
                description="Browse events and join ones you're interested in. They'll appear here."
                ctaLabel="Browse events"
                ctaHref="/events-in-kenya"
              />
            ) : (
              <div className="space-y-6">
                {goingEvents.length > 0 && (
                  <div>
                    <h3 className="text-[14px] font-bold text-[#16130C] mb-3">Going</h3>
                    <div className="space-y-3">
                      {goingEvents.map((r) => (
                        <RsvpCard key={r.id} rsvp={r} />
                      ))}
                    </div>
                  </div>
                )}
                {interestedEvents.length > 0 && (
                  <div>
                    <h3 className="text-[14px] font-bold text-[#16130C] mb-3">Interested</h3>
                    <div className="space-y-3">
                      {interestedEvents.map((r) => (
                        <RsvpCard key={r.id} rsvp={r} />
                      ))}
                    </div>
                  </div>
                )}
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
    <div className="rounded-xl border border-dashed border-[#E2DDD5] bg-white p-10 text-center">
      <Icon className="size-10 text-[#9C9485] mx-auto mb-3" />
      <p className="text-[15px] font-semibold text-[#16130C] mb-1">{title}</p>
      <p className="text-[13px] text-[#9C9485] max-w-[300px] mx-auto">
        {description}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-full bg-[#E8A020] text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors"
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
    <div className="flex items-center gap-4 rounded-xl border border-[#E2DDD5] bg-white p-4">
      <div className="size-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
        <Calendar className="size-5 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#16130C] truncate">{rsvp.event_title}</p>
        <div className="flex items-center gap-2 text-[12px] text-[#9C9485] mt-0.5">
          {eventDate && <span>{eventDate}</span>}
          {rsvp.event_city && <span>{rsvp.event_city}</span>}
        </div>
      </div>
      {rsvp.event_slug && (
        <Link
          href={`/events/${citySlug}/${rsvp.event_slug}`}
          className="text-[12px] font-semibold text-[#E8A020] hover:underline shrink-0"
        >
          View
        </Link>
      )}
    </div>
  );
}
