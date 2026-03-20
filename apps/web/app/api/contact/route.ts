import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sanityClient } from "@/lib/sanity/client";
import { sendToGHL } from "@/lib/integrations/ghl";
import { contactConfirmationHtml } from "@/components/emails/ContactConfirmation";
import { contactNotificationHtml } from "@/components/emails/ContactNotification";

/* ---------- Supabase ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- International phone ---------- */

const internationalPhone = /^\+\d{7,15}$/;

/* ---------- Schemas ---------- */

const baseFields = {
  listingId: z.string().min(1),
  listingTitle: z.string().min(1),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  phone: z.string().regex(internationalPhone, "Enter a valid phone number with country code"),
  message: z.string().optional(),
};

const staySchema = z.object({
  ...baseFields,
  listingType: z.literal("stay"),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guests: z.number().min(1).max(50),
});

const experienceSchema = z.object({
  ...baseFields,
  listingType: z.literal("experience"),
  preferredDate: z.string().min(1),
  groupSize: z.number().min(1).max(50),
  experienceLevel: z.enum(["Beginner", "Intermediate", "Experienced"]),
});

const eventSchema = z.object({
  ...baseFields,
  listingType: z.literal("event"),
  ticketQuantity: z.number().min(1).max(20),
  ticketType: z.string().min(1),
  promoCode: z.string().optional(),
});

const rentalSchema = z.object({
  ...baseFields,
  listingType: z.literal("rental"),
  pickupDate: z.string().min(1),
  returnDate: z.string().min(1),
  licenceNumber: z.string().min(3),
});

const serviceSchema = z.object({
  ...baseFields,
  listingType: z.literal("service"),
  preferredDate: z.string().min(1),
  preferredTime: z.string().min(1),
  duration: z.enum(["1h", "2h", "3h", "Half day", "Full day"]),
});

const restaurantSchema = z.object({
  ...baseFields,
  listingType: z.literal("restaurant"),
  reservationDate: z.string().min(1),
  reservationTime: z.string().min(1),
  diners: z.number().min(1).max(30),
});

const contactSchema = z.union([
  staySchema,
  experienceSchema,
  eventSchema,
  rentalSchema,
  serviceSchema,
  restaurantSchema,
]);

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

/* ---------- Helpers ---------- */

function buildEnquirySummary(data: z.infer<typeof contactSchema>): Record<string, string> {
  const summary: Record<string, string> = {};

  switch (data.listingType) {
    case "stay":
      summary["Check-in"] = data.checkIn;
      summary["Check-out"] = data.checkOut;
      summary["Guests"] = String(data.guests);
      break;
    case "experience":
      summary["Preferred date"] = data.preferredDate;
      summary["Group size"] = String(data.groupSize);
      summary["Experience level"] = data.experienceLevel;
      break;
    case "event":
      summary["Ticket quantity"] = String(data.ticketQuantity);
      summary["Ticket type"] = data.ticketType;
      if (data.promoCode) summary["Promo code"] = data.promoCode;
      break;
    case "rental":
      summary["Pickup date"] = data.pickupDate;
      summary["Return date"] = data.returnDate;
      summary["Licence number"] = data.licenceNumber;
      break;
    case "service":
      summary["Preferred date"] = data.preferredDate;
      summary["Preferred time"] = data.preferredTime;
      summary["Duration"] = data.duration;
      break;
    case "restaurant":
      summary["Reservation date"] = data.reservationDate;
      summary["Reservation time"] = data.reservationTime;
      summary["Diners"] = String(data.diners);
      break;
  }

  return summary;
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
    const parsed = contactSchema.safeParse(body);

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
    const enquirySummary = buildEnquirySummary(data);

    /* Save to Supabase */
    const { data: row, error: dbError } = await supabase
      .from("contact_requests")
      .insert({
        listing_id: data.listingId,
        listing_title: data.listingTitle,
        listing_type: data.listingType,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message ?? null,
        enquiry_details: enquirySummary,
        status: "new",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Contact DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to submit enquiry. Please try again." },
        { status: 500 }
      );
    }

    /* Fetch listing notification emails from Sanity */
    let notificationEmails: string[] = [];
    try {
      const listing = await sanityClient.fetch<{
        notificationEmail1?: string;
        notificationEmail2?: string;
        slug?: { current?: string };
      }>(
        `*[_type == "listing" && _id == $id][0]{ notificationEmail1, notificationEmail2, slug }`,
        { id: data.listingId }
      );
      if (listing?.notificationEmail1) notificationEmails.push(listing.notificationEmail1);
      if (listing?.notificationEmail2) notificationEmails.push(listing.notificationEmail2);
    } catch {
      // Non-blocking — continue without notification emails
    }

    /* Send emails via Resend */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Confirmation to guest
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: data.email,
          subject: `Your enquiry: ${data.listingTitle}`,
          html: contactConfirmationHtml({
            guestName: data.name,
            listingTitle: data.listingTitle,
            listingType: data.listingType,
            enquirySummary,
          }),
        });

        // Notification to admin + host notification emails
        const adminEmail = process.env.ADMIN_EMAIL;
        const allRecipients = [
          ...(adminEmail ? [adminEmail] : []),
          ...notificationEmails,
        ].filter((e, i, arr) => arr.indexOf(e) === i); // deduplicate

        if (allRecipients.length > 0) {
          const listingUrl = `https://klickenya.com/listings/${data.listingType}/${data.listingId}`;

          await resend.emails.send({
            from: "Klickenya <hello@klickenya.com>",
            to: allRecipients,
            subject: `New enquiry: ${data.listingTitle}`,
            html: contactNotificationHtml({
              listingTitle: data.listingTitle,
              listingType: data.listingType,
              listingUrl,
              guestName: data.name,
              guestEmail: data.email,
              guestPhone: data.phone,
              message: data.message,
              enquiryDetails: enquirySummary,
            }),
          });
        }
      } catch (emailError) {
        console.error("Email send error:", emailError);
      }
    }

    /* Send to GHL */
    sendToGHL("contact_request.created", {
      contactRequestId: row.id,
      listingId: data.listingId,
      listingTitle: data.listingTitle,
      listingType: data.listingType,
      name: data.name,
      email: data.email,
      phone: data.phone,
      ...enquirySummary,
    });

    return NextResponse.json({ success: true, id: row.id }, { status: 201 });
  } catch (err) {
    console.error("Contact request error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
