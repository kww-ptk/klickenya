import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Lock, UtensilsCrossed, ShoppingCart, CalendarCheck, ShoppingBag, Bike, ChefHat, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../../../dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import {
  LISTING_FEATURES,
  type FeatureContext,
  type FeatureStatus,
} from "../../../../dashboard/listings/[id]/_lib/features.config";
import { FeatureToggleRow } from "./FeatureToggleRow";

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingCart,
  CalendarCheck,
  ShoppingBag,
  Bike,
  ChefHat,
  Smartphone,
};

const STATUS_STYLES: Record<FeatureStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-[#16A34A]/10 text-[#16A34A]" },
  inactive: { label: "Off", className: "bg-[#F4F1EC] text-[#9C9485]" },
  coming_soon: { label: "Coming soon", className: "bg-[#E8A020]/10 text-[#E8A020]" },
  paid_coming_soon: { label: "Paid — coming soon", className: "bg-[#6B2D8B]/10 text-[#6B2D8B]" },
};

/**
 * /eat/listings/[id]/features
 *
 * The real switchboard. Replaces the legacy /dashboard/listings/[id]/features
 * placeholder ("coming soon — go to menu builder instead"). Lists every
 * feature the restaurant could enable, shows its current status, and renders
 * an inline toggle (live PATCH to /api/menu/settings) for the ones that have
 * a backend switch today.
 *
 * Read flow per feature:
 *   1. LISTING_FEATURES (single source of truth) gives the list + status
 *   2. menus row provides the toggle's current value
 *   3. FeatureToggleRow is a client component that PATCHes /api/menu/settings
 */
export default async function EatFeaturesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user } = await getAuthUser();
  if (!user) redirect(`/login?returnTo=/eat/listings/${id}/features`);

  const isAdmin = await getIsAdmin(user.id);
  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  const listing = await sanityClient.fetch<{ slug: string; city: string | null } | null>(
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

  let menuQuery = adminClient
    .from("menus")
    .select(
      "id, table_ordering, reservations_enabled, ordering_enabled, takeaway_enabled, delivery_enabled, stock_enabled",
    )
    .eq("listing_slug", listing.slug);
  if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);
  const { data: menu } = await menuQuery.maybeSingle();

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

  // Per-feature wiring: which menus column the toggle writes to, and where
  // "Configure" deep-links to once it's on. null = no toggle yet (coming
  // soon features are read-only with a Lock icon).
  function toggleColumnFor(featureId: string): string | null {
    switch (featureId) {
      case "table_ordering": return "table_ordering";
      case "takeaway":       return "takeaway_enabled";
      case "reservations":   return "reservations_enabled";
      case "klickenya_kitchen": return "stock_enabled";
      default: return null;
    }
  }
  function configureHrefFor(featureId: string): string | null {
    switch (featureId) {
      case "table_ordering": return `/eat/listings/${id}/orders`;
      case "takeaway":       return `/eat/listings/${id}/orders`;
      case "reservations":   return `/eat/listings/${id}/reservations`;
      case "klickenya_kitchen": return `/eat/listings/${id}/kitchen`;
      default: return null;
    }
  }

  const restaurantFeatures = LISTING_FEATURES.filter((f) =>
    f.appliesTo.includes(featureCtx.listingType),
  );

  // Menu is a synthesised "always-on" entry — not a toggle, but worth showing
  // in the list so the page covers every facet of the restaurant.
  const menuStatus: FeatureStatus = menu ? "active" : "inactive";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[18px] lg:text-[20px] font-bold tracking-[-0.02em] text-[#16130C]">
          Features
        </h2>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Switch capabilities on or off for this restaurant. Toggling takes effect immediately.
        </p>
      </div>

      <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] shadow-sm divide-y divide-[#F4F1EC]">
        {/* Menu — always-on, no toggle. Surfaced first so it anchors the page. */}
        <FeatureRow
          icon={UtensilsCrossed}
          label="Digital menu"
          shortDescription="Your live menu. QR-accessible for guests."
          statusBadge={menuStatus === "active" ? "active" : "inactive"}
          configureHref={menu ? `/eat/listings/${id}/menu` : null}
          toggleColumn={null}
          menuId={menu?.id ?? null}
          currentValue={!!menu}
          locked={!menu}
          lockedReason={menu ? undefined : "Create a menu first via /dashboard/menus"}
        />

        {restaurantFeatures.map((feature) => {
          const status = feature.getStatus(featureCtx);
          const Icon = ICON_MAP[feature.icon] ?? UtensilsCrossed;
          const toggleColumn = toggleColumnFor(feature.id);
          const configureHref = configureHrefFor(feature.id);
          const isComingSoon = status === "coming_soon" || status === "paid_coming_soon";
          const currentValue = (() => {
            if (!menu) return false;
            switch (feature.id) {
              case "table_ordering": return menu.table_ordering ?? false;
              case "takeaway": return menu.takeaway_enabled ?? false;
              case "reservations": return menu.reservations_enabled ?? false;
              case "klickenya_kitchen": return menu.stock_enabled ?? false;
              default: return false;
            }
          })();

          return (
            <FeatureRow
              key={feature.id}
              icon={Icon}
              label={feature.label}
              shortDescription={feature.shortDescription}
              statusBadge={status}
              configureHref={status === "active" ? configureHref : null}
              toggleColumn={toggleColumn}
              menuId={menu?.id ?? null}
              currentValue={currentValue}
              locked={!menu || isComingSoon}
              lockedReason={
                !menu
                  ? "Requires a menu"
                  : isComingSoon
                  ? STATUS_STYLES[status].label
                  : undefined
              }
            />
          );
        })}

        {/* POS — first-class concept that LISTING_FEATURES doesn't track yet. */}
        <FeatureRow
          icon={Smartphone}
          label="POS terminal"
          shortDescription="Tablet sign-in for waiters: take orders, settle bills, manage tables."
          statusBadge={menu ? "active" : "inactive"}
          configureHref={menu ? `/eat/listings/${id}/pos` : null}
          toggleColumn={null}
          menuId={null}
          currentValue={!!menu}
          locked={!menu}
          lockedReason={menu ? undefined : "Requires a menu"}
        />
      </div>

      {/* Honest note about preview status */}
      <div className="text-[11px] text-[#9C9485] flex items-center gap-1 justify-end">
        Tap a row to open its configure page. Toggles write to <code className="bg-[#F4F1EC] px-1 rounded">menus</code> via <code className="bg-[#F4F1EC] px-1 rounded">/api/menu/settings</code>.
      </div>
    </div>
  );
}

/* ── Single feature row (server-rendered scaffold + client toggle) ──────── */

function FeatureRow({
  icon: Icon,
  label,
  shortDescription,
  statusBadge,
  configureHref,
  toggleColumn,
  menuId,
  currentValue,
  locked,
  lockedReason,
}: {
  icon: LucideIcon;
  label: string;
  shortDescription: string;
  statusBadge: FeatureStatus;
  configureHref: string | null;
  toggleColumn: string | null;
  menuId: string | null;
  currentValue: boolean;
  locked: boolean;
  lockedReason?: string;
}) {
  const style = STATUS_STYLES[statusBadge];

  return (
    <div className="flex items-center gap-3 p-4 lg:p-5">
      <div className="shrink-0 size-10 rounded-xl bg-[#F4F1EC] flex items-center justify-center">
        <Icon className="size-5 text-[#5E5848]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-[#16130C]">{label}</p>
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${style.className}`}>
            {style.label}
          </span>
        </div>
        <p className="text-[12px] text-[#9C9485] mt-0.5 leading-snug">{shortDescription}</p>
        {locked && lockedReason && (
          <p className="text-[11px] text-[#9C9485] mt-0.5 flex items-center gap-1">
            <Lock className="size-3" /> {lockedReason}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {configureHref && (
          <Link
            href={configureHref}
            className="text-[12px] font-semibold text-[#E8A020] hover:underline"
          >
            Open →
          </Link>
        )}
        {toggleColumn && menuId && !locked && (
          <FeatureToggleRow
            menuId={menuId}
            column={toggleColumn}
            initialValue={currentValue}
          />
        )}
      </div>
    </div>
  );
}
