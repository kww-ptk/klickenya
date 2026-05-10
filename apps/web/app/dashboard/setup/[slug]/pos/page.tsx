import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { resolveWizardMenu } from "../_lib/resolveWizardMenu";
import { nextSegment } from "../_lib/steps";
import { WizardShell } from "../_components/WizardShell";
import { PosStepClient } from "../_components/PosStepClient";

/**
 * Step 4 — POS setup (only relevant when table_ordering = true).
 *
 * If the owner declined Step 3, we redirect to Step 5 — POS without table
 * ordering doesn't make sense.
 *
 * The page seeds with current counts of restaurant_tables + restaurant_staff
 * and the client component lets the owner add more. The Continue button
 * activates once both counts ≥ 1.
 */

export default async function PosStepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { menu } = await resolveWizardMenu(slug);

  const next = `/dashboard/setup/${slug}/${nextSegment("pos")}`;

  if (!menu.table_ordering) {
    return (
      <WizardShell restaurantName={menu.name} step="pos" skipHref={next}>
        <div className="space-y-5">
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            POS needs table ordering on
          </h2>
          <p className="text-[14px] text-[#5E5848] leading-relaxed">
            The POS terminal pairs guest orders to physical tables. Without
            table ordering on, there&apos;s nothing to pair. Skip this step or
            head back and turn ordering on.
          </p>
          <div className="space-y-3">
            <Link
              href={`/dashboard/setup/${slug}/table-ordering`}
              className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
            >
              Back to table ordering →
            </Link>
            <Link
              href={next}
              className="block w-full text-center border border-[#E2DDD5] hover:border-[#16130C] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors"
            >
              Skip — continue →
            </Link>
          </div>
        </div>
      </WizardShell>
    );
  }

  const [tablesRes, staffRes] = await Promise.all([
    adminClient
      .from("restaurant_tables")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", menu.id),
    adminClient
      .from("restaurant_staff")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", menu.id),
  ]);

  return (
    <WizardShell restaurantName={menu.name} step="pos" skipHref={next}>
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            Want to use Klickenya as your POS?
          </h2>
          <p className="text-[14px] text-[#5E5848] mt-2 leading-relaxed">
            Table tracking, bill splits, service charge, and staff PINs.
            Add at least one table and one staff PIN to switch it on.
          </p>
          <p className="text-[12.5px] text-[#9C9485] mt-2">
            Need a floor map? You can drag tables around later from the menu
            dashboard.
          </p>
        </div>

        <PosStepClient
          menuId={menu.id}
          initialCounts={{
            tables: tablesRes.count ?? 0,
            staff: staffRes.count ?? 0,
          }}
          nextHref={next}
        />
      </div>
    </WizardShell>
  );
}
