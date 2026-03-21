import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSanityClient } from "next-sanity";
import { Resend } from "resend";
import { sendToGHL } from "@/lib/integrations/ghl";

/* ---------- Supabase ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- Sanity write client ---------- */

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

/* ---------- Zod schema ---------- */

const verifySchema = z.object({
  claimId: z.string().uuid(),
  otpCode: z.string().length(6),
});

/* ---------- POST ---------- */

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const body = await req.json();
    const data = verifySchema.parse(body);

    /* STEP 1 — Find claim */
    const { data: claim, error: findErr } = await supabase
      .from("claim_requests")
      .select("*")
      .eq("id", data.claimId)
      .eq("status", "pending")
      .single();

    if (findErr || !claim) {
      return NextResponse.json(
        { error: "Claim not found." },
        { status: 404 }
      );
    }

    /* STEP 2 — Check expiry */
    if (new Date(claim.otp_expires_at) < new Date()) {
      await supabase
        .from("claim_requests")
        .update({ status: "expired" })
        .eq("id", data.claimId);

      return NextResponse.json(
        { error: "Code expired. Please request a new one." },
        { status: 410 }
      );
    }

    /* STEP 3 — Check attempts */
    if (claim.otp_attempts >= 5) {
      return NextResponse.json(
        { error: "Too many attempts." },
        { status: 429 }
      );
    }

    /* STEP 4 — Validate OTP */
    if (data.otpCode !== claim.otp_code) {
      await supabase
        .from("claim_requests")
        .update({ otp_attempts: (claim.otp_attempts ?? 0) + 1 })
        .eq("id", data.claimId);

      return NextResponse.json(
        { error: "Incorrect code." },
        { status: 400 }
      );
    }

    /* STEP 5 — Mark verified in Supabase */
    await supabase
      .from("claim_requests")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        claimant_ip: ip,
      })
      .eq("id", data.claimId);

    /* STEP 6 — Update Sanity listing */
    const claimedAt = new Date().toISOString();
    try {
      await sanityWrite
        .patch(claim.listing_sanity_id)
        .set({
          verificationStatus: "claimed",
          claimedBy: claim.claimant_email,
          ownerName: claim.claimant_name,
          claimedAt,
          notificationEmail1: claim.claimant_email,
        })
        .commit();
    } catch (sanityErr) {
      console.error("Sanity patch error:", sanityErr);
      // Don't fail — Supabase is already updated, admin can fix in Studio
    }

    /* STEP 7 — Send confirmation email to owner */
    const listingUrl = `https://klickenya.com/${claim.listing_type === "experience" ? "experiences" : claim.listing_type + "s"}/${(claim.listing_city ?? "").toLowerCase().replace(/ /g, "-")}/${claim.listing_slug}`;

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: claim.claimant_email,
        subject: `You've claimed ${claim.listing_title} on Klickenya ✓`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 16px; color: #16130C; margin: 0 0 16px;">Hi ${claim.claimant_name},</p>
            <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;">
              You've successfully claimed <strong>${claim.listing_title}</strong> on Klickenya. ✓
            </p>
            <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">
              Our team will review your listing within 24 hours. Once approved, a green Verified badge will appear on your listing.
            </p>
            <p style="margin: 0 0 24px;">
              <a href="${listingUrl}" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">View your listing →</a>
            </p>
            <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">
              Your approval should arrive shortly. We'll send you another email once your listing is verified.
            </p>
            <p style="font-size: 13px; color: #9C9485; margin: 0 0 8px;">Questions? Reply to this email.</p>
            <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 16px 0;" />
            <p style="font-size: 12px; color: #9C9485; margin: 0;">
              — The Klickenya Team<br />
              <a href="https://klickenya.com" style="color: #E8A020; text-decoration: none;">klickenya.com</a>
            </p>
          </div>
        `,
      });

      /* STEP 8 — Send admin notification */
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: adminEmail,
          subject: `New claim: ${claim.listing_title}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
              <h2 style="font-size: 18px; color: #16130C; margin: 0 0 16px;">New Listing Claim</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #9C9485; width: 120px;">Name</td><td style="padding: 8px 0; color: #16130C; font-weight: 600;">${claim.claimant_name}</td></tr>
                <tr><td style="padding: 8px 0; color: #9C9485;">Email</td><td style="padding: 8px 0; color: #16130C;">${claim.claimant_email}</td></tr>
                <tr><td style="padding: 8px 0; color: #9C9485;">Phone</td><td style="padding: 8px 0; color: #16130C;">${claim.claimant_phone}</td></tr>
                <tr><td style="padding: 8px 0; color: #9C9485;">Listing</td><td style="padding: 8px 0; color: #16130C; font-weight: 600;">${claim.listing_title}</td></tr>
                <tr><td style="padding: 8px 0; color: #9C9485;">Type</td><td style="padding: 8px 0; color: #16130C;">${claim.listing_type}</td></tr>
                <tr><td style="padding: 8px 0; color: #9C9485;">City</td><td style="padding: 8px 0; color: #16130C;">${claim.listing_city ?? "—"}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 20px 0;" />
              <h3 style="font-size: 14px; color: #9C9485; margin: 0 0 12px; letter-spacing: 1px;">── LISTING FEEDBACK ──</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 6px 0; color: #9C9485; width: 140px;">Everything correct</td><td style="padding: 6px 0; color: #16130C;">${claim.everything_correct === true ? "Yes ✓" : claim.everything_correct === false ? "No ✗" : "Not answered"}</td></tr>
                ${claim.everything_correct === false ? `<tr><td style="padding: 6px 0; color: #9C9485;">Issues reported</td><td style="padding: 6px 0; color: #16130C;">${claim.incorrect_fields?.join(", ") ?? "None specified"}</td></tr>` : ""}
                <tr><td style="padding: 6px 0; color: #9C9485;">Additional notes</td><td style="padding: 6px 0; color: #16130C;">${claim.additional_notes ?? "None provided"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9C9485;">Website</td><td style="padding: 6px 0; color: #16130C;">${claim.website_url ?? "Not provided"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9C9485;">Social media</td><td style="padding: 6px 0; color: #16130C;">${claim.social_media_url ?? "Not provided"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9C9485;">Photo consent</td><td style="padding: 6px 0; color: #16130C;">${claim.photo_consent === "yes_all" ? "✓ Yes — use all photos" : claim.photo_consent === "yes_logo_only" ? "Logo and key photos only" : claim.photo_consent === "no" ? "✗ No — will provide own" : "Not specified"}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 20px 0;" />
              <h3 style="font-size: 14px; color: #9C9485; margin: 0 0 12px; letter-spacing: 1px;">── CONSENT ──</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 6px 0; color: #9C9485; width: 140px;">Terms accepted</td><td style="padding: 6px 0; color: #16130C;">Yes</td></tr>
                <tr><td style="padding: 6px 0; color: #9C9485;">Agreed at</td><td style="padding: 6px 0; color: #16130C;">${claim.consent_timestamp ? new Date(claim.consent_timestamp).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9C9485;">IP address</td><td style="padding: 6px 0; color: #16130C;">${ip}</td></tr>
              </table>
              <p style="margin: 24px 0 0;">
                <a href="${listingUrl}" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 10px 24px; border-radius: 999px; font-size: 13px;">View listing →</a>
                <a href="https://klickenya.sanity.studio/structure/listing;${claim.listing_sanity_id}" style="display: inline-block; margin-left: 12px; background: #16130C; color: #fff; font-weight: 700; text-decoration: none; padding: 10px 24px; border-radius: 999px; font-size: 13px;">Review in Sanity →</a>
              </p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error("Claim verify email error:", emailErr);
    }

    /* STEP 9 — Fire GHL webhook */
    sendToGHL("listing.claimed", {
      listing_slug: claim.listing_slug,
      listing_title: claim.listing_title,
      listing_type: claim.listing_type,
      owner_name: claim.claimant_name,
      owner_email: claim.claimant_email,
      owner_phone: claim.claimant_phone,
      claimed_at: claimedAt,
      pipeline_stage: "Claimed",
    });

    /* STEP 10 — Return */
    return NextResponse.json({
      success: true,
      listingSlug: claim.listing_slug,
      listingTitle: claim.listing_title,
      listingType: claim.listing_type,
      listingCity: claim.listing_city,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data." },
        { status: 400 }
      );
    }
    console.error("Claim verify error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
