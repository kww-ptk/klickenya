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
      { icon: '🗺️', label: 'Total road length', value: 'About 9 km end to end' },
      { icon: '🚗', label: 'End to end', value: '20 minute drive' },
      { icon: '🛺', label: 'Between areas', value: 'KSh 200 to 500 by tuk-tuk' },
      { icon: '🏖️', label: 'Best beach', value: 'Garoda Beach' },
      { icon: '🤿', label: 'Best snorkelling', value: 'Turtle Bay' },
      { icon: '🛒', label: 'Main supermarket', value: 'Carrefour in Watamu Centre' },
    ],
  },

  // ── Map placeholder ──
  placeholder('Map of Watamu — add your map image here'),

  // ── Intro ──
  textBlock('Watamu Areas Explained', 'h2'),

  textBlock('Watamu is one straight road of about 9 kilometres. From the end of Garoda to the end of the Seven Islands area is a 20 minute drive. Every part of it is beautiful in its own way and each area has great food, good vibes, and things to discover. If you are staying in Watamu you should explore all of them — otherwise you are genuinely missing out.'),

  richText([
    { text: 'There are ' },
    { text: '4 main areas', bold: true },
    { text: ' along the road, plus Jacaranda further north and Timboni just before you arrive. Most of the big hotels and resorts are in Watamu Centre and the Seven Islands area. Garoda and Turtle Bay are more boutique hotels, villas, and private rentals. Supermarkets are in three of the areas, petrol stations in the centre.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '📍',
    label: 'Tip from a local',
    text: "Each area of Watamu is beautiful and great in its own way. Find your favourite accommodation and decide how much moving around you're comfortable with. The more central you are the easier it is to get everywhere, but every area has its own magic. Make sure you explore all of them at least once because otherwise you're missing out. They all have beauty, yummy food, and good vibes to offer.",
  },

  placeholder('Watamu coastline from above'),

  // ── Comparison Table ──
  textBlock('All Areas at a Glance', 'h2'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: 'Area', color: 'amber' },
      { _key: key(), label: 'Vibe', color: 'teal' },
      { _key: key(), label: 'Best for', color: 'blue' },
      { _key: key(), label: 'Highlight', color: 'purple' },
    ],
    rows: [
      { _key: key(), criterion: 'Watamu Centre', values: ['Busy, lively, convenient', 'First-timers, families, foodies', 'Carrefour, ATM, banks, 3 petrol stations, central beach'] },
      { _key: key(), criterion: 'Turtle Bay', values: ['Calm, beautiful, relaxed', 'Snorkellers, beach lovers', 'Best snorkelling in Watamu, turtle-shaped rock, Blue Moon Mall'] },
      { _key: key(), criterion: 'Garoda', values: ['Wild, lush, sporty, stunning', 'Kite surfers, couples, villa stays', 'Best beach, sandbank at low tide, Lichthaus, Prawn Lake, Mida Creek'] },
      { _key: key(), criterion: 'Seven Islands', values: ['Resort, growing fast, reef', 'Resort stays, divers, families', 'Walk the reef at low tide, Watamu Mall, Non Solo Padel, Snake Farm'] },
      { _key: key(), criterion: 'Jacaranda', values: ['Remote, beautiful, dry', 'Day trips, beach lovers, kite surfers', 'Maldives of Kenya, stunning sandbanks, 15 km north of centre'] },
      { _key: key(), criterion: 'Timboni', values: ['Bustling, local, chaotic', 'Culture seekers, bargain hunters', 'Mitumba second-hand market, Swahili Cafe, real Kenyan street life'] },
    ],
  },

  // ── Who Is It For ──
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Which area suits you?',
    items: [
      { icon: '🏨', text: 'Big hotels and resorts: Watamu Centre or Seven Islands' },
      { icon: '🏡', text: 'Boutique hotels and private villas: Garoda or Turtle Bay' },
      { icon: '🛒', text: 'Need a supermarket and ATM nearby: Watamu Centre' },
      { icon: '🪁', text: 'Kite surfing: Garoda Beach, all the schools are here' },
      { icon: '🤿', text: 'Best snorkelling from the beach: Turtle Bay' },
      { icon: '🌿', text: 'Lush, green, access to Mida Creek: Garoda side' },
      { icon: '🌊', text: 'Walking the exposed reef at low tide: Seven Islands' },
    ],
  },

  placeholder('Watamu beach road'),

  // ══════════════════════════════════════════════════════
  // AREA 1: WATAMU CENTRE
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '01',
    pill: 'The Hub',
    pillColor: 'amber',
    title: 'Watamu Centre (The Village)',
  },

  textBlock('This is where it all happens. Watamu Centre is the busiest, liveliest, and most convenient part of the village. The main strip is lined with fruit stalls, souvenir and trinket shops, local restaurants, tour operators, and beach bars. The ATM, banks, Carrefour supermarket, and three petrol stations are all here. It is the most walkable area and the easiest base for exploring everything else.'),

  richText([
    { text: 'On the beach side, this is the central bay of Watamu, with two other bays on either side. It is the most active beach: ' },
    { text: 'sunbeds, beach bars, resorts, and restaurants right on the sand', bold: true },
    { text: '. It gets busy during peak season. There are some excellent accommodation options here and the convenience of having everything within walking distance is hard to beat.' },
  ]),

  textBlock('Standing on the beach and looking out to sea, Turtle Bay is to your right and Seven Islands is to your left.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '🙋',
    label: 'A heads up about vendors',
    text: "This is the area where you may be approached most to buy things. A direct, polite but firm no is all you need. If someone won't take no for an answer, calmly ask them to stop. Most people are just trying to make a living and will respect a clear boundary.",
  },

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'amber',
    label: 'Watamu Centre verdict',
    title: 'The most convenient base. Everything you need within walking distance.',
    pros: [
      'Carrefour supermarket, ATM, banks, and petrol all here',
      'Most restaurants and beach bars within walking distance',
      'Central location makes it easy to reach all other areas',
      'Widest range of accommodation types and budgets',
      'Most lively beach atmosphere',
    ],
    cons: [
      'Busiest and noisiest area, especially on weekends',
      'Most persistent beach vendors',
      'Beach gets crowded during peak season',
    ],
  },

  placeholder('Watamu Centre beach and village strip'),

  // ══════════════════════════════════════════════════════
  // AREA 2: TURTLE BAY
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '02',
    pill: 'Best Snorkelling',
    pillColor: 'teal',
    title: 'Turtle Bay',
  },

  textBlock('Head right from the centre and the first bay you reach is Turtle Bay. It is a little quieter than the centre, a little more laid back, and home to the best snorkelling in Watamu directly from the beach. The reef here is close to shore and the bay is naturally sheltered, making it ideal for both beginners and experienced snorkellers.'),

  richText([
    { text: 'Look out for the ' },
    { text: 'famous turtle-shaped rock', bold: true },
    { text: ' that gives the bay its name. There are a handful of good restaurants and hotels here, and the Blue Moon Mall is close by for any shopping needs. The energy is noticeably calmer than the centre but there is still plenty going on.' },
  ]),

  textBlock('This is the spot recommended most for families with children who want to snorkel. The water is clear, the reef is alive, and the conditions are generally gentle. Glass-bottom boat trips into the marine park also depart from here.'),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Turtle Bay verdict',
    title: 'The best snorkelling in Watamu, with a calmer and more relaxed feel than the centre.',
    pros: [
      'Best snorkelling directly from the beach in all of Watamu',
      'Calmer and quieter than the centre without being remote',
      'Famous turtle-shaped rock landmark',
      'Good selection of restaurants and hotels',
      'Blue Moon Mall nearby for shopping',
    ],
    cons: [
      'Fewer amenities than the centre',
      'Smaller bay, less beach space than Garoda',
    ],
  },

  placeholder('Turtle Bay snorkelling and beach'),

  // ══════════════════════════════════════════════════════
  // AREA 3: GARODA
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '03',
    pill: 'Best Beach',
    pillColor: 'purple',
    title: 'Garoda Beach',
  },

  textBlock('Continue past Turtle Bay and the road opens up into Garoda, widely considered the most beautiful part of Watamu. A long, wide, white sandy beach stretches all the way down to Mida Creek. The area is lush and green, lined with big trees, and the water colour here is stunning. This is the wilder, more natural side of Watamu.'),

  richText([
    { text: 'Garoda has ' },
    { text: 'the most spectacular sandbank in the area', bold: true },
    { text: ', exposed at low tide, where you can walk out into the ocean surrounded by shallow turquoise water. The kitesurfing schools are all based here — the flat lagoon is the best kite spot in Kenya from June to October.' },
  ]),

  richText([
    { text: 'At the far end of Garoda you find ' },
    { text: 'Short Beach and the famous Lichthaus', bold: true },
    { text: ' bar, one of the most beloved spots in Watamu for sundowners. From here you also access all Mida Creek activities: dhow trips, kayaking, paddleboarding, and the mangrove boardwalk.' },
  ]),

  textBlock("Accommodation here is mostly boutique hotels and private luxury villas, some of them beachfront. Vacancies can be harder to find than in the centre, but the setting makes it worth planning ahead. There are fewer restaurants than in the centre, but some of the absolute best in Watamu are in this area."),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🦐',
    label: 'Hidden gem: Prawn Lake',
    text: "Garoda has a small tidal salt flat locals call Prawn Lake. You can have a meal or a sunset cocktail overlooking it at Prawns Lake restaurant, a community-owned spot built on stilts right over the water, or at Pilipan nearby. Both are memorable. Timing a visit around sunset is highly recommended.",
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🛺',
    label: 'Getting around in Garoda',
    text: "Garoda is spread out along a long stretch of road and you will need a tuk-tuk or motorbike to get between places. Get the number of a trusted driver so you can call them to pick you up when you need to move. Don't rely on flagging one down at night.",
  },

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'purple',
    label: 'Garoda verdict',
    title: 'The most beautiful beach in Watamu. Lush, wild, and stunning.',
    pros: [
      'The best and most beautiful beach in all of Watamu',
      'Spectacular sandbank exposed at low tide',
      'All the kite surfing schools, best conditions June to October',
      'Access to Mida Creek, Short Beach, and Lichthaus',
      'Lush, green, and peaceful compared to the centre',
      'Some of the best restaurants in Watamu are here',
    ],
    cons: [
      'Accommodation harder to find and book in advance',
      'Spread out and requires transport for most things',
      'Further from the centre, ATMs, and the supermarket',
    ],
  },

  placeholder('Garoda Beach sandbank at low tide'),

  // ══════════════════════════════════════════════════════
  // AREA 4: SEVEN ISLANDS
  // ══════════════════════════════════════════════════════

  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: '04',
    pill: 'Growing Fast',
    pillColor: 'blue',
    title: 'Seven Islands',
  },

  textBlock('Go left from Watamu Centre and you reach the Seven Islands area, named after the seven stunning coral islands that sit just offshore. At low tide the reef between the islands becomes exposed and you can walk out and explore it. The bays here are gorgeous, with different shades of blue as the light changes through the day.'),

  richText([
    { text: 'This is ' },
    { text: 'the fastest growing area of Watamu', bold: true },
    { text: '. A lot of development is happening here right now, with new resorts and villas going up. It is less green and lush than the Garoda side but has its own dramatic reef-and-island beauty. The Watamu Mall is here, along with the Non Solo Padel courts and the famous Snake Farm.' },
  ]),

  textBlock('Behind the beach there are many private villa options. The resorts here tend to be larger and more established than the boutique spots at Garoda. Easy access back to the centre makes it a good base if you want resort-style facilities without being in the thick of the village.'),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'blue',
    label: 'Seven Islands verdict',
    title: 'Beautiful reef beaches, big resorts, and the fastest growing part of Watamu.',
    pros: [
      'Stunning coral islands and reef you can walk at low tide',
      'Watamu Mall, Non Solo Padel, and Snake Farm all here',
      'Most resort and hotel options outside the centre',
      'Easy access back to Watamu Centre',
      'Growing fast with new options opening regularly',
    ],
    cons: [
      'Less green and lush than the Garoda side',
      'More development underway, still evolving',
      'Fewer restaurants in the immediate area',
    ],
  },

  placeholder('Seven Islands reef and bays, Watamu'),

  // ══════════════════════════════════════════════════════
  // JACARANDA
  // ══════════════════════════════════════════════════════

  textBlock('Jacaranda: The Maldives of Kenya', 'h2'),

  richText([
    { text: 'Technically not part of Watamu, Jacaranda sits about 15 km north of Watamu Centre. It is worth knowing about because it is extraordinary. ' },
    { text: "Multiple sandbanks are exposed at different stages of the tide", bold: true },
    { text: ', creating conditions that have earned it the nickname the Maldives of Kenya. Mid-tide is when the water is at its most beautiful: clear, shallow, and an impossible shade of turquoise.' },
  ]),

  textBlock('The area is drier and more open than the Garoda side, with coral rocks and less tree cover. There are beach bars, restaurants, kite schools, and accommodation options including hotels. It is not part of the marine park.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌊',
    label: 'How to visit Jacaranda',
    text: "The best way to experience Jacaranda is as a day trip from Watamu: go for lunch, time the tides right, and spend the afternoon on the sandbanks. Check the tide times before you go as the experience changes dramatically depending on the water level. If you base yourself here you will need a car for the 20 to 30 minute drive into Watamu Centre.",
  },

  placeholder('Jacaranda sandbanks at mid-tide'),

  // ══════════════════════════════════════════════════════
  // TIMBONI
  // ══════════════════════════════════════════════════════

  textBlock('Timboni: The Real Kenya', 'h2'),

  textBlock("Timboni is not a beach area. It is the bustling local town you pass through on the road between the Gedi junction and Watamu Centre, and it is one of the most interesting places in the whole area if you take the time to stop and explore."),

  richText([
    { text: 'This is where the real day-to-day life of Watamu happens. Hardware shops, vegetable markets, carpentry workshops, clothes sellers, mechanics fixing bikes on the roadside, children playing, local restaurants, pool tables outside under a shade tree. ' },
    { text: 'It is chaotic, lively, funny, and completely authentic', bold: true },
    { text: '. Go in with an open mind and embrace it.' },
  ]),

  richText([
    { text: 'In Timboni you can find almost anything. But the real reason to visit is the ' },
    { text: 'mitumba markets', bold: true },
    { text: ': second-hand clothes that arrive in big batches from overseas, often in excellent condition and very cheap. This is thrifting Kenya style. It takes time and patience to find the good pieces but it is an experience in itself. Swahili Cafe is the go-to local spot for a proper Swahili meal while you are here.' },
  ]),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: "Go inside the local shops. Ask around. Have fun. Embrace the chaos. Watch locals playing pool, cows going around, a mechanic fixing bikes, kids playing — all together. This is Watamu as it actually lives.",
    attribution: 'Local Watamu guide',
    accentColor: 'amber',
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '👕',
    label: 'Mitumba shopping in Timboni',
    text: "Mitumba is Kenya's second-hand clothes culture — big batches of clothes shipped in from overseas, sold at market stalls for very affordable prices. Quality varies but the good pieces are genuinely good. Budget at least an hour, go with no fixed idea of what you want, and enjoy the process. Swahili Cafe nearby is perfect for lunch after.",
  },

  placeholder('Timboni local market and street life'),

  // ══════════════════════════════════════════════════════
  // GETTING BETWEEN AREAS
  // ══════════════════════════════════════════════════════

  textBlock('Getting Between Areas', 'h2'),

  textBlock('Everything in Watamu is along one road. The drive from one end to the other takes about 20 minutes. Tuk-tuks run all day and late into the night.'),

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'clock', text: 'Garoda to Seven Islands end: 20 min, about 9 km' },
      { icon: 'clock', text: 'Centre to Turtle Bay: 5 to 10 min, KSh 200 to 300' },
      { icon: 'clock', text: 'Centre to Garoda: 10 to 15 min, KSh 300 to 500' },
      { icon: 'clock', text: 'Centre to Seven Islands: 10 min, KSh 200 to 400' },
      { icon: 'clock', text: 'Centre to Jacaranda: 20 to 30 min, needs car or tuk-tuk' },
      { icon: 'clock', text: 'Night surcharge after 10pm: add KSh 100 to 200' },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🛺',
    label: 'Save a driver\'s number',
    text: "In Garoda and Seven Islands especially, do not rely on flagging down a tuk-tuk when you need one. Get the number of a driver you trust on your first day and call them when you need a ride. Most drivers will be happy to be your go-to person for the trip.",
  },

  // ── Decider Grid ──
  textBlock('Quick Decider', 'h2'),

  {
    _type: 'deciderGridBlock',
    _key: key(),
    cards: [
      {
        _key: key(),
        label: 'Most convenient base',
        color: 'amber',
        title: 'Watamu Centre',
        items: ['Carrefour and ATM on your doorstep', 'Most restaurants in walking distance', 'Central for exploring all areas', 'All accommodation budgets'],
      },
      {
        _key: key(),
        label: 'Best snorkelling',
        color: 'teal',
        title: 'Turtle Bay',
        items: ['Best reef directly from the beach', 'Calmer than the centre', 'Turtle-shaped rock landmark', 'Good local restaurants'],
      },
      {
        _key: key(),
        label: 'Most beautiful beach',
        color: 'purple',
        title: 'Garoda Beach',
        items: ['Stunning long white sandy beach', 'Sandbank exposed at low tide', 'All kite schools here', 'Lichthaus and Mida Creek access'],
      },
      {
        _key: key(),
        label: 'Fastest growing',
        color: 'blue',
        title: 'Seven Islands',
        items: ['Walk the reef at low tide', 'Big resorts and private villas', 'Watamu Mall and Non Solo Padel', 'Snake Farm'],
      },
      {
        _key: key(),
        label: 'Day trip worth making',
        color: 'teal',
        title: 'Jacaranda',
        items: ['Maldives of Kenya', 'Time the tides for best colours', 'Kite schools and sandbanks', 'Not in the marine park'],
      },
      {
        _key: key(),
        label: 'Real Kenyan experience',
        color: 'amber',
        title: 'Timboni',
        items: ['Mitumba second-hand clothes market', 'Local food at Swahili Cafe', 'Hardware, veg market, street life', 'Embrace the beautiful chaos'],
      },
    ],
  },

  placeholder('Watamu road at golden hour'),

  // ── Internal Links ──
  richText([
    { text: 'Ready to book? Browse all ' },
    { text: 'verified stays in Watamu', bold: true, link: '/stays/watamu' },
    { text: ', explore ' },
    { text: 'things to do', bold: true, link: '/experiences/watamu' },
    { text: ', or read our ' },
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
      'Watamu is one road, 9 km end to end. Each area has its own vibe, its own beauty, and its own reasons to explore. Here is everything you need to choose your base and make the most of all of it.',
    tags: ['Watamu', 'Coast', 'Beach', 'Travel Tips'],
    readingTime: 12,
    publishedAt: '2026-03-20T08:00:00Z',
    seoTitle: 'Watamu Areas Explained: Complete Neighbourhood Guide 2026',
    seoDescription:
      'Everything you need to know about Watamu\'s 4 main areas: Watamu Centre, Turtle Bay, Garoda Beach, and Seven Islands. Plus Jacaranda and Timboni. Where to stay, what to expect, and local tips.',
    body,
  })

  console.log('✓ watamu-areas-neighbourhood-guide seeded successfully.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
