import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { KitchenDashboard, type KitchenOrder } from "@/components/dashboard/menu/KitchenDashboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KitchenDashboardPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();

  if (!user) redirect("/login");

  // Verify the menu belongs to this user and table ordering is enabled
  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, table_ordering, is_published")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();

  if (!menu) redirect("/dashboard");

  // Table ordering must be enabled to use the kitchen dashboard
  if (!menu.table_ordering) {
    redirect(`/dashboard/menu/${id}`);
  }

  // Fetch initial active orders (new, preparing, ready) with their items
  const { data: orders } = await adminClient
    .from("orders")
    .select(`
      id,
      status,
      table_number,
      customer_name,
      total_kes,
      created_at,
      order_items (
        id,
        item_name,
        item_price,
        quantity,
        notes,
        selected_options,
        allergy_notes,
        line_total
      )
    `)
    .eq("menu_id", id)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  return (
    <KitchenDashboard
      menuId={menu.id}
      menuName={menu.name}
      initialOrders={(orders ?? []) as KitchenOrder[]}
    />
  );
}
