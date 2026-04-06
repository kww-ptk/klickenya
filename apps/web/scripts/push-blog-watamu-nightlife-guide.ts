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

function richTextBlock(children: Array<{ text: string; bold?: boolean }>): any {
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    children: children.map((c) => ({
      _type: 'span',
      _key: key(),
      text: c.text,
      marks: c.bold ? ['strong'] : [],
    })),
  }
}

// ── POST: Watamu Nightlife Guide ──────────────────────

const postBody = [
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Quick Facts — Watamu Nightlife',
    accentColor: 'amber',
    items: [
      { icon: '🌙', label: 'Best nights', value: 'Friday + Saturday' },
      { icon: '📅', label: 'Peak season', value: 'Jul–Aug · Dec–Jan' },
      { icon: '💰', label: 'Budget', value: 'KSh 2,000–8,000' },
      { icon: '🛺', label: 'Transport', value: 'Tuk-tuk or boda' },
      { icon: '🎪', label: 'Big event', value: 'Kaleidoscope (March)' },
      { icon: '👟', label: 'Dress code', value: 'Beach casual' },
    ],
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '5+', label: 'venues worth your night' },
      { number: '1×', label: 'year — Kaleidoscope Festival' },
      { number: 'KSh 300', label: 'average tuk-tuk fare' },
    ],
  },

  textBlock('The Watamu Nightlife Scene', 'h2'),

  textBlock("Watamu's nightlife is small, genuine, and growing fast. Unlike Diani or Mombasa it hasn't been over-commercialised — you still get a real mix of expats, tourists, and locals sharing the same beach bars without the cliques. The scene is most alive on Friday and Saturday nights, and during peak season there is something happening almost every night of the week."),

  textBlock("Don't come expecting rooftop clubs or VIP tables. Come expecting to meet interesting people, dance on sand, watch the sun dissolve into the Indian Ocean, and end up somewhere unexpected at midnight. That is the Watamu way."),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '📅',
    label: 'Best months for nightlife',
    text: 'The scene peaks in July–August and December–January. April–June is long rains season — many venues close or run reduced hours. October–November and February–March are quieter but the main weekly events still run.',
  },

  textBlock('Sunset Lab — Friday Nights', 'h2'),

  richTextBlock([
    { text: "Sunset Lab sits at the very end of Watamu's main beach road — follow the road until it runs out and you'll find it. " },
    { text: 'Friday nights are the main event', bold: true },
    { text: ': exceptional DJs spinning a mix of international hits and Afrobeat, often with live saxophone or drums. The food is proper — some of the best pizza on the coast. The seating is bohemian — low cushions, candles, the sound of the ocean.' },
  ]),

  textBlock("The crowd is international and friendly. You'll hear Italian, French, English, and Swahili all at the same table. Sunsets here are genuinely spectacular. Arrive by 6pm to secure a good spot. After 8pm finding a table becomes a project."),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌅',
    label: 'Pro tip — arrive before sunset',
    text: 'Get there by 6pm to secure good seating and catch the sunset from the beachside cushions. Booking is strongly recommended during July–August — walk-ins are often turned away at the gate on busy Fridays.',
  },

  textBlock('Paparemo Beach Party — Saturday Nights', 'h2'),

  textBlock('Paparemo is a Saturday night institution. Located on Watamu Beach on the main road towards Jacaranda, it draws a genuinely mixed crowd of locals and tourists dancing together on sand until the early hours. Music ranges from African to Italian mainstream.'),

  richTextBlock([
    { text: 'This is the most affordable option on the Watamu nightlife circuit. ' },
    { text: 'Pro tip: leave your shoes behind the DJ booth', bold: true },
    { text: ' if you want to dance properly. The sand is the dance floor and flip flops get in the way.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'A word of caution',
    text: "Like any beach party anywhere in the world, keep an eye on your belongings. Don't leave your phone or wallet unattended on the sand. Always take a tuk-tuk back to your accommodation rather than walking unlit roads after dark.",
  },

  textBlock('Lichthaus — For the Sunset Crowd', 'h2'),

  richTextBlock([
    { text: "Lichthaus is near Garoda Beach at the end of Watamu Road — bohemian to its core. Cushions on the floor, small tables, nets to relax in over the creek. " },
    { text: 'Not really a party venue', bold: true },
    { text: ', but exceptional for sundowners and for starting your evening.' },
  ]),

  textBlock("Bring your swimsuit — a sunset swim in the creek before the drinks is a Watamu tradition. Half the people you meet at Lichthaus will still be your friends by the end of the week."),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: "Half the people you meet at Lichthaus will still be your friends by the end of the week. That's the Watamu effect.",
    attribution: '— Regular visitor, Watamu',
    accentColor: 'amber',
  },

  textBlock('Car Wash — The Local Bar', 'h2'),

  textBlock('A genuinely local spot open every night. African dance music, karaoke once a week, and a DJ who will play your requests. Very affordable at KSh 200–400 for a beer. A different energy from the expat bars: louder, more local, more unpredictable.'),

  textBlock('Kaleidoscope Festival — The Annual Highlight', 'h2'),

  richTextBlock([
    { text: 'Kaleidoscope is in a different category entirely. Held annually at ' },
    { text: 'Temple Point Resort', bold: true },
    { text: ' — usually in March — it transforms the creek into a full festival weekend: international DJs, elaborate art installations, food trucks, tattoo artists, craft markets, and legendary dhow parties on the water.' },
  ]),

  textBlock('Organised by a collective of young creatives, the production quality is remarkable. Lighting rigs over the water, themed zones, performances that continue until sunrise. Genuinely unlike any other event on the Kenya coast.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'purple',
    icon: '🎪',
    label: 'Book Kaleidoscope tickets early',
    text: 'Tickets go on sale 6–8 weeks before the festival. Dhow party slots sell out within days — sometimes hours. Follow Kaleidoscope Festival Kenya on Instagram for announcements. Budget KSh 8,000–15,000 for the full weekend.',
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: 'Full', label: 'weekend of programming' },
      { number: 'International', label: 'DJ lineup each year' },
      { number: 'March', label: 'usual festival month' },
    ],
  },

  textBlock('Getting Around at Night', 'h2'),

  richTextBlock([
    { text: 'Tuk-tuks and motorbikes run late into the night and are the standard way to move between venues. Always ' },
    { text: 'agree on the fare before you get in', bold: true },
    { text: " — KSh 300–600 depending on distance. Don't walk alone on unlit roads after dark." },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🛺',
    label: 'Night transport price guide',
    text: 'Motorbike (boda boda): KSh 100–300 for short hops. Tuk-tuk between venues: KSh 300–600. Night surcharge after 10pm: add KSh 100–200. Most drivers know Sunset Lab, Paparemo, and Lichthaus by name. Always carry cash.',
  },
]

async function push() {
  console.log('Pushing: Watamu Nightlife Guide...')

  await client.createOrReplace({
    _id: 'blog-watamu-nightlife-guide',
    _type: 'blogPost',
    title: 'Watamu Nightlife 2026: The Honest Guide to Bars, Beach Parties & Late Nights',
    slug: { _type: 'slug', current: 'watamu-nightlife-guide' },
    status: 'published',
    excerpt: 'The real guide to Watamu nightlife — Sunset Lab Fridays, Paparemo Beach Parties, Lichthaus sunsets, Kaleidoscope Festival and more.',
    tags: ['Coast', 'Food & Culture', 'Beach'],
    readingTime: 7,
    publishedAt: '2026-03-13T08:00:00Z',
    seoTitle: 'Watamu Nightlife 2026 — Bars, Beach Parties & Late Nights',
    seoDescription: 'The real guide to Watamu nightlife. Sunset Lab Fridays, Paparemo Beach Parties, Lichthaus sunsets, Kaleidoscope Festival and more.',
    body: postBody,
  })

  console.log('✓ Done: watamu-nightlife-guide')
}

push().catch((err) => {
  console.error('Push failed:', err)
  process.exit(1)
})
