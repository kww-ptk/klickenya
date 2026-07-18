import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: order } = await adminClient
    .from("ticket_orders")
    .select("id, status, provider, total_kes, event_sanity_id")
    .eq("id", id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (order.status === "pending" && order.provider === "paystack") {
    const paid = await getPaymentProvider("paystack").verifyTransaction(order.id);
    if (paid) {
      await adminClient
        .from("ticket_orders")
        .update({ status: "paid", paid_at: new Date().toISOString(), expires_at: null })
        .eq("id", order.id)
        .eq("status", "pending");
      order.status = "paid";
    }
  }

  if (order.status !== "paid") {
    return NextResponse.json({ status: order.status });
  }
  const tickets = await issueTicketsForOrder(order.id);
  return NextResponse.json({
    status: "paid",
    totalKes: order.total_kes,
    tickets: tickets.map((t) => ({ code: t.code, tierName: t.tier_name })),
  });
}
