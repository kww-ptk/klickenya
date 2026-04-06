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

const body = [
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

  textBlock("Speedy's Backyard — The New Local Favourite", 'h2'),

  richTextBlock([
    { text: "Speedy's Backyard has quickly become one of the most talked-about spots in Watamu — and for good reason. This is " },
    { text: 'a proper Kenyan night out', bold: true },
    { text: ', the kind that feels authentic, lively, and completely unpretentious.' },
  ]),

  textBlock("Walk in and you'll find tourists and Kenyans side by side, having the time of their lives. The energy here is different from the beach bars — it's louder, more vibrant, and deeply local. Great music, cold drinks, and a crowd that knows how to have fun."),

  richTextBlock([
    { text: "If you want to experience Watamu the way locals actually live it — not just the beach-bar expat circuit — " },
    { text: "Speedy's Backyard is a must", bold: true },
    { text: '. Follow them on Instagram ' },
    { text: '@speedys_backyard', bold: true },
    { text: ' for upcoming nights and events.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🍻',
    label: "Why Speedy's Backyard stands out",
    text: "One of the few spots in Watamu where you'll genuinely mix with Kenyan locals and visitors alike. The atmosphere is electric, the prices are fair, and it has the kind of organic energy that no amount of marketing can manufacture. A must-try for anyone serious about their Watamu night out.",
  },

  textBlock('The Watamu Nightlife Scene Is Growing', 'h2'),

  textBlock("What's exciting about Watamu right now is the momentum. The scene is no longer just a handful of beach bars — it's slowly but surely becoming a real nightlife destination on the Kenya coast. Between the Friday Lab at Sunset Lab, the Saturday beach parties at Paparemo, the local energy at Speedy's Backyard, and the annual spectacle of Kaleidoscope, there is a genuine ecosystem taking shape."),

  richTextBlock([
    { text: "And it's only getting started. " },
    { text: 'We can only hope to see new contenders joining the scene soon', bold: true },
    { text: " — more venues, more events, more reasons to stay out past midnight in this little beach town. Watch this space." },
  ]),

  textBlock("Weekly Events — What's On in Watamu", 'h2'),

  textBlock("These are the regular weekly events running right now. Both are free to enter and have been drawing consistent crowds of locals and travellers alike."),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🎵',
    label: 'Friday Lab — Every Friday at Sunset Beach Lab',
    text: 'Live music every Friday evening at Sunset Beach Lab on Mapango Beach — local and visiting artists playing acoustic sets, reggae, Afro-soul, and jazz. Famous wood-fired pizzas, craft cocktails, and the best sunset views in Watamu. Family-friendly early evening. Free entry, walk-ins welcome — but arrive early for a good table.',
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'amber',
    icon: '🏖️',
    label: 'Papa Remo Beach Party — Every Saturday',
    text: 'The signature Saturday night beach party. Live DJs spinning Afrobeats, amapiano, reggaeton and international hits on a sand dance floor under the stars. Full bar, Italian kitchen with pizza and grilled fish. No cover charge. Mixed crowd of locals, expats, and travellers. Best atmosphere from 8–9 PM onwards.',
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'purple',
    icon: '📣',
    label: 'Are you a venue or event organiser in Watamu?',
    text: 'We want to feature your events. List your venue or party on Klick Kenya to reach thousands of travellers planning their Watamu trip. Create a free host account to add your events directly — we review and publish within 48 hours.',
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
    text: "Motorbike (boda boda): KSh 100–300 for short hops. Tuk-tuk between venues: KSh 300–600. Night surcharge after 10pm: add KSh 100–200. Most drivers know Sunset Lab, Paparemo, Speedy's Backyard, and Lichthaus by name. Always carry cash.",
  },
]

async function seed() {
  console.log('Seeding Watamu nightlife blog post...\n')

  await client.createOrReplace({
    _id: 'blog-watamu-nightlife-guide',
    _type: 'blogPost',
    title: 'Watamu Nightlife 2026: The Honest Guide to Bars, Beach Parties & Late Nights',
    slug: { _type: 'slug', current: 'watamu-nightlife-guide' },
    status: 'published',
    excerpt:
      "The real guide to Watamu nightlife — Sunset Lab Fridays, Paparemo Beach Parties, Speedy's Backyard, Lichthaus sunsets, Kaleidoscope Festival and more.",
    tags: ['Coast', 'Food & Culture', 'Beach', 'Nightlife'],
    readingTime: 9,
    publishedAt: '2026-03-13T08:00:00Z',
    seoTitle: "Watamu Nightlife 2026 — Bars, Beach Parties & Speedy's Backyard",
    seoDescription:
      "The real guide to Watamu nightlife. Sunset Lab Fridays, Paparemo Beach Parties, Speedy's Backyard, Lichthaus sunsets, Kaleidoscope Festival and more.",
    body,
  })

  console.log('✓ watamu-nightlife-guide updated successfully.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
