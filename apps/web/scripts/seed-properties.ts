import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
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

/* ── Agents ─────────────────────────────────── */

const agents = [
  {
    displayName: 'Grace Muthoni',
    slug: 'grace-muthoni',
    agencyName: 'Heri Realty',
    isVerified: true,
    bio: 'Specialising in residential properties across Nairobi for over 8 years. EARB-licensed with a track record of successful closings in Kilimani, Lavington, and Westlands.',
    phone: '+254712345678',
    email: 'grace@herirealty.co.ke',
    specialisations: ['Residential', 'Luxury'],
    serviceAreas: ['Kilimani', 'Lavington', 'Westlands', 'Karen'],
    subscriptionTier: 'pro',
  },
  {
    displayName: 'James Otieno',
    slug: 'james-otieno',
    agencyName: 'Savannah Property Group',
    isVerified: true,
    bio: 'Commercial and land specialist covering Nairobi and the wider Central region. 12 years of experience helping investors find high-yield opportunities.',
    phone: '+254723456789',
    email: 'james@savannahpg.co.ke',
    specialisations: ['Commercial', 'Land'],
    serviceAreas: ['Upperhill', 'Westlands', 'Kiambu', 'Thika'],
    subscriptionTier: 'agency',
  },
  {
    displayName: 'Amina Hassan',
    slug: 'amina-hassan',
    agencyName: 'Pwani Properties',
    isVerified: true,
    bio: 'Mombasa-based agent specialising in coastal residential and holiday homes. Deep knowledge of Nyali, Bamburi, and Diani markets.',
    phone: '+254734567890',
    email: 'amina@pwaniprop.co.ke',
    specialisations: ['Residential', 'Luxury'],
    serviceAreas: ['Nyali', 'Bamburi', 'Diani', 'Kilifi'],
    subscriptionTier: 'pro',
  },
  {
    displayName: 'David Kamau',
    slug: 'david-kamau',
    agencyName: 'Metro Homes Kenya',
    isVerified: true,
    bio: 'New developments and off-plan specialist. Working with top developers to bring quality housing to the Nairobi market.',
    phone: '+254745678901',
    email: 'david@metrohomes.co.ke',
    specialisations: ['Off-plan / New Developments', 'Residential'],
    serviceAreas: ['Kilimani', 'Kileleshwa', 'Ruaka', 'Ruiru'],
    subscriptionTier: 'pro',
  },
]

/* ── Neighbourhoods ─────────────────────────── */

const neighbourhoods = [
  {
    name: 'Kilimani',
    slug: 'kilimani',
    city: 'Nairobi',
    county: 'Nairobi',
    tagline: 'The heartbeat of modern Nairobi living',
    avgPriceForSale: 18500000,
    avgPriceForRent: 95000,
  },
  {
    name: 'Westlands',
    slug: 'westlands',
    city: 'Nairobi',
    county: 'Nairobi',
    tagline: 'Business hub meets upscale living',
    avgPriceForSale: 22000000,
    avgPriceForRent: 120000,
  },
  {
    name: 'Karen',
    slug: 'karen',
    city: 'Nairobi',
    county: 'Nairobi',
    tagline: 'Leafy suburb with generous plots',
    avgPriceForSale: 65000000,
    avgPriceForRent: 250000,
  },
  {
    name: 'Nyali',
    slug: 'nyali',
    city: 'Mombasa',
    county: 'Mombasa',
    tagline: 'Coastal living at its finest',
    avgPriceForSale: 14000000,
    avgPriceForRent: 75000,
  },
]

/* ── Properties ─────────────────────────────── */

interface PropertyData {
  title: string
  slug: string
  listingCategory: 'for-sale' | 'for-rent' | 'land' | 'commercial'
  propertyType: string
  price: number
  priceType: 'total' | 'per-month'
  bedrooms?: number
  bathrooms?: number
  sizeSqm?: number
  landSizeAcres?: number
  yearBuilt?: number
  neighbourhood: string
  city: string
  county: string
  lat: number
  lng: number
  features: string[]
  description: any[]
  isFeatured: boolean
  isNewDevelopment: boolean
  previousPrice?: number
  completionPercentage?: number
  developerName?: string
  unitsAvailable?: number
  agentSlug: string
  seoTitle: string
  seoDescription: string
}

const properties: PropertyData[] = [
  // ── Featured: For Sale ────────────────────────
  {
    title: '3-Bedroom Apartment in Kilimani',
    slug: '3-bed-apartment-kilimani',
    listingCategory: 'for-sale',
    propertyType: 'apartment',
    price: 18500000,
    priceType: 'total',
    bedrooms: 3,
    bathrooms: 2,
    sizeSqm: 140,
    yearBuilt: 2023,
    neighbourhood: 'Kilimani',
    city: 'Nairobi',
    county: 'Nairobi',
    lat: -1.2897,
    lng: 36.7856,
    features: ['Gym', 'Guard/Security', 'Parking', 'Lift/Elevator', 'CCTV', 'Generator'],
    description: [
      textBlock('Modern 3-Bedroom Apartment in the Heart of Kilimani', 'h2'),
      textBlock('This stunning apartment sits on the 8th floor of a recently completed development, offering panoramic city views and premium finishes throughout. Open-plan living and dining area with floor-to-ceiling windows that flood the space with natural light.'),
      textBlock('The master bedroom features an en-suite bathroom with imported fittings and a walk-in closet. Two additional bedrooms share a well-appointed family bathroom. The kitchen is fully fitted with stone countertops, soft-close cabinetry, and integrated appliances.'),
      textBlock('Amenities & Security', 'h3'),
      textBlock('The building offers 24/7 security with CCTV coverage, a fully equipped gym, backup generator, high-speed lifts, and two dedicated parking bays. Walking distance to Yaya Centre, Java House, and multiple international schools.'),
    ],
    isFeatured: true,
    isNewDevelopment: false,
    agentSlug: 'grace-muthoni',
    seoTitle: '3-Bed Apartment for Sale in Kilimani | KSh 18.5M',
    seoDescription: 'Modern 3-bedroom apartment in Kilimani, Nairobi. 140sqm, 8th floor, city views, gym, parking. KSh 18,500,000.',
  },
  {
    title: '5-Bedroom Villa in Karen',
    slug: '5-bed-villa-karen',
    listingCategory: 'for-sale',
    propertyType: 'villa',
    price: 85000000,
    priceType: 'total',
    bedrooms: 5,
    bathrooms: 4,
    sizeSqm: 450,
    landSizeAcres: 0.5,
    yearBuilt: 2021,
    neighbourhood: 'Karen',
    city: 'Nairobi',
    county: 'Nairobi',
    lat: -1.3226,
    lng: 36.7114,
    features: ['Pool', 'Garden', 'Guard/Security', 'Servant Quarters', 'Borehole', 'CCTV', 'Gated Community', 'Parking'],
    description: [
      textBlock('Luxurious 5-Bedroom Villa on Half an Acre in Karen', 'h2'),
      textBlock('An exceptional family home set within a prestigious gated community in the heart of Karen. This architect-designed villa blends contemporary design with warm natural materials, creating a home that is both grand and inviting.'),
      textBlock('The ground floor features a spacious lounge opening onto a covered terrace and manicured garden with a heated swimming pool. The gourmet kitchen includes a breakfast island, butler\'s pantry, and premium European appliances. A separate staff wing with servant quarters ensures privacy for the household.'),
      textBlock('Upstairs, the master suite spans the full width of the home with a private balcony overlooking the garden. Four additional bedrooms each have en-suite bathrooms. The property includes a home office, wine cellar, and a double garage.'),
    ],
    isFeatured: true,
    isNewDevelopment: false,
    previousPrice: 92000000,
    agentSlug: 'grace-muthoni',
    seoTitle: '5-Bed Villa for Sale in Karen | KSh 85M',
    seoDescription: 'Luxury 5-bedroom villa in Karen, Nairobi. 450sqm on half acre, pool, garden, gated community. Reduced from KSh 92M to KSh 85M.',
  },
  {
    title: 'Studio Apartment in Westlands',
    slug: 'studio-apartment-westlands',
    listingCategory: 'for-sale',
    propertyType: 'studio',
    price: 6800000,
    priceType: 'total',
    bedrooms: 0,
    bathrooms: 1,
    sizeSqm: 42,
    yearBuilt: 2024,
    neighbourhood: 'Westlands',
    city: 'Nairobi',
    county: 'Nairobi',
    lat: -1.2674,
    lng: 36.8118,
    features: ['Gym', 'Lift/Elevator', 'CCTV', 'Guard/Security', 'Parking'],
    description: [
      textBlock('Smart Studio Apartment in Westlands', 'h2'),
      textBlock('A brand-new studio apartment in one of Westlands\' most sought-after developments. Ideal for young professionals or as an investment property with strong rental demand in the area.'),
      textBlock('The open-plan layout maximises every square metre with a fitted kitchen, sleeping area, and a modern bathroom with rain shower. Floor-to-ceiling windows provide excellent natural light and city views.'),
    ],
    isFeatured: true,
    isNewDevelopment: false,
    agentSlug: 'james-otieno',
    seoTitle: 'Studio for Sale in Westlands | KSh 6.8M',
    seoDescription: 'New studio apartment in Westlands, Nairobi. 42sqm, gym, parking, city views. KSh 6,800,000.',
  },

  // ── Featured: For Rent ────────────────────────
  {
    title: '2-Bedroom Furnished Apartment in Kilimani',
    slug: '2-bed-furnished-kilimani',
    listingCategory: 'for-rent',
    propertyType: 'apartment',
    price: 95000,
    priceType: 'per-month',
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 100,
    yearBuilt: 2022,
    neighbourhood: 'Kilimani',
    city: 'Nairobi',
    county: 'Nairobi',
    lat: -1.2921,
    lng: 36.7841,
    features: ['Gym', 'Pool', 'Guard/Security', 'Parking', 'Lift/Elevator', 'Generator'],
    description: [
      textBlock('Fully Furnished 2-Bedroom in Kilimani', 'h2'),
      textBlock('A beautifully furnished apartment available for immediate move-in. Tastefully decorated with modern furniture, smart TV, high-speed internet, and a fully equipped kitchen. The building features a rooftop pool, gym, and 24/7 security.'),
      textBlock('Located on a quiet street just minutes from Argwings Kodhek Road. Walking distance to restaurants, supermarkets, and the Kilimani business district.'),
    ],
    isFeatured: true,
    isNewDevelopment: false,
    agentSlug: 'grace-muthoni',
    seoTitle: '2-Bed Furnished Apartment for Rent in Kilimani | KSh 95K/mo',
    seoDescription: 'Furnished 2-bedroom apartment in Kilimani, Nairobi. Pool, gym, parking. KSh 95,000 per month.',
  },
  {
    title: '4-Bedroom Townhouse in Lavington',
    slug: '4-bed-townhouse-lavington',
    listingCategory: 'for-rent',
    propertyType: 'townhouse',
    price: 180000,
    priceType: 'per-month',
    bedrooms: 4,
    bathrooms: 3,
    sizeSqm: 280,
    yearBuilt: 2020,
    neighbourhood: 'Lavington',
    city: 'Nairobi',
    county: 'Nairobi',
    lat: -1.2812,
    lng: 36.7678,
    features: ['Garden', 'Guard/Security', 'Parking', 'Servant Quarters', 'Borehole', 'CCTV'],
    description: [
      textBlock('Spacious 4-Bedroom Townhouse in Lavington', 'h2'),
      textBlock('A family-sized townhouse in a secure compound of only six units. The home features a large living room, separate dining area, and a modern kitchen with pantry. A private garden with mature trees provides a tranquil outdoor space for children and entertaining.'),
      textBlock('All bedrooms are on the upper level with the master featuring a walk-in closet and en-suite. Separate staff quarters and a laundry room complete the home. Two parking spaces included.'),
    ],
    isFeatured: true,
    isNewDevelopment: false,
    agentSlug: 'grace-muthoni',
    seoTitle: '4-Bed Townhouse for Rent in Lavington | KSh 180K/mo',
    seoDescription: '4-bedroom townhouse in Lavington, Nairobi. Garden, SQ, parking. KSh 180,000 per month.',
  },

  // ── Featured: Coastal ─────────────────────────
  {
    title: '3-Bedroom Penthouse in Nyali',
    slug: '3-bed-penthouse-nyali',
    listingCategory: 'for-sale',
    propertyType: 'apartment',
    price: 25000000,
    priceType: 'total',
    bedrooms: 3,
    bathrooms: 3,
    sizeSqm: 200,
    yearBuilt: 2023,
    neighbourhood: 'Nyali',
    city: 'Mombasa',
    county: 'Mombasa',
    lat: -4.0273,
    lng: 39.7098,
    features: ['Pool', 'Sea View', 'Rooftop', 'Lift/Elevator', 'Guard/Security', 'Parking', 'Generator'],
    description: [
      textBlock('Stunning Penthouse with Indian Ocean Views in Nyali', 'h2'),
      textBlock('A rare penthouse opportunity on the Nyali beachfront. This top-floor residence features wrap-around terraces with unobstructed ocean views, a private rooftop with plunge pool, and premium finishes throughout.'),
      textBlock('The open-plan living space flows onto a generous terrace — perfect for entertaining with sunset views over the Indian Ocean. Three spacious bedrooms each have en-suite bathrooms and ocean or garden views.'),
    ],
    isFeatured: true,
    isNewDevelopment: false,
    agentSlug: 'amina-hassan',
    seoTitle: '3-Bed Penthouse for Sale in Nyali | KSh 25M',
    seoDescription: 'Beachfront penthouse in Nyali, Mombasa. 200sqm, ocean views, rooftop pool. KSh 25,000,000.',
  },

  // ── New Development ───────────────────────────
  {
    title: 'The Canopy Residences — Kileleshwa',
    slug: 'canopy-residences-kileleshwa',
    listingCategory: 'for-sale',
    propertyType: 'apartment',
    price: 12500000,
    priceType: 'total',
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 110,
    neighbourhood: 'Kileleshwa',
    city: 'Nairobi',
    county: 'Nairobi',
    lat: -1.2788,
    lng: 36.7799,
    features: ['Pool', 'Gym', 'Lift/Elevator', 'Guard/Security', 'CCTV', 'Generator', 'Garden', 'Parking'],
    description: [
      textBlock('The Canopy Residences — Premium Off-Plan in Kileleshwa', 'h2'),
      textBlock('A thoughtfully designed mixed-use development by Metro Homes offering 2 and 3-bedroom apartments with ground-floor retail. Expected completion Q4 2026. Early buyers benefit from pre-launch pricing with flexible payment plans — 20% deposit with 18-month instalments.'),
      textBlock('Each unit features floor-to-ceiling windows, engineered hardwood flooring, Bosch kitchen appliances, and smart home pre-wiring. The development includes a rooftop infinity pool, co-working lounge, electric vehicle charging, and landscaped courtyards.'),
    ],
    isFeatured: false,
    isNewDevelopment: true,
    completionPercentage: 35,
    developerName: 'Metro Homes Kenya',
    unitsAvailable: 24,
    agentSlug: 'david-kamau',
    seoTitle: 'The Canopy Residences Kileleshwa | From KSh 12.5M',
    seoDescription: 'Off-plan apartments in Kileleshwa, Nairobi. 2 & 3 bed from KSh 12.5M. Pool, gym, smart home. 35% complete.',
  },
  {
    title: 'Sunrise Gardens — Ruaka',
    slug: 'sunrise-gardens-ruaka',
    listingCategory: 'for-sale',
    propertyType: 'apartment',
    price: 7200000,
    priceType: 'total',
    bedrooms: 2,
    bathrooms: 1,
    sizeSqm: 80,
    neighbourhood: 'Ruaka',
    city: 'Nairobi',
    county: 'Kiambu',
    lat: -1.2071,
    lng: 36.7802,
    features: ['Guard/Security', 'Parking', 'CCTV', 'Borehole', 'Generator'],
    description: [
      textBlock('Sunrise Gardens — Affordable Off-Plan in Ruaka', 'h2'),
      textBlock('An affordable entry into the Nairobi property market. Sunrise Gardens offers 1 and 2-bedroom apartments in a fast-growing satellite town with excellent rental yields. Completion expected Q2 2027.'),
      textBlock('Units feature open-plan layouts, fitted kitchens, and private balconies. The development is located 500m from Ruaka Town along the Northern Bypass with easy access to Westlands and the CBD.'),
    ],
    isFeatured: false,
    isNewDevelopment: true,
    completionPercentage: 15,
    developerName: 'Sunrise Developers',
    unitsAvailable: 48,
    agentSlug: 'david-kamau',
    seoTitle: 'Sunrise Gardens Ruaka | From KSh 7.2M',
    seoDescription: 'Off-plan apartments in Ruaka from KSh 7.2M. 1 & 2 bed, parking, security. 15% complete.',
  },

  // ── Land ──────────────────────────────────────
  {
    title: 'Quarter Acre Plot in Karen',
    slug: 'quarter-acre-karen',
    listingCategory: 'land',
    propertyType: 'land',
    price: 35000000,
    priceType: 'total',
    landSizeAcres: 0.25,
    neighbourhood: 'Karen',
    city: 'Nairobi',
    county: 'Nairobi',
    lat: -1.3301,
    lng: 36.7212,
    features: ['Gated Community'],
    description: [
      textBlock('Prime Quarter Acre in Karen', 'h2'),
      textBlock('A ready-to-build residential plot in a controlled gated estate within Karen. All infrastructure in place including tarmac access road, perimeter wall, water, electricity, and fibre internet.'),
      textBlock('The plot has an approved building plan for a 4-bedroom house. Title deed ready for transfer. Ideal for a family home build in one of Nairobi\'s most established suburbs.'),
    ],
    isFeatured: false,
    isNewDevelopment: false,
    agentSlug: 'james-otieno',
    seoTitle: 'Quarter Acre Plot for Sale in Karen | KSh 35M',
    seoDescription: 'Residential plot in Karen, Nairobi. 0.25 acres in gated estate. Ready title deed. KSh 35,000,000.',
  },

  // ── Commercial ────────────────────────────────
  {
    title: 'Office Space in Upperhill — 250sqm',
    slug: 'office-space-upperhill',
    listingCategory: 'commercial',
    propertyType: 'commercial',
    price: 450000,
    priceType: 'per-month',
    sizeSqm: 250,
    yearBuilt: 2019,
    neighbourhood: 'Upperhill',
    city: 'Nairobi',
    county: 'Nairobi',
    lat: -1.2951,
    lng: 36.8174,
    features: ['Lift/Elevator', 'Guard/Security', 'CCTV', 'Generator', 'Parking'],
    description: [
      textBlock('Grade A Office Space in Upperhill', 'h2'),
      textBlock('A premium open-plan office space on the 12th floor of a Grade A commercial tower in Upperhill. The space features floor-to-ceiling glass walls, raised access flooring, VRV air conditioning, and Cat 6 data cabling throughout.'),
      textBlock('The building offers 4 high-speed lifts, 100% generator backup, ample visitor parking, and proximity to Kenyatta National Hospital and Uhuru Highway.'),
    ],
    isFeatured: false,
    isNewDevelopment: false,
    agentSlug: 'james-otieno',
    seoTitle: 'Office Space for Rent in Upperhill | KSh 450K/mo',
    seoDescription: 'Grade A office in Upperhill, Nairobi. 250sqm, 12th floor, parking, generator. KSh 450,000 per month.',
  },
]

/* ── Main ───────────────────────────────────── */

async function main() {
  console.log('Seeding real-estate data into Sanity...\n')

  // 1. Create agents
  console.log('--- Creating agents ---')
  const agentIdMap: Record<string, string> = {}

  for (const agent of agents) {
    console.log(`  -> ${agent.displayName}...`)
    const doc = await client.create({
      _type: 'agent',
      displayName: agent.displayName,
      slug: { _type: 'slug', current: agent.slug },
      agencyName: agent.agencyName,
      isVerified: agent.isVerified,
      bio: agent.bio,
      phone: agent.phone,
      email: agent.email,
      specialisations: agent.specialisations,
      serviceAreas: agent.serviceAreas,
      subscriptionTier: agent.subscriptionTier,
    })
    agentIdMap[agent.slug] = doc._id
    console.log(`     Created: ${doc._id}`)
  }

  // 2. Create neighbourhoods
  console.log('\n--- Creating neighbourhoods ---')

  for (const n of neighbourhoods) {
    console.log(`  -> ${n.name}...`)
    const doc = await client.create({
      _type: 'neighbourhood',
      name: n.name,
      slug: { _type: 'slug', current: n.slug },
      city: n.city,
      county: n.county,
      tagline: n.tagline,
      avgPriceForSale: n.avgPriceForSale,
      avgPriceForRent: n.avgPriceForRent,
    })
    console.log(`     Created: ${doc._id}`)
  }

  // 3. Create properties
  console.log('\n--- Creating properties ---')

  for (const p of properties) {
    console.log(`  -> ${p.title}...`)

    const agentId = agentIdMap[p.agentSlug]

    const doc: any = {
      _type: 'property',
      title: p.title,
      slug: { _type: 'slug', current: p.slug },
      listingCategory: p.listingCategory,
      propertyType: p.propertyType,
      status: 'available',
      price: p.price,
      priceType: p.priceType,
      neighbourhood: p.neighbourhood,
      city: p.city,
      county: p.county,
      lat: p.lat,
      lng: p.lng,
      features: p.features,
      description: p.description,
      isFeatured: p.isFeatured,
      isNewDevelopment: p.isNewDevelopment,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
    }

    if (p.bedrooms != null) doc.bedrooms = p.bedrooms
    if (p.bathrooms != null) doc.bathrooms = p.bathrooms
    if (p.sizeSqm != null) doc.sizeSqm = p.sizeSqm
    if (p.landSizeAcres != null) doc.landSizeAcres = p.landSizeAcres
    if (p.yearBuilt != null) doc.yearBuilt = p.yearBuilt
    if (p.previousPrice != null) doc.previousPrice = p.previousPrice
    if (p.completionPercentage != null) doc.completionPercentage = p.completionPercentage
    if (p.developerName) doc.developerName = p.developerName
    if (p.unitsAvailable != null) doc.unitsAvailable = p.unitsAvailable

    if (agentId) {
      doc.agent = { _type: 'reference', _ref: agentId }
    }

    const result = await client.create(doc)
    console.log(`     Created: ${result._id}`)
  }

  console.log(`\nDone! Seeded ${agents.length} agents, ${neighbourhoods.length} neighbourhoods, ${properties.length} properties.`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
