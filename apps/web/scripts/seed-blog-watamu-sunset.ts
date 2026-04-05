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
// Watamu Sunset Spots 2026
// ══════════════════════════════════════════════════════

const body = [
  // ── Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Watamu Sunsets at a glance',
    accentColor: 'amber',
    items: [
      { icon: '🌅', label: 'Sunset time', value: 'Around 6:15–6:45pm year-round' },
      { icon: '📍', label: 'Top spots', value: 'Sunset Lab, Lichthaus, Short Beach, Pilipan' },
      { icon: '🍹', label: 'Best cocktails', value: 'Pilipan, Sunset Lab' },
      { icon: '🍕', label: 'Best food', value: 'Sunset Lab, Lichthaus' },
      { icon: '🆓', label: 'Free options', value: 'Short Beach (bring your own)' },
      { icon: '🎶', label: 'Best vibe', value: 'Friday nights at Sunset Lab' },
    ],
  },

  // ── Stat Row ──
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '4+', label: 'sunset spots worth your evening' },
      { number: '6:30 pm', label: 'average golden hour in Watamu' },
      { number: '365', label: 'days a year the Indian Ocean does this' },
    ],
  },

  // ── Intro ──
  textBlock('Why Sunset in Watamu Is Something Special', 'h2'),

  richTextBlock([
    { text: 'Sunset in Watamu is one of those things that sounds like a cliche until you experience it. The Indian Ocean faces west here, which means the light hits the water in a way that turns the whole horizon gold, then orange, then deep red. ' },
    { text: 'It is genuinely one of the most beautiful moments this coast offers', bold: true },
    { text: ', and it happens every single evening.' },
  ]),

  textBlock('Whether you want a cocktail in your hand, your feet in the sand, food on the way, or just silence and the sound of the ocean, Watamu has a sunset spot for you. The trick is knowing which one matches your mood. This guide breaks them all down.'),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'There is a moment every evening in Watamu when the sky turns completely gold and the whole ocean seems to pause. No photograph does it justice. You simply have to be there.',
    attribution: '— Watamu, Indian Ocean coast',
    accentColor: 'amber',
  },

  // ── Sunset Lab ──
  textBlock('Sunset Lab: The Friday Night Classic', 'h2'),

  richTextBlock([
    { text: 'Sunset Lab is the anchor of the Watamu sunset scene. Follow the main beach road until it ends and you will find it. ' },
    { text: 'Friday nights are the main event', bold: true },
    { text: ': exceptional DJs, sometimes live saxophone or percussion, the best pizza on the coast, and cushioned seating right on the beach. The crowd is mixed and international. The energy builds from sunset into the night.' },
  ]),

  textBlock('Arrive by 6pm to claim a good spot. On busy Friday evenings, tables go fast. The food is genuinely excellent, not just bar snacks. The cocktail menu is well put together. If you only go to one sunset spot in Watamu, this is the one that gives you the most complete experience.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌅',
    label: 'Book ahead on Fridays',
    text: 'During July to August and December to January, Sunset Lab fills up fast on Friday evenings. Walk-ins are often turned away. Call ahead or arrive before 6pm to secure a beachside cushion and catch the best light.',
  },

  // ── Lichthaus ──
  textBlock('Lichthaus: The Bohemian Sundowner', 'h2'),

  richTextBlock([
    { text: 'Lichthaus sits near Garoda Beach at the end of Watamu Road. The vibe is ' },
    { text: 'bohemian and unhurried', bold: true },
    { text: ': cushions on the floor, low tables, hammock nets over the creek, and the kind of atmosphere that makes you order another drink before you have finished the first.' },
  ]),

  textBlock('This is the place to start your evening. Bring your swimsuit, take a sunset swim in the creek, then settle in for drinks as the light fades. Half the people you meet at Lichthaus will still be your friends by the end of the week.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🏊',
    label: 'Sunset swim tradition',
    text: 'A swim in the creek at Lichthaus just before sunset is a Watamu tradition. The water is calm and the light at that hour is extraordinary. Bring a towel and make it part of the evening ritual.',
  },

  // ── Short Beach ──
  textBlock('Short Beach: Simple, Free, and Beautiful', 'h2'),

  richTextBlock([
    { text: 'Short Beach is the simplest option of all. ' },
    { text: 'There are no bars, no menus, no sunbeds for hire', bold: true },
    { text: '. Just bring your own drinks, your own snacks, and sit on the sand as the sun drops into the ocean. The beach is beautiful, uncrowded, and completely free.' },
  ]),

  textBlock('This is the marine park headquarters beach, which means it is well maintained and has a particular kind of quiet to it. It is one of the most direct, unfiltered ways to experience the Watamu sunset. Accessible by foot, motorbike, or tuk-tuk.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'Beach closes at sunset',
    text: 'Short Beach is the marine park headquarters. After sunset the beach closes and you cannot remain on the sand. If the military approaches you in the evening, do not worry. They are simply letting you know the beach is closed for the night. It is routine and entirely friendly. Just gather your things and head out.',
  },

  // ── Pilipan ──
  textBlock('Pilipan: Cocktails by the Prawns Lake', 'h2'),

  richTextBlock([
    { text: 'Pilipan sits right next to Prawns Lake and is a ' },
    { text: 'genuinely great spot for sunset cocktails', bold: true },
    { text: '. The drinks are well made and the setting is calm and beautiful. Less well known than Sunset Lab, which means it is quieter and easier to get a good spot.' },
  ]),

  textBlock('If you want excellent cocktails without the Friday night crowd, Pilipan is the answer. The atmosphere is relaxed and the view across the water at golden hour is worth the trip.'),

  // ── Decider Grid ──
  {
    _type: 'deciderGridBlock',
    _key: key(),
    cards: [
      {
        _key: key(),
        label: 'Social & lively',
        color: 'amber',
        title: 'Sunset Lab',
        items: ['Best food on the coast', 'DJ sets and live music', 'International crowd', 'Book ahead on Fridays'],
      },
      {
        _key: key(),
        label: 'Relaxed & bohemian',
        color: 'teal',
        title: 'Lichthaus',
        items: ['Creek-side cushions and hammocks', 'Sunset swim beforehand', 'Great for meeting people', 'Perfect to start your evening'],
      },
      {
        _key: key(),
        label: 'Pure and simple',
        color: 'blue',
        title: 'Short Beach',
        items: ['Completely free', 'Bring your own everything', 'No crowds, no noise', 'Closes at sunset'],
      },
      {
        _key: key(),
        label: 'Cocktails and calm',
        color: 'purple',
        title: 'Pilipan',
        items: ['Yummy cocktails', 'Next to Prawns Lake', 'Less busy than Sunset Lab', 'Beautiful water views'],
      },
    ],
  },

  // ── General Sunset Tips ──
  textBlock('Making the Most of Watamu Sunsets', 'h2'),

  richTextBlock([
    { text: 'Wherever you end up, ' },
    { text: 'sunset in Watamu is a moment worth protecting', bold: true },
    { text: '. Put the phone down for at least five minutes. The light changes fast and the colours are brief. The golden window from about 6:15pm to 6:45pm is when everything looks extraordinary.' },
  ]),

  textBlock('Most venues are a short tuk-tuk ride from each other. A common Watamu sunset routine is to start at Short Beach or Lichthaus for the actual sunset, then move to Pilipan for a cocktail, and end at Sunset Lab for dinner and music. That is an evening that covers all the bases.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌅',
    label: 'The golden rule',
    text: 'Be at your chosen spot at least 30 minutes before sunset. The pre-sunset light is softer and more beautiful than many people expect, and arriving early means you are settled and relaxed when the best light arrives. Rushing to a sunset is never worth it.',
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: 'Free', label: 'Short Beach, the simplest option' },
      { number: 'KSh 300', label: 'average tuk-tuk to any sunset spot' },
      { number: '30 min', label: 'golden window you do not want to miss' },
    ],
  },
]

// ══════════════════════════════════════════════════════
// Seed the post
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('Seeding Watamu Sunset Spots blog post...')

  await client.createOrReplace({
    _id: 'blog-watamu-sunset-spots-2026',
    _type: 'blogPost',
    title: 'Watamu Sunset Spots 2026: Where to Watch, What to Eat, and Which Vibe Suits You',
    slug: { _type: 'slug', current: 'watamu-sunset-spots-2026' },
    status: 'published',
    primaryCategory: 'destination_guide',
    subcategory: 'tips',
    location: 'watamu',
    series: 'Kenya Destination Guides',
    postType: 'guide',
    focusKeyword: 'watamu sunset spots 2026',
    seoTitle: 'Watamu Sunset Spots 2026: Where to Watch and What to Drink',
    seoDescription:
      'The best sunset spots in Watamu Kenya: Sunset Lab, Lichthaus, Short Beach, and Pilipan. Which vibe suits you? Full 2026 guide with prices.',
    excerpt:
      'Sunset in Watamu is one of the most beautiful moments the Kenya coast offers. Here is where to be, what to drink, and which spot matches your mood.',
    readingTime: 7,
    publishedAt: '2026-03-25T08:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Beach', 'Coast', 'Watamu', 'Food & Culture'],
    keywords: ['watamu', 'sunset', 'beach', 'sunset lab', 'lichthaus', 'pilipan', 'kenya coast'],
    body,
  })

  console.log('✅ Watamu sunset spots post seeded')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
