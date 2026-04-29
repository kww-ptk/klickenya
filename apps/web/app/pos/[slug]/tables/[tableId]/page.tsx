import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { getPosMenuBySlug } from "../../_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { PosSessionDetail } from "@/components/pos/PosSessionDetail";

interface PageProps {
  params: Promise<{ slug: string; tableId: string }>;
}

/**
 * Per-table session detail. Menu sections + staff identity come from the
 * shared layout context, so this page only fetches what's specific to this
 * table: the table row + the active session id (if any).
 */
export default async function PosTableDetailPage({ params }: PageProps) {
  const { slug, tableId } = await params;
  const menu = await getPosMenuBySlug(slug);
  if (!menu) return null;

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) {
    redirect(`/pos/${slug}`);
  }

  const { data: table } = await adminClient
    .from("restaurant_tables")
    .select("id, table_number, menu_id")
    .eq("id", tableId)
    .single();
  if (!table || table.menu_id !== menu.id) notFound();

  const { data: openSession } = await adminClient
    .from("table_sessions")
    .select("id")
    .eq("table_id", tableId)
    .in("status", ["open", "billed"])
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <PosSessionDetail
      tableId={tableId}
      tableNumber={table.table_number}
      sessionId={openSession?.id ?? null}
    />
  );
}
