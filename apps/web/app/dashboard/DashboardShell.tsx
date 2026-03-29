"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { imageUrl } from "@/lib/sanity/image";
import { cn } from "@/lib/utils";

/* ---------- Types ---------- */

interface Listing {
  _id: string;
  title: string;
  slug: string;
  type: string;
  city: string | null;
  coverPhoto: unknown;
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

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  basic: { bg: "bg-[#E8A020]/15", text: "text-[#E8A020]" },
  pro: { bg: "bg-[#6B2D8B]/15", text: "text-[#6B2D8B]" },
  agency: { bg: "bg-[#6B2D8B]/15", text: "text-[#6B2D8B]" },
  grow: { bg: "bg-[#0D7377]/15", text: "text-[#0D7377]" },
};

function listingUrl(listing: Listing): string {
  const typeSlug =
    listing.type === "experience"
      ? "experiences"
      : listing.type + "s";
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
  const plan = PLAN_COLORS[planTier] ?? PLAN_COLORS.basic;

  const verifiedCount = listings.filter((l) => l.isVerified).length;
  const pendingCount = listings.length - verifiedCount;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] pb-[env(safe-area-inset-bottom)]">
      {/* ── Dark header ── */}
      <div className="bg-[#16130C] px-5 pt-[max(env(safe-area-inset-top),20px)] pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-[24px] font-bold tracking-[-0.03em] text-white">
              Hi, {firstName} 👋
            </h1>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                  plan.bg,
                  plan.text
                )}
              >
                {planTier}
              </span>
              {planTier === "basic" && (
                <Link
                  href="/pricing"
                  className="text-[12px] text-[#E8A020] font-medium hover:underline"
                >
                  Upgrade
                </Link>
              )}
            </div>
          </div>
          <p className="text-[13px] text-white/40">
            Manage your listings and account
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 -mt-3">
        {/* ── Password banner ── */}
        {showPasswordBanner && (
          <Link
            href="/reset-password"
            className="block mb-4 bg-[#FDF8F0] border border-[#E8A020] rounded-2xl p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#16130C]">
                  Set a permanent password
                </p>
                <p className="text-[12px] text-[#5E5848] mt-0.5">
                  You&apos;re using a temporary password
                </p>
              </div>
              <span className="text-[#E8A020] font-bold text-[13px] shrink-0">
                →
              </span>
            </div>
          </Link>
        )}

        {/* ── Quick stats ── */}
        <div className="flex gap-2 mb-6 mt-4">
          {[
            { label: "Total", value: listings.length },
            { label: "Verified", value: verifiedCount, color: "text-[#16A34A]" },
            { label: "Pending", value: pendingCount, color: "text-[#E8A020]" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 bg-white rounded-2xl border border-[#E2DDD5] p-4 text-center"
            >
              <p
                className={cn(
                  "text-[22px] font-bold tracking-[-0.02em]",
                  stat.color ?? "text-[#16130C]"
                )}
              >
                {stat.value}
              </p>
              <p className="text-[11px] text-[#9C9485] font-medium mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── My Listings ── */}
        <div className="mb-6">
          <h2 className="text-[16px] font-bold text-[#16130C] mb-3">
            My Listings
          </h2>

          {listings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center">
              <div className="text-[36px] mb-3">📋</div>
              <p className="text-[15px] font-semibold text-[#16130C] mb-1">
                No listings yet
              </p>
              <p className="text-[13px] text-[#9C9485] mb-4">
                Claim your first listing to get started
              </p>
              <Link
                href="/"
                className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[14px] px-6 py-3 rounded-full active:scale-[0.97] transition-transform"
              >
                Claim a listing →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div
                  key={listing._id}
                  className="bg-white rounded-2xl border border-[#E2DDD5] p-4 flex gap-4 items-start"
                >
                  {/* Thumbnail */}
                  <div className="shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-[#F4F1EC]">
                    {listing.coverPhoto ? (
                      <Image
                        src={imageUrl(listing.coverPhoto, 160)}
                        alt={listing.title}
                        width={72}
                        height={72}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[24px]">
                        🏠
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#16130C] truncate">
                      {listing.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-[#9C9485] capitalize">
                        {listing.type}
                      </span>
                      {listing.city && (
                        <>
                          <span className="text-[#E2DDD5]">·</span>
                          <span className="text-[12px] text-[#9C9485]">
                            {listing.city}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {listing.isVerified ? (
                        <span className="text-[11px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-1 rounded-full">
                          Verified
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#E8A020] bg-[#E8A020]/10 px-2.5 py-1 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex flex-col gap-2">
                    <Link
                      href={listingUrl(listing)}
                      className="text-[13px] font-semibold text-[#6B2D8B] bg-[#6B2D8B]/10 px-4 py-2.5 rounded-xl text-center min-w-[64px] active:scale-[0.96] transition-transform"
                    >
                      View
                    </Link>
                    <button
                      disabled
                      className="text-[13px] font-medium text-[#9C9485] bg-[#F4F1EC] px-4 py-2.5 rounded-xl text-center min-w-[64px] cursor-not-allowed"
                      title="Coming soon"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Account ── */}
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-5 mb-8">
          <h2 className="text-[16px] font-bold text-[#16130C] mb-4">
            Account
          </h2>
          <div className="space-y-3 mb-5">
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#9C9485]">Email</span>
              <span className="text-[14px] text-[#16130C] font-medium truncate ml-4">
                {email}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#9C9485]">Plan</span>
              <span className="text-[14px] text-[#16130C] font-medium capitalize">
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
    </div>
  );
}
