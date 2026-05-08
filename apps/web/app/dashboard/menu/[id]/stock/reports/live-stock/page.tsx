import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { LiveStockClient, type LiveStockRow } from "./LiveStockClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LiveStockPage({ params }: PageProps) {
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

  const { data } = await adminClient
    .from("v_current_stock")
    .select(
      "ingredient_id, ingredient_name, unit, cost_per_unit, current_qty, current_value_kes, last_movement_at, avg_daily_consumption_14d, days_of_cover, low_stock_threshold",
    )
    .eq("business_id", user.id)
    .eq("archived", false)
    .order("ingredient_name", { ascending: true });

  return (
    <div>
      <div className="mb-5">
        <Link href={`/dashboard/menu/${menu.id}/stock/reports`} className="text-[13px] text-[#9C9485] hover:text-[#16130C]">
          ← Back to reports
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Live stock
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Days-of-cover is current quantity ÷ average daily consumption (last 14 days). Red &lt;3, amber 3–7, green &gt;7.
        </p>
      </div>
      <LiveStockClient menuId={menu.id} rows={(data ?? []) as LiveStockRow[]} />
    </div>
  );
}
