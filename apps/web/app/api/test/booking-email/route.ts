import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { bookingConfirmationGuestHtml } from "@/lib/email/bookingEmails";

/**
 * Test endpoint: GET /api/test/booking-email?to=test@example.com
 * Sends a sample booking confirmation email to verify Resend is configured.
 * Requires ALLOW_TEST_ENDPOINTS=true in production.
 */
export async function GET(req: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_TEST_ENDPOINTS !== "true"
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const to = req.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "?to= is required" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set in environment" },
      { status: 500 }
    );
  }

  const resend = new Resend(resendKey);

  try {
    const result = await resend.emails.send({
      from: "Klickenya Bookings <bookings@klickenya.com>",
      to,
      subject: "[TEST] Booking confirmed — Beachfront Villa",
      html: bookingConfirmationGuestHtml({
        guestName: "Test Guest",
        propertyName: "Beachfront Villa",
        roomName: "Sea View Room",
        checkIn: "2026-04-10",
        checkOut: "2026-04-13",
        nights: 3,
        guests: 2,
        ratePerNight: 8000,
        subtotal: 24000,
        totalKes: 20000,
        discountKes: 4000,
        amountPaid: 10000,
        balance: 10000,
        checkInTime: "14:00",
        address: "Watamu Beach Road, Watamu, Kenya",
        bookingId: "test-booking-id-1234",
      }),
    });

    return NextResponse.json({ success: true, resend: result });
  } catch (err) {
    return NextResponse.json(
      { error: "Resend send failed", details: String(err) },
      { status: 500 }
    );
  }
}
