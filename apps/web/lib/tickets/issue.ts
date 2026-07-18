// Issue tickets for a paid (or free) order. Idempotent: if tickets already
// exist for the order, returns them without re-issuing or re-emailing.
import { adminClient } from "@/lib/supabase/admin";
import { generateTicketCode } from "./codes";
import { sendTicketEmail } from "./email";
import type { OrderLine } from "./pricing";

export type TicketRow = {
  id: string;
  code: string;
  tier_key: string;
  tier_name: string;
  price_kes: number;
  status: string;
  occurrence_date: string | null;
  attendee_name: string;
};

export async function issueTicketsForOrder(orderId: string): Promise<TicketRow[]> {
  const { data: order, error } = await adminClient
    .from("ticket_orders")
    .select("id, event_sanity_id, buyer_name, buyer_email, buyer_phone, user_id, lines, status, occurrence_date")
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error(`Order not found: ${orderId}`);

  // Idempotency guard — webhook retries and callback-poller races both land here.
  const { data: existing } = await adminClient
    .from("tickets")
    .select("id, code, tier_key, tier_name, price_kes, status, occurrence_date, attendee_name")
    .eq("order_id", orderId);
  if (existing && existing.length > 0) return existing as TicketRow[];

  const lines = order.lines as (OrderLine & { names?: string[] })[];
  const rows = lines.flatMap((line) =>
    Array.from({ length: line.qty }, (_unused, i) => ({
      order_id: order.id,
      event_sanity_id: order.event_sanity_id,
      occurrence_date: order.occurrence_date,
      tier_key: line.tier_key,
      tier_name: line.tier_name,
      price_kes: line.unit_price_kes,
      code: generateTicketCode(),
      attendee_name: (line.names?.[i] ?? "").trim() || order.buyer_name,
      attendee_email: order.buyer_email,
    })),
  );

  const { data: inserted, error: insErr } = await adminClient
    .from("tickets")
    .insert(rows)
    .select("id, code, tier_key, tier_name, price_kes, status, occurrence_date, attendee_name");
  if (insErr || !inserted) throw new Error(`Ticket insert failed: ${insErr?.message}`);

  // Bridge into event_attendees so WhosJoining counts, host attendee CRM,
  // CSV export and the /profile Events tab keep working unchanged.
  const { data: attendee } = await adminClient
    .from("event_attendees")
    .select("id")
    .eq("event_sanity_id", order.event_sanity_id)
    .eq("email", order.buyer_email)
    .eq("status", "confirmed")
    .maybeSingle();
  if (!attendee) {
    await adminClient.from("event_attendees").insert({
      event_sanity_id: order.event_sanity_id,
      name: order.buyer_name,
      email: order.buyer_email,
      phone: order.buyer_phone,
      user_id: order.user_id,
      status: "confirmed",
    });
  }

  // Non-blocking email — a failed send must never fail issuance.
  try {
    await sendTicketEmail(order.event_sanity_id, order.buyer_name, order.buyer_email, inserted);
  } catch (e) {
    console.error("[tickets] email failed for order", orderId, e);
  }

  return inserted as TicketRow[];
}
