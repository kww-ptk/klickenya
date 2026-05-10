import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { resolveNextStep } from "@/lib/setup/resolveNextStep";
import { resolveWizardMenu } from "../_lib/resolveWizardMenu";
import { segmentForResolverStep } from "../_lib/steps";
import { WizardShell } from "../_components/WizardShell";

/**
 * Welcome page. Reads the owner's current setup state, computes the next
 * unanswered step, and offers a primary CTA that drops the owner straight
 * into it. The "Set up later" link routes to /dashboard.
 */

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { menu } = await resolveWizardMenu(slug);

  // For step-4 routing we need to know whether the owner has tables/staff.
  // Counts are cheap (head-only).
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

  const next = resolveNextStep({
    is_published: menu.is_published,
    reservations_decided_at: menu.reservations_decided_at,
    table_ordering: menu.table_ordering,
    table_ordering_decided_at: menu.table_ordering_decided_at,
    stock_decided_at: menu.stock_decided_at,
    setup_completed_at: menu.setup_completed_at,
    setup_dismissed_at: menu.setup_dismissed_at,
    has_tables: (tablesRes.count ?? 0) > 0,
    has_staff: (staffRes.count ?? 0) > 0,
  });

  const nextSegment = next ? segmentForResolverStep(next) : "done";
  const nextHref = `/dashboard/setup/${slug}/${nextSegment}`;
  const isResuming = next !== "menu";

  return (
    <WizardShell restaurantName={menu.name}>
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#E8A020]/10 flex items-center justify-center mb-4">
            <span className="text-[28px]">🍽️</span>
          </div>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            {isResuming ? "Welcome back to Easy Guided Setup" : "Easy Guided Setup"}
          </h2>
          <p className="text-[14px] text-[#5E5848] mt-2 leading-relaxed">
            {isResuming
              ? "Pick up where you left off. Six short questions, takes about five minutes."
              : "Six short questions switch on the right tools for your restaurant. Five minutes total — answer no to skip anything you don't need yet."}
          </p>
        </div>

        <Link
          href={nextHref}
          className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
        >
          {next === null ? "Review setup →" : "Continue →"}
        </Link>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-[12px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors"
          >
            Set up later
          </Link>
        </div>
      </div>
    </WizardShell>
  );
}
