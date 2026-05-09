import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createOrUpdateContact, createOrUpdateOpportunity, GHL_STAGES } from "@/lib/integrations/ghl";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const uploadedImageSchema = z.object({
  assetId: z.string(),
  url: z.string(),
  alt: z.string(),
});

const schema = z.object({
  listingType: z.string().min(1),
  submitterName: z.string().min(2),
  submitterEmail: z.string().email(),
  submitterPhone: z.string().min(9),
  businessName: z.string().min(1),
  websiteUrl: z.string().optional(),
  googlePlaceId: z.string().optional(),
  draftTitle: z.string().min(1),
  draftDescription: z.string().min(20),
  draftCity: z.string().min(1),
  draftCounty: z.string().optional(),
  draftAddress: z.string().optional(),
  draftSubcategory: z.string().min(1),
  draftPrice: z.number().int().min(0).optional(),
  draftPriceUnit: z.string().optional(),
  draftAmenities: z.array(z.string()).optional(),
  draftTags: z.array(z.string()).optional(),
  draftWebsite: z.string().optional(),
  draftInstagram: z.string().optional(),
  draftFacebook: z.string().optional(),
  draftPhone: z.string().optional(),
  draftEmail: z.string().optional(),
  draftPhotos: z.array(uploadedImageSchema).optional(),
  photoConsent: z.enum(["yes_all", "yes_logo_only", "no"]).optional(),
  aiScore: z.number().nullable().optional(),
  aiSummary: z.string().nullable().optional(),
  aiFlags: z.array(z.string()).nullable().optional(),
  consentGiven: z.boolean(),
  consentTimestamp: z.string(),
  consentText: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    /* Rate limit — max 3 pending_otp submissions per email in 1 hour */
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("listing_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", data.submitterEmail)
      .eq("status", "pending_otp")
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again in 1 hour." },
        { status: 429 }
      );
    }

    /* Generate OTP */
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    /* Insert into listing_requests */
    const { data: row, error: dbError } = await supabase
      .from("listing_requests")
      .insert({
        listing_type: data.listingType,
        name: data.submitterName,
        email: data.submitterEmail,
        phone: data.submitterPhone,
        business_name: data.businessName,
        website_url: data.websiteUrl ?? null,
        google_place_id: data.googlePlaceId ?? null,
        draft_title: data.draftTitle,
        draft_description: data.draftDescription,
        draft_city: data.draftCity,
        draft_county: data.draftCounty ?? null,
        draft_address: data.draftAddress ?? null,
        draft_subcategory: data.draftSubcategory,
        draft_price: data.draftPrice ?? null,
        draft_price_unit: data.draftPriceUnit ?? null,
        draft_amenities: data.draftAmenities ?? null,
        draft_tags: data.draftTags ?? null,
        draft_website: data.draftWebsite ?? null,
        draft_instagram: data.draftInstagram ?? null,
        draft_facebook: data.draftFacebook ?? null,
        draft_phone: data.draftPhone ?? null,
        draft_email: data.draftEmail ?? null,
        draft_photos: data.draftPhotos ? JSON.stringify(data.draftPhotos) : null,
        photo_consent: data.photoConsent ?? null,
        ai_score: data.aiScore ?? null,
        ai_summary: data.aiSummary ?? null,
        ai_flags: data.aiFlags ?? null,
        ai_analysed_at: data.aiScore != null ? new Date().toISOString() : null,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        otp_verified: false,
        consent_given: data.consentGiven,
        consent_timestamp: data.consentTimestamp,
        consent_text: data.consentText,
        status: "pending_otp",
        location: data.draftCity,
        description: data.draftDescription,
      })
      .select("id")
      .single();

    if (dbError || !row) {
      console.error("Listing request insert error:", dbError);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    /* Send OTP email */
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: data.submitterEmail,
        subject: `Your Klickenya listing verification code: ${otpCode}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 16px; color: #16130C; margin: 0 0 16px;">Hi ${data.submitterName},</p>
            <p style="font-size: 15px; color: #5E5848; margin: 0 0 24px;">
              Your verification code to submit <strong>${data.draftTitle}</strong> to Klickenya:
            </p>
            <div style="background: #FDF8F0; border: 2px solid #E8A020; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #E8A020;">${otpCode}</span>
            </div>
            <p style="font-size: 13px; color: #9C9485; margin: 0 0 8px;">This code expires in 15 minutes.</p>
            <p style="font-size: 13px; color: #9C9485; margin: 0 0 8px;">Do not share this code with anyone.</p>
            <p style="font-size: 13px; color: #9C9485; margin: 0 0 24px;">If you did not request this, ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 0 0 16px;" />
            <p style="font-size: 12px; color: #9C9485; margin: 0;">
              — The Klickenya Team<br />
              <a href="https://klickenya.com" style="color: #E8A020; text-decoration: none;">klickenya.com</a>
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Listing OTP email error:", emailErr);
    }

    /* GHL — create contact + opportunity at CONTACTED stage */
    const nameParts = data.submitterName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";
    const listingUrl = `https://klickenya.com/${data.listingType}`;

    try {
      const contactId = await createOrUpdateContact({
        firstName,
        lastName,
        email: data.submitterEmail,
        phone: data.submitterPhone,
      });

      if (contactId) {
        const opportunityId = await createOrUpdateOpportunity(contactId, {
          stageId: GHL_STAGES.CONTACTED,
          listingName: data.draftTitle,
          listingUrl,
        });

        await supabase
          .from("listing_requests")
          .update({
            ghl_contact_id: contactId,
            ...(opportunityId && { ghl_opportunity_id: opportunityId }),
          })
          .eq("id", row.id);
      }
    } catch (ghlErr) {
      console.error("GHL listing request error:", ghlErr);
    }

    return NextResponse.json({ success: true, submissionId: row.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data. Please check your details." },
        { status: 400 }
      );
    }
    console.error("Listing submit error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
