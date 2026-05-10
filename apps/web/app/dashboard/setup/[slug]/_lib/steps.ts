/**
 * The wizard step ordering. Owns:
 *   - the visible "Step N of 6" counter (welcome and done are not counted),
 *   - the "Skip for now" target for each step,
 *   - the segment slug each step maps to (for layout / link href).
 *
 * Kept here so the shell, the banner resolver consumers, and individual
 * pages all read the same ordering.
 */

import type { SetupStep } from "@/lib/setup/resolveNextStep";

export const COUNTED_STEPS = [
  "menu",
  "reservations",
  "table_ordering",
  "pos",
  "stock",
  "coming_soon",
] as const;

export type CountedStep = (typeof COUNTED_STEPS)[number];

export const STEP_LABEL: Record<CountedStep, string> = {
  menu: "Build your menu",
  reservations: "Online reservations",
  table_ordering: "Table ordering",
  pos: "POS setup",
  stock: "Stock & food cost",
  coming_soon: "What's next",
};

export const STEP_SEGMENT: Record<CountedStep, string> = {
  menu: "menu",
  reservations: "reservations",
  table_ordering: "table-ordering",
  pos: "pos",
  stock: "stock",
  coming_soon: "coming-soon",
};

export function indexOf(step: CountedStep): number {
  return COUNTED_STEPS.indexOf(step);
}

/**
 * Next step in the natural order, or 'done' if we're at the end.
 * Used by "Skip for now" footer links — does NOT consider whether
 * preconditions for the next step are met. The wizard's per-page guards
 * handle that.
 */
export function nextSegment(step: CountedStep): string {
  const i = COUNTED_STEPS.indexOf(step);
  if (i === -1 || i === COUNTED_STEPS.length - 1) return "done";
  return STEP_SEGMENT[COUNTED_STEPS[i + 1]];
}

/**
 * Map the resolver's step slug to the route segment. Returns 'welcome' as
 * the safe default when the resolver returns null (banner shouldn't show
 * — but if a stray ?continue= deep link lands here we send them to welcome
 * rather than 404).
 */
export function segmentForResolverStep(step: SetupStep | null): string {
  if (step === null) return "welcome";
  return STEP_SEGMENT[step as CountedStep] ?? "welcome";
}
