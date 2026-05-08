import { createClient } from 'next-sanity'

const client = createClient({
  projectId: 'b9zd8u9f', dataset: 'production', apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!, useCdn: false,
})

function k() { return Math.random().toString(36).slice(2, 12) }
function t(s: string, style = 'normal'): any {
  return { _type: 'block', _key: k(), style, children: [{ _type: 'span', _key: k(), text: s, marks: [] }] }
}
function qf(title: string, color: string, items: any[]): any {
  return { _type: 'quickFactsBlock', _key: k(), title, accentColor: color, items: items.map(i => ({ _key: k(), ...i })) }
}
function tc(v: string, icon: string, label: string, text: string): any {
  return { _type: 'tipCardBlock', _key: k(), variant: v, icon, label, text }
}
function wf(title: string, items: any[]): any {
  return { _type: 'whoIsItForBlock', _key: k(), title, items: items.map(i => ({ _key: k(), ...i })) }
}
function hl(emoji: string, title: string, description: string) {
  return { _key: k(), emoji, title, description }
}

async function uploadImg(url: string, name: string): Promise<any> {
  try {
    const r = await fetch(url); if (!r.ok) throw new Error(`${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    const a = await client.assets.upload('image', buf, { filename: name })
    return { _type: 'image', _key: k(), asset: { _type: 'reference', _ref: a._id }, alt: name.replace(/[-_]/g, ' ').replace(/\.\w+$/, '') }
  } catch { console.warn(`  ⚠ img fail: ${name}`); return null }
}

const restaurant = {
  title: 'Tribal',
  slug: 'tribal-kilifi',
  address: 'Bofa Beach, Kilifi, Kenya',
  hostName: 'Tribal',
  cuisine: ['Seafood', 'Coastal', 'Mediterranean', 'International'],
  priceRange: 'mid-range' as const,
  openingHours: 'Open 7 days, 7:30am – 10:00pm. Last food order 8:30pm, last drink order 9:30pm.',
  tags: ['kilifi', 'bofa-beach', 'seafood', 'lobster', 'beachfront', 'sunset', 'live-music', 'fine-dining', 'signature', 'tribal-sand'],
  amenities: ['Parking', 'Sea View', 'Outdoor Seating', 'Live Music', 'Garden'],
  imgUrl: '',
  highlights: [
    hl('🦞', 'Whole Lobster & Chips', 'Whole lobster with herb butter, white wine and lemon — a signature plate'),
    hl('🌅', 'Friday Sunset Sessions', 'Live acoustic sets every Friday as the horizon turns molten gold'),
    hl('🐟', 'Daily Catch from the Dhows', "Line-caught fish and prawns delivered each morning from Kilifi's fishing dhows"),
    hl('🔥', 'Fire-Kissed Mains', 'Open-fire cooking rooted in Mijikenda and Swahili coastal traditions'),
    hl('🌴', 'Barefoot on Bofa Beach', 'Tables looking straight out over the Indian Ocean, palms above and sand underfoot'),
    hl('🍷', 'Curated Cellar', 'Old World wines, signature cocktails and a considered list of African spirits'),
  ],
  description: [
    qf('✦ Restaurant Info', 'teal', [
      { icon: '📍', label: 'Location', value: 'Bofa Beach, Kilifi' },
      { icon: '🍽️', label: 'Cuisine', value: 'Seafood, coastal, Mediterranean' },
      { icon: '💰', label: 'Price Range', value: 'KSh 950 to 4,200 per plate' },
      { icon: '⏰', label: 'Hours', value: '7 days, 7:30am – 10:00pm' },
      { icon: '🎵', label: 'Live Music', value: 'Sunset sessions every Friday' },
      { icon: '⭐', label: 'Known For', value: 'Lobster, prawns, daily catch, sunset' },
    ]),
    t('Tribal — Coastal Dining Beneath the Palms', 'h2'),
    t("Tribal sits on the white sand of Bofa Beach in Kilifi, where the palms meet the Indian Ocean and the kitchen takes its cues from the tide. The concept is simple and deeply rooted in place: fresh seafood, fire-kissed mains and barefoot sunsets, served at a curated table on the edge of the coast. The dining room opens onto the beach, the sea breeze carries through every plate, and the rhythm of the day is set by the dhows arriving with the morning catch."),
    t("The kitchen draws from the Mijikenda coastline, the old Swahili port traders and the open-fire traditions that have fed this coast for generations. Produce comes from nearby farms, fish is hauled in at dawn, and spices are blended in-house. The menu reads like a love letter to the ocean — Gambas Pil Pil simmered in olive oil, garlic and bullet chillies; tuna carpaccio dressed in lemon and capers; coastal fish tacos with mango salsa; whole lobster with herb butter; tagliata di manzo with rocket and parmesan. Mains run from around KSh 1,500 to 4,200, with starters and small plates from KSh 950."),
    t("Beyond the food, Tribal has built a reputation for atmosphere. Friday nights bring the Sunset Sessions — live acoustic sets that begin as the sky turns molten gold and continue into the evening. The cellar is well chosen, weighted toward Old World wines, with a small but considered list of African spirits and signature cocktails. Service is warm and unhurried; the dress code is smart casual, and bare feet are explicitly welcome."),
    tc('tip', '🦞', 'Order the Lobster', 'The whole lobster with chips at KSh 4,200 is the dish guests come back for. Pair it with a glass from the cellar and aim for a table angled toward the sunset.'),
    tc('teal', '🌅', 'Friday Sunset Sessions', 'Time your visit for a Friday evening. The live acoustic sets begin around sunset and the energy lifts the whole room. Reserve a table well in advance — Fridays book out quickly.'),
    tc('amber', '📞', 'Reservations', 'Call +254 707 041 849 or email fnb@tribalsand.com to book. For parties of 8 or more, or full buy-outs and private events, contact the team directly.'),
    wf('Perfect For', [
      { emoji: '💑', heading: 'Couples', text: 'Sunset, palms and a quiet table on the sand' },
      { emoji: '🦞', heading: 'Seafood Lovers', text: 'Whole lobster, line-caught fish and prawns from the morning dhows' },
      { emoji: '🎵', heading: 'Friday Crowd', text: 'Live acoustic sunset sessions every Friday' },
      { emoji: '✨', heading: 'Special Occasions', text: 'Considered cooking, polished service, and an unforgettable beachfront setting' },
    ]),
  ],
  seoTitle: 'Tribal Kilifi — Coastal Dining on Bofa Beach',
  seoDescription: 'Tribal on Bofa Beach, Kilifi. Fresh seafood, whole lobster, fire-kissed mains and live Friday sunset sessions. Open 7 days, 7:30am – 10:00pm.',
  menu: [
    { name: 'Gambas Pil Pil', description: 'Queen prawns simmered in olive oil with slow-roasted garlic and bullet chillies, served with toasted baguette. Signature, spicy.', price: 1800 },
    { name: 'Tuna Carpaccio', description: 'Premium tuna sliced thin, dressed with lemon, olive oil, rocket, red onion and capers. Signature, GF.', price: 1600 },
    { name: 'Pork Belly Candy', description: 'Slow-braised pork belly glazed sticky and caramelised, finished with toasted sesame and parsley. Signature.', price: 1600 },
    { name: 'Smoked Tuna Bruschetta', description: 'House-smoked tuna with horseradish mayo, capers and dill on toasted baguette.', price: 1550 },
    { name: 'Crispy Calamari', description: 'Lightly coated and fried, served with house-made aioli, iceberg and a chilli kick.', price: 1500 },
    { name: 'Coastal Fish Cake', description: 'Snapper blended with herbs, lemon zest and cayenne, fried golden.', price: 1400 },
    { name: 'Nachos', description: 'Corn tortillas, aged cheddar, jalapeños, harissa, lime yogurt and guacamole. Vegetarian.', price: 1200 },
    { name: 'Pita & Hummus', description: 'Warm pita with silky hummus, whole chickpeas, olive oil and smoked paprika. Vegan.', price: 950 },
    { name: 'Coastal Fish Taco', description: 'Golden-fried snapper, mango salsa, guacamole and lime yogurt, with house chips. Signature.', price: 1500 },
    { name: 'Soy-Glazed Chicken Taco', description: 'Honey-soy chicken, gypsy salad, coriander and sesame.', price: 1400 },
    { name: 'Beachside Beef Taco', description: 'Seared beef fillet with pickled onions, kachumbari and warm spices.', price: 1600 },
    { name: 'Shrimp Taco', description: 'Spiced shrimp with avocado, citrus and herbs in soft tortillas. Spicy.', price: 1650 },
    { name: 'Soft-Shell Crab Burger', description: 'Crispy soft-shell crab with spiced mayo, lettuce and lime. Signature.', price: 1950 },
    { name: 'Classic Beef Burger', description: 'Beef patty with cheddar, lettuce, tomato and house sauce, served with chips.', price: 1700 },
    { name: 'Chicken Burger', description: 'Grilled or crispy chicken breast with slaw and garlic aioli, with chips.', price: 1500 },
    { name: 'Garden Veggie Burger', description: 'Chickpea and avocado patty with rocket, tomato and herb yogurt. Vegetarian.', price: 1400 },
    { name: 'Lobster & Chips', description: 'Whole lobster with herb butter, white wine and lemon, served with crisp chips. Signature.', price: 4200 },
    { name: 'Pan-Fried Beef Fillet', description: 'Beef fillet with blue cheese or peppercorn sauce, roasted potatoes, parmesan, truffle oil and onion rings. Signature.', price: 3000 },
    { name: 'Tagliata di Manzo', description: 'Seared beef fillet sliced over rocket, cherry tomatoes, parmesan and aged balsamic. Signature.', price: 2800 },
    { name: 'Seared Yellowfin Tuna', description: 'Sesame-crusted yellowfin, lightly seared, with mango salsa and soy-ginger dressing.', price: 2700 },
    { name: 'Catch of the Day En Papillote', description: 'Line-caught fish baked in parchment with seasonal vegetables and potatoes. GF.', price: 2600 },
    { name: 'Garlic King Prawns', description: 'King prawns sautéed in garlic butter, with lettuce, avocado and chips.', price: 2400 },
    { name: 'Creamy Prawn Linguine', description: 'Linguine with prawns in garlic-paprika cream, finished with chilli and parmesan.', price: 2100 },
    { name: 'Avocado & Prawn Pasta', description: 'Prawns with avocado, lime and garlic over linguine.', price: 2000 },
    { name: 'Ahi Tuna Salad', description: 'Fresh tuna with seasonal vegetables and a light house dressing. GF.', price: 1900 },
    { name: 'Roasted Butternut Tagliatelle', description: 'Butternut, garlic, bullet chilli, toasted seeds, feta and rocket through tagliatelle. Vegetarian.', price: 1700 },
    { name: 'Buddha Bowl', description: 'Falafel, couscous, beetroot, cucumber, seeds, avocado and tahini. Vegan.', price: 1600 },
  ],
}

async function main() {
  console.log(`🍽️ Seeding ${restaurant.title} (Kilifi)...\n`)

  const photos: any[] = []
  if (restaurant.imgUrl) {
    const img = await uploadImg(restaurant.imgUrl, `${restaurant.slug}.jpg`)
    if (img) photos.push(img)
  }

  const menuWithKeys = restaurant.menu.map(m => ({ _key: k(), ...m }))

  const doc: any = {
    _type: 'listing',
    title: restaurant.title,
    slug: { _type: 'slug', current: restaurant.slug },
    type: 'restaurant',
    status: 'published',
    city: 'Kilifi',
    county: 'Kilifi',
    address: restaurant.address,
    hostName: restaurant.hostName,
    bookingType: 'contact_form',
    cuisine: restaurant.cuisine,
    priceRange: restaurant.priceRange,
    openingHours: restaurant.openingHours,
    reservationRequired: true,
    tags: restaurant.tags,
    amenities: restaurant.amenities,
    photos,
    highlights: restaurant.highlights,
    menu: menuWithKeys,
    description: restaurant.description,
    seoTitle: restaurant.seoTitle,
    seoDescription: restaurant.seoDescription,
  }

  const result = await client.create(doc)
  console.log(`  ✅ ${result._id}`)
  console.log(`\n✅ Done — ${restaurant.title} created!`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
