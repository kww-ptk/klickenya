import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { PurchasesClient, type PORow, type SupplierLite } from "./PurchasesClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchasesPage({ params }: PageProps) {
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

  const [{ data: ordersRaw }, { data: suppliersRaw }] = await Promise.all([
    adminClient
      .from("purchase_orders")
      .select(
        "id, po_number, status, supplier_id, expected_at, ordered_at, received_at, total_kes, received_total_kes, created_at",
      )
      .eq("business_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    adminClient
      .from("suppliers")
      .select("id, name")
      .eq("business_id", user.id)
      .eq("archived", false)
      .order("name", { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-5">
        <Link href={`/dashboard/menu/${menu.id}/stock`} className="text-[13px] text-[#9C9485] hover:text-[#16130C]">
          ← Back to Klickenya Kitchen
        </Link>
        <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            Purchase orders
          </h1>
          <Link
            href={`/dashboard/menu/${menu.id}/stock/purchases/new`}
            className="bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[44px] rounded-full hover:bg-[#d4911c] flex items-center shadow-sm"
          >
            + New PO
          </Link>
        </div>
      </div>

      <PurchasesClient
        menuId={menu.id}
        initialOrders={(ordersRaw ?? []) as PORow[]}
        suppliers={(suppliersRaw ?? []) as SupplierLite[]}
      />
    </div>
  );
}
