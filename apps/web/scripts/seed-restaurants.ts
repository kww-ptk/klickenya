import { createClient } from 'next-sanity'

const client = createClient({
  projectId: 'b9zd8u9f',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

function key() { return Math.random().toString(36).slice(2, 12) }

function text(t: string, style = 'normal'): any {
  return { _type: 'block', _key: key(), style, children: [{ _type: 'span', _key: key(), text: t, marks: [] }] }
}

function quickFacts(title: string, color: string, items: { icon: string; label: string; value: string }[]): any {
  return { _type: 'quickFactsBlock', _key: key(), title, accentColor: color, items: items.map(i => ({ _key: key(), ...i })) }
}

function tipCard(variant: string, icon: string, label: string, t: string): any {
  return { _type: 'tipCardBlock', _key: key(), variant, icon, label, text: t }
}

function whoIsItFor(title: string, items: { emoji: string; heading: string; text: string }[]): any {
  return { _type: 'whoIsItForBlock', _key: key(), title, items: items.map(i => ({ _key: key(), ...i })) }
}

async function uploadImage(url: string, filename: string): Promise<any> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const asset = await client.assets.upload('image', buf, { filename })
    return { _type: 'image', _key: key(), asset: { _type: 'reference', _ref: asset._id }, alt: filename.replace(/[-_]/g, ' ').replace(/\.\w+$/, '') }
  } catch (e) { console.warn(`  ⚠ Image failed: ${filename}`); return null }
}

async function main() {
  console.log('🍽️ Seeding 2 restaurants to Sanity...\n')

  // ── 1. Mannis Restaurant ──────────────────────────────

  console.log('  → Mannis Restaurant & Cocktail Bar...')

  const mannisPhotos: any[] = []
  const mannisImg = await uploadImage('https://klickenya.com/wp-content/uploads/2025/11/Mannis_Restaurant_KlicKenya_9-520x397.jpg', 'mannis-restaurant-watamu.jpg')
  if (mannisImg) mannisPhotos.push(mannisImg)

  const mannisDoc = {
    _type: 'listing',
    title: "Mannis Restaurant & Cocktail Bar",
    slug: { _type: 'slug', current: 'mannis-restaurant-cocktail-bar' },
    type: 'restaurant',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Palm Garden Boutique Hotel, Garoda Area, Watamu',
    hostName: 'Palm Garden Boutique Hotel',
    bookingType: 'contact_form' as const,
    cuisine: ['Italian', 'Seafood', 'Mediterranean'],
    priceRange: 'fine-dining',
    openingHours: 'Dinner nightly from 7:00 PM. Cocktail bar from 5:00 PM. Reservations recommended.',
    reservationRequired: false,
    tags: ['fine-dining', 'watamu', 'italian', 'cocktails', 'seafood', 'romantic', 'wine', 'adults-only'],
    amenities: ['WiFi', 'Parking', 'Garden'],
    photos: mannisPhotos,
    highlights: [
      { _key: key(), emoji: '🍝', title: 'Handmade Pasta', description: 'Fresh pasta made daily, including their famous ravioli' },
      { _key: key(), emoji: '🍸', title: 'Premium Cocktails', description: 'Curated spirits, whiskeys, gins, and signature cocktails' },
      { _key: key(), emoji: '🐟', title: 'Fresh Seafood', description: 'Lobster, octopus, sashimi, and the best carpaccio in Watamu' },
      { _key: key(), emoji: '🌿', title: 'Garden Setting', description: 'Peaceful palm garden with soft lighting and ocean breeze' },
      { _key: key(), emoji: '☀️', title: 'Solar Powered', description: '120 solar panels, one of Kenya\'s greenest restaurants' },
      { _key: key(), emoji: '💻', title: 'Work Friendly', description: 'Great WiFi, work areas, and a conference room' },
    ],
    description: [
      quickFacts('✦ Restaurant Info', 'purple', [
        { icon: '📍', label: 'Location', value: 'Garoda Area, Palm Garden Hotel' },
        { icon: '🍽️', label: 'Cuisine', value: 'Italian, Seafood, International' },
        { icon: '💰', label: 'Price Range', value: 'Fine Dining' },
        { icon: '📞', label: 'Phone', value: '+254 703 845 153' },
        { icon: '📸', label: 'Instagram', value: '@palmgardenkenya' },
        { icon: '🔞', label: 'Note', value: 'Adults and families (12+)' },
      ]),

      text("Mannis Restaurant & Cocktail Bar", 'h2'),
      text("Tucked inside the Palm Garden Boutique Hotel in Watamu's Garoda area, Mannis is the kind of restaurant that makes you wonder how it ended up in a small Kenyan coastal town. The answer is simple: Italian owners who care deeply about food, a kitchen that sources the freshest ingredients daily, and a setting that feels like dining in someone's beautifully kept private garden."),
      text("The menu is rooted in authentic Italian cooking but reaches well beyond. Handmade pasta is the cornerstone, and regulars will tell you that the ravioli here is among the best they have ever eaten, anywhere. The seafood is outstanding. Lobster, tender octopus, delicate carpaccio, and sashimi that Tripadvisor reviewers have called the best they have had. Everything is prepared with attention to detail that you feel in every bite."),

      text('The Cocktail Bar', 'h3'),
      text("Beyond the kitchen, the cocktail bar has developed a reputation of its own. An impressive collection of premium spirits lines the shelves, including a curated selection of whiskeys, gins, tequilas, and a proper humidor for those who enjoy a good cigar after dinner. The cocktails are crafted rather than thrown together, and the wine list covers both Italian classics and Kenyan discoveries. More than one visitor has described it as the best bar in Watamu."),

      tipCard('tip', '📞', 'Reservations', 'Walk ins are welcome but reservations are recommended, especially during high season (December to March and July to August). Call +254 703 845 153 or message on WhatsApp at +39 335 534 7040.'),

      text('The Setting', 'h3'),
      text("The restaurant sits within a lush palm garden that creates a natural sense of privacy and calm. Soft lighting, a gentle breeze, and the sound of tropical birds make this one of the most atmospheric dining experiences on the Kenya coast. The hotel itself is powered by 120 solar panels generating 200 kilowatts, making it one of the few genuinely green hospitality businesses in the region. Note that Palm Garden is exclusively for adults and families with children over 12."),

      tipCard('teal', '💻', 'Digital Nomad Friendly', 'Mannis doubles as an excellent work spot during the day. Strong WiFi, comfortable seating, plenty of outlets, and even a conference room available for meetings. Coffee and fresh juices are served throughout the day.'),

      whoIsItFor('Perfect For', [
        { emoji: '💑', heading: 'Couples', text: 'Romantic garden setting with fine dining and cocktails' },
        { emoji: '🍷', heading: 'Wine & Spirit Lovers', text: 'One of the best curated bars on the Kenya coast' },
        { emoji: '💻', heading: 'Digital Nomads', text: 'Great WiFi, work space, and excellent coffee' },
        { emoji: '🎂', heading: 'Special Occasions', text: 'The kind of place that makes a birthday dinner memorable' },
      ]),
    ],
    seoTitle: "Mannis Restaurant Watamu — Fine Dining & Cocktails",
    seoDescription: "Dine at Mannis in Watamu. Italian fine dining, handmade pasta, fresh seafood, premium cocktails at Palm Garden Hotel.",
  }

  const mannis = await client.create(mannisDoc)
  console.log(`    ✅ Created: ${mannis._id}`)

  // ── 2. Sunset Lab ─────────────────────────────────────

  console.log('  → Sunset Lab...')

  // Sunset Lab already exists, let's update it
  const existing = await client.fetch(`*[_type == "listing" && slug.current == "sunset_lab_pizza"]{ _id }`)

  const sunsetDescription = [
    quickFacts('✦ Restaurant Info', 'amber', [
      { icon: '📍', label: 'Location', value: 'Watamu Bay Beach' },
      { icon: '🍕', label: 'Specialty', value: 'Real Italian Pizza' },
      { icon: '💰', label: 'Price Range', value: 'Mid Range' },
      { icon: '📞', label: 'Phone', value: '+254 793 858 165' },
      { icon: '📸', label: 'Instagram', value: '@sunset.lab.watamu' },
      { icon: '🗓️', label: 'Closed', value: 'Tuesdays' },
    ]),

    text('Sunset Lab', 'h2'),
    text("Right on the sand at Watamu Bay Beach, Sunset Lab has become one of those places that defines a destination. It started as a pizza spot with a wood fired oven and some cushions on the beach, and it has grown into the social heartbeat of Watamu. The pizza is genuinely excellent. High, fluffy dough with quality toppings that visitors say rivals anything they have eaten in Italy. That is not an exaggeration."),
    text("During the day, Sunset Lab operates as a relaxed beach bar and restaurant. You can grab a sunbed, order a cocktail, and eat pizza with your feet in the sand while watching the ocean. The Italian menu goes beyond pizza with pasta, salads, and daily specials using fresh local ingredients. The vibe is laid back, the staff is warm, and the location is stunning."),

    text('Friday Night Beach Parties', 'h3'),
    text("Friday nights are when Sunset Lab comes alive. Live musicians and DJs set up on the beach and the whole place transforms into Watamu's best night out. Locals, expats, and visitors mix on the dance floor with the ocean as a backdrop. There is no cover charge. Just show up, grab a drink, and let the evening take you. It has become a weekly tradition that most people who visit Watamu end up at least once. Be aware that service can slow down during busy events because the kitchen gets overwhelmed, but the atmosphere more than makes up for it."),

    tipCard('tip', '🍕', 'Best Pizza in Kenya?', 'Multiple reviewers and long term residents claim Sunset Lab serves the best pizza in Kenya. The secret is the dough: high hydration, long fermentation, and a properly hot wood fired oven. If you only eat one meal in Watamu, make it a Sunset Lab pizza.'),

    text('Practical Info', 'h3'),
    text("Sunset Lab is open daily except Tuesdays. Lunch service starts around noon, and the kitchen runs through dinner. Booking slots are available at 12:00, 16:00, and 20:00 through their website. The restaurant sits right on Watamu Bay Beach (also called Mapango Beach), easily accessible from the main road through town. Parking is limited but available nearby. They also have cozy rooms right on the beach if you want to stay the night."),

    tipCard('warning', '🎶', 'Friday Nights', 'On Friday evenings the place gets busy. If you want a good table for dinner and music, arrive by 7:30 PM. If you are coming just for drinks and dancing, anytime from 9 PM works. Service slows down when the crowd builds, so order food early.'),

    whoIsItFor('Perfect For', [
      { emoji: '🍕', heading: 'Pizza Lovers', text: 'Genuinely the best pizza on the Kenya coast' },
      { emoji: '🎶', heading: 'Music Fans', text: 'Friday night live music and DJ sets on the beach' },
      { emoji: '🌅', heading: 'Sunset Chasers', text: 'The name says it all, stunning views every evening' },
      { emoji: '👥', heading: 'Social Travelers', text: 'The place where everyone in Watamu ends up meeting' },
    ]),
  ]

  if (existing.length > 0) {
    // Update existing Sunset Lab listing
    await client.patch(existing[0]._id).set({
      type: 'restaurant',
      cuisine: ['Italian'],
      priceRange: 'mid-range',
      openingHours: 'Daily except Tuesday. Lunch from 12:00, dinner until late. Booking slots: 12:00, 16:00, 20:00.',
      reservationRequired: false,
      tags: ['pizza', 'watamu', 'italian', 'beach-bar', 'live-music', 'friday-nights', 'casual'],
      amenities: ['WiFi', 'Parking', 'Sea View'],
      description: sunsetDescription,
      highlights: [
        { _key: key(), emoji: '🍕', title: 'Best Pizza in Kenya', description: 'Wood fired, high hydration dough, quality Italian toppings' },
        { _key: key(), emoji: '🎶', title: 'Live Music Fridays', description: 'DJs and musicians on the beach every Friday night' },
        { _key: key(), emoji: '🌅', title: 'Beach Location', description: 'Tables and sunbeds right on Watamu Bay sand' },
        { _key: key(), emoji: '🍹', title: 'Cocktails', description: 'Great cocktail menu with ocean views' },
        { _key: key(), emoji: '🛏️', title: 'Beach Rooms', description: 'Cozy rooms available right on the beach' },
        { _key: key(), emoji: '💃', title: 'Nightlife Hub', description: 'Watamu\'s social gathering point' },
      ],
      seoTitle: 'Sunset Lab Watamu — Best Pizza, Beach Bar & Live Music',
      seoDescription: 'Eat at Sunset Lab on Watamu Beach. Best pizza in Kenya, cocktails, live music Fridays, and sunset views.',
    }).commit()
    console.log(`    ✅ Updated existing: ${existing[0]._id}`)
  } else {
    // Create new
    const sunsetImg = await uploadImage('https://klickenya.com/wp-content/uploads/2025/11/sunset_lab_watamu_klickenya_2-520x397.webp', 'sunset-lab-watamu.webp')
    const doc = {
      _type: 'listing',
      title: 'Sunset Lab',
      slug: { _type: 'slug', current: 'sunset-lab' },
      type: 'restaurant',
      status: 'published',
      city: 'Watamu',
      county: 'Kilifi',
      address: 'Watamu Bay Beach, Watamu',
      hostName: 'Sunset Lab',
      bookingType: 'contact_form' as const,
      cuisine: ['Italian'],
      priceRange: 'mid-range',
      openingHours: 'Daily except Tuesday. Lunch from 12:00, dinner until late.',
      reservationRequired: false,
      tags: ['pizza', 'watamu', 'italian', 'beach-bar', 'live-music', 'friday-nights'],
      amenities: ['WiFi', 'Parking', 'Sea View'],
      photos: sunsetImg ? [sunsetImg] : [],
      highlights: [
        { _key: key(), emoji: '🍕', title: 'Best Pizza in Kenya', description: 'Wood fired, high hydration dough' },
        { _key: key(), emoji: '🎶', title: 'Live Music Fridays', description: 'DJs and musicians on the beach' },
        { _key: key(), emoji: '🌅', title: 'Beach Location', description: 'Right on Watamu Bay sand' },
      ],
      description: sunsetDescription,
      seoTitle: 'Sunset Lab Watamu — Best Pizza, Beach Bar & Live Music',
      seoDescription: 'Eat at Sunset Lab on Watamu Beach. Best pizza in Kenya, cocktails, live music Fridays.',
    }
    const result = await client.create(doc)
    console.log(`    ✅ Created: ${result._id}`)
  }

  console.log('\n✅ Done — 2 restaurants seeded!')
}

main().catch(err => { console.error('❌', err); process.exit(1) })
