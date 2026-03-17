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

const listingRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  listingType: z.enum([
    "Stay",
    "Experience",
    "Restaurant",
    "Event",
    "Rental",
    "Service",
    "Real Estate",
  ]),
  location: z.string().optional(),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
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
    const parsed = listingRequestSchema.safeParse(body);

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
    const { error: dbError } = await supabase
      .from("listing_requests")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        listing_type: data.listingType,
        location: data.location ?? null,
        description: data.description ?? null,
        status: "new",
      });

    if (dbError) {
      console.error("Listing request DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to submit request. Please try again." },
        { status: 500 }
      );
    }

    /* Send emails via Resend */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const adminEmail = process.env.ADMIN_EMAIL ?? "hello@klickenya.com";
        const locationStr = data.location ? ` in ${data.location}` : "";

        // Notification to admin
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: adminEmail,
          subject: `New listing request: ${data.listingType}${locationStr}`,
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
          <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">New Listing Request</h1>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.name}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.email}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Phone</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.phone}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Type</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.listingType}</td></tr>
            ${data.location ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Location</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.location}</td></tr>` : ""}
            ${data.description ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;">Description</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${data.description}</td></tr>` : ""}
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        });

        // Confirmation to submitter
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: data.email,
          subject: "We received your listing request",
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
            We received your listing request for <strong>${data.listingType}</strong>${locationStr} and will be in touch within 24 hours.
          </p>
          <p style="color:#52525b;font-size:15px;line-height:1.65;margin:0 0 16px;">
            Our team personally reviews every submission. We'll reach out to gather any extra details and get your listing live as quickly as possible.
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
        console.error("Listing request email error:", emailError);
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Listing request error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
