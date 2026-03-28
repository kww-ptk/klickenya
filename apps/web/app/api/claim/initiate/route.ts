import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createOrUpdateContact, createOrUpdateOpportunity, GHL_STAGES } from "@/lib/integrations/ghl";

/* ---------- Supabase ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- Zod schema ---------- */

const claimSchema = z.object({
  claimantName: z.string().min(2),
  claimantEmail: z.string().email(),
  claimantPhone: z.string().min(9),
  listingSlug: z.string(),
  listingSanityId: z.string(),
  listingTitle: z.string(),
  listingType: z.string(),
  listingCity: z.string().optional(),
  everythingCorrect: z.boolean().optional(),
  incorrectFields: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),
  socialMediaUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  photoConsent: z.enum(["yes_all", "yes_logo_only", "no"]).optional(),
  consentGiven: z.boolean(),
  consentTimestamp: z.string(),
  consentText: z.string(),
});

/* ---------- POST ---------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = claimSchema.parse(body);

    /* STEP 1 — Rate limit */
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("claim_requests")
      .select("id", { count: "exact", head: true })
      .eq("claimant_email", data.claimantEmail)
      .eq("status", "pending")
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in 1 hour." },
        { status: 429 }
      );
    }

    /* STEP 2 — Generate OTP */
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    /* STEP 3 — Save to Supabase */
    const { data: row, error: dbError } = await supabase
      .from("claim_requests")
      .insert({
        listing_slug: data.listingSlug,
        listing_sanity_id: data.listingSanityId,
        listing_title: data.listingTitle,
        listing_type: data.listingType,
        listing_city: data.listingCity ?? null,
        claimant_name: data.claimantName,
        claimant_email: data.claimantEmail,
        claimant_phone: data.claimantPhone,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        status: "pending",
        everything_correct: data.everythingCorrect ?? null,
        incorrect_fields: data.incorrectFields ?? null,
        additional_notes: data.additionalNotes ?? null,
        social_media_url: data.socialMediaUrl ?? null,
        website_url: data.websiteUrl ?? null,
        photo_consent: data.photoConsent ?? null,
        consent_given: data.consentGiven,
        consent_timestamp: data.consentTimestamp,
        consent_text: data.consentText,
      })
      .select("id")
      .single();

    if (dbError || !row) {
      console.error("Claim insert error:", dbError);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    /* STEP 4 — Send OTP via email */
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: data.claimantEmail,
        subject: `Your Klickenya verification code: ${otpCode}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 16px; color: #16130C; margin: 0 0 16px;">Hi ${data.claimantName},</p>
            <p style="font-size: 15px; color: #5E5848; margin: 0 0 24px;">
              Your verification code to claim <strong>${data.listingTitle}</strong> on Klickenya:
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
      console.error("Claim OTP email error:", emailErr);
      // Don't fail the request — OTP is saved, admin can resend
    }

    /* STEP 5 — Create GHL contact + opportunity (fire and forget) */
    const nameParts = data.claimantName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";
    const listingUrl = `https://klickenya.com/${data.listingType}/${data.listingSlug}`;

    (async () => {
      try {
        const contactId = await createOrUpdateContact({
          firstName,
          lastName,
          email: data.claimantEmail,
          phone: data.claimantPhone,
        });

        if (contactId) {
          const opportunityId = await createOrUpdateOpportunity(contactId, {
            stageId: GHL_STAGES.CONTACTED,
            listingName: data.listingTitle,
            listingUrl,
          });

          await supabase
            .from("claim_requests")
            .update({
              ghl_contact_id: contactId,
              ...(opportunityId && { ghl_opportunity_id: opportunityId }),
            })
            .eq("id", row.id);
        }
      } catch {
        // GHL failure must never break the claim flow
      }
    })();

    /* STEP 6 — Return */
    return NextResponse.json({ success: true, claimId: row.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data. Please check your details." },
        { status: 400 }
      );
    }
    console.error("Claim initiate error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
