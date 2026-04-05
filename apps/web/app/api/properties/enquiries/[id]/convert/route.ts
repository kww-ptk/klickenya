import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import {
  bookingConfirmationGuestHtml,
  bookingNotificationOwnerHtml,
} from "@/lib/email/bookingEmails";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const ratePerNight = Number(body.rate_per_night ?? 0);
    const paymentMethod: string = body.payment_method ?? "cash";
    const amountPaid = Number(body.amount_paid ?? 0);

    if (!ratePerNight || ratePerNight <= 0) {
      return NextResponse.json({ error: "rate_per_night is required" }, { status: 400 });
    }

    // Fetch the contact_request + verify ownership via property
    const { data: enquiry, error: eErr } = await adminClient
      .from("contact_requests")
      .select("id, full_name, email, phone, room_id, property_id, check_in, check_out, guests, calendar_status, listing_title, notes, created_at, guest_user_id")
      .eq("id", id)
      .single();

    if (eErr || !enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    if (!enquiry.property_id || !enquiry.room_id) {
      return NextResponse.json({ error: "Enquiry has no property or room linked" }, { status: 400 });
    }

    // Verify owner
    const { data: prop } = await adminClient
      .from("properties")
      .select("id, owner_id")
      .eq("id", enquiry.property_id)
      .single();

    if (!prop || prop.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (enquiry.calendar_status !== "pending") {
      return NextResponse.json({ error: "Enquiry is no longer pending" }, { status: 409 });
    }

    // Server-side availability check
    const { data: available } = await adminClient.rpc("is_room_available", {
      p_room_id: enquiry.room_id,
      p_check_in: enquiry.check_in,
      p_check_out: enquiry.check_out,
    });

    if (!available) {
      return NextResponse.json({ error: "Room is no longer available for these dates" }, { status: 409 });
    }

    // Calculate financials
    const checkIn = new Date(enquiry.check_in + "T00:00:00");
    const checkOut = new Date(enquiry.check_out + "T00:00:00");
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86_400_000));

    // Fetch base room price to detect discount
    const { data: roomData } = await adminClient
      .from("rooms")
      .select("base_price_kes")
      .eq("id", enquiry.room_id)
      .single();
    const basePriceKes = roomData?.base_price_kes ?? ratePerNight;

    // If accepted rate < base price, treat the difference as a discount
    const roomSubtotal = ratePerNight * nights;
    const subtotal = basePriceKes * nights;
    const discountKes = ratePerNight < basePriceKes ? (basePriceKes - ratePerNight) * nights : 0;

    // Fetch mandatory property fees and calculate amounts
    const { data: propertyFees } = await adminClient
      .from("property_fees")
      .select("name, fee_type, amount")
      .eq("property_id", enquiry.property_id)
      .eq("apply_by_default", true)
      .eq("is_active", true);

    const feeLineItems = (propertyFees ?? []).map((f: { name: string; fee_type: string; amount: number }) => {
      let amount_kes = 0;
      if (f.fee_type === "fixed") amount_kes = f.amount;
      else if (f.fee_type === "per_night") amount_kes = f.amount * nights;
      else if (f.fee_type === "per_guest") amount_kes = f.amount * (enquiry.guests ?? 1);
      else if (f.fee_type === "percentage") amount_kes = Math.round(f.amount / 100 * roomSubtotal);
      return { name: f.name, fee_type: f.fee_type, amount_kes };
    }).filter((f: { amount_kes: number }) => f.amount_kes > 0);

    const feesTotal = feeLineItems.reduce((sum: number, f: { amount_kes: number }) => sum + f.amount_kes, 0);
    const total = subtotal - discountKes + feesTotal;

    // Create booking
    const { data: booking, error: bErr } = await adminClient
      .from("bookings")
      .insert({
        property_id: enquiry.property_id,
        room_id: enquiry.room_id,
        guest_name: enquiry.full_name,
        guest_email: enquiry.email ?? null,
        guest_phone: enquiry.phone ?? null,
        guest_count: enquiry.guests ?? 1,
        check_in_date: enquiry.check_in,
        check_out_date: enquiry.check_out,
        rate_per_night: ratePerNight,
        subtotal_kes: subtotal,
        discount_kes: discountKes,
        total_kes: total,
        amount_paid_kes: amountPaid,
        guest_user_id: enquiry.guest_user_id ?? null,
        status: "confirmed",
        payment_status: amountPaid >= total ? "paid" : amountPaid > 0 ? "partial" : "pending",
        source: "direct",
        internal_notes: [
          `Enquiry received: ${new Date(enquiry.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${new Date(enquiry.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
          `Guest: ${enquiry.full_name}`,
          `Dates: ${new Date(enquiry.check_in + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} → ${new Date(enquiry.check_out + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
          `Converted to booking: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
          ...(discountKes > 0 ? [`Discount applied: KSh ${discountKes.toLocaleString()} (rate KSh ${ratePerNight.toLocaleString()} vs base KSh ${basePriceKes.toLocaleString()})`] : []),
        ].join("\n"),
      })
      .select("*")
      .single();

    if (bErr || !booking) {
      console.error("Booking insert error:", bErr);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    // Insert mandatory fee line items
    if (feeLineItems.length > 0) {
      await adminClient.from("booking_fees").insert(
        feeLineItems.map((f: { name: string; fee_type: string; amount_kes: number }) => ({ booking_id: booking.id, name: f.name, fee_type: f.fee_type, amount_kes: f.amount_kes }))
      );
    }

    // Record payment if any
    if (amountPaid > 0) {
      await adminClient.from("booking_payments").insert({
        booking_id: booking.id,
        amount_kes: amountPaid,
        method: paymentMethod,
        notes: `Initial payment at enquiry conversion`,
        recorded_by: user.id,
      });
    }

    // Mark enquiry as converted
    await adminClient
      .from("contact_requests")
      .update({ calendar_status: "converted" })
      .eq("id", id);

    // Send emails — awaited so they complete before response returns
    try {
      await sendConversionEmails({
        bookingId: booking.id,
        propertyId: enquiry.property_id,
        roomId: enquiry.room_id,
        guestName: enquiry.full_name,
        guestEmail: enquiry.email ?? null,
        guestPhone: enquiry.phone ?? null,
        guestCount: enquiry.guests ?? 1,
        checkIn: enquiry.check_in,
        checkOut: enquiry.check_out,
        nights,
        ratePerNight,
        subtotal,
        discountKes,
        fees: feeLineItems,
        totalKes: total,
        amountPaid,
        balance: total - amountPaid,
        ownerId: user.id,
        listingTitle: enquiry.listing_title ?? null,
      });
    } catch (emailErr) {
      // Booking was created — don't fail the request over email
      console.error("[convert] email send failed:", emailErr);
    }

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (err) {
    console.error("Convert enquiry error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

async function sendConversionEmails(p: {
  bookingId: string;
  propertyId: string;
  roomId: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  ratePerNight: number;
  subtotal: number;
  discountKes: number;
  fees: Array<{ name: string; fee_type: string; amount_kes: number }>;
  totalKes: number;
  amountPaid: number;
  balance: number;
  ownerId: string;
  listingTitle: string | null;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  const resend = new Resend(resendKey);

  const [propRes, roomRes, ownerRes] = await Promise.all([
    adminClient.from("properties").select("name, address, check_in_time").eq("id", p.propertyId).single(),
    adminClient.from("rooms").select("name").eq("id", p.roomId).single(),
    adminClient.auth.admin.getUserById(p.ownerId),
  ]);

  const propertyName = propRes.data?.name ?? p.listingTitle ?? "Your property";
  const roomName = roomRes.data?.name ?? "Room";
  const checkInTime = propRes.data?.check_in_time ?? undefined;
  const address = propRes.data?.address ?? undefined;
  const ownerEmail = ownerRes.data?.user?.email;
  const ownerName =
    ownerRes.data?.user?.user_metadata?.full_name ??
    ownerRes.data?.user?.user_metadata?.name ??
    "Host";

  const convertedAt = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // Send both emails in parallel — failures are independent
  const sends: Promise<unknown>[] = [];

  // 1. Guest confirmation
  if (p.guestEmail) {
    sends.push(
      resend.emails.send({
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
          fees: p.fees.length > 0 ? p.fees : undefined,
          totalKes: p.totalKes,
          amountPaid: p.amountPaid,
          balance: p.balance,
          discountKes: p.discountKes > 0 ? p.discountKes : undefined,
          checkInTime,
          address,
          bookingId: p.bookingId,
        }),
      }).catch((e: unknown) => console.error("[convert] guest email failed:", e))
    );
  }

  // 2. Owner notification
  if (ownerEmail) {
    sends.push(
      resend.emails.send({
        from: "Klickenya Bookings <bookings@klickenya.com>",
        to: ownerEmail,
        subject: `New booking (from enquiry) — ${p.guestName}, ${p.checkIn}`,
        html: bookingNotificationOwnerHtml({
          ownerName,
          guestName: p.guestName,
          guestPhone: p.guestPhone ?? "Not provided",
          guestEmail: p.guestEmail ?? "",
          propertyName,
          roomName,
          checkIn: p.checkIn,
          checkOut: p.checkOut,
          nights: p.nights,
          guests: p.guestCount,
          ratePerNight: p.ratePerNight,
          subtotal: p.subtotal,
          fees: p.fees.length > 0 ? p.fees : undefined,
          totalKes: p.totalKes,
          amountPaid: p.amountPaid,
          balance: p.balance,
          discountKes: p.discountKes > 0 ? p.discountKes : undefined,
          propertyId: p.propertyId,
          bookingId: p.bookingId,
          convertedFromEnquiry: convertedAt,
        }),
      }).catch((e: unknown) => console.error("[convert] owner email failed:", e))
    );
  }

  await Promise.all(sends);
}
