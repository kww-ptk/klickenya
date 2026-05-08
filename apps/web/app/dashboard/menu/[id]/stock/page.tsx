import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { safeBackHref } from "@/app/dashboard/_lib/back-href";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuMetadata } from "@/lib/cache/menu";
import { StockEnableButton } from "./StockEnableButton";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ back?: string }>;
}

function sevenDaysAgoIso(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

export default async function StockHomePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const backHref = safeBackHref(sp.back);
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const menu = await getMenuMetadata(id, user.id);
  if (!menu) redirect("/dashboard");

  // Aggregates only matter once stock is enabled — fetch in parallel.
  const [
    { count: ingredientCount },
    { count: recipeCount },
    { count: movementCount },
    { count: openPoCount },
    { count: supplierCount },
    missingRecipesRpc,
  ] = menu.stock_enabled
    ? await Promise.all([
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
          .from("stock_movements")
          .select("id", { count: "exact", head: true })
          .eq("business_id", user.id)
          .gte("created_at", sevenDaysAgoIso()),
        adminClient
          .from("purchase_orders")
          .select("id", { count: "exact", head: true })
          .eq("business_id", user.id)
          .in("status", ["draft", "sent", "partial"]),
        adminClient
          .from("suppliers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", user.id)
          .eq("archived", false),
        adminClient.rpc("fn_count_missing_recipes", { p_menu_id: menu.id }),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { data: 0 }];

  const missingRecipes = Number((missingRecipesRpc as { data: number | null }).data ?? 0);

  return (
    <div>
      {/* Back link + title */}
      <div className="mb-6">
        <Link
          href={backHref ?? `/dashboard/menu/${menu.id}`}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          {backHref ? "← Back to dashboard" : "← Back to menu"}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] flex-1">
            Klickenya Kitchen
          </h1>
          {menu.stock_enabled && (
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Active
            </span>
          )}
        </div>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Stock & recipe costing for <span className="font-semibold text-[#5E5848]">{menu.name}</span>
        </p>
      </div>

      {!menu.stock_enabled ? (
        /* ─── CTA: Enable ─────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-[#E8A020]/10 to-[#E8A020]/0 px-6 py-8 lg:px-10 lg:py-12">
            <div className="max-w-[640px]">
              <div className="size-12 rounded-full bg-[#E8A020] flex items-center justify-center mb-4">
                <span className="text-[22px]">🍳</span>
              </div>
              <h2 className="font-display text-[22px] lg:text-[28px] font-bold text-[#16130C] tracking-[-0.02em] mb-3">
                Turn your menu into a kitchen
              </h2>
              <p className="text-[14px] lg:text-[15px] leading-[1.6] text-[#5E5848] mb-6">
                Klickenya Kitchen tracks the cost and stock of every dish you serve.
                Build recipes for your menu items, log purchases and waste, and the
                food-cost percentage on every plate becomes a number you can read at
                a glance — not a feeling.
              </p>

              <ul className="text-[13px] text-[#5E5848] space-y-2 mb-6">
                <li className="flex gap-2">
                  <span className="text-[#E8A020] font-bold">•</span>
                  Build recipes inside the menu builder — cost per portion live as you type
                </li>
                <li className="flex gap-2">
                  <span className="text-[#E8A020] font-bold">•</span>
                  Log purchases, waste and counts; activity feed updates in real time
                </li>
                <li className="flex gap-2">
                  <span className="text-[#E8A020] font-bold">•</span>
                  Suggested sale price based on your target food-cost %
                </li>
                <li className="flex gap-2">
                  <span className="text-[#9C9485] font-bold">•</span>
                  <span className="text-[#9C9485]">
                    Coming soon: purchase orders, auto-deduction on order fire, monthly reports
                  </span>
                </li>
              </ul>

              <StockEnableButton menuId={menu.id} />
              <p className="text-[12px] text-[#9C9485] mt-3">
                You can disable it any time. Your recipes and movements are kept.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Missing recipes banner — only when count > 0 */}
          {missingRecipes > 0 && (
            <Link
              href={`/dashboard/menu/${menu.id}/stock/missing-recipes`}
              className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[22px]">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-amber-900">
                    {missingRecipes} item{missingRecipes !== 1 ? "s" : ""} missing a recipe
                  </p>
                  <p className="text-[12px] text-amber-800">
                    These items don&apos;t deduct stock when ordered. Tap to fix.
                  </p>
                </div>
                <span className="text-amber-900 font-bold text-[14px]">→</span>
              </div>
            </Link>
          )}

        {/* ─── Tile grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          <Tile
            href={`/dashboard/menu/${menu.id}/stock/ingredients`}
            icon="🥬"
            title="Ingredients"
            count={ingredientCount ?? 0}
            countLabel="active"
            description="Pantry — names, units, costs and stock on hand"
          />
          <Tile
            href={`/dashboard/menu/${menu.id}`}
            icon="📖"
            title="Recipes"
            count={recipeCount ?? 0}
            countLabel="costed"
            description="Open the menu builder to add a recipe to any item"
          />
          <Tile
            href={`/dashboard/menu/${menu.id}/stock/movements`}
            icon="📊"
            title="Stock activity"
            count={movementCount ?? 0}
            countLabel="this week"
            description="Live feed of every purchase, deduction and waste entry"
          />
          <Tile
            href={`/dashboard/menu/${menu.id}/stock/purchases`}
            icon="🧾"
            title="Purchase orders"
            count={openPoCount ?? 0}
            countLabel="open"
            description="Draft, send and receive supplier orders into stock"
          />
          <Tile
            href={`/dashboard/menu/${menu.id}/stock/suppliers`}
            icon="🤝"
            title="Suppliers"
            count={supplierCount ?? 0}
            countLabel="active"
            description="Who you buy from — used on purchase orders"
          />
          <Tile
            href={`/dashboard/menu/${menu.id}/stock/reports`}
            icon="📈"
            title="Reports"
            description="Variance, margin by dish, supplier prices, dead inventory"
          />
        </div>
      </div>
      )}
    </div>
  );
}

/* ── Tile ───────────────────────────────────────────── */

function Tile({
  href,
  icon,
  title,
  count,
  countLabel,
  description,
  badge,
}: {
  href: string | null;
  icon: string;
  title: string;
  count?: number;
  countLabel?: string;
  description: string;
  badge?: string;
}) {
  const inner = (
    <div
      className={`bg-white rounded-2xl border border-[#E2DDD5] shadow-sm p-5 lg:p-6 h-full flex flex-col gap-2 transition-colors ${
        href ? "hover:border-[#E8A020]/60 cursor-pointer" : "opacity-70"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[28px] leading-none">{icon}</span>
        {badge ? (
          <span className="text-[10px] font-bold text-[#9C9485] bg-[#F4F1EC] px-2.5 py-0.5 rounded-full uppercase tracking-wide">
            {badge}
          </span>
        ) : count != null ? (
          <span className="text-[12px] font-semibold text-[#9C9485]">
            <span className="text-[18px] font-bold text-[#16130C]">{count}</span>
            {countLabel ? <span className="ml-1">{countLabel}</span> : null}
          </span>
        ) : null}
      </div>
      <p className="font-display text-[18px] font-bold text-[#16130C] mt-2">{title}</p>
      <p className="text-[13px] text-[#9C9485] leading-[1.5]">{description}</p>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}
