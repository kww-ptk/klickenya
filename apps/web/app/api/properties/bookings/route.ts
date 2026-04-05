import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { bookingConfirmationGuestHtml } from "@/lib/email/bookingEmails";

export async function POST(req: NextRequest) {
  /* --- Auth --- */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const {
    property_id,
    room_id,
    guest_name,
    guest_phone,
    guest_email,
    guest_count,
    check_in_date,
    check_out_date,
    rate_per_night,
    discount_kes,
    source,
    guest_notes,
    internal_notes,
    payment_method,
    amount_paid,
    fees, // [{ name, fee_type, amount_kes }]
    send_confirmation, // boolean: owner opted to email the guest
  } = body;

  /* --- Validate required fields --- */
  if (!property_id || !room_id || !guest_name || !check_in_date || !check_out_date || !rate_per_night) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (check_out_date <= check_in_date) {
    return NextResponse.json(
      { error: "Check-out must be after check-in" },
      { status: 400 }
    );
  }

  /* --- Verify ownership: property must belong to this user --- */
  const { data: property } = await adminClient
    .from("properties")
    .select("id, owner_id")
    .eq("id", property_id)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* --- Verify room belongs to this property --- */
  const { data: room } = await adminClient
    .from("rooms")
    .select("id, property_id")
    .eq("id", room_id)
    .eq("property_id", property_id)
    .single();

  if (!room) {
    return NextResponse.json(
      { error: "Room not found for this property" },
      { status: 400 }
    );
  }

  /* --- Server-side availability check --- */
  const { data: available } = await adminClient.rpc("is_room_available", {
    p_room_id: room_id,
    p_check_in: check_in_date,
    p_check_out: check_out_date,
  });

  if (!available) {
    // Get conflicting booking for error message
    const { data: conflict } = await adminClient
      .from("bookings")
      .select("id, guest_name, check_in_date, check_out_date")
      .eq("room_id", room_id)
      .neq("status", "cancelled")
      .lt("check_in_date", check_out_date)
      .gt("check_out_date", check_in_date)
      .limit(1)
      .single();

    return NextResponse.json(
      {
        error: "Room is no longer available — please select different dates",
        conflict: conflict
          ? {
              guest_name: conflict.guest_name,
              check_in_date: conflict.check_in_date,
              check_out_date: conflict.check_out_date,
            }
          : undefined,
      },
      { status: 409 }
    );
  }

  /* --- Calculate financials --- */
  const nights = Math.floor(
    (new Date(check_out_date + "T00:00:00").getTime() -
      new Date(check_in_date + "T00:00:00").getTime()) /
      86400000
  );
  const subtotal = nights * rate_per_night;
  const discountAmount = Number(discount_kes) || 0;
  const feesTotal = Array.isArray(fees)
    ? fees.reduce((sum: number, f: { amount_kes: number }) => sum + (Number(f.amount_kes) || 0), 0)
    : 0;
  const total = subtotal + feesTotal - discountAmount;
  const amountPaid = Number(amount_paid) || 0;

  const paymentStatus =
    amountPaid >= total ? "paid" : amountPaid > 0 ? "partial" : "pending";

  /* --- Transaction: INSERT booking + optional payment --- */
  // Use a Postgres function via raw SQL to ensure atomicity.
  // Supabase JS client doesn't support BEGIN/COMMIT, so we use
  // adminClient.rpc with a plpgsql block.
  // Alternatively, we insert booking first, then payment, and if
  // payment fails we delete the booking. But per spec requirements,
  // we use a single rpc call for true atomicity.

  const { data: txResult, error: txErr } = await adminClient.rpc(
    "create_booking_with_payment",
    {
      p_property_id: property_id,
      p_room_id: room_id,
      p_guest_name: guest_name.trim(),
      p_guest_phone: guest_phone?.trim() || null,
      p_guest_email: guest_email?.trim() || null,
      p_guest_count: guest_count || 1,
      p_check_in_date: check_in_date,
      p_check_out_date: check_out_date,
      p_rate_per_night: rate_per_night,
      p_subtotal_kes: subtotal,
      p_discount_kes: discountAmount,
      p_total_kes: total,
      p_amount_paid_kes: amountPaid,
      p_payment_status: paymentStatus,
      p_source: source || "direct",
      p_guest_notes: guest_notes?.trim() || null,
      p_internal_notes: internal_notes?.trim() || null,
      p_payment_method: amountPaid > 0 ? (payment_method || "cash") : null,
      p_recorded_by: user.id,
    }
  );

  // If the function doesn't exist yet, fall back to sequential inserts
  if (txErr?.message?.includes("function") || txErr?.code === "42883") {
    // Fallback: sequential inserts (booking then payment)
    const { data: booking, error: bookErr } = await adminClient
      .from("bookings")
      .insert({
        property_id,
        room_id,
        guest_name: guest_name.trim(),
        guest_phone: guest_phone?.trim() || null,
        guest_email: guest_email?.trim() || null,
        guest_count: guest_count || 1,
        check_in_date,
        check_out_date,
        rate_per_night,
        subtotal_kes: subtotal,
        discount_kes: discountAmount,
        total_kes: total,
        amount_paid_kes: amountPaid,
        payment_status: paymentStatus,
        source: source || "direct",
        guest_notes: guest_notes?.trim() || null,
        internal_notes: internal_notes?.trim() || null,
        status: "confirmed",
      })
      .select()
      .single();

    if (bookErr || !booking) {
      return NextResponse.json(
        { error: bookErr?.message ?? "Failed to create booking" },
        { status: 500 }
      );
    }

    // Insert payment if amount > 0
    if (amountPaid > 0) {
      const { error: payErr } = await adminClient
        .from("booking_payments")
        .insert({
          booking_id: booking.id,
          amount_kes: amountPaid,
          method: payment_method || "cash",
          recorded_by: user.id,
        });

      if (payErr) {
        // Payment failed — roll back booking
        await adminClient.from("bookings").delete().eq("id", booking.id);
        return NextResponse.json(
          { error: "Failed to record payment — booking rolled back" },
          { status: 500 }
        );
      }
    }

    // Insert fee line items
    if (Array.isArray(fees) && fees.length > 0) {
      await adminClient.from("booking_fees").insert(
        fees.map((f: { name: string; fee_type: string; amount_kes: number }) => ({
          booking_id: booking.id,
          name: f.name,
          fee_type: f.fee_type,
          amount_kes: Number(f.amount_kes),
        }))
      );
    }

    // Send guest confirmation email if owner opted in
    if (send_confirmation && guest_email?.trim()) {
      await sendGuestConfirmationEmail({
        bookingId: booking.id,
        propertyId: property_id,
        roomId: room_id,
        guestName: guest_name.trim(),
        guestEmail: guest_email.trim(),
        checkIn: check_in_date,
        checkOut: check_out_date,
        nights,
        ratePerNight: rate_per_night,
        subtotal,
        discountKes: discountAmount,
        totalKes: total,
        amountPaid,
        balance: total - amountPaid,
        guestCount: guest_count || 1,
      });
    }

    return NextResponse.json({ booking }, { status: 201 });
  }

  if (txErr) {
    return NextResponse.json(
      { error: txErr.message ?? "Failed to create booking" },
      { status: 500 }
    );
  }

  // The rpc returns the new booking id — fetch full booking
  const bookingId = typeof txResult === "string" ? txResult : txResult?.id;
  const { data: newBooking } = await adminClient
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  // Insert fee line items
  if (bookingId && Array.isArray(fees) && fees.length > 0) {
    await adminClient.from("booking_fees").insert(
      fees.map((f: { name: string; fee_type: string; amount_kes: number }) => ({
        booking_id: bookingId,
        name: f.name,
        fee_type: f.fee_type,
        amount_kes: Number(f.amount_kes),
      }))
    );
  }

  // Send guest confirmation email if owner opted in
  if (send_confirmation && guest_email?.trim()) {
    await sendGuestConfirmationEmail({
      bookingId: bookingId ?? "unknown",
      propertyId: property_id,
      roomId: room_id,
      guestName: guest_name.trim(),
      guestEmail: guest_email.trim(),
      checkIn: check_in_date,
      checkOut: check_out_date,
      nights,
      ratePerNight: rate_per_night,
      subtotal,
      discountKes: discountAmount,
      totalKes: total,
      amountPaid,
      balance: total - amountPaid,
      guestCount: guest_count || 1,
    });
  }

  return NextResponse.json({ booking: newBooking ?? txResult }, { status: 201 });
}

/* ── Guest confirmation email (manual bookings) ── */

async function sendGuestConfirmationEmail(p: {
  bookingId: string;
  propertyId: string;
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  ratePerNight: number;
  subtotal: number;
  discountKes: number;
  totalKes: number;
  amountPaid: number;
  balance: number;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[bookings] RESEND_API_KEY not set — skipping guest email");
    return;
  }
  const resend = new Resend(resendKey);

  const [propRes, roomRes, feesRes] = await Promise.all([
    adminClient.from("properties").select("name, address, check_in_time").eq("id", p.propertyId).single(),
    adminClient.from("rooms").select("name").eq("id", p.roomId).single(),
    adminClient.from("booking_fees").select("name, amount_kes").eq("booking_id", p.bookingId),
  ]);

  const propertyName = propRes.data?.name ?? "Your property";
  const roomName = roomRes.data?.name ?? "Room";
  const checkInTime = propRes.data?.check_in_time ?? undefined;
  const address = propRes.data?.address ?? undefined;
  const fees = (feesRes.data ?? []).filter((f: { amount_kes: number }) => f.amount_kes > 0);

  await resend.emails.send({
    from: "Klickenya Bookings <bookings@klickenya.com>",
    to: p.guestEmail,
    subject: `Booking confirmed — ${propertyName}`,
    html: bookingConfirmationGuestHtml({
      guestName: p.guestName,
      propertyName,
      roomName,
      checkIn: p.checkIn,
      checkOut: p.checkOut,
      nights: p.nights,
      guests: p.guestCount,
      ratePerNight: p.ratePerNight,
      subtotal: p.subtotal,
      fees: fees.length > 0 ? fees : undefined,
      totalKes: p.totalKes,
      amountPaid: p.amountPaid,
      balance: p.balance,
      discountKes: p.discountKes > 0 ? p.discountKes : undefined,
      checkInTime,
      address,
      bookingId: p.bookingId,
    }),
  });
}
