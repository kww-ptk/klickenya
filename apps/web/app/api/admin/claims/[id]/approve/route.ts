import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSanityClient } from "next-sanity";
import { Resend } from "resend";
import { updateOpportunityStage } from "@/lib/integrations/ghl";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const action: string = body.action; // "approve" or "reject"

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Fetch claim
    const { data: claim, error: fetchErr } = await supabase
      .from("claim_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (action === "approve") {
      // Update Supabase
      await supabase
        .from("claim_requests")
        .update({ status: "approved" })
        .eq("id", id);

      // Update Sanity — set verified
      try {
        await sanityWrite
          .patch(claim.listing_sanity_id)
          .set({
            isVerified: true,
            verificationStatus: "verified",
            claimedBy: claim.claimant_email,
            ownerName: claim.claimant_name,
            notificationEmail1: claim.claimant_email,
          })
          .commit();
      } catch (sanityErr) {
        console.error("Sanity approve patch error:", sanityErr);
      }

      // Send approval email to owner
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const listingUrl = `https://klickenya.com/${claim.listing_type === "experience" ? "experiences" : claim.listing_type + "s"}/${(claim.listing_city ?? "").toLowerCase().replace(/ /g, "-")}/${claim.listing_slug}`;

        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: claim.claimant_email,
          subject: `✓ ${claim.listing_title} is now verified on Klickenya`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
              <p style="font-size: 16px; color: #16130C; margin: 0 0 16px;">Hi ${claim.claimant_name},</p>
              <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;">
                Great news! <strong>${claim.listing_title}</strong> has been reviewed and approved. ✓
              </p>
              <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">
                Your listing now has a green <strong>Verified</strong> badge, giving guests confidence to book with you.
              </p>
              <p style="margin: 0 0 24px;">
                <a href="${listingUrl}" style="display: inline-block; background: #16A34A; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">View your verified listing →</a>
              </p>
              <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 16px 0;" />
              <p style="font-size: 12px; color: #9C9485; margin: 0;">
                — The Klickenya Team<br />
                <a href="https://klickenya.com" style="color: #E8A020; text-decoration: none;">klickenya.com</a>
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Approval email error:", emailErr);
      }

      // Update GHL opportunity stage
      if (claim.ghl_opportunity_id) {
        updateOpportunityStage(
          claim.ghl_opportunity_id,
          process.env.GHL_STAGE_ACTIVE_ID!
        );
      }

      return NextResponse.json({ success: true, action: "approved" });
    }

    // Reject
    await supabase
      .from("claim_requests")
      .update({ status: "rejected" })
      .eq("id", id);

    // Send rejection email
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: claim.claimant_email,
        subject: `Update on your claim for ${claim.listing_title}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 16px; color: #16130C; margin: 0 0 16px;">Hi ${claim.claimant_name},</p>
            <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;">
              We were unable to verify your claim for <strong>${claim.listing_title}</strong> at this time.
            </p>
            <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">
              This may be because we could not confirm ownership. If you believe this is an error, please reply to this email with additional proof of ownership.
            </p>
            <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 16px 0;" />
            <p style="font-size: 12px; color: #9C9485; margin: 0;">
              — The Klickenya Team<br />
              <a href="https://klickenya.com" style="color: #E8A020; text-decoration: none;">klickenya.com</a>
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Rejection email error:", emailErr);
    }

    // Update GHL opportunity stage
    if (claim.ghl_opportunity_id) {
      updateOpportunityStage(
        claim.ghl_opportunity_id,
        process.env.GHL_STAGE_LOST_ID!
      );
    }

    return NextResponse.json({ success: true, action: "rejected" });
  } catch (err) {
    console.error("Admin claim action error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
