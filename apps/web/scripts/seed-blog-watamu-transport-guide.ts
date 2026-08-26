/**
 * Rewrite of the Watamu transport guide, IN PLACE on the existing URL.
 *
 * Route: /journal/watamu-transport-guide   (unchanged)
 * _id:   blog-watamu-transport-guide       (unchanged, so the ranking carries)
 *
 * Why a rewrite and not a new post: this page already ranks around #5 for
 * "how to get to Watamu from Mombasa", above watamumarine.co.ke and the taxi
 * aggregators, on 436 words of prose. Everything above it is Holidify and three
 * TripAdvisor forum threads. It does not need replacing, it needs to be finished.
 *
 * What was missing, all fixed here:
 *   - 436 words of prose, no FAQ, no images in the body, no links in the body
 *   - focusKeyword, keywords, location and subcategory were all null
 *   - the SGR got one sentence, yet a forum thread titled "Mombasa SGR to
 *     Watamu. Most affordable means of transport?" ranks ABOVE this page
 *   - no Malindi airport transfer price, which competitors publish
 *
 * The good existing content is kept: the real tuk-tuk fares, the Kobil stage
 * matatu route, and the honest "never more than KSh 600 anywhere in Watamu"
 * overcharging advice. That is the local knowledge the forum threads are
 * groping toward.
 *
 * This is now the HUB. The Mombasa airport journey has its own spoke post at
 * /journal/mombasa-airport-to-watamu and this page links down to it rather than
 * competing with it.
 *
 * EXTERNAL LINKS verified 200 before writing. Note that kenyarailway.com, which
 * ranks well for SGR queries, is NOT the official railway. The official
 * corporation is krc.co.ke and the official ticket portal is
 * metickets.krc.co.ke. The post links only those, and warns about the rest.
 *
 * Run locally:
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-watamu-transport-guide.ts --dry
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-watamu-transport-guide.ts
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
const POST_ID = 'blog-watamu-transport-guide'
const SLUG = 'watamu-transport-guide'

/* ── Verified image assets ─────────────────────────────────────────── */
const IMG = {
  tuktuk: 'image-109c748af964e683c7474a9fe1e2e474771500c7-1536x1024-png',   // existing cover, kept
  malindiAirport: 'image-09941aed3126ff690954d6f20380970021283444-720x616-jpg',
  bodaStage: 'image-1549ccb7c0aa4234f013ad2d7ad7441d12f2be20-1080x1440-jpg',
  shopRoad: 'image-d8473ffbec3401a22c62b0ee5be7b654fc8ad178-1500x1000-webp',
  kilifiBridge: 'image-60b1ce3885ebbef01718e516011c47281f8ad4fc-1039x641-jpg',
  watamuBeach: 'image-63df462742ea2467334998275abf0b7eb9a2d785-2048x1536-jpg',
}

/* ── External links (verified 200) ─────────────────────────────────── */
const X = {
  krc: 'https://krc.co.ke/',
  krcTickets: 'https://metickets.krc.co.ke/',
  kenyaAirways: 'https://www.kenya-airways.com/',
  jambojet: 'https://www.jambojet.com/',
  watamuMarine: 'https://www.watamumarine.co.ke/',
}

/* ── Internal links (verified 200) ─────────────────────────────────── */
const J = {
  mombasaSpoke: '/journal/mombasa-airport-to-watamu',
  money: '/journal/money-in-kenya-guide',
  watamuMoney: '/journal/money-exchange-atm-watamu-guide',
  watamu: '/journal/complete-guide-watamu-kenya-2026',
  beaches: '/journal/7-best-beaches-watamu-kenya',
  kilifi: '/journal/complete-guide-kilifi-kenya-2026',
  seaweed: '/journal/kenya-coast-seaweed-season-guide',
  eats: '/journal/best-restaurants-watamu-kenya',
  areas: '/journal/watamu-areas-neighbourhood-guide',
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
    if (p.link) {
      const k = key('l')
      markDefs.push({ _type: 'link', _key: k, href: p.link })
      marks.push(k)
    }
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
  _type: 'quickFactsBlock', _key: key('qf'), title, accentColor,
  items: items.map((i) => ({ _key: key('qfi'), ...i })),
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
  _type: 'budgetTableBlock', _key: key('bt'), columns,
  rows: rows.map((r) => ({ _key: key('bti'), label: r.label, values: r.values })),
})

const compareTable = (columns: Array<{ label: string; color: string }>, rows: Array<{ criterion: string; values: string[] }>): B => ({
  _type: 'compareTableBlock', _key: key('ct'),
  columns: columns.map((c) => ({ _key: key('cti'), ...c })),
  rows: rows.map((r) => ({ _key: key('ctr'), criterion: r.criterion, values: r.values })),
})

const deciderGrid = (cards: Array<{ label: string; color: string; title: string; items: string[] }>): B =>
  ({ _type: 'deciderGridBlock', _key: key('dg'), cards: cards.map((c) => ({ _key: key('dgi'), ...c })) })

const packingList = (title: string, items: Array<{ icon: string; text: string }>): B => ({
  _type: 'packingListBlock', _key: key('pl'), title, items: items.map((i) => ({ _key: key('pli'), ...i })),
})

const pullQuote = (text: string, accentColor = 'teal'): B =>
  ({ _type: 'pullQuoteBlock', _key: key('pq'), text, accentColor })

/* ── Body ──────────────────────────────────────────────────────────── */

const body: B[] = [
  quickFacts('✦ Getting to Watamu at a Glance', 'amber', [
    { icon: '✈️', label: 'Nearest airport', value: 'Malindi, 30 minutes away' },
    { icon: '🛬', label: 'Main hub', value: 'Mombasa, 2.5 hours away' },
    { icon: '🚄', label: 'From Nairobi', value: 'Fly, or SGR then road' },
    { icon: '🛺', label: 'Around town', value: 'KSh 150 to 600 by tuk-tuk' },
    { icon: '🚶', label: 'Walkable', value: 'Yes, the main areas' },
    { icon: '💵', label: 'Pay with', value: 'Cash or M-Pesa, never card' },
  ]),

  block('How to Get to Watamu', 'h2'),

  rich([
    { text: 'The fastest way to reach Watamu is to fly from Nairobi to Malindi and take a 30 minute taxi. ', bold: true },
    { text: 'The cheapest is a matatu up the coast from Mombasa for under KSh 600. The most scenic is the SGR train to Mombasa followed by the coast road north. Watamu has no airport of its own and no train station, so every route ends with a short drive, and which one you pick mostly comes down to whether you are optimising for time or money.' },
  ]),

  distanceChips([
    { icon: 'pin', text: '120 km north of Mombasa' },
    { icon: 'pin', text: '25 km south of Malindi' },
    { icon: 'clock', text: '30 min from Malindi Airport' },
    { icon: 'clock', text: '2.5 hrs from Mombasa Airport' },
  ]),

  compareTable(
    [
      { label: 'Time', color: 'teal' },
      { label: 'Rough cost', color: 'amber' },
      { label: 'Best for', color: 'slate' },
    ],
    [
      { criterion: 'Fly Nairobi to Malindi, then taxi', values: ['45 min flight plus 30 min', 'From KSh 4,000 plus 2,000 to 3,000', 'Almost everyone'] },
      { criterion: 'Fly into Mombasa, then road', values: ['Flight plus 2.5 hrs', 'Fare plus KSh 4,000 to 9,000', 'If Mombasa is your entry point'] },
      { criterion: 'SGR to Mombasa, then road', values: ['5.5 hrs plus 2.5 hrs', 'KSh 1,500 to 4,500 plus transfer', 'Scenic, and no flying'] },
      { criterion: 'Matatu from Mombasa', values: ['About 3 hrs', 'Under KSh 600 total', 'The cheapest way there is'] },
      { criterion: 'Taxi from Malindi', values: ['30 min', 'KSh 2,000 to 3,000', 'Arriving on a Malindi flight'] },
    ],
  ),

  /* ── By air ─────────────────────────────────────────────── */
  block('Flying in: Malindi or Mombasa?', 'h2'),

  block('Watamu sits between two airports and the choice genuinely matters. Malindi is 25 km north and about 30 minutes by road. Mombasa is 120 km south and about two and a half hours. If you are coming from Nairobi, fly to Malindi. It is not close.'),

  img(IMG.malindiAirport, 'The terminal building at Malindi International Airport in Kenya at dusk', 'Malindi International. Small, calm, and half an hour from Watamu.'),

  block('Flights to Malindi', 'h3'),

  rich([
    { text: 'There are several flights a day from Nairobi, operated by ' },
    { text: 'Kenya Airways', link: X.kenyaAirways },
    { text: ', ' },
    { text: 'Jambojet', link: X.jambojet },
    { text: ', AirKenya and Fly540. The flight takes about 45 minutes and fares start around KSh 4,000 one way if you book ahead. Malindi is a small airport, so arrivals are quick and taxis wait outside for every flight. Expect KSh 2,000 to 3,000 for the transfer to Watamu, and agree the fare before you get in.' },
  ]),

  tip('tip', '✈️', 'Malindi over Mombasa, almost always', 'Landing in Mombasa adds two and a half hours of road on top of your flight, and that road is slow in the afternoon. Unless Mombasa is where your international flight lands, or the Malindi fare is dramatically higher, Malindi wins on every measure that matters.'),

  /* ── SGR ────────────────────────────────────────────────── */
  block('Taking the SGR train from Nairobi', 'h2'),

  block('The Madaraka Express is the best value long journey in Kenya and a genuinely lovely way to reach the coast. It runs from Nairobi to Mombasa in about five and a half to six hours, crossing Tsavo on the way, and it costs a fraction of a flight.'),

  statRow([
    { number: '1,500', label: 'KSh economy class one way' },
    { number: '4,500', label: 'KSh first class one way' },
    { number: '5.5 hrs', label: 'Nairobi to Mombasa' },
    { number: '3', label: 'departures a day' },
  ]),

  block('What nobody tells you about the stations', 'h3'),

  block('Both terminals are outside the city they are named after, and this catches people out constantly. Nairobi Terminus is at Syokimau, well south of the city centre. Mombasa Terminus is at Miritini, roughly 20 km from Mombasa island. Budget time and fare for getting to and from both.'),

  rich([
    { text: 'For Watamu, Miritini is actually good news. You arrive already on the mainland northwest of the island, which means you skip the worst of the island traffic that a Mombasa airport arrival has to fight through. From Miritini it is about two and a half hours by road to Watamu. A taxi arranged in advance is the simplest option, or take a matatu towards Mtwapa and change for Malindi. Our ' },
    { text: 'guide from Mombasa airport to Watamu', link: J.mombasaSpoke },
    { text: ' covers that road in detail, and the same route applies from the train.' },
  ]),

  block('Booking tickets', 'h3'),

  rich([
    { text: 'Book through the official ' },
    { text: 'Kenya Railways ticket portal', link: X.krcTickets },
    { text: ', or by dialling *639# on a Safaricom line, or at a station booking office. Tickets sell out on Friday and Sunday services and around public holidays, so book a few days ahead. ' },
    { text: 'Kenya Railways', link: X.krc },
    { text: ' is the operator.' },
  ]),

  tip('warning', '🚨', 'Watch out for lookalike ticket sites', 'Several unofficial sites rank well for SGR searches and look like the railway. The only official channels are metickets.krc.co.ke, the *639# USSD line, and a station counter. If a site asks for card details for a train ticket and the domain is not krc.co.ke, close the tab. Fares are KSh 1,500 economy and KSh 4,500 first class. Anything wildly above that is a markup.'),

  /* ── By road ────────────────────────────────────────────── */
  block('Coming by road from Mombasa', 'h2'),

  block('The coast road north from Mombasa is one of Kenya’s nicer drives, running through Mtwapa, Kilifi and Gede with the ocean appearing and disappearing behind the palms. It takes about two and a half hours in normal traffic and rather longer if you hit Mombasa at the wrong time of day.'),

  img(IMG.kilifiBridge, 'Kilifi bridge crossing the creek on the coast road between Mombasa and Watamu', 'You cross Kilifi Creek about two thirds of the way up. It is worth looking out of the window.'),

  rich([
    { text: 'This is the single most searched journey to Watamu, so it has its own guide: ' },
    { text: 'Mombasa airport to Watamu, every option with 2026 prices', link: J.mombasaSpoke },
    { text: '. The short version is that a private taxi runs KSh 4,000 to 9,000 depending on where you book it, and the matatu route costs under KSh 600.' },
  ]),

  tip('tip', '🚐', 'The cheap matatu route explained', 'Take a matatu from Mombasa’s Kobil stage to Malindi, around KSh 250 to 350 and roughly two hours. At Malindi, change to a matatu or tuk-tuk for Watamu, another KSh 100 to 200 and about 30 minutes. Total is under KSh 600 and about three hours. It is hot, it is crowded, and it is how most of the coast travels.'),

  block('Coming from Malindi, Kilifi or Diani', 'h3'),

  ...bullets([
    'From Malindi: 30 minutes. Taxi KSh 2,000 to 3,000, or a matatu for KSh 100 to 200.',
    'From Kilifi: about an hour south on the same coast road. Taxi around KSh 3,000 to 4,000.',
    'From Diani: four to five hours, because you have to cross Mombasa and the Likoni ferry. Leave early.',
  ]),

  rich([
    { text: 'Note that the Likoni ferry only matters if you are travelling to or from the south coast. Going north to Watamu from Mombasa airport or the SGR terminus does not involve a ferry at all, which is a common misconception. If you are weighing up the coast towns, our ' },
    { text: 'Kilifi guide', link: J.kilifi },
    { text: ' is worth a look.' },
  ]),

  /* ── Getting around ─────────────────────────────────────── */
  block('Getting around Watamu once you arrive', 'h2'),

  block('Watamu is small. It runs along one road about nine kilometres end to end, and you can drive the whole length in twenty minutes. Most places are within fifteen minutes of each other, and the main beach road and town centre are genuinely walkable during the day. For everything else, tuk-tuks are your best friend.'),

  img(IMG.bodaStage, 'Boda boda riders waiting at a stage under palm trees in Watamu, Kenya', 'A boda boda stage. There is one at every junction and beach entrance.'),

  budgetTable(
    ['Typical fare', 'Good for'],
    [
      { label: 'Tuk-tuk', values: ['KSh 300 to 600', 'Two or three people, luggage, nights'] },
      { label: 'Boda boda (motorbike)', values: ['KSh 100 to 300', 'Fast solo hops in daylight'] },
      { label: 'Walking', values: ['Free', 'The beach road and town centre'] },
      { label: 'Scooter rental', values: ['KSh 1,500 to 2,500 a day', 'Stays of five days or more'] },
      { label: 'Taxi to Malindi', values: ['KSh 2,000 to 3,000', 'Airport runs and day trips'] },
    ],
  ),

  block('A scooter is worth it if you are staying five days or more, because it opens up Gede Ruins, Arabuko Sokoke Forest and Mida Creek without negotiating a fare every time. You need a licence.'),

  tip('teal', '🛺', 'Klickenya fare guide: Watamu 2026', 'Town centre to Sunset Lab: KSh 300 to 400. Town centre to Garoda Beach: KSh 500 to 600. Town centre to Jacaranda Beach: KSh 400 to 500. After 10pm add KSh 100 to 200. Always agree the fare before you get in, not after you arrive.'),

  /* ── Honest pricing ─────────────────────────────────────── */
  block('What a fare should actually cost', 'h2'),

  block('Everyone speaks English here and many speak Italian too, so do not be shy about asking or negotiating clearly. Kenyans are warm and tourism brings real opportunity, but visitors often have no idea what local prices are and get quoted accordingly.'),

  pullQuote('A tuk-tuk or boda boda ride anywhere within Watamu should never cost more than KSh 600. That is the far end of town, on the high side. Most rides are KSh 150 to 350.'),

  block('Knowing that number and saying it calmly settles the conversation in about five seconds. It is not rude, it is just how the market works.'),

  tip('tip', '📱', 'Find one driver and keep them', 'Once you find a tuk-tuk or boda boda driver you like and trust, take their number and call them directly. You will get fair prices without negotiating every time, a reliable pickup at night, and someone who actually knows where your villa is. This is the single best thing you can do in your first two days.'),

  img(IMG.shopRoad, 'The main shopping road in Watamu with tuk-tuks, boda bodas and small shops', 'The main road. Tuk-tuks, boda bodas and everything you need, all on one strip.'),

  /* ── Practical ──────────────────────────────────────────── */
  block('Practical things worth knowing', 'h2'),

  tip('warning', '🌙', 'Motorbikes after dark', 'Avoid boda bodas on unlit roads at night. The stretches between the beaches are poorly lit and the road surface is uneven in places. Take a tuk-tuk instead. It costs a couple of hundred shillings more and it is the right call.'),

  rich([
    { text: 'Carry cash. Card readers in Watamu are unreliable and many small places have none at all. Shillings and M-Pesa cover everything, and if you have not set M-Pesa up yet, our ' },
    { text: 'guide to money in Kenya', link: J.money },
    { text: ' explains how visitors register in about twenty minutes with a passport. The ' },
    { text: 'Watamu money and ATM guide', link: J.watamuMoney },
    { text: ' has the local detail on which machines to trust.' },
  ]),

  packingList('Before you set off', [
    { icon: '💵', text: 'Small notes, drivers rarely have change' },
    { icon: '📱', text: 'A local SIM with M-Pesa activated' },
    { icon: '📍', text: 'Your accommodation pinned offline' },
    { icon: '☎️', text: 'Your host’s number, saved before you land' },
    { icon: '🧴', text: 'Water for the road, it is a hot drive' },
    { icon: '🕐', text: 'A buffer if you are connecting to a flight' },
  ]),

  deciderGrid([
    {
      label: 'FASTEST', color: 'teal', title: 'Fly to Malindi',
      items: ['45 minutes from Nairobi', '30 minute taxi to Watamu', 'From about KSh 4,000 plus transfer', 'Do this unless you have a reason not to'],
    },
    {
      label: 'CHEAPEST', color: 'amber', title: 'Matatu from Mombasa',
      items: ['Under KSh 600 all in', 'About three hours with a change at Malindi', 'Hot and crowded', 'Genuinely fine in daylight'],
    },
    {
      label: 'MOST SCENIC', color: 'blue', title: 'SGR then the coast road',
      items: ['Tsavo from the train window', 'KSh 1,500 economy, 4,500 first', 'Arrive Miritini, then 2.5 hrs north', 'Book a few days ahead'],
    },
    {
      label: 'EASIEST', color: 'purple', title: 'Prebooked private transfer',
      items: ['Arranged by your host before you land', 'A name board at arrivals', 'No negotiating after a long flight', 'Worth it for late arrivals and families'],
    },
  ]),

  /* ── FAQ ────────────────────────────────────────────────── */
  block('Getting to Watamu: frequently asked questions', 'h2'),

  block('What is the closest airport to Watamu?', 'h3'),
  block('Malindi International Airport, about 25 km north and roughly 30 minutes by road. Mombasa’s Moi International is the larger airport but it is 120 km south, which is about two and a half hours of driving. For anyone flying in from Nairobi, Malindi is the better choice by a wide margin.'),

  block('How do I get from Mombasa to Watamu?', 'h3'),
  block('Three realistic options. A private taxi takes about two and a half hours and costs roughly KSh 4,000 to 9,000 depending on where you book it. A matatu via Malindi costs under KSh 600 in total and takes about three hours with one change. Or fly Mombasa to Malindi and take a short taxi, which is quickest but adds an airport transfer at both ends.'),

  block('Can I take the SGR train to Watamu?', 'h3'),
  block('Not directly, because Watamu has no station. The Madaraka Express runs Nairobi to Mombasa, arriving at Mombasa Terminus in Miritini, and you continue by road from there. It is about two and a half hours north to Watamu. Economy is KSh 1,500 and first class KSh 4,500, and Miritini is a slightly better starting point for the coast road than the airport is.'),

  block('Do I need to cross the Likoni ferry to reach Watamu?', 'h3'),
  block('No. The Likoni ferry only matters for the south coast, meaning Diani and Tiwi. Watamu is north of Mombasa, so you cross the island and head up the coast road without a ferry at any point. Only journeys between Watamu and Diani involve it.'),

  block('How much is a tuk-tuk in Watamu?', 'h3'),
  block('Between KSh 300 and 600 for most journeys, and KSh 150 to 350 for shorter hops. Nothing within Watamu should exceed KSh 600, even end to end. Fares rise by KSh 100 to 200 after about 10pm. Agree the price before you get in.'),

  block('Is it safe to use boda bodas in Watamu?', 'h3'),
  block('In daylight, yes, and they are the normal way to get about. At night, take a tuk-tuk instead. The roads between the beaches are poorly lit and uneven, and the extra couple of hundred shillings is well spent. Finding one driver you trust and calling them directly is safer and easier than flagging down whoever is nearest.'),

  block('Do I need a car in Watamu?', 'h3'),
  block('No. The town is small, walkable in its main areas, and tuk-tuks are cheap and everywhere. A scooter is worth renting if you are staying five days or more and want to reach Gede Ruins, Arabuko Sokoke Forest or Mida Creek independently, but a full car is rarely necessary.'),

  /* ── Close ──────────────────────────────────────────────── */
  block('The bottom line', 'h2'),

  block('Fly to Malindi if you can, take the train if you would rather see the country, and take a matatu if you are counting shillings. Once you are here, a tuk-tuk driver you trust and a phone with M-Pesa on it are the only transport infrastructure you need.'),

  img(IMG.watamuBeach, 'Clear turquoise water over white sand at Watamu, Kenya', 'The reason for the journey.'),

  rich([
    { text: 'Now that you know how to get here, the ' },
    { text: 'complete Watamu guide', link: J.watamu },
    { text: ' covers everything else, the ' },
    { text: 'neighbourhood guide', link: J.areas },
    { text: ' explains which part of town to stay in, the ' },
    { text: 'seven best beaches', link: J.beaches },
    { text: ' tells you where to spend your days, and the ' },
    { text: 'seaweed season guide', link: J.seaweed },
    { text: ' tells you which months to aim for. When you get hungry, start with the ' },
    { text: 'best restaurants in Watamu', link: J.eats },
    { text: '. For marine park and conservation information, the ' },
    { text: 'Watamu Marine Association', link: X.watamuMarine },
    { text: ' is the local authority.' },
  ]),
]

/* ── Push ──────────────────────────────────────────────────────────── */

const doc = {
  _id: POST_ID,
  _type: 'blogPost',
  title: 'How to Get to and Around Watamu (2026): Every Route, Real Prices',
  slug: { _type: 'slug', current: SLUG },
  status: 'published',
  author: { _type: 'reference', _ref: AUTHOR_ID },
  excerpt:
    'Flights to Malindi, the SGR from Nairobi, the matatu route from Mombasa and what a tuk-tuk should really cost. Every way into Watamu with 2026 prices.',
  coverImage: {
    _type: 'image',
    alt: 'A tuk-tuk and a boda boda on a coastal road in Watamu, Kenya',
    asset: { _type: 'reference', _ref: IMG.tuktuk },
  },
  primaryCategory: 'destination_guide',
  subcategory: 'getting_there',
  postType: 'guide',
  location: 'watamu',
  series: 'Watamu Complete Guide',
  focusKeyword: 'how to get to watamu',
  keywords: ['how to get to watamu', 'mombasa to watamu', 'malindi airport watamu', 'sgr to watamu', 'watamu tuk tuk prices', 'watamu transport', 'matatu mombasa malindi'],
  tags: ['transport', 'watamu', 'practical', 'getting there', 'travel tips'],
  readingTime: 10,
  publishedAt: '2026-03-12T08:00:00Z',
  seoTitle: 'How to Get to Watamu 2026: Flights, SGR, Taxis and Prices',
  seoDescription:
    'Every route into Watamu with real 2026 prices. Malindi flights, the SGR from Nairobi, the cheap matatu from Mombasa, and what a tuk-tuk should cost.',
  body,
}

async function main() {
  const words = body
    .filter((b) => b._type === 'block')
    .flatMap((b) => (b.children ?? []).map((c: any) => c.text))
    .join(' ').split(/\s+/).filter(Boolean).length

  const mix = body.reduce<Record<string, number>>((a, b) => { a[b._type] = (a[b._type] ?? 0) + 1; return a }, {})
  const ext = new Set<string>(); const int = new Set<string>()
  for (const b of body) for (const m of b.markDefs ?? []) if (m._type === 'link') (m.href.startsWith('http') ? ext : int).add(m.href)

  console.log(`📝 ${doc.title}`)
  console.log(`   /journal/${SLUG}  (rewrite in place, _id ${POST_ID})`)
  console.log(`   ${body.length} body blocks · ~${words} words of prose  (was 29 blocks / ~436 words)`)
  console.log(`   ${ext.size} external links · ${int.size} internal links · ${body.filter((b) => b._type === 'image').length} body images`)
  console.log(`   block mix: ${Object.entries(mix).map(([k, v]) => `${k.replace('Block', '')}×${v}`).join(', ')}`)

  if (DRY) {
    console.log('\n  external:'); ext.forEach((u) => console.log('   ', u))
    console.log('  internal:'); int.forEach((u) => console.log('   ', u))
    console.log('\nDry run. Re-run without --dry to publish.')
    return
  }
  await client.createOrReplace(doc)
  console.log(`\n✅ Updated: https://www.klickenya.com/journal/${SLUG}`)
}

main().catch((err) => { console.error('❌ Failed:', err); process.exit(1) })
