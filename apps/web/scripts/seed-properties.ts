import { createClient } from "next-sanity";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "b9zd8u9f",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
});

const PROPERTIES = [
  {
    _id: "property-kilimani-3br",
    _type: "property",
    title: "3 Bedroom Apartment, Kilimani",
    slug: { _type: "slug", current: "3-bed-apartment-kilimani" },
    listingCategory: "for-sale",
    propertyType: "apartment",
    price: 12500000,
    priceType: "total",
    bedrooms: 3,
    bathrooms: 2,
    sizeSqm: 145,
    city: "Nairobi",
    neighbourhood: "Kilimani",
    county: "Nairobi",
    description: [
      {
        _type: "block",
        _key: "d1",
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: "s1",
            text: "Spacious 3-bedroom apartment in the heart of Kilimani. Modern finishes, DSQ, 2 parking bays, 24hr security. Walking distance to Junction Mall.",
            marks: [],
          },
        ],
      },
    ],
    features: ["Parking", "Guard/Security", "Lift/Elevator"],
    status: "available",
    isFeatured: true,
  },
  {
    _id: "property-karen-4br-villa",
    _type: "property",
    title: "4 Bedroom Villa, Karen",
    slug: { _type: "slug", current: "4-bed-villa-karen" },
    listingCategory: "for-sale",
    propertyType: "villa",
    price: 45000000,
    priceType: "total",
    bedrooms: 4,
    bathrooms: 4,
    sizeSqm: 380,
    city: "Nairobi",
    neighbourhood: "Karen",
    county: "Nairobi",
    description: [
      {
        _type: "block",
        _key: "d2",
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: "s2",
            text: "Stunning 4-bedroom villa on 1-acre plot in Karen. Swimming pool, large garden, staff quarters, 3 car garage. Quiet cul-de-sac location.",
            marks: [],
          },
        ],
      },
    ],
    features: ["Pool", "Garden", "Parking", "Guard/Security", "Servant Quarters"],
    status: "available",
    isFeatured: true,
  },
  {
    _id: "property-westlands-2br-rent",
    _type: "property",
    title: "2 Bedroom Apartment For Rent, Westlands",
    slug: { _type: "slug", current: "2-bed-apartment-westlands-rent" },
    listingCategory: "for-rent",
    propertyType: "apartment",
    price: 75000,
    priceType: "per-month",
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 95,
    city: "Nairobi",
    neighbourhood: "Westlands",
    county: "Nairobi",
    description: [
      {
        _type: "block",
        _key: "d3",
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: "s3",
            text: "Modern 2-bedroom apartment in Westlands. Fully furnished option available. Gym, rooftop pool, concierge. 5 mins walk to Sarit Centre.",
            marks: [],
          },
        ],
      },
    ],
    features: ["Gym", "Pool", "Parking", "Guard/Security", "Lift/Elevator"],
    status: "available",
    isFeatured: true,
  },
];

async function main() {
  console.log("🏠 Seeding 3 sample properties...\n");

  for (const prop of PROPERTIES) {
    try {
      await client.createOrReplace(prop);
      console.log(`  ✅ ${prop.title}`);
    } catch (err) {
      console.error(`  ❌ ${prop.title}:`, err);
    }
  }

  console.log("\n✅ Done. Properties should now appear on /real-estate");
}

main().catch(console.error);
