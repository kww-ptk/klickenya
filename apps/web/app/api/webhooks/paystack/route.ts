import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifyPaystackSignature } from "@/lib/payments/paystack";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  if (!verifyPaystackSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; data?: { reference?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (payload.event !== "charge.success" || !payload.data?.reference) {
    return NextResponse.json({ received: true });
  }

  const orderId = payload.data.reference;
  const { data: updated } = await adminClient
    .from("ticket_orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), expires_at: null })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updated) {
    try {
      await issueTicketsForOrder(orderId);
    } catch (e) {
      console.error("[paystack-webhook] issuance failed:", orderId, e);
      return NextResponse.json({ error: "Issuance failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
