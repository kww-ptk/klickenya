/**
 * Seed "Where to List Your Events in Kilifi" — event organiser lead magnet.
 * Route: /journal/where-to-list-your-events-in-kilifi
 *
 * Companion to the Watamu version, deliberately NOT the same post reworded.
 * The two towns have genuinely different event cultures and different problems:
 *
 *   Watamu  = rotating visitors searching "things to do tonight". Discovery gap.
 *   Kilifi  = residents, expats and long stayers. Our own Kilifi guide says it
 *             outright: "events are often organised through word of mouth and
 *             community groups". That is a closed loop problem, not a search
 *             problem. Newcomers, visitors and anyone outside the WhatsApp
 *             groups simply never hear about anything.
 *
 * That distinction is the spine of this post and is what keeps the two from
 * cannibalising each other.
 *
 * ACCURACY NOTE ON FEES: same as the Watamu post. /become-a-host verifiably
 * says free to list and 24h review. PLATFORM_TICKET_FEE_BPS defaults to 0 in
 * code and is unset locally, so the production value is unknown from here. The
 * post says listing is free and describes ticketing WITHOUT asserting a
 * platform cut on ticket sales.
 *
 * REALITY CHECK: Kilifi currently has ZERO published event listings. The two
 * that exist (Yoga Class in Bofa, Monday Meditation) are archived. The post
 * does not imply a full calendar; it leans on the "be early" framing, which is
 * simply true here. Worth unarchiving those two so the section is not empty.
 *
 * EXTERNAL LINKS verified 200: mookh.com, ticketsasa.com, quicket.co.ke,
 * hustlesasa.com. Paystack 403s to bots so it is named, not linked.
 */
import { createClient } from 'next-sanity'

const DRY = process.argv.includes('--dry')
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01', token: process.env.SANITY_API_TOKEN!, useCdn: false,
})

const AUTHOR_ID = '0a5287ef-f74d-4893-a487-6b672cb63477'
const POST_ID = 'blog-where-to-list-your-events-in-kilifi'
const SLUG = 'where-to-list-your-events-in-kilifi'

const IMG = {
  wellnessFest: 'image-897a2f71177d83504636fc6b7255c2ca8af5d0d4-1024x636-webp',
  yoga: 'image-46f20125c1979e062ac8324cbb555a3f28012a26-1200x1395-jpg',
  newYear: 'image-344fd45759eaf66c01b280d1816185c288aafe86-1280x427-jpg',
  saltys: 'image-232dd5fde9c2328e355d8afe892a03751ab826cc-1170x1257-jpg',
}
const X = {
  mookh: 'https://mookh.com/', ticketsasa: 'https://www.ticketsasa.com/',
  quicket: 'https://www.quicket.co.ke/', hustlesasa: 'https://hustlesasa.com/',
}
const J = {
  list: '/list', events: '/events', destination: '/destinations/kilifi',
  kilifi: '/journal/complete-guide-kilifi-kenya-2026',
  eats: '/journal/best-restaurants-kilifi',
  school: '/journal/kivukoni-school-kilifi-guide',
  bofa: '/experiences/kilifi/bofa-beach',
  business: '/journal/where-to-list-your-business-in-kenya',
  watamu: '/journal/where-to-list-your-events-in-watamu',
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
  quickFacts('✦ The Short Version', 'teal', [
    { icon: '🗣️', label: 'The real problem', value: 'Word of mouth and closed groups' },
    { icon: '🎟️', label: 'To sell tickets', value: 'Mookh, Ticketsasa or Quicket' },
    { icon: '🔎', label: 'To be found', value: 'A listing anyone can search' },
    { icon: '💸', label: 'Listing with us', value: 'Free, reviewed in 24 hours' },
    { icon: '🧘', label: 'Works for', value: 'Yoga, fitness, classes, festivals' },
    { icon: '🌱', label: 'Right now', value: 'Almost nothing here is listed' },
  ]),

  block('Where to List Your Events in Kilifi', 'h2'),

  rich([
    { text: 'Kilifi has an unusually good events culture and an unusually bad way of telling anyone about it. ', bold: true },
    { text: 'Yoga on the Plantation, fitness classes, kite clinics at Bofa, sunset dhow trips on the creek, workshops, supper clubs, and a festival calendar that punches far above the size of the town. Almost all of it is organised through word of mouth and community WhatsApp groups. If you are already in those groups it works beautifully. If you arrived last month, or you are here for two weeks, you will miss essentially all of it.' },
  ]),

  img(IMG.wellnessFest, 'A group yoga class on the beach at the Kilifi Wellness Festival', 'Kilifi Wellness Festival. The kind of thing people discover by accident, a week after it happened.'),

  /* ── The Kilifi problem ─────────────────────────────────── */
  block('Kilifi’s problem is not search, it is the closed loop', 'h2'),

  block('This is what makes Kilifi different from a visitor town. In Watamu the challenge is that people are searching and cannot find you. In Kilifi the challenge is that nobody is searching, because the whole town has quietly agreed that events happen on WhatsApp. That works right up until you want to grow past the people who already know you.'),

  ...bullets([
    'A new resident takes months to get added to the groups that matter.',
    'Visitors and long stay guests are never added at all.',
    'A poster in one cafe reaches the people who go to that cafe.',
    'An Instagram story reaches your existing followers and then vanishes.',
    'Anyone researching Kilifi before they arrive finds nothing at all.',
  ]),

  pullQuote('The audience you are missing is not hiding. They are on the Bofa road wondering what there is to do, and they have no way of finding out.'),

  tip('teal', '🗣️', 'Klickenya local tip', 'The Kilifi community groups are genuinely one of the best things about the town, and nothing here suggests replacing them. Keep using them for your regulars. Add a public listing for everyone else: the new arrivals, the people staying three weeks, and the ones planning a trip from Nairobi who have never heard of your class.'),

  /* ── Ticketing vs discovery ─────────────────────────────── */
  block('Ticketing and discovery are separate problems', 'h2'),

  block('If you are charging for entry, you need a way to take money. If you want new faces, you need a way to be found. These are different tools and most organisers only ever set up the first one.'),

  compareTable(
    [
      { label: 'Sells tickets', color: 'teal' },
      { label: 'Reaches new people', color: 'purple' },
      { label: 'Best for', color: 'slate' },
    ],
    [
      { criterion: 'Mookh', values: ['Yes, M-Pesa native', 'Barely', 'Paid events, quick payouts'] },
      { criterion: 'Ticketsasa', values: ['Yes', 'Barely', 'Bigger and corporate events'] },
      { criterion: 'Quicket', values: ['Yes', 'Some', 'Festivals and multi day events'] },
      { criterion: 'HustleSasa', values: ['Yes', 'Some', 'Creators with a following'] },
      { criterion: 'WhatsApp groups', values: ['No', 'No, closed by design', 'Your existing regulars'] },
      { criterion: 'Instagram', values: ['No', 'Existing followers only', 'Reminders'] },
      { criterion: 'Klickenya', values: ['Yes, M-Pesa and card', 'Yes, anyone searching Kilifi', 'Classes, tours, festivals, parties'] },
    ],
  ),

  rich([
    { text: 'For paid tickets, ' },
    { text: 'Mookh', link: X.mookh },
    { text: ' is where most small Kenyan organisers end up, mainly for the fast M-Pesa payouts. ' },
    { text: 'Ticketsasa', link: X.ticketsasa },
    { text: ' is the older, more corporate option, ' },
    { text: 'Quicket', link: X.quicket },
    { text: ' suits festivals, and ' },
    { text: 'HustleSasa', link: X.hustlesasa },
    { text: ' works if you are already selling to an audience. None of them will bring you someone who did not know your event existed.' },
  ]),

  /* ── What runs in Kilifi ────────────────────────────────── */
  block('What actually runs in Kilifi', 'h2'),

  budgetTable(
    ['Who comes', 'How they hear about it today'],
    [
      { label: 'Yoga and meditation', values: ['Residents, long stayers, retreat guests', 'WhatsApp, posters, word of mouth'] },
      { label: 'Fitness and gym classes', values: ['Residents, families', 'The group that already knows'] },
      { label: 'Kite clinics and lessons', values: ['Seasonal, wind dependent', 'The kite schools directly'] },
      { label: 'Creek dhow and sunset trips', values: ['Visitors and weekenders', 'Hotels, operators, search'] },
      { label: 'Supper clubs and cooking', values: ['Expats and food people', 'Word of mouth, almost entirely'] },
      { label: 'Art and craft workshops', values: ['The creative community', 'The Plantation and studio networks'] },
      { label: 'Festivals and New Year', values: ['Nationwide and international', 'Real marketing, months ahead'] },
      { label: 'Padel, sport and social nights', values: ['Members and residents', 'Club noticeboards'] },
    ],
  ),

  block('Notice how much of that right hand column is a closed channel. The festivals are the exception, and it is not a coincidence that they are also the events that draw people from outside Kilifi.'),

  img(IMG.newYear, 'Crowds at a music festival in Kilifi, Kenya over New Year', 'Kilifi’s festivals market themselves properly. Everything else relies on people already being in the loop.'),

  /* ── Klickenya ──────────────────────────────────────────── */
  block('Where Klickenya fits, honestly', 'h2'),

  block('Our Kilifi event section is close to empty right now. That is not a pitch, it is the current state, and it cuts both ways. There is no crowd of existing listings sending you traffic. There is also nobody standing between your event and the top of the page.'),

  block('What we bring is the audience rather than the calendar. People land on our Kilifi guides while planning a trip or after arriving, and there is currently nothing on those pages telling them what is on this week. That is the gap.'),

  ...bullets([
    'Listing an event is free and reviewed by a person within about twenty four hours.',
    'Ticketing is built in through Paystack, so attendees can pay by M-Pesa or card.',
    'Tickets carry a QR code and there is a door scanner, so check in is not a clipboard.',
    'Free events are welcome, and plenty of what happens in Kilifi should stay free.',
    'Recurring classes are listed once with a schedule rather than reposted weekly.',
    'You can run coupons, set ticket tiers, and watch sales as they happen.',
  ]),

  statRow([
    { number: 'Free', label: 'to list an event' },
    { number: '24 hrs', label: 'review before it goes live' },
    { number: 'M-Pesa', label: 'and card, via Paystack' },
    { number: 'QR', label: 'tickets with a door scanner' },
  ]),

  block('Why being early actually matters here', 'h3'),

  block('In Watamu our event section has a few things on it. In Kilifi it has almost nothing. Whoever lists the first regular yoga class, the first kite clinic and the first supper club will own those searches for a long time, because the pages that rank are the ones that existed first and collected the most history. That window is open now and will not stay open.'),

  rich([
    { text: 'You can ' },
    { text: 'list your event here', link: J.list },
    { text: ', choosing Event at the first step. Five minutes, nothing to pay.' },
  ]),

  img(IMG.yoga, 'A person practising yoga at sunrise on a wooden deck framed by palms', 'A weekly class listed once is findable every week. A weekly WhatsApp message is findable by the group.'),

  /* ── Practical ──────────────────────────────────────────── */
  block('Making a Kilifi listing work', 'h2'),

  packingList('What to include', [
    { icon: '📸', text: 'A photo of the actual space, not a text poster' },
    { icon: '📍', text: 'Which side of the creek, and a landmark' },
    { icon: '🕐', text: 'Start time, end time, and whether it runs weekly' },
    { icon: '💰', text: 'Price or the word free, clearly' },
    { icon: '🛺', text: 'How to get there, and the tuk-tuk fare' },
    { icon: '📱', text: 'A WhatsApp number for the questions people will ask' },
  ]),

  tip('tip', '🌉', 'Say which side of the creek', 'Kilifi is spread out and the bridge is the dividing line. Bofa to the Plantation can be twenty five minutes. An event listing that does not say which side it is on will lose everyone staying on the other one, because they cannot judge whether it is a ten minute hop or a proper journey home in the dark.'),

  rich([
    { text: 'Timing is worth thinking about too. Kilifi swings between a quiet residential town and a packed one around the festival season and the holidays. Our ' },
    { text: 'complete Kilifi guide', link: J.kilifi },
    { text: ' covers the rhythm of the year, and the ' },
    { text: 'restaurant guide', link: J.eats },
    { text: ' is a decent map of where people already gather in the evenings.' },
  ]),

  img(IMG.saltys, 'Salty’s Kitesurf Village on Bofa Beach in Kilifi', 'Bofa. Kite clinics, beach sessions and the one reliably social stretch of sand in Kilifi.'),

  /* ── Decider ────────────────────────────────────────────── */
  block('Which channel for which event', 'h2'),

  deciderGrid([
    {
      label: 'REGULAR CLASS', color: 'teal', title: 'List it once, publicly',
      items: ['Yoga, fitness, meditation, kite clinics', 'Set a schedule instead of reposting', 'Findable by people not in your groups', 'Keep WhatsApp for your regulars'],
    },
    {
      label: 'PAID EVENT', color: 'blue', title: 'Listing plus ticketing',
      items: ['Tickets by M-Pesa or card', 'QR check in at the door', 'Coupons for early birds', 'Mookh alongside if you want a second channel'],
    },
    {
      label: 'FESTIVAL', color: 'amber', title: 'Everything, months ahead',
      items: ['Quicket or Ticketsasa for scale', 'Local listing for the Kilifi audience', 'Start promoting early', 'Accommodation sells out first'],
    },
    {
      label: 'DO NOT RELY ON', color: 'purple', title: 'WhatsApp alone',
      items: ['Brilliant for regulars, closed to everyone else', 'New residents wait months to be added', 'Visitors are never added', 'No record after the message scrolls away'],
    },
  ]),

  verdictCard(
    'teal',
    'THE VERDICT',
    'Keep the groups, add something public',
    [
      'The community channels stay useful for your existing regulars',
      'A public listing reaches newcomers, visitors and trip planners',
      'Free to list, so it costs five minutes to test',
      'Recurring classes only need listing once',
    ],
    [
      'Our Kilifi event section is nearly empty today',
      'A listing will not fill an event that has no audience',
      'Festivals still need proper marketing months ahead',
      'Paystack transaction fees apply to paid tickets, as with any processor',
    ],
  ),

  whoIsItFor('🎯 Worth listing if you run...', [
    { icon: '🧘', text: 'Yoga, meditation or a wellness retreat' },
    { icon: '🏋️', text: 'Fitness, gym or bootcamp sessions' },
    { icon: '🪁', text: 'Kite clinics, sailing or watersports courses' },
    { icon: '🍳', text: 'Supper clubs, cooking classes or food nights' },
    { icon: '⛵', text: 'Creek dhow trips and sunset tours' },
    { icon: '🎨', text: 'Workshops, art, music or festivals' },
  ]),

  /* ── FAQ ────────────────────────────────────────────────── */
  block('Listing events in Kilifi: frequently asked questions', 'h2'),

  block('Where can I advertise my event in Kilifi?', 'h3'),
  block('Most Kilifi events run on WhatsApp community groups and word of mouth, which works for regulars and reaches nobody else. For paid ticketing use Mookh, Ticketsasa or Quicket. To reach new residents, visitors and people planning a trip, add a public listing that anyone can find by searching, and keep the groups for the people already coming.'),

  block('Is it free to list an event on Klickenya?', 'h3'),
  block('Yes. Listing is free, a person reviews it within about twenty four hours, and free events are as welcome as paid ones. Ticketing runs through Paystack, so standard payment processing fees apply to paid tickets exactly as they would on any other platform.'),

  block('Can I take payment by M-Pesa?', 'h3'),
  block('Yes. Ticketing runs through Paystack, which handles both M-Pesa and card. Tickets are issued with a QR code and there is a door scanner, so you check people in from a phone rather than crossing names off a printed list.'),

  block('Can I list a weekly yoga or fitness class?', 'h3'),
  block('Yes, and in Kilifi this is probably the highest value thing on the platform. A recurring class is listed once with its schedule rather than reposted every week, which means someone who arrived yesterday can find your Tuesday class without needing to be in the right WhatsApp group first.'),

  block('Why not just use the Kilifi WhatsApp groups?', 'h3'),
  block('Keep using them. They are one of the genuinely good things about living here. The limitation is that they are closed by design: new residents take months to be added, short stay visitors never are, and nobody researching Kilifi from Nairobi or abroad can see anything at all. A public listing covers the people the groups cannot.'),

  block('When is the busiest time for events in Kilifi?', 'h3'),
  block('The stretch around New Year is by far the busiest, when the festival crowd arrives and the town is full. The dry months either side are strong for wellness and watersports. The long rains are quiet, which makes them a reasonable time to start something small and build an audience without competing with everything else.'),

  /* ── Close ──────────────────────────────────────────────── */
  block('The bottom line', 'h2'),

  block('Kilifi does not have an events problem. It has a visibility problem. There is more happening here per head than in most Kenyan towns, and almost none of it is findable by anyone outside the loop. Keep the community groups for your regulars and put one public listing up for everybody else.'),

  block('List your Kilifi event on Klickenya', 'h3'),

  rich([
    { text: 'Free to list. Reviewed in 24 hours. M-Pesa and card ticketing with QR check in.', bold: true },
    { text: ' Yoga, fitness, kite clinics, supper clubs, dhow trips, workshops, festivals. Right now the Kilifi section is nearly empty, which means whoever lists first gets found first.' },
  ]),

  rich([
    { text: '→ ' },
    { text: 'List your event', link: J.list },
    { text: '   ·   ' },
    { text: 'See what is on', link: J.events },
    { text: '   ·   ' },
    { text: 'Running events in Watamu instead?', link: J.watamu },
  ]),

  rich([
    { text: 'If you run a business rather than events, see ' },
    { text: 'where to list your business in Kenya', link: J.business },
    { text: '. For the town itself, start with the ' },
    { text: 'complete Kilifi guide', link: J.kilifi },
    { text: ', the ' },
    { text: 'restaurant guide', link: J.eats },
    { text: ' and ' },
    { text: 'Bofa Beach', link: J.bofa },
    { text: '. Families relocating here often ask about schooling, which we cover in the ' },
    { text: 'Kivukoni School guide', link: J.school },
    { text: '. Browse ' },
    { text: 'Kilifi', link: J.destination },
    { text: ' for the rest.' },
  ]),
]

const doc = {
  _id: POST_ID, _type: 'blogPost',
  title: 'Where to List Your Events in Kilifi (2026): Beyond the WhatsApp Groups',
  slug: { _type: 'slug', current: SLUG },
  status: 'published',
  author: { _type: 'reference', _ref: AUTHOR_ID },
  excerpt:
    'Kilifi runs on word of mouth and community groups, which reaches regulars and nobody else. Where to list yoga, fitness, kite clinics, supper clubs and festivals.',
  coverImage: {
    _type: 'image',
    alt: 'A group yoga class on the beach at the Kilifi Wellness Festival',
    asset: { _type: 'reference', _ref: IMG.wellnessFest },
  },
  primaryCategory: 'events_nightlife',
  postType: 'guide',
  location: 'kilifi',
  focusKeyword: 'list your event in kilifi',
  keywords: ['list your event in kilifi', 'advertise event kilifi', 'kilifi events', 'event ticketing kenya', 'sell tickets mpesa', 'kilifi yoga classes', 'promote event kenya coast'],
  tags: ['events', 'hosts', 'kilifi', 'marketing', 'practical'],
  readingTime: 9,
  publishedAt: '2026-09-06T10:00:00Z',
  seoTitle: 'Where to List Your Events in Kilifi (2026 Organiser Guide)',
  seoDescription:
    'Kilifi events run on WhatsApp groups that reach regulars and nobody else. Ticketing platforms compared, and how to be found by newcomers and visitors.',
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
