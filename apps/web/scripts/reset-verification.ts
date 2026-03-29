import { createClient } from "next-sanity";

const client = createClient({
  projectId: "b9zd8u9f",
  dataset: "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const KEEP_VERIFIED_SLUGS = ["zuri-boutique-hotel-watamu"];

async function main() {
  // Fetch all verified listings
  const verified = await client.fetch<
    { _id: string; title: string; slug: string; isVerified: boolean; verificationStatus: string }[]
  >(
    `*[_type == "listing" && isVerified == true]{
      _id,
      title,
      "slug": slug.current,
      isVerified,
      verificationStatus
    }`
  );

  console.log(`Found ${verified.length} verified listing(s)\n`);

  const toReset = verified.filter((l) => !KEEP_VERIFIED_SLUGS.includes(l.slug));
  const kept = verified.filter((l) => KEEP_VERIFIED_SLUGS.includes(l.slug));

  if (kept.length > 0) {
    console.log("KEEPING verified:");
    kept.forEach((l) => console.log(`  ✓ ${l.title} (${l.slug})`));
    console.log();
  }

  if (toReset.length === 0) {
    console.log("Nothing to reset.");
    return;
  }

  console.log(`Resetting ${toReset.length} listing(s) to unverified:\n`);

  for (const listing of toReset) {
    await client
      .patch(listing._id)
      .set({
        isVerified: false,
        verificationStatus: "pending",
      })
      .commit();

    console.log(`  ✗ ${listing.title} (${listing.slug}) → pending`);
  }

  console.log(`\nDone. ${toReset.length} listing(s) reset to unverified.`);
}

main().catch(console.error);
