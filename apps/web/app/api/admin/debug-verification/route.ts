import { NextResponse } from "next/server";
import { createClient as createSanityClient } from "next-sanity";

const sanity = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

/**
 * GET /api/admin/debug-verification
 * Shows all listings that are NOT in a clean "pending" state.
 * Temporary — remove after debugging.
 */
export async function GET() {
  const results = await sanity.fetch<
    { _id: string; title: string; slug: string; type: string; city: string; isVerified: boolean; verificationStatus: string }[]
  >(
    `*[_type == "listing" && (isVerified == true || verificationStatus != "pending")] | order(type, title) {
      _id,
      title,
      "slug": slug.current,
      type,
      city,
      isVerified,
      verificationStatus
    }`
  );

  return NextResponse.json({
    total: results.length,
    listings: results.map((l) => ({
      title: l.title,
      slug: l.slug,
      type: l.type,
      city: l.city,
      isVerified: l.isVerified,
      verificationStatus: l.verificationStatus,
    })),
  });
}
