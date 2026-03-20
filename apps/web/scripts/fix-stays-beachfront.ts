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

function highlight(emoji: string, title: string, description: string) {
  return { _type: 'object', _key: key(), emoji, title, description }
}

async function main() {
  console.log('🏖️ Fixing stays: beachfront tags, remove Horsebay, update Zuri & Maya Kobe\n')

  // ── 1. DELETE Horsebay ──
  const horsebayId = '3fVk255H0aipQzY5mJQooa'
  console.log('  🗑️ Deleting Horsebay Watamu...')
  await client.delete(horsebayId)
  console.log('    ✅ Deleted\n')

  // ── 2. Add "beachfront" tag to ALL stays ──
  const stays: any[] = await client.fetch(
    '*[_type == "listing" && type == "stay"]{ _id, title, tags }'
  )
  for (const s of stays) {
    const tags: string[] = s.tags || []
    if (!tags.includes('beachfront')) {
      tags.push('beachfront')
      await client.patch(s._id).set({ tags }).commit()
      console.log(`  🏷️ Added "beachfront" tag → ${s.title}`)
    }
  }
  console.log('')

  // ── 3. Update ZURI BOUTIQUE HOTEL — beachfront description + highlights ──
  const zuriId = '3fVk255H0aipQzY5mJQoLw'
  console.log('  ✏️ Updating Zuri Boutique Hotel...')
  await client.patch(zuriId).set({
    description: [
      textBlock('Zuri Boutique Hotel — Watamu', 'h2'),
      textBlock('A stylish beachfront boutique hotel in the heart of Watamu, where modern design meets barefoot coastal living. Zuri (meaning "beautiful" in Swahili) is steps from the white sand and turquoise waters of Watamu Beach, delivering an intimate, design-forward stay with personalized service. Perfect for couples, solo travellers, and creatives seeking a refined coastal escape without losing that feet-in-the-sand feeling.'),
      textBlock('Rooms & Amenities', 'h3'),
      textBlock('Beautifully designed rooms with en-suite bathrooms, air conditioning, and high-quality linens. Each room features curated decor with local art and natural materials — some with direct ocean views. Complimentary Wi-Fi throughout the property. Communal lounge and terrace areas overlooking the beach. Daily housekeeping included.'),
      textBlock('Beachfront Location', 'h3'),
      textBlock('Wake up to the sound of waves. Zuri sits directly on Watamu\'s coastline — walk out the door and your toes are in the sand. The property overlooks the Indian Ocean with uninterrupted views of the turquoise water and white sandbars that Watamu is famous for. Sunsets from the terrace are unforgettable.'),
      textBlock('Getting Around', 'h3'),
      textBlock('The hotel is within easy reach of Garoda Beach, Jacaranda Beach, and Watamu\'s best restaurants. Airport transfers from Malindi (approx. 20 minutes) are arranged. Walking distance to beach bars and dining options. Ideal as a base for exploring Mida Creek and the marine park.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Check-in from 2 PM, check-out by 11 AM. Breakfast included in the rate. The hotel can arrange excursions including kitesurfing lessons, dhow cruises, snorkeling trips, and visits to Gede Ruins. Dietary requirements accommodated with advance notice.'),
    ],
    tags: ['boutique', 'watamu', 'hotel', 'beachfront', 'design', 'couples', 'wifi', 'breakfast-included', 'ocean-view', 'sunset'],
    highlights: [
      highlight('🏖️', 'Beachfront Location', 'Steps from white sand and turquoise waters'),
      highlight('🌅', 'Ocean Views', 'Uninterrupted Indian Ocean views and sunsets'),
      highlight('🍳', 'Breakfast Included', 'Daily breakfast with local and international options'),
      highlight('📶', 'Free Wi-Fi', 'Reliable internet throughout the property'),
      highlight('❄️', 'Air Conditioning', 'Climate-controlled rooms for your comfort'),
      highlight('🤿', 'Excursions', 'Kitesurfing, snorkeling, and dhow cruises bookable'),
    ],
  }).commit()
  console.log('    ✅ Zuri updated with beachfront details\n')

  // ── 4. Update MAYA KOBE BOUTIQUE HOTEL — beachfront description + highlights ──
  const mayaId = 'cH0KO5p7sKjW2U8Zdci1D9'
  console.log('  ✏️ Updating Maya Kobe Boutique Hotel...')
  await client.patch(mayaId).set({
    description: [
      textBlock('Maya Kobe Boutique Hotel — Kilifi', 'h2'),
      textBlock('A contemporary beachfront boutique hotel on the shores of Kilifi, where modern architecture meets the raw beauty of the Kenyan coast. Maya Kobe sits directly on the waterfront with panoramic views of Kilifi Creek and the Indian Ocean — offering a stylish yet affordable stay for travellers who want design, comfort, and the ocean at their doorstep.'),
      textBlock('Rooms & Amenities', 'h3'),
      textBlock('Modern rooms with clean lines, quality furnishings, and en-suite bathrooms. Many rooms feature private balconies with ocean or creek views. Air conditioning and ceiling fans in all rooms. Complimentary high-speed Wi-Fi — excellent for remote work. Pool overlooking the water. Daily housekeeping and fresh towels.'),
      textBlock('Beachfront & Creek Views', 'h3'),
      textBlock('The hotel\'s standout feature is its waterfront position. Watch traditional dhows sail past from your balcony. The creek changes colour with the tides — deep emerald at high tide, golden sandbanks at low tide. Direct access to the water for swimming and kayaking. The pool area faces the ocean, making it one of the most scenic spots in Kilifi.'),
      textBlock('Location & Surroundings', 'h3'),
      textBlock('Kilifi is the creative hub of Kenya\'s coast — bohemian atmosphere, world-class restaurants (Saltys, Twisted Fig, Kilifi Boatyard), and the stunning Kilifi Creek. A 30-minute drive from Watamu and 1 hour from Mombasa. The hotel is a gateway to Bofa Beach, Arabuko-Sokoke Forest, and the vibrant local food scene.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Check-in from 2 PM, check-out by 11 AM. Breakfast available. The hotel can arrange day trips to Watamu, Malindi, and local cultural sites. Kilifi is also a popular base for kitesurfing (Saltys Kitesurf Village is nearby). Ideal for digital nomads, couples, and anyone who wants to wake up to the water.'),
    ],
    tags: ['boutique', 'kilifi', 'hotel', 'beachfront', 'modern', 'wifi', 'digital-nomad', 'affordable', 'ocean-view', 'creek', 'pool'],
    highlights: [
      highlight('🏖️', 'Beachfront on Kilifi Creek', 'Direct waterfront with ocean and creek views'),
      highlight('🌊', 'Pool with Ocean View', 'Swim overlooking the Indian Ocean'),
      highlight('💻', 'Remote Work Ready', 'High-speed Wi-Fi and a stunning workspace'),
      highlight('🛶', 'Water Access', 'Kayaking and swimming from the property'),
      highlight('🍽️', 'World-Class Dining Nearby', 'Saltys, Twisted Fig, Kilifi Boatyard minutes away'),
      highlight('🪁', 'Kitesurfing Hub', 'Saltys Kitesurf Village a short drive away'),
    ],
  }).commit()
  console.log('    ✅ Maya Kobe updated with beachfront details\n')

  console.log('✅ All done!')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
