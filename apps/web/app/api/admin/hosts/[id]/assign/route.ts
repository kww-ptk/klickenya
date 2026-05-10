import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient as createSanityClient } from "next-sanity";
import { Resend } from "resend";
import { listingAssignedToHostHtml, listingAssignedToAdminHtml } from "@/lib/email/hostEmails";
import { reassignOrSeedMenu } from "@/lib/menus/reassignOrSeedMenu";

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;
    const { sanityId, listingTitle, listingType, city } = await request.json();

    if (!sanityId) {
      return NextResponse.json({ error: "sanityId is required" }, { status: 400 });
    }

    // Fetch host profile
    const { data: host } = await adminClient
      .from("host_profiles")
      .select("id, user_id, display_name, email, sanity_host_id")
      .eq("id", id)
      .single();

    if (!host) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 });
    }

    // Ensure host has a Sanity host document
    let sanityHostId = host.sanity_host_id;
    if (!sanityHostId) {
      try {
        const slug = (host.display_name ?? "host")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const sanityHost = await sanityWrite.create({
          _type: "host",
          name: host.display_name,
          slug: { _type: "slug", current: slug },
          verified: true,
        });
        sanityHostId = sanityHost._id;

        // Save back to Supabase
        await adminClient
          .from("host_profiles")
          .update({ sanity_host_id: sanityHostId })
          .eq("id", id);
      } catch (hostErr) {
        console.error("Sanity host creation error (non-blocking):", hostErr);
      }
    }

    // Patch Sanity listing — set host reference + legacy fields
    const patchData: Record<string, unknown> = {
      hostId: host.user_id,
      hostName: host.display_name,
      notificationEmail1: host.email,
      isVerified: true,
      verificationStatus: "verified",
    };
    // Set the host document reference so hostRef resolves on listing pages
    if (sanityHostId) {
      patchData.host = { _type: "reference", _ref: sanityHostId };
    }
    await sanityWrite.patch(sanityId).set(patchData).commit();

    // Append listing to host document's listings array
    if (sanityHostId) {
      await sanityWrite
        .patch(sanityHostId)
        .setIfMissing({ listings: [] })
        .append("listings", [{ _type: "reference", _ref: sanityId, _key: sanityId.slice(-8) }])
        .commit()
        .catch((err: unknown) => console.error("Append listing to host error:", err));
    }

    // Seed menu row for restaurant listings
    try {
      const listingDoc = await sanityWrite.fetch(
        `*[_id == $id][0]{ type, subcategory, "slug": slug.current, title }`,
        { id: sanityId }
      );
      const isRestaurant =
        listingDoc?.type === "restaurant" ||
        (listingDoc?.type === "experience" && listingDoc?.subcategory === "restaurants");

      if (isRestaurant && listingDoc?.slug) {
        // Reassign-or-seed: if a menu already exists for this slug (e.g. an
        // earlier claim or admin pre-seed), point its business_id at the
        // newly assigned host. Without this, the host can't see the menu in
        // their dashboard even though /m/<slug> renders fine.
        await reassignOrSeedMenu(adminClient, {
          slug: listingDoc.slug,
          listingSlug: listingDoc.slug,
          businessId: host.user_id,
          name: `${listingDoc.title ?? listingTitle} Menu`,
        });
      }
    } catch (menuErr) {
      console.error("Menu seed on assign (non-blocking):", menuErr);
    }

    // Email to host
    if (host.email) {
      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: host.email,
        subject: "A listing has been added to your Klickenya profile",
        html: listingAssignedToHostHtml({
          hostName: host.display_name ?? "Host",
          listingTitle: listingTitle ?? "Listing",
          listingType: listingType ?? "",
          city: city ?? null,
        }),
      }).catch(() => {});
    }

    // Email to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await resend.emails.send({
        from: "Klickenya <noreply@klickenya.com>",
        to: adminEmail,
        subject: `Admin: Listing assigned — ${listingTitle}`,
        html: listingAssignedToAdminHtml({
          listingTitle: listingTitle ?? "Listing",
          hostName: host.display_name ?? "Host",
          hostEmail: host.email ?? "",
          sanityId,
          hostProfileId: id,
        }),
      }).catch(() => {});
    }

    revalidatePath(`/admin/hosts/${id}`);
    revalidatePath("/dashboard");

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Assign listing error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
