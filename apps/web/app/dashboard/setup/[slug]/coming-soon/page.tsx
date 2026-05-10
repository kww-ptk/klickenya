import Link from "next/link";
import { resolveWizardMenu } from "../_lib/resolveWizardMenu";
import { WizardShell } from "../_components/WizardShell";
import { WaitlistToggle } from "../_components/WaitlistToggle";

/**
 * Step 6 — coming-soon waitlist toggles. Two cards: takeaway + M-Pesa,
 * delivery. Tapping a card flips the corresponding waitlist boolean on
 * the menus row. Strictly informational — does not gate completion.
 */

export default async function ComingSoonStepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { menu } = await resolveWizardMenu(slug);

  const next = `/dashboard/setup/${slug}/done`;

  return (
    <WizardShell restaurantName={menu.name} step="coming_soon" skipHref={next}>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            What&apos;s coming next
          </h2>
          <p className="text-[14px] text-[#5E5848] mt-2 leading-relaxed">
            Tap Notify me on anything you&apos;d use. We&apos;ll email you the
            day each one ships.
          </p>
        </div>

        <div className="space-y-3">
          <WaitlistToggle
            menuId={menu.id}
            feature="takeaway"
            initialValue={menu.takeaway_waitlist}
            icon="🥡"
            label="Takeaway orders + M-Pesa"
            body="Customers order ahead and pay before pickup. Q3 2026."
          />
          <WaitlistToggle
            menuId={menu.id}
            feature="delivery"
            initialValue={menu.delivery_waitlist}
            icon="🛵"
            label="Food delivery"
            body="Riders deliver to guests with live tracking. Q4 2026."
          />
        </div>

        <Link
          href={next}
          className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
        >
          Continue →
        </Link>
      </div>
    </WizardShell>
  );
}
