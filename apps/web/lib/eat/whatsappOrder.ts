import type { CartLine } from "@/app/eatklick/_components/useEatCart";

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
 * The trade-off is honest and worth stating: nothing is recorded server-side
 * by this path. The kitchen gets a message; Klickenya gets no order row, no
 * status, no history. It is a handoff, not an ordering system. Real orders
 * still need takeaway_enabled and POST /api/orders.
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
  customerName: string;
  customerPhone: string;
  note?: string;
}): string {
  const {
    restaurant,
    lines,
    totalKes,
    fulfilment,
    deliveryAddress,
    customerName,
    customerPhone,
    note,
  } = input;

  const items = lines
    .map((l) => {
      const base = `• ${l.qty} × ${l.name} — KSh ${(l.priceKes * l.qty).toLocaleString()}`;
      return l.note ? `${base}\n   (${l.note})` : base;
    })
    .join("\n");

  const parts = [
    `*New order — ${restaurant}*`,
    "",
    items,
    "",
    `*Total: KSh ${totalKes.toLocaleString()}*`,
    "",
    fulfilment === "delivery"
      ? `🛵 Delivery to: ${deliveryAddress || "(address not given)"}`
      : "🥡 Collecting in person",
    "",
    `Name: ${customerName}`,
    `Phone: ${customerPhone}`,
  ];

  if (note) parts.push("", `Note: ${note}`);
  parts.push("", "Sent via Klickenya");

  return parts.join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(message)}`;
}
