/**
 * "Step N of 6" pill + thin amber progress bar.
 * Render only on counted steps (not welcome / done).
 */

import { COUNTED_STEPS, type CountedStep, indexOf } from "../_lib/steps";

export function StepProgress({ step }: { step: CountedStep }) {
  const i = indexOf(step);
  const total = COUNTED_STEPS.length;
  const pct = ((i + 1) / total) * 100;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C9485]">
        Step {i + 1} of {total}
      </p>
      <div
        className="h-1 rounded-full bg-[#E2DDD5] overflow-hidden"
        role="progressbar"
        aria-valuenow={i + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${i + 1} of ${total}`}
      >
        <div
          className="h-full bg-[#E8A020] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
