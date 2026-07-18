import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { TICKET_CODE_RE } from "@/lib/tickets/codes";
import TicketQr from "./TicketQr";

export const dynamic = "force-dynamic"; // status must always be live
export const metadata = { title: "Your ticket — Klickenya", robots: { index: false } };

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!TICKET_CODE_RE.test(code)) notFound();

  const { data: ticket } = await adminClient
    .from("tickets")
    .select("code, tier_name, price_kes, status, attendee_name, event_sanity_id, checked_in_at, occurrence_date")
    .eq("code", code)
    .maybeSingle();
  if (!ticket) notFound();

  const event = await sanityClient.fetch<{
    title: string; venue: string | null; city: string | null; eventDate: string | null;
  } | null>(
    `*[_type == "listing" && _id == $id][0]{title, venue, city, eventDate}`,
    { id: ticket.event_sanity_id },
  );

  // A recurring-event ticket admits to one specific night — show THAT date.
  // Falls back to the event's generic eventDate for one-off tickets.
  const dateStr = ticket.occurrence_date
    ? new Date(ticket.occurrence_date + "T00:00:00+03:00").toLocaleDateString("en-KE", {
        dateStyle: "full", timeZone: "Africa/Nairobi",
      })
    : event?.eventDate
    ? new Date(event.eventDate).toLocaleString("en-KE", {
        dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi",
      })
    : null;

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
        <div className="bg-[#16130C] p-5 text-white">
          <p className="text-xs uppercase tracking-wide text-amber-400">Klickenya Ticket</p>
          <h1 className="mt-1 text-lg font-bold">{event?.title ?? "Event"}</h1>
          {dateStr && <p className="mt-1 text-sm text-neutral-300">{dateStr}</p>}
          {event?.venue && (
            <p className="text-sm text-neutral-300">{event.venue}{event.city ? `, ${event.city}` : ""}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-3 p-6">
          {ticket.status === "issued" && <TicketQr value={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com"}/t/${ticket.code}`} />}
          {ticket.status === "checked_in" && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              ✓ Checked in{ticket.checked_in_at ? ` · ${new Date(ticket.checked_in_at).toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi" })}` : ""}
            </p>
          )}
          {ticket.status === "cancelled" && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">This ticket was cancelled</p>
          )}
          <p className="font-mono text-sm tracking-widest text-neutral-500">{ticket.code}</p>
          <div className="w-full border-t border-dashed pt-3 text-center">
            <p className="text-sm font-semibold">{ticket.tier_name}</p>
            <p className="text-xs text-neutral-500">{ticket.attendee_name}</p>
            {ticket.price_kes > 0 && <p className="text-xs text-neutral-500">KSh {ticket.price_kes.toLocaleString("en-KE")}</p>}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-neutral-400">One scan per ticket. Screenshot-friendly.</p>
    </main>
  );
}
