import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Test endpoint: GET /api/test/approval-email?email=test@test.com
 * Sends a test approval email with temp credentials + auto-login link.
 * Only works in development or when ALLOW_TEST_ENDPOINTS=true.
 */
export async function GET(req: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_TEST_ENDPOINTS !== "true"
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "?email= is required" },
      { status: 400 }
    );
  }

  const tempPassword = "welcome" + Math.floor(100 + Math.random() * 900);
  const loginUrl = `https://www.klickenya.com/login?email=${encodeURIComponent(email)}&temp=${encodeURIComponent(tempPassword)}`;
  const listingTitle = "Test Listing";
  const claimantName = "Test Host";

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Klickenya <hello@klickenya.com>",
      to: email,
      subject: `✓ ${listingTitle} is now verified on Klickenya`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
          <p style="font-size: 16px; color: #16130C; margin: 0 0 16px;">Hi ${claimantName},</p>
          <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;">
            Great news! <strong>${listingTitle}</strong> has been reviewed and approved. ✓
          </p>
          <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">
            Your listing now has a green <strong>Verified</strong> badge, giving guests confidence to book with you.
          </p>
          <p style="margin: 0 0 24px;">
            <a href="https://klickenya.com" style="display: inline-block; background: #16A34A; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">View your verified listing →</a>
          </p>
          <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 24px 0;" />
          <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;">
            <strong>Your Klickenya host account is ready.</strong>
          </p>
          <p style="font-size: 14px; color: #5E5848; margin: 0 0 8px;">
            Your login credentials:
          </p>
          <div style="background: #FDF8F0; border: 1px solid #E2DDD5; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="color: #9C9485; padding: 4px 0; width: 80px;">Email</td><td style="color: #16130C; font-weight: 600;">${email}</td></tr>
              <tr><td style="color: #9C9485; padding: 4px 0;">Password</td><td style="color: #16130C; font-weight: 600; font-family: monospace;">${tempPassword}</td></tr>
            </table>
          </div>
          <p style="margin: 0 0 16px;">
            <a href="${loginUrl}" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">Log in to your dashboard →</a>
          </p>
          <p style="font-size: 12px; color: #9C9485; margin: 0 0 24px;">
            Please change your password after logging in.
          </p>
          <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 16px 0;" />
          <p style="font-size: 12px; color: #9C9485; margin: 0;">
            — The Klickenya Team<br />
            <a href="https://klickenya.com" style="color: #E8A020; text-decoration: none;">klickenya.com</a>
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    return NextResponse.json(
      { error: "Email send failed", details: String(emailErr) },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    email,
    tempPassword,
    loginUrl,
  });
}
