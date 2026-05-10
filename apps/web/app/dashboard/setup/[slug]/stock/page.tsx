import Link from "next/link";
import { resolveWizardMenu } from "../_lib/resolveWizardMenu";
import { nextSegment } from "../_lib/steps";
import { WizardShell } from "../_components/WizardShell";
import { StockButton } from "../_components/StockButton";
import { DeclineButton } from "../_components/DeclineButton";

/**
 * Step 5 — Klickenya Kitchen (stock & food cost).
 *
 * Yes → POST /api/setup/stock (flips stock_enabled + decided_at), then
 * route into the existing /dashboard/menu/[id]/stock surface.
 * No  → POST /api/setup/decline { step: "stock" }, then route to step 6.
 */

export default async function StockStepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { menu } = await resolveWizardMenu(slug);

  const next = `/dashboard/setup/${slug}/${nextSegment("stock")}`;
  const managePath = `/dashboard/menu/${menu.id}/stock`;

  if (menu.stock_enabled) {
    return (
      <WizardShell restaurantName={menu.name} step="stock" skipHref={next}>
        <div className="space-y-5">
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            Klickenya Kitchen is on ✓
          </h2>
          <p className="text-[14px] text-[#5E5848] leading-relaxed">
            Add ingredients, build recipes, and stock will auto-deduct as
            orders fire. Margin and variance reports light up once you have
            data flowing.
          </p>
          <Link
            href={managePath}
            className="block w-full text-center bg-[#E8A020] hover:bg-[#d4911c] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors shadow-sm"
          >
            Open Kitchen →
          </Link>
          <Link
            href={next}
            className="block w-full text-center border border-[#E2DDD5] hover:border-[#16130C] text-[#16130C] font-bold text-[14px] h-[48px] leading-[48px] rounded-full transition-colors"
          >
            Continue setup →
          </Link>
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell restaurantName={menu.name} step="stock" skipHref={next}>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[#16130C]">
            Track ingredients, recipes, and food cost?
          </h2>
          <p className="text-[14px] text-[#5E5848] mt-2 leading-relaxed">
            Log purchases, build a recipe per dish, and see margin per
            ingredient. Stock auto-deducts when orders fire.
          </p>
          <p className="text-[12.5px] text-[#9C9485] mt-2">
            We&apos;ll take you straight to the kitchen surface to add your
            first ingredients. The wizard waits for you here.
          </p>
        </div>

        <StockButton menuId={menu.id} managePath={managePath} />

        <div className="text-center">
          <DeclineButton
            menuId={menu.id}
            step="stock"
            nextHref={next}
            label="No, skip Klickenya Kitchen"
          />
        </div>
      </div>
    </WizardShell>
  );
}
