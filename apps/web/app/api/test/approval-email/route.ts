import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Test endpoint: GET /api/test/approval-email?email=test@test.com
 * Generates a recovery action_link and sends the approval email.
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

  // Generate recovery link
  let setPasswordUrl = `https://www.klickenya.com/forgot-password?email=${encodeURIComponent(email)}`;
  let linkDebug: Record<string, unknown> = {};

  try {
    const { data: linkData, error: linkErr } =
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo:
            "https://www.klickenya.com/auth/callback?next=/reset-password",
        },
      });

    linkDebug = {
      error: linkErr?.message ?? null,
      action_link: linkData?.properties?.action_link ?? null,
      hashed_token: linkData?.properties?.hashed_token ?? null,
      redirect_to: linkData?.properties?.redirect_to ?? null,
      verification_type: linkData?.properties?.verification_type ?? null,
    };

    if (linkData?.properties?.action_link) {
      setPasswordUrl = linkData.properties.action_link;
    }
  } catch (err) {
    linkDebug = { exception: String(err) };
  }

  // Send test email
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
            Set your password to access your host dashboard and manage your listings.
          </p>
          <p style="font-size: 13px; color: #9C9485; margin: 0 0 24px;">
            Your account email: <strong style="color: #16130C;">${email}</strong>
          </p>
          <p style="margin: 0 0 24px;">
            <a href="${setPasswordUrl}" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">Set your password →</a>
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
      { error: "Email send failed", details: String(emailErr), linkDebug },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    email,
    setPasswordUrl,
    linkDebug,
  });
}
