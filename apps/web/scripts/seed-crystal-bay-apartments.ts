/**
 * Add Crystal Bay Apartments, Watamu, to Sanity.
 *
 * Source: https://www.paparemovillage.com/crystal-bay-apartments-sales-watamu
 *
 * Run it:
 *   cd apps/web
 *   SANITY_WRITE_TOKEN=<write-token> npx tsx scripts/seed-crystal-bay-apartments.ts --dry-run
 *   SANITY_WRITE_TOKEN=<write-token> npx tsx scripts/seed-crystal-bay-apartments.ts
 *
 * WRITES A DRAFT. `status: "draft"` alone is not enough to hide a listing —
 * PROPERTY_PUBLIC_FILTER keeps it out of every grid, but PROPERTY_BY_SLUG_QUERY
 * does not filter on status, so the URL would still resolve for anyone who had
 * it. A Sanity draft is invisible either way. Review in Studio, then publish.
 *
 * PRICE. Stored as EUR, not converted. The developer quotes in euro and
 * CLAUDE.md is explicit that a euro asking price rendered as "KSh 179,000" is
 * a bug this project has already shipped once. formatPrice(price, currency)
 * handles the rest. Note this differs from the Claris import, which freezes a
 * converted shilling figure — that convention exists because those listings
 * predate the currency field.
 *
 * WHAT THE SOURCE PAGE ACTUALLY SAYS, and what it does not:
 *   Stated   — Crystal Bay location beside the golf course; 120 m² internal
 *              plus a 30 m² terrace; SILI thermal block; noise-reducing
 *              aluminium frames; off-plan with early-bird pricing; the group
 *              behind Paparemo Village, Crystal Bay and 7 Island Resort.
 *   NOT stated — the €179,000 figure, the private beach, and the resort
 *              facilities. Those came from the person who requested the
 *              listing, not from the page. They are written into the
 *              description as the developer's claims, and they are the first
 *              thing to check before publishing.
 *   Unknown  — bedrooms, bathrooms, and coordinates. Left unset rather than
 *              guessed. bedrooms in particular drives the search filters, so a
 *              wrong number quietly removes the listing from real searches.
 *
 * Photos are the developer's architectural renders, not photographs of a
 * finished building. The alt text says so, and so does the description. That
 * matters on an off-plan listing where a buyer is looking at something that
 * does not exist yet.
 *
 * Idempotent. Deterministic _id, and images are only uploaded when the draft
 * has none, so a second run does not re-upload ten files or orphan the assets.
 */

import { createClient } from "next-sanity";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE_PHOTOS = process.argv.includes("--force-photos");

const DOC_ID = "property-paparemo-crystal-bay-apartments-watamu";
const SLUG = "crystal-bay-apartments-watamu";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "b9zd8u9f",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const CDN = "https://irp.cdn-website.com/7c481398/dms3rep/multi/opt";

/** Architect's renders from the developer's own site. */
const PHOTOS: { url: string; alt: string }[] = [
  { url: `${CDN}/Crystal_Bay_Render10-1920w.jpg`, alt: "Architect's render of the Crystal Bay Apartments exterior, Watamu" },
  { url: `${CDN}/Crystal_Bay_Render3-1920w.JPG`, alt: "Architect's render of the apartment block and landscaped grounds" },
  { url: `${CDN}/Crystal_Bay_Render5-1920w.JPG`, alt: "Architect's render of the pool and terrace area at Crystal Bay" },
  { url: `${CDN}/Crystal_Bay_Render7-1920w.JPG`, alt: "Architect's render of a Crystal Bay apartment terrace" },
  { url: `${CDN}/Crystal_Bay_Render9-1920w.JPG`, alt: "Architect's render of the development seen from the gardens" },
  { url: `${CDN}/Crystal_Bay_Render12-1920w.JPG`, alt: "Architect's render of a Crystal Bay apartment interior" },
  { url: `${CDN}/Crystal_Bay_Render13-1920w.JPG`, alt: "Architect's render of the living space and terrace doors" },
  { url: `${CDN}/crystalBay-apt3-1920w.jpg`, alt: "Architect's render of a Crystal Bay apartment living area" },
  { url: `${CDN}/crystalBay-apt4-2880w.jpg`, alt: "Architect's render of a Crystal Bay apartment bedroom" },
  { url: `${CDN}/DJI_0122-1920w.jpg`, alt: "Aerial view of the Paparemo Village coastline at Watamu" },
];

function block(text: string) {
  return {
    _type: "block",
    _key: `b${Math.random().toString(36).slice(2, 10)}`,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `s${Math.random().toString(36).slice(2, 10)}`, text, marks: [] }],
  };
}

const DESCRIPTION = [
  block(
    "Crystal Bay Apartments is a new off-plan development in the Crystal Bay area of Watamu, set beside the golf course and a short drive from the village, the marine park and the main beaches on this stretch of the Kilifi coast."
  ),
  block(
    "Each apartment offers 120 m² of internal space with a further 30 m² of private terrace. The buildings use SILI thermal block for insulation and noise-reducing aluminium window frames, which on this coast matters as much for keeping rooms cool as for keeping them quiet."
  ),
  block(
    "The development sits within the wider Paparemo Village estate, and the developer states that buyers have access to the resort's facilities and its private beach. Confirm the current facilities list and beach access directly with the developer before committing."
  ),
  block(
    "The developer is the group behind Paparemo Village, Crystal Bay and 7 Island Resort, with more than thirty years building and operating on the Watamu coast."
  ),
  block(
    "Pricing starts at €179,000 at the early-bird off-plan stage. The sale is agreed in euro. Images on this listing are the architect's renders — the building is not yet complete."
  ),
];

const FEATURES = [
  "Pool",
  "Parking",
  "Guard/Security",
  "Gated Community",
  "Garden",
  "Sea View",
];

async function uploadPhotos() {
  const out = [];
  for (const [i, photo] of PHOTOS.entries()) {
    const res = await fetch(photo.url);
    if (!res.ok) {
      console.warn(`  ! skipped ${photo.url} (HTTP ${res.status})`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const asset = await client.assets.upload("image", buf, {
      filename: photo.url.split("/").pop(),
    });
    out.push({
      _type: "image",
      _key: `img${i}`,
      asset: { _type: "reference", _ref: asset._id },
      alt: photo.alt,
    });
    console.log(`  + ${asset._id}`);
  }
  return out;
}

async function main() {
  if (!process.env.SANITY_WRITE_TOKEN && !DRY_RUN) {
    console.error("SANITY_WRITE_TOKEN is not set. Nothing written.");
    process.exit(1);
  }

  const draftId = `drafts.${DOC_ID}`;
  const existing = await client.fetch<{ photos?: unknown[] } | null>(
    `*[_id == $id][0]{ photos }`,
    { id: draftId }
  );

  console.log(`Document : ${draftId}`);
  console.log(`Slug     : ${SLUG}`);
  console.log(`Price    : EUR 179,000 (from, off-plan)`);
  console.log(`Photos   : ${PHOTOS.length} renders to upload`);
  console.log(`Mode     : draft — invisible on the site until published in Studio`);

  if (DRY_RUN) {
    console.log("\n--dry-run, nothing written.");
    return;
  }

  const keepPhotos = !FORCE_PHOTOS && existing?.photos?.length;
  const photos = keepPhotos ? existing!.photos : await uploadPhotos();
  if (keepPhotos) console.log("  (photos already present, not re-uploaded)");

  await client.createOrReplace({
    _id: draftId,
    _type: "property",
    title: "Crystal Bay Apartments",
    slug: { _type: "slug", current: SLUG },
    listingCategory: "for-sale",
    propertyType: "apartment",
    // "available" is what it should be once published; the drafts. prefix is
    // what keeps it off the site until someone decides it is ready.
    status: "available",
    currency: "EUR",
    price: 179000,
    priceType: "total",
    sizeSqm: 120,
    city: "Watamu",
    county: "Kilifi",
    neighbourhood: "Crystal Bay",
    features: FEATURES,
    description: DESCRIPTION,
    photos,
    isNewDevelopment: true,
    listedBy: "developer",
    developerName: "Paparemo Village",
    notificationEmail1: "paparemovillas@gmail.com",
    seoTitle: "Crystal Bay Apartments, Watamu — off-plan from €179,000",
    seoDescription:
      "New off-plan apartments in Crystal Bay, Watamu. 120 m² plus a 30 m² terrace, beside the golf course, within the Paparemo Village estate. From €179,000.",
  } as never);

  console.log(
    `\nDraft written. Open it in Studio and check, in this order:\n` +
      `  1. The €179,000 price, the private beach and the resort facilities —\n` +
      `     none of these appear on the source page.\n` +
      `  2. Bedrooms and bathrooms, both unset. Bedrooms drives the search\n` +
      `     filters, so leaving it empty hides the listing from bedroom searches.\n` +
      `  3. Map coordinates, unset.\n` +
      `Then publish.`
  );
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
