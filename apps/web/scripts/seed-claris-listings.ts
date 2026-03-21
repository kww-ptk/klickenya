import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

function key() {
  return Math.random().toString(36).slice(2, 12)
}

function textBlock(text: string, style: string = 'normal'): any {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }
}

async function uploadImageFromUrl(url: string, filename: string): Promise<any> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const asset = await client.assets.upload('image', buffer, { filename })
    return {
      _type: 'image',
      _key: key(),
      asset: { _type: 'reference', _ref: asset._id },
      alt: filename.replace(/[-_]/g, ' ').replace(/\.\w+$/, ''),
    }
  } catch (e) {
    console.warn(`⚠ Failed to upload ${filename}:`, e)
    return null
  }
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/* ═══════════════════════════════════════════
   STAYS — Claris African Experience Villas
   ═══════════════════════════════════════════ */

interface StayData {
  title: string
  description: string
  bedrooms: number
  bathrooms: number
  guests: number
  location: string
  amenities: string[]
  imageUrl: string
  subcategory: 'villa' | 'private_room' | 'boutique_hotel'
  tags: string[]
}

const stays: StayData[] = [
  // Batch 1 (1-12)
  {
    title: "Twiga House",
    description: "Twiga House is a spacious and stylish villa just 2 minutes from Watamu Beach. With 5 bedrooms, a private pool, full staff, and modern comforts, it's perfect for a relaxing group getaway.",
    bedrooms: 5, bathrooms: 6, guests: 10,
    location: "Peponi Road, Watamu",
    amenities: ["Air Conditioning", "Kitchen", "Pool", "WiFi", "Parking", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Twiga+House+exterior-2880w.jpeg",
    subcategory: "villa",
    tags: ["beachfront", "pool", "family", "garden", "pet-friendly"],
  },
  {
    title: "LakeSide House",
    description: "Lakeside House is a stylish lakeside villa for 4 guests with 2 bedrooms, 2 beds, and 3 baths, offering a pool, WiFi, air conditioning, free parking, and pet-friendly stays.",
    bedrooms: 2, bathrooms: 3, guests: 4,
    location: "Turtle Bay Road, Watamu",
    amenities: ["Air Conditioning", "Kitchen", "Pool", "WiFi", "Parking", "Pet Friendly"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/lakeside+exterior-2880w.jpeg",
    subcategory: "villa",
    tags: ["pool", "pet-friendly", "garden"],
  },
  {
    title: "White House Watamu",
    description: "3-bedroom villa with a private pool, 50m from the beach. Features modern amenities, daily cleaning, outdoor dining, and serene views.",
    bedrooms: 3, bathrooms: 4, guests: 6,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Kitchen", "Pool", "WiFi", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/White+House+KlicKenya-14b609f1-2880w.webp",
    subcategory: "villa",
    tags: ["beachfront", "pool", "garden"],
  },
  {
    title: "Jiwe Leupe",
    description: "Steps from the beach, this villa blends African charm with modern comforts. Enjoy a private chef, daily housekeeping, a generator, and a shared pool.",
    bedrooms: 3, bathrooms: 3, guests: 7,
    location: "Turtle Bay Road, Watamu",
    amenities: ["Generator", "Pool", "Parking", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Jiwe+Leupe+KlicKenya-50947014-2880w.webp",
    subcategory: "villa",
    tags: ["pool", "garden", "gated"],
  },
  {
    title: "Serenity Apartment",
    description: "A chic beachfront escape with a shared pool, WiFi, and A/C. Relax on the patio and enjoy the stunning Watamu views.",
    bedrooms: 2, bathrooms: 2, guests: 4,
    location: "Fortamu Road, Watamu",
    amenities: ["Air Conditioning", "Generator", "Pool", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Serenity-Main-2880w.jpg",
    subcategory: "villa",
    tags: ["beachfront", "pool"],
  },
  {
    title: "Watamu Paradise",
    description: "A spacious beachfront villa with a pool, ocean views, and a private garden. Relax, unwind, and enjoy the perfect seaside escape.",
    bedrooms: 4, bathrooms: 4, guests: 9,
    location: "Jacaranda Road, Watamu",
    amenities: ["Kitchen", "Pool", "Parking", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/watamu+paradise+exterior-2880w.webp",
    subcategory: "villa",
    tags: ["beachfront", "pool", "garden", "family"],
  },
  {
    title: "Dany House",
    description: "A 3-bedroom villa for 7 guests with a shared swimming pool, daily housekeeping, a fully equipped kitchen, and modern comforts.",
    bedrooms: 3, bathrooms: 2, guests: 7,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Generator", "Kitchen", "Pool", "Parking", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/danyhouse-2880w.jpg",
    subcategory: "villa",
    tags: ["pool", "garden"],
  },
  {
    title: "Luxury Under The African Sky",
    description: "Escape to this spacious 3-bedroom villa in Watamu, only 8 minutes from the beach. Enjoy a private pool, lush outdoors, and modern amenities like WiFi and air conditioning.",
    bedrooms: 3, bathrooms: 3, guests: 6,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Parking", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/863971f0-df28-45a4-ac74-8faadb770bfd-2880w.jpg",
    subcategory: "villa",
    tags: ["pool", "garden"],
  },
  {
    title: "Due Passi dal Mare",
    description: "Just 50m from the sea! This 2-bedroom villa near Watamu Beach offers a pool, WiFi, a full kitchen, and beach access — perfect for a relaxing coastal getaway.",
    bedrooms: 2, bathrooms: 2, guests: 4,
    location: "New Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/duepassidelmare-2880w.jpg",
    subcategory: "villa",
    tags: ["beachfront", "pool"],
  },
  {
    title: "MoonGem on the Beach",
    description: "A stylish 3-bedroom villa on the beachfront with a shared pool, chef, and modern comforts. Perfect for families or groups seeking relaxation.",
    bedrooms: 3, bathrooms: 3, guests: 6,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Parking"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/MoonGem+on+the+beach-2880w.jpg",
    subcategory: "villa",
    tags: ["beachfront", "pool", "family"],
  },
  {
    title: "Ocean View Apartment",
    description: "Just 50m from Watamu Beach! This stylish 2-bedroom retreat offers a pool, WiFi, a full kitchen, and a private balcony — perfect for couples and families.",
    bedrooms: 2, bathrooms: 2, guests: 4,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Sea View"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Ocean+view+pool+profile+picture-2880w.jpeg",
    subcategory: "villa",
    tags: ["beachfront", "pool"],
  },
  {
    title: "Mya House",
    description: "A peaceful 2-bedroom retreat just steps from the sea. Ideal for couples or small families with a private pool, WiFi, and kitchen.",
    bedrooms: 2, bathrooms: 2, guests: 4,
    location: "Jacaranda Road, Watamu",
    amenities: ["Pool", "WiFi", "Kitchen", "Parking"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Mya+House+exterior-2880w.jpg",
    subcategory: "villa",
    tags: ["pool", "garden"],
  },
  // Batch 2 (13-24) — scraped data
  {
    title: "Villa Josephine",
    description: "Villa Josephine is a beautiful 4-bedroom villa ideal for families seeking a luxurious beach escape. Situated in Garoda, 10 minutes from Watamu Marine National Park, it features spacious areas, a private pool, excellent staff, and 5-star check-in.",
    bedrooms: 4, bathrooms: 5, guests: 8,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen", "Parking", "Pet Friendly", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Villa+Josephine+exterior-2880w.jpg",
    subcategory: "villa",
    tags: ["beachfront", "pool", "family", "pet-friendly"],
  },
  {
    title: "Cristal House",
    description: "Cristal House is a serene retreat 700m from Ocean Breeze Beach, offering spacious rooms in a beautiful villa. Enjoy a pool, personal chef, and clean shared spaces in Watamu.",
    bedrooms: 4, bathrooms: 4, guests: 8,
    location: "Jacaranda Road, Watamu",
    amenities: ["Pool", "WiFi", "Parking", "Pet Friendly", "Kitchen"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Cristal+House+exterior-2880w.jpg",
    subcategory: "villa",
    tags: ["pool", "garden", "pet-friendly"],
  },
  {
    title: "Villa Jupiter",
    description: "Villa Jupiter is a beautiful 5-bedroom villa ideal for groups, featuring spacious interiors, en-suite bathrooms, and a poolside dining area. Located a 10-minute walk from Watamu Beach and the town center.",
    bedrooms: 5, bathrooms: 5, guests: 10,
    location: "Peponi Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen", "Parking", "Garden"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Villa-Jupiter-exterior-2880w.jpg",
    subcategory: "villa",
    tags: ["pool", "garden", "family"],
  },
  {
    title: "Baobab on the Sand",
    description: "Baobab on the Sand is a stunning beachfront apartment in Watamu, set in a peaceful area. With 3 bedrooms, 3 baths, it's ideal for families or groups looking for a direct beach experience.",
    bedrooms: 3, bathrooms: 3, guests: 6,
    location: "Fortamu Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen", "Parking", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/baobab+exterior-2880w.jpg",
    subcategory: "villa",
    tags: ["beachfront", "pool", "family"],
  },
  {
    title: "Oasis Apartment",
    description: "Escape to Oasis Apartment, a serene retreat near Ocean Breeze Beach. This 3-bedroom, 3-bathroom getaway features a private pool, air conditioning, and a fully equipped kitchen.",
    bedrooms: 3, bathrooms: 3, guests: 6,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen", "Parking", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/oasis-71b1e66f-2880w.jpeg",
    subcategory: "villa",
    tags: ["pool", "garden"],
  },
  {
    title: "Paradise Apartment",
    description: "Paradise Apartment is a stylish 2-bedroom, 2-bathroom retreat just 300m from the sea. Located on the first floor of a secure compound, it features a saltwater pool, private sun loungers, and 24/7 security.",
    bedrooms: 2, bathrooms: 2, guests: 5,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen", "Parking", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/paradise+outside-2880w.jpeg",
    subcategory: "villa",
    tags: ["pool", "gated"],
  },
  {
    title: "Villa Vittoria",
    description: "Experience tranquility at Villa Vittoria, a beautifully designed 3-bedroom retreat near Garoda Beach. This villa features a private saltwater pool, outdoor kitchen, and a chef for delicious meals.",
    bedrooms: 3, bathrooms: 3, guests: 7,
    location: "Turtle Bay Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen", "Parking", "Garden"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Villa+Vittoria+exterior-2880w.jpg",
    subcategory: "villa",
    tags: ["pool", "garden"],
  },
  {
    title: "Elephant Apartment",
    description: "Escape to Elephant Apartment, a serene beachside getaway. This stylish apartment accommodates up to 4 guests and features WiFi, air conditioning, a fully stocked kitchen, and a refreshing pool.",
    bedrooms: 1, bathrooms: 1, guests: 4,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen", "Parking", "Security"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Elephant+Apartment15-2880w.jpeg",
    subcategory: "villa",
    tags: ["pool", "beachfront"],
  },
  {
    title: "Mercury House",
    description: "Welcome to Mercury House, a 3-bedroom retreat in Peponi, perfect for up to 6 guests. Enjoy a private pool, WiFi, a dedicated workspace, and a fully equipped kitchen for a comfortable stay.",
    bedrooms: 3, bathrooms: 3, guests: 6,
    location: "Turtle Bay Road, Watamu",
    amenities: ["Pool", "WiFi", "Kitchen", "Parking"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/a91a3761-8b80-45dd-9e91-d0babed39098-2880w.webp",
    subcategory: "villa",
    tags: ["pool", "family"],
  },
  {
    title: "White Bay House",
    description: "White Bay House is a beachfront retreat with 5 bedrooms and 6 bathrooms for up to 10 guests. It features a pool, outdoor dining with BBQ, and direct beach access.",
    bedrooms: 5, bathrooms: 6, guests: 10,
    location: "Jacaranda Road, Watamu",
    amenities: ["Pool", "WiFi", "Kitchen", "Parking"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/IMG-20250324-WA0006-2880w.jpg",
    subcategory: "villa",
    tags: ["beachfront", "pool", "family"],
  },
  {
    title: "Dera Suite",
    description: "Discover Dera Suite, a stylish 2-bedroom apartment at Ghepard Towers in central Watamu. Ideal for up to 4 guests, this modern suite is just a short walk from the beach.",
    bedrooms: 2, bathrooms: 2, guests: 4,
    location: "New Road, Watamu",
    amenities: ["Pool", "WiFi", "Kitchen"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Dera+Suite+exterior-2880w.jpeg",
    subcategory: "villa",
    tags: ["pool"],
  },
  {
    title: "Sveva Suite",
    description: "Discover Sveva Suite, a contemporary 3-bedroom apartment at Ghepard Towers in the heart of Watamu. Ideal for up to 6 guests, it's a short stroll from the beach and town center.",
    bedrooms: 3, bathrooms: 3, guests: 6,
    location: "New Road, Watamu",
    amenities: ["Pool", "WiFi", "Kitchen"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Sveva+Suite+Exterior-2880w.jpeg",
    subcategory: "villa",
    tags: ["pool"],
  },
  // Batch 3 (25-36) — scraped data
  {
    title: "Pearl Apartment",
    description: "Stay at Pearl Apartment, a stylish 2-bedroom retreat just steps from the beach in Watamu. Enjoy pool access, a sea breeze, modern comforts, and proximity to the new Watamu Mall.",
    bedrooms: 2, bathrooms: 2, guests: 4,
    location: "New Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/pearl+apartment+exterior-1920w.jpeg",
    subcategory: "villa",
    tags: ["pool", "beachfront"],
  },
  {
    title: "Claris Apartment",
    description: "Stay at Claris Apartment, a peaceful 1-bedroom retreat for 2 in central Watamu. Just steps from the beach with pool access, WiFi, and a fully equipped kitchen.",
    bedrooms: 1, bathrooms: 1, guests: 2,
    location: "Peponi Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/claris+apartment+exterior-1920w.jpeg",
    subcategory: "villa",
    tags: ["pool"],
  },
  {
    title: "Blu Bay Apartment",
    description: "Blu Bay Apartment is a cozy 1-bedroom hideaway for 2 in central Watamu. Steps from the ocean, with beach access, WiFi, and modern amenities.",
    bedrooms: 1, bathrooms: 1, guests: 2,
    location: "Turtle Bay Road, Watamu",
    amenities: ["Air Conditioning", "WiFi", "Kitchen", "Parking"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Blu-Bay-Apartment-Aerial-1920w.jpg",
    subcategory: "villa",
    tags: ["beachfront"],
  },
  {
    title: "Bianca & Pietro's House",
    description: "Bianca & Pietro's House is a spacious 4-bedroom retreat for up to 10 guests, just steps from the beach in Watamu. Blending comfort with African charm, it features a pool, garden, and modern amenities.",
    bedrooms: 4, bathrooms: 5, guests: 10,
    location: "Garoda, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Parking", "Garden"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Bianca+-+Pietro-s+House+Main-1920w.jpeg",
    subcategory: "villa",
    tags: ["family", "garden", "pool", "beachfront"],
  },
  {
    title: "Coral View Apartment",
    description: "Coral View Apartment is a cozy 1-bedroom retreat in central Watamu. Ideal for couples or solo travelers, it offers pool access, WiFi, and proximity to the beach.",
    bedrooms: 1, bathrooms: 1, guests: 2,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Parking"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/watamu-coral-view-apartment-living-room-1920w.jpg",
    subcategory: "villa",
    tags: ["pool"],
  },
  {
    title: "Ocean Gate Apartment",
    description: "Ocean Gate Apartment is a cozy 1-bedroom retreat in central Watamu. Perfect for couples or solo travelers, it offers pool access, WiFi, and easy beach access.",
    bedrooms: 1, bathrooms: 1, guests: 2,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Ocean-Gate-Apartment-1920w.jpg",
    subcategory: "villa",
    tags: ["pool"],
  },
  {
    title: "Palm Breeze Apartment",
    description: "Palm Breeze Apartment is a cozy 1-bedroom retreat in central Watamu. Perfect for 2 guests, it offers pool access, WiFi, and easy beach access.",
    bedrooms: 1, bathrooms: 1, guests: 2,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Palm-Breeze-Apartment-pool-1920w.jpg",
    subcategory: "villa",
    tags: ["pool"],
  },
  {
    title: "Luma Kiboko",
    description: "Luma Kiboko is a spacious 3-bedroom home in central Watamu, perfect for families or friends. Enjoy WiFi, pool access, and a peaceful retreat near the beach.",
    bedrooms: 3, bathrooms: 3, guests: 6,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Pet Friendly", "Parking"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Luma-Kiboko-house-and-pool-1920w.jpg",
    subcategory: "villa",
    tags: ["pool", "family", "pet-friendly"],
  },
  {
    title: "Love Nest Apartment",
    description: "Enjoy a cozy stay at Love Nest Apartment, a modern one-bedroom retreat in central Watamu. Relax with pool access, WiFi, and proximity to the beach.",
    bedrooms: 1, bathrooms: 1, guests: 2,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Parking"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Love+Nest+Apartment+Aerial+View-1920w.jpeg",
    subcategory: "villa",
    tags: ["pool"],
  },
  {
    title: "Villa Samsara",
    description: "Relax at Villa Samsara, an elegant 4-bedroom beachfront villa in Jacaranda. Enjoy a private beach, pool, and luxury amenities for up to 8 guests.",
    bedrooms: 4, bathrooms: 4, guests: 8,
    location: "Jacaranda Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen", "Parking", "Garden"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Villa+Samsara+Exterior+2-1920w.jpeg",
    subcategory: "villa",
    tags: ["pool", "garden", "beachfront", "family"],
  },
  {
    title: "Out Of Africa",
    description: "Out Of Africa is an elegant 5-bedroom villa located in the heart of Watamu, just steps from the beach. Blending African-inspired luxury with modern comforts for up to 10 guests.",
    bedrooms: 5, bathrooms: 5, guests: 10,
    location: "Peponi Road, Watamu",
    amenities: ["Air Conditioning", "Pool", "WiFi", "Kitchen", "Parking"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Out+Of+Africa+pool-1920w.jpeg",
    subcategory: "villa",
    tags: ["pool", "garden", "family"],
  },
  {
    title: "Villa Anna",
    description: "Villa Anna is a peaceful 3-bedroom villa located in a quiet and secure area of Watamu, just a short walk from the beach. Designed for relaxation with a private pool and garden.",
    bedrooms: 3, bathrooms: 3, guests: 6,
    location: "Watamu, Kenya",
    amenities: ["Pool", "WiFi", "Kitchen", "Parking", "Garden"],
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Villa+Anna+Pool+and+House-1920w.jpeg",
    subcategory: "villa",
    tags: ["pool", "garden"],
  },
]

/* ═══════════════════════════════════════════
   EXPERIENCES
   ═══════════════════════════════════════════ */

interface ExpData {
  title: string
  description: string
  imageUrl: string
  subcategory: string
  tags: string[]
  duration?: string
}

const experiences: ExpData[] = [
  {
    title: "Safari Blue Watamu",
    description: "A full-day marine excursion offering snorkeling, dolphin watching, island visits with seafood feasts, mangrove tours, and cultural experiences along Kenya's stunning Watamu coastline.",
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/IMG-20250214-WA0034-2880w.jpg",
    subcategory: "outdoor",
    tags: ["snorkelling", "boat-safari", "swimming", "diving"],
    duration: "6-8 hours",
  },
  {
    title: "Quad Adventure in Watamu",
    description: "An exciting quad bike ride through forests, villages, and the Galana River, ending with a stunning sunset aperitif at the elephant pool in Arabuko Sokoke Forest.",
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/pexels-photo-26568790-706e5771-2880w.jpeg",
    subcategory: "outdoor",
    tags: ["cycling", "hiking", "outdoor"],
    duration: "3.5 hours",
  },
  {
    title: "Wildlife and Safari Experiences",
    description: "Tailor-made excursions from Watamu blending coastal marine adventures with Kenya's iconic wildlife destinations including Tsavo, Amboseli, and Maasai Mara.",
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/IMG-20241109-WA0006-2880w.jpg",
    subcategory: "safari",
    tags: ["boat-safari", "walking", "birding", "fly-in"],
    duration: "Full day / multi-day",
  },
  {
    title: "Rock and Sea Watamu",
    description: "A luxury romantic experience on a private island accessible by boat from Lighthouse Beach. Choose from couples packages including dinner, overnight stays in bubble suites, and dhow cruises.",
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/Rock_and_Sea_Watamu_Claris_African_Experience_5-2880w.jpg",
    subcategory: "wellness",
    tags: ["retreat", "fine-dining", "adults-only"],
    duration: "Full day or overnight",
  },
]

/* ═══════════════════════════════════════════
   RESTAURANT
   ═══════════════════════════════════════════ */

interface RestData {
  title: string
  description: string
  imageUrl: string
  tags: string[]
  openingHours: string
  priceRange: string
  cuisine: string[]
}

const restaurants: RestData[] = [
  {
    title: "Napul'è Restaurant",
    description: "A relaxed beachside restaurant on Aquarius Beach blending authentic Italian flavours with Kenya's coastal seafood. Fresh dishes, cool sea breeze, and a welcoming atmosphere from morning till evening.",
    imageUrl: "https://lirp.cdn-website.com/0f24726d/dms3rep/multi/opt/pexels-photo-3649208-2880w.jpeg",
    tags: ["fine-dining", "beachfront", "family"],
    openingHours: "Open daily: 09:00 - 21:00",
    priceRange: "mid-range",
    cuisine: ["Italian", "Seafood", "Mediterranean"],
  },
]

/* ═══════════════════════════════════════════
   MAIN SEEDER
   ═══════════════════════════════════════════ */

async function seed() {
  console.log('🌱 Starting Claris African Experience listings seed...\n')

  let created = 0, skipped = 0, failed = 0

  // --- STAYS ---
  console.log(`\n🏠 Seeding ${stays.length} stays...`)
  for (const s of stays) {
    const slug = slugify(s.title)
    // Check if already exists
    const exists = await client.fetch(
      `count(*[_type == "listing" && slug.current == $slug])`,
      { slug }
    )
    if (exists > 0) {
      console.log(`  ⏭ ${s.title} (already exists)`)
      skipped++
      continue
    }

    try {
      // Upload image
      const img = await uploadImageFromUrl(s.imageUrl, `${slug}.jpg`)

      await client.create({
        _type: 'listing',
        title: s.title,
        slug: { _type: 'slug', current: slug },
        type: 'stay',
        subcategory: s.subcategory,
        status: 'published',
        city: 'Watamu',
        county: 'Kilifi',
        address: s.location,
        description: [
          textBlock(s.title, 'h2'),
          textBlock(s.description),
        ],
        tags: s.tags,
        amenities: s.amenities,
        maxGuests: s.guests,
        highlights: [
          { _key: key(), emoji: '🛏️', title: `${s.bedrooms} Bedrooms`, description: `Sleeps up to ${s.guests} guests` },
          { _key: key(), emoji: '🚿', title: `${s.bathrooms} Bathrooms`, description: 'En-suite bathrooms' },
          { _key: key(), emoji: '👨‍🍳', title: 'Private Chef', description: 'Professional chef available' },
          { _key: key(), emoji: '🧹', title: 'Daily Cleaning', description: 'Housekeeping included' },
        ],
        hostName: 'Claris African Experience',
        ...(img ? { photos: [img] } : {}),
        notificationEmail1: 'clarisafricanexperience@gmail.com',
        seoTitle: `${s.title} — Watamu Villa Rental | Klickenya`,
        seoDescription: s.description.slice(0, 160),
      })
      console.log(`  ✅ ${s.title}`)
      created++
    } catch (e: any) {
      console.error(`  ❌ ${s.title}: ${e.message}`)
      failed++
    }
  }

  // --- EXPERIENCES ---
  console.log(`\n🧭 Seeding ${experiences.length} experiences...`)
  for (const exp of experiences) {
    const slug = slugify(exp.title)
    const exists = await client.fetch(
      `count(*[_type == "listing" && slug.current == $slug])`,
      { slug }
    )
    if (exists > 0) {
      console.log(`  ⏭ ${exp.title} (already exists)`)
      skipped++
      continue
    }

    try {
      const img = await uploadImageFromUrl(exp.imageUrl, `${slug}.jpg`)

      await client.create({
        _type: 'listing',
        title: exp.title,
        slug: { _type: 'slug', current: slug },
        type: 'experience',
        subcategory: exp.subcategory,
        status: 'published',
        city: 'Watamu',
        county: 'Kilifi',
        address: 'Watamu, Kenya',
        description: [
          textBlock(exp.title, 'h2'),
          textBlock(exp.description),
        ],
        tags: exp.tags,
        amenities: [],
        highlights: [
          { _key: key(), emoji: '⏱️', title: 'Duration', description: exp.duration || 'Varies' },
          { _key: key(), emoji: '📍', title: 'Location', description: 'Watamu, Kenya' },
          { _key: key(), emoji: '🎒', title: 'What to Bring', description: 'Sunscreen, hat, comfortable clothes' },
          { _key: key(), emoji: '👥', title: 'Group Size', description: 'Small groups available' },
        ],
        hostName: 'Claris African Experience',
        ...(img ? { photos: [img] } : {}),
        duration: exp.duration,
        notificationEmail1: 'clarisafricanexperience@gmail.com',
        seoTitle: `${exp.title} — Watamu Experience | Klickenya`,
        seoDescription: exp.description.slice(0, 160),
      })
      console.log(`  ✅ ${exp.title}`)
      created++
    } catch (e: any) {
      console.error(`  ❌ ${exp.title}: ${e.message}`)
      failed++
    }
  }

  // --- RESTAURANT ---
  console.log(`\n🍽️ Seeding ${restaurants.length} restaurant(s)...`)
  for (const r of restaurants) {
    const slug = slugify(r.title)
    const exists = await client.fetch(
      `count(*[_type == "listing" && slug.current == $slug])`,
      { slug }
    )
    if (exists > 0) {
      console.log(`  ⏭ ${r.title} (already exists)`)
      skipped++
      continue
    }

    try {
      const img = await uploadImageFromUrl(r.imageUrl, `${slug}.jpg`)

      await client.create({
        _type: 'listing',
        title: r.title,
        slug: { _type: 'slug', current: slug },
        type: 'experience',
        subcategory: 'restaurants',
        status: 'published',
        city: 'Watamu',
        county: 'Kilifi',
        address: 'Aquarius Beach, Watamu',
        description: [
          textBlock(r.title, 'h2'),
          textBlock(r.description),
        ],
        tags: r.tags,
        amenities: ['Sea View'],
        highlights: [
          { _key: key(), emoji: '🍝', title: 'Italian Cuisine', description: 'Authentic Italian dishes with coastal seafood' },
          { _key: key(), emoji: '🏖️', title: 'Beachfront', description: 'Dining on Aquarius Beach' },
          { _key: key(), emoji: '🕐', title: 'Hours', description: r.openingHours },
          { _key: key(), emoji: '🎉', title: 'Special Offer', description: '10% off when booking through website' },
        ],
        hostName: 'Claris African Experience',
        openingHours: r.openingHours,
        priceRange: r.priceRange,
        cuisine: r.cuisine,
        ...(img ? { photos: [img] } : {}),
        notificationEmail1: 'clarisafricanexperience@gmail.com',
        seoTitle: `${r.title} — Watamu Beach Restaurant | Klickenya`,
        seoDescription: r.description.slice(0, 160),
      })
      console.log(`  ✅ ${r.title}`)
      created++
    } catch (e: any) {
      console.error(`  ❌ ${r.title}: ${e.message}`)
      failed++
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✅ Created: ${created}`)
  console.log(`⏭ Skipped: ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Total: ${created + skipped + failed}`)
}

seed().catch(console.error)
