import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

/* ---------- Validation ---------- */

const subscribeSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  source: z.string().optional().default("website"),
});

/* ---------- Welcome email template ---------- */

function welcomeEmailHtml(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;color:#1a1a1a;background:#ffffff;">
  <img src="https://klickenya.com/logo.png" alt="Klickenya" width="140" height="40" style="margin-bottom:32px;">
  <h1 style="font-size:24px;font-weight:700;margin-bottom:16px;color:#1a1a1a;">We got you! ✨</h1>
  <p style="font-size:16px;line-height:1.6;color:#555;margin-bottom:16px;">You will be notified soon about Klickenya.</p>
  <p style="font-size:16px;line-height:1.6;color:#555;margin-bottom:16px;">Just so you know, you will be able to find the best that Kenya has to offer, both for residents and tourists — events, parties, tours, special deals, and much more.</p>
  <p style="font-size:16px;line-height:1.6;color:#555;margin-bottom:24px;">Thank you once again!</p>
  <a href="https://klickenya.com" style="display:inline-block;background-color:#E8A020;color:#16130C;padding:12px 24px;border-radius:9999px;font-size:14px;font-weight:700;text-decoration:none;">Visit Klickenya</a>
  <p style="font-size:13px;color:#999;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">You're receiving this because you subscribed at klickenya.com. You can unsubscribe at any time.</p>
</body></html>`;
}

/* ---------- POST handler ---------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email, source } = parsed.data;

    /* Save to Supabase */
    const supabase = await createClient();
    // Try with source column first, fallback without it if column doesn't exist yet
    let { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .insert({ email, source });

    if (dbError && dbError.code === "42703") {
      // Column doesn't exist yet — insert without source
      const res = await supabase
        .from("newsletter_subscribers")
        .insert({ email });
      dbError = res.error;
    }

    if (dbError) {
      // Unique constraint violation — email already subscribed
      if (dbError.code === "23505") {
        return NextResponse.json({ success: true, message: "Already subscribed" });
      }
      console.error("Newsletter DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    /* Send welcome email via Resend (only if API key is configured) */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: email,
          subject: "We got you! Welcome to Klickenya ✨",
          html: welcomeEmailHtml(),
        });
      } catch (emailError) {
        // Log but don't fail the subscription if email sending fails
        console.error("Welcome email error:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
