import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { getPosMenuBySlug } from "../_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { PosHistory, type HistoryRow } from "@/components/pos/PosHistory";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Read-only list of sessions closed today (paid or voided).
 * Filters by Africa/Nairobi day boundaries — UTC offset is +03:00 with no DST,
 * so plain offset arithmetic is safe.
 */
function startOfNairobiDayUtc(): Date {
  const now = new Date();
  // Compute "now in Nairobi" by shifting UTC +03:00, then strip the time.
  const nairobi = new Date(now.getTime() + 3 * 3600 * 1000);
  const startNairobi = new Date(
    Date.UTC(nairobi.getUTCFullYear(), nairobi.getUTCMonth(), nairobi.getUTCDate()),
  );
  // Convert that midnight Nairobi back to UTC.
  return new Date(startNairobi.getTime() - 3 * 3600 * 1000);
}

export default async function PosHistoryPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getPosMenuBySlug(slug);
  if (!menu) notFound();

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) {
    redirect(`/pos/${slug}`);
  }

  const { data: staffRow } = await adminClient
    .from("restaurant_staff")
    .select("name, role, is_active")
    .eq("id", session.staff_id)
    .single();
  if (!staffRow || !staffRow.is_active) {
    redirect(`/pos/${slug}`);
  }

  const since = startOfNairobiDayUtc().toISOString();

  const { data: rows } = await adminClient
    .from("table_sessions")
    .select(`
      id, status, payment_method, total_kes, closed_at, opened_at, covers,
      restaurant_tables ( id, table_number )
    `)
    .eq("menu_id", menu.id)
    .in("status", ["paid", "void"])
    .gte("closed_at", since)
    .order("closed_at", { ascending: false })
    .limit(100);

  const history: HistoryRow[] = (rows ?? []).map((r) => {
    const t = Array.isArray(r.restaurant_tables) ? r.restaurant_tables[0] : r.restaurant_tables;
    return {
      id:             r.id,
      status:         r.status as "paid" | "void",
      payment_method: r.payment_method,
      total_kes:      Number(r.total_kes ?? 0),
      closed_at:      r.closed_at ?? r.opened_at,
      covers:         r.covers ?? 1,
      table_number:   t?.table_number ?? "—",
    };
  });

  return (
    <PosHistory
      slug={slug}
      menuId={menu.id}
      menuName={menu.name}
      staffName={staffRow.name}
      staffRole={staffRow.role as "waiter" | "manager" | "cashier"}
      rows={history}
    />
  );
}
