import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { MarginClient, type MarginRow } from "./MarginClient";

interface PageProps {
  params: Promise<{ id: string }>;
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

  // Refresh the MV on demand if it's empty (first run before pg_cron is wired up).
  const { count } = await adminClient
    .from("mv_dish_margin_30d")
    .select("menu_item_id", { count: "exact", head: true })
    .eq("business_id", user.id);
  if (!count) {
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
        <Link href={`/dashboard/menu/${menu.id}/stock/reports`} className="text-[13px] text-[#9C9485] hover:text-[#16130C]">
          ← Back to reports
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Margin by dish
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
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
