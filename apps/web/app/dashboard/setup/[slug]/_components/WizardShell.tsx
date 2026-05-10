/**
 * Visual shell shared by every wizard step page.
 *
 * Contract:
 *   - Pass `step` for steps 1–6; the progress bar renders. Welcome/done
 *     pages omit `step` and the bar is hidden.
 *   - Pass `skipHref` to render the footer "Skip for now →" link. Pages
 *     can compute their own skip target (it usually = nextSegment()).
 *   - `restaurantName` is the menu name shown in the header.
 *
 * Mobile-first: the inner column is max-w-[480px], padded for one-handed
 * thumb reach. On desktop it stays centred and capped — same.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { StepProgress } from "./StepProgress";
import type { CountedStep } from "../_lib/steps";

type Props = {
  restaurantName: string;
  step?: CountedStep;
  skipHref?: string;
  exitHref?: string;
  children: ReactNode;
};

export function WizardShell({
  restaurantName,
  step,
  skipHref,
  exitHref = "/dashboard",
  children,
}: Props) {
  return (
    <div className="min-h-[calc(100vh-2rem)] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#E8A020]">
            Setup
          </p>
          <h1 className="font-display text-[18px] lg:text-[20px] font-bold tracking-[-0.02em] text-[#16130C] truncate">
            {restaurantName}
          </h1>
        </div>
        <Link
          href={exitHref}
          className="shrink-0 text-[12px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          Exit
        </Link>
      </header>

      {/* ── Step progress ─────────────────────────────────────────────── */}
      {step && (
        <div className="mt-5">
          <StepProgress step={step} />
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="mt-6 flex-1">
        <div className="max-w-[480px] mx-auto w-full">{children}</div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      {skipHref && (
        <footer className="mt-8 pt-4 border-t border-[#E2DDD5]">
          <div className="max-w-[480px] mx-auto w-full text-center">
            <Link
              href={skipHref}
              className="text-[12px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors"
            >
              Skip for now →
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}
