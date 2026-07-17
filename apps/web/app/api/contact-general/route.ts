import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

/* ---------- Supabase ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- Validation ---------- */

const generalContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  source: z.string().optional(), // partner site tag (e.g. "claris") for attribution
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
  return entry.count > 10;
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

    /* ── Honeypot check ── */
    if (body.website) {
      return NextResponse.json({ success: false, error: "Blocked" }, { status: 400 });
    }

    /* ── Turnstile verification ── */
    if (!body.turnstileToken) {
      return NextResponse.json({ success: false, error: "Bot detected" }, { status: 400 });
    }
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: body.turnstileToken,
      }),
    });
    const turnstileResult = await verify.json();
    if (!turnstileResult.success) {
      return NextResponse.json({ success: false, error: "Bot detected" }, { status: 400 });
    }

    const parsed = generalContactSchema.safeParse(body);

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

    /* Save to Supabase */
    const baseRow = {
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    };
    // Try with the source tag; fall back if the column isn't migrated yet
    // (Postgres 42703 / PostgREST PGRST204 "column not found").
    let { error: dbError } = await supabase
      .from("general_contacts")
      .insert({ ...baseRow, source: data.source ?? null });
    if (dbError && (dbError.code === "42703" || dbError.code === "PGRST204")) {
      const res = await supabase.from("general_contacts").insert(baseRow);
      dbError = res.error;
    }

    if (dbError) {
      console.error("General contact DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to submit message. Please try again." },
        { status: 500 }
      );
    }

    /* Send emails via Resend */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const adminEmail = process.env.ADMIN_EMAIL || "hello@klickenya.com";

        // Notification to admin
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: adminEmail,
          subject: `New contact: ${data.subject}`,
          html: notificationHtml(data),
        });

        // Auto-reply to sender
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: data.email,
          subject: "Thanks for reaching out — Klickenya",
          html: autoReplyHtml(data.name),
        });
      } catch (emailError) {
        console.error("Email send error:", emailError);
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("General contact error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/* ---------- Email templates ---------- */

function notificationHtml(data: { name: string; email: string; subject: string; message: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#E8A020;padding:24px 32px;">
              <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Klickenya</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 16px;">New Contact Message</h1>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:14px;width:100px;">Name</td>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;color:#333;font-size:14px;">${escapeHtml(data.name)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:14px;">Email</td>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;color:#333;font-size:14px;"><a href="mailto:${escapeHtml(data.email)}" style="color:#E8A020;">${escapeHtml(data.email)}</a></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:14px;">Subject</td>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;color:#333;font-size:14px;">${escapeHtml(data.subject)}</td>
                </tr>
              </table>
              <h2 style="font-size:14px;font-weight:600;color:#666;margin:0 0 8px;">Message</h2>
              <p style="font-size:14px;color:#333;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function autoReplyHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#E8A020;padding:24px 32px;">
              <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Klickenya</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 16px;">Thanks for reaching out!</h1>
              <p style="font-size:16px;color:#555;line-height:1.6;margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
              <p style="font-size:16px;color:#555;line-height:1.6;margin:0 0 16px;">We've received your message and will get back to you within 24 hours.</p>
              <p style="font-size:16px;color:#555;line-height:1.6;margin:0 0 24px;">In the meantime, feel free to explore what's on Klickenya:</p>
              <a href="https://klickenya.com/stays" style="display:inline-block;background-color:#E8A020;color:#ffffff;padding:12px 24px;border-radius:9999px;font-size:14px;font-weight:600;text-decoration:none;">Explore listings</a>
              <p style="font-size:13px;color:#999;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">Klickenya — Discover the best of Kenya</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
