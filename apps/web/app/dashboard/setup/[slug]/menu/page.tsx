import Link from "next/link";
import { resolveWizardMenu } from "../_lib/resolveWizardMenu";
import { nextSegment } from "../_lib/steps";
import { WizardShell } from "../_components/WizardShell";

/**
 * Step 1 — "Want to set up your digital menu now?"
 *
 * The menu builder lives at /dashboard/menu/[id]. Saying yes routes there.
 * Saying no routes to step 2 (reservations) — but a banner reminder will
 * persist on /dashboard until the menu is published.
 *
 * We do not write a flag here: there is no menu_decided_at column. The
 * resolver reads is_published directly. That keeps the contract simple —
 * "menu" step is gone the moment the menu is published, no other state
 * required.
 */

export default async function MenuStepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { menu } = await resolveWizardMenu(slug);

  const skip = `/dashboard/setup/${slug}/${nextSegment("menu")}`;

  return (
    <WizardShell restaurantName={menu.name} step="menu" skipHref={skip}>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            Want to set up your digital menu now?
          </h2>
          <p className="text-[14px] text-[#5E5848] mt-2 leading-relaxed">
            Add sections, dishes, and prices. We&apos;ll generate a free QR code
            for each table so guests can browse your menu from their phone.
          </p>
        </div>

        {menu.is_published ? (
          <div className="rounded-xl border border-[#16A34A]/20 bg-[#16A34A]/[0.05] p-4">
            <p className="text-[13px] font-semibold text-[#16130C]">
              ✓ Your menu is published
            </p>
            <p className="text-[12.5px] text-[#5E5848] mt-1">
              Live at{" "}
              <span className="font-mono text-[#16130C]">
                klickenya.com/m/{menu.slug}
              </span>
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E2DDD5] bg-white p-4">
            <p className="text-[13px] text-[#5E5848] leading-relaxed">
              Once you&apos;ve added at least one section and one dish, hit
              Publish in the menu builder. You&apos;ll come back here to
              keep going.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href={`/dashboard/menu/${menu.id}`}
            className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
          >
            {menu.is_published ? "Edit my menu" : "Yes — open the menu builder →"}
          </Link>
          {menu.is_published && (
            <Link
              href={skip}
              className="block w-full text-center border border-[#E2DDD5] hover:border-[#16130C] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors"
            >
              Continue to next step →
            </Link>
          )}
        </div>
      </div>
    </WizardShell>
  );
}
