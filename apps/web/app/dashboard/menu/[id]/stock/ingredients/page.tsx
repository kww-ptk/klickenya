import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { IngredientsClient, type IngredientRow } from "./IngredientsClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IngredientsPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, stock_enabled")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.stock_enabled) redirect(`/dashboard/menu/${id}/stock`);

  const { data } = await adminClient
    .from("ingredients")
    .select("id, name, unit, cost_per_unit, default_yield, category, on_hand, low_stock_threshold, archived, updated_at")
    .eq("business_id", user.id)
    .eq("archived", false)
    .order("name", { ascending: true });

  const initial = (data ?? []) as IngredientRow[];

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/dashboard/menu/${menu.id}/stock`}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          ← Back to Klickenya Kitchen
        </Link>
        <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            Ingredients
          </h1>
          <Link
            href={`/dashboard/menu/${menu.id}/stock/reference-prices`}
            className="bg-white border border-[#E2DDD5] text-[#16130C] font-bold text-[13px] px-4 h-[40px] rounded-full flex items-center hover:border-[#E8A020] hover:text-[#E8A020] transition-colors"
          >
            📊 Reference prices
          </Link>
        </div>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Your pantry. Each ingredient has a unit (g, ml, pcs…) and a cost per unit in KES.
        </p>
      </div>

      <IngredientsClient menuId={menu.id} initial={initial} />
    </div>
  );
}
