/**
 * Import the Claris African Experience for-sale listings into Sanity.
 *
 * Source: https://clarisafricanexperience.com/for-sale
 * Data:   scripts/data/claris-properties.json (extracted from the listing pages,
 *         descriptions kept verbatim)
 *
 * Run it:
 *   cd apps/web
 *   SANITY_WRITE_TOKEN=<write-token> npx tsx scripts/seed-claris-properties.ts --dry-run
 *   SANITY_WRITE_TOKEN=<write-token> npx tsx scripts/seed-claris-properties.ts
 *
 * The script is idempotent. Every document gets a deterministic _id, so a second
 * run updates the same records instead of creating duplicates, and photos are
 * only fetched and uploaded when a property has none — re-running does not
 * re-upload 48 images or orphan the old assets.
 *
 * listingCategory doubles as the browse category, so a plot has to be "land"
 * rather than "for-sale" or it never shows under /real-estate/land and instead
 * hides among the houses. Same for commercial. propertyType records what the
 * asset is; listingCategory records which grid it belongs in.
 *
 * Two listings on the Claris site are deliberately NOT imported: Mida Creek
 * Building Plot (CAE-1002) and Turtle Bay Garden Villa (CAE-1001). Both are
 * priced in US dollars rather than euro, both carry reference codes no other
 * listing has, and neither has a single photograph of its own — their galleries
 * reuse pictures of the White Bay rental villa. They already exist in Sanity as
 * partner records and are left untouched.
 */

import { createClient } from "next-sanity";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ── Config ────────────────────────────────────────── */

const DRY_RUN = process.argv.includes("--dry-run");
/**
 * Re-uploads only the images a property is missing.
 *
 * Sanity occasionally rejects a perfectly valid JPEG with "Invalid image, could
 * not process". The import logs it and keeps going rather than losing the whole
 * property, which leaves a gap. Images are keyed img0..imgN by their position
 * in the source gallery, so a gap is detectable and fillable without
 * re-uploading the ones that already worked.
 */
const FIX_PHOTOS = process.argv.includes("--fix-photos");
const PARTNER_SLUG = "claris";
const AGENT_ID = "agent-claris-african-experience";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "b9zd8u9f",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

interface SourceProperty {
  sourceUrl: string;
  title: string;
  slug: string;
  listingCategory: string;
  propertyType: string;
  price: number;
  currency: string;
  priceType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  landSizeAcres: number | null;
  neighbourhood: string;
  city: string;
  county: string;
  isNewDevelopment: boolean;
  unitsAvailable: number | null;
  features: string[];
  descriptionParagraphs: string[];
  seoDescription: string;
  photos: string[];
}

const properties: SourceProperty[] = JSON.parse(
  readFileSync(join(__dirname, "data", "claris-properties.json"), "utf8")
);

/* ── Helpers ───────────────────────────────────────── */

function portableText(paragraphs: string[]) {
  return paragraphs.map((text, i) => ({
    _type: "block",
    _key: `p${i}`,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `p${i}s0`, text, marks: [] }],
  }));
}

async function uploadPhoto(url: string, alt: string, index: number) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = url.split("/").pop() || `photo-${index}.jpg`;
  const asset = await client.assets.upload("image", buffer, { filename });
  return {
    _type: "image",
    _key: `img${index}`,
    alt,
    asset: { _type: "reference", _ref: asset._id },
  };
}

/* ── Main ──────────────────────────────────────────── */

async function main() {
  if (!process.env.SANITY_WRITE_TOKEN && !DRY_RUN) {
    console.error("SANITY_WRITE_TOKEN is required (or pass --dry-run).");
    process.exit(1);
  }

  console.log(
    `\n${DRY_RUN ? "DRY RUN — nothing will be written" : "Writing to Sanity"}\n`
  );

  /* Partner ------------------------------------------------------------- */
  const partner = await client.fetch<{ _id: string; name: string } | null>(
    `*[_type == "partner" && slug.current == $slug][0]{ _id, name }`,
    { slug: PARTNER_SLUG }
  );
  if (!partner) {
    console.error(`No partner with slug "${PARTNER_SLUG}".`);
    process.exit(1);
  }
  console.log(`Partner: ${partner.name} (${partner._id})`);

  /* Agent --------------------------------------------------------------- */
  const agentDoc = {
    _id: AGENT_ID,
    _type: "agent",
    displayName: "Claris African Experience",
    slug: { _type: "slug", current: "claris-african-experience" },
    agencyName: "Claris African Experience",
    isVerified: true,
    phone: "+254797373771",
    email: "clarisafricanexperience@gmail.com",
    bio: "Villa rentals, property sales and property management in Watamu, on the Kenyan coast. Claris handles viewings, purchase assistance and ongoing management for buyers who are not in the country.",
    specialisations: ["Coastal property", "Holiday homes", "Land"],
    serviceAreas: ["Watamu", "Malindi", "Kilifi"],
  };

  if (DRY_RUN) {
    console.log(`Agent: would upsert ${agentDoc.displayName} (${AGENT_ID})`);
  } else {
    await client.createOrReplace(agentDoc);
    console.log(`Agent: upserted ${agentDoc.displayName}`);
  }

  /* Properties ---------------------------------------------------------- */
  let created = 0;
  let updated = 0;
  let photosUploaded = 0;

  for (const p of properties) {
    const _id = `property-claris-${p.slug}`;
    const existing = await client.fetch<{
      _id: string;
      photoCount: number;
      keys: string[];
    } | null>(
      `*[_id == $id][0]{ _id, "photoCount": count(photos), "keys": photos[]._key }`,
      { id: _id }
    );

    const doc: Record<string, unknown> = {
      _id,
      _type: "property",
      partner: { _type: "reference", _ref: partner._id },
      publishToMarketplace: true,
      title: p.title,
      slug: { _type: "slug", current: p.slug },
      listingCategory: p.listingCategory,
      propertyType: p.propertyType,
      status: "available",
      price: p.price,
      currency: p.currency,
      priceType: p.priceType,
      neighbourhood: p.neighbourhood,
      city: p.city,
      county: p.county,
      features: p.features,
      description: portableText(p.descriptionParagraphs),
      isNewDevelopment: p.isNewDevelopment,
      isFeatured: false,
      // Claris is an estate agency; the two off-plan compounds are still sold
      // through them rather than direct from the developer.
      listedBy: "agency",
      seoDescription: p.seoDescription,
      agent: { _type: "reference", _ref: AGENT_ID },
    };

    if (p.bedrooms != null) doc.bedrooms = p.bedrooms;
    if (p.bathrooms != null) doc.bathrooms = p.bathrooms;
    if (p.sizeSqm != null) doc.sizeSqm = p.sizeSqm;
    if (p.landSizeAcres != null) doc.landSizeAcres = p.landSizeAcres;
    if (p.unitsAvailable != null) doc.unitsAvailable = p.unitsAvailable;

    const needsPhotos = !existing || existing.photoCount === 0;

    console.log(
      `\n${p.title}\n  ${p.currency} ${p.price.toLocaleString()} · ${p.propertyType} · ${p.neighbourhood}, ${p.city}` +
        `\n  ${p.descriptionParagraphs.length} paragraphs · ${p.features.length} features · ` +
        `${needsPhotos ? `${p.photos.length} photos to upload` : `${existing?.photoCount} photos already on the document`}` +
        `\n  ${existing ? "updates" : "creates"} ${_id}`
    );

    if (DRY_RUN) continue;

    if (FIX_PHOTOS && existing) {
      // Fill gaps only, leaving every image that already uploaded in place.
      const have = new Set(existing.keys ?? []);
      const missing = p.photos
        .map((url, i) => ({ url, i }))
        .filter(({ i }) => !have.has(`img${i}`));

      if (missing.length === 0) {
        console.log("  nothing missing");
        continue;
      }

      const recovered = [];
      for (const { url, i } of missing) {
        try {
          recovered.push(await uploadPhoto(url, p.title, i));
          photosUploaded++;
          process.stdout.write("+");
        } catch (err) {
          console.warn(`\n  photo ${i + 1} failed again: ${(err as Error).message}`);
        }
      }
      process.stdout.write("\n");

      if (recovered.length > 0) {
        const current = await client.fetch<Record<string, unknown>[]>(
          `*[_id == $id][0].photos`,
          { id: _id }
        );
        const merged = [...(current ?? []), ...recovered].sort((a, b) =>
          String((a as { _key: string })._key).localeCompare(
            String((b as { _key: string })._key),
            undefined,
            { numeric: true }
          )
        );
        await client.patch(_id).set({ photos: merged }).commit();
        updated++;
      }
      continue;
    }

    if (needsPhotos) {
      const photos = [];
      for (let i = 0; i < p.photos.length; i++) {
        try {
          photos.push(await uploadPhoto(p.photos[i], p.title, i));
          photosUploaded++;
          process.stdout.write(".");
        } catch (err) {
          console.warn(`\n  photo ${i + 1} failed: ${(err as Error).message}`);
        }
      }
      if (photos.length > 0) doc.photos = photos;
      process.stdout.write("\n");
    }

    await client.createOrReplace(doc);
    if (existing) updated++;
    else created++;
  }

  console.log(
    `\n${DRY_RUN ? "Dry run complete." : `Done. ${created} created, ${updated} updated, ${photosUploaded} photos uploaded.`}\n`
  );

  if (!DRY_RUN) {
    console.log("Sanity revalidates on a 60 second window, so give the");
    console.log("marketplace a minute before checking /real-estate.\n");
  }
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
