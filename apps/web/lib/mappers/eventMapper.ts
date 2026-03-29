const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

interface ScheduleEntry {
  day: string;
  startTime: string;
  endTime?: string;
}

function formatScheduleSummary(schedule: ScheduleEntry[]): string {
  if (!schedule || schedule.length === 0) return "";
  if (schedule.length === 1) {
    const s = schedule[0];
    const day = DAY_SHORT[s.day] ?? s.day;
    return `${day}, ${s.startTime}${s.endTime ? ` — ${s.endTime}` : ""}`;
  }
  // Multiple days: "Mon, Wed, Fri · 10:00"
  const days = schedule.map((s) => DAY_SHORT[s.day] ?? s.day).join(", ");
  const times = schedule[0].startTime;
  return `${days} · ${times}`;
}

function formatScheduleDays(schedule: ScheduleEntry[]): string {
  if (!schedule || schedule.length === 0) return "";
  return schedule.map((s) => DAY_SHORT[s.day] ?? s.day).join(", ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSanityEventToCard(listing: any) {
  const isRecurring = listing.isRecurring === true;
  const schedule = (listing.schedule ?? []) as ScheduleEntry[];
  const hasSchedule = isRecurring && schedule.length > 0;

  // Use eventDate if available, otherwise fall back to _createdAt
  const dateStr = listing.eventDate ?? listing._createdAt;
  const date = dateStr ? new Date(dateStr) : new Date();

  // Build time string
  let timeStr = "";
  if (hasSchedule) {
    timeStr = formatScheduleSummary(schedule);
  } else if (listing.eventDate) {
    const dayName = DAY_NAMES[date.getDay()];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h = hours % 12 || 12;
    const m = minutes > 0 ? `:${String(minutes).padStart(2, "0")}` : ":00";
    timeStr = `${dayName}, ${h}${m} ${ampm}`;

    if (listing.eventEndDate) {
      const end = new Date(listing.eventEndDate);
      const endH = end.getHours() % 12 || 12;
      const endM = end.getMinutes() > 0 ? `:${String(end.getMinutes()).padStart(2, "0")}` : ":00";
      const endAmpm = end.getHours() >= 12 ? "PM" : "AM";
      timeStr += ` — ${endH}${endM} ${endAmpm}`;
    }
  }

  // For recurring events with schedule, show days instead of date number
  let month: string;
  let day: string;
  if (hasSchedule) {
    month = "WEEKLY";
    day = formatScheduleDays(schedule);
  } else {
    month = MONTH_NAMES[date.getMonth()];
    day = String(date.getDate()).padStart(2, "0");
  }

  const citySlug = (listing.city ?? "kenya").toLowerCase().replace(/\s+/g, "-");
  const slug = listing.slug?.current ?? listing.slug ?? "";
  const coverUrl = listing.coverPhotoUrl ?? listing.coverPhoto?.asset?.url ?? "";

  return {
    title: listing.title ?? "Untitled Event",
    date: dateStr ?? "",
    month,
    day,
    location: listing.venue ?? listing.city ?? "",
    time: timeStr,
    price: listing.isFree ? "Free" : (listing.priceFrom ?? listing.price) ? `KSh ${(listing.priceFrom ?? listing.price).toLocaleString()}` : "Free",
    attending: 0,
    hostInitials: (listing.title ?? "EV").slice(0, 2).toUpperCase(),
    hostName: listing.city ?? "Kenya",
    href: `/events/${citySlug}/${slug}`,
    imageUrl: coverUrl,
    imageColor: "bg-[#3D5A3E]",
    isRecurring,
    recurrenceRule: listing.recurrenceRule ?? null,
  };
}
