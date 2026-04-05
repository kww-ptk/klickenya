import { wrap, cta } from "./hostEmails";

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(n: number): string {
  return `KSh ${n.toLocaleString()}`;
}

function summaryTable(rows: Array<[string, string]>): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;font-size:14px;">
  ${rows.map(([k, v]) => `
  <tr>
    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#9C9485;white-space:nowrap;">${k}</td>
    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#16130C;font-weight:600;text-align:right;">${v}</td>
  </tr>`).join("")}
</table>`;
}

function financialTable(p: {
  ratePerNight: number;
  nights: number;
  subtotal: number;
  fees?: Array<{ name: string; amount_kes: number }>;
  totalKes: number;
  amountPaid: number;
  balance: number;
  discountKes?: number;
}): string {
  const TD = `padding:8px 14px;border-bottom:1px solid #eee;`;
  const paid = p.amountPaid > 0
    ? `<tr><td style="${TD}color:#9C9485;">Amount paid</td><td style="${TD}color:#16A34A;font-weight:600;text-align:right;">${fmtMoney(p.amountPaid)}</td></tr>`
    : "";
  const balance = p.balance > 0
    ? `<tr><td style="${TD}color:#9C9485;">Balance due</td><td style="${TD}color:#DC2626;font-weight:600;text-align:right;">${fmtMoney(p.balance)}</td></tr>`
    : `<tr><td style="${TD}color:#9C9485;">Balance due</td><td style="${TD}color:#16A34A;font-weight:600;text-align:right;">Paid in full ✓</td></tr>`;
  const discount = p.discountKes && p.discountKes > 0
    ? `<tr><td style="${TD}color:#9C9485;">Discount</td><td style="${TD}color:#16A34A;font-weight:600;text-align:right;">-${fmtMoney(p.discountKes)}</td></tr>`
    : "";
  const feeRows = (p.fees ?? []).filter(f => f.amount_kes > 0).map(f =>
    `<tr><td style="${TD}color:#9C9485;">${f.name}</td><td style="${TD}color:#16130C;font-weight:600;text-align:right;">${fmtMoney(f.amount_kes)}</td></tr>`
  ).join("");
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;font-size:14px;">
  <tr><td style="${TD}color:#9C9485;">${fmtMoney(p.ratePerNight)} × ${p.nights} night${p.nights !== 1 ? "s" : ""}</td><td style="${TD}color:#16130C;font-weight:600;text-align:right;">${fmtMoney(p.subtotal)}</td></tr>
  ${discount}
  ${feeRows}
  <tr><td style="padding:10px 14px;background:#FFFBEB;border-top:2px solid #FCD34D;color:#92400E;font-weight:700;">Total</td><td style="padding:10px 14px;background:#FFFBEB;border-top:2px solid #FCD34D;color:#E8A020;font-weight:800;font-size:16px;text-align:right;">${fmtMoney(p.totalKes)}</td></tr>
  ${paid}
  ${balance}
</table>`;
}

/** Email to GUEST confirming their booking */
export function bookingConfirmationGuestHtml(p: {
  guestName: string;
  propertyName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  ratePerNight: number;
  subtotal: number;
  fees?: Array<{ name: string; amount_kes: number }>;
  totalKes: number;
  amountPaid: number;
  balance: number;
  discountKes?: number;
  checkInTime?: string;
  address?: string;
  bookingId?: string;
}): string {
  const shortRef = p.bookingId ? p.bookingId.slice(0, 8).toUpperCase() : "";

  return wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#16130C;">Your booking is confirmed! 🎉</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 24px;">Hi ${p.guestName.split(" ")[0]}, great news — your stay at <strong>${p.propertyName}</strong> has been confirmed.</p>

    <h2 style="margin:0 0 10px;font-size:15px;font-weight:600;color:#16130C;">Booking details</h2>
    ${summaryTable([
      ["Property", p.propertyName],
      ["Room", p.roomName],
      ["Check-in", fmtDate(p.checkIn) + (p.checkInTime ? ` from ${p.checkInTime}` : "")],
      ["Check-out", fmtDate(p.checkOut)],
      ["Nights", String(p.nights)],
      ["Guests", String(p.guests)],
      ...(p.address ? [["Address", p.address] as [string, string]] : []),
    ])}

    <h2 style="margin:0 0 10px;font-size:15px;font-weight:600;color:#16130C;">Payment summary</h2>
    ${financialTable({ ratePerNight: p.ratePerNight, nights: p.nights, subtotal: p.subtotal, fees: p.fees, totalKes: p.totalKes, amountPaid: p.amountPaid, balance: p.balance, discountKes: p.discountKes })}

    <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#16130C;">What&apos;s next</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;background:#FEF3C7;border-radius:50%;text-align:center;vertical-align:middle;color:#E8A020;font-weight:700;font-size:13px;">1</td>
          <td style="padding-left:12px;font-size:14px;color:#333;">You&apos;ll receive check-in details closer to your stay</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;background:#FEF3C7;border-radius:50%;text-align:center;vertical-align:middle;color:#E8A020;font-weight:700;font-size:13px;">2</td>
          <td style="padding-left:12px;font-size:14px;color:#333;">Contact the host directly for any questions</td>
        </tr></table>
      </td></tr>
      ${shortRef ? `<tr><td style="padding:10px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;background:#FEF3C7;border-radius:50%;text-align:center;vertical-align:middle;color:#E8A020;font-weight:700;font-size:13px;">3</td>
          <td style="padding-left:12px;font-size:14px;color:#333;">Your booking reference: <strong>#${shortRef}</strong></td>
        </tr></table>
      </td></tr>` : ""}
    </table>
    <p style="margin:0;font-size:12px;color:#9C9485;">Booked directly on Klickenya — no middleman fees.</p>
  `);
}

/** Email to OWNER notifying them of a new booking */
export function bookingNotificationOwnerHtml(p: {
  ownerName: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  propertyName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  ratePerNight: number;
  subtotal: number;
  fees?: Array<{ name: string; amount_kes: number }>;
  totalKes: number;
  amountPaid: number;
  balance: number;
  discountKes?: number;
  propertyId: string;
  bookingId: string;
  internalNotes?: string;
  convertedFromEnquiry?: string;
}): string {
  const dashboardUrl = `https://klickenya.com/dashboard/property/${p.propertyId}`;

  return wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#16130C;">New booking received</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 24px;">Hi ${p.ownerName}, you have a new booking at <strong>${p.propertyName}</strong>.</p>

    <h2 style="margin:0 0 10px;font-size:15px;font-weight:600;color:#16130C;">Guest</h2>
    ${summaryTable([
      ["Name", p.guestName],
      ["Phone", `<a href="tel:${p.guestPhone}" style="color:#E8A020;text-decoration:none;">${p.guestPhone}</a>`],
      ...(p.guestEmail ? [["Email", `<a href="mailto:${p.guestEmail}" style="color:#E8A020;text-decoration:none;">${p.guestEmail}</a>`] as [string, string]] : []),
    ])}

    <h2 style="margin:0 0 10px;font-size:15px;font-weight:600;color:#16130C;">Booking</h2>
    ${summaryTable([
      ["Property", p.propertyName],
      ["Room", p.roomName],
      ["Dates", `${fmtDate(p.checkIn)} → ${fmtDate(p.checkOut)}`],
      ["Nights", String(p.nights)],
      ["Guests", String(p.guests)],
      ...(p.convertedFromEnquiry ? [["Source", `Converted from enquiry · received ${p.convertedFromEnquiry}`] as [string, string]] : []),
    ])}

    <h2 style="margin:0 0 10px;font-size:15px;font-weight:600;color:#16130C;">Payment</h2>
    ${financialTable({ ratePerNight: p.ratePerNight, nights: p.nights, subtotal: p.subtotal, fees: p.fees, totalKes: p.totalKes, amountPaid: p.amountPaid, balance: p.balance, discountKes: p.discountKes })}

    ${p.internalNotes ? `
    <div style="margin-bottom:20px;padding:14px;background:#F5F3F0;border-radius:8px;border-left:3px solid #E8A020;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9C9485;text-transform:uppercase;letter-spacing:0.05em;">Internal notes</p>
      <p style="margin:0;font-size:13px;color:#5E5848;white-space:pre-wrap;">${p.internalNotes}</p>
    </div>` : ""}

    ${cta("View booking →", dashboardUrl)}
    <p style="margin-top:24px;font-size:12px;color:#9C9485;">Please contact the guest to confirm arrival details.</p>
  `);
}

/** Decline email to guest */
export function enquiryDeclineGuestHtml(p: {
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
  listingUrl: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#16130C;">Thank you for your interest</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 16px;">Hi ${p.guestName.split(" ")[0]},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 16px;">
      Thank you for your enquiry about <strong>${p.propertyName}</strong>
      ${p.checkIn && p.checkOut ? ` (${fmtDate(p.checkIn)} → ${fmtDate(p.checkOut)})` : ""}.
      Unfortunately we&apos;re unable to accommodate your request for those dates.
    </p>
    ${p.reason ? `<div style="margin:0 0 16px;padding:14px;background:#F5F3F0;border-radius:8px;"><p style="margin:0;font-size:14px;color:#5E5848;font-style:italic;">${p.reason}</p></div>` : ""}
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 24px;">We&apos;d love to host you another time — please check our availability for other dates.</p>
    ${cta("View other dates →", p.listingUrl)}
    <p style="margin-top:24px;font-size:12px;color:#9C9485;">Thank you for considering us, and we hope to welcome you soon!</p>
  `);
}
