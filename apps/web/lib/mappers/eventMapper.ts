const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSanityEventToCard(listing: any) {
  // Use eventDate if available, otherwise fall back to _createdAt
  const dateStr = listing.eventDate ?? listing._createdAt;
  const date = dateStr ? new Date(dateStr) : new Date();

  // Build time string from eventDate
  let timeStr = "";
  if (listing.eventDate) {
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

  const citySlug = (listing.city ?? "kenya").toLowerCase().replace(/\s+/g, "-");
  const slug = listing.slug?.current ?? listing.slug ?? "";
  const coverUrl = listing.coverPhotoUrl ?? listing.coverPhoto?.asset?.url ?? "";

  return {
    title: listing.title ?? "Untitled Event",
    date: dateStr ?? "",
    month: MONTH_NAMES[date.getMonth()],
    day: String(date.getDate()).padStart(2, "0"),
    location: listing.venue ?? listing.city ?? "",
    time: timeStr,
    price: listing.price ? `KSh ${listing.price.toLocaleString()}` : "Free",
    attending: 0,
    hostInitials: (listing.title ?? "EV").slice(0, 2).toUpperCase(),
    hostName: listing.city ?? "Kenya",
    href: `/events/${citySlug}/${slug}`,
    imageUrl: coverUrl,
    imageColor: "bg-[#3D5A3E]",
  };
}
