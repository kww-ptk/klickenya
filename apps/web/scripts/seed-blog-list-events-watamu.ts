/**
 * Seed "Where to List Your Events in Watamu" — event organiser lead magnet.
 * Route: /journal/where-to-list-your-events-in-watamu
 *
 * Companion to the Kilifi version. The two are deliberately NOT the same post
 * with the town swapped: Watamu's event culture is beach parties, marine trips
 * and hotel yoga, Kilifi's is festivals, wellness and the creative community.
 * Writing them as near duplicates would cannibalise both.
 *
 * THE HONEST GAP, which is the whole argument of the post: Mookh, Ticketsasa,
 * Quicket and HustleSasa are payment rails. They sell tickets well and nobody
 * browses them to find something to do in Watamu on Friday. Instagram is where
 * coastal events actually get promoted, but it only reaches people who already
 * follow you and it disappears in a day. Discovery by visitors who are already
 * in town is the piece nobody covers, and it is the one we can honestly claim.
 *
 * ACCURACY NOTE ON FEES: /become-a-host verifiably says free to list, 24h
 * review, and that hosts keep their bookings. Ticketing runs through Paystack.
 * PLATFORM_TICKET_FEE_BPS defaults to 0 in code and is not set in .env.local,
 * so the production value is unknown from here. This post therefore says
 * listing is free and describes the ticketing features WITHOUT asserting any
 * platform cut on ticket sales. Confirm the production value before adding one.
 *
 * REALITY CHECK: Watamu currently has 2 published event listings. The post does
 * not pretend otherwise; it uses the "be early" framing, which is truthful here.
 *
 * EXTERNAL LINKS verified 200: mookh.com, ticketsasa.com, quicket.co.ke,
 * hustlesasa.com, eventbrite.com. Paystack 403s to bots so it is named, not
 * linked.
 *
 * Run:
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-list-events-watamu.ts --dry
 */
import { createClient } from 'next-sanity'

const DRY = process.argv.includes('--dry')
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01', token: process.env.SANITY_API_TOKEN!, useCdn: false,
})

const AUTHOR_ID = '0a5287ef-f74d-4893-a487-6b672cb63477'
const POST_ID = 'blog-where-to-list-your-events-in-watamu'
const SLUG = 'where-to-list-your-events-in-watamu'

const IMG = {
  paparemo: 'image-61138fa9cd9333db7d1335c20671d2073041acce-1600x900-jpg',
  treehouseYoga: 'image-408a9b91ddf8f9649b49865f13b6b9b4ddb6f21b-1500x1000-webp',
  nightlife: 'image-1c1c05b4e703cca61dc5c142f18b59b9539cbb52-1409x1117-png',
}
const X = {
  mookh: 'https://mookh.com/', ticketsasa: 'https://www.ticketsasa.com/',
  quicket: 'https://www.quicket.co.ke/', hustlesasa: 'https://hustlesasa.com/',
  eventbrite: 'https://www.eventbrite.com/',
}
const J = {
  list: '/list', events: '/events', destination: '/destinations/watamu',
  nightlife: '/journal/watamu-nightlife-guide',
  watamu: '/journal/complete-guide-watamu-kenya-2026',
  beaches: '/journal/7-best-beaches-watamu-kenya',
  eats: '/journal/best-restaurants-watamu-kenya',
  seaweed: '/journal/kenya-coast-seaweed-season-guide',
  business: '/journal/where-to-list-your-business-in-kenya',
  kilifi: '/journal/where-to-list-your-events-in-kilifi',
}

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
const bullets = (items: string[]): B[] => items.map((t) => ({
  _type: 'block', _key: key('b'), style: 'normal', listItem: 'bullet', level: 1,
  markDefs: [], children: [{ _type: 'span', _key: key('s'), text: t, marks: [] }],
}))
const img = (a: string, alt: string, caption?: string): B => ({
  _type: 'image', _key: key('i'), alt, ...(caption ? { caption } : {}), asset: { _type: 'reference', _ref: a },
})
const quickFacts = (t: string, c: string, items: Array<{ icon: string; label: string; value: string }>): B =>
  ({ _type: 'quickFactsBlock', _key: key('qf'), title: t, accentColor: c, items: items.map((i) => ({ _key: key('qfi'), ...i })) })
const tip = (v: string, i: string, l: string, t: string): B =>
  ({ _type: 'tipCardBlock', _key: key('tc'), variant: v, icon: i, label: l, text: t })
const statRow = (s: Array<{ number: string; label: string }>): B =>
  ({ _type: 'statRowBlock', _key: key('sr'), stats: s.map((x) => ({ _key: key('sri'), ...x })) })
const compareTable = (cols: Array<{ label: string; color: string }>, rows: Array<{ criterion: string; values: string[] }>): B =>
  ({ _type: 'compareTableBlock', _key: key('ct'), columns: cols.map((c) => ({ _key: key('cti'), ...c })), rows: rows.map((r) => ({ _key: key('ctr'), ...r })) })
const budgetTable = (cols: string[], rows: Array<{ label: string; values: string[] }>): B =>
  ({ _type: 'budgetTableBlock', _key: key('bt'), columns: cols, rows: rows.map((r) => ({ _key: key('bti'), ...r })) })
const deciderGrid = (cards: Array<{ label: string; color: string; title: string; items: string[] }>): B =>
  ({ _type: 'deciderGridBlock', _key: key('dg'), cards: cards.map((c) => ({ _key: key('dgi'), ...c })) })
const verdictCard = (v: string, l: string, t: string, pros: string[], cons: string[]): B =>
  ({ _type: 'verdictCardBlock', _key: key('vc'), variant: v, label: l, title: t, pros, cons })
const packingList = (t: string, items: Array<{ icon: string; text: string }>): B =>
  ({ _type: 'packingListBlock', _key: key('pl'), title: t, items: items.map((i) => ({ _key: key('pli'), ...i })) })
const whoIsItFor = (t: string, items: Array<{ icon: string; text: string }>): B =>
  ({ _type: 'whoIsItForBlock', _key: key('wf'), title: t, items: items.map((i) => ({ _key: key('wfi'), ...i })) })
const pullQuote = (text: string, accentColor = 'teal'): B =>
  ({ _type: 'pullQuoteBlock', _key: key('pq'), text, accentColor })

const body: B[] = [
  quickFacts('✦ The Short Version', 'purple', [
    { icon: '🎟️', label: 'To sell tickets', value: 'Mookh, Ticketsasa or Quicket' },
    { icon: '🔎', label: 'To be discovered', value: 'A local listing, plus Klickenya' },
    { icon: '📱', label: 'Instagram', value: 'Reach, but gone in 24 hours' },
    { icon: '🚫', label: 'Avoid', value: 'Eventbrite, weak on M-Pesa' },
    { icon: '💸', label: 'Listing with us', value: 'Free, reviewed in 24 hours' },
    { icon: '🎯', label: 'Works for', value: 'Parties, yoga, classes, tours' },
  ]),

  block('Where to List Your Events in Watamu', 'h2'),

  rich([
    { text: 'If you run events in Watamu, you have two separate problems and most organisers only solve one of them. ', bold: true },
    { text: 'Selling tickets is solved: Mookh, Ticketsasa and Quicket all handle M-Pesa properly. Being found is not. Nobody browses a ticketing platform to see what is on in Watamu this weekend, and an Instagram story reaches the people who already follow you and then disappears. The visitors filling your beach party arrived three days ago and are searching for something to do tonight.' },
  ]),

  img(IMG.paparemo, 'A beach venue in Watamu set up with lanterns and fairy lights for an evening event', 'Watamu fills up with people actively looking for something to do. Most events here are never findable by them.'),

  /* ── Two problems ───────────────────────────────────────── */
  block('Ticketing and discovery are not the same thing', 'h2'),

  block('This is the distinction that decides where you should list. A ticketing platform takes payment and issues a ticket. A discovery platform puts your event in front of someone who did not already know it existed. Very few tools do both, and in Watamu the gap is discovery.'),

  compareTable(
    [
      { label: 'Sells tickets', color: 'teal' },
      { label: 'Brings new people', color: 'purple' },
      { label: 'Best for', color: 'slate' },
    ],
    [
      { criterion: 'Mookh', values: ['Yes, M-Pesa native', 'Barely', 'Paid events, fast payouts'] },
      { criterion: 'Ticketsasa', values: ['Yes', 'Barely', 'Larger and corporate events'] },
      { criterion: 'Quicket', values: ['Yes', 'Some', 'Festivals and multi day events'] },
      { criterion: 'HustleSasa', values: ['Yes', 'Some', 'Creators selling to a following'] },
      { criterion: 'Eventbrite', values: ['Poorly in Kenya', 'Some', 'International audiences only'] },
      { criterion: 'Instagram', values: ['No', 'Existing followers only', 'Reminders, not discovery'] },
      { criterion: 'Klickenya', values: ['Yes, M-Pesa and card', 'Yes, visitors already in Watamu', 'Anything a visitor could attend'] },
    ],
  ),

  rich([
    { text: 'On the ticketing side, ' },
    { text: 'Mookh', link: X.mookh },
    { text: ' is the one most small Kenyan organisers land on, largely because payouts are quick and it is built around M-Pesa. ' },
    { text: 'Ticketsasa', link: X.ticketsasa },
    { text: ' has been around longest and skews corporate. ' },
    { text: 'Quicket', link: X.quicket },
    { text: ' suits festivals, and ' },
    { text: 'HustleSasa', link: X.hustlesasa },
    { text: ' works if you already have an audience to sell to.' },
  ]),

  tip('warning', '🚫', 'Think twice about Eventbrite in Kenya', 'Eventbrite is built around cards and PayPal. Your attendees will want to pay by M-Pesa, and that is not something it handles natively. Unless your audience is largely international and paying by card, a Kenyan platform will cost you fewer abandoned checkouts.'),

  /* ── What works in Watamu ───────────────────────────────── */
  block('What actually draws a crowd in Watamu', 'h2'),

  block('Watamu is a small town with a large, rotating population of visitors. That shapes what works. Your audience is not a mailing list you built over years. It is whoever happens to be here this week, and they are searching rather than following.'),

  budgetTable(
    ['Who turns up', 'Where they look'],
    [
      { label: 'Beach parties and DJ nights', values: ['Visitors and the Nairobi weekend crowd', 'Instagram, word of mouth, hotel staff'] },
      { label: 'Yoga and wellness classes', values: ['Long stay guests, residents', 'Hotel noticeboards, search'] },
      { label: 'Gym and fitness sessions', values: ['Residents and repeat visitors', 'Word of mouth, WhatsApp groups'] },
      { label: 'Cooking classes', values: ['Couples and families on holiday', 'Search, hotel recommendations'] },
      { label: 'Boat trips and marine tours', values: ['Almost every visitor', 'Search, hotel desks, beach operators'] },
      { label: 'Kitesurf clinics', values: ['Seasonal, wind dependent', 'Kite schools, search'] },
      { label: 'Live music and festivals', values: ['Everyone, if they hear about it', 'Instagram, posters, radio'] },
    ],
  ),

  block('Look at that right hand column. Almost every route is either word of mouth or search. Word of mouth you cannot control. Search you can.'),

  img(IMG.treehouseYoga, 'A yoga class under a makuti roofed pavilion on the Kenyan coast', 'Yoga, classes and clinics are the easiest events to fill and the hardest to find online.'),

  pullQuote('The guest who would have loved your Thursday cooking class is sitting on a sunbed four hundred metres away, googling "things to do in Watamu". If you are not in that result, you do not exist to them.'),

  /* ── Klickenya ──────────────────────────────────────────── */
  block('Where Klickenya fits', 'h2'),

  block('We are a Kenyan marketplace and our event section is new, so here is the honest position. We do not have the ticketing volume of Mookh. What we have is the audience: people already reading about Watamu on our guides, already browsing stays and restaurants here, already in town or arriving next week.'),

  ...bullets([
    'Listing an event is free and reviewed by a person within about twenty four hours.',
    'Ticketing is built in and runs through Paystack, so attendees can pay by M-Pesa or card.',
    'Tickets are issued with a QR code and there is a door scanner, so check in is not a paper list.',
    'You can run per event coupons, set your own ticket tiers, and monitor sales as they come in.',
    'Free events work too. Plenty of what happens here does not need a ticket at all.',
    'You can list a recurring event once rather than reposting it every week.',
  ]),

  statRow([
    { number: 'Free', label: 'to list an event' },
    { number: '24 hrs', label: 'review before it goes live' },
    { number: 'M-Pesa', label: 'and card, via Paystack' },
    { number: 'QR', label: 'tickets with a door scanner' },
  ]),

  block('Why it pays to be early', 'h3'),

  block('Our event section in Watamu is small right now. For an organiser that is the opportunity rather than the problem. Being one of a handful of listed events on a site that already ranks for Watamu searches is worth considerably more than being one of thousands on a national platform nobody browses by town. That advantage closes as the section fills up.'),

  rich([
    { text: 'You can ' },
    { text: 'list your event here', link: J.list },
    { text: ', choosing Event at the first step. It takes about five minutes and there is nothing to pay.' },
  ]),

  /* ── Practical ──────────────────────────────────────────── */
  block('Making the listing actually work', 'h2'),

  packingList('What a good Watamu event listing needs', [
    { icon: '📸', text: 'A real photo of the venue, not a text poster' },
    { icon: '📍', text: 'Where it is, in terms a visitor understands' },
    { icon: '🕐', text: 'A start time people believe, and an end time' },
    { icon: '💰', text: 'The price, or the word free, up front' },
    { icon: '🚕', text: 'Whether a tuk-tuk can find it after dark' },
    { icon: '📱', text: 'A WhatsApp number someone actually answers' },
  ]),

  tip('teal', '🛺', 'Klickenya local tip', 'Include how to get there and what a tuk-tuk should cost. Half your potential audience is staying somewhere else along the strip and will quietly skip an event if they cannot picture the journey home. It is the single most useful line you can add, and almost nobody adds it.'),

  rich([
    { text: 'Timing matters more here than most places. Watamu empties out in the low season and fills hard over Christmas and in the dry months, and the ' },
    { text: 'seaweed season guide', link: J.seaweed },
    { text: ' explains which months bring the crowds. Our ' },
    { text: 'nightlife guide', link: J.nightlife },
    { text: ' covers what the party calendar already looks like, which is worth reading before you pick a night that clashes.' },
  ]),

  img(IMG.nightlife, 'Sunset drinks at a beach bar in Watamu, Kenya', 'Pick a night nobody else has taken. In a town this size, two good events on one Friday split the same crowd.'),

  /* ── Decider ────────────────────────────────────────────── */
  block('Which platform for which event', 'h2'),

  deciderGrid([
    {
      label: 'PAID EVENT', color: 'teal', title: 'Klickenya plus a ticketing platform',
      items: ['List with us for discovery', 'Tickets by M-Pesa or card', 'QR check in at the door', 'Mookh alongside if you want a second channel'],
    },
    {
      label: 'FREE EVENT', color: 'blue', title: 'Klickenya and Instagram',
      items: ['No ticketing needed', 'Listing still gets you found', 'Instagram to remind your followers', 'Recurring events listed once'],
    },
    {
      label: 'RECURRING CLASS', color: 'amber', title: 'Klickenya, listed once',
      items: ['Yoga, fitness, cooking, kite clinics', 'Set the schedule rather than reposting', 'Long stay guests find it by search', 'Add a WhatsApp number'],
    },
    {
      label: 'BIG FESTIVAL', color: 'purple', title: 'A national ticketing platform',
      items: ['Quicket or Ticketsasa for scale', 'Then list here for local discovery', 'Two channels, not one', 'Start promoting months ahead'],
    },
  ]),

  verdictCard(
    'teal',
    'THE VERDICT',
    'Sell tickets nationally, get discovered locally',
    [
      'Ticketing platforms handle payment well and discovery badly',
      'Search is the one channel you can influence in a visitor town',
      'Free to list, so testing it costs nothing but the five minutes',
      'Recurring classes only need listing once',
    ],
    [
      'Our event section in Watamu is still small',
      'Instagram still matters for reminding your existing followers',
      'A listing does not fix an event nobody wants to attend',
      'Paystack transaction fees apply to paid tickets, as with any processor',
    ],
  ),

  whoIsItFor('🎯 Worth listing if you run...', [
    { icon: '🎉', text: 'Beach parties, DJ nights or live music' },
    { icon: '🧘', text: 'Yoga, meditation or wellness sessions' },
    { icon: '🏋️', text: 'Gym, fitness or bootcamp classes' },
    { icon: '🍳', text: 'Cooking classes and food experiences' },
    { icon: '⛵', text: 'Boat trips, snorkelling and marine tours' },
    { icon: '🪁', text: 'Kite clinics, dive courses and workshops' },
  ]),

  /* ── FAQ ────────────────────────────────────────────────── */
  block('Listing events in Watamu: frequently asked questions', 'h2'),

  block('Where can I advertise my event in Watamu?', 'h3'),
  block('For selling tickets, Mookh, Ticketsasa and Quicket all work well in Kenya and handle M-Pesa. For being discovered by visitors who do not already follow you, list it on a local platform that people browse by town, and keep Instagram for reminding the audience you already have. Most organisers here need both.'),

  block('Is it free to list an event on Klickenya?', 'h3'),
  block('Yes. Listing is free, a person reviews it within about twenty four hours, and free events are as welcome as paid ones. Ticketing runs through Paystack, so standard payment processing fees apply to paid tickets in the same way they would on any platform.'),

  block('Can I sell tickets with M-Pesa?', 'h3'),
  block('Yes. Ticketing runs through Paystack, which supports both M-Pesa and card payments. Tickets are issued with a QR code and there is a door scanner, so you check people in from a phone rather than a printed list.'),

  block('Can I list a weekly yoga or fitness class?', 'h3'),
  block('Yes, and it is one of the better uses of the platform. Recurring events can be listed once with a schedule rather than reposted every week, which means long stay guests and residents searching for a class can find it any time rather than only when you last posted about it.'),

  block('Does Eventbrite work in Kenya?', 'h3'),
  block('Only partly. Eventbrite is built around card and PayPal payments, and most Kenyan attendees expect to pay by M-Pesa. Unless your audience is largely international, a Kenyan platform will lose you fewer sales at the checkout.'),

  block('What is the best night for an event in Watamu?', 'h3'),
  block('It depends on what is already running. Watamu is small enough that two good events on the same Friday simply split one crowd. Check what regular nights already exist before you commit, and consider that visitor numbers swing enormously between the peak months and the low season.'),

  /* ── Close ──────────────────────────────────────────────── */
  block('The bottom line', 'h2'),

  block('Use a national platform to take the money and a local one to be found. In a town where most of your audience arrived last Tuesday and leaves next Sunday, being findable by search is worth more than any amount of posting to followers who are somewhere else.'),

  block('List your Watamu event on Klickenya', 'h3'),

  rich([
    { text: 'Free to list. Reviewed in 24 hours. M-Pesa and card ticketing with QR check in.', bold: true },
    { text: ' Parties, yoga, classes, tours, whatever you run. Put it where the people already in Watamu are looking.' },
  ]),

  rich([
    { text: '→ ' },
    { text: 'List your event', link: J.list },
    { text: '   ·   ' },
    { text: 'See what is on', link: J.events },
    { text: '   ·   ' },
    { text: 'Running events in Kilifi instead?', link: J.kilifi },
  ]),

  rich([
    { text: 'If you run a business rather than events, see ' },
    { text: 'where to list your business in Kenya', link: J.business },
    { text: '. And for context on the town itself, our ' },
    { text: 'complete Watamu guide', link: J.watamu },
    { text: ', the ' },
    { text: 'best beaches', link: J.beaches },
    { text: ' and the ' },
    { text: 'restaurant guide', link: J.eats },
    { text: ' are what your future attendees are already reading. Browse ' },
    { text: 'Watamu', link: J.destination },
    { text: ' to see the rest.' },
  ]),
]

const doc = {
  _id: POST_ID, _type: 'blogPost',
  title: 'Where to List Your Events in Watamu (2026): Tickets, Discovery and What Works',
  slug: { _type: 'slug', current: SLUG },
  status: 'published',
  author: { _type: 'reference', _ref: AUTHOR_ID },
  excerpt:
    'Ticketing and discovery are different problems. Mookh and Ticketsasa sell tickets; nobody browses them for what is on in Watamu. Where to list parties, yoga, classes and tours.',
  coverImage: {
    _type: 'image',
    alt: 'A beach venue in Watamu set up with lanterns for an evening event',
    asset: { _type: 'reference', _ref: IMG.paparemo },
  },
  primaryCategory: 'events_nightlife',
  postType: 'guide',
  location: 'watamu',
  focusKeyword: 'list your event in watamu',
  keywords: ['list your event in watamu', 'advertise event watamu', 'watamu events', 'event ticketing kenya', 'sell tickets mpesa', 'promote event kenya coast'],
  tags: ['events', 'hosts', 'watamu', 'marketing', 'practical'],
  readingTime: 9,
  publishedAt: '2026-09-06T09:00:00Z',
  seoTitle: 'Where to List Your Events in Watamu (2026 Organiser Guide)',
  seoDescription:
    'Where to list events in Watamu: ticketing platforms compared, why Eventbrite struggles with M-Pesa, and how to be found by visitors already in town.',
  body,
}

async function main() {
  const words = body.filter((b) => b._type === 'block').flatMap((b) => (b.children ?? []).map((c: any) => c.text)).join(' ').split(/\s+/).filter(Boolean).length
  const ext = new Set<string>(); const int = new Set<string>()
  for (const b of body) for (const m of b.markDefs ?? []) if (m._type === 'link') (m.href.startsWith('http') ? ext : int).add(m.href)
  console.log(`📝 ${doc.title}\n   /journal/${SLUG}`)
  console.log(`   ${body.length} blocks · ~${words} words · ${ext.size} external · ${int.size} internal · ${body.filter((b) => b._type === 'image').length} images`)
  if (DRY) { console.log('\nDry run.'); return }
  await client.createOrReplace(doc)
  console.log(`\n✅ Published: https://www.klickenya.com/journal/${SLUG}`)
}
main().catch((e) => { console.error('❌', e); process.exit(1) })
