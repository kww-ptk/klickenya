/**
 * billPdf.ts — Server-side PDF generator for bill receipts.
 *
 * Approach: jsPDF runs server-side too (no DOM dependency for the basic API
 * we use here — text(), line(), rect()). The codebase already ships jsPDF
 * for the QR PDF download in QRDownload.tsx, so no new dependency is added.
 *
 * Format: A5 portrait, single page. A5 (148 × 210 mm) is the standard
 * receipt-printer-friendly size in this region — fits a thermal 80mm roll
 * if the user scales to fit, and prints cleanly on standard A4 with
 * margins via "Fit to page".
 */

import { jsPDF } from "jspdf";
import type { FullBill } from "./sessions";
import { formatKes, formatNairobiDateTime } from "./bill";

export function renderBillPdf(full: FullBill): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const pageW = doc.internal.pageSize.getWidth();   // 148
  const margin = 10;
  const innerW = pageW - margin * 2;
  let y = margin + 4;

  /* ── Header ───────────────────────────────────────────────────────── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(full.restaurant.name, pageW / 2, y, { align: "center" });
  y += 7;

  if (full.restaurant.address) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(full.restaurant.address, pageW / 2, y, { align: "center" });
    y += 4;
  }
  if (full.restaurant.phone) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(full.restaurant.phone, pageW / 2, y, { align: "center" });
    y += 4;
  }

  y += 2;
  divider(doc, margin, y, innerW);
  y += 4;

  /* ── Session info ─────────────────────────────────────────────────── */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const dateLabel = formatNairobiDateTime(full.opened_at);
  metaLine(doc, margin, y, "Date", dateLabel);            y += 4.5;
  metaLine(doc, margin, y, "Table", full.table_number);   y += 4.5;
  metaLine(doc, margin, y, "Covers", String(full.covers)); y += 4.5;
  if (full.opened_by_name) {
    metaLine(doc, margin, y, "Staff", full.opened_by_name); y += 4.5;
  }
  if (full.bill_notes) {
    metaLine(doc, margin, y, "Notes", full.bill_notes); y += 4.5;
  }

  y += 1;
  divider(doc, margin, y, innerW);
  y += 5;

  /* ── Items table ──────────────────────────────────────────────────── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Item", margin, y);
  doc.text("Qty", margin + innerW - 35, y, { align: "right" });
  doc.text("Price", margin + innerW, y, { align: "right" });
  y += 3;
  divider(doc, margin, y, innerW);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const li of full.bill.line_items) {
    const namePart = li.options_text ? `${li.name} (${li.options_text})` : li.name;
    // Wrap long item names so they don't bleed into the qty/price columns.
    const wrapped = doc.splitTextToSize(namePart, innerW - 45) as string[];
    for (let i = 0; i < wrapped.length; i++) {
      doc.text(wrapped[i], margin, y);
      if (i === 0) {
        doc.text(String(li.quantity), margin + innerW - 35, y, { align: "right" });
        doc.text(formatKes(li.line_total), margin + innerW, y, { align: "right" });
      }
      y += 4.2;
    }
    if (li.notes) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize(`Note: ${li.notes}`, innerW - 8) as string[];
      for (const nl of noteLines) {
        doc.text(nl, margin + 3, y);
        y += 3.5;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }
  }

  y += 1;
  divider(doc, margin, y, innerW);
  y += 5;

  /* ── Totals ───────────────────────────────────────────────────────── */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  totalLine(doc, margin, y, innerW, "Subtotal", formatKes(full.bill.subtotal));      y += 4.5;
  if (full.bill.discount_pct_amount > 0) {
    totalLine(doc, margin, y, innerW, `Discount (${full.bill.discount_pct}%)`, `-${formatKes(full.bill.discount_pct_amount)}`); y += 4.5;
  }
  if (full.bill.discount_flat_amount > 0) {
    totalLine(doc, margin, y, innerW, "Flat discount", `-${formatKes(full.bill.discount_flat_amount)}`); y += 4.5;
  }
  if (full.bill.service_charge_amount > 0) {
    totalLine(doc, margin, y, innerW, `Service (${full.bill.service_charge_pct}%)`, formatKes(full.bill.service_charge_amount)); y += 4.5;
  }

  y += 1;
  divider(doc, margin, y, innerW);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  totalLine(doc, margin, y, innerW, "TOTAL", formatKes(full.bill.grand_total)); y += 6;

  if (full.bill.split_count > 1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    totalLine(doc, margin, y, innerW, `Per person (×${full.bill.split_count})`, formatKes(full.bill.per_person)); y += 5;
  }

  /* ── Payment ──────────────────────────────────────────────────────── */
  if (full.payment_method) {
    y += 2;
    divider(doc, margin, y, innerW);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const label =
      full.payment_method === "mpesa" ? "M-Pesa" :
      full.payment_method === "card" ? "Card" : "Cash";
    const ref = full.mpesa_ref ? ` (ref: ${full.mpesa_ref})` : "";
    doc.text(`Paid by: ${label}${ref}`, pageW / 2, y, { align: "center" });
    y += 5;
  }

  /* ── Footer ───────────────────────────────────────────────────────── */
  y += 4;
  divider(doc, margin, y, innerW);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Thank you for dining with us!", pageW / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated ${formatNairobiDateTime(new Date().toISOString())}`, pageW / 2, y, { align: "center" });
  y += 4;

  // Position the "Powered by" line at the bottom of the page.
  const footerY = doc.internal.pageSize.getHeight() - 8;
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("Powered by Klickenya", pageW / 2, footerY, { align: "center" });

  const ab = doc.output("arraybuffer");
  return Buffer.from(ab);
}

function divider(doc: jsPDF, x: number, y: number, w: number) {
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + w, y);
}

function metaLine(doc: jsPDF, x: number, y: number, label: string, value: string) {
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(label, x, y);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 30, y);
  doc.setFont("helvetica", "normal");
}

function totalLine(doc: jsPDF, x: number, y: number, w: number, label: string, value: string) {
  doc.text(label, x, y);
  doc.text(value, x + w, y, { align: "right" });
}
