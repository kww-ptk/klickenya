import Link from "next/link";
import { resolveWizardMenu } from "../_lib/resolveWizardMenu";
import { nextSegment } from "../_lib/steps";
import { WizardShell } from "../_components/WizardShell";
import { ReservationsStepForm } from "../_components/ReservationsStepForm";
import { DeclineButton } from "../_components/DeclineButton";

/**
 * Step 2 — Online reservations.
 *
 * Hard precondition: menus.is_published = true.
 * If the menu isn't published, we show "Publish your menu first" and the
 * primary CTAs are disabled. The owner has to come back via Step 1.
 *
 * If the owner says yes, the inline form posts to /api/setup/reservations
 * which atomically inserts the window(s) AND flips reservations_enabled
 * (RPC fn_setup_enable_reservations). The form lives in
 * ReservationsStepForm.tsx as a client component.
 *
 * If the owner says no, we POST to /api/setup/decline { step: "reservations" }
 * via the DeclineButton helper, then route to step 3.
 */

export default async function ReservationsStepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { menu } = await resolveWizardMenu(slug);

  const skip = `/dashboard/setup/${slug}/${nextSegment("reservations")}`;
  const next = skip;

  if (!menu.is_published) {
    return (
      <WizardShell restaurantName={menu.name} step="reservations" skipHref={skip}>
        <div className="space-y-5">
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            Publish your menu first
          </h2>
          <p className="text-[14px] text-[#5E5848] leading-relaxed">
            Reservations need a live menu page so guests have somewhere to land
            after they book. Hop into the menu builder, hit Publish, then come
            back here.
          </p>
          <Link
            href={`/dashboard/menu/${menu.id}`}
            className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
          >
            Open the menu builder →
          </Link>
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell restaurantName={menu.name} step="reservations" skipHref={skip}>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            Do you want guests to book a table online?
          </h2>
          <p className="text-[14px] text-[#5E5848] mt-2 leading-relaxed">
            We&apos;ll add a Book button to your menu page and your listing.
            You approve or decline each request from the dashboard.
          </p>
        </div>

        {menu.reservations_enabled ? (
          <div className="rounded-xl border border-[#16A34A]/20 bg-[#16A34A]/[0.05] p-4">
            <p className="text-[13px] font-semibold text-[#16130C]">
              ✓ Reservations are on
            </p>
            <p className="text-[12.5px] text-[#5E5848] mt-1">
              Manage requests from{" "}
              <Link
                href={`/dashboard/listings`}
                className="font-semibold text-[#E8A020] hover:underline"
              >
                your listings dashboard
              </Link>
              .
            </p>
            <Link
              href={next}
              className="mt-3 inline-block bg-[#16130C] hover:bg-[#2a2418] text-white font-bold text-[13px] px-5 h-[40px] leading-[40px] rounded-full transition-colors"
            >
              Continue →
            </Link>
          </div>
        ) : (
          <>
            <ReservationsStepForm menuId={menu.id} nextHref={next} />
            <div className="text-center pt-2">
              <DeclineButton
                menuId={menu.id}
                step="reservations"
                nextHref={next}
                label="No, skip reservations"
              />
            </div>
          </>
        )}
      </div>
    </WizardShell>
  );
}
