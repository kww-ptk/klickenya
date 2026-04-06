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

// ── POST: Watamu vs Kilifi vs Vipingo Coast Guide ──────

const postBody = [
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ The three destinations at a glance',
    accentColor: 'purple',
    items: [
      { icon: '🐢', label: 'Watamu', value: 'Marine park, eco-tourism, family beaches, Italian food scene' },
      { icon: '✨', label: 'Kilifi', value: 'Bioluminescence, arts scene, bohemian vibe, kitesurf capital' },
      { icon: '⛳', label: 'Vipingo', value: 'Africa\'s only PGA golf course, luxury estate, private beach club' },
      { icon: '📍', label: 'Distance from Mombasa', value: 'Vipingo: 35km · Kilifi: 55km · Watamu: 120km' },
      { icon: '💸', label: 'Budget range', value: 'Kilifi (lowest) → Watamu (mid) → Vipingo (highest)' },
      { icon: '🏖', label: 'Best beach', value: 'All three are exceptional — but very different in character' },
    ],
  },

  textBlock('The honest comparison', 'h2'),
  textBlock('Before we go destination by destination, here\'s the fast version. Watamu is for marine life, eco-tourism, and families who want structured activities and world-class snorkelling. Kilifi is for the culturally curious, the free-spirited, and the kite-surfer who wants to fall into a town rather than a resort. Vipingo is for the golfer, the luxury-seeker, and the family that wants everything on one secure, manicured estate.'),
  textBlock('The single most useful question to ask yourself: "Do I want to discover a place, or do I want a place to take care of me?" If it\'s the former — Kilifi or Watamu. If it\'s the latter — Vipingo.'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { label: '🐢 Watamu', color: 'teal' },
      { label: '✨ Kilifi', color: 'blue' },
      { label: '⛳ Vipingo', color: 'purple' },
    ],
    rows: [
      { criterion: 'Vibe', values: ['Eco-resort · family', 'Bohemian · creative', 'Luxury estate · golf'], winners: [] },
      { criterion: 'Beach quality', values: ['3 stunning bays + marine park', 'Bofa Beach — empty, powdery', 'Private Kuruwitu beach'], winners: [0] },
      { criterion: 'Water sports', values: ['Snorkelling, diving, kayaking', 'Kitesurfing, SUP, dhow cruises', 'Snorkelling, kayaking, sailing'], winners: [] },
      { criterion: 'Nightlife', values: ['Relaxed bar scene', 'Lively — Distant Relatives, Salty\'s', 'Estate events, beach bonfires'], winners: [1] },
      { criterion: 'Food scene', values: ['Strong Italian influence', 'Creative — Food Movement, Salty\'s', 'Resort restaurants'], winners: [0] },
      { criterion: 'Kids', values: ['Excellent — turtle watching, marine park', 'Good — uncrowded beaches', 'Best — Holiday Club, pony rides'], winners: [2] },
      { criterion: 'Budget (per night)', values: ['KSh 5,000–40,000+', 'KSh 2,000–25,000', 'KSh 15,000–80,000+'], winners: [1] },
      { criterion: 'Best for', values: ['Marine life, honeymooners, eco travellers', 'Backpackers, digital nomads, kitesurfers', 'Golfers, luxury couples, large families'], winners: [] },
    ],
  },

  // Watamu section
  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: 1,
    pill: 'Watamu',
    pillColor: 'teal',
    title: 'The marine paradise',
  },
  textBlock('Watamu means "sweet people" in Swahili, and it lives up to the name — an easy-going, sun-drenched village about 120 kilometres north of Mombasa, where Italian expats have lived alongside Kenyan fishing communities for decades. The result is a town with genuine character: freshly caught red snapper served alongside proper Neapolitan pizza, a KWS-protected marine park where hawksbill turtles nest on the beach, and a laid-back atmosphere that draws you in for longer than you planned.'),

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '500+', label: 'fish species in Watamu Marine Park' },
      { number: '3', label: 'distinct bays — Watamu, Blue Lagoon, Turtle Bay' },
      { number: '10 km²', label: 'of protected marine park and reserve' },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🐋',
    label: 'Seasonal highlight — humpback whales',
    text: 'Between July and September, humpback whales migrate through the waters off Watamu on their way from Antarctica. Hemingways Watamu runs responsible whale-watching excursions with marine experts. Book well in advance — spots sell out fast.',
  },

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Watamu verdict',
    title: 'Choose Watamu if you want structured, world-class marine experiences with a relaxed town to come back to.',
    pros: [
      'Kenya\'s finest snorkelling and marine park',
      'Active turtle conservation you can participate in',
      'Whale sharks (Nov–Mar) and humpbacks (Jul–Sep)',
      'Gedi Ruins + Arabuko Forest for land-based days',
      'Excellent food scene with Italian influence',
    ],
    cons: [
      'Seaweed season in September',
      'Limited nightlife',
      'Far from Mombasa (2.5 hrs)',
      'No golf course',
    ],
  },

  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Watamu is perfect for...',
    items: [
      { icon: '🤿', text: 'Snorkelling and diving enthusiasts' },
      { icon: '🐢', text: 'Wildlife and conservation travellers' },
      { icon: '👨‍👩‍👧', text: 'Families with children' },
      { icon: '💑', text: 'Honeymooners wanting eco-luxury' },
      { icon: '📸', text: 'Underwater photographers' },
      { icon: '🦅', text: 'Birders (150+ species in the forest)' },
    ],
  },

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: '120 km north of Mombasa' },
      { icon: 'pin', text: '25 km south of Malindi' },
      { icon: 'clock', text: '2.5–3 hrs drive from Mombasa' },
      { icon: 'clock', text: '~1 hr from Malindi Airport' },
    ],
  },

  // Kilifi section
  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: 2,
    pill: 'Kilifi',
    pillColor: 'blue',
    title: 'Kenya\'s best-kept secret',
  },
  textBlock('Kilifi is what happens when a coastal town hasn\'t been fully discovered yet — and the word is now spreading fast. Sandwiched between Mombasa and Watamu, 55 kilometres north of the city, Kilifi is built around a spectacular tidal creek where the water is calm, the sunsets are outrageous, and on certain dark nights, the creek itself glows electric blue.'),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'Kilifi reminds me of Canggu before it got famous, or Puerto Escondido before the crowds arrived. It has that rare energy of a place on the edge of something — creative, authentic, and still completely itself.',
    attribution: '— The Partying Traveler, updated 2026',
    accentColor: 'purple',
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'purple',
    icon: '✨',
    label: 'The unmissable experience — bioluminescent plankton',
    text: 'On dark nights — especially around the new moon — Fumbini Beach on Kilifi Creek comes alive with bioluminescent plankton. Every movement in the water ignites blue light around you. Best months are November to April. No equipment needed — just wade in after dark.',
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '55 km', label: 'north of Mombasa — about 1.5 hrs' },
      { number: '2003', label: 'year the Kilifi Gold Triathlon began' },
      { number: 'Jun–Sep', label: 'peak kite season with trade winds' },
    ],
  },

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'blue',
    label: 'Kilifi verdict',
    title: 'Choose Kilifi if you want to discover a place rather than be taken care of. The reward is enormous.',
    pros: [
      'Bioluminescent plankton — genuinely bucket-list',
      'Bofa Beach — empty, pristine, no hawkers',
      'Best nightlife on the north coast',
      'East Africa\'s best kitesurfing conditions',
      'Most affordable of the three destinations',
    ],
    cons: [
      'Limited luxury accommodation options',
      'Infrastructure is basic in places',
      'Beach can have seaweed seasonally',
      'Not ideal if you want everything organised for you',
    ],
  },

  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Kilifi is perfect for...',
    items: [
      { icon: '🏄', text: 'Kitesurfers and water sports enthusiasts' },
      { icon: '💻', text: 'Digital nomads seeking community' },
      { icon: '🎨', text: 'Creatives and culture seekers' },
      { icon: '🎒', text: 'Budget-conscious travellers' },
      { icon: '🌙', text: 'Night owls who love a scene' },
      { icon: '🧘', text: 'Yoga and wellness retreaters' },
    ],
  },

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: '55 km north of Mombasa' },
      { icon: 'pin', text: '65 km south of Watamu' },
      { icon: 'clock', text: '1.5 hrs from Mombasa' },
      { icon: 'clock', text: '45 min from Malindi Airport' },
    ],
  },

  // Vipingo section
  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: 3,
    pill: 'Vipingo',
    pillColor: 'purple',
    title: 'The luxury estate',
  },
  textBlock('Vipingo Ridge is not a town — it\'s a 2,500-acre private estate perched on coral cliffs above the Indian Ocean, 35 kilometres north of Mombasa. At its centre: Africa\'s only PGA-standard golf course, designed by David Jones, with the ocean visible from 13 of its 18 holes. Everything here is manicured, gated, and designed to make you forget the outside world exists.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'purple',
    icon: '⛳',
    label: 'Golf at Vipingo Ridge',
    text: 'The course is open to non-residents but booking is essential, especially on weekends. Green fees are KSh 8,000–12,000 for visitors. Twilight rates (after 2 PM) offer better value and the best light for the ocean-view holes.',
  },

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'purple',
    label: 'Vipingo verdict',
    title: 'Choose Vipingo if you want a polished, secure, everything-in-one-place experience.',
    pros: [
      'Africa\'s only PGA golf course',
      'Private beach club with no crowds',
      'Excellent kids\' programmes and family facilities',
      'Closest to Mombasa — easy access',
      'Gated estate with 24/7 security',
    ],
    cons: [
      'Most expensive option by far',
      'Feels insulated from real Kenya',
      'Limited restaurant variety outside the estate',
      'Not for backpackers or independent explorers',
    ],
  },

  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Vipingo is perfect for...',
    items: [
      { icon: '⛳', text: 'Golfers (obviously)' },
      { icon: '👔', text: 'Corporate retreat groups' },
      { icon: '👨‍👩‍👧‍👦', text: 'Large families wanting kids\' programmes' },
      { icon: '💎', text: 'Luxury travellers who value privacy' },
      { icon: '🏡', text: 'Property investors scouting the coast' },
      { icon: '🛬', text: 'Short-stay visitors (closest to Mombasa)' },
    ],
  },

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: '35 km north of Mombasa' },
      { icon: 'clock', text: '35 min from Moi International Airport' },
      { icon: 'clock', text: 'Direct flight to estate airstrip available' },
    ],
  },

  textBlock('The final decision', 'h2'),
  textBlock('Still not sure? Here\'s the simplest way to decide.'),

  {
    _type: 'deciderGridBlock',
    _key: key(),
    cards: [
      {
        label: 'Watamu',
        color: 'teal',
        title: 'Pick Watamu if you want...',
        items: [
          'World-class snorkelling and marine life',
          'A relaxed eco-tourism vibe',
          'Italian-influenced food scene',
          'Activities for the whole family',
          'Turtle conservation experiences',
        ],
      },
      {
        label: 'Kilifi',
        color: 'blue',
        title: 'Pick Kilifi if you want...',
        items: [
          'Bioluminescent plankton at night',
          'East Africa\'s best kitesurfing',
          'A creative, bohemian community',
          'Budget-friendly beach holiday',
          'The best nightlife on the coast',
        ],
      },
      {
        label: 'Vipingo',
        color: 'purple',
        title: 'Pick Vipingo if you want...',
        items: [
          'Africa\'s only PGA golf course',
          'Private beach club exclusivity',
          'Structured kids\' programmes',
          'Gated security and convenience',
          'Closest beach to Mombasa',
        ],
      },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '💡',
    label: 'Can\'t choose? Combine them',
    text: 'With 10+ days on the coast, you can easily split your time: start in Vipingo for golf and relaxation, move to Kilifi for culture and nightlife, and finish in Watamu for marine adventures. All three are on the same road.',
  },
]

async function push() {
  console.log('Pushing: Watamu, Kilifi, or Vipingo? Coast Guide...')

  await client.createOrReplace({
    _id: 'blog-watamu-kilifi-vipingo-coast-guide',
    _type: 'blogPost',
    title: 'Watamu, Kilifi, or Vipingo? How to Choose Your Kenya Coast Base (2026 Guide)',
    slug: { _type: 'slug', current: 'watamu-kilifi-vipingo-kenya-coast-guide' },
    status: 'published',
    excerpt: 'Trying to choose between Watamu, Kilifi, and Vipingo for your Kenya coast holiday? We break down each destination by vibe, activities, budget, and who it\'s really for.',
    tags: ['Beach', 'Coast', 'Budget Travel'],
    readingTime: 10,
    publishedAt: '2026-03-14T08:00:00Z',
    body: postBody,
  })

  console.log('✓ Done: watamu-kilifi-vipingo-kenya-coast-guide')
}

push().catch((err) => {
  console.error('Push failed:', err)
  process.exit(1)
})
