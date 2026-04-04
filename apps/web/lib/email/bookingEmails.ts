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

/** Email to GUEST confirming their booking */
export function bookingConfirmationGuestHtml(p: {
  guestName: string;
  propertyName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalKes: number;
  amountPaid: number;
  balance: number;
  checkInTime?: string;
  address?: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Booking confirmed!</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.guestName},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">Your stay at <strong>${p.propertyName}</strong> has been confirmed.</p>

    <div style="margin:20px 0;padding:20px;background:#F5F3F0;border-radius:8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;">
        <tr><td style="padding:4px 0;color:#9C9485;">Room</td><td style="padding:4px 0;text-align:right;font-weight:600;">${p.roomName}</td></tr>
        <tr><td style="padding:4px 0;color:#9C9485;">Check-in</td><td style="padding:4px 0;text-align:right;font-weight:600;">${fmtDate(p.checkIn)}${p.checkInTime ? ` from ${p.checkInTime}` : ""}</td></tr>
        <tr><td style="padding:4px 0;color:#9C9485;">Check-out</td><td style="padding:4px 0;text-align:right;font-weight:600;">${fmtDate(p.checkOut)}</td></tr>
        <tr><td style="padding:4px 0;color:#9C9485;">Duration</td><td style="padding:4px 0;text-align:right;font-weight:600;">${p.nights} night${p.nights !== 1 ? "s" : ""}</td></tr>
        <tr><td style="padding:4px 0;color:#9C9485;">Guests</td><td style="padding:4px 0;text-align:right;font-weight:600;">${p.guests}</td></tr>
        <tr><td colspan="2" style="padding:8px 0 4px;border-top:1px solid #E2DDD5;"></td></tr>
        <tr><td style="padding:4px 0;font-weight:700;color:#16130C;">Total</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#E8A020;font-size:16px;">${fmtMoney(p.totalKes)}</td></tr>
        ${p.amountPaid > 0 ? `<tr><td style="padding:4px 0;color:#9C9485;">Paid</td><td style="padding:4px 0;text-align:right;color:#16A34A;">${fmtMoney(p.amountPaid)}</td></tr>` : ""}
        ${p.balance > 0 ? `<tr><td style="padding:4px 0;color:#9C9485;">Balance due</td><td style="padding:4px 0;text-align:right;">${fmtMoney(p.balance)}</td></tr>` : ""}
      </table>
    </div>

    ${p.address ? `<p style="font-size:13px;color:#9C9485;">📍 ${p.address}</p>` : ""}
    <p style="font-size:14px;color:#333;line-height:1.6;">Your host will be in touch with arrival details. If you have any questions, simply reply to this email.</p>
    <p style="margin-top:24px;font-size:12px;color:#9C9485;">Booked directly on Klickenya — no middleman fees.</p>
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
  totalKes: number;
  amountPaid: number;
  balance: number;
  propertyId: string;
  bookingId: string;
}): string {
  const dashboardUrl = `https://klickenya.com/dashboard/property/${p.propertyId}`;

  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">New booking!</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.ownerName},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">You have a new booking at <strong>${p.propertyName}</strong>.</p>

    <div style="margin:20px 0;padding:20px;background:#F5F3F0;border-radius:8px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#16130C;">${p.guestName}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;">
        <tr><td style="padding:4px 0;color:#9C9485;">Phone</td><td style="padding:4px 0;text-align:right;"><a href="tel:${p.guestPhone}" style="color:#4F46E5;text-decoration:none;">${p.guestPhone}</a></td></tr>
        ${p.guestEmail ? `<tr><td style="padding:4px 0;color:#9C9485;">Email</td><td style="padding:4px 0;text-align:right;"><a href="mailto:${p.guestEmail}" style="color:#4F46E5;text-decoration:none;">${p.guestEmail}</a></td></tr>` : ""}
        <tr><td colspan="2" style="padding:8px 0 4px;border-top:1px solid #E2DDD5;"></td></tr>
        <tr><td style="padding:4px 0;color:#9C9485;">Room</td><td style="padding:4px 0;text-align:right;font-weight:600;">${p.roomName}</td></tr>
        <tr><td style="padding:4px 0;color:#9C9485;">Dates</td><td style="padding:4px 0;text-align:right;font-weight:600;">${fmtDate(p.checkIn)} → ${fmtDate(p.checkOut)}</td></tr>
        <tr><td style="padding:4px 0;color:#9C9485;">Duration</td><td style="padding:4px 0;text-align:right;">${p.nights} night${p.nights !== 1 ? "s" : ""} · ${p.guests} guest${p.guests !== 1 ? "s" : ""}</td></tr>
        <tr><td colspan="2" style="padding:8px 0 4px;border-top:1px solid #E2DDD5;"></td></tr>
        <tr><td style="padding:4px 0;font-weight:700;color:#16130C;">Total</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#E8A020;font-size:16px;">${fmtMoney(p.totalKes)}</td></tr>
        ${p.amountPaid > 0 ? `<tr><td style="padding:4px 0;color:#9C9485;">Paid</td><td style="padding:4px 0;text-align:right;color:#16A34A;">${fmtMoney(p.amountPaid)}</td></tr>` : ""}
        ${p.balance > 0 ? `<tr><td style="padding:4px 0;color:#9C9485;">Balance due</td><td style="padding:4px 0;text-align:right;color:#DC2626;">${fmtMoney(p.balance)}</td></tr>` : ""}
      </table>
    </div>

    ${cta("View in Dashboard", dashboardUrl)}
    <p style="margin-top:24px;font-size:12px;color:#9C9485;">Please contact the guest to confirm arrival details.</p>
  `);
}
