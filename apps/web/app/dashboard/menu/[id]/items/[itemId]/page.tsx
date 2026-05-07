import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { ItemEditorClient, type RecipeIngredient } from "./ItemEditorClient";
import type { IngredientRow } from "../../stock/ingredients/IngredientsClient";

interface PageProps {
  params: Promise<{ id: string; itemId: string }>;
}

export default async function ItemEditorPage({ params }: PageProps) {
  const { id: menuId, itemId } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  // Verify menu ownership + read stock_enabled flag
  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, stock_enabled, currency")
    .eq("id", menuId)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");

  // Fetch item (with section) — must belong to this menu
  const { data: item } = await adminClient
    .from("menu_items")
    .select(
      "id, name, description, price_kes, photo_url, dietary_tags, is_available, is_featured, display_order, section_id, menu_sections!inner(menu_id, title)",
    )
    .eq("id", itemId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("menu_sections.menu_id", menuId as any)
    .single();
  if (!item) redirect(`/dashboard/menu/${menuId}`);

  // Pre-fetch in parallel: recipe + ingredients
  const [recipeRes, ingredientsRes] = await Promise.all([
    adminClient
      .from("recipes")
      .select("id, menu_item_id, overhead_pct, target_food_cost_pct, notes")
      .eq("menu_item_id", itemId)
      .maybeSingle(),
    adminClient
      .from("ingredients")
      .select("id, name, unit, cost_per_unit, default_yield, category, on_hand, low_stock_threshold, archived, updated_at")
      .eq("business_id", user.id)
      .eq("archived", false)
      .order("name", { ascending: true }),
  ]);

  let recipeLines: RecipeIngredient[] = [];
  if (recipeRes.data?.id) {
    const { data } = await adminClient
      .from("recipe_ingredients")
      .select("id, ingredient_id, ep_qty, yield_pct, display_order")
      .eq("recipe_id", recipeRes.data.id)
      .order("display_order", { ascending: true });
    recipeLines = (data ?? []) as RecipeIngredient[];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionTitle = (item as any).menu_sections?.title ?? null;

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/dashboard/menu/${menuId}`}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          ← Back to {menu.name}
        </Link>
        <div className="flex items-baseline gap-3 mt-2 flex-wrap">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            {item.name}
          </h1>
          {sectionTitle && (
            <span className="text-[13px] text-[#9C9485]">in {sectionTitle}</span>
          )}
        </div>
      </div>

      <ItemEditorClient
        menuId={menuId}
        stockEnabled={menu.stock_enabled}
        item={{
          id: item.id,
          name: item.name,
          description: item.description ?? "",
          price_kes: Number(item.price_kes),
          dietary_tags: item.dietary_tags ?? [],
          is_available: !!item.is_available,
          photo_url: item.photo_url ?? null,
        }}
        recipe={
          recipeRes.data
            ? {
                overhead_pct: Number(recipeRes.data.overhead_pct ?? 5),
                target_food_cost_pct: Number(recipeRes.data.target_food_cost_pct ?? 30),
                notes: recipeRes.data.notes ?? "",
              }
            : null
        }
        recipeLines={recipeLines.map((l) => ({
          id: l.id,
          ingredient_id: l.ingredient_id,
          ep_qty: Number(l.ep_qty),
          yield_pct: Number(l.yield_pct),
          display_order: l.display_order ?? 0,
        }))}
        pantry={(ingredientsRes.data ?? []) as IngredientRow[]}
      />
    </div>
  );
}
