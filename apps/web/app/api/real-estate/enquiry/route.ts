import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sanityClient } from "@/lib/sanity/client";
import { sendToGHL } from "@/lib/integrations/ghl";
import { propertyEnquiryConfirmationHtml } from "@/components/emails/PropertyEnquiryConfirmation";
import { propertyEnquiryNotificationHtml } from "@/components/emails/PropertyEnquiryNotification";

/* ---------- Supabase ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- Validation ---------- */

const internationalPhone = /^\+\d{7,15}$/;

const enquirySchema = z.object({
  propertyId: z.string().min(1),
  propertyTitle: z.string().min(1),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  phone: z.string().regex(internationalPhone, "Enter a valid phone number with country code"),
  enquiryType: z.enum([
    "I want to buy",
    "I want to rent",
    "I want to arrange a viewing",
    "I want more information",
  ]),
  message: z.string().optional(),
  mortgageInterest: z.boolean().default(false),
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
    const parsed = enquirySchema.safeParse(body);

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
    const { data: row, error: dbError } = await supabase
      .from("property_enquiries")
      .insert({
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        name: data.name,
        email: data.email,
        phone: data.phone,
        enquiry_type: data.enquiryType,
        message: data.message ?? null,
        mortgage_interest: data.mortgageInterest,
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

    /* Fetch property notification emails + agent info from Sanity */
    let notificationEmails: string[] = [];
    let agentName: string | undefined;
    let agentPhone: string | undefined;
    let propertySlug: string | undefined;

    try {
      const property = await sanityClient.fetch<{
        notificationEmail1?: string;
        notificationEmail2?: string;
        slug?: { current?: string };
        agent?: { displayName?: string; phone?: string };
      }>(
        `*[_type == "property" && _id == $id][0]{
          notificationEmail1, notificationEmail2, slug,
          "agent": agent->{ displayName, phone }
        }`,
        { id: data.propertyId }
      );
      if (property?.notificationEmail1) notificationEmails.push(property.notificationEmail1);
      if (property?.notificationEmail2) notificationEmails.push(property.notificationEmail2);
      agentName = property?.agent?.displayName;
      agentPhone = property?.agent?.phone;
      propertySlug = property?.slug?.current;
    } catch {
      // Non-blocking
    }

    /* Send emails via Resend */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Confirmation to enquirer
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: data.email,
          subject: `Your enquiry: ${data.propertyTitle}`,
          html: propertyEnquiryConfirmationHtml({
            enquirerName: data.name,
            propertyTitle: data.propertyTitle,
            enquiryType: data.enquiryType,
            agentName,
            agentPhone,
          }),
        });

        // Notification to admin + property notification emails
        const adminEmail = process.env.ADMIN_EMAIL;
        const allRecipients = [
          ...(adminEmail ? [adminEmail] : []),
          ...notificationEmails,
        ].filter((e, i, arr) => arr.indexOf(e) === i); // deduplicate

        if (allRecipients.length > 0) {
          const propertyUrl = propertySlug
            ? `https://klickenya.com/real-estate/${propertySlug}`
            : `https://klickenya.com/real-estate`;

          await resend.emails.send({
            from: "Klickenya <hello@klickenya.com>",
            to: allRecipients,
            subject: `New property enquiry: ${data.propertyTitle}`,
            html: propertyEnquiryNotificationHtml({
              propertyTitle: data.propertyTitle,
              propertyUrl,
              enquirerName: data.name,
              enquirerEmail: data.email,
              enquirerPhone: data.phone,
              enquiryType: data.enquiryType,
              mortgageInterest: data.mortgageInterest,
              message: data.message,
            }),
          });
        }
      } catch (emailError) {
        console.error("Email send error:", emailError);
      }
    }

    /* Send to GHL */
    sendToGHL("property_enquiry.created", {
      enquiryId: row.id,
      propertyId: data.propertyId,
      propertyTitle: data.propertyTitle,
      enquiryType: data.enquiryType,
      mortgageInterest: data.mortgageInterest,
      name: data.name,
      email: data.email,
      phone: data.phone,
    });

    return NextResponse.json({ success: true, id: row.id }, { status: 201 });
  } catch (err) {
    console.error("Property enquiry error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
