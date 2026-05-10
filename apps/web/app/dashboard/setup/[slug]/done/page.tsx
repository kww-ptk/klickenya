import Link from "next/link";
import { resolveWizardMenu } from "../_lib/resolveWizardMenu";
import { WizardShell } from "../_components/WizardShell";
import { CompleteButton } from "../_components/CompleteButton";

/**
 * Step 7 — recap. Lists what's enabled vs not, with a link to the
 * relevant management surface for each. Hitting "Finish setup" stamps
 * setup_completed_at and routes back to /dashboard.
 *
 * One-tap toggles are intentionally NOT provided here for reservations
 * (re-enabling needs windows — handled by the proper Step 2 flow) or
 * for table_ordering (disabling can fail if open orders exist — handled
 * in /dashboard/menu/[id]). Each disabled feature gets a "Set up now"
 * link that re-enters the wizard at the right step.
 */

export default async function DonePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { menu } = await resolveWizardMenu(slug);

  return (
    <WizardShell restaurantName={menu.name}>
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#16A34A]/10 flex items-center justify-center mb-4">
            <span className="text-[28px]">✓</span>
          </div>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            You&apos;re set up
          </h2>
          <p className="text-[14px] text-[#5E5848] mt-2 leading-relaxed">
            Here&apos;s what&apos;s on. Change any of these any time from your
            dashboard.
          </p>
        </div>

        <div className="space-y-2">
          <RecapRow
            on={menu.is_published}
            label="Digital menu"
            href={`/dashboard/menu/${menu.id}`}
            cta={menu.is_published ? "Edit menu" : "Build menu"}
          />
          <RecapRow
            on={menu.reservations_enabled}
            label="Online reservations"
            href={
              menu.reservations_enabled
                ? `/dashboard/listings`
                : `/dashboard/setup/${slug}/reservations`
            }
            cta={menu.reservations_enabled ? "Manage" : "Set up now"}
          />
          <RecapRow
            on={menu.table_ordering}
            label="Table ordering"
            href={
              menu.table_ordering
                ? `/dashboard/menu/${menu.id}/orders`
                : `/dashboard/setup/${slug}/table-ordering`
            }
            cta={menu.table_ordering ? "Open kitchen" : "Set up now"}
          />
          <RecapRow
            on={menu.stock_enabled}
            label="Klickenya Kitchen"
            href={`/dashboard/menu/${menu.id}/stock`}
            cta={menu.stock_enabled ? "Open Kitchen" : "Set up now"}
          />
        </div>

        <CompleteButton menuId={menu.id} />

        <p className="text-center text-[11px] text-[#9C9485]">
          Thank you for joining Klickenya 🇰🇪
        </p>
      </div>
    </WizardShell>
  );
}

function RecapRow({
  on,
  label,
  href,
  cta,
}: {
  on: boolean;
  label: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-[#E2DDD5] bg-white p-4 hover:border-[#E8A020]/40 transition-colors"
    >
      <span
        className={
          "shrink-0 inline-flex items-center justify-center text-[12px] font-bold w-8 h-8 rounded-full " +
          (on
            ? "bg-[#16A34A]/15 text-[#16A34A]"
            : "bg-[#F4F1EC] text-[#9C9485]")
        }
      >
        {on ? "✓" : "—"}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-[#16130C]">{label}</span>
        <span className="block text-[12px] text-[#9C9485] mt-0.5">
          {on ? "Enabled" : "Not set up"}
        </span>
      </span>
      <span className="shrink-0 text-[12px] font-bold text-[#E8A020]">{cta} →</span>
    </Link>
  );
}
