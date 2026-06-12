import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { NewPurchaseClient, type IngredientLite, type SupplierLite } from "./NewPurchaseClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewPurchasePage({ params }: PageProps) {
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

  const [{ data: suppliersRaw }, { data: ingredientsRaw }] = await Promise.all([
    adminClient
      .from("suppliers")
      .select("id, name")
      .eq("business_id", user.id)
      .eq("archived", false)
      .order("name", { ascending: true }),
    adminClient
      .from("ingredients")
      .select("id, name, unit, cost_per_unit")
      .eq("business_id", user.id)
      .eq("archived", false)
      .order("name", { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/dashboard/menu/${menu.id}/stock/purchases`}
          className="text-[13px] text-text3 hover:text-dark"
        >
          ← Back to purchase orders
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mt-2">
          New purchase order
        </h1>
      </div>

      <NewPurchaseClient
        menuId={menu.id}
        suppliers={(suppliersRaw ?? []) as SupplierLite[]}
        ingredients={(ingredientsRaw ?? []) as IngredientLite[]}
      />
    </div>
  );
}
