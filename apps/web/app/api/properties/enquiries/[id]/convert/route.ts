import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

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
      .select("id, full_name, email, phone, room_id, property_id, check_in, check_out, guests, calendar_status, listing_title, notes")
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
    const subtotal = ratePerNight * nights;
    const total = subtotal;

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
        discount_kes: 0,
        total_kes: total,
        amount_paid_kes: amountPaid,
        status: "confirmed",
        payment_status: amountPaid >= total ? "paid" : amountPaid > 0 ? "partial" : "pending",
        source: "direct",
        internal_notes: `Converted from enquiry ${id}`,
      })
      .select("*")
      .single();

    if (bErr || !booking) {
      console.error("Booking insert error:", bErr);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
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

    // Send confirmation email (fire-and-forget)
    if (process.env.RESEND_API_KEY && enquiry.email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Klickenya Bookings <bookings@klickenya.com>",
          to: enquiry.email,
          subject: `Booking confirmed: ${enquiry.listing_title ?? "Your stay"}`,
          html: `
            <p>Hi ${enquiry.full_name.split(" ")[0]},</p>
            <p>Great news — your booking has been confirmed!</p>
            <ul>
              <li><strong>Property:</strong> ${enquiry.listing_title ?? "Your property"}</li>
              <li><strong>Check-in:</strong> ${enquiry.check_in}</li>
              <li><strong>Check-out:</strong> ${enquiry.check_out}</li>
              <li><strong>Nights:</strong> ${nights}</li>
              <li><strong>Total:</strong> KSh ${total.toLocaleString()}</li>
              ${amountPaid > 0 ? `<li><strong>Amount paid:</strong> KSh ${amountPaid.toLocaleString()}</li>` : ""}
              ${amountPaid < total ? `<li><strong>Balance due:</strong> KSh ${(total - amountPaid).toLocaleString()}</li>` : ""}
            </ul>
            <p>We look forward to hosting you!</p>
            <p>— The Klickenya Team</p>
          `,
        });
      } catch (emailErr) {
        console.error("Confirmation email error:", emailErr);
      }
    }

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (err) {
    console.error("Convert enquiry error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
