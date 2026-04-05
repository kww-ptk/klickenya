import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const reason: string = body.reason ?? "";

    // Fetch enquiry + verify ownership
    const { data: enquiry, error: eErr } = await adminClient
      .from("contact_requests")
      .select("id, full_name, email, property_id, listing_title, listing_sanity_id, check_in, check_out, calendar_status")
      .eq("id", id)
      .single();

    if (eErr || !enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

    const { data: prop } = await adminClient
      .from("properties")
      .select("id, owner_id, listing_slug")
      .eq("id", enquiry.property_id)
      .single();

    if (!prop || prop.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (enquiry.calendar_status !== "pending") {
      return NextResponse.json({ error: "Enquiry is no longer pending" }, { status: 409 });
    }

    // Mark declined
    await adminClient
      .from("contact_requests")
      .update({ calendar_status: "declined" })
      .eq("id", id);

    // Send decline email (fire-and-forget)
    if (process.env.RESEND_API_KEY && enquiry.email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const listingUrl = prop.listing_slug
          ? `https://klickenya.com/stays/${prop.listing_slug}`
          : "https://klickenya.com";

        await resend.emails.send({
          from: "Klickenya Bookings <bookings@klickenya.com>",
          to: enquiry.email,
          subject: `Re: Your enquiry for ${enquiry.listing_title ?? "your stay"}`,
          html: `
            <p>Hi ${enquiry.full_name.split(" ")[0]},</p>
            <p>Thank you for your enquiry for <strong>${enquiry.listing_title ?? "our property"}</strong> (${enquiry.check_in} → ${enquiry.check_out}).</p>
            <p>Unfortunately we're unable to accommodate your request for those dates.</p>
            ${reason ? `<p><em>${reason}</em></p>` : ""}
            <p>We'd love to host you another time — please check our availability for other dates:</p>
            <p><a href="${listingUrl}">View listing and check dates</a></p>
            <p>Thank you for considering us, and we hope to welcome you soon!</p>
            <p>— The Klickenya Team</p>
          `,
        });
      } catch (emailErr) {
        console.error("Decline email error:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Decline enquiry error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
