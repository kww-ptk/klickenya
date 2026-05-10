import Link from "next/link";
import { resolveWizardMenu } from "../_lib/resolveWizardMenu";
import { nextSegment } from "../_lib/steps";
import { WizardShell } from "../_components/WizardShell";
import { TableOrderingButton } from "../_components/TableOrderingButton";
import { DeclineButton } from "../_components/DeclineButton";

/**
 * Step 3 — Table ordering (QR cart).
 *
 * Hard precondition: menus.is_published = true.
 * Yes → POST /api/setup/table-ordering, then route to step 4 (POS prompt).
 * Once table_ordering = true we render a confirmation card with the three
 * follow-up actions (download QR, open kitchen screen, payment notice).
 */

export default async function TableOrderingStepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { menu } = await resolveWizardMenu(slug);

  const next = `/dashboard/setup/${slug}/${nextSegment("table_ordering")}`;

  if (!menu.is_published) {
    return (
      <WizardShell restaurantName={menu.name} step="table_ordering" skipHref={next}>
        <div className="space-y-5">
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            Publish your menu first
          </h2>
          <p className="text-[14px] text-[#5E5848] leading-relaxed">
            Table ordering only makes sense once guests can browse a real menu.
            Hop into the menu builder, hit Publish, then come back.
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

  if (menu.table_ordering) {
    return (
      <WizardShell restaurantName={menu.name} step="table_ordering" skipHref={next}>
        <div className="space-y-5">
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            Table ordering is on ✓
          </h2>
          <div className="space-y-3">
            <ConfirmationCard
              icon="📱"
              title="Print your table QR codes"
              body="One QR per table — guests scan and order from their phone."
              href={`/dashboard/menu/${menu.id}/qr`}
              cta="Download QR codes →"
            />
            <ConfirmationCard
              icon="🧑‍🍳"
              title="Open your kitchen screen"
              body="See orders land in real time as guests submit them."
              href={`/dashboard/menu/${menu.id}/orders`}
              cta="Open kitchen screen →"
            />
            <div className="rounded-xl border border-[#E2DDD5] bg-white p-4">
              <p className="text-[13px] font-semibold text-[#16130C]">
                💵 Cash or card at the table
              </p>
              <p className="text-[12.5px] text-[#5E5848] mt-1">
                Online payment isn&apos;t live yet. Guests still pay you the way
                they normally would. M-Pesa is on the roadmap.
              </p>
            </div>
          </div>
          <Link
            href={next}
            className="block w-full text-center bg-[#16130C] hover:bg-[#2a2418] text-white font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors"
          >
            Continue →
          </Link>
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell restaurantName={menu.name} step="table_ordering" skipHref={next}>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            Do you want guests to order from the table by scanning the QR code?
          </h2>
          <p className="text-[14px] text-[#5E5848] mt-2 leading-relaxed">
            They scan, build a cart, and the order pops up on your kitchen
            screen. No phone calls, no taking orders by hand.
          </p>
          <p className="text-[12.5px] text-[#9C9485] mt-2">
            Payment still happens at the table — cash or card.
          </p>
        </div>

        <TableOrderingButton menuId={menu.id} nextHref={next} />

        <div className="text-center">
          <DeclineButton
            menuId={menu.id}
            step="table_ordering"
            nextHref={next}
            label="No, skip table ordering"
          />
        </div>
      </div>
    </WizardShell>
  );
}

function ConfirmationCard({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-[#E2DDD5] bg-white p-4 hover:border-[#E8A020]/40 transition-colors"
    >
      <p className="text-[13px] font-semibold text-[#16130C]">
        {icon} {title}
      </p>
      <p className="text-[12.5px] text-[#5E5848] mt-1">{body}</p>
      <span className="text-[12px] font-bold text-[#E8A020] mt-2 inline-block">
        {cta}
      </span>
    </Link>
  );
}
