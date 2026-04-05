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

function richTextBlock(children: Array<{ text: string; bold?: boolean }>): any {
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: children.map((c) => ({
      _type: 'span',
      _key: key(),
      text: c.text,
      marks: c.bold ? ['strong'] : [],
    })),
  }
}

// ══════════════════════════════════════════════════════
// Kilifi, Diani, Lamu: Coast Comparison Guide 2026
// ══════════════════════════════════════════════════════

const body = [
  // ── Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Kenya Coast at a glance',
    accentColor: 'teal',
    items: [
      { icon: '🌊', label: 'Kilifi', value: 'Creek life, expat community, creative scene' },
      { icon: '🏖', label: 'Diani', value: "Africa's best white-sand beach, world-class diving" },
      { icon: '🕌', label: 'Lamu', value: 'Ancient Swahili island, no cars, pure history' },
      { icon: '💰', label: 'Most affordable', value: 'Kilifi' },
      { icon: '🎯', label: 'Most polished', value: 'Diani' },
      { icon: '🧭', label: 'Most unique', value: 'Lamu' },
    ],
  },

  // ── Stat Row ──
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '3', label: 'distinct coastal destinations worth your time' },
      { number: '0', label: 'wrong choices among these three' },
      { number: '1', label: 'Kenyan coast, infinite personalities' },
    ],
  },

  // ── Introduction ──
  textBlock('Before You Choose: All Three Are Stunning', 'h2'),

  richTextBlock([
    { text: 'Let us be clear about something before we go any further. ' },
    { text: 'Kilifi, Diani, and Lamu are all genuinely, remarkably beautiful destinations', bold: true },
    { text: '. Each has stunning ocean beaches with turquoise water, incredible nature, warm people, and the kind of setting that reminds you why Kenya is one of the most extraordinary countries on earth.' },
  ]),

  richTextBlock([
    { text: 'This is not a guide about which destination is good and which is not. ' },
    { text: 'They are all outstanding', bold: true },
    { text: '. No matter which one you choose, you will not be disappointed. The Indian Ocean coast of Kenya is that good. What this guide is about is helping you understand the differences in character and experience, so you can find the one that fits you best.' },
  ]),

  textBlock('Think of it this way: all three are answers to the question "where should I go on the Kenya coast?" But they are very different answers, and knowing what makes each one tick will help you choose the right one for your trip, your budget, and the kind of experience you are looking for.'),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'The Kenya coast is one of the most beautiful places on earth. The only mistake you can make is not going at all.',
    attribution: '— Klickenya',
    accentColor: 'teal',
  },

  // ── The Short Version ──
  textBlock('The Short Version', 'h2'),

  richTextBlock([
    { text: 'If you want a broad summary: ' },
    { text: 'Kilifi', bold: true },
    { text: ' is for people who want to feel like they are living on the coast rather than visiting it. ' },
    { text: 'Diani', bold: true },
    { text: ' is for people who want the best beach in Africa with excellent infrastructure and world-class water sports. ' },
    { text: 'Lamu', bold: true },
    { text: ' is for people who want to step outside of time entirely and experience one of the oldest Swahili settlements in the world, where the only way to get around is by foot, dhow, or donkey.' },
  ]),

  textBlock('All three have extraordinary beaches. All three have beautiful natural environments. All three are worth the journey. The differences are in character, community, infrastructure, and what kind of experience you are there for.'),

  // ── Kilifi ──
  textBlock('Kilifi: The Creek, the Community, and the Creative Scene', 'h2'),

  richTextBlock([
    { text: 'Kilifi is built around its creek, a vast tidal inlet that stretches inland and provides a completely different kind of coastline to anything else on the Kenya coast. ' },
    { text: 'The beaches at Bofa are stunning and nearly empty', bold: true },
    { text: '. The water in the creek is calm, sheltered, and glows electric blue on certain dark nights.' },
  ]),

  textBlock('What makes Kilifi stand out is its community. A large number of artists, musicians, wellness practitioners, entrepreneurs, and long-term expats have settled here, and they have created something genuinely special. Events happen regularly. The nightlife, when it is on, is the best on the north coast. There is a recording studio in the baobab trees. There are weekly yoga sessions and community dinners and impromptu creek swimming sessions that nobody planned.'),

  richTextBlock([
    { text: 'Kilifi is ' },
    { text: 'more affordable than Diani', bold: true },
    { text: ' and less touristy than Watamu. The tradeoff is less infrastructure, fewer mid-range hotels, and a pace that rewards patience over planning.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌊',
    label: 'Kilifi is right for you if',
    text: 'You want to meet interesting people and feel like part of a real community. You value quiet, empty beaches over beach bars. You are happy to make your own entertainment. You want to spend less and experience more. You are a digital nomad, creative professional, family, or long-stay traveller.',
  },

  // ── Diani ──
  textBlock('Diani: Africa\'s Best Beach with Everything That Comes With It', 'h2'),

  richTextBlock([
    { text: 'Diani\'s claim to be Africa\'s best beach is not marketing. The sand is genuinely, almost absurdly white. The water shifts from pale turquoise to deep blue. ' },
    { text: 'The reef sits just offshore, creating a calm, protected lagoon', bold: true },
    { text: ' that is safe and beautiful year-round.' },
  ]),

  textBlock('Diani has the best tourist infrastructure on the Kenya coast. Big hotels, reliable ATMs, a shopping centre, excellent diving schools, consistent kitesurfing conditions, and a wide range of restaurants. It is the most immediately comfortable and convenient of the three destinations. If you want things to work without effort, Diani delivers.'),

  richTextBlock([
    { text: 'The honest tradeoff: ' },
    { text: 'Diani is more expensive and more resort-oriented than Kilifi', bold: true },
    { text: '. The community feel has faded somewhat in recent years. The nightlife is quieter than it used to be. But the beach and the water sports are still among the best on the continent.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'purple',
    icon: '🏖',
    label: 'Diani is right for you if',
    text: 'You want the absolute best beach. You are coming to dive, kitesurf, or snorkel on a serious reef. You are travelling with family and want reliable infrastructure. You want a Nairobi weekend escape with a quick flight. You are willing to spend more for comfort and convenience.',
  },

  // ── Lamu ──
  textBlock('Lamu: The Swahili Island That Time Forgot', 'h2'),

  richTextBlock([
    { text: 'Lamu is unlike anywhere else in Kenya and unlike almost anywhere else on earth. ' },
    { text: 'There are no cars on the island', bold: true },
    { text: '. Transport is by foot, dhow, or donkey. The old town is a UNESCO World Heritage Site, one of the oldest continuously inhabited Swahili settlements in East Africa. The architecture is Arabic and Swahili, built from coral and mangrove wood, with narrow lanes that have barely changed in five hundred years.' },
  ]),

  richTextBlock([
    { text: 'The beaches north of Lamu Town, particularly Shela Beach, are ' },
    { text: 'extraordinarily beautiful', bold: true },
    { text: ': long, empty, backed by dunes, with water that is warm and clear. The pace of life on Lamu is genuinely different from anywhere on the Kenya coast. Things happen slowly. People sit and talk. The ocean is always present.' },
  ]),

  textBlock('Getting to Lamu requires a flight (around one hour from Nairobi) or an extremely long road journey. This filters the crowd and keeps the atmosphere genuinely unhurried. Lamu rewards travellers who come with time and curiosity rather than a checklist.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🕌',
    label: 'Lamu is right for you if',
    text: 'You want a completely different experience from anything else in Kenya. You are drawn to history, Swahili culture, and architecture. You want empty, beautiful beaches without resort infrastructure. You are happy without nightlife or modern conveniences. You have at least 4 days to give it the time it deserves.',
  },

  // ── Side by Side ──
  textBlock('Side by Side: The Real Comparison', 'h2'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: 'Kilifi', color: 'teal' },
      { _key: key(), label: 'Diani', color: 'purple' },
      { _key: key(), label: 'Lamu', color: 'amber' },
    ],
    rows: [
      {
        _key: key(),
        criterion: 'Beach quality',
        values: ['Stunning (Bofa) and largely empty', "Africa's best white sand, 17 km", 'Wild and empty (Shela Beach)'],
        winners: [0, 1, 2],
      },
      {
        _key: key(),
        criterion: 'Water sports',
        values: ['Creek watersports, kitesurfing', 'World-class diving, kitesurfing', 'Dhow sailing, snorkelling'],
        winners: [1],
      },
      {
        _key: key(),
        criterion: 'Nightlife',
        values: ['Best on north coast (event-based)', 'Quiet, resort-oriented', 'Almost none'],
        winners: [0],
      },
      {
        _key: key(),
        criterion: 'Budget',
        values: ['Most affordable', 'Mid to high range', 'Mid range (flights add up)'],
        winners: [0],
      },
      {
        _key: key(),
        criterion: 'Community feel',
        values: ['Deep, integrated, creative', 'Tourist-oriented, less connected', 'Ancient Swahili town life'],
        winners: [0, 2],
      },
      {
        _key: key(),
        criterion: 'Infrastructure',
        values: ['Basic but functional', 'Best on Kenya coast', 'Very limited, intentionally so'],
        winners: [1],
      },
      {
        _key: key(),
        criterion: 'Getting there',
        values: ['Road from Mombasa (1.5 hrs)', 'Road or flight (1 hr from NBO)', 'Flight only (1 hr from NBO)'],
        winners: [0, 1],
      },
    ],
  },

  // ── Who Should Go Where ──
  textBlock('Who Should Go Where', 'h2'),

  {
    _type: 'deciderGridBlock',
    _key: key(),
    cards: [
      {
        _key: key(),
        label: 'Choose Kilifi',
        color: 'teal',
        title: 'Community, creek, and creative energy',
        items: [
          'Digital nomads and long-stayers',
          'Families who want real community',
          'Creatives, musicians, wellness seekers',
          'Budget-conscious travellers',
          'People who hate tourist bubbles',
        ],
      },
      {
        _key: key(),
        label: 'Choose Diani',
        color: 'purple',
        title: 'Africa\'s best beach with everything included',
        items: [
          'Beach lovers who want the best sand',
          'Divers and serious water sports',
          'Families wanting reliable infrastructure',
          'Nairobi weekenders on a quick trip',
          'Luxury resort guests',
        ],
      },
      {
        _key: key(),
        label: 'Choose Lamu',
        color: 'amber',
        title: 'Ancient Swahili culture and pure escape',
        items: [
          'History and culture enthusiasts',
          'People who want empty beautiful beaches',
          'Travellers looking for something truly different',
          'Anyone who wants to genuinely slow down',
          'Couples on a romantic, unhurried trip',
        ],
      },
    ],
  },

  // ── The Honest Word ──
  textBlock('The Honest Word', 'h2'),

  richTextBlock([
    { text: 'All three destinations are, in their own way, extraordinary. The Kenya coast is one of the most beautiful coastlines in the world. If you choose Kilifi and wonder about Diani, or choose Diani and wonder about Lamu, the answer is simple: ' },
    { text: 'come back', bold: true },
    { text: '. Kenya rewards repeat visitors more than almost any destination on earth.' },
  ]),

  textBlock('What we can tell you with confidence is that none of these choices is wrong. Each offers stunning ocean water, natural beauty, warm and welcoming people, and the kind of holiday that stays with you. The only mistake would be to overthink it.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '✈️',
    label: 'If you genuinely cannot decide',
    text: 'Spend three nights in each. Kilifi to Diani is a half-day journey by road through Mombasa. Diani to Lamu is a one-hour flight. A ten-day trip can comfortably cover all three, and you will leave Kenya knowing exactly which one to return to first.',
  },

  // ── Distance Chips ──
  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: 'Kilifi: 55 km north of Mombasa' },
      { icon: 'pin', text: 'Diani: 30 km south of Mombasa' },
      { icon: 'pin', text: 'Lamu: 350 km north of Mombasa' },
      { icon: 'clock', text: 'Kilifi to Diani: ~3 hrs via Mombasa' },
      { icon: 'clock', text: 'Diani to Lamu: ~1 hr flight' },
    ],
  },
]

// ══════════════════════════════════════════════════════
// Seed the post
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('Seeding Kilifi/Diani/Lamu coast comparison post...')

  await client.createOrReplace({
    _id: 'blog-kilifi-diani-lamu-comparison-2026',
    _type: 'blogPost',
    title: 'Kilifi, Diani, Lamu: Understand the Difference and What\'s Right for You',
    slug: { _type: 'slug', current: 'kilifi-diani-lamu-coast-comparison-2026' },
    status: 'published',
    primaryCategory: 'destination_guide',
    subcategory: 'comparison',
    series: 'Kenya Destination Guides',
    postType: 'guide',
    focusKeyword: 'kilifi diani lamu kenya coast comparison',
    seoTitle: 'Kilifi vs Diani vs Lamu: Which Kenya Coast Destination Is Right for You?',
    seoDescription:
      'Kilifi, Diani, and Lamu are all stunning. But they are very different. This guide helps you understand the differences and choose the right one for your trip.',
    excerpt:
      'All three are genuinely beautiful destinations with stunning ocean beaches. The question is not which is better, but which one matches you.',
    readingTime: 9,
    publishedAt: '2026-03-28T08:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Beach', 'Coast', 'Kilifi', 'Diani', 'Lamu'],
    keywords: ['kilifi', 'diani', 'lamu', 'kenya coast', 'comparison', 'which beach'],
    body,
  })

  console.log('✅ Coast comparison post seeded')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
