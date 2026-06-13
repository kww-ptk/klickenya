import Link from "next/link";
import { redirect } from "next/navigation";
import { ChefHat, Package, ScrollText, Truck, FileBarChart, ArrowUpRight } from "lucide-react";
import { getAuthUser, getHostProfile, getIsAdmin } from "../../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { StockEnableButton } from "../../../menu/[id]/stock/StockEnableButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /dashboard/listings/[id]/kitchen — Klickenya Kitchen landing.
 *
 * Promoted from the /eat prototype. Replaces the legacy page which was just a
 * redirect to /dashboard/menu/<id>/stock — that dumped the user out of the
 * listing dashboard. This page keeps them in context:
 *   - off  → enable button + value-prop explainer
 *   - on   → key metrics + a single primary "Open kitchen workspace" CTA that
 *            opens the full toolset in the legacy stock pages, with a back=
 *            param so the return link comes here.
 *
 * The deep workspace pages (ingredients, recipes, purchases, suppliers,
 * reports) still live under /dashboard/menu/<id>/stock/* — they'll move under
 * /dashboard/listings/<id>/kitchen/* in a future pass.
 */
export default async function ListingKitchenPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect(`/login?returnTo=/dashboard/listings/${id}/kitchen`);

  const isAdmin = await getIsAdmin(user.id);
  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile && !isAdmin) redirect("/dashboard");

  const listing = await sanityClient.fetch<{ slug: string; title: string } | null>(
    isAdmin
      ? `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants")][0]{
          "slug": slug.current, title
        }`
      : `*[_id == $id && _type == "listing" && (type == "restaurant" || subcategory == "restaurants") && (hostId == $userId || host._ref == $sanityHostId)][0]{
          "slug": slug.current, title
        }`,
    { id, userId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" },
  );
  if (!listing?.slug) redirect("/dashboard/listings");

  let menuQuery = adminClient
    .from("menus")
    .select("id, name, stock_enabled")
    .eq("listing_slug", listing.slug);
  if (!isAdmin) menuQuery = menuQuery.eq("business_id", user.id);
  const { data: menu } = await menuQuery.maybeSingle();

  if (!menu) {
    return (
      <div className="space-y-5">
        <div>
          <Link
            href={`/dashboard/listings/${id}`}
            className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
          >
            ← Back to overview
          </Link>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2 flex items-center gap-2">
            <ChefHat className="size-6 text-[#5E5848]" />
            Kitchen costing
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-1 mb-5">
            Set up your menu first — recipes are linked to menu items.
          </p>
        </div>
        <Link
          href={`/dashboard/listings/${id}/menu`}
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[44px] leading-[44px] rounded-full hover:bg-[#d4911c]"
        >
          Set up menu →
        </Link>
      </div>
    );
  }

  const stockEnabled = menu.stock_enabled ?? false;
  // back= ensures the legacy stock pages return to this listing-scoped kitchen
  // page instead of the menu-scoped one.
  const backToListing = `back=${encodeURIComponent(`/dashboard/listings/${id}/kitchen`)}`;
  const workspaceHref = `/dashboard/menu/${menu.id}/stock?${backToListing}`;

  /* ── OFF state ── */
  if (!stockEnabled) {
    return (
      <div className="space-y-5">
        <div>
          <Link
            href={`/dashboard/listings/${id}`}
            className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
          >
            ← Back to overview
          </Link>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2 flex items-center gap-2">
            <ChefHat className="size-6 text-[#5E5848]" />
            Kitchen costing
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-1">
            Recipes, stock, purchase orders, and per-dish margin — for {menu.name}.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm p-5 space-y-3">
          <p className="text-[14px] font-semibold text-[#16130C]">What you get</p>
          <ul className="space-y-2 text-[13px] text-[#5E5848]">
            <FeatureBullet>
              Build recipes for every menu item; lock in ingredient quantities and unit costs.
            </FeatureBullet>
            <FeatureBullet>
              Log purchases from suppliers; stock levels update automatically.
            </FeatureBullet>
            <FeatureBullet>
              Stock auto-deducts when an order fires from table ordering or POS.
            </FeatureBullet>
            <FeatureBullet>
              See real margin per dish, variance against reference prices, and waste reports.
            </FeatureBullet>
          </ul>
          <div className="pt-2">
            <StockEnableButton menuId={menu.id} />
          </div>
        </div>
      </div>
    );
  }

  /* ── ON state — fetch metrics in parallel ── */
  const [
    { count: ingredientCount },
    { count: recipeCount },
    { count: openPoCount },
    { count: supplierCount },
  ] = await Promise.all([
    adminClient
      .from("ingredients")
      .select("id", { count: "exact", head: true })
      .eq("business_id", user.id)
      .eq("archived", false),
    adminClient
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("business_id", user.id),
    adminClient
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", user.id)
      .neq("status", "received"),
    adminClient
      .from("suppliers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", user.id)
      .eq("archived", false),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/dashboard/listings/${id}`}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
        >
          ← Back to overview
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2 flex items-center gap-2">
          <ChefHat className="size-6 text-[#5E5848]" />
          Kitchen costing
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Recipes, stock, and per-dish margin — for {menu.name}.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        <MetricCard icon={Package}       label="Ingredients" value={ingredientCount ?? 0} />
        <MetricCard icon={ScrollText}    label="Recipes"     value={recipeCount ?? 0} />
        <MetricCard icon={Truck}         label="Suppliers"   value={supplierCount ?? 0} />
        <MetricCard icon={FileBarChart}  label="Open POs"    value={openPoCount ?? 0} highlight={(openPoCount ?? 0) > 0} />
      </div>

      <a
        href={workspaceHref}
        className="group flex items-center gap-3 bg-[#16130C] text-white rounded-2xl p-4 lg:p-5 hover:bg-[#2A2520] transition-colors"
      >
        <ChefHat className="size-6 text-[#E8A020] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold">Open kitchen workspace</p>
          <p className="text-[12px] text-white/70 mt-0.5">
            Recipes, purchase orders, stock movements, suppliers, reports — all in one place.
          </p>
        </div>
        <ArrowUpRight className="size-5 text-white/50 group-hover:text-white shrink-0" />
      </a>

      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-sm p-4 flex items-start gap-3">
        <span className="shrink-0 text-[22px] leading-none">🎉</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#16130C]">All features set up</p>
          <p className="text-[12px] text-[#9C9485] mt-0.5 leading-snug">
            Menu, Reservations, Table ordering, POS, Kitchen costing — that&apos;s the full restaurant stack. Use Features to turn any of them off.
          </p>
        </div>
        <Link
          href={`/dashboard/listings/${id}/features`}
          className="shrink-0 text-[12px] font-semibold text-[#E8A020] hover:underline self-center"
        >
          Manage →
        </Link>
      </div>
    </div>
  );
}

/* ── Small presentation primitives ───────────────────────────────────── */

function MetricCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof ChefHat;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl lg:rounded-2xl border p-4 shadow-sm ${
        highlight
          ? "bg-[#E8A020]/[0.06] border-[#E8A020]/30"
          : "bg-white border-[#E2DDD5]"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="size-3.5 text-[#9C9485]" />
        <p className="text-[11px] font-semibold text-[#9C9485] uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p
        className={`font-display text-[26px] font-bold tracking-[-0.02em] leading-none ${
          highlight ? "text-[#E8A020]" : "text-[#16130C]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FeatureBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="shrink-0 size-1.5 rounded-full bg-[#E8A020] mt-1.5" />
      <span>{children}</span>
    </li>
  );
}
