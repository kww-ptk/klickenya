import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient as createSanityClient } from "next-sanity";
import { Resend } from "resend";
import { listingAssignedToHostHtml, listingAssignedToAdminHtml } from "@/lib/email/hostEmails";

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
      .select("id, user_id, display_name, email")
      .eq("id", id)
      .single();

    if (!host) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 });
    }

    // Patch Sanity listing
    await sanityWrite
      .patch(sanityId)
      .set({
        hostId: host.user_id,
        hostName: host.display_name,
        notificationEmail1: host.email,
      })
      .commit();

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

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Assign listing error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
