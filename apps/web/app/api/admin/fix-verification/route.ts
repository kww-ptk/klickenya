import { NextResponse } from "next/server";
import { createClient as createSanityClient } from "next-sanity";

const sanity = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const KEEP_SLUGS = ["zuri-boutique-hotel-watamu"];

/**
 * GET /api/admin/fix-verification
 * Sets all listings to isVerified=false, verificationStatus="pending"
 * except the ones in KEEP_SLUGS. Fixes null and "claimed" states.
 * One-time use — remove after running.
 */
export async function GET() {
  try {
    const listings = await sanity.fetch<
      { _id: string; title: string; slug: string; isVerified: boolean | null; verificationStatus: string | null }[]
    >(
      `*[_type == "listing" && (isVerified != false || verificationStatus != "pending")] {
        _id,
        title,
        "slug": slug.current,
        isVerified,
        verificationStatus
      }`
    );

    const toFix = listings.filter((l) => !KEEP_SLUGS.includes(l.slug));
    const kept = listings.filter((l) => KEEP_SLUGS.includes(l.slug));

    const results: string[] = [];

    for (const listing of toFix) {
      await sanity
        .patch(listing._id)
        .set({ isVerified: false, verificationStatus: "pending" })
        .commit();

      results.push(
        `${listing.title} (${listing.slug}) [was: ${listing.isVerified}/${listing.verificationStatus}] → pending`
      );
    }

    return NextResponse.json({
      success: true,
      kept: kept.map((l) => `✓ ${l.title} (${l.slug})`),
      fixed: results,
      totalFound: listings.length,
      totalFixed: toFix.length,
    });
  } catch (err) {
    console.error("Fix verification error:", err);
    return NextResponse.json({ error: "Failed", details: String(err) }, { status: 500 });
  }
}
