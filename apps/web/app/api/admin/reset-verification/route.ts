import { NextResponse } from "next/server";
import { createClient as createSanityClient } from "next-sanity";

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const KEEP_VERIFIED_SLUGS = ["zuri-boutique-hotel-watamu"];

/**
 * GET /api/admin/reset-verification
 * Resets all verified listings to pending, except the ones in KEEP_VERIFIED_SLUGS.
 * One-time use. Remove after running.
 */
export async function GET() {
  try {
    const verified = await sanityWrite.fetch<
      { _id: string; title: string; slug: string }[]
    >(
      `*[_type == "listing" && isVerified == true]{
        _id,
        title,
        "slug": slug.current
      }`
    );

    const toReset = verified.filter(
      (l) => !KEEP_VERIFIED_SLUGS.includes(l.slug)
    );
    const kept = verified.filter((l) =>
      KEEP_VERIFIED_SLUGS.includes(l.slug)
    );

    const results: string[] = [];

    for (const listing of toReset) {
      await sanityWrite
        .patch(listing._id)
        .set({ isVerified: false, verificationStatus: "pending" })
        .commit();

      results.push(`✗ ${listing.title} (${listing.slug}) → pending`);
    }

    return NextResponse.json({
      success: true,
      kept: kept.map((l) => `✓ ${l.title} (${l.slug})`),
      reset: results,
      totalFound: verified.length,
      totalReset: toReset.length,
    });
  } catch (err) {
    console.error("Reset verification error:", err);
    return NextResponse.json(
      { error: "Failed", details: String(err) },
      { status: 500 }
    );
  }
}
