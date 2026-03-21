import { createClient } from "next-sanity";

const client = createClient({
  projectId: "b9zd8u9f",
  dataset: "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

async function uploadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const asset = await client.assets.upload("image", buffer, { filename });
    return { _type: "image" as const, asset: { _type: "reference" as const, _ref: asset._id } };
  } catch (e) {
    console.error(`  ⚠ Failed to upload ${filename}:`, (e as Error).message);
    return null;
  }
}

async function main() {
  console.log("🏨 Seeding Maya Kobe...\n");

  // Check if already exists
  const existing = await client.fetch(
    `*[_type == "listing" && title == "Maya Kobe"][0]._id`
  );

  // Upload hero image
  console.log("  📸 Uploading hero image...");
  const heroImg = await uploadImage(
    "https://tribalsand.com/images/maya-kobe/Maya%20Kobe%20-%20Day%20Outdoor,%20Pool,%20Beach/Maya%20Kobe%20Best14.jpg",
    "maya-kobe-hero.jpg"
  );

  // Upload room photos
  const roomPhotos: Record<string, Awaited<ReturnType<typeof uploadImage>>> = {};
  const roomPhotoUrls: Record<string, string> = {
    "Prestige Suite": "https://tribalsand.com/images/maya-kobe/Maya%20Kobe%20-%20Cottage/Cottage%20Bedrooms/Maya%20Kobe%20prestige%20suite.jpg",
    "Haze Suite": "https://tribalsand.com/images/maya-kobe/Maya%20Kobe%20-%20Bedrooms/Bedroom%201/Maya%20Kobe%20Best7.jpg",
    "Glow Suite": "https://tribalsand.com/images/maya-kobe/Maya%20Kobe%20-%20Bedrooms/Bedroom%201/Maya%20Kobe%20Best10.jpg",
    "Tide Suite": "https://tribalsand.com/images/maya-kobe/Maya%20Kobe%20-%20Day%20Outdoor,%20Pool,%20Beach/Maya%20Kobe%20Best4.jpg",
    "Drift Suite": "https://tribalsand.com/images/maya-kobe/Aerial/Maya%20Kobe%20Best1.JPG",
  };

  for (const [name, url] of Object.entries(roomPhotoUrls)) {
    console.log(`  📸 Uploading ${name} photo...`);
    roomPhotos[name] = await uploadImage(url, `maya-kobe-${name.toLowerCase().replace(/\s/g, "-")}.jpg`);
  }

  const rooms = [
    {
      _key: "prestige",
      roomName: "Prestige Suite",
      roomDescription: "A secluded two-bedroom suite with its own private pool and open-air bathtub. Features a common living room, en-suite bathrooms, and breathtaking ocean and garden views. The ultimate private retreat within Maya Kobe.",
      photos: roomPhotos["Prestige Suite"] ? [roomPhotos["Prestige Suite"]] : [],
      pricePerNight: 72800,
      capacity: 4,
      bedType: "Double",
      roomAmenities: ["Sea view", "Garden view", "Pool view", "Balcony", "Terrace", "Bathtub", "Shower only"],
      isAvailable: true,
      quantity: 1,
    },
    {
      _key: "haze",
      roomName: "Haze Suite",
      roomDescription: "Pool View Suite with veranda. A serene double suite overlooking the 20m beachfront pool, featuring an en-suite bathroom and private veranda for morning coffee.",
      photos: roomPhotos["Haze Suite"] ? [roomPhotos["Haze Suite"]] : [],
      pricePerNight: 33800,
      capacity: 2,
      bedType: "Double",
      roomAmenities: ["Pool view", "Terrace", "Shower only"],
      isAvailable: true,
      quantity: 1,
    },
    {
      _key: "glow",
      roomName: "Glow Suite",
      roomDescription: "Ocean View Suite with veranda. A beautifully designed double suite with panoramic views of the Indian Ocean, en-suite bathroom, and a private veranda.",
      photos: roomPhotos["Glow Suite"] ? [roomPhotos["Glow Suite"]] : [],
      pricePerNight: 33800,
      capacity: 2,
      bedType: "Double",
      roomAmenities: ["Sea view", "Terrace", "Shower only"],
      isAvailable: true,
      quantity: 1,
    },
    {
      _key: "tide",
      roomName: "Tide Suite",
      roomDescription: "Ocean View Suite with veranda. A serene double suite with stunning ocean views, en-suite bathroom, and a private veranda surrounded by tropical gardens.",
      photos: roomPhotos["Tide Suite"] ? [roomPhotos["Tide Suite"]] : [],
      pricePerNight: 33800,
      capacity: 2,
      bedType: "Double",
      roomAmenities: ["Sea view", "Terrace", "Fan", "Shower only"],
      isAvailable: true,
      quantity: 1,
    },
    {
      _key: "drift",
      roomName: "Drift Suite",
      roomDescription: "Ocean View Suite with veranda. A peaceful double suite with ocean and garden views, en-suite bathroom, and a private veranda — the perfect spot to unwind.",
      photos: roomPhotos["Drift Suite"] ? [roomPhotos["Drift Suite"]] : [],
      pricePerNight: 33800,
      capacity: 2,
      bedType: "Double",
      roomAmenities: ["Sea view", "Garden view", "Terrace", "Shower only"],
      isAvailable: true,
      quantity: 1,
    },
  ];

  const doc = {
    _type: "listing",
    title: "Maya Kobe",
    slug: { _type: "slug", current: "maya-kobe" },
    type: "stay",
    subcategory: "boutique_hotel",
    status: "published",
    city: "Kilifi",
    county: "Kilifi",
    address: "Bofa Road, Kilifi, Kenya",
    rentingType: "by_room",
    maxGuests: 12,
    bookingType: "contact_form",
    hostName: "TribalSand",
    photos: heroImg ? [{ ...heroImg, alt: "Maya Kobe beachfront pool and ocean view" }] : [],
    amenities: [
      "WiFi", "Pool", "Security", "Sea View", "Garden", "Pet Friendly",
    ],
    tags: [
      "beachfront", "pool", "garden", "spa", "breakfast-included",
      "adults-only", "design", "eco",
    ],
    highlights: [
      { emoji: "🏖️", title: "Beachfront", description: "Direct access to Bofa Beach on the Indian Ocean" },
      { emoji: "🏊", title: "20m Pool", description: "Beachfront swimming pool with ocean views" },
      { emoji: "🍳", title: "Breakfast Included", description: "All rates include breakfast by in-house chefs" },
      { emoji: "💆", title: "Beach Massage", description: "Private beachfront massage huts" },
      { emoji: "🌿", title: "10 Acre Estate", description: "Lush tropical gardens on a sprawling property" },
      { emoji: "🛡️", title: "24hr Security", description: "Round-the-clock security for your peace of mind" },
    ],
    rooms,
    notificationEmail1: "klickenya@gmail.com",
  };

  if (existing) {
    console.log(`  ♻️  Updating existing listing ${existing}...`);
    await client.patch(existing).set(doc).commit();
    console.log(`  ✅ Updated Maya Kobe (${existing})`);
  } else {
    const created = await client.create(doc);
    console.log(`  ✅ Created Maya Kobe (${created._id})`);
  }

  console.log("\n🎉 Done!");
}

main().catch(console.error);
