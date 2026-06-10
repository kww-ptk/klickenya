import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuMetadata } from "@/lib/cache/menu";
import { IngredientsClient, type IngredientRow } from "./IngredientsClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IngredientsPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const menu = await getMenuMetadata(id, user.id);
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
          className="text-[13px] text-text3 hover:text-dark transition-colors"
        >
          ← Back to Klickenya Kitchen
        </Link>
        <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
            Ingredients
          </h1>
          <Link
            href={`/dashboard/menu/${menu.id}/stock/reference-prices`}
            className="bg-white border border-border text-dark font-bold text-[13px] px-4 h-[40px] rounded-full flex items-center hover:border-amber hover:text-amber transition-colors"
          >
            📊 Reference prices
          </Link>
        </div>
        <p className="text-[13px] text-text3 mt-1">
          Your pantry. Each ingredient has a unit (g, ml, pcs…) and a cost per unit in KES.
        </p>
      </div>

      <IngredientsClient menuId={menu.id} initial={initial} />
    </div>
  );
}
