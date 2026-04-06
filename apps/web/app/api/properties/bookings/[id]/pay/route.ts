import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  /* --- Auth --- */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* --- Verify ownership: booking → property → owner_id --- */
  const { data: booking } = await adminClient
    .from("bookings")
    .select("id, property_id, total_kes")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: property } = await adminClient
    .from("properties")
    .select("owner_id")
    .eq("id", booking.property_id)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* --- Parse body --- */
  const body = await req.json();
  const { amount_kes, method, reference, notes } = body;

  if (!amount_kes || !method) {
    return NextResponse.json(
      { error: "amount_kes and method are required" },
      { status: 400 }
    );
  }

  const validMethods = ["mpesa", "cash", "bank_transfer", "card", "ota"];
  if (!validMethods.includes(method)) {
    return NextResponse.json(
      { error: `method must be one of: ${validMethods.join(", ")}` },
      { status: 400 }
    );
  }

  /* --- Insert payment --- */
  const { data: payment, error: payErr } = await adminClient
    .from("booking_payments")
    .insert({
      booking_id: bookingId,
      amount_kes: Number(amount_kes),
      method,
      reference: reference?.trim() || null,
      notes: notes?.trim() || null,
      recorded_by: user.id,
    })
    .select()
    .single();

  if (payErr) {
    return NextResponse.json(
      { error: payErr.message },
      { status: 500 }
    );
  }

  /* --- Recalculate total paid from all payments --- */
  const { data: allPayments } = await adminClient
    .from("booking_payments")
    .select("amount_kes")
    .eq("booking_id", bookingId);

  const totalPaid = (allPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount_kes),
    0
  );

  const paymentStatus =
    totalPaid >= booking.total_kes
      ? "paid"
      : totalPaid > 0
        ? "partial"
        : "pending";

  /* --- Update booking amounts --- */
  const { data: updatedBooking, error: updateErr } = await adminClient
    .from("bookings")
    .update({
      amount_paid_kes: totalPaid,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message },
      { status: 500 }
    );
  }

  /* --- Return updated booking + all payments --- */
  const { data: payments } = await adminClient
    .from("booking_payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("paid_at", { ascending: true });

  return NextResponse.json({
    booking: updatedBooking,
    payment,
    payments: payments ?? [],
  });
}
