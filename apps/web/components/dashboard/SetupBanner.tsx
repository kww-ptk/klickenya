/**
 * Dashboard entry point for the Easy Guided Setup wizard.
 *
 * Renders one row per restaurant menu the host owns, regardless of whether
 * setup is finished. That makes the wizard findable forever — not just
 * during the short window between claim verify and dismissal/completion.
 *
 * Per-row state:
 *   - In progress (resolveNextStep returns a step):
 *       amber primary card · copy: "Finish setting up [name] →"
 *       href: deep-link to the next unanswered step
 *   - Completed / Dismissed:
 *       muted neutral card · copy: "[name] — review settings →"
 *       href: /welcome (so the recap is reachable from the top)
 *
 * Empty state: nothing rendered (host has no restaurant menus).
 *
 * Server component. Counts (tables/staff) are fetched in one Promise.all
 * per menu so we don't N+1.
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

type RowState = "in_progress" | "complete";

export async function SetupBanner({ userId }: { userId: string }) {
  const { data: menus } = await adminClient
    .from("menus")
    .select(
      "id, name, listing_slug, is_published, table_ordering, reservations_decided_at, table_ordering_decided_at, stock_decided_at, setup_completed_at, setup_dismissed_at",
    )
    .eq("business_id", userId)
    .returns<Menu[]>();

  if (!menus || menus.length === 0) return null;

  // Pull table + staff counts for every menu in one shot. We need them for
  // the step-4 → step-5 transition (resolver routes back to POS while
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
      const slug = m.listing_slug;
      if (!slug) return null;

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

      // resolveNextStep returns null when complete OR dismissed — both
      // become the "review settings" affordance. When it returns a step,
      // we deep-link there with the "Finish setting up" copy.
      if (next === null) {
        return {
          id: m.id,
          name: m.name,
          state: "complete" as RowState,
          href: `/dashboard/setup/${slug}/welcome`,
        };
      }
      return {
        id: m.id,
        name: m.name,
        state: "in_progress" as RowState,
        href: `/dashboard/setup/${slug}/${segmentForResolverStep(next)}`,
      };
    })
    .filter((r): r is { id: string; name: string; state: RowState; href: string } => r !== null);

  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="easy-guided-setup-heading"
      className="rounded-xl lg:rounded-2xl border border-[#E2DDD5] bg-white p-4 lg:p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#E8A020]">
            Easy Guided Setup
          </p>
          <h2
            id="easy-guided-setup-heading"
            className="font-display text-[15px] lg:text-[16px] font-bold tracking-[-0.01em] text-[#16130C]"
          >
            Switch on the right tools for your restaurant
          </h2>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) =>
          row.state === "in_progress" ? (
            <Link
              key={row.id}
              href={row.href}
              className="block rounded-xl border border-[#E8A020]/20 bg-[#E8A020]/[0.06] p-3.5 hover:bg-[#E8A020]/[0.10] transition-colors"
              style={{ borderLeft: "4px solid #E8A020" }}
            >
              <p className="text-[13.5px] font-bold text-[#16130C]">
                Finish setting up {row.name} →
              </p>
            </Link>
          ) : (
            <Link
              key={row.id}
              href={row.href}
              className="block rounded-xl border border-[#E2DDD5] bg-[#FAFAF8] p-3.5 hover:border-[#16130C]/30 transition-colors"
            >
              <p className="text-[13px] font-semibold text-[#16130C]">
                {row.name}
              </p>
              <p className="text-[11.5px] text-[#9C9485] mt-0.5">
                Review settings →
              </p>
            </Link>
          ),
        )}
      </div>
    </section>
  );
}
