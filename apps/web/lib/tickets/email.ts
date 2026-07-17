import { Resend } from "resend";
import QRCode from "qrcode";
import { sanityClient } from "@/lib/sanity/client";
import { buildEventIcs } from "./ics";
import type { TicketRow } from "./issue";

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";

export async function sendTicketEmail(
  eventSanityId: string,
  name: string,
  email: string,
  tickets: TicketRow[],
) {
  const event = await sanityClient.fetch<{
    title: string; city: string | null; venue: string | null;
    venueAddress: string | null; eventDate: string | null; eventEndDate: string | null;
  } | null>(
    `*[_type == "listing" && _id == $id][0]{title, city, venue, venueAddress, eventDate, eventEndDate}`,
    { id: eventSanityId },
  );
  const title = event?.title ?? "Your event";

  const attachments: { filename: string; content: string }[] = [];
  for (const t of tickets) {
    const png = await QRCode.toBuffer(`${SITE}/t/${t.code}`, { width: 480, margin: 2 });
    attachments.push({ filename: `ticket-${t.code}.png`, content: png.toString("base64") });
  }
  if (event?.eventDate) {
    const ics = buildEventIcs({
      uid: `${tickets[0].id}@klickenya.com`,
      title,
      start: new Date(event.eventDate),
      end: event.eventEndDate ? new Date(event.eventEndDate) : null,
      location: [event.venue, event.venueAddress, event.city].filter(Boolean).join(", ") || null,
      url: `${SITE}/t/${tickets[0].code}`,
    });
    attachments.push({ filename: "event.ics", content: Buffer.from(ics).toString("base64") });
  }

  const ticketList = tickets
    .map(
      (t) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${t.tier_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace">${t.code}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee"><a href="${SITE}/t/${t.code}">View QR</a></td>
      </tr>`,
    )
    .join("");

  await resend.emails.send({
    from: "Klickenya <hello@klickenya.com>",
    to: email,
    subject: `Your ticket${tickets.length > 1 ? "s" : ""} — ${title}`,
    attachments,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#16130C">You're going to ${title}! 🎟️</h2>
        <p>Hi ${name},</p>
        <p>Your ticket${tickets.length > 1 ? "s are" : " is"} attached as QR code${tickets.length > 1 ? "s" : ""}.
           Show the QR at the door — screenshots work fine.</p>
        <table style="border-collapse:collapse;width:100%">${ticketList}</table>
        <p style="margin-top:20px;color:#9C9485;font-size:13px">
          Keep this email — each QR admits one person and can only be scanned once.</p>
      </div>`,
  });
}
