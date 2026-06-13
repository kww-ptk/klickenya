import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChefHat, CalendarCheck, UtensilsCrossed, ShoppingCart, Settings as SettingsIcon, ExternalLink, QrCode } from "lucide-react";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import {
  LISTING_FEATURES,
  type FeatureContext,
} from "./_lib/features.config";

/**
 * /dashboard/listings/[id] — restaurant overview.
 *
 * Lean three-section layout (promoted from the /eat prototype):
 *   1. KPI strip — pending reservations · scans this week · active features
 *   2. Active features grid — clickable cards into each tab
 *   3. Quick links — view live menu, QR, manage features
 *
 * Replaces the legacy overview which had "coming soon" tiles + duplicated
 * tools sections. Page targets the question: "what needs my attention today?"
 */
export default async function ListingOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user } = await getAuthUser();
  if (!user) redirect(`/login?returnTo=/dashboard/listings/${id}`);

  const isAdmin = await getIsAdmin(user.id);
  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  // Dual restaurant check (type OR subcategory) so legacy Napule-style
  // listings are recognised. Layout already enforces this; we re-check here
  // because page params are independent of the layout.
  const listing = await sanityClient.fetch<{
    slug: string;
    city: string | null;
  } | null>(
    isAdmin
      ? `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants")][0]{ "slug": slug.current, city }`
      : `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants") && (hostId == $userId || host._ref == $sanityHostId)][0]{
          "slug": slug.current, city
        }`,
    {
      id,
      userId: user.id,
      sanityHostId: hostProfile?.sanity_host_id ?? "",
    },
  );

  if (!listing?.slug) notFound();

  // Resolve menu + reservation pending count + scan count in parallel.
  let menu: {
    id: string;
    slug: string;
    table_ordering: boolean;
    reservations_enabled: boolean;
    ordering_enabled: boolean;
    takeaway_enabled: boolean;
    delivery_enabled: boolean;
    stock_enabled: boolean;
  } | null = null;

  let menuQuery = adminClient
    .from("menus")
    .select(
      "id, slug, table_ordering, reservations_enabled, ordering_enabled, takeaway_enabled, delivery_enabled, stock_enabled",
    )
    .eq("listing_slug", listing.slug);
  if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);
  const menuRes = await menuQuery.maybeSingle();
  menu = menuRes.data;

  // KPI window — "scans this week" = last 7 days.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingReservationsRes, scanCountRes] = await Promise.allSettled([
    menu
      ? adminClient
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("menu_id", menu.id)
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    menu
      ? adminClient
          .from("menu_scans")
          .select("id", { count: "exact", head: true })
          .eq("menu_id", menu.id)
          .gte("scanned_at", sevenDaysAgo)
      : Promise.resolve({ count: 0 }),
  ]);

  const pendingReservations =
    pendingReservationsRes.status === "fulfilled"
      ? pendingReservationsRes.value.count ?? 0
      : 0;
  const scanCount =
    scanCountRes.status === "fulfilled"
      ? scanCountRes.value.count ?? 0
      : 0;

  const featureCtx: FeatureContext = {
    listingType: "restaurant",
    menu: menu
      ? {
          id: menu.id,
          table_ordering: menu.table_ordering ?? false,
          reservations_enabled: menu.reservations_enabled ?? false,
          ordering_enabled: menu.ordering_enabled ?? false,
          takeaway_enabled: menu.takeaway_enabled ?? false,
          delivery_enabled: menu.delivery_enabled ?? false,
          stock_enabled: menu.stock_enabled ?? false,
        }
      : undefined,
  };

  const activeFeatures = LISTING_FEATURES.filter(
    (f) => f.appliesTo.includes("restaurant") && f.getStatus(featureCtx) === "active",
  );
  const activeFeatureCount = activeFeatures.length;
  const availableFeatureCount = LISTING_FEATURES.filter((f) =>
    f.appliesTo.includes("restaurant"),
  ).length;

  // Icon map — features.config.icon names map to lucide imports.
  const ICONS: Record<string, typeof ChefHat> = {
    UtensilsCrossed,
    ShoppingCart,
    CalendarCheck,
    ChefHat,
  };

  const baseHref = `/dashboard/listings/${id}`;

  // Where each feature's primary tab lives.
  const featureHref: Record<string, string> = {
    menu: `${baseHref}/menu`,
    reservations: `${baseHref}/reservations`,
    table_ordering: `${baseHref}/orders`,
    klickenya_kitchen: `${baseHref}/kitchen`,
  };

  return (
    <div className="space-y-5">
      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
        {/* Pending reservations */}
        {menu?.reservations_enabled ? (
          <Link
            href={`${baseHref}/reservations`}
            className={`rounded-xl lg:rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
              pendingReservations > 0
                ? "bg-[#E8A020]/[0.06] border-[#E8A020]/30"
                : "bg-white border-[#E2DDD5]"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[11px] font-semibold text-[#9C9485] uppercase tracking-wide">
                Pending reservations
              </p>
              {pendingReservations > 0 && (
                <span className="size-1.5 rounded-full bg-[#E8A020] animate-pulse" />
              )}
            </div>
            <p className={`font-display text-[26px] font-bold tracking-[-0.02em] leading-none ${
              pendingReservations > 0 ? "text-[#E8A020]" : "text-[#16130C]"
            }`}>
              {pendingReservations}
            </p>
          </Link>
        ) : (
          <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-[#9C9485] uppercase tracking-wide mb-1">
              Pending reservations
            </p>
            <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-[#9C9485] leading-none">
              —
            </p>
            <p className="text-[11px] text-[#9C9485] mt-1">Reservations off</p>
          </div>
        )}

        {/* Scans this week */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-[#9C9485] uppercase tracking-wide mb-1">
            Menu scans this week
          </p>
          <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-[#16130C] leading-none">
            {scanCount}
          </p>
        </div>

        {/* Active features */}
        <Link
          href={`${baseHref}/features`}
          className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-[11px] font-semibold text-[#9C9485] uppercase tracking-wide mb-1">
            Active features
          </p>
          <p className="font-display text-[26px] font-bold tracking-[-0.02em] text-[#16130C] leading-none">
            {activeFeatureCount}
            <span className="text-[16px] text-[#9C9485] font-semibold">
              /{availableFeatureCount}
            </span>
          </p>
          <div className="mt-2 h-1.5 bg-[#F4F1EC] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E8A020] rounded-full transition-all"
              style={{
                width: `${availableFeatureCount > 0 ? (activeFeatureCount / availableFeatureCount) * 100 : 0}%`,
              }}
            />
          </div>
        </Link>
      </div>

      {/* ── Active features grid ── */}
      {menu && activeFeatures.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-[#9C9485] uppercase tracking-wide">
            Active features
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeFeatures.map((f) => {
              const Icon = ICONS[f.icon] ?? UtensilsCrossed;
              const href = featureHref[f.id] ?? `${baseHref}/features`;
              return (
                <Link
                  key={f.id}
                  href={href}
                  className="flex items-center gap-3 bg-white rounded-xl border border-[#E2DDD5] p-3.5 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all"
                >
                  <Icon className="size-5 text-[#5E5848] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#16130C]">{f.label}</p>
                    <p className="text-[11px] text-[#9C9485] truncate">
                      {f.shortDescription}
                    </p>
                  </div>
                  <span className="text-[#9C9485] text-[16px] shrink-0">›</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tools ── */}
      {menu && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-text3 uppercase tracking-wide">
            Tools
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href={`/m/${menu.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white rounded-xl border border-[#E2DDD5] p-3.5 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all"
            >
              <ExternalLink className="size-5 text-[#5E5848] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#16130C]">View live menu</p>
                <p className="text-[11px] text-[#9C9485] truncate">
                  Opens what guests see, in a new tab
                </p>
              </div>
            </Link>
            <Link
              href={`/dashboard/menu/${menu.id}/qr`}
              className="flex items-center gap-3 bg-white rounded-xl border border-[#E2DDD5] p-3.5 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all"
            >
              <QrCode className="size-5 text-[#5E5848] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#16130C]">QR code</p>
                <p className="text-[11px] text-[#9C9485] truncate">
                  Download printable QR codes for tables
                </p>
              </div>
            </Link>
            <Link
              href={`${baseHref}/features`}
              className="flex items-center gap-3 bg-white rounded-xl border border-[#E2DDD5] p-3.5 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all"
            >
              <SettingsIcon className="size-5 text-[#5E5848] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#16130C]">Manage features</p>
                <p className="text-[11px] text-[#9C9485] truncate">
                  Turn on reservations, ordering, kitchen, and more
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── No menu yet ── */}
      {!menu && (
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
          <p className="font-display text-[18px] font-bold text-[#16130C] mb-1">
            No menu yet
          </p>
          <p className="text-[13px] text-[#9C9485] mb-4 max-w-[320px] mx-auto">
            Create a menu first — then reservations, ordering, kitchen, and POS unlock from this dashboard.
          </p>
          <Link
            href="/dashboard/menus"
            className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
          >
            Create menu →
          </Link>
        </div>
      )}
    </div>
  );
}
