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
    const body = await request.json();
    const holdType: "soft" | "internal" | "deposit" = body.hold_type;
    const depositAmount: number | undefined = body.deposit_amount ? Number(body.deposit_amount) : undefined;

    if (!["soft", "internal", "deposit"].includes(holdType)) {
      return NextResponse.json({ error: "Invalid hold_type" }, { status: 400 });
    }

    // Fetch enquiry + verify ownership
    const { data: enquiry, error: eErr } = await adminClient
      .from("contact_requests")
      .select("id, full_name, email, property_id, listing_title, check_in, check_out, calendar_status")
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

    if (!["pending", "held"].includes(enquiry.calendar_status ?? "")) {
      return NextResponse.json({ error: "Enquiry cannot be held in its current state" }, { status: 409 });
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      calendar_status: "held",
      hold_type: holdType,
    };

    if (holdType === "soft") {
      // Soft hold expires in 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      updatePayload.expires_at = expiresAt;
    }

    await adminClient
      .from("contact_requests")
      .update(updatePayload)
      .eq("id", id);

    // Send deposit request email to guest if deposit hold
    if (holdType === "deposit" && process.env.RESEND_API_KEY && enquiry.email && depositAmount) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fmtD = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        const listingUrl = prop.listing_slug
          ? `https://klickenya.com/stays/${prop.listing_slug}`
          : "https://klickenya.com";

        await resend.emails.send({
          from: "Klickenya Bookings <bookings@klickenya.com>",
          to: enquiry.email,
          subject: `Your enquiry for ${enquiry.listing_title ?? "your stay"} — deposit requested`,
          html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:#E8A020;padding:24px 32px;">
  <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Klickenya</span>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Deposit requested to confirm your booking</h1>
  <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${enquiry.full_name.split(" ")[0]},</p>
  <p style="font-size:14px;color:#333;line-height:1.6;">
    Great news — the host is happy to accommodate you at <strong>${enquiry.listing_title ?? "their property"}</strong>
    ${enquiry.check_in && enquiry.check_out ? ` for <strong>${fmtD(enquiry.check_in)} → ${fmtD(enquiry.check_out)}</strong>` : ""}.
  </p>
  <p style="font-size:14px;color:#333;line-height:1.6;">
    To confirm your booking, a deposit of <strong style="color:#E8A020;font-size:16px;">KSh ${depositAmount.toLocaleString()}</strong> is required.
    Please contact the host directly to arrange payment.
  </p>
  <div style="margin:20px 0;padding:16px;background:#FFFBEB;border-radius:8px;border:1px solid #FCD34D;">
    <p style="margin:0;font-size:13px;color:#92400E;">Once your deposit is received, the host will send your booking confirmation.</p>
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td align="center">
      <a href="${listingUrl}" style="display:inline-block;padding:12px 24px;background:#E8A020;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">View listing</a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:12px;color:#999;text-align:center;">&copy; 2026 Klickenya &middot; klickenya.com</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
        });
      } catch (emailErr) {
        console.error("Deposit hold email error:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Hold enquiry error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
