/**
 * bill.ts — Single source of truth for bill arithmetic.
 *
 * computeBill() is a pure function consumed by:
 *   - GET /api/menu/sessions/[id]/receipt   (JSON)
 *   - GET /api/menu/sessions/[id]/receipt.pdf (server PDF render)
 *   - /pos/receipt/[sessionId] (print-optimised HTML page)
 *   - PosSessionDetail's live preview as the waiter types discounts
 *   - WhatsApp + email text bodies
 *
 * Discount order is the standard Kenyan restaurant convention:
 *   1. Apply percentage discount to subtotal
 *   2. Subtract flat discount from the result
 *   3. Apply service charge to the post-discount amount
 *
 * per_person always rounds up via Math.ceil so the restaurant never loses a
 * shilling to rounding when the bill is split.
 */

export interface BillLineItemInput {
  item_name:        string;
  item_price:       number;
  quantity:         number;
  selected_options?: { name: string; price_modifier: number }[];
  allergy_notes?:   string | null;
}

export interface BillOrderInput {
  items:        BillLineItemInput[];
  waiter_name?: string | null;
  created_at:   string;
}

export interface BillInput {
  orders:               BillOrderInput[];
  service_charge_pct:   number;
  discount_pct:         number;
  discount_amount_kes:  number;
  split_count:          number;
}

export interface BillLineItem {
  name:         string;
  options_text?: string;
  quantity:     number;
  unit_price:   number;
  line_total:   number;
  notes?:       string;
}

export interface BillOutput {
  line_items:             BillLineItem[];
  subtotal:               number;
  discount_pct:           number;   // echo of input for rendering "Discount (10%)"
  discount_pct_amount:    number;
  discount_flat_amount:   number;
  total_discount:         number;
  after_discount:         number;
  service_charge_pct:     number;
  service_charge_amount:  number;
  grand_total:            number;
  per_person:             number;
  split_count:            number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Apply discount + service charge to a precomputed subtotal. Same arithmetic
 * as computeBill but without the per-item rendering — useful for client-side
 * live preview where the subtotal is already cached on the session row.
 */
export function applyBillTotals(input: {
  subtotal:             number;
  service_charge_pct:   number;
  discount_pct:         number;
  discount_amount_kes:  number;
  split_count:          number;
}): Omit<BillOutput, "line_items"> {
  const splitCount   = Math.max(1, Math.min(20, Math.round(input.split_count || 1)));
  const servicePct   = Math.max(0, Math.min(100, Number(input.service_charge_pct) || 0));
  const discountPct  = Math.max(0, Math.min(100, Number(input.discount_pct) || 0));
  const discountFlat = Math.max(0, Number(input.discount_amount_kes) || 0);
  const subtotal     = round2(Math.max(0, Number(input.subtotal) || 0));

  const discount_pct_amount  = round2(subtotal * (discountPct / 100));
  const discount_flat_amount = round2(Math.min(discountFlat, subtotal - discount_pct_amount));
  const total_discount       = round2(discount_pct_amount + discount_flat_amount);
  const after_discount       = round2(Math.max(0, subtotal - total_discount));
  const service_charge_amount = round2(after_discount * (servicePct / 100));
  const grand_total          = round2(after_discount + service_charge_amount);
  const per_person           = Math.ceil(grand_total / splitCount);

  return {
    subtotal,
    discount_pct:          discountPct,
    discount_pct_amount,
    discount_flat_amount,
    total_discount,
    after_discount,
    service_charge_pct:    servicePct,
    service_charge_amount,
    grand_total,
    per_person,
    split_count:           splitCount,
  };
}

export function computeBill(input: BillInput): BillOutput {
  const line_items: BillLineItem[] = [];
  let subtotal = 0;

  for (const order of input.orders) {
    for (const it of order.items) {
      const optionAdds = (it.selected_options ?? []).reduce(
        (s, o) => s + (Number(o.price_modifier) || 0),
        0,
      );
      const unit = Number(it.item_price) + optionAdds;
      const line = unit * Number(it.quantity);
      subtotal += line;

      const optionsText = (it.selected_options ?? []).map((o) => o.name).join(", ");

      line_items.push({
        name:       it.item_name,
        options_text: optionsText.length > 0 ? optionsText : undefined,
        quantity:   it.quantity,
        unit_price: round2(unit),
        line_total: round2(line),
        notes:      it.allergy_notes || undefined,
      });
    }
  }

  return {
    line_items,
    ...applyBillTotals({
      subtotal:            subtotal,
      service_charge_pct:  input.service_charge_pct,
      discount_pct:        input.discount_pct,
      discount_amount_kes: input.discount_amount_kes,
      split_count:         input.split_count,
    }),
  };
}

/* ── Formatting ─────────────────────────────────────────────────────────────── */

const KES_FMT = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

export function formatKes(n: number): string {
  return `KES ${KES_FMT.format(Math.round(n))}`;
}

export function formatNairobiDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    year:    "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
    hour12:  false,
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

export function formatNairobiDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day:     "numeric",
    month:   "short",
    year:    "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

/* ── WhatsApp share ─────────────────────────────────────────────────────────── */

export interface BillRestaurantMeta {
  name:    string;
  phone?:  string | null;
  address?: string | null;
}

/**
 * Build the wa.me deep link with a pre-formatted text bill summary. No phone
 * number is pre-filled — the waiter picks who to send it to in WhatsApp.
 */
export function generateBillWhatsAppUrl(
  bill: BillOutput,
  restaurant: BillRestaurantMeta,
  tableNumber: string,
  opts?: { paymentMethod?: string | null; mpesaRef?: string | null; openedAt?: string },
): string {
  return `https://wa.me/?text=${encodeURIComponent(buildBillText(bill, restaurant, tableNumber, opts))}`;
}

export function buildBillText(
  bill: BillOutput,
  restaurant: BillRestaurantMeta,
  tableNumber: string,
  opts?: { paymentMethod?: string | null; mpesaRef?: string | null; openedAt?: string },
): string {
  const lines: string[] = [];
  const date = opts?.openedAt ? formatNairobiDate(opts.openedAt) : formatNairobiDate(new Date().toISOString());

  lines.push(`🧾 Bill from ${restaurant.name}`);
  lines.push(`Table ${tableNumber} · ${date}`);
  lines.push("");

  for (const li of bill.line_items) {
    const optSuffix = li.options_text ? ` (${li.options_text})` : "";
    lines.push(`${li.name}${optSuffix} ×${li.quantity} — ${formatKes(li.line_total)}`);
  }

  lines.push("");
  lines.push(`Subtotal: ${formatKes(bill.subtotal)}`);
  if (bill.discount_pct_amount > 0) {
    lines.push(`Discount (${bill.discount_pct}%): -${formatKes(bill.discount_pct_amount)}`);
  }
  if (bill.discount_flat_amount > 0) {
    lines.push(`Flat discount: -${formatKes(bill.discount_flat_amount)}`);
  }
  if (bill.service_charge_amount > 0) {
    lines.push(`Service (${bill.service_charge_pct}%): ${formatKes(bill.service_charge_amount)}`);
  }
  lines.push("━━━━━━━━━━━━━━━━━━━");
  lines.push(`Total: ${formatKes(bill.grand_total)}`);
  if (bill.split_count > 1) {
    lines.push(`Per person (×${bill.split_count}): ${formatKes(bill.per_person)}`);
  }
  if (opts?.paymentMethod) {
    const refSuffix = opts.mpesaRef ? ` (ref: ${opts.mpesaRef})` : "";
    const label = opts.paymentMethod === "mpesa" ? "M-Pesa" : opts.paymentMethod === "card" ? "Card" : "Cash";
    lines.push("");
    lines.push(`Paid by: ${label}${refSuffix}`);
  }

  lines.push("");
  lines.push("Thank you! 🙏");

  return lines.join("\n");
}
