// Server-side branded PDF ticket. jsPDF needs no DOM for text/rect/addImage;
// it's loaded via dynamic import (same pattern as billPdf.ts) so the ~250KB
// library stays out of cold-start bundles that never render a ticket.
import { KLICKENYA_LOGO_PNG, KLICKENYA_LOGO_W, KLICKENYA_LOGO_H } from "./brandAssets";

export type PdfTicket = {
  tier_name: string;
  attendee_name: string;
  price_kes: number;
  code: string;
  qrDataUrl: string; // PNG data URL
  dateStr?: string | null; // per-ticket occurrence night; falls back to event.dateStr
};

export type PdfEvent = {
  title: string;
  dateStr: string | null;
  venue: string | null;
};

const DARK: [number, number, number] = [22, 19, 12]; // #16130C
const AMBER: [number, number, number] = [232, 160, 32]; // #E8A020
const GREY: [number, number, number] = [120, 116, 108];

/** One branded A6 ticket per page, multi-page for a multi-ticket order. */
export async function renderTicketsPdf(event: PdfEvent, tickets: PdfTicket[]): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a6", compress: true }); // 105 × 148 mm
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 10;
  const innerW = W - M * 2;

  tickets.forEach((t, i) => {
    if (i > 0) doc.addPage();

    // Brand logo, top-left, scaled to 36mm wide (aspect preserved).
    const logoW = 36;
    const logoH = (KLICKENYA_LOGO_H / KLICKENYA_LOGO_W) * logoW;
    doc.addImage(KLICKENYA_LOGO_PNG, "PNG", M, M, logoW, logoH);

    // E-TICKET tag, top-right.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...AMBER);
    doc.text("E-TICKET", W - M, M + 5, { align: "right" });

    let y = M + logoH + 4;

    // Amber divider.
    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 7;

    // Event title (wrapped, capped at 2 lines).
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    const titleLines = (doc.splitTextToSize(event.title, innerW) as string[]).slice(0, 2);
    doc.text(titleLines, M, y);
    y += titleLines.length * 6 + 1;

    // When / where.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    const dateStr = t.dateStr ?? event.dateStr;
    if (dateStr) { doc.text(dateStr, M, y); y += 5; }
    if (event.venue) {
      const vLines = (doc.splitTextToSize(event.venue, innerW) as string[]).slice(0, 2);
      doc.text(vLines, M, y);
      y += vLines.length * 4.5;
    }
    y += 3;

    // QR, centered.
    const qr = 42;
    doc.addImage(t.qrDataUrl, "PNG", (W - qr) / 2, y, qr, qr);
    y += qr + 5;

    // Ticket code.
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(t.code, W / 2, y, { align: "center" });
    y += 6;

    // Tier · attendee · price.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    const price = t.price_kes > 0 ? `KSh ${t.price_kes.toLocaleString("en-KE")}` : "Free";
    const details = [t.tier_name, t.attendee_name, price].filter(Boolean).join("   ·   ");
    doc.text(details, W / 2, y, { align: "center" });

    // Footer band.
    const bandH = 11;
    doc.setFillColor(...DARK);
    doc.rect(0, H - bandH, W, bandH, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(
      "Present this QR at the door · one scan per ticket · klickenya.com",
      W / 2,
      H - bandH + 6.5,
      { align: "center" },
    );
  });

  return Buffer.from(doc.output("arraybuffer"));
}
