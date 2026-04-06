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
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs,
    children: spans,
  }
}

function placeholder(caption?: string): any {
  return {
    _type: 'photoRowBlock',
    _key: key(),
    layout: 'hero-full',
    photos: [{ alt: caption ?? 'Watamu nightlife', aspectRatio: 'wide' }],
    caption: caption ?? '',
  }
}

// ══════════════════════════════════════════════════════
// WATAMU NIGHTLIFE GUIDE 2026
// ══════════════════════════════════════════════════════

const body = [

  // ── Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Watamu Nightlife at a Glance',
    accentColor: 'amber',
    items: [
      { icon: '🌙', label: 'Best nights', value: 'Friday and Saturday' },
      { icon: '📅', label: 'Peak season', value: 'Jul to Aug and Dec to Jan' },
      { icon: '💰', label: 'Budget', value: 'KSh 2,000 to 8,000' },
      { icon: '🛺', label: 'Transport', value: 'Tuk-tuk or boda boda' },
      { icon: '🎪', label: 'Big event', value: 'Kaleidoscope Festival (March)' },
      { icon: '👟', label: 'Dress code', value: 'Beach casual' },
    ],
  },

  // ── Stats ──
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '5+', label: 'venues worth your night' },
      { number: 'Free', label: 'entry at most weekly events' },
      { number: 'KSh 300', label: 'average tuk-tuk between venues' },
    ],
  },

  placeholder('Watamu at night'),

  // ── Intro ──
  textBlock('The Watamu Night Scene', 'h2'),

  textBlock("Watamu's nightlife is small, genuine, and growing fast. Unlike Diani or Mombasa it hasn't been over-commercialised. You still get a real mix of expats, tourists, and locals sharing the same beach bars without the cliques. The scene is most alive on Friday and Saturday nights, and during peak season there is something happening almost every night of the week."),

  textBlock("Don't come expecting rooftop clubs or VIP tables. Come expecting to meet interesting people, dance on sand, watch the sun dissolve into the Indian Ocean, and end up somewhere unexpected at midnight. That is the Watamu way."),

  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 This guide is for...',
    items: [
      { icon: '🏖️', text: 'First-timers wanting to know where locals actually go' },
      { icon: '🎵', text: 'Music lovers looking for live sets and good DJs' },
      { icon: '🍺', text: 'Anyone after an authentic Kenyan night out' },
      { icon: '🌅', text: 'Sunset chasers who want sundowners before the party' },
      { icon: '🎪', text: 'Festival-goers planning around Kaleidoscope' },
      { icon: '💃', text: 'Travellers wanting to mix with locals, not just tourists' },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '📅',
    label: 'Best months for nightlife',
    text: 'The scene peaks in July to August and December to January. April to June is long rains season and many venues run reduced hours. October to November and February to March are quieter but the main weekly events still run.',
  },

  placeholder('Watamu beach bar at sunset'),

  // ── Sunset Lab ──
  textBlock('Sunset Lab: Friday Nights', 'h2'),

  textBlock("Sunset Lab sits at the very end of Watamu's main beach road. Follow the road until it runs out and you'll find it. Friday nights are the main event: exceptional DJs spinning a mix of international hits and Afrobeat, often with live saxophone or drums. The food is proper, with some of the best pizza on the coast. The seating is bohemian with low cushions, candles, and the sound of the ocean."),

  textBlock("The crowd is international and friendly. You'll hear Italian, French, English, and Swahili all at the same table. Sunsets here are genuinely spectacular. Arrive by 6pm to secure a good spot. After 8pm finding a table becomes a project."),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Sunset Lab verdict',
    title: 'The best Friday night on the Kenya coast, full stop.',
    pros: [
      'Spectacular sunset views from beachside cushions',
      'Top-tier DJs with live instruments most Fridays',
      'Best wood-fired pizza in Watamu',
      'Genuinely international crowd',
      'Free entry',
    ],
    cons: [
      'Gets very full after 8pm on peak Fridays',
      'Walk-ins turned away during July and August',
      'No dedicated dance floor',
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌅',
    label: 'Arrive before sunset',
    text: 'Get there by 6pm to secure good seating and catch the sunset from the beachside cushions. Booking is strongly recommended during July and August. Walk-ins are often turned away on busy Fridays.',
  },

  placeholder('Sunset Lab Friday night, Watamu'),

  // ── Paparemo ──
  textBlock('Paparemo: Saturday Beach Parties', 'h2'),

  textBlock("Paparemo is a Saturday night institution. Located on Watamu Beach on the main road towards Jacaranda, it draws a genuinely mixed crowd of locals and tourists dancing together on sand until the early hours. Music ranges from Afrobeats and amapiano to Italian mainstream."),

  richText([
    { text: 'This is the most affordable option on the Watamu nightlife circuit. Leave your shoes behind the DJ booth ' },
    { text: 'if you want to dance properly', bold: true },
    { text: '. The sand is the dance floor and flip flops get in the way.' },
  ]),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'amber',
    label: 'Paparemo verdict',
    title: 'The most social beach party in Watamu. Come for the dancing, stay until sunrise.',
    pros: [
      'No cover charge, walk-ins always welcome',
      'Dancing on sand under the stars',
      'Genuinely mixed crowd of locals and visitors',
      'Full bar and Italian kitchen open late',
      'Best atmosphere in Watamu from 9pm onwards',
    ],
    cons: [
      'Can get crowded during peak season',
      'Keep an eye on your belongings',
      'Music style varies depending on the DJ',
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'Keep your belongings safe',
    text: "Like any beach party anywhere in the world, keep an eye on your belongings. Don't leave your phone or wallet unattended on the sand. Always take a tuk-tuk back to your accommodation rather than walking unlit roads after dark.",
  },

  placeholder('Paparemo beach party on a Saturday night'),

  // ── Lichthaus ──
  textBlock('Lichthaus: Sundowners and Slow Evenings', 'h2'),

  richText([
    { text: 'Lichthaus is near Garoda Beach at the end of Watamu Road. Bohemian to its core: cushions on the floor, small tables, nets to relax in over the creek. ' },
    { text: 'Not a party venue', bold: true },
    { text: ', but exceptional for sundowners and for starting your evening in the right headspace.' },
  ]),

  textBlock("Bring your swimsuit. A sunset swim in the creek before the drinks is a Watamu tradition. Half the people you meet at Lichthaus will still be your friends by the end of the week."),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: "Half the people you meet at Lichthaus will still be your friends by the end of the week. That's the Watamu effect.",
    attribution: 'Regular visitor, Watamu',
    accentColor: 'amber',
  },

  placeholder('Lichthaus creek at golden hour'),

  // ── Car Wash ──
  textBlock('Car Wash: The Local Bar', 'h2'),

  textBlock('A genuinely local spot open every night. African dance music, karaoke once a week, and a DJ who will play your requests. Very affordable at KSh 200 to 400 for a beer. A different energy from the expat bars: louder, more local, more unpredictable.'),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'blue',
    label: 'Car Wash verdict',
    title: 'The realest local bar in Watamu. Cheap drinks, good music, zero pretension.',
    pros: [
      'Most affordable drinks on the Watamu circuit',
      'Genuinely local crowd and energy',
      'Open every night of the week',
      'Karaoke nights once a week',
      'DJ takes requests',
    ],
    cons: [
      'Loud and busy, not for quiet evenings',
      'Basic facilities compared to beach venues',
    ],
  },

  placeholder('Car Wash local bar, Watamu'),

  // ── Speedy's Backyard ──
  textBlock("Speedy's Backyard: The New Local Favourite", 'h2'),

  richText([
    { text: "Speedy's Backyard has quickly become one of the most talked-about spots in Watamu. This is " },
    { text: 'a proper Kenyan night out', bold: true },
    { text: ': the kind that feels authentic, lively, and completely unpretentious.' },
  ]),

  textBlock("Walk in and you'll find tourists and Kenyans side by side, having the time of their lives. The energy here is different from the beach bars. It's louder, more vibrant, and deeply local. Great music, cold drinks, and a crowd that knows how to have fun."),

  richText([
    { text: 'If you want to experience Watamu the way locals actually live it, not just the beach-bar expat circuit, ' },
    { text: "Speedy's Backyard is a must", bold: true },
    { text: '. Follow them on Instagram ' },
    { text: '@speedys_backyard', bold: true, link: 'https://www.instagram.com/speedys_backyard/' },
    { text: ' for upcoming nights and events.' },
  ]),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'purple',
    label: "Speedy's Backyard verdict",
    title: 'A must-try for anyone serious about a real Kenyan night out in Watamu.',
    pros: [
      'Authentic local energy you cannot find in beach bars',
      'Mix of tourists and Kenyans dancing together',
      'Fair prices and cold drinks',
      'The kind of organic atmosphere that cannot be manufactured',
      'Growing reputation among both locals and visitors',
    ],
    cons: [
      'A newer spot, so hours and events may vary',
      'Check Instagram before heading out for latest info',
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🍻',
    label: "Why Speedy's Backyard stands out",
    text: "One of the few spots in Watamu where you'll genuinely mix with Kenyan locals and visitors alike. The atmosphere is electric, the prices are fair, and it has the kind of organic energy that no amount of marketing can manufacture.",
  },

  placeholder("Speedy's Backyard, Watamu"),

  // ── Kaleidoscope ──
  textBlock('Kaleidoscope Festival: The Annual Highlight', 'h2'),

  richText([
    { text: 'Kaleidoscope is in a different category entirely. Held annually at ' },
    { text: 'Temple Point Resort', bold: true },
    { text: ', usually in March, it transforms the creek into a full festival weekend: international DJs, elaborate art installations, food trucks, tattoo artists, craft markets, and legendary dhow parties on the water.' },
  ]),

  textBlock('Organised by a collective of young creatives, the production quality is remarkable. Lighting rigs over the water, themed zones, performances that continue until sunrise. Genuinely unlike any other event on the Kenya coast.'),

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: 'Full', label: 'weekend of programming' },
      { number: 'International', label: 'DJ lineup every year' },
      { number: 'March', label: 'usual festival month' },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'purple',
    icon: '🎪',
    label: 'Book Kaleidoscope tickets early',
    text: 'Tickets go on sale 6 to 8 weeks before the festival. Dhow party slots sell out within days, sometimes hours. Follow Kaleidoscope Festival Kenya on Instagram for announcements. Budget KSh 8,000 to 15,000 for the full weekend.',
  },

  placeholder('Kaleidoscope Festival at Temple Point, Watamu'),

  // ── Venue Comparison ──
  textBlock('Watamu Venues: Side by Side', 'h2'),

  textBlock('Not sure where to go on which night? Here is the full breakdown.'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: 'Venue', color: 'amber' },
      { _key: key(), label: 'Best for', color: 'teal' },
      { _key: key(), label: 'Night', color: 'blue' },
      { _key: key(), label: 'Entry', color: 'purple' },
    ],
    rows: [
      { _key: key(), criterion: 'Sunset Lab', values: ['Sunset views, great DJs, best pizza', 'Friday', 'Free'] },
      { _key: key(), criterion: 'Paparemo', values: ['Beach dancing, mixed crowd', 'Saturday', 'Free'] },
      { _key: key(), criterion: "Speedy's Backyard", values: ['Authentic Kenyan night out', 'Check Instagram', 'Free'] },
      { _key: key(), criterion: 'Lichthaus', values: ['Sundowners, starting the evening', 'Any evening', 'Free'] },
      { _key: key(), criterion: 'Car Wash', values: ['Local bar, cheap drinks, karaoke', 'Every night', 'Free'] },
      { _key: key(), criterion: 'Kaleidoscope', values: ['Full festival weekend', 'March annually', 'KSh 8–15k'] },
    ],
  },

  // ── Growing Scene ──
  textBlock('Watamu Nightlife Is Growing', 'h2'),

  textBlock("What's exciting about Watamu right now is the momentum. The scene is no longer just a handful of beach bars. It's slowly but surely becoming a real nightlife destination on the Kenya coast. Between the Friday Lab at Sunset Lab, the Saturday beach parties at Paparemo, the local energy at Speedy's Backyard, and the annual spectacle of Kaleidoscope, there is a genuine ecosystem taking shape."),

  richText([
    { text: 'We can only hope to see ' },
    { text: 'new contenders joining the scene soon', bold: true },
    { text: '. More venues, more events, more reasons to stay out past midnight in this little beach town. Watch this space.' },
  ]),

  placeholder('Watamu town at night'),

  // ── Events Slider ──
  textBlock("Events This Week in Watamu", 'h2'),

  textBlock('These are the regular events running in Watamu right now. Both weekly parties are free to enter and have been drawing consistent crowds of locals and travellers alike.'),

  {
    _type: 'eventSliderBlock',
    _key: key(),
    heading: 'Upcoming Events in Watamu',
    filterCity: 'Watamu',
    ctaText: 'See all Watamu events',
    ctaLink: '/events',
  },

  richText([
    { text: 'Are you a venue owner or event organiser in Watamu? ' },
    { text: 'List your events on Klick Kenya', bold: true, link: '/dashboard' },
    { text: ' to reach thousands of travellers planning their trip. We review and publish within 48 hours.' },
  ]),

  placeholder('Weekly events in Watamu'),

  // ── Budget ──
  textBlock('What a Night Out Costs in Watamu', 'h2'),

  textBlock('Watamu nightlife is refreshingly affordable. Here is what to budget for a full evening out, per person.'),

  {
    _type: 'budgetTableBlock',
    _key: key(),
    columns: ['Item', 'Budget night', 'Full night out'],
    rows: [
      { label: 'Tuk-tuk to venue (each way)', values: ['KSh 300', 'KSh 500'] },
      { label: 'Drinks (3 to 4 beers or cocktails)', values: ['KSh 600', 'KSh 1,200'] },
      { label: 'Food at the venue', values: ['KSh 500', 'KSh 1,500'] },
      { label: 'Entry to events', values: ['Free', 'Free'] },
      { label: 'Late night tuk-tuk home', values: ['KSh 400', 'KSh 600'] },
    ],
    totalRow: ['KSh 1,800', 'KSh 3,800'],
  },

  // ── Getting Around ──
  textBlock('Getting Around at Night', 'h2'),

  richText([
    { text: 'Tuk-tuks and motorbikes run late into the night and are the standard way to move between venues. Always ' },
    { text: 'agree on the fare before you get in', bold: true },
    { text: '. KSh 300 to 600 depending on distance. Do not walk alone on unlit roads after dark.' },
  ]),

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'clock', text: 'Town centre to Sunset Lab: KSh 300 to 400' },
      { icon: 'clock', text: 'Town centre to Paparemo: KSh 300 to 400' },
      { icon: 'clock', text: 'Town centre to Lichthaus: KSh 400 to 500' },
      { icon: 'clock', text: 'Night surcharge after 10pm: add KSh 100 to 200' },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🛺',
    label: 'Night transport guide',
    text: "Most tuk-tuk drivers know Sunset Lab, Paparemo, Speedy's Backyard, and Lichthaus by name. Motorbike (boda boda) for short solo hops: KSh 100 to 300. Always carry cash. Card readers are unreliable at night.",
  },

  placeholder('Tuk-tuk at night in Watamu'),

  // ── Internal Links CTA ──
  richText([
    { text: 'Planning your Watamu trip? Read our ' },
    { text: 'complete Watamu travel guide', bold: true, link: '/journal/watamu-the-real-guide-to-kenyas-best-kept-beach-secret' },
    { text: ', or check out ' },
    { text: 'where to stay in Watamu', bold: true, link: '/stays/watamu' },
    { text: ' and ' },
    { text: 'things to do on the coast', bold: true, link: '/experiences/watamu' },
    { text: '.' },
  ]),
]

async function seed() {
  console.log('Seeding Watamu nightlife blog post...\n')

  // Clear draft so Studio shows fresh content
  try {
    await client.delete('drafts.blog-watamu-nightlife-guide')
    console.log('✓ Cleared existing draft')
  } catch {
    // No draft, that's fine
  }

  await client.createOrReplace({
    _id: 'blog-watamu-nightlife-guide',
    _type: 'blogPost',
    title: 'Watamu Nightlife 2026: The Honest Guide to Bars, Beach Parties and Late Nights',
    slug: { _type: 'slug', current: 'watamu-nightlife-guide' },
    status: 'published',
    excerpt:
      "The real guide to Watamu nightlife. Sunset Lab Fridays, Paparemo Beach Parties, Speedy's Backyard, Lichthaus sunsets, Kaleidoscope Festival and more.",
    tags: ['Coast', 'Food & Culture', 'Beach', 'Nightlife'],
    readingTime: 10,
    publishedAt: '2026-03-13T08:00:00Z',
    seoTitle: "Watamu Nightlife 2026: Bars, Beach Parties and Speedy's Backyard",
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
