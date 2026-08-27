/**
 * Seed "Mombasa Airport to Watamu" — the single journey spoke post.
 *
 * Route: /journal/mombasa-airport-to-watamu
 *
 * This is deliberately a SPOKE, not a second transport guide. The hub at
 * /journal/watamu-transport-guide covers every route in plus getting around
 * town, and already ranks around #5 for this query on very little content. Two
 * pages targeting the same phrase would cannibalise each other, which is exactly
 * the problem the dead WordPress URL was already causing at #6.
 *
 * So the split is by intent:
 *   hub   = "how do I get to Watamu, and around it" (broad, comparative)
 *   spoke = "I land at Mombasa airport, now what" (one journey, transactional)
 *
 * The hub links down to this page for the road detail; this page links back up.
 * Exact match long tail usually wins the specific query, which is fine and is
 * the point of the structure.
 *
 * SERP context: the top of this query is Holidify plus three TripAdvisor forum
 * threads, one of which is literally "Mombasa SGR to Watamu. Most affordable
 * means of transport?". Forums outranking articles is the same weak signal that
 * made the seaweed and money posts winnable.
 *
 * The differentiator is the stuff the forum threads keep asking and nobody
 * answers cleanly: there is NO ferry on this route (a very common
 * misconception, the Likoni ferry is south coast only), the actual road
 * bottlenecks, real fare ranges, and what to do about a night arrival.
 *
 * EXTERNAL LINKS verified 200. Note kenyarailway.com is NOT the official
 * railway; only krc.co.ke and metickets.krc.co.ke are linked.
 *
 * Run locally:
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-mombasa-airport-to-watamu.ts --dry
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-mombasa-airport-to-watamu.ts
 */
import { createClient } from 'next-sanity'

const DRY = process.argv.includes('--dry')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

const AUTHOR_ID = '0a5287ef-f74d-4893-a487-6b672cb63477'
const POST_ID = 'blog-mombasa-airport-to-watamu'
const SLUG = 'mombasa-airport-to-watamu'

const IMG = {
  kilifiBridge: 'image-1e88e156150d52d9d1cb75585f5e04a1d041cb4e-1080x1080-jpg',
  kilifiBridgeWide: 'image-60b1ce3885ebbef01718e516011c47281f8ad4fc-1039x641-jpg',
  malindiAirport: 'image-09941aed3126ff690954d6f20380970021283444-720x616-jpg',
  shopRoad: 'image-d8473ffbec3401a22c62b0ee5be7b654fc8ad178-1500x1000-webp',
  tuktuk: 'image-109c748af964e683c7474a9fe1e2e474771500c7-1536x1024-png',
  watamuBeach: 'image-63df462742ea2467334998275abf0b7eb9a2d785-2048x1536-jpg',
}

const X = {
  krcTickets: 'https://metickets.krc.co.ke/',
  kenyaAirways: 'https://www.kenya-airways.com/',
  jambojet: 'https://www.jambojet.com/',
}

const J = {
  hub: '/journal/watamu-transport-guide',
  money: '/journal/money-in-kenya-guide',
  watamu: '/journal/complete-guide-watamu-kenya-2026',
  areas: '/journal/watamu-areas-neighbourhood-guide',
  kilifi: '/journal/complete-guide-kilifi-kenya-2026',
  beaches: '/journal/7-best-beaches-watamu-kenya',
  seaweed: '/journal/kenya-coast-seaweed-season-guide',
  eats: '/journal/best-restaurants-watamu-kenya',
}

/* ── Helpers ───────────────────────────────────────────────────────── */
let n = 0
const key = (p = 'k') => `${p}${++n}`
type B = Record<string, any>

const block = (text: string, style = 'normal'): B => ({
  _type: 'block', _key: key('b'), style, markDefs: [],
  children: [{ _type: 'span', _key: key('s'), text, marks: [] }],
})

function rich(parts: Array<{ text: string; bold?: boolean; link?: string }>): B {
  const markDefs: B[] = []
  const children = parts.map((p) => {
    const marks: string[] = []
    if (p.bold) marks.push('strong')
    if (p.link) { const k = key('l'); markDefs.push({ _type: 'link', _key: k, href: p.link }); marks.push(k) }
    return { _type: 'span', _key: key('s'), text: p.text, marks }
  })
  return { _type: 'block', _key: key('b'), style: 'normal', markDefs, children }
}

const bullets = (items: string[]): B[] =>
  items.map((t) => ({
    _type: 'block', _key: key('b'), style: 'normal', listItem: 'bullet', level: 1,
    markDefs: [], children: [{ _type: 'span', _key: key('s'), text: t, marks: [] }],
  }))

const img = (assetId: string, alt: string, caption?: string): B => ({
  _type: 'image', _key: key('i'), alt, ...(caption ? { caption } : {}),
  asset: { _type: 'reference', _ref: assetId },
})

const quickFacts = (title: string, accentColor: string, items: Array<{ icon: string; label: string; value: string }>): B => ({
  _type: 'quickFactsBlock', _key: key('qf'), title, accentColor, items: items.map((i) => ({ _key: key('qfi'), ...i })),
})
const tip = (variant: string, icon: string, label: string, text: string): B =>
  ({ _type: 'tipCardBlock', _key: key('tc'), variant, icon, label, text })
const statRow = (stats: Array<{ number: string; label: string }>): B => ({
  _type: 'statRowBlock', _key: key('sr'), stats: stats.map((s) => ({ _key: key('sri'), ...s })),
})
const distanceChips = (chips: Array<{ icon: string; text: string }>): B => ({
  _type: 'distanceChipsBlock', _key: key('dc'), chips: chips.map((c) => ({ _key: key('dci'), ...c })),
})
const budgetTable = (columns: string[], rows: Array<{ label: string; values: string[] }>): B => ({
  _type: 'budgetTableBlock', _key: key('bt'), columns, rows: rows.map((r) => ({ _key: key('bti'), label: r.label, values: r.values })),
})
const compareTable = (columns: Array<{ label: string; color: string }>, rows: Array<{ criterion: string; values: string[] }>): B => ({
  _type: 'compareTableBlock', _key: key('ct'),
  columns: columns.map((c) => ({ _key: key('cti'), ...c })),
  rows: rows.map((r) => ({ _key: key('ctr'), criterion: r.criterion, values: r.values })),
})
const deciderGrid = (cards: Array<{ label: string; color: string; title: string; items: string[] }>): B =>
  ({ _type: 'deciderGridBlock', _key: key('dg'), cards: cards.map((c) => ({ _key: key('dgi'), ...c })) })
const verdictCard = (variant: string, label: string, title: string, pros: string[], cons: string[]): B =>
  ({ _type: 'verdictCardBlock', _key: key('vc'), variant, label, title, pros, cons })
const packingList = (title: string, items: Array<{ icon: string; text: string }>): B => ({
  _type: 'packingListBlock', _key: key('pl'), title, items: items.map((i) => ({ _key: key('pli'), ...i })),
})
const pullQuote = (text: string, accentColor = 'teal'): B =>
  ({ _type: 'pullQuoteBlock', _key: key('pq'), text, accentColor })

/* ── Body ──────────────────────────────────────────────────────────── */

const body: B[] = [
  quickFacts('✦ The Journey at a Glance', 'teal', [
    { icon: '📏', label: 'Distance', value: 'About 120 km, all on tarmac' },
    { icon: '🕐', label: 'Time', value: '2.5 hrs, more in traffic' },
    { icon: '🚕', label: 'Private taxi', value: 'KSh 4,000 to 9,000' },
    { icon: '🚐', label: 'Matatu', value: 'Under KSh 600 with one change' },
    { icon: '⛴️', label: 'Ferry needed', value: 'No. None at all' },
    { icon: '💳', label: 'Pay with', value: 'Cash or M-Pesa' },
  ]),

  block('Mombasa Airport to Watamu', 'h2'),

  rich([
    { text: 'The drive from Mombasa’s Moi International Airport to Watamu is about 120 km and takes roughly two and a half hours. ', bold: true },
    { text: 'A private taxi costs somewhere between KSh 4,000 and 9,000 depending on where you book it, a matatu costs under KSh 600 with one change at Malindi, and there is no ferry involved at any point. That last part surprises people, so it is worth saying clearly up front.' },
  ]),

  distanceChips([
    { icon: 'pin', text: '120 km, Mombasa to Watamu' },
    { icon: 'clock', text: '2.5 hrs in normal traffic' },
    { icon: 'pin', text: 'No ferry crossing' },
    { icon: 'clock', text: '3 hrs by matatu with one change' },
  ]),

  /* ── No ferry ───────────────────────────────────────────── */
  block('First, the ferry question', 'h2'),

  block('Search this journey and you will find people asking about the Likoni ferry. You do not need it. The Likoni ferry connects Mombasa island to the south coast, which is Diani, Tiwi and Ukunda. Watamu is north. Going north you cross the Makupa causeway onto the island, then the Nyali Bridge to the north mainland, and follow the coast road from there. Both are bridges, both are open around the clock, and neither involves queuing for a boat.'),

  tip('tip', '🧭', 'The route in one line', 'Airport at Port Reitz, over the causeway onto Mombasa island, across Nyali Bridge, then north on the B8 through Mtwapa, Kilifi and Gede, and right into Watamu. It is tarmac the whole way and your driver will know it without a map.'),

  img(IMG.kilifiBridgeWide, 'Kilifi bridge crossing the creek on the coast road north of Mombasa', 'Kilifi Creek, about two thirds of the way. The nicest few minutes of the drive.'),

  /* ── Options ────────────────────────────────────────────── */
  block('Your four options, compared', 'h2'),

  compareTable(
    [
      { label: 'Cost', color: 'amber' },
      { label: 'Time', color: 'teal' },
      { label: 'Worth it when', color: 'slate' },
    ],
    [
      { criterion: 'Transfer booked by your host', values: ['KSh 6,000 to 9,000', '2.5 hrs', 'Night arrivals, families, first visit'] },
      { criterion: 'Taxi negotiated at the airport', values: ['KSh 4,000 to 7,000', '2.5 hrs', 'You are comfortable haggling'] },
      { criterion: 'Matatu via Malindi', values: ['Under KSh 600', 'About 3 hrs', 'Daylight, light luggage, tight budget'] },
      { criterion: 'Domestic hop to Malindi', values: ['Fare plus KSh 2,000 to 3,000', '30 min flight plus 30 min', 'Connecting anyway, hate long drives'] },
    ],
  ),

  block('Option 1: a transfer arranged before you land', 'h3'),

  block('The least stressful and the one we suggest for a first visit. Your hotel, villa or host arranges a driver who waits in arrivals with your name on a board. You pay a fixed price agreed in advance, usually KSh 6,000 to 9,000 for the car rather than per person, and there is no negotiation after a long flight. For a family with luggage, splitting one car this way often works out cheaper than four matatu seats plus the hassle.'),

  block('Option 2: a taxi from the airport rank', 'h3'),

  block('There are always drivers outside arrivals. Expect an opening quote well above the going rate, particularly if you arrive looking tired and new. The realistic range is KSh 4,000 to 7,000 for the whole car. Agree the total, in shillings, before your bags go in the boot, and confirm it covers the whole way to your accommodation in Watamu rather than dropping you at the junction.'),

  tip('warning', '💰', 'Agree the fare before the bags go in', 'The single most common mistake on this route is settling the price after loading. Ask the total, in Kenyan shillings, for the car, to your exact address. Say the number back. If it is more than about KSh 9,000 you are being quoted a tourist rate, and there will be another driver two metres away.'),

  block('Option 3: the matatu route', 'h3'),

  block('The local way and genuinely fine in daylight. From the airport take a taxi or boda boda to Mombasa town, then a matatu from the Kobil stage to Malindi for around KSh 250 to 350. That leg takes about two hours. At Malindi, change to a matatu or tuk-tuk for Watamu, another KSh 100 to 200 and about thirty minutes. Total under KSh 600 and about three hours door to door.'),

  block('It is hot, it is crowded, luggage space is limited and it will be the most interesting part of your trip. Do it in daylight, keep your bag on your lap, and it is completely straightforward.'),

  block('Option 4: fly the last leg', 'h3'),

  rich([
    { text: 'If you would rather not drive at all, there are short hops from Mombasa to Malindi, and ' },
    { text: 'Kenya Airways', link: X.kenyaAirways },
    { text: ' and ' },
    { text: 'Jambojet', link: X.jambojet },
    { text: ' both serve Malindi from Nairobi. Honestly, if you have not booked yet, the better move is to skip Mombasa entirely and fly into Malindi in the first place. It is 30 minutes from Watamu instead of two and a half hours.' },
  ]),

  img(IMG.malindiAirport, 'The terminal building at Malindi International Airport in Kenya', 'Malindi International. If you are still booking flights, land here instead.'),

  /* ── Timing ─────────────────────────────────────────────── */
  block('How long it really takes', 'h2'),

  statRow([
    { number: '2.5 hrs', label: 'normal running time' },
    { number: '3.5 hrs', label: 'if you cross Mombasa at rush hour' },
    { number: '2', label: 'bottlenecks: Nyali Bridge and Mtwapa' },
    { number: '0', label: 'ferries on this route' },
  ]),

  block('The drive itself is easy. What varies is Mombasa. Crossing the island between about 7am and 9am, or 4pm and 7pm, can add an hour on its own. The Nyali Bridge approach and the strip through Mtwapa are the two places you will sit still. Once you are past Mtwapa the road opens up and the rest is quick.'),

  tip('teal', '🕐', 'Klickenya local tip', 'A midday landing is the sweet spot. You clear the island before the evening build up and arrive in Watamu in daylight, which makes finding an unfamiliar villa or hotel far easier. If your flight lands after dark, book the transfer in advance rather than sorting it at the rank.'),

  /* ── Night ──────────────────────────────────────────────── */
  block('Arriving at night', 'h2'),

  block('Plenty of international flights land in the evening and the drive is perfectly normal after dark. The road is tarmac all the way and there is traffic on it at every hour. Two sensible precautions: have the transfer booked in advance so someone is expecting you, and have your accommodation’s exact location and a phone number saved offline. Watamu addresses are vague and many properties are down unlit sand tracks that are hard to find at midnight.'),

  ...bullets([
    'Book the transfer before you fly, not on arrival.',
    'Save your host’s phone number and a pinned map location offline.',
    'Carry small notes. Nobody has change for a 1,000 at 11pm.',
    'Tell your host your flight number so they can track a delay.',
  ]),

  /* ── Money ──────────────────────────────────────────────── */
  block('Paying for it', 'h2'),

  rich([
    { text: 'Cash or M-Pesa. No driver on this route takes a card. There are ATMs in the arrivals hall at Mombasa and in Mtwapa and Kilifi if you need to stop, and if you have not set up mobile money yet, our ' },
    { text: 'guide to money in Kenya', link: J.money },
    { text: ' explains how visitors register with a passport in about twenty minutes. Doing it at the airport before you set off makes the whole trip easier.' },
  ]),

  budgetTable(
    ['Cost', 'Notes'],
    [
      { label: 'Prebooked private transfer', values: ['KSh 6,000 to 9,000', 'Per car, fixed, name board at arrivals'] },
      { label: 'Airport rank taxi', values: ['KSh 4,000 to 7,000', 'Per car, negotiate before loading'] },
      { label: 'Matatu, Mombasa to Malindi', values: ['KSh 250 to 350', 'About 2 hrs, from Kobil stage'] },
      { label: 'Matatu or tuk-tuk, Malindi to Watamu', values: ['KSh 100 to 200', 'About 30 min'] },
      { label: 'Taxi, Malindi Airport to Watamu', values: ['KSh 2,000 to 3,000', 'If you fly the last leg'] },
      { label: 'Water and a snack for the road', values: ['KSh 200', 'Worth it, it is a hot drive'] },
    ],
  ),

  pullQuote('Anything above about KSh 9,000 for the car is a tourist rate, not a fare. Say the number you expect, calmly, and wait.'),

  /* ── Decider ────────────────────────────────────────────── */
  block('Which one should you pick?', 'h2'),

  deciderGrid([
    {
      label: 'FIRST VISIT', color: 'teal', title: 'Prebooked transfer',
      items: ['Someone waiting with your name', 'Fixed price, no negotiation', 'Best for night arrivals', 'Ask your host to arrange it'],
    },
    {
      label: 'CONFIDENT', color: 'blue', title: 'Taxi from the rank',
      items: ['A little cheaper if you negotiate', 'Agree the total before loading', 'Confirm it is to your door', 'Cash or M-Pesa only'],
    },
    {
      label: 'BUDGET', color: 'amber', title: 'Matatu via Malindi',
      items: ['Under KSh 600 all in', 'Daylight only', 'Light luggage only', 'One change at Malindi'],
    },
    {
      label: 'STILL BOOKING', color: 'purple', title: 'Fly to Malindi instead',
      items: ['30 minutes from Watamu, not 2.5 hours', 'Several flights a day from Nairobi', 'Taxi from KSh 2,000', 'Saves an entire afternoon'],
    },
  ]),

  verdictCard(
    'teal',
    'THE VERDICT',
    'Prebook the car, land in daylight, carry cash',
    [
      'A fixed price agreed in advance removes the only stressful part',
      'The road is straightforward tarmac the whole way',
      'No ferry, no permits, no complications',
      'One car split between a group beats four matatu seats',
    ],
    [
      'Crossing Mombasa at rush hour can add an hour',
      'No driver takes a card, so cash or M-Pesa only',
      'If you have not booked flights yet, Malindi is simply better',
    ],
  ),

  packingList('Before you land', [
    { icon: '📱', text: 'Host’s number saved, flight number shared' },
    { icon: '📍', text: 'Your accommodation pinned offline' },
    { icon: '💵', text: 'Small shilling notes for the driver' },
    { icon: '💧', text: 'Water, it is a hot two and a half hours' },
    { icon: '🧳', text: 'A soft bag if you are taking matatus' },
    { icon: '🕐', text: 'A daylight arrival if you can choose' },
  ]),

  /* ── FAQ ────────────────────────────────────────────────── */
  block('Mombasa airport to Watamu: frequently asked questions', 'h2'),

  block('How far is Watamu from Mombasa airport?', 'h3'),
  block('About 120 km, which is roughly two and a half hours by road in normal traffic. The route runs north from Moi International Airport at Port Reitz, across Mombasa island and the Nyali Bridge, then up the coast road through Mtwapa, Kilifi and Gede.'),

  block('Do I need to take the Likoni ferry to get to Watamu?', 'h3'),
  block('No. The Likoni ferry serves the south coast only, meaning Diani, Tiwi and Ukunda. Watamu is north of Mombasa, so the route uses the Makupa causeway and the Nyali Bridge instead. There is no ferry crossing anywhere on this journey.'),

  block('How much is a taxi from Mombasa airport to Watamu?', 'h3'),
  block('Between KSh 4,000 and 9,000 for the whole car, not per person. A transfer prebooked through your accommodation typically sits at the upper end, around KSh 6,000 to 9,000, and a taxi negotiated at the airport rank is usually KSh 4,000 to 7,000. Agree the total before your luggage is loaded.'),

  block('Is there a bus or matatu from Mombasa to Watamu?', 'h3'),
  block('Yes, with one change. Take a matatu from Mombasa’s Kobil stage to Malindi, around KSh 250 to 350 and about two hours, then change at Malindi to a matatu or tuk-tuk for Watamu, another KSh 100 to 200 and about thirty minutes. Total is under KSh 600 and roughly three hours.'),

  block('Can I get from the SGR terminus to Watamu?', 'h3'),
  rich([
    { text: 'Yes, and it is a slightly better starting point than the airport. Mombasa Terminus is at Miritini on the mainland, so you avoid some of the island traffic. It is about two and a half hours north from there by road. Book train tickets only through the ' },
    { text: 'official Kenya Railways portal', link: X.krcTickets },
    { text: ', as several unofficial lookalike sites rank well for SGR searches.' },
  ]),

  block('Is it safe to drive from Mombasa to Watamu at night?', 'h3'),
  block('Yes, the road is tarmac the whole way and busy at all hours. The sensible precautions are to book your transfer in advance rather than arranging it on arrival, and to have your accommodation pinned offline with a phone number saved. Many Watamu properties are down unlit sand tracks that are genuinely hard to find after dark.'),

  block('Should I fly to Mombasa or Malindi for Watamu?', 'h3'),
  block('Malindi, if you have the choice. It is 25 km from Watamu, about thirty minutes by road, and the taxi costs KSh 2,000 to 3,000. Mombasa is 120 km away and adds two and a half hours of driving to your journey. Only fly into Mombasa if that is where your international flight lands or the fare difference is large.'),

  /* ── Close ──────────────────────────────────────────────── */
  block('The bottom line', 'h2'),

  block('It is a straightforward two and a half hour drive on a good road with no ferry and no complications. Prebook the car if it is your first visit or you are landing at night, negotiate at the rank if you are comfortable doing that, and take the matatu if you are counting shillings and travelling in daylight. Whichever you choose, carry cash and agree the price before you set off.'),

  img(IMG.watamuBeach, 'Clear turquoise water over white sand at Watamu, Kenya', 'Two and a half hours later.'),

  rich([
    { text: 'For every other route into Watamu, including flights, the SGR from Nairobi and getting around town once you arrive, see our ' },
    { text: 'complete Watamu transport guide', link: J.hub },
    { text: '. Then the ' },
    { text: 'complete Watamu guide', link: J.watamu },
    { text: ' covers the rest of the trip, the ' },
    { text: 'neighbourhood guide', link: J.areas },
    { text: ' helps you pick where to stay, the ' },
    { text: 'best beaches', link: J.beaches },
    { text: ' and ' },
    { text: 'best restaurants', link: J.eats },
    { text: ' tell you what to do when you get there, and the ' },
    { text: 'seaweed season guide', link: J.seaweed },
    { text: ' explains which months to aim for. Driving up from the south, you will pass through ' },
    { text: 'Kilifi', link: J.kilifi },
    { text: ' on the way.' },
  ]),
]

const doc = {
  _id: POST_ID,
  _type: 'blogPost',
  title: 'Mombasa Airport to Watamu (2026): Every Option, Real Prices',
  slug: { _type: 'slug', current: SLUG },
  status: 'published',
  author: { _type: 'reference', _ref: AUTHOR_ID },
  excerpt:
    'About 120 km and two and a half hours, with no ferry involved. Taxi and matatu prices, the road bottlenecks, night arrivals, and how to avoid the tourist rate.',
  coverImage: {
    _type: 'image',
    alt: 'Kilifi bridge on the coast road between Mombasa and Watamu, Kenya',
    asset: { _type: 'reference', _ref: IMG.kilifiBridgeWide },
  },
  primaryCategory: 'destination_guide',
  subcategory: 'getting_there',
  postType: 'guide',
  location: 'watamu',
  series: 'Watamu Complete Guide',
  focusKeyword: 'mombasa airport to watamu',
  keywords: ['mombasa airport to watamu', 'mombasa to watamu', 'watamu transfer', 'watamu taxi price', 'matatu mombasa malindi', 'likoni ferry watamu', 'sgr to watamu'],
  tags: ['transport', 'watamu', 'mombasa', 'getting there', 'practical'],
  readingTime: 9,
  publishedAt: '2026-08-20T09:00:00Z',
  seoTitle: 'Mombasa Airport to Watamu 2026: Taxi, Matatu and Prices',
  seoDescription:
    'Mombasa airport to Watamu is 120 km and about 2.5 hours, with no ferry. Real taxi and matatu prices, traffic bottlenecks, and advice for night arrivals.',
  body,
}

async function main() {
  const words = body.filter((b) => b._type === 'block')
    .flatMap((b) => (b.children ?? []).map((c: any) => c.text))
    .join(' ').split(/\s+/).filter(Boolean).length
  const mix = body.reduce<Record<string, number>>((a, b) => { a[b._type] = (a[b._type] ?? 0) + 1; return a }, {})
  const ext = new Set<string>(); const int = new Set<string>()
  for (const b of body) for (const m of b.markDefs ?? []) if (m._type === 'link') (m.href.startsWith('http') ? ext : int).add(m.href)

  console.log(`📝 ${doc.title}`)
  console.log(`   /journal/${SLUG}`)
  console.log(`   ${body.length} body blocks · ~${words} words of prose`)
  console.log(`   ${ext.size} external links · ${int.size} internal links · ${body.filter((b) => b._type === 'image').length} body images`)
  console.log(`   block mix: ${Object.entries(mix).map(([k, v]) => `${k.replace('Block', '')}×${v}`).join(', ')}`)
  if (DRY) { console.log('\nDry run. Re-run without --dry to publish.'); return }
  await client.createOrReplace(doc)
  console.log(`\n✅ Published: https://www.klickenya.com/journal/${SLUG}`)
}

main().catch((err) => { console.error('❌ Failed:', err); process.exit(1) })
