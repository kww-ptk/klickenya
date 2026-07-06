import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSanityClient } from "next-sanity";
import { Resend } from "resend";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { updateOpportunityStage, GHL_STAGES } from "@/lib/integrations/ghl";
import { uniqueHostSlug } from "@/lib/sanity/hostSlug";

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

function toPortableText(text: string) {
  return [
    {
      _type: "block",
      _key: Math.random().toString(36).slice(2, 10),
      children: [{ _type: "span", _key: Math.random().toString(36).slice(2, 10), text }],
    },
  ];
}

function makeSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    await assertAdmin(req);
    const { id } = await ctx.params;

    /* Fetch listing request */
    const { data: request, error: fetchErr } = await supabase
      .from("listing_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !request) {
      return NextResponse.json({ error: "Listing request not found" }, { status: 404 });
    }

    if (request.status === "approved") {
      return NextResponse.json({ error: "Already approved" }, { status: 409 });
    }

    /* Generate unique slug — check Sanity for an existing listing with this slug */
    const baseSlug = makeSlug(request.draft_title || request.business_name || "listing");
    let listingSlug = baseSlug;
    const existingSlugId = await sanityWrite.fetch<string | null>(
      `*[_type == "listing" && slug.current == $slug][0]._id`,
      { slug: listingSlug }
    );
    if (existingSlugId) {
      listingSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    /* Create Sanity listing document */
    let sanityListingId!: string;
    try {
      const description = request.draft_description || request.description;

      /* Build photos from uploaded Sanity assets */
      let photos: object[] | undefined;
      if (request.draft_photos) {
        const photosArr = typeof request.draft_photos === "string"
          ? JSON.parse(request.draft_photos)
          : request.draft_photos;
        if (Array.isArray(photosArr) && photosArr.length > 0) {
          photos = photosArr.map((p: { assetId: string; alt?: string }) => ({
            _type: "image",
            _key: Math.random().toString(36).slice(2, 10),
            asset: { _type: "reference", _ref: p.assetId },
            alt: p.alt || request.draft_title || "Photo",
          }));
        }
      }

      const listing = await sanityWrite.create({
        _type: "listing",
        title: request.draft_title || request.business_name || "New Listing",
        slug: { _type: "slug", current: listingSlug },
        type: request.listing_type,
        subcategory: request.draft_subcategory || undefined,
        city: request.draft_city || request.location || undefined,
        county: request.draft_county || undefined,
        address: request.draft_address || undefined,
        description: description ? toPortableText(description) : undefined,
        price: request.draft_price ?? undefined,
        priceUnit: request.draft_price_unit || undefined,
        amenities: request.draft_amenities?.length ? request.draft_amenities : undefined,
        tags: request.draft_tags?.length ? request.draft_tags : undefined,
        photos: photos,
        website: request.draft_website || request.website_url || undefined,
        instagram: request.draft_instagram || undefined,
        facebook: request.draft_facebook || undefined,
        phone: request.draft_phone || undefined,
        email: request.draft_email || undefined,
        notificationEmail1: request.email,
        status: "published",
        isVerified: true,
        verificationStatus: "verified",
        submissionSource: "listing_request",
        submissionId: id,
      });
      sanityListingId = listing._id;
    } catch (sanityErr) {
      console.error("Sanity listing create error:", sanityErr);
      return NextResponse.json({ error: "Failed to create listing in Sanity" }, { status: 500 });
    }

    /* Host account provisioning — same 3-path logic as claim approve */
    let userId: string;
    let isNewHost = false;
    let tempPassword: string | null = null;

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === request.email);

    const { data: existingHost } = await supabase
      .from("host_profiles")
      .select("id, user_id, total_listings, sanity_host_id")
      .eq("email", request.email)
      .single();

    if (existingHost) {
      userId = existingHost.user_id;
      await supabase
        .from("host_profiles")
        .update({ total_listings: (existingHost.total_listings ?? 1) + 1 })
        .eq("id", existingHost.id);
    } else if (existingUser) {
      userId = existingUser.id;
      isNewHost = true;

      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: "host", name: request.name },
      });
      await supabase.from("users").update({ role: "host" }).eq("id", userId);

      const baseHostSlug = makeSlug(request.name);
      let hostSlug = baseHostSlug;
      const { count } = await supabase
        .from("host_profiles")
        .select("id", { count: "exact", head: true })
        .eq("slug", hostSlug);
      if ((count ?? 0) > 0) hostSlug = `${baseHostSlug}-${Math.random().toString(36).slice(2, 6)}`;

      await supabase.from("host_profiles").insert({
        user_id: userId,
        slug: hostSlug,
        display_name: request.name,
        email: request.email,
        phone: request.phone,
        city: request.draft_city || request.location || null,
        website_url: request.draft_website || request.website_url || null,
      });
    } else {
      isNewHost = true;
      tempPassword = "welcome" + Math.floor(100 + Math.random() * 900);

      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: request.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role: "host", name: request.name },
      });

      if (authErr || !authData.user) {
        console.error("Host user creation error:", authErr);
        return NextResponse.json({ error: "Failed to create host account" }, { status: 500 });
      }

      userId = authData.user.id;

      await supabase.from("users").upsert({
        id: userId,
        email: request.email,
        full_name: request.name,
        phone: request.phone,
        role: "host",
      });

      const baseHostSlug = makeSlug(request.name);
      let hostSlug = baseHostSlug;
      const { count } = await supabase
        .from("host_profiles")
        .select("id", { count: "exact", head: true })
        .eq("slug", hostSlug);
      if ((count ?? 0) > 0) hostSlug = `${baseHostSlug}-${Math.random().toString(36).slice(2, 6)}`;

      await supabase.from("host_profiles").insert({
        user_id: userId,
        slug: hostSlug,
        display_name: request.name,
        email: request.email,
        phone: request.phone,
        city: request.draft_city || request.location || null,
        website_url: request.draft_website || request.website_url || null,
      });
    }

    /* Create or update Sanity host document + link listing */
    let sanityHostId: string | null = null;
    try {
      const { data: freshHost } = await supabase
        .from("host_profiles")
        .select("id, sanity_host_id")
        .eq("user_id", userId)
        .single();

      if (freshHost?.sanity_host_id) {
        const existingSanityHostId: string = freshHost.sanity_host_id;
        sanityHostId = existingSanityHostId;
        await sanityWrite
          .patch(existingSanityHostId)
          .setIfMissing({ listings: [] })
          .append("listings", [
            { _type: "reference", _ref: sanityListingId, _key: Math.random().toString(36).slice(2, 10) },
          ])
          .commit();

        await sanityWrite
          .patch(sanityListingId)
          .set({ host: { _type: "reference", _ref: existingSanityHostId } })
          .commit();
      } else {
        const hostSlugBase = await uniqueHostSlug(sanityWrite, request.name);
        const sanityHost = await sanityWrite.create({
          _type: "host",
          name: request.name,
          slug: { _type: "slug", current: hostSlugBase },
          email: request.email,
          phone: request.phone,
          website: request.draft_website || request.website_url || undefined,
          planTier: "basic",
          supabaseUserId: userId,
          verified: false,
          createdAt: new Date().toISOString(),
          listings: [
            { _type: "reference", _ref: sanityListingId, _key: Math.random().toString(36).slice(2, 10) },
          ],
        });
        sanityHostId = sanityHost._id;

        await sanityWrite
          .patch(sanityListingId)
          .set({ host: { _type: "reference", _ref: sanityHostId } })
          .commit();

        if (freshHost?.id) {
          await supabase
            .from("host_profiles")
            .update({ sanity_host_id: sanityHostId })
            .eq("id", freshHost.id);
        }
      }
    } catch (sanityHostErr) {
      console.error("Sanity host document error:", sanityHostErr);
    }

    /* Update listing_requests row */
    await supabase
      .from("listing_requests")
      .update({
        status: "approved",
        sanity_listing_id: sanityListingId,
        sanity_host_id: sanityHostId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    /* Send approval email */
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const listingPath = `${request.listing_type}/${listingSlug}`;

      let hostAccountHtml: string;
      if (tempPassword) {
        const loginUrl = `${SITE_URL}/login?email=${encodeURIComponent(request.email)}&temp=${encodeURIComponent(tempPassword)}`;
        hostAccountHtml = `
          <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 24px 0;" />
          <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;"><strong>Your Klickenya host account is ready.</strong></p>
          <div style="background: #FDF8F0; border: 1px solid #E2DDD5; border-radius: 12px; padding: 16px; margin: 0 0 16px;">
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="color: #9C9485; padding: 4px 0; width: 80px;">Email</td><td style="color: #16130C; font-weight: 600;">${request.email}</td></tr>
              <tr><td style="color: #9C9485; padding: 4px 0;">Password</td><td style="color: #16130C; font-weight: 600; font-family: monospace;">${tempPassword}</td></tr>
            </table>
          </div>
          <p style="margin: 0 0 8px;">
            <a href="${loginUrl}" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">Log in to your dashboard →</a>
          </p>
          <p style="font-size: 12px; color: #9C9485; margin: 8px 0 0;">Please change your password after logging in.</p>
        `;
      } else if (isNewHost) {
        hostAccountHtml = `
          <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 24px 0;" />
          <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;"><strong>Your account has been upgraded to Host.</strong></p>
          <p style="margin: 0 0 16px;">
            <a href="${SITE_URL}/login" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">Log in to your dashboard →</a>
          </p>
        `;
      } else {
        hostAccountHtml = `
          <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 24px 0;" />
          <p style="margin: 0 0 16px;">
            <a href="https://klickenya.com/dashboard" style="display: inline-block; background: #E8A020; color: #16130C; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">Go to your dashboard →</a>
          </p>
        `;
      }

      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: request.email,
        subject: `Your listing is live on Klickenya!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 16px; color: #16130C; margin: 0 0 16px;">Hi ${request.name},</p>
            <p style="font-size: 15px; color: #5E5848; margin: 0 0 8px;">
              We've reviewed your submission for <strong>${request.draft_title || request.business_name}</strong> — and it's been approved!
            </p>
            <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">
              Your listing is now live on Klickenya and can be found by travellers across Kenya.
            </p>
            <p style="margin: 0 0 24px;">
              <a href="https://klickenya.com/${listingPath}" style="display: inline-block; background: #16A34A; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-size: 14px;">View your listing →</a>
            </p>
            ${hostAccountHtml}
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

    /* GHL — advance to ACTIVE */
    if (request.ghl_opportunity_id) {
      try {
        await updateOpportunityStage(request.ghl_opportunity_id, GHL_STAGES.ACTIVE);
      } catch (ghlErr) {
        console.error("GHL stage error:", ghlErr);
      }
    }

    return NextResponse.json({ success: true, sanityListingId });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Listing approve error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
