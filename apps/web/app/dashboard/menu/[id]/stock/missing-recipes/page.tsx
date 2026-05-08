import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface MissingRow {
  id: string;
  name: string;
  section_title: string;
  reason: "no_recipe" | "empty_recipe";
}

export default async function MissingRecipesPage({ params }: PageProps) {
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

  // Pull all menu items for this menu, with their recipe id (if any) and an
  // ingredient count. PostgREST nested counts are simpler than a left join
  // chain in SQL: select recipes(id, recipe_ingredients(count)).
  const { data: itemsRaw } = await adminClient
    .from("menu_items")
    .select(
      "id, name, menu_sections!inner(menu_id, title), recipes(id, recipe_ingredients(count))",
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("menu_sections.menu_id", id as any)
    .order("display_order", { ascending: true });

  // PostgREST returns nested rows as arrays even for !inner / 1:1 relations,
  // so we coerce through unknown and normalise.
  type ItemRow = {
    id: string;
    name: string;
    menu_sections: { title: string } | { title: string }[];
    recipes:
      | Array<{ id: string; recipe_ingredients: Array<{ count: number }> }>
      | { id: string; recipe_ingredients: Array<{ count: number }> }
      | null;
  };

  const missing: MissingRow[] = [];
  for (const it of (itemsRaw ?? []) as unknown as ItemRow[]) {
    const section = Array.isArray(it.menu_sections) ? it.menu_sections[0] : it.menu_sections;
    const sectionTitle = section?.title ?? "—";
    const r = Array.isArray(it.recipes) ? it.recipes[0] : it.recipes;
    if (!r) {
      missing.push({ id: it.id, name: it.name, section_title: sectionTitle, reason: "no_recipe" });
    } else {
      const cnt = r.recipe_ingredients?.[0]?.count ?? 0;
      if (cnt === 0) {
        missing.push({ id: it.id, name: it.name, section_title: sectionTitle, reason: "empty_recipe" });
      }
    }
  }

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/dashboard/menu/${menu.id}/stock`}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C]"
        >
          ← Back to Klickenya Kitchen
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Missing recipes
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
          These items are on your menu but don&apos;t deduct stock when ordered.
          Add a recipe to close the loop.
        </p>
      </div>

      {missing.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center">
          <p className="text-[40px] mb-2">✅</p>
          <p className="font-display text-[16px] font-bold text-[#16130C]">All items have recipes</p>
          <p className="text-[13px] text-[#9C9485] mt-1">
            Stock will deduct automatically when an order moves to your chosen status.
          </p>
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-[#E2DDD5] divide-y divide-[#F4F1EC] overflow-hidden">
          {missing.map((m) => (
            <li key={m.id}>
              <Link
                href={`/dashboard/menu/${menu.id}/items/${m.id}`}
                className="flex items-center gap-3 p-4 hover:bg-[#FAFAF8] active:bg-[#F4F1EC]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#16130C]">{m.name}</p>
                  <p className="text-[12px] text-[#9C9485]">
                    {m.section_title} ·{" "}
                    {m.reason === "no_recipe" ? "No recipe yet" : "Recipe is empty"}
                  </p>
                </div>
                <span className="text-[#E8A020] font-bold text-[14px] shrink-0">Add recipe →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
