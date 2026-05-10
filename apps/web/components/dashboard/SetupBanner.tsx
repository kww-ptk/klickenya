/**
 * Amber dashboard banner. Reads every restaurant menu owned by the user,
 * computes resolveNextStep per menu, and renders one banner row per menu
 * that still needs setup. Hides cleanly when there is nothing to nag about.
 *
 * Banner copy is exactly: "Finish setting up [restaurant name] →" —
 * mandated verbatim by the wizard spec.
 *
 * Server component. Counts (tables/staff) are fetched in one Promise.all
 * so we don't N+1.
 */

import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { resolveNextStep, type SetupState } from "@/lib/setup/resolveNextStep";
import { segmentForResolverStep } from "@/app/dashboard/setup/[slug]/_lib/steps";

type Menu = {
  id: string;
  name: string;
  listing_slug: string | null;
  is_published: boolean;
  table_ordering: boolean;
  reservations_decided_at: string | null;
  table_ordering_decided_at: string | null;
  stock_decided_at: string | null;
  setup_completed_at: string | null;
  setup_dismissed_at: string | null;
};

export async function SetupBanner({ userId }: { userId: string }) {
  // Fetch all menus owned by this user that haven't had setup finished or
  // dismissed. The partial index (migration 071) makes this query O(1) per
  // unfinished menu.
  const { data: menus } = await adminClient
    .from("menus")
    .select(
      "id, name, listing_slug, is_published, table_ordering, reservations_decided_at, table_ordering_decided_at, stock_decided_at, setup_completed_at, setup_dismissed_at",
    )
    .eq("business_id", userId)
    .is("setup_completed_at", null)
    .is("setup_dismissed_at", null)
    .returns<Menu[]>();

  if (!menus || menus.length === 0) return null;

  // Pull table + staff counts in parallel. We need them to compute the
  // step-4 → step-5 transition correctly (resolver routes back to POS while
  // table_ordering = true and either count is 0).
  const counts = await Promise.all(
    menus.map(async (m) => {
      const [tables, staff] = await Promise.all([
        adminClient
          .from("restaurant_tables")
          .select("id", { count: "exact", head: true })
          .eq("menu_id", m.id),
        adminClient
          .from("restaurant_staff")
          .select("id", { count: "exact", head: true })
          .eq("menu_id", m.id),
      ]);
      return {
        menuId: m.id,
        has_tables: (tables.count ?? 0) > 0,
        has_staff: (staff.count ?? 0) > 0,
      };
    }),
  );
  const countMap = new Map(counts.map((c) => [c.menuId, c]));

  const rows = menus
    .map((m) => {
      const c = countMap.get(m.id)!;
      const state: SetupState = {
        is_published: m.is_published,
        reservations_decided_at: m.reservations_decided_at,
        table_ordering: m.table_ordering,
        table_ordering_decided_at: m.table_ordering_decided_at,
        stock_decided_at: m.stock_decided_at,
        setup_completed_at: m.setup_completed_at,
        setup_dismissed_at: m.setup_dismissed_at,
        has_tables: c.has_tables,
        has_staff: c.has_staff,
      };
      const next = resolveNextStep(state);
      if (next === null) return null;
      const segment = segmentForResolverStep(next);
      const slug = m.listing_slug;
      if (!slug) return null;
      return { id: m.id, name: m.name, href: `/dashboard/setup/${slug}/${segment}` };
    })
    .filter((r): r is { id: string; name: string; href: string } => r !== null);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <Link
          key={row.id}
          href={row.href}
          className="block rounded-xl lg:rounded-2xl border border-[#E8A020]/20 bg-[#E8A020]/[0.06] p-4 shadow-sm hover:bg-[#E8A020]/[0.10] transition-colors"
          style={{ borderLeft: "4px solid #E8A020" }}
        >
          <p className="text-[13.5px] font-bold text-[#16130C]">
            Finish setting up {row.name} →
          </p>
        </Link>
      ))}
    </div>
  );
}
