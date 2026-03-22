import { createClient } from "next-sanity";
import * as fs from "fs";

const client = createClient({
  projectId: "b9zd8u9f",
  dataset: "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

function key() {
  return Math.random().toString(36).slice(2, 12);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

function cleanTitle(name: string): string {
  return name
    .replace(/,\s*Diani Beach,?\s*Kenya$/i, "")
    .replace(/,\s*Diani Beach$/i, "")
    .replace(/-Diani Beach$/i, "")
    .replace(/\s*-\s*Diani Beach$/i, "")
    .trim();
}

function determineSubcategory(name: string, description: string): string {
  const lower = (name + " " + description).toLowerCase();
  if (/\bvilla\b/.test(lower)) return "villa";
  if (/\bresort\b/.test(lower)) return "boutique_hotel";
  if (/\bapartment\b|\bstudio\b|\baparthotel\b/.test(lower)) return "private_room";
  if (/\bhostel\b/.test(lower)) return "hostel";
  return "villa";
}

function extractAmenities(description: string): string[] {
  const lower = description.toLowerCase();
  const amenityMap: Record<string, string> = {
    "swimming pool": "Pool",
    "outdoor pool": "Pool",
    "infinity pool": "Pool",
    "saltwater pool": "Pool",
    "rooftop.*pool": "Pool",
    "wifi": "WiFi",
    "kitchen": "Kitchen",
    "parking": "Parking",
    "air.?conditioning": "Air Conditioning",
    "garden": "Garden",
    "gym": "Gym",
    "fitness": "Gym",
    "security": "Security",
    "24.?hour front desk": "Security",
    "sea view": "Sea View",
    "ocean view": "Sea View",
    "pet.?friendly": "Pet Friendly",
  };

  const found = new Set<string>();
  for (const [pattern, amenity] of Object.entries(amenityMap)) {
    if (new RegExp(pattern, "i").test(lower)) {
      found.add(amenity);
    }
  }
  return Array.from(found);
}

function cleanDescription(name: string, rawDesc: string): string {
  let desc = rawDesc
    .replace(/^About this property/i, "")
    .replace(/Distance in property description.*$/i, "")
    .replace(/Couples particularly like.*$/i, "")
    .replace(/Highly rated by guests\.?/gi, "")
    .trim();

  // Build a clean 2-3 sentence SEO-friendly description
  const cleanName = cleanTitle(name);
  const lower = desc.toLowerCase();

  const hasPool = /pool/.test(lower);
  const hasBeach = /beach/.test(lower) || /beachfront/.test(lower);
  const hasGarden = /garden/.test(lower);
  const hasRestaurant = /restaurant/.test(lower);
  const hasSpa = /spa/.test(lower);
  const hasWifi = /wifi/.test(lower);
  const hasKitchen = /kitchen/.test(lower);
  const hasAC = /air.?conditioning/.test(lower);
  const hasParking = /parking/.test(lower);
  const hasHousekeeping = /housekeeping/.test(lower);
  const hasSeaview = /sea view/.test(lower) || /ocean view/.test(lower);
  const hasChef = /chef/.test(lower);
  const hasWaterSports = /water sport/.test(lower) || /snorkelling/.test(lower) || /diving/.test(lower);
  const hasTerrace = /terrace|balcony/.test(lower);

  const features: string[] = [];
  if (hasBeach) features.push("direct beach access");
  if (hasPool) features.push("a swimming pool");
  if (hasGarden) features.push("lush tropical gardens");
  if (hasSeaview) features.push("stunning sea views");
  if (hasRestaurant) features.push("an on-site restaurant");
  if (hasSpa) features.push("spa facilities");
  if (hasChef) features.push("private chef services");
  if (hasWaterSports) features.push("water sports");

  const comforts: string[] = [];
  if (hasAC) comforts.push("air conditioning");
  if (hasWifi) comforts.push("free WiFi");
  if (hasKitchen) comforts.push("a fully equipped kitchen");
  if (hasParking) comforts.push("free parking");
  if (hasHousekeeping) comforts.push("daily housekeeping");
  if (hasTerrace) comforts.push("private terrace");

  let result = `${cleanName} is a beautiful getaway in Diani Beach`;
  if (features.length > 0) {
    result += ` featuring ${features.slice(0, 3).join(", ")}`;
  }
  result += ".";

  if (comforts.length > 0) {
    result += ` Guests enjoy ${comforts.slice(0, 4).join(", ")}.`;
  }

  result += " Perfectly located on Kenya's stunning south coast, it's an ideal base for exploring Diani's white sandy beaches and vibrant marine life.";

  return result;
}

function textBlock(text: string, style: string = "normal"): any {
  return {
    _type: "block",
    _key: key(),
    style,
    children: [{ _type: "span", _key: key(), text, marks: [] }],
  };
}

async function uploadImageFromUrl(
  url: string,
  filename: string
): Promise<any> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const asset = await client.assets.upload("image", buffer, { filename });
    return {
      _type: "image",
      _key: key(),
      asset: { _type: "reference", _ref: asset._id },
      alt: filename.replace(/[-_]/g, " ").replace(/\.\w+$/, ""),
    };
  } catch (e) {
    console.warn(`  ⚠ Failed to upload ${filename}:`, e);
    return null;
  }
}

interface BookingProperty {
  name: string;
  description: string;
  rating: number;
  reviews: number;
  images: string[];
  address: {
    full: string;
    country: string;
    city: string;
  };
  [key: string]: any;
}

async function main() {
  const dataPath =
    "/Users/patrikgiuliana/Downloads/dataset_booking-scraper_2026-03-22_13-27-17-735.json";
  const raw = fs.readFileSync(dataPath, "utf-8");
  const properties: BookingProperty[] = JSON.parse(raw);

  console.log(`\nLoaded ${properties.length} properties from JSON\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    const num = i + 1;

    // Skip #20 Diani Sea Side Studios (4.0 rating)
    if (prop.name.includes("Diani Sea Side Studios")) {
      console.log(`[${num}/20] SKIP: ${prop.name} (rating ${prop.rating} too low)`);
      skipped++;
      continue;
    }

    const title = cleanTitle(prop.name);
    const slugBase = slugify(title);
    const docId = `diani-${slugBase}`;

    console.log(`[${num}/20] Processing: ${title}`);

    try {
      // Check for duplicates
      const existing = await client.fetch(
        `*[_type == "listing" && title == $title][0]`,
        { title }
      );
      if (existing) {
        console.log(`  → Already exists, skipping`);
        skipped++;
        continue;
      }

      // Upload hero image
      console.log(`  → Uploading hero image...`);
      const heroImage = prop.images?.length
        ? await uploadImageFromUrl(prop.images[0], `${slugBase}-hero.jpg`)
        : null;

      // Determine subcategory
      const subcategory = determineSubcategory(prop.name, prop.description);

      // Extract amenities
      const amenities = extractAmenities(prop.description);

      // Clean description
      const descText = cleanDescription(prop.name, prop.description);

      // Rating on 5-scale
      const rating5 = prop.rating > 5 ? Math.round((prop.rating / 2) * 10) / 10 : prop.rating;

      // Build tags
      const tags: string[] = ["beachfront"];
      if (amenities.includes("Pool")) tags.push("pool");
      if (amenities.includes("Garden")) tags.push("garden");
      if (subcategory === "villa") tags.push("family");
      if (/adults.?only/i.test(prop.name)) tags.push("adults-only");

      const doc: Record<string, any> = {
        _type: "listing",
        _id: docId,
        title,
        slug: { _type: "slug", current: slugBase },
        type: "stay",
        subcategory,
        status: "draft",
        city: "Diani Beach",
        county: "Kwale",
        address: prop.address?.full || "",
        description: [textBlock(descText)],
        amenities,
        tags,
        hostName: "Klickenya",
        notificationEmail1: "klickenya@gmail.com",
        isVerified: false,
        verificationStatus: "pending",
        photos: heroImage ? [heroImage] : [],
        seoTitle: `${title} | Diani Beach Stay`,
        seoDescription: descText.slice(0, 155),
      };

      await client.createOrReplace(doc);
      console.log(
        `  ✓ Created: ${title} (${subcategory}, rating ${rating5}/5, ${prop.reviews} reviews, ${amenities.length} amenities)`
      );
      created++;
    } catch (err: any) {
      console.error(`  ✗ Error for ${title}:`, err?.message || err);
      errors++;
    }
  }

  console.log(`\n========== DONE ==========`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors:  ${errors}`);
  console.log(`Total:   ${properties.length}`);
}

main().catch(console.error);
