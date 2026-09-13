import type { CartLine } from "@/components/eat/useEatCart";
import { mapsUrl } from "@/lib/orders/location";

export type Fulfilment = "pickup" | "delivery";

/**
 * Compose the order as a WhatsApp message to the kitchen.
 *
 * The order is handed over by opening WhatsApp with everything already
 * written, rather than sent through the WhatsApp Business API. That API needs
 * a Meta business account and a message template approved by Meta before a
 * business may start a conversation — days of setup — whereas a wa.me link
 * works this afternoon and lands in the app restaurants already watch all day.
 *
 * This is the HANDOFF only. The order itself is recorded first, by POST
 * /api/orders, and this message carries the resulting reference so the
 * WhatsApp thread and the dashboard ticket are obviously the same order.
 * Never send this without persisting first — a message the owner cannot find
 * in their dashboard is exactly the gap this replaced.
 */

/** wa.me wants digits only — no +, spaces, dashes or brackets. */
export function waNumber(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function buildOrderMessage(input: {
  restaurant: string;
  lines: CartLine[];
  totalKes: number;
  fulfilment: Fulfilment;
  deliveryAddress?: string;
  /** Pin, when the guest shared one. The kitchen reads the order here, so
   *  this is the single most useful line on a delivery. */
  deliveryCoords?: { lat: number; lng: number } | null;
  customerName: string;
  customerPhone: string;
  note?: string;
  /** Short reference of the saved order, so the thread matches the ticket. */
  orderRef?: string;
  /** Live status page for this order. Unguessable — it carries the order id. */
  trackUrl?: string;
}): string {
  const {
    restaurant,
    lines,
    totalKes,
    fulfilment,
    deliveryAddress,
    deliveryCoords,
    customerName,
    customerPhone,
    note,
    orderRef,
    trackUrl,
  } = input;

  const items = lines
    .map((l) => {
      const addOns = (l.options ?? []).reduce((n, o) => n + (o.price_add ?? 0), 0);
      const lineKes = (l.priceKes + addOns) * l.qty;
      const parts = [`• ${l.qty} × ${l.name} — KSh ${lineKes.toLocaleString()}`];
      // Add-ons go on their own lines: the kitchen reads this while cooking.
      for (const o of l.options ?? []) {
        parts.push(`   + ${o.choice}${o.price_add ? ` (+${o.price_add})` : ""}`);
      }
      if (l.note) parts.push(`   (${l.note})`);
      return parts.join("\n");
    })
    .join("\n");

  const parts = [
    `*New order — ${restaurant}*`,
    ...(orderRef ? [`Order #${orderRef}`] : []),
    "",
    items,
    "",
    `*Total: KSh ${totalKes.toLocaleString()}*`,
    "",
    fulfilment === "delivery"
      ? `🛵 Delivery to: ${deliveryAddress || "(address not given)"}`
      : "🥡 Collecting in person",
    ...(fulfilment === "delivery" && deliveryCoords
      ? [`📍 Map: ${mapsUrl(deliveryCoords)}`]
      : []),
    "",
    `Name: ${customerName}`,
    `Phone: ${customerPhone}`,
  ];

  if (note) parts.push("", `Note: ${note}`);
  // The guest sends this message, so the link lands in their own chat too —
  // which is exactly where they will look for it later. The restaurant gets
  // the same view of the order it is cooking.
  if (trackUrl) parts.push("", `Track this order: ${trackUrl}`);
  parts.push("", "Sent via Klickenya");

  return parts.join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(message)}`;
}
