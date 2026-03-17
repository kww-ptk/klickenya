import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

/* ---------- Supabase (service role for server-side inserts) ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- Validation ---------- */

const enquirySchema = z.object({
  propertyId: z.string().min(1),
  propertyTitle: z.string().min(1),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

/* ---------- Rate limiter: 10 requests per minute per IP ---------- */

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
    const parsed = enquirySchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        { success: false, errors: fieldErrors },
        { status: 400 }
      );
    }

    const { propertyId, propertyTitle, name, email, phone, message } =
      parsed.data;

    /* Save to Supabase */
    const { data, error: dbError } = await supabase
      .from("property_enquiries")
      .insert({
        property_id: propertyId,
        property_title: propertyTitle,
        name,
        email,
        phone: phone ?? null,
        message,
        status: "new",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Enquiry DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to submit enquiry. Please try again." },
        { status: 500 }
      );
    }

    /* Send admin notification email via Resend (non-blocking) */
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: process.env.ADMIN_EMAIL,
          subject: `New enquiry: ${propertyTitle}`,
          html: `
            <h2>New Property Enquiry</h2>
            <p><strong>Property:</strong> ${propertyTitle}</p>
            <p><strong>Property ID:</strong> ${propertyId}</p>
            <hr />
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `,
        });
      } catch (emailError) {
        // Log but don't fail the enquiry if email sending fails
        console.error("Admin notification email error:", emailError);
      }
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err) {
    console.error("Property enquiry error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
