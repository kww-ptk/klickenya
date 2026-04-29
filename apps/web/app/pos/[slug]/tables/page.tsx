import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { getPosMenuBySlug } from "../_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { PosTablesGrid, type PosTable } from "@/components/pos/PosTablesGrid";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PosTablesPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) {
    redirect(`/pos/${slug}`);
  }

  // Verify staff is still active.
  const { data: staffRow } = await adminClient
    .from("restaurant_staff")
    .select("id, is_active, name, role")
    .eq("id", session.staff_id)
    .single();
  if (!staffRow || !staffRow.is_active) {
    redirect(`/pos/${slug}`);
  }

  // Initial table list.
  const { data: tables } = await adminClient
    .from("restaurant_tables")
    .select("id, table_number, capacity, display_order, is_active")
    .eq("menu_id", menu.id)
    .eq("is_active", true)
    .order("display_order");

  const initialTables: PosTable[] = (tables ?? []).map((t) => ({
    id:           t.id,
    table_number: t.table_number,
    capacity:     t.capacity ?? 4,
  }));

  return (
    <PosTablesGrid
      slug={slug}
      menuId={menu.id}
      menuName={menu.name}
      staffName={staffRow.name}
      staffRole={staffRow.role as "waiter" | "manager" | "cashier"}
      initialTables={initialTables}
    />
  );
}
