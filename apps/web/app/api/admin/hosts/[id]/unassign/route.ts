import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient as createSanityClient } from "next-sanity";
import { Resend } from "resend";
import { listingUnassignedToHostHtml, listingUnassignedToAdminHtml } from "@/lib/email/hostEmails";

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
    const { sanityId, listingTitle } = await request.json();

    if (!sanityId) {
      return NextResponse.json({ error: "sanityId is required" }, { status: 400 });
    }

    const { data: host } = await adminClient
      .from("host_profiles")
      .select("id, user_id, display_name, email, sanity_host_id")
      .eq("id", id)
      .single();

    if (!host) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 });
    }

    // Patch Sanity listing — clear host fields, then unset reference
    await sanityWrite
      .patch(sanityId)
      .set({
        hostId: "",
        hostName: "",
        notificationEmail1: process.env.ADMIN_EMAIL ?? "",
        isVerified: false,
        verificationStatus: "pending",
      })
      .commit();

    // Separate mutation to unset the host reference
    await sanityWrite
      .patch(sanityId)
      .unset(["host"])
      .commit();

    // Remove listing from host document's listings array
    if (host.sanity_host_id) {
      await sanityWrite
        .patch(host.sanity_host_id)
        .unset([`listings[_ref=="${sanityId}"]`])
        .commit()
        .catch((err: unknown) => console.error("Remove listing from host error:", err));
    }

    // Email to host
    if (host.email) {
      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: host.email,
        subject: "A listing has been removed from your Klickenya profile",
        html: listingUnassignedToHostHtml({
          hostName: host.display_name ?? "Host",
          listingTitle: listingTitle ?? "Listing",
        }),
      }).catch(() => {});
    }

    // Email to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await resend.emails.send({
        from: "Klickenya <noreply@klickenya.com>",
        to: adminEmail,
        subject: `Admin: Listing unassigned — ${listingTitle}`,
        html: listingUnassignedToAdminHtml({
          listingTitle: listingTitle ?? "Listing",
          hostName: host.display_name ?? "Host",
          hostEmail: host.email ?? "",
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
    console.error("Unassign listing error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
