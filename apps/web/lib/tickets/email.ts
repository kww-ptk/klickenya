import { Resend } from "resend";
import QRCode from "qrcode";
import { sanityClient } from "@/lib/sanity/client";
import { buildEventIcs } from "./ics";
import { renderTicketsPdf, type PdfTicket } from "./ticketPdf";
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
  const dateStr = event?.eventDate
    ? new Date(event.eventDate).toLocaleString("en-KE", {
        dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi",
      })
    : null;
  const venue = [event?.venue, event?.venueAddress, event?.city].filter(Boolean).join(", ") || null;

  // QR data URLs feed the branded PDF (one page per ticket).
  const pdfTickets: PdfTicket[] = [];
  for (const t of tickets) {
    const qrDataUrl = await QRCode.toDataURL(`${SITE}/t/${t.code}`, { width: 480, margin: 1 });
    // Each ticket admits to its own occurrence (recurring events); fall back to
    // the event-level date for one-off tickets.
    const ticketDateStr = t.occurrence_date
      ? new Date(t.occurrence_date + "T00:00:00+03:00").toLocaleDateString("en-KE", {
          dateStyle: "full", timeZone: "Africa/Nairobi",
        })
      : dateStr;
    pdfTickets.push({
      tier_name: t.tier_name, attendee_name: name, price_kes: t.price_kes, code: t.code, qrDataUrl,
      dateStr: ticketDateStr,
    });
  }

  const attachments: { filename: string; content: string }[] = [];
  try {
    const pdf = await renderTicketsPdf({ title, dateStr, venue }, pdfTickets);
    attachments.push({
      filename: tickets.length > 1 ? "klickenya-tickets.pdf" : "klickenya-ticket.pdf",
      content: pdf.toString("base64"),
    });
  } catch (e) {
    // PDF is the primary artifact, but a render failure must not block the email —
    // the /t/<code> links below still deliver each QR.
    console.error("[tickets] pdf render failed:", e);
  }

  if (event?.eventDate) {
    const ics = buildEventIcs({
      uid: `${tickets[0].id}@klickenya.com`,
      title,
      start: new Date(event.eventDate),
      end: event.eventEndDate ? new Date(event.eventEndDate) : null,
      location: venue,
      url: `${SITE}/t/${tickets[0].code}`,
    });
    attachments.push({ filename: "event.ics", content: Buffer.from(ics).toString("base64") });
  }

  const ticketRows = tickets
    .map(
      (t) => `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0eee9;font-weight:600;color:#16130C">${t.tier_name}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0eee9;font-family:monospace;color:#6b675f">${t.code}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0eee9;text-align:right"><a href="${SITE}/t/${t.code}" style="color:#E8A020;font-weight:600;text-decoration:none">View&nbsp;QR&nbsp;&rarr;</a></td>
      </tr>`,
    )
    .join("");

  const plural = tickets.length > 1;
  const html = `
  <div style="background:#f6f4ef;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
      <div style="padding:22px 26px;border-bottom:3px solid #E8A020">
        <img src="${SITE}/logo-full.png" alt="Klickenya" style="height:26px" />
      </div>
      <div style="padding:26px">
        <h1 style="margin:0 0 6px;color:#16130C;font-size:21px;line-height:1.25">You're going to ${title}! 🎟️</h1>
        <p style="margin:0 0 16px;color:#57534c;font-size:15px">Hi ${name}, your ${plural ? tickets.length + " tickets are" : "ticket is"} ready.</p>
        ${dateStr ? `<p style="margin:2px 0;color:#16130C;font-size:14px"><strong>When</strong> &nbsp;${dateStr}</p>` : ""}
        ${venue ? `<p style="margin:2px 0;color:#16130C;font-size:14px"><strong>Where</strong> &nbsp;${venue}</p>` : ""}
        <div style="background:#fbf7ee;border:1px solid #f0e4c6;border-radius:10px;padding:14px 16px;margin:18px 0">
          <p style="margin:0;color:#8a6d1f;font-size:14px">📎 Your branded ticket${plural ? "s are" : " is"} attached as a PDF — open it and show the QR at the door. Screenshots work too.</p>
        </div>
        <table style="border-collapse:collapse;width:100%;margin-top:4px">${ticketRows}</table>
      </div>
      <div style="background:#16130C;padding:16px 26px;text-align:center">
        <p style="margin:0;color:#9C9485;font-size:12px">One scan per ticket &middot; <a href="${SITE}" style="color:#E8A020;text-decoration:none">klickenya.com</a></p>
      </div>
    </div>
  </div>`;

  await resend.emails.send({
    from: "Klickenya <hello@klickenya.com>",
    to: email,
    subject: `Your ticket${plural ? "s" : ""} — ${title}`,
    attachments,
    html,
  });
}
