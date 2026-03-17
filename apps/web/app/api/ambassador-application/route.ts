import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

/* ---------- Supabase ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- Schema ---------- */

const ambassadorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  socialHandle: z.string().optional(),
  role: z.enum(["content_creator", "local_guide", "influencer", "community_champion"]),
  city: z.string().optional(),
  message: z.string().max(300, "Message must be 300 characters or less").optional(),
});

/* ---------- Rate limiter ---------- */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

/* ---------- POST handler ---------- */

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = ambassadorSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        { success: false, error: fieldErrors[0]?.message ?? "Validation failed", errors: fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const ROLE_LABELS: Record<string, string> = {
      content_creator: "Content Creator",
      local_guide: "Local Guide",
      influencer: "Influencer",
      community_champion: "Community Champion",
    };

    /* Save to Supabase */
    const { error: dbError } = await supabase
      .from("ambassador_applications")
      .insert({
        name: data.name,
        email: data.email,
        social_handle: data.socialHandle ?? null,
        role: data.role,
        city: data.city ?? null,
        message: data.message ?? null,
        status: "new",
      });

    if (dbError) {
      console.error("Ambassador application DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to submit application. Please try again." },
        { status: 500 }
      );
    }

    /* Send emails via Resend */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const adminEmail = process.env.ADMIN_EMAIL ?? "hello@klickenya.com";
        const roleLabel = ROLE_LABELS[data.role] ?? data.role;

        // Notification to admin
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: adminEmail,
          subject: `New ambassador application: ${data.name} (${roleLabel})`,
          html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#E8A020;padding:24px 32px;">
          <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Klickenya</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">New Ambassador Application</h1>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.name}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.email}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Role</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${roleLabel}</td></tr>
            ${data.socialHandle ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Social</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.socialHandle}</td></tr>` : ""}
            ${data.city ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">City</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.city}</td></tr>` : ""}
            ${data.message ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Message</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.message}</td></tr>` : ""}
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        });

        // Confirmation to applicant
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: data.email,
          subject: "Thanks for your interest in becoming a Klickenya Ambassador!",
          html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#E8A020;padding:24px 32px;">
          <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Klickenya</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Thanks, ${data.name}!</h1>
          <p style="color:#52525b;font-size:15px;line-height:1.65;margin:0 0 16px;">
            We&apos;ve received your application to become a <strong>${roleLabel}</strong> ambassador and will review it within 48 hours.
          </p>
          <p style="color:#52525b;font-size:15px;line-height:1.65;margin:0 0 16px;">
            Our team is excited to connect with passionate people who love Kenya. We'll be in touch soon with next steps.
          </p>
          <p style="color:#71717a;font-size:13px;margin:24px 0 0;">
            Questions? Reply to this email or reach us at hello@klickenya.com
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        });
      } catch (emailError) {
        console.error("Ambassador application email error:", emailError);
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Ambassador application error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
