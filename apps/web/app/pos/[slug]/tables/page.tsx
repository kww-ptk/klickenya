import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { getPosMenuBySlug } from "../_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { PosTablesGrid, type PosTable } from "@/components/pos/PosTablesGrid";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Tables grid page. The shared layout already fetched menu + staff into
 * context, so this page only fetches the lightweight table list. Auth
 * verification still lives here as a defence-in-depth check (layout context
 * is for the UI; redirect is for the server response).
 */
export default async function PosTablesPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getPosMenuBySlug(slug);
  if (!menu) return null;

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) {
    redirect(`/pos/${slug}`);
  }
  // Kitchen staff don't have access to the waiter tables grid — bounce them
  // to the kitchen view. Defence in depth; the page.tsx login already does
  // this when they're signing in, but a direct nav here would slip through.
  if (session.role === "kitchen") {
    redirect(`/kitchen/${slug}/orders`);
  }

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

  return <PosTablesGrid initialTables={initialTables} />;
}
