import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSanityClient } from "next-sanity";
import { Resend } from "resend";
import { updateOpportunityStage, GHL_STAGES } from "@/lib/integrations/ghl";

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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://klickenya.com";

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
            hostName: claim.claimant_name,
            notificationEmail1: claim.claimant_email,
          })
          .commit();
      } catch (sanityErr) {
        console.error("Sanity approve patch error:", sanityErr);
      }

      // Step 2b — Check if auth user already exists (could be a guest)
      let userId: string;
      let isNewHost = false;
      let tempPassword: string | null = null;

      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email === claim.claimant_email
      );

      // Check if host profile already exists
      const { data: existingHost } = await supabase
        .from("host_profiles")
        .select("id, user_id, total_listings, sanity_host_id")
        .eq("email", claim.claimant_email)
        .single();

      if (existingHost) {
        // Existing host — increment total_listings
        userId = existingHost.user_id;
        await supabase
          .from("host_profiles")
          .update({ total_listings: (existingHost.total_listings ?? 1) + 1 })
          .eq("id", existingHost.id);
      } else if (existingUser) {
        // Existing guest user — promote to host
        userId = existingUser.id;
        isNewHost = true;

        // Update role to host
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role: "host", name: claim.claimant_name },
        });
        await supabase
          .from("users")
          .update({ role: "host" })
          .eq("id", userId);

        // Generate unique slug
        const baseSlug = claim.claimant_name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-");

        let slug = baseSlug;
        const { count } = await supabase
          .from("host_profiles")
          .select("id", { count: "exact", head: true })
          .eq("slug", slug);

        if ((count ?? 0) > 0) {
          slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        }

        // Create host profile for existing user
        const { error: profileErr } = await supabase
          .from("host_profiles")
          .insert({
            user_id: userId,
            slug,
            display_name: claim.claimant_name,
            email: claim.claimant_email,
            phone: claim.claimant_phone,
            city: claim.listing_city ?? null,
            website_url: claim.website_url ?? null,
            social_url: claim.social_media_url ?? null,
            claim_request_id: id,
            ghl_contact_id: claim.ghl_contact_id ?? null,
          });

        if (profileErr) {
          console.error("Host profile insert error:", profileErr);
        }
      } else {
        // Step 2c — Create new auth user with temporary password
        isNewHost = true;
        tempPassword = "welcome" + Math.floor(100 + Math.random() * 900);

        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: claim.claimant_email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { role: "host", name: claim.claimant_name },
        });

        if (authErr || !authData.user) {
          console.error("Host user creation error:", authErr);
          return NextResponse.json({ error: "Failed to create host account" }, { status: 500 });
        }

        userId = authData.user.id;

        // Insert into users table
        await supabase
          .from("users")
          .upsert({
            id: userId,
            email: claim.claimant_email,
            full_name: claim.claimant_name,
            phone: claim.claimant_phone,
            role: "host",
          });

        // Generate unique slug
        const baseSlug = claim.claimant_name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-");

        let slug = baseSlug;
        const { count } = await supabase
          .from("host_profiles")
          .select("id", { count: "exact", head: true })
          .eq("slug", slug);

        if ((count ?? 0) > 0) {
          slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        }

        // Insert host profile
        const { error: profileErr } = await supabase
          .from("host_profiles")
          .insert({
            user_id: userId,
            slug,
            display_name: claim.claimant_name,
            email: claim.claimant_email,
            phone: claim.claimant_phone,
            city: claim.listing_city ?? null,
            website_url: claim.website_url ?? null,
            social_url: claim.social_media_url ?? null,
            claim_request_id: id,
            ghl_contact_id: claim.ghl_contact_id ?? null,
          });

        if (profileErr) {
          console.error("Host profile insert error:", profileErr);
        }
      }

      // Step 2d — Create or update Sanity host document + link listing
      try {
        if (existingHost?.sanity_host_id) {
          // Existing host — append listing to their host document
          await sanityWrite
            .patch(existingHost.sanity_host_id)
            .setIfMissing({ listings: [] })
            .append("listings", [
              { _type: "reference", _ref: claim.listing_sanity_id, _key: Math.random().toString(36).slice(2, 10) },
            ])
            .commit();

          // Set host reference on listing
          await sanityWrite
            .patch(claim.listing_sanity_id)
            .set({ host: { _type: "reference", _ref: existingHost.sanity_host_id } })
            .commit();
        } else {
          // New host — create Sanity host document
          const slugBase = claim.claimant_name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");

          const sanityHost = await sanityWrite.create({
            _type: "host",
            name: claim.claimant_name,
            slug: { _type: "slug", current: slugBase },
            email: claim.claimant_email,
            phone: claim.claimant_phone,
            website: claim.website_url ?? undefined,
            planTier: "basic",
            supabaseUserId: userId,
            verified: true,
            createdAt: new Date().toISOString(),
            listings: [
              { _type: "reference", _ref: claim.listing_sanity_id, _key: Math.random().toString(36).slice(2, 10) },
            ],
          });

          // Set host reference on listing
          await sanityWrite
            .patch(claim.listing_sanity_id)
            .set({ host: { _type: "reference", _ref: sanityHost._id } })
            .commit();

          // Store sanity_host_id in Supabase
          await supabase
            .from("host_profiles")
            .update({ sanity_host_id: sanityHost._id })
            .eq("user_id", userId);
        }
      } catch (sanityErr) {
        console.error("Sanity host document error:", sanityErr);
      }

      // Send approval + host account email
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const listingUrl = `https://klickenya.com/${claim.listing_type === "experience" ? "experiences" : claim.listing_type + "s"}/${(claim.listing_city ?? "").toLowerCase().replace(/ /g, "-")}/${claim.listing_slug}`;

        let hostAccountSection: string;
        if (tempPassword) {
          // Brand new user — show credentials + auto-login link
          const loginUrl = `${SITE_URL}/login?email=${encodeURIComponent(claim.claimant_email)}&temp=${encodeURIComponent(tempPassword)}`;
          hostAccountSection = `
            <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 24px 0;" />
            <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;">
              <strong>Your Klickenya host account is ready.</strong>
            </p>
            <p style="font-size: 14px; color: #5E5848; margin: 0 0 8px;">
              Your login credentials:
            </p>
            <div style="background: #FDF8F0; border: 1px solid #E2DDD5; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
              <table style="width: 100%; font-size: 14px;">
                <tr><td style="color: #9C9485; padding: 4px 0; width: 80px;">Email</td><td style="color: #16130C; font-weight: 600;">${claim.claimant_email}</td></tr>
                <tr><td style="color: #9C9485; padding: 4px 0;">Password</td><td style="color: #16130C; font-weight: 600; font-family: monospace;">${tempPassword}</td></tr>
              </table>
            </div>
            <p style="margin: 0 0 16px;">
              <a href="${loginUrl}" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">Log in to your dashboard →</a>
            </p>
            <p style="font-size: 12px; color: #9C9485; margin: 0 0 0;">
              Please change your password after logging in.
            </p>
          `;
        } else if (isNewHost) {
          // Existing guest promoted to host — they already have a password
          hostAccountSection = `
            <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 24px 0;" />
            <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;">
              <strong>Your account has been upgraded to Host.</strong>
            </p>
            <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">
              Log in with your existing password to access your host dashboard.
            </p>
            <p style="margin: 0 0 24px;">
              <a href="${SITE_URL}/login" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">Log in to your dashboard →</a>
            </p>
          `;
        } else {
          // Existing host adding another listing
          hostAccountSection = `
            <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 24px 0;" />
            <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">
              This listing has been added to your host dashboard.
            </p>
            <p style="margin: 0 0 24px;">
              <a href="https://klickenya.com/dashboard" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">Go to your dashboard →</a>
            </p>
          `;
        }

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
              ${hostAccountSection}
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
          GHL_STAGES.ACTIVE
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
        GHL_STAGES.LOST
      );
    }

    return NextResponse.json({ success: true, action: "rejected" });
  } catch (err) {
    console.error("Admin claim action error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
