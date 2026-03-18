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

interface ListingData {
  title: string
  slug: string
  type: string
  city: string
  county: string
  address: string
  price?: number
  priceUnit?: string
  description: any[]
  tags: string[]
  amenities: string[]
  highlights: any[]
  hostName: string
  imageUrls: string[]
  seoTitle: string
  seoDescription: string
}

const listings: ListingData[] = [
  {
    title: 'Ocean Breezes Beach',
    slug: 'ocean-breezes-beach',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'M24Q+G74, Jacaranda Road, Watamu',
    description: [
      textBlock('Ocean Breezes Beach', 'h2'),
      textBlock('A tranquil coastal escape in Watamu, featuring beautiful palm trees along beach bars. This serene sandy stretch with coral patches is ideal for unwinding with relaxing coastal experiences.'),
      textBlock('Activities & Things to Do', 'h3'),
      textBlock('Sunbathe on the sandy shore, explore stunning sandbars during low tide, or take a boat trip for fishing and leisure cruises. Snorkeling reveals starfish and multicolored fish in the shallow waters. The beach is pet-friendly and perfect for sunset viewing.'),
      textBlock('Beach Bars & Dining', 'h3'),
      textBlock('Multiple beach bars serve fresh seafood and traditional Swahili cuisine. MareMare beach bar offers sunbeds, beverages, and fresh coconut water (madafu). Limited parking available — TukTuk or motorbike recommended.'),
    ],
    tags: ['beach', 'watamu', 'snorkeling', 'pet-friendly', 'free-entry', 'sunset'],
    amenities: ['Parking', 'Pet Friendly', 'Sea View'],
    highlights: [
      { emoji: '🏖️', title: 'Sandy Beach', description: 'Beautiful sandy stretch with coral patches' },
      { emoji: '🌴', title: 'Palm Trees', description: 'Natural palm tree line along beach bars' },
      { emoji: '🤿', title: 'Snorkeling', description: 'Starfish and multicolored fish at low tide' },
      { emoji: '🐕', title: 'Pet Friendly', description: 'Dogs welcome on the beach' },
      { emoji: '🌅', title: 'Sunset Views', description: 'Spectacular sunset viewing spot' },
      { emoji: '🆓', title: 'Free Entry', description: 'No entrance fee required' },
    ],
    hostName: 'KlicKenya',
    imageUrls: [
      'https://klickenya.com/wp-content/uploads/2025/11/Fortamu_Beach_Watamu4-1200x900.jpg',
      'https://klickenya.com/wp-content/uploads/2025/11/Fortamu_Beach_Watamu5-1200x675.jpg',
      'https://klickenya.com/wp-content/uploads/2025/11/Fortamu_Beach_Watamu1-1200x675.jpg',
    ],
    seoTitle: 'Ocean Breezes Beach Watamu — Tranquil Coastal Escape',
    seoDescription: 'Discover Ocean Breezes Beach in Watamu, Kenya. Sandy shores, palm trees, snorkeling, beach bars, and stunning sunsets. Free entry.',
  },
  {
    title: 'Love Island Beach',
    slug: 'love-island-beach',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'J2XF+GQ7, Watamu',
    description: [
      textBlock('Love Island Beach', 'h2'),
      textBlock('A vibrant coastal destination featuring sandy beaches with coral and shells. Love Island is a lively, culturally rich spot where you can soak in the views and experience local fishing activities. Notable for a heart-shaped island accessible during low tide.'),
      textBlock('Activities', 'h3'),
      textBlock('Enjoy sunbathing, swimming, and beach games including football and cards. Shop at local gift stalls, watch fishermen bring in the daily catch, and witness spectacular sunsets over the Indian Ocean.'),
      textBlock('Where to Eat', 'h3'),
      textBlock('Willy Beach serves fresh seafood and local coconut water. Tamu Beach Restaurant offers Italian cuisine in an upscale setting. Visiwa Beach Bar provides Italian and Mediterranean dishes right on the oceanfront.'),
    ],
    tags: ['beach', 'watamu', 'pet-friendly', 'free-entry', 'sunset', 'fishing'],
    amenities: ['Parking', 'Pet Friendly', 'Sea View'],
    highlights: [
      { emoji: '💖', title: 'Heart-Shaped Island', description: 'Accessible during low tide — unique photo spot' },
      { emoji: '🎣', title: 'Fishing Culture', description: 'Watch local fishermen bring in the daily catch' },
      { emoji: '🍽️', title: 'Beach Dining', description: 'Three excellent restaurants on the beach' },
      { emoji: '🌅', title: 'Sunset Views', description: 'Spectacular evening views over the ocean' },
      { emoji: '🐕', title: 'Pet Friendly', description: 'Dogs welcome on the beach' },
      { emoji: '🆓', title: 'Free Entry', description: 'No entrance fee required' },
    ],
    hostName: 'KlicKenya',
    imageUrls: [],
    seoTitle: 'Love Island Beach Watamu — Heart-Shaped Island at Low Tide',
    seoDescription: 'Visit Love Island Beach in Watamu, Kenya. Heart-shaped island at low tide, beach bars, fishing culture, and stunning sunsets.',
  },
  {
    title: 'Jacaranda Beach',
    slug: 'jacaranda-beach',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Jacaranda Beach, Watamu',
    description: [
      textBlock('Jacaranda Beach', 'h2'),
      textBlock('A must-visit when traveling to Watamu. Located in a wild, beautiful environment with plenty of beach bars, Jacaranda Beach offers the perfect balance of relaxation and adventure. The beach dramatically changes at low tide, with sandbars extending far into the ocean.'),
      textBlock('Kitesurfing & Activities', 'h3'),
      textBlock('Jacaranda Beach is one of the best kitesurfing spots in Watamu, with lessons available for all levels. Explore sandbars at low tide, collect shells, take boat trips, or enjoy seafood barbecues organized by local operators.'),
      textBlock('Beach Bars', 'h3'),
      textBlock('Safina Beach Bar offers a vibrant setting with coastal delicacies. Luwa Beach Bar provides a luxury experience with jacuzzis and ocean views. African Footprint delivers a local vibe with fresh seafood and African-inspired cuisine.'),
    ],
    tags: ['beach', 'watamu', 'kitesurfing', 'pet-friendly', 'free-entry', 'adventure'],
    amenities: ['Parking', 'Pet Friendly', 'Sea View'],
    highlights: [
      { emoji: '🪁', title: 'Kitesurfing', description: 'Lessons available for all levels' },
      { emoji: '🏖️', title: 'Sandbars', description: 'Dramatic sandbars extend into ocean at low tide' },
      { emoji: '🐚', title: 'Shell Collecting', description: 'Extensive seashell collection on shore' },
      { emoji: '🍽️', title: 'Beach Bars', description: 'Three unique beach bars with great food' },
      { emoji: '🐕', title: 'Pet Friendly', description: 'Dogs welcome on the beach' },
      { emoji: '🆓', title: 'Free Entry', description: 'No entrance fee required' },
    ],
    hostName: 'KlicKenya',
    imageUrls: [
      'https://klickenya.com/wp-content/uploads/2025/11/Jacaranda-Beach-Watamu1-520x397.jpg',
      'https://klickenya.com/wp-content/uploads/2025/11/Jacaranda-Beach-Watamu2-1200x955.jpg',
    ],
    seoTitle: 'Jacaranda Beach Watamu — Kitesurfing, Sandbars & Beach Bars',
    seoDescription: 'Discover Jacaranda Beach in Watamu. Kitesurfing, sandbars at low tide, beach bars, and adventure. Free entry.',
  },
  {
    title: 'Captain Sammy Dhow',
    slug: 'captain-sammy-dhow',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu, Lichthaus',
    price: 18000,
    priceUnit: 'session',
    description: [
      textBlock('Captain Sammy Dhow', 'h2'),
      textBlock('Discover one of the best experiences in Watamu — a sunset dhow cruise across the stunning waters of Mida Creek. Sail on a traditional Swahili dhow with options for swimming, dining, drinks, and sunset viewing.'),
      textBlock('Sunset Cruise Details', 'h3'),
      textBlock('Depart at 4:30 PM and return by 7:00 PM for a 2.5-hour sailing experience. Minimum spend is 18,000 KES for up to 6 people, with capacity for 12. Optional food and drinks package at 4,000 KES per person. Towels, kitchen, cutlery, BBQ, cooler, and speaker all provided onboard.'),
      textBlock('How to Book', 'h3'),
      textBlock('24-hour pre-booking required with a down payment. Pick-up and drop-off at Lichthaus Bar. KWS marine tickets are excluded (130 KSH residents / $17 non-residents). Contact via WhatsApp: +254769827110 or Instagram: @captain_sammy_boat.'),
    ],
    tags: ['dhow', 'watamu', 'sunset', 'mida-creek', 'sailing', 'experience'],
    amenities: ['Sea View'],
    highlights: [
      { emoji: '⛵', title: 'Traditional Dhow', description: 'Authentic Swahili sailing vessel' },
      { emoji: '🌅', title: 'Sunset Cruise', description: '4:30 PM – 7:00 PM across Mida Creek' },
      { emoji: '🍽️', title: 'Onboard Dining', description: 'BBQ, kitchen, and drinks package available' },
      { emoji: '👥', title: 'Up to 12 Guests', description: 'Perfect for groups and celebrations' },
      { emoji: '🤿', title: 'Swimming Stop', description: 'Swim in the crystal-clear creek waters' },
      { emoji: '🎵', title: 'Music & Vibes', description: 'Speaker and chill atmosphere onboard' },
    ],
    hostName: 'Captain Sammy',
    imageUrls: [
      'https://klickenya.com/wp-content/uploads/2025/11/DJI_0996-520x397.jpeg',
    ],
    seoTitle: 'Captain Sammy Dhow Sunset Cruise — Watamu, Mida Creek',
    seoDescription: 'Book a sunset dhow cruise in Watamu with Captain Sammy. Sail Mida Creek, swim, dine onboard. From 18,000 KES for up to 6 guests.',
  },
  {
    title: 'Watamu Bay Beach',
    slug: 'watamu-bay-beach',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu Centre, Mapango Beach, Watamu',
    description: [
      textBlock('Watamu Bay Beach', 'h2'),
      textBlock('The vibrant city beach of Watamu, also known as Mapango Beach or Acquarius Beach. This is where locals gather for sunset football matches, fishing, and evening socializing. An authentic experience rather than a touristy destination.'),
      textBlock('Where to Eat', 'h3'),
      textBlock('Sunset Beach Lab serves Italian pizzeria-style food with Friday night music events. KOKOMO Beach offers Lebanese fusion cuisine right on the sand. Multiple beach bars provide a casual, lively atmosphere.'),
      textBlock('Getting There', 'h3'),
      textBlock('Multiple access points via Acquarius, Sunset Lab, or Kokomo. Limited parking on the main shopping road. The beach comes alive in the evening with local culture.'),
    ],
    tags: ['beach', 'watamu', 'local-culture', 'free-entry', 'sunset', 'nightlife'],
    amenities: ['Parking', 'Pet Friendly', 'Sea View'],
    highlights: [
      { emoji: '⚽', title: 'Beach Football', description: 'Sunset football matches with locals' },
      { emoji: '🎣', title: 'Fishing Culture', description: 'Watch fishermen bring in the catch' },
      { emoji: '🍕', title: 'Beach Dining', description: 'Italian, Lebanese, and local cuisine' },
      { emoji: '🎶', title: 'Friday Music', description: 'Live music at Sunset Beach Lab' },
      { emoji: '🌅', title: 'Sunset Spot', description: 'One of the best sunset views in Watamu' },
      { emoji: '🆓', title: 'Free Entry', description: 'No entrance fee required' },
    ],
    hostName: 'KlicKenya',
    imageUrls: [
      'https://klickenya.com/wp-content/uploads/2025/11/Watamu-Beach-Bay-mapango-beach-520x397.webp',
    ],
    seoTitle: 'Watamu Bay Beach — The Local City Beach of Watamu',
    seoDescription: 'Experience Watamu Bay Beach (Mapango Beach). Local culture, sunset football, beach bars, and the best sunset in Watamu. Free entry.',
  },
  {
    title: 'Mida Creek',
    slug: 'mida-creek',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Mida Creek, Dabaso, Watamu',
    description: [
      textBlock('Mida Creek', 'h2'),
      textBlock('A stunning tidal inlet spanning 32 km² that winds inland between lush mangroves and breathtaking views. Part of the Watamu Marine National Park and Reserve, the landscape transforms dramatically with tides of up to 3 meters difference. Home to mangrove forests, diverse bird species, crabs, and juvenile sea turtles.'),
      textBlock('Activities', 'h3'),
      textBlock('Take a sunset dhow cruise, try stand-up paddleboarding (SUP), or kayak through the mangroves. Join a floating tour at high tide or walk the elevated boardwalk through the mangrove forest. Bird watching is excellent year-round.'),
      textBlock('Access Points', 'h3'),
      textBlock('Enter from Lichthaus or Temple Point (15 minutes from Watamu center), Captain Andy\'s Port, or take the scenic route to The Crab Shack (20-minute ride). Hotel pickup services are available from most tour operators.'),
    ],
    tags: ['nature', 'watamu', 'mangroves', 'kayaking', 'sup', 'birdwatching', 'marine-park'],
    amenities: ['Sea View'],
    highlights: [
      { emoji: '🌊', title: '32 km² Inlet', description: 'Massive tidal creek with dramatic tide changes' },
      { emoji: '🌿', title: 'Mangrove Forest', description: 'Dense mangroves with elevated boardwalk' },
      { emoji: '🐢', title: 'Sea Turtles', description: 'Juvenile green and hawksbill turtles' },
      { emoji: '🛶', title: 'Kayaking & SUP', description: 'Paddle through the mangrove channels' },
      { emoji: '🦅', title: 'Bird Watching', description: 'Diverse species year-round' },
      { emoji: '⛵', title: 'Dhow Cruises', description: 'Sunset sailing across the creek' },
    ],
    hostName: 'KlicKenya',
    imageUrls: [
      'https://klickenya.com/wp-content/uploads/2025/11/Mida_creek_Watamu_klickenya2-520x397.jpg',
    ],
    seoTitle: 'Mida Creek Watamu — Mangroves, Kayaking & Dhow Cruises',
    seoDescription: 'Explore Mida Creek in Watamu. Mangrove kayaking, SUP, sunset dhow cruises, sea turtles, and bird watching.',
  },
  {
    title: "Marafa Hell's Kitchen",
    slug: 'marafa-hells-kitchen',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Marafa, Watamu',
    description: [
      textBlock("Marafa Hell's Kitchen", 'h2'),
      textBlock("A spectacular canyon featuring vibrant, colorful rock formations that create a surreal landscape resembling another planet. The site displays dramatic scenic views with fascinating geological formations that change color throughout the day."),
      textBlock('Tours & Activities', 'h3'),
      textBlock('Choose between a 30-minute shorter tour or a full 1-hour guided experience covering geological history and local myths. Photography opportunities are outstanding, especially during sunset when canyon colors intensify. Often combined with a day trip to nearby Gede Ruins.'),
      textBlock('Practical Tips', 'h3'),
      textBlock("Visit early morning or late evening to avoid the midday heat. Bring sturdy shoes for the rocky terrain and plenty of water. Located about 45 minutes (30 km) from Watamu by car or motorbike. Tourism income supports local community bursaries."),
    ],
    tags: ['canyon', 'watamu', 'nature', 'photography', 'geological', 'day-trip'],
    amenities: [],
    highlights: [
      { emoji: '🏜️', title: 'Colorful Canyon', description: 'Vibrant rock formations change color with light' },
      { emoji: '📸', title: 'Photography', description: 'Dramatic landscape perfect for photos' },
      { emoji: '🧭', title: 'Guided Tours', description: '30-min or 1-hour options with local guides' },
      { emoji: '🌅', title: 'Best at Sunset', description: 'Canyon colors intensify in golden hour' },
      { emoji: '📖', title: 'Local Mythology', description: 'Rich cultural stories about the canyon' },
      { emoji: '🤝', title: 'Community Impact', description: 'Tourism supports local bursaries' },
    ],
    hostName: 'KlicKenya',
    imageUrls: [
      'https://klickenya.com/wp-content/uploads/2025/11/marafa-klickenya-1-1200x540.jpeg',
    ],
    seoTitle: "Marafa Hell's Kitchen — Colorful Canyon near Watamu",
    seoDescription: "Visit Marafa Hell's Kitchen near Watamu. Spectacular colorful canyon, guided tours, stunning photography, and local mythology.",
  },
  {
    title: 'Gede Ruins',
    slug: 'gede-ruins',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Ghede, Watamu',
    description: [
      textBlock('Gede Ruins', 'h2'),
      textBlock('Step back in time at the Gede Ruins, one of the top things to do in Watamu. Explore the remnants of an ancient Swahili town dating back to the 11th century, with architectural ruins that showcase this remarkable historical civilization.'),
      textBlock('What to See', 'h3'),
      textBlock('Join hourly guided tours (9 AM – 4 PM) or explore on your own. Visit the on-site museum, feed the resident monkeys, and discover the ancient palace, mosques, and houses of this mysterious abandoned town. Picnic areas available.'),
      textBlock('Getting There', 'h3'),
      textBlock('Located 7 km from Watamu via the Mombasa-Malindi Road (B8), about a 20-minute ride. Accessible by car, taxi, TukTuk, or motorbike. Hotels and tour operators offer organized packages, often combined with Marafa.'),
    ],
    tags: ['history', 'watamu', 'ruins', 'culture', 'museum', 'day-trip'],
    amenities: ['Parking'],
    highlights: [
      { emoji: '🏛️', title: '11th Century Ruins', description: 'Ancient Swahili town archaeological site' },
      { emoji: '🐒', title: 'Monkey Colony', description: 'Feed and observe the resident monkeys' },
      { emoji: '🏫', title: 'On-Site Museum', description: 'Artifacts and history of the settlement' },
      { emoji: '🧭', title: 'Guided Tours', description: 'Hourly tours from 9 AM to 4 PM' },
      { emoji: '🧺', title: 'Picnic Areas', description: 'Shaded picnic spots on site' },
      { emoji: '🚐', title: 'Easy Access', description: '20 minutes from Watamu by TukTuk' },
    ],
    hostName: 'KlicKenya',
    imageUrls: [
      'https://klickenya.com/wp-content/uploads/2025/11/gede-ruins-2.jpg',
      'https://klickenya.com/wp-content/uploads/2025/11/ghede_ruins_monkey.jpeg',
      'https://klickenya.com/wp-content/uploads/2025/11/ghede_ruins-1200x685.jpg',
    ],
    seoTitle: 'Gede Ruins Watamu — Ancient Swahili Town & Museum',
    seoDescription: 'Explore Gede Ruins near Watamu. 11th century Swahili town, guided tours, museum, monkey colony. 20 minutes from Watamu.',
  },
  {
    title: 'Short Beach',
    slug: 'short-beach',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Short Beach, Next to Garoda Beach, Watamu',
    description: [
      textBlock('Short Beach', 'h2'),
      textBlock('Away from the more crowded areas of Watamu, Short Beach provides a tranquil, wild, and scenic experience. Accessible by foot or bike, this pristine beach reveals a stunning sandbank at low tide ideal for leisurely walks.'),
      textBlock('What to Expect', 'h3'),
      textBlock('A natural, unspoiled beach with no beach bars or tour operators. Bring your own water and shade. The calm waters are ideal for swimming and relaxation during low tide. A 15-20 minute walk along the shore at low tide takes you to nearby Garoda Beach.'),
      textBlock('Getting There', 'h3'),
      textBlock('Located about 15 minutes from Watamu center. Reach it by motorbike (approx 350 KES) or TukTuk (approx 500 KES). Nearby are Litchhouse restaurants, Kobe Restaurant at Garoda, and the entrance to Mida Creek.'),
    ],
    tags: ['beach', 'watamu', 'secluded', 'free-entry', 'wild', 'nature'],
    amenities: ['Sea View'],
    highlights: [
      { emoji: '🏝️', title: 'Secluded Beach', description: 'Tranquil and unspoiled natural setting' },
      { emoji: '🏖️', title: 'Sandbank', description: 'Stunning sandbank revealed at low tide' },
      { emoji: '🏊', title: 'Calm Waters', description: 'Safe swimming during low tide' },
      { emoji: '🌿', title: 'Wild & Scenic', description: 'No bars, no crowds — pure nature' },
      { emoji: '🚶', title: 'Walk to Garoda', description: '15-20 min coastal walk at low tide' },
      { emoji: '🆓', title: 'Free Entry', description: 'No entrance fee required' },
    ],
    hostName: 'KlicKenya',
    imageUrls: [
      'https://klickenya.com/wp-content/uploads/2025/11/short-Beach-1200x691.webp',
      'https://klickenya.com/wp-content/uploads/2025/11/shortBeach-KlicKenya-1200x1200.jpg',
    ],
    seoTitle: 'Short Beach Watamu — Secluded Beach near Garoda',
    seoDescription: 'Discover Short Beach in Watamu. Secluded, wild, and scenic with a stunning sandbank at low tide. Free entry. Walk to Garoda Beach.',
  },
  {
    title: 'Garoda Beach',
    slug: 'garoda-beach',
    type: 'experience',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Garoda Beach, Watamu',
    description: [
      textBlock('Garoda Beach', 'h2'),
      textBlock('Garoda Beach is not just another beach — it is an experience waiting to be explored, and probably the best beach in Watamu. A distinctive sandbar forms during low tides, complemented by pristine white sand and turquoise waters.'),
      textBlock('Kitesurfing & Activities', 'h3'),
      textBlock('JC Kiteschool offers Duotone equipment rental and lessons for all levels. Enjoy shade tents with sunbeds from local vendors, or visit KOBE RESORT nearby for upscale dining. The tidal pattern shifts by about one hour daily — best visited 2 hours before or after low tide.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Follow signs toward KOBE RESORT through town, then walk about 100 meters along a sandy path lined with artisan vendors selling African crafts. Free entrance. Parking available at Kobe Resort. Pet-friendly after 6 PM. Family-friendly and suitable for children.'),
    ],
    tags: ['beach', 'watamu', 'kitesurfing', 'pet-friendly', 'free-entry', 'family-friendly'],
    amenities: ['Parking', 'Pet Friendly', 'Sea View'],
    highlights: [
      { emoji: '🏖️', title: 'Best Beach in Watamu', description: 'Pristine white sand and turquoise waters' },
      { emoji: '🪁', title: 'Kitesurfing', description: 'JC Kiteschool with equipment rental & lessons' },
      { emoji: '🏝️', title: 'Sandbar Formation', description: 'Unique sandbar appears at low tide' },
      { emoji: '🛍️', title: 'Artisan Market', description: 'Local crafts along the access path' },
      { emoji: '👨‍👩‍👧', title: 'Family Friendly', description: 'Safe for children, calm waters' },
      { emoji: '🆓', title: 'Free Entry', description: 'No entrance fee required' },
    ],
    hostName: 'KlicKenya',
    imageUrls: [
      'https://klickenya.com/wp-content/uploads/2025/11/Garoda_Beach_KlicKenya23-1200x800.jpg',
      'https://klickenya.com/wp-content/uploads/2025/11/garoda-area-baharini-1200x675.jpg',
      'https://klickenya.com/wp-content/uploads/2025/11/Garoda_Beach_KlicKenya21.jpg',
    ],
    seoTitle: 'Garoda Beach Watamu — Best Beach, Kitesurfing & Sandbar',
    seoDescription: 'Visit Garoda Beach, the best beach in Watamu. Kitesurfing, sandbar, artisan market, and turquoise waters. Free entry.',
  },
]

async function main() {
  console.log(`🏖️ Seeding ${listings.length} listings to Sanity...\n`)

  for (const listing of listings) {
    console.log(`  → ${listing.title}...`)

    // Upload images
    const photos: any[] = []
    for (const url of listing.imageUrls) {
      const filename = url.split('/').pop() || 'photo.jpg'
      const img = await uploadImageFromUrl(url, filename)
      if (img) photos.push(img)
    }

    const doc: any = {
      _type: 'listing',
      title: listing.title,
      slug: { _type: 'slug', current: listing.slug },
      type: listing.type,
      status: 'published',
      city: listing.city,
      county: listing.county,
      address: listing.address,
      description: listing.description,
      tags: listing.tags,
      amenities: listing.amenities,
      highlights: listing.highlights.map((h) => ({
        _type: 'object',
        _key: key(),
        emoji: h.emoji,
        title: h.title,
        description: h.description,
      })),
      hostName: listing.hostName,
      photos,
      seoTitle: listing.seoTitle,
      seoDescription: listing.seoDescription,
      bookingType: 'contact_form',
    }

    if (listing.price) doc.price = listing.price
    if (listing.priceUnit) doc.priceUnit = listing.priceUnit

    const result = await client.create(doc)
    console.log(`    ✅ Created: ${result._id}`)
  }

  console.log(`\n✅ Done — ${listings.length} listings seeded!`)
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
