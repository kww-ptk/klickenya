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
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }
}

function richText(children: Array<{ text: string; bold?: boolean; link?: string }>): any {
  const markDefs: any[] = []
  const spans = children.map((c) => {
    const marks: string[] = []
    if (c.bold) marks.push('strong')
    if (c.link) {
      const linkKey = key()
      markDefs.push({ _type: 'link', _key: linkKey, href: c.link, blank: false })
      marks.push(linkKey)
    }
    return { _type: 'span', _key: key(), text: c.text, marks }
  })
  return { _type: 'block', _key: key(), style: 'normal', markDefs, children: spans }
}

function placeholder(caption?: string): any {
  return {
    _type: 'photoRowBlock',
    _key: key(),
    layout: 'hero-full',
    photos: [{ alt: caption ?? 'Watamu', aspectRatio: 'wide' }],
    caption: caption ?? '',
  }
}

// ══════════════════════════════════════════════════════
// WATAMU AREAS: NEIGHBOURHOOD GUIDE 2026
// ══════════════════════════════════════════════════════

const body = [

  // ── Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Watamu Areas at a Glance',
    accentColor: 'teal',
    items: [
      { icon: '🗺️', label: 'Total areas', value: '7 distinct neighbourhoods' },
      { icon: '🛺', label: 'Between areas', value: 'KSh 200 to 500 by tuk-tuk' },
      { icon: '🚶', label: 'Walkable', value: 'Town centre and Turtle Bay' },
      { icon: '🏖️', label: 'Best beach', value: 'Garoda or Blue Lagoon' },
      { icon: '🍕', label: 'Best for food', value: 'Watamu Town Centre' },
      { icon: '🤿', label: 'Best for marine', value: 'Seven Islands area' },
    ],
  },

  // ── Map placeholder ──
  placeholder('Map of Watamu — add your map image here'),

  // ── Intro ──
  textBlock('Watamu Areas Explained', 'h2'),

  textBlock('Watamu is small enough to explore in a day but varied enough that where you stay genuinely changes your experience. A family in Turtle Bay and a kitesurfer at Garoda are technically in the same village, but living in completely different Watamus. This guide breaks down every area so you can choose the right base before you book.'),

  richText([
    { text: 'The good news: no area is more than 15 minutes from any other by tuk-tuk. You can stay in one neighbourhood and explore all of them easily. But ' },
    { text: 'choosing the right base saves money, stress, and tuk-tuk fares', bold: true },
    { text: '.' },
  ]),

  // ── Comparison Table (TOP) ──
  textBlock('All Watamu Areas Compared', 'h2'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: 'Area', color: 'amber' },
      { _key: key(), label: 'Vibe', color: 'teal' },
      { _key: key(), label: 'Best for', color: 'blue' },
      { _key: key(), label: 'Beach', color: 'purple' },
      { _key: key(), label: 'Restaurants', color: 'teal' },
    ],
    rows: [
      { _key: key(), criterion: 'Watamu Town Centre', values: ['Lively, local, social', 'Budget travellers, foodies', 'Decent town beach', 'Excellent — most choice'] },
      { _key: key(), criterion: 'Turtle Bay', values: ['Resort, calm, family', 'Families, snorkellers', 'Outstanding — calm lagoon', 'Several resort options'] },
      { _key: key(), criterion: 'Timboni', values: ['Quiet, residential, local', 'Long stays, expat crowd', 'Good access to Turtle Bay', 'Limited — need transport'] },
      { _key: key(), criterion: 'Blue Lagoon / Jacaranda', values: ['Secluded, romantic, beautiful', 'Couples, honeymooners', 'Stunning turquoise lagoon', 'Very few'] },
      { _key: key(), criterion: 'Garoda Beach', values: ['Wild, natural, sporty', 'Kite surfers, adventurers', 'Wide, empty, dramatic', 'Almost none'] },
      { _key: key(), criterion: 'Seven Islands', values: ['Remote, reef, conservation', 'Marine life lovers, divers', 'Coral reef and sandbanks', 'None — bring everything'] },
      { _key: key(), criterion: 'Mida Creek', values: ['Bohemian, nature, sunset', 'Nature lovers, slow travellers', 'Creek, no swimming beach', 'A handful of excellent spots'] },
    ],
  },

  placeholder('Watamu coastline aerial view'),

  // ── Who Is It For ──
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Which area is right for you?',
    items: [
      { icon: '👨‍👩‍👧', text: 'Families with children: Turtle Bay — calm water, resort facilities, safe beaches' },
      { icon: '🪁', text: 'Kite surfers: Garoda Beach — the flat water lagoon and IKO schools are all here' },
      { icon: '🤿', text: 'Divers and snorkellers: Seven Islands area — the marine park is your backyard' },
      { icon: '💑', text: 'Couples on honeymoon: Blue Lagoon or Jacaranda — seclusion and beauty' },
      { icon: '🍝', text: 'Foodies and social travellers: Watamu Town Centre — walkable to everything' },
      { icon: '🌿', text: 'Nature and bird lovers: Mida Creek — mangroves, birds, and peace' },
      { icon: '🏡', text: 'Long-stay expats: Timboni — quiet, residential, good value villas' },
    ],
  },

  // ══════════════════════════════════════════════════════
  // AREA 1: WATAMU TOWN CENTRE
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '01',
    pill: 'The Hub',
    pillColor: 'amber',
    title: 'Watamu Town Centre',
  },

  textBlock('Watamu Town Centre is where everything happens. The main strip runs along the beach road and is lined with restaurants, souvenir shops, tour operators, M-Pesa agents, pharmacies, and beach bars. It is the most walkable part of Watamu and the best base if you want to be close to food, nightlife, and services without needing a tuk-tuk for every errand.'),

  richText([
    { text: 'The beach here is decent but not the most beautiful in Watamu. It gets busy during peak season and is actively worked by beach vendors. ' },
    { text: 'If you want to swim and snorkel, you are better off taking a boat out', bold: true },
    { text: ' or hopping on a tuk-tuk to Turtle Bay. But for the overall village experience, the food scene, and the social energy, town centre is the place to be.' },
  ]),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'amber',
    label: 'Town Centre verdict',
    title: 'The social heart of Watamu. Best food, best access, most energy.',
    pros: [
      'Walking distance to 30+ restaurants and bars',
      'ATMs, pharmacy, market, and shops all nearby',
      'Best base for nightlife at Sunset Lab and Paparemo',
      'Budget guesthouses and affordable options available',
      'Easy tuk-tuk access to all other areas',
    ],
    cons: [
      'Beach gets busy and vendors can be persistent',
      'Noisier than other areas, especially on weekends',
      'Not the most scenic or peaceful setting',
    ],
  },

  placeholder('Watamu Town Centre beach strip'),

  // ══════════════════════════════════════════════════════
  // AREA 2: TURTLE BAY
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '02',
    pill: 'Best Beach',
    pillColor: 'teal',
    title: 'Turtle Bay',
  },

  textBlock('Turtle Bay is the beach that makes people fall in love with Watamu. The bay is sheltered by a reef that creates a natural lagoon: calm, clear, turquoise water that is safe for children and ideal for snorkelling. At low tide the lagoon becomes shallow enough to walk across to the sandbanks. At high tide it fills with fish.'),

  richText([
    { text: 'Most of the established resort hotels are located along Turtle Bay. This is the area you will see in most Watamu brochures and photos. It is also the best spot to arrange ' },
    { text: 'glass-bottom boat trips and snorkelling excursions', bold: true },
    { text: ' into the marine park, as boat operators are based here.' },
  ]),

  textBlock('The beach is wider and more open than the town beach, with proper facilities at the resorts. Even if you are not staying here, Turtle Bay is worth a visit for a morning swim and lunch at one of the hotels.'),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Turtle Bay verdict',
    title: 'The most beautiful bay in Watamu. Ideal for families and first-time visitors.',
    pros: [
      'Calm, sheltered lagoon — safe for children and non-swimmers',
      'Outstanding snorkelling directly from the beach',
      'Best-established resort hotels in Watamu',
      'Glass-bottom boats and marine park tours depart from here',
      'Stunning white sand and turquoise water',
    ],
    cons: [
      'More expensive than town centre accommodation',
      'Fewer restaurant options outside the resort hotels',
      'Can feel removed from the local village energy',
    ],
  },

  placeholder('Turtle Bay lagoon at low tide'),

  // ══════════════════════════════════════════════════════
  // AREA 3: TIMBONI
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '03',
    pill: 'Quiet Village',
    pillColor: 'blue',
    title: 'Timboni',
  },

  textBlock('Timboni sits between Watamu Town and Turtle Bay, slightly inland from the main beach road. It is the quietest and most residential part of Watamu: a neighbourhood of villas, gardens, and local homes rather than hotels and beach bars. Many long-term expats and seasonal residents base themselves here.'),

  richText([
    { text: 'There is no direct beach access from Timboni, but you are a short tuk-tuk ride from both the town beach and Turtle Bay. The trade-off is ' },
    { text: 'significantly lower prices for accommodation', bold: true },
    { text: ' and a much more peaceful, authentic feel. If you are staying for a week or more and want to cook your own meals, rent a scooter, and live a bit more like a local, Timboni is worth considering.' },
  ]),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'blue',
    label: 'Timboni verdict',
    title: 'The quiet residential base. Best value for longer stays.',
    pros: [
      'Most affordable villa rentals in the Watamu area',
      'Peaceful and residential, away from tourist noise',
      'Popular with long-stay visitors and expats',
      'Easy access to both town and Turtle Bay by tuk-tuk',
    ],
    cons: [
      'No direct beach access',
      'Limited walking-distance restaurants or services',
      'Requires tuk-tuk or scooter for most outings',
    ],
  },

  placeholder('Timboni residential area, Watamu'),

  // ══════════════════════════════════════════════════════
  // AREA 4: BLUE LAGOON / JACARANDA BEACH
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '04',
    pill: 'Most Beautiful',
    pillColor: 'purple',
    title: 'Blue Lagoon and Jacaranda Beach',
  },

  richText([
    { text: 'Blue Lagoon is arguably the most photogenic stretch of coastline in all of Watamu. The water here shifts from pale turquoise to deep blue depending on the tide, and the sand is powder-white. ' },
    { text: 'This is where the best drone photos of Watamu come from.', bold: true },
  ]),

  textBlock('Jacaranda Beach is the stretch of coast just north of Blue Lagoon, backed by the Jacaranda Hotel and a handful of smaller villas. Together they form the quietest, most secluded part of Watamu that still has some accommodation options. There are almost no restaurants or shops within walking distance, which is exactly the point.'),

  textBlock('Couples and honeymooners consistently rank this area as their favourite. If you want beauty and privacy over convenience, Blue Lagoon and Jacaranda are the answer.'),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'purple',
    label: 'Blue Lagoon verdict',
    title: 'The most beautiful beach in Watamu. Pure seclusion and stunning scenery.',
    pros: [
      'Arguably the most beautiful water colour in Watamu',
      'Very few tourists and minimal beach vendors',
      'Ideal for couples, honeymooners, and photographers',
      'Peaceful and private compared to Turtle Bay and town',
    ],
    cons: [
      'Virtually no restaurants or shops within walking distance',
      'Requires transport for everything including food and groceries',
      'Limited accommodation options compared to other areas',
    ],
  },

  placeholder('Blue Lagoon Watamu — turquoise water'),

  // ══════════════════════════════════════════════════════
  // AREA 5: GARODA BEACH
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '05',
    pill: 'Kite Capital',
    pillColor: 'teal',
    title: 'Garoda Beach',
  },

  richText([
    { text: 'Garoda Beach is at the southern end of Watamu, where the coast widens into a dramatic, windswept stretch of open sand. This is ' },
    { text: "Kenya's kite surfing capital", bold: true },
    { text: '. The shallow, flat lagoon created by the reef is perfectly designed for learning: consistent depth, no boat traffic, and Kusi trade winds blowing at 15 to 25 knots from June to October.' },
  ]),

  textBlock('Several IKO-certified kite schools are based here, offering lessons from beginner to advanced. The beach itself is far less developed than Turtle Bay: wider, emptier, and more dramatic. You will not find resort hotels here but there are a few guesthouses and villa rentals within walking distance of the beach.'),

  richText([
    { text: 'Even if you are not a kite surfer, Garoda is worth a visit for the beach itself. ' },
    { text: 'Some regulars argue it is the most beautiful in Watamu', bold: true },
    { text: ' once you account for the drama and the emptiness.' },
  ]),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Garoda Beach verdict',
    title: "Kenya's best kitesurfing beach. Wild, empty, and spectacular.",
    pros: [
      'The best kitesurfing conditions in Kenya, June to October',
      'Multiple IKO-certified schools for all levels',
      'Wide, uncrowded beach with minimal vendors',
      'Dramatic and photogenic — a different side of Watamu',
      'Lichthaus Creek nearby for sundowners',
    ],
    cons: [
      'Very little infrastructure — no shops or restaurants on the beach',
      'Strong winds and currents can be dangerous for casual swimmers',
      'Transport needed for everything including meals',
    ],
  },

  placeholder('Garoda Beach kite surfers, Watamu'),

  // ══════════════════════════════════════════════════════
  // AREA 6: SEVEN ISLANDS
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '06',
    pill: 'Marine Park',
    pillColor: 'blue',
    title: 'Seven Islands and the Marine Park',
  },

  textBlock('The Seven Islands are a group of small coral outcrops sitting within the Watamu Marine National Park, a few kilometres offshore. They are not permanently inhabited and you reach them by boat from Turtle Bay or the town beach. This is the heart of Watamu\'s marine park ecosystem.'),

  richText([
    { text: 'The snorkelling around the islands is the best in the Watamu area. ' },
    { text: 'Sea turtles, moray eels, parrotfish, lionfish, and reef sharks', bold: true },
    { text: ' are regularly spotted. The coral itself is among the healthiest on the Kenya coast, largely because the marine park regulations are actively enforced.' },
  ]),

  textBlock('Nobody stays on the islands themselves, but some visitors rent boats for the full day and spend several hours moving between different snorkelling spots. The sandbanks between the islands appear at low tide and are spectacular at sunrise. Dhow trips from town often anchor here for lunch.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🤿',
    label: 'How to visit the Seven Islands',
    text: 'Book a snorkelling trip from Turtle Bay or the town beach. Half-day trips cost KSh 1,500 to 3,000 per person including park entry fees. Full-day dhow trips with lunch on the beach cost KSh 3,000 to 6,000. Go in the morning for the best visibility and calmer conditions.',
  },

  placeholder('Seven Islands coral reef, Watamu Marine Park'),

  // ══════════════════════════════════════════════════════
  // AREA 7: MIDA CREEK
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '07',
    pill: 'Nature and Sunsets',
    pillColor: 'amber',
    title: 'Mida Creek',
  },

  textBlock('Mida Creek is a tidal inlet stretching inland from the coast, surrounded by mangrove forest and designated as a bird sanctuary. It is not a beach destination but one of the most atmospheric places in the entire Watamu area. The creek changes completely depending on the tide: at high tide it becomes a wide, glassy channel; at low tide a patchwork of mudflats and exposed coral.'),

  richText([
    { text: 'The community-run boardwalk lets you walk through the mangroves at low tide, and canoe trips are available at high tide for around KSh 1,000 to 2,000 per person. Over ' },
    { text: '350 bird species have been recorded here', bold: true },
    { text: ', including kingfishers, herons, and migratory waders.' },
  ]),

  richText([
    { text: 'Lichthaus, one of the most beloved venues in Watamu, is located right on the creek. ' },
    { text: 'Sundowners here with a swim in the creek are a Watamu rite of passage.', bold: true },
    { text: ' The light on the water at 5:30pm in this spot is genuinely one of the most beautiful things on the Kenya coast.' },
  ]),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'The light on Mida Creek at sunset is the kind of thing you photograph and then realise no photograph does it justice.',
    attribution: 'Regular Watamu visitor',
    accentColor: 'amber',
  },

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'amber',
    label: 'Mida Creek verdict',
    title: 'The most atmospheric spot in Watamu. Essential for nature lovers and sunset seekers.',
    pros: [
      'Stunning natural landscape unlike anywhere else on the coast',
      'Outstanding bird watching with 350 plus species recorded',
      'Lichthaus venue for sundowners right on the creek',
      'Mangrove canoe trips and low-tide boardwalk walks',
      'Calm and peaceful, very few tourists',
    ],
    cons: [
      'Not a swimming beach, the creek has mud and mangrove roots at low tide',
      'Requires a tuk-tuk from Watamu town',
      'Mosquitoes at dusk, bring repellent',
    ],
  },

  placeholder('Mida Creek at sunset, Watamu'),

  // ══════════════════════════════════════════════════════
  // GETTING BETWEEN AREAS
  // ══════════════════════════════════════════════════════

  textBlock('Getting Between Areas', 'h2'),

  textBlock('Every area in Watamu is within 15 minutes of every other area. Tuk-tuks are the standard way to move around and are available throughout the day and late into the night.'),

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'clock', text: 'Town Centre to Turtle Bay: 5 to 10 min, KSh 200 to 300' },
      { icon: 'clock', text: 'Town Centre to Garoda Beach: 10 to 15 min, KSh 300 to 500' },
      { icon: 'clock', text: 'Town Centre to Blue Lagoon: 10 min, KSh 300 to 400' },
      { icon: 'clock', text: 'Town Centre to Mida Creek: 10 to 15 min, KSh 300 to 500' },
      { icon: 'clock', text: 'Turtle Bay to Garoda: 10 min, KSh 300 to 400' },
      { icon: 'clock', text: 'Night surcharge after 10pm: add KSh 100 to 200' },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🛺',
    label: 'Always agree the fare first',
    text: 'Tuk-tuk fares in Watamu are not metered. Always agree the price before getting in. Most drivers know all the areas and venues by name. Motorbikes (boda boda) are faster and cheaper for solo trips, at KSh 100 to 300. Always carry cash.',
  },

  placeholder('Tuk-tuk on the Watamu beach road'),

  // ══════════════════════════════════════════════════════
  // DECIDER GRID
  // ══════════════════════════════════════════════════════

  textBlock('The Quick Decider', 'h2'),

  {
    _type: 'deciderGridBlock',
    _key: key(),
    cards: [
      {
        _key: key(),
        label: 'Best overall base',
        color: 'amber',
        title: 'Watamu Town Centre',
        items: ['Walking distance to everything', 'Best restaurant choice', 'Most social energy', 'Budget to mid-range options'],
      },
      {
        _key: key(),
        label: 'Best beach and swimming',
        color: 'teal',
        title: 'Turtle Bay',
        items: ['Calm sheltered lagoon', 'Safe for families', 'Snorkelling from the beach', 'Resort-quality facilities'],
      },
      {
        _key: key(),
        label: 'Most beautiful and secluded',
        color: 'purple',
        title: 'Blue Lagoon',
        items: ['Stunning turquoise water', 'Very few tourists', 'Ideal for couples', 'No vendors or noise'],
      },
      {
        _key: key(),
        label: 'Best for kite surfing',
        color: 'teal',
        title: 'Garoda Beach',
        items: ['Flat water lagoon', 'IKO certified schools', 'Best June to October', 'Wide empty beach'],
      },
      {
        _key: key(),
        label: 'Best for nature',
        color: 'amber',
        title: 'Mida Creek',
        items: ['350 plus bird species', 'Mangrove canoe trips', 'Lichthaus sundowners', 'Boardwalk at low tide'],
      },
      {
        _key: key(),
        label: 'Best for marine life',
        color: 'blue',
        title: 'Seven Islands',
        items: ['Best snorkelling in Watamu', 'Sea turtles and reef fish', 'Coral park protected', 'Day trip from any area'],
      },
    ],
  },

  // ── Internal Links ──
  richText([
    { text: 'Ready to book? Browse all ' },
    { text: 'verified stays in Watamu', bold: true, link: '/stays/watamu' },
    { text: ', explore ' },
    { text: 'things to do', bold: true, link: '/experiences/watamu' },
    { text: ', or read the ' },
    { text: 'complete Watamu travel guide', bold: true, link: '/journal/complete-guide-watamu-kenya-2026' },
    { text: '.' },
  ]),
]

// ══════════════════════════════════════════════════════
// Seed
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('Seeding Watamu areas neighbourhood guide...\n')

  try {
    await client.delete('drafts.blog-watamu-areas-neighbourhood-guide')
    console.log('✓ Cleared existing draft')
  } catch {
    // No draft
  }

  await client.createOrReplace({
    _id: 'blog-watamu-areas-neighbourhood-guide',
    _type: 'blogPost',
    title: 'Watamu Areas Explained: Your Complete Neighbourhood Guide (Garoda, Timboni, Turtle Bay, Seven Islands and More)',
    slug: { _type: 'slug', current: 'watamu-areas-neighbourhood-guide' },
    status: 'published',
    excerpt:
      'Where you stay in Watamu changes everything. This guide breaks down every neighbourhood, from Turtle Bay and Garoda to Timboni, Blue Lagoon, Seven Islands, and Mida Creek, so you can choose the right base.',
    tags: ['Watamu', 'Coast', 'Beach', 'Travel Tips'],
    readingTime: 11,
    publishedAt: '2026-03-20T08:00:00Z',
    seoTitle: 'Watamu Areas Explained: Neighbourhood Guide 2026 (Garoda, Turtle Bay, Timboni and More)',
    seoDescription:
      'Complete guide to Watamu neighbourhoods. Compare Turtle Bay, Garoda Beach, Blue Lagoon, Timboni, Seven Islands, and Mida Creek to find your perfect base.',
    body,
  })

  console.log('✓ watamu-areas-neighbourhood-guide seeded successfully.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
