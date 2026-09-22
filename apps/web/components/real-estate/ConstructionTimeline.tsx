import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ConstructionMilestone,
  ConstructionProgress,
  MilestoneStatus,
} from "@/lib/real-estate/progress";

/**
 * Construction progress for a new development, as a vertical rail.
 *
 * Every stage renders, including ones the admin has not filled in. A timeline
 * showing only the three stages someone bothered to enter looks half-built;
 * showing all eight gives the buyer the whole roadmap and makes the gaps read
 * as "not there yet" rather than "not recorded".
 *
 * Server component on purpose — no state, no effects. The page is statically
 * rendered with revalidate = 3600, so every stage stays in the HTML for
 * indexing and nothing waits on hydration.
 */

interface ConstructionTimelineProps {
  progress: ConstructionProgress;
}

/** Screen-reader-only status word read before the label. The "in progress"
 *  pill is already visible accessible text, so it is left out here to avoid
 *  announcing the same status twice on that one row. */
/**
 * Status for screen readers, which otherwise get only the stage label — the
 * marker shape and the muted colour that carry this visually reach nobody.
 * "Done" rather than "Completed" because the date line underneath already
 * begins "Completed March 2026", and the pair read as a stutter.
 * in-progress is absent deliberately: its visible pill is already real text.
 */
const SR_STATUS_TEXT: Partial<Record<MilestoneStatus, string>> = {
  done: "Done",
  upcoming: "Not started",
};

/** Month and year only. Day precision on a construction estimate is a fiction. */
function formatMilestoneDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

function dateLine(milestone: ConstructionMilestone): string | null {
  if (milestone.status === "done" && milestone.completedDate) {
    const formatted = formatMilestoneDate(milestone.completedDate);
    return formatted ? `Completed ${formatted}` : null;
  }
  if (milestone.status !== "done" && milestone.targetDate) {
    const formatted = formatMilestoneDate(milestone.targetDate);
    return formatted ? `Target ${formatted}` : null;
  }
  return null;
}

function StageMarker({ status }: { status: ConstructionMilestone["status"] }) {
  if (status === "done") {
    return (
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple2 text-white"
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full border-[3px] border-purple2 bg-white"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white"
    />
  );
}

function ConstructionTimeline({ progress }: ConstructionTimelineProps) {
  const { milestones, percentage } = progress;
  if (milestones.length === 0) return null;

  return (
    <div className="rounded-[20px] border border-border bg-surface p-5 sm:p-6">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h3 className="text-[15px] font-bold text-text">Construction progress</h3>
        <p className="text-[20px] font-bold leading-none text-purple2">
          {percentage}%
        </p>
      </div>

      <div
        className="mb-6 h-2 overflow-hidden rounded-full bg-border"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-purple2"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <ol className="flex flex-col">
        {milestones.map((milestone, i) => {
          const isLast = i === milestones.length - 1;
          const date = dateLine(milestone);
          const isUpcoming = milestone.status === "upcoming";

          return (
            <li key={milestone.stage} className="flex gap-3.5">
              {/* Marker column, with the connector running to the next stage. */}
              <div className="flex flex-col items-center">
                <StageMarker status={milestone.status} />
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1",
                      milestone.status === "done" ? "bg-purple2/35" : "bg-border"
                    )}
                  />
                )}
              </div>

              <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-6")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-[15px] font-semibold",
                      isUpcoming ? "text-text3" : "text-text"
                    )}
                  >
                    {SR_STATUS_TEXT[milestone.status] && (
                      <span className="sr-only">
                        {SR_STATUS_TEXT[milestone.status]}:{" "}
                      </span>
                    )}
                    {milestone.label}
                  </span>
                  {milestone.status === "in-progress" && (
                    <span className="rounded-full bg-purple2/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-purple2">
                      In progress
                    </span>
                  )}
                </div>

                {date && (
                  <p className="mt-0.5 text-[13.5px] text-text3">{date}</p>
                )}

                {milestone.note && (
                  <p className="mt-1.5 text-[14px] leading-relaxed text-text2">
                    {milestone.note}
                  </p>
                )}

                {milestone.photos.length > 0 && (
                  <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
                    {milestone.photos.map((photo, i) => (
                      <div
                        key={`${photo.url}-${i}`}
                        className="relative aspect-[3/2] w-[148px] shrink-0 overflow-hidden rounded-[14px] bg-surface2"
                      >
                        <Image
                          src={photo.url}
                          alt={photo.alt}
                          fill
                          className="object-cover"
                          sizes="148px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export { ConstructionTimeline };
export type { ConstructionTimelineProps };
