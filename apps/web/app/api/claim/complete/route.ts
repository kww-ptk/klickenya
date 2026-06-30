import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityPreviewClient } from "@/lib/sanity/client";

// Confirms a listing is assigned to this host (forward field, host ref, or the
// host doc's listings[] array) — mirrors the dashboard/assign linkage.
const OWNS_QUERY = `count(*[_type == "listing" && _id == $id && (
  hostId == $uid
  || host._ref == $shid
  || _id in *[_type == "host" && _id == $shid][0].listings[]._ref
)]) > 0`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      listingSanityId,
      listingSlug,
      listingTitle,
      listingType,
      listingCity,
      everythingCorrect,
      incorrectFields,
      additionalNotes,
      socialMediaUrl,
      websiteUrl,
      photoConsent,
      consentGiven,
      consentText,
    } = body;

    if (!listingSanityId || !listingSlug || !listingTitle || !listingType) {
      return NextResponse.json(
        { error: "Missing listing details" },
        { status: 400 }
      );
    }
    if (consentGiven !== true) {
      return NextResponse.json({ error: "Consent is required" }, { status: 400 });
    }

    // Host profile — authoritative claimant fields + sanity_host_id.
    const { data: host } = await adminClient
      .from("host_profiles")
      .select("user_id, display_name, email, phone, sanity_host_id")
      .eq("user_id", user.id)
      .single();
    if (!host) {
      return NextResponse.json(
        { error: "Host profile not found" },
        { status: 403 }
      );
    }

    // Ownership check — the listing must be assigned to this host.
    const owns = await sanityPreviewClient
      .fetch<boolean>(OWNS_QUERY, {
        id: listingSanityId,
        uid: user.id,
        shid: host.sanity_host_id ?? "",
      })
      .catch(() => false);
    if (!owns) {
      return NextResponse.json(
        { error: "This listing is not assigned to you" },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    const { error: insErr } = await adminClient.from("claim_requests").insert({
      listing_slug: listingSlug,
      listing_sanity_id: listingSanityId,
      listing_title: listingTitle,
      listing_type: listingType,
      listing_city: listingCity ?? null,
      claimant_name: host.display_name ?? "Host",
      claimant_email: host.email ?? user.email ?? "",
      claimant_phone: host.phone ?? "",
      otp_code: "", // not used — authenticated completion
      otp_expires_at: nowIso, // satisfies NOT NULL; irrelevant for verified rows
      status: "verified",
      verified_at: nowIso,
      source: "host_dashboard",
      host_user_id: user.id,
      everything_correct:
        typeof everythingCorrect === "boolean" ? everythingCorrect : null,
      incorrect_fields:
        Array.isArray(incorrectFields) && incorrectFields.length
          ? incorrectFields
          : null,
      additional_notes: additionalNotes || null,
      social_media_url: socialMediaUrl || null,
      website_url: websiteUrl || null,
      photo_consent: photoConsent ?? null,
      consent_given: true,
      consent_timestamp: nowIso,
      consent_text: consentText || "",
    });

    if (insErr) {
      console.error("Claim complete insert error:", insErr);
      return NextResponse.json(
        { error: "Could not save. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Claim complete error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
