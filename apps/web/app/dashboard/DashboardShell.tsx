"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/* ---------- Types ---------- */

interface Listing {
  _id: string;
  title: string;
  slug: string;
  type: string;
  city: string | null;
  imageUrl: string | null;
  isVerified: boolean;
  verificationStatus: string;
}

interface DashboardShellProps {
  displayName: string;
  email: string;
  planTier: string;
  showPasswordBanner: boolean;
  listings: Listing[];
}

/* ---------- Helpers ---------- */

const PLAN_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  basic: { bg: "bg-[#E8A020]/10", text: "text-[#E8A020]", border: "border-[#E8A020]/30" },
  pro: { bg: "bg-[#6B2D8B]/10", text: "text-[#6B2D8B]", border: "border-[#6B2D8B]/30" },
  agency: { bg: "bg-[#6B2D8B]/10", text: "text-[#6B2D8B]", border: "border-[#6B2D8B]/30" },
  grow: { bg: "bg-[#0D7377]/10", text: "text-[#0D7377]", border: "border-[#0D7377]/30" },
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function listingUrl(listing: Listing): string {
  const typeSlug = listing.type === "experience" ? "experiences" : listing.type + "s";
  const citySlug = (listing.city ?? "").toLowerCase().replace(/ /g, "-");
  return `/${typeSlug}/${citySlug}/${listing.slug}`;
}

/* ---------- Component ---------- */

export function DashboardShell({
  displayName,
  email,
  planTier,
  showPasswordBanner,
  listings,
}: DashboardShellProps) {
  const router = useRouter();
  const firstName = displayName.split(/\s+/)[0];
  const plan = PLAN_STYLES[planTier] ?? PLAN_STYLES.basic;

  const verifiedCount = listings.filter((l) => l.isVerified).length;
  const pendingCount = listings.length - verifiedCount;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-[env(safe-area-inset-bottom,24px)]">
      {/* ═══ DARK HEADER ═══ */}
      <div className="relative bg-[#16130C] overflow-hidden">
        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "180px",
          }}
        />
        {/* Subtle amber glow */}
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-[#E8A020]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-5 pt-[max(env(safe-area-inset-top),24px)] pb-7">
          <div className="max-w-2xl mx-auto">
            {/* Greeting + plan */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-[26px] font-bold tracking-[-0.03em] text-white leading-tight">
                  {getGreeting()}, {firstName}
                </h1>
                <p className="text-[14px] text-white/35 mt-1">
                  Manage your listings
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border",
                    plan.bg, plan.text, plan.border
                  )}
                >
                  {planTier}
                </span>
                {planTier === "basic" && (
                  <Link
                    href="/pricing"
                    className="text-[12px] text-[#E8A020]/70 font-medium hover:text-[#E8A020] transition-colors"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
            </div>

            {/* Stat pills */}
            <div className="flex gap-3">
              {[
                { label: "Total", value: listings.length, color: "text-white" },
                { label: "Verified", value: verifiedCount, color: "text-[#16A34A]" },
                { label: "Pending", value: pendingCount, color: "text-[#F5C842]" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-2xl py-3.5 px-3 text-center backdrop-blur-sm"
                >
                  <p
                    className={cn(
                      "font-[family-name:var(--font-display)] text-[24px] font-bold tracking-[-0.02em] leading-none",
                      stat.color
                    )}
                  >
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-white/30 font-medium mt-1.5 uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ WHITE CONTENT ═══ */}
      <div className="max-w-2xl mx-auto px-5 pt-5">
        {/* ── Password banner ── */}
        {showPasswordBanner && (
          <Link
            href="/reset-password"
            className="flex items-center gap-3 mb-5 bg-[#FDF8F0] border-l-4 border-[#E8A020] rounded-xl p-4 active:scale-[0.99] transition-transform shadow-sm"
          >
            <div className="w-9 h-9 rounded-full bg-[#E8A020]/15 flex items-center justify-center shrink-0">
              <span className="text-[16px]">🔒</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#16130C]">
                Set a permanent password
              </p>
              <p className="text-[12px] text-[#5E5848] mt-0.5">
                Secure your host account
              </p>
            </div>
            <span className="text-[#E8A020] font-bold text-[16px] shrink-0">→</span>
          </Link>
        )}

        {/* ── My Listings ── */}
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[#16130C] tracking-[-0.02em] mb-3">
            My Listings
          </h2>

          {listings.length === 0 ? (
            /* Empty state */
            <div className="bg-white rounded-2xl border border-[#E2DDD5] p-10 text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-[36px]">🏡</span>
              </div>
              <p className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[#16130C] mb-1">
                No listings yet
              </p>
              <p className="text-[14px] text-[#9C9485] mb-6 max-w-[260px] mx-auto">
                Claim your first listing and start managing it from here
              </p>
              <Link
                href="/"
                className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[14px] px-7 h-[48px] leading-[48px] rounded-full active:scale-[0.97] transition-transform shadow-sm"
              >
                Claim a listing →
              </Link>
            </div>
          ) : (
            /* Listing cards */
            <div className="space-y-3">
              {listings.map((listing, i) => (
                <div
                  key={listing._id}
                  className="bg-white rounded-2xl border border-[#E2DDD5] p-4 shadow-sm animate-[fadeSlideUp_0.4s_ease_both]"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="shrink-0 w-[80px] h-[80px] rounded-xl overflow-hidden bg-[#F4F1EC]">
                      {listing.imageUrl ? (
                        <Image
                          src={listing.imageUrl}
                          alt={listing.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[28px] bg-gradient-to-br from-[#F4F1EC] to-[#E2DDD5]">
                          🏠
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className="text-[16px] font-semibold text-[#16130C] truncate leading-tight">
                        {listing.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[13px] text-[#9C9485] capitalize">
                          {listing.type}
                        </span>
                        {listing.city && (
                          <>
                            <span className="text-[#E2DDD5]">·</span>
                            <span className="text-[13px] text-[#9C9485]">
                              {listing.city}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-2">
                        {listing.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#16A34A] bg-[#16A34A]/8 px-2.5 py-1 rounded-full">
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#E8A020] bg-[#E8A020]/8 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E8A020]" />
                            Pending review
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#F4F1EC]">
                    <Link
                      href={listingUrl(listing)}
                      className="flex-1 h-[44px] flex items-center justify-center text-[14px] font-semibold text-[#6B2D8B] bg-[#6B2D8B]/8 rounded-xl active:scale-[0.97] transition-transform"
                    >
                      View listing →
                    </Link>
                    <button
                      disabled
                      className="flex-1 h-[44px] flex items-center justify-center text-[14px] font-medium text-[#9C9485] bg-[#F4F1EC] rounded-xl cursor-not-allowed"
                    >
                      Edit · Soon
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Account ── */}
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-5 mb-8 shadow-sm">
          <h2 className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[#16130C] tracking-[-0.02em] mb-4">
            Account
          </h2>
          <div className="space-y-3.5 mb-5">
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#9C9485]">Email</span>
              <span className="text-[14px] text-[#16130C] font-medium truncate ml-4 max-w-[220px]">
                {email}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#9C9485]">Plan</span>
              <span
                className={cn(
                  "text-[12px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                  plan.bg, plan.text, plan.border
                )}
              >
                {planTier}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full h-[48px] rounded-xl border border-[#E2DDD5] text-[14px] font-semibold text-[#16130C] active:bg-[#F4F1EC] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Animation keyframes ── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
