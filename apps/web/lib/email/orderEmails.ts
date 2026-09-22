/**
 * The email a restaurant gets the moment an order is placed on
 * eat.klickenya.com — takeaway or delivery.
 *
 * Until this existed nothing told a restaurant an order was there unless the
 * guest pressed Send in WhatsApp. This is the copy that always goes out;
 * WhatsApp stays the customer's copy. Sent by lib/orders/notifyRestaurant.ts.
 */
import { cta, wrap } from "@/lib/email/hostEmails";

export type NewOrderEmailInput = {
  restaurantName: string;
  shortId: string;
  orderType: "takeaway" | "delivery";
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  note: string | null;
  lines: { name: string; quantity: number; lineTotal: number; options?: string | null }[];
  subtotalKes: number;
  deliveryFeeKes: number;
  totalKes: number;
  queueUrl: string;
};

/** Escape guest-typed strings before they land in email HTML. Coerces
 *  null/undefined so a missing field can never throw and kill the email. */
function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;"
      : c === "<" ? "&lt;"
      : c === ">" ? "&gt;"
      : c === '"' ? "&quot;"
      : "&#39;",
  );
}

const kes = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

const LABEL = "margin:0;font-size:12px;color:#9C9485;text-transform:uppercase;letter-spacing:0.04em;";
const VALUE = "margin:2px 0 0;font-size:15px;color:#16130C;line-height:1.5;";
const CELL = "padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:#16130C;vertical-align:top;";

/** "New delivery order #A1B2C3D4 — Jane, KSh 2,700" */
export function newOrderEmailSubject(p: NewOrderEmailInput): string {
  const who = p.customerName?.trim();
  return `New ${p.orderType} order #${p.shortId} — ${who ? `${who}, ` : ""}${kes(p.totalKes)}`;
}

export function newOrderEmailHtml(p: NewOrderEmailInput): string {
  const isDelivery = p.orderType === "delivery";

  const lineRows = p.lines.length
    ? p.lines
        .map(
          (l) => `
      <tr>
        <td style="${CELL}">
          <strong>${l.quantity} &times;</strong> ${esc(l.name)}
          ${l.options ? `<div style="margin-top:2px;font-size:12px;color:#9C9485;">${esc(l.options)}</div>` : ""}
        </td>
        <td align="right" style="${CELL}padding-left:12px;white-space:nowrap;">${kes(l.lineTotal)}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td style="${CELL}color:#9C9485;">No items listed</td></tr>`;

  const totalRow = (label: string, amount: number) => `
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#9C9485;">${label}</td>
        <td align="right" style="padding:4px 0 4px 12px;font-size:13px;color:#16130C;white-space:nowrap;">${kes(amount)}</td>
      </tr>`;
  const totalsRows = [
    totalRow("Food", p.subtotalKes),
    isDelivery && p.deliveryFeeKes > 0 ? totalRow("Delivery fee", p.deliveryFeeKes) : "",
    `
      <tr>
        <td style="padding:10px 0 0;border-top:1px solid #e5e7eb;font-size:15px;font-weight:700;color:#16130C;">Total</td>
        <td align="right" style="padding:10px 0 0 12px;border-top:1px solid #e5e7eb;font-size:15px;font-weight:700;color:#16130C;white-space:nowrap;">${kes(p.totalKes)}</td>
      </tr>`,
  ].join("");

  // tel: wants digits and a leading +; the display keeps whatever the guest typed.
  const phoneText = p.customerPhone?.trim() ?? "";
  const phoneDigits = phoneText.replace(/[^\d+]/g, "");
  const phoneHtml = !phoneText
    ? `<span style="color:#9C9485;">No phone given</span>`
    : phoneDigits
      ? `<a href="tel:${esc(phoneDigits)}" style="color:#16130C;text-decoration:underline;">${esc(phoneText)}</a>`
      : esc(phoneText);
  const note = p.note?.trim();

  const customerBlock = `
    <div style="margin:20px 0 0;padding:16px;background:#F5F3F0;border-radius:8px;">
      <p style="${LABEL}">Customer</p>
      <p style="${VALUE}font-weight:600;">${esc(p.customerName?.trim() || "No name given")}</p>
      <p style="${VALUE}">${phoneHtml}</p>
      ${
        isDelivery
          ? `<div style="margin-top:12px;">
        <p style="${LABEL}">Deliver to</p>
        <p style="${VALUE}">${esc(p.deliveryAddress?.trim() || "No address given")}</p>
      </div>`
          : ""
      }
      ${
        note
          ? `<div style="margin-top:12px;">
        <p style="${LABEL}">Note from the customer</p>
        <p style="${VALUE}">${esc(note)}</p>
      </div>`
          : ""
      }
    </div>`;

  // Start preparing is what puts a delivery job in front of riders. A takeaway
  // has no rider, so say only what the tap does for it.
  const nextStep = isDelivery
    ? "Tap Start preparing on the queue so the rider is told to come."
    : "Tap Start preparing on the queue to accept it.";

  return wrap(`
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#16130C;">New ${p.orderType} order #${esc(p.shortId)}</h1>
    <p style="margin:0;font-size:13px;color:#9C9485;">${esc(p.restaurantName)} &middot; Placed just now on eat.klickenya.com</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;">${lineRows}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-collapse:collapse;">${totalsRows}
    </table>
    ${customerBlock}
    ${cta("Open the order queue", p.queueUrl)}
    <p style="margin:24px 0 0;font-size:12px;color:#9C9485;line-height:1.6;">${nextStep} This email is sent for every order; WhatsApp is the customer's copy.</p>
  `);
}
