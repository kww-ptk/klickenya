import { cookies } from "next/headers";
import { sanityClient } from "@/lib/sanity/client";
import { verifyDoorSession, DOOR_SESSION_COOKIE } from "@/lib/tickets/doorSession";
import { getCheckinCounts } from "@/lib/tickets/checkinCounts";
import { nextOccurrences } from "@/lib/tickets/occurrences";
import ScannerClient from "@/app/dashboard/events/[id]/scan/ScannerClient";
import DoorCodeEntry from "./DoorCodeEntry";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan tickets — Klickenya", robots: { index: false } };

export default async function ScanPage() {
  const store = await cookies();
  const session = verifyDoorSession(store.get(DOOR_SESSION_COOKIE)?.value);
  if (!session) return <DoorCodeEntry />;

  const [event, { total, checkedIn }] = await Promise.all([
    sanityClient.fetch<{
      title: string;
      isRecurring: boolean | null;
      schedule: { day?: string; startTime?: string; endTime?: string }[] | null;
    } | null>(
      `*[_type == "listing" && _id == $id][0]{ title, isRecurring, schedule[]{day, startTime, endTime} }`,
      { id: session.event_sanity_id },
    ),
    getCheckinCounts(session.event_sanity_id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const occurrenceDates = event?.isRecurring
    ? nextOccurrences(event.schedule ?? [], today, 8)
    : [];
  const defaultScanDate = occurrenceDates.includes(today)
    ? today
    : (occurrenceDates[0] ?? null);

  return (
    <ScannerClient
      eventSanityId={session.event_sanity_id}
      eventTitle={event?.title ?? "Event"}
      initialCheckedIn={checkedIn}
      totalIssued={total}
      occurrenceDates={occurrenceDates}
      defaultScanDate={defaultScanDate}
    />
  );
}
