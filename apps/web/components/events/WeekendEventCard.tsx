import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

interface WeekendEventCardProps {
  title: string;
  slug: string;
  city: string;
  subcategory: string | null;
  coverPhotoUrl: string | null;
  eventDate: string;
  isFree: boolean;
  priceFrom: number | null;
  /**
   * Optional recurrence label (e.g. "Every Friday"). Used as a fallback for
   * recurring / undated events where `eventDate` is missing or unparseable, so
   * the date badge and weekday line stay meaningful instead of showing NaN.
   */
  recurrenceRule?: string | null;
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  parties: "Party",
  festival: "Festival",
  art_culture: "Art & Culture",
  wellness_sport: "Wellness & Sport",
  networking: "Networking",
  kids: "Kids",
  other: "Other",
};

function WeekendEventCard({
  title,
  slug,
  city,
  subcategory,
  coverPhotoUrl,
  eventDate,
  isFree,
  priceFrom,
  recurrenceRule,
}: WeekendEventCardProps) {
  const date = new Date(eventDate);
  const hasValidDate = !Number.isNaN(date.getTime());
  const day = hasValidDate ? date.getDate() : null;
  const month = hasValidDate
    ? date.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
    : null;
  const weekday = hasValidDate
    ? date.toLocaleDateString("en-US", { weekday: "short" })
    : null;
  const citySlug = city.toLowerCase().replace(/\s+/g, "-");

  return (
    <Link
      href={`/events/${citySlug}/${slug}`}
      className="group relative flex flex-col rounded-[20px] overflow-hidden bg-zinc-900 border border-white/10 hover:border-amber-500/30 transition-all duration-300"
    >
      {/* Cover image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {coverPhotoUrl ? (
          <Image
            src={coverPhotoUrl + "?w=600&h=375&fit=crop&auto=format&q=80"}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-amber-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Date badge — concrete date, or a recurrence pill for undated/recurring events */}
        {hasValidDate ? (
          <div className="absolute top-3 left-3 bg-white rounded-[12px] px-3 py-1.5 text-center shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600">{month}</p>
            <p className="text-[20px] font-extrabold leading-none text-zinc-900">{day}</p>
          </div>
        ) : (
          <div className="absolute top-3 left-3 bg-white rounded-[12px] px-3 py-1.5 text-center shadow-lg">
            <p className="text-[12px] font-bold uppercase tracking-wide text-purple-600 leading-none">
              {recurrenceRule || "TBA"}
            </p>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-5">
        <h3 className="text-[16px] font-semibold text-white leading-snug line-clamp-2 mb-2 group-hover:text-amber-400 transition-colors">
          {title}
        </h3>

        <div className="flex items-center gap-1.5 text-[13px] text-white/50 mb-3">
          <MapPin className="size-3.5 shrink-0" />
          <span>{city}</span>
          {(weekday || recurrenceRule) && (
            <>
              <span className="mx-1">·</span>
              <span>{weekday ?? recurrenceRule}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {subcategory && (
            <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/70">
              {SUBCATEGORY_LABELS[subcategory] ?? subcategory}
            </span>
          )}
          <span className="inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
            {isFree ? "FREE" : priceFrom ? `From KES ${priceFrom.toLocaleString()}` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

export { WeekendEventCard };
export type { WeekendEventCardProps };
