import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { MovementsClient, type Movement, type IngredientLite } from "./MovementsClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MovementsPage({ params }: PageProps) {
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

  // First page of movements + the ingredient pantry (used by the filters
  // and the "+ New movement" modal).
  const [{ data: movementsRaw }, { data: ingredientsRaw }] = await Promise.all([
    adminClient
      .from("stock_movements")
      .select("id, ingredient_id, type, qty, unit_cost, total_cost, source, reason, created_at")
      .eq("business_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    adminClient
      .from("ingredients")
      .select("id, name, unit, cost_per_unit")
      .eq("business_id", user.id)
      .eq("archived", false)
      .order("name", { ascending: true }),
  ]);

  const movements = (movementsRaw ?? []) as Movement[];
  const ingredients = (ingredientsRaw ?? []) as IngredientLite[];

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/dashboard/menu/${menu.id}/stock`}
          className="text-[13px] text-text3 hover:text-dark transition-colors"
        >
          ← Back to Klickenya Kitchen
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mt-2">
          Stock activity
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          Live feed of every purchase, deduction and waste entry. Updates in real time.
        </p>
      </div>

      <MovementsClient
        initialMovements={movements}
        ingredients={ingredients}
        businessId={user.id}
      />
    </div>
  );
}
