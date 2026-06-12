import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { MarginClient, type MarginRow } from "./MarginClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
function isStale(refreshedAt: string | null | undefined): boolean {
  if (!refreshedAt) return true;
  return Date.now() - new Date(refreshedAt).getTime() > ONE_HOUR_MS;
}

export default async function MarginPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, stock_enabled")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.stock_enabled) redirect(`/dashboard/menu/${id}/stock`);

  // Refresh the MV on demand iff it hasn't been refreshed recently. Previously
  // we refreshed whenever THIS business had no rows, which (a) re-ran the
  // expensive aggregate on every page load by a fresh business and (b)
  // ignored the fact that the MV was already populated for other businesses.
  // kitchen_mv_meta stores the last refresh time globally; refresh if older
  // than an hour or never recorded.
  const { data: meta } = await adminClient
    .from("kitchen_mv_meta")
    .select("refreshed_at")
    .eq("name", "mv_dish_margin_30d")
    .maybeSingle();
  if (isStale(meta?.refreshed_at)) {
    await adminClient.rpc("refresh_dish_margin_30d");
  }

  const { data, error } = await adminClient
    .from("mv_dish_margin_30d")
    .select("menu_item_id, menu_item_name, portions_sold, revenue, cogs, margin_kes, margin_pct, food_cost_pct, refreshed_at")
    .eq("business_id", user.id)
    .order("margin_kes", { ascending: false });

  return (
    <div>
      <div className="mb-5">
        <Link href={`/dashboard/menu/${menu.id}/stock/reports`} className="text-[13px] text-text3 hover:text-dark">
          ← Back to reports
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mt-2">
          Margin by dish
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          Last 30 days. Revenue from order_items, COGS from auto-deducted stock movements.
          Food cost &gt; 35% is highlighted — too thin a margin.
        </p>
      </div>
      {error ? (
        <p className="text-[13px] text-rose-700">{error.message}</p>
      ) : (
        <MarginClient menuId={menu.id} rows={(data ?? []) as MarginRow[]} />
      )}
    </div>
  );
}
