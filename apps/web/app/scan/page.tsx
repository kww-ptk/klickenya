import { cookies } from "next/headers";
import { sanityClient } from "@/lib/sanity/client";
import { verifyDoorSession, DOOR_SESSION_COOKIE } from "@/lib/tickets/doorSession";
import ScannerClient from "@/app/dashboard/events/[id]/scan/ScannerClient";
import DoorCodeEntry from "./DoorCodeEntry";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan tickets — Klickenya", robots: { index: false } };

export default async function ScanPage() {
  const store = await cookies();
  const session = verifyDoorSession(store.get(DOOR_SESSION_COOKIE)?.value);
  if (!session) return <DoorCodeEntry />;

  const event = await sanityClient.fetch<{ title: string } | null>(
    `*[_type == "listing" && _id == $id][0]{title}`,
    { id: session.event_sanity_id },
  );
  return <ScannerClient eventSanityId={session.event_sanity_id} eventTitle={event?.title ?? "Event"} />;
}
