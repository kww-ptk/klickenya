/**
 * Seed "Where to List Your Business in Kenya" — supply side lead magnet.
 *
 * Route: /journal/where-to-list-your-business-in-kenya
 *
 * PURPOSE: this is a lead magnet, not a traffic play. Kenyan SMB search volume
 * is a fraction of travel volume. What it brings is LISTINGS, which for a
 * marketplace is upstream of everything: more inventory means more demand side
 * pages that rank. Klickenya had 25 posts and zero pointing at /list.
 *
 * POSITIONING, stated plainly because it decides whether this works: a
 * self-serving listicle that puts Klickenya at number one will be seen through
 * and will not earn links or trust. So Google Business Profile is ranked first,
 * because it genuinely is first. Competitors are named and described fairly,
 * including the ones that beat us on reach. Klickenya is positioned where it
 * actually wins: the coast, free listings, and no commission on bookings.
 *
 * VERIFIED CLAIMS about our own offer, taken from /become-a-host:
 *   "Join 200+ hosts across Kenya", free to get started, 24h review for new
 *   hosts, 5 min to create a listing, 100% you keep your bookings.
 * There is no pricing page, so free is accurate.
 *
 * EXTERNAL LINKS: google.com/business, businesslist.co.ke, eatout.co.ke and
 * airbnb.com verified 200. Jiji, PigiaMe and TripAdvisor return 403 to
 * automated requests (bot blocking, not dead sites) so they are named in the
 * text without links, rather than linking something unverifiable.
 *
 * Run locally:
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-list-your-business-kenya.ts --dry
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-list-your-business-kenya.ts
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
const POST_ID = 'blog-where-to-list-your-business-in-kenya'
const SLUG = 'where-to-list-your-business-in-kenya'

const IMG = {
  saltys: 'image-232dd5fde9c2328e355d8afe892a03751ab826cc-1170x1257-jpg',
  shopRoad: 'image-d8473ffbec3401a22c62b0ee5be7b654fc8ad178-1500x1000-webp',
  safaricom: 'image-16f7a5ecd8cc878691e3972a5d828a84182e8beb-800x533-jpg',
  naivas: 'image-83a80b62618f1ce1e6658ed0d2d62078a979bb72-800x533-jpg',
}

const X = {
  gbp: 'https://www.google.com/business/',
  businesslist: 'https://www.businesslist.co.ke/',
  eatout: 'https://eatout.co.ke/',
  airbnb: 'https://www.airbnb.com/',
  jiji: 'https://jiji.co.ke/',
  tripadvisor: 'https://www.tripadvisor.com/',
}

const J = {
  list: '/list',
  host: '/become-a-host',
  how: '/how-it-works',
  watamu: '/journal/complete-guide-watamu-kenya-2026',
  kilifi: '/journal/complete-guide-kilifi-kenya-2026',
  diani: '/journal/complete-guide-diani-beach-kenya-2026',
  money: '/journal/money-in-kenya-guide',
  eatsWatamu: '/journal/best-restaurants-watamu-kenya',
  eatsKilifi: '/journal/best-restaurants-kilifi',
  property: '/journal/where-to-list-house-for-sale-in-kenya',
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
const quickFacts = (title: string, accentColor: string, items: Array<{ icon: string; label: string; value: string }>): B => ({
  _type: 'quickFactsBlock', _key: key('qf'), title, accentColor, items: items.map((i) => ({ _key: key('qfi'), ...i })),
})
const tip = (variant: string, icon: string, label: string, text: string): B =>
  ({ _type: 'tipCardBlock', _key: key('tc'), variant, icon, label, text })
const statRow = (stats: Array<{ number: string; label: string }>): B => ({
  _type: 'statRowBlock', _key: key('sr'), stats: stats.map((s) => ({ _key: key('sri'), ...s })),
})
const compareTable = (columns: Array<{ label: string; color: string }>, rows: Array<{ criterion: string; values: string[] }>): B => ({
  _type: 'compareTableBlock', _key: key('ct'),
  columns: columns.map((c) => ({ _key: key('cti'), ...c })),
  rows: rows.map((r) => ({ _key: key('ctr'), criterion: r.criterion, values: r.values })),
})
const budgetTable = (columns: string[], rows: Array<{ label: string; values: string[] }>): B => ({
  _type: 'budgetTableBlock', _key: key('bt'), columns, rows: rows.map((r) => ({ _key: key('bti'), label: r.label, values: r.values })),
})
const deciderGrid = (cards: Array<{ label: string; color: string; title: string; items: string[] }>): B =>
  ({ _type: 'deciderGridBlock', _key: key('dg'), cards: cards.map((c) => ({ _key: key('dgi'), ...c })) })
const verdictCard = (variant: string, label: string, title: string, pros: string[], cons: string[]): B =>
  ({ _type: 'verdictCardBlock', _key: key('vc'), variant, label, title, pros, cons })
const packingList = (title: string, items: Array<{ icon: string; text: string }>): B => ({
  _type: 'packingListBlock', _key: key('pl'), title, items: items.map((i) => ({ _key: key('pli'), ...i })),
})
const whoIsItFor = (title: string, items: Array<{ icon: string; text: string }>): B => ({
  _type: 'whoIsItForBlock', _key: key('wf'), title, items: items.map((i) => ({ _key: key('wfi'), ...i })),
})
const pullQuote = (text: string, accentColor = 'teal'): B =>
  ({ _type: 'pullQuoteBlock', _key: key('pq'), text, accentColor })

const body: B[] = [
  quickFacts('✦ The Short Version', 'teal', [
    { icon: '1️⃣', label: 'Start here', value: 'Google Business Profile, free' },
    { icon: '📸', label: 'Biggest lever', value: 'Photos and reviews, not more sites' },
    { icon: '🎯', label: 'Then add', value: 'One platform your buyers use' },
    { icon: '💸', label: 'Watch for', value: 'Commission of 15 to 18 percent' },
    { icon: '🏖️', label: 'On the coast', value: 'Klickenya, free and no commission' },
    { icon: '⏱️', label: 'Time needed', value: 'An afternoon, once' },
  ]),

  block('Where to List Your Business in Kenya', 'h2'),

  rich([
    { text: 'If you run a business in Kenya and you only do one thing, claim your Google Business Profile. ', bold: true },
    { text: 'It is free, it is what people actually search, and it beats every directory in the country for bringing customers through the door. After that, the right second platform depends entirely on what you sell: a restaurant, a villa, a safari company and a hardware shop need completely different places to be found. Listing everywhere is a waste of an afternoon. Listing in two right places is not.' },
  ]),

  block('This guide is written by a marketplace, so read it with that in mind. We have put ourselves where we honestly belong rather than at the top, and we have named the platforms that beat us.'),

  rich([
    { text: 'In a hurry? ', bold: true },
    { text: 'Adding your business to Klickenya is free, takes about five minutes and carries no commission. ' },
    { text: 'Add your listing here', link: J.list },
    { text: ', and read the rest of this when you have a coffee.' },
  ]),

  img(IMG.shopRoad, 'A Kenyan coastal shopping street with small shops, tuk-tuks and boda bodas', 'Most Kenyan businesses are found on a phone before they are found on a street.'),

  /* ── 1. GBP ─────────────────────────────────────────────── */
  block('Start with Google Business Profile, always', 'h2'),

  rich([
    { text: 'A ' },
    { text: 'Google Business Profile', link: X.gbp },
    { text: ' is the free listing that puts you in Google Maps and in the box that appears when someone searches your name or your category near them. It is not a directory you submit to and forget. It is the single highest intent surface in Kenyan search, and it costs nothing.' },
  ]),

  ...bullets([
    'Claim the profile and verify it. Verification is the step most people abandon, and an unverified profile barely shows.',
    'Fill in opening hours, phone, and a WhatsApp number if that is how you actually take enquiries.',
    'Add at least fifteen real photos. Not stock, not one blurry shot of a signboard.',
    'Ask every happy customer for a review, every week, forever. This is the whole game.',
    'Reply to every review, including the bad ones, calmly.',
  ]),

  tip('tip', '⭐', 'Reviews beat everything else combined', 'A business with forty genuine reviews and current photos will out perform one with a listing on twenty directories and no reviews. If you have limited time, spend it on reviews and photographs rather than on submitting your details to another site.'),

  /* ── 2. The landscape ───────────────────────────────────── */
  block('The Kenyan listing landscape, honestly', 'h2'),

  block('Beyond Google, platforms fall into four groups. They are not interchangeable and most businesses only need one of them.'),

  compareTable(
    [
      { label: 'What it is good at', color: 'teal' },
      { label: 'The catch', color: 'amber' },
      { label: 'Cost', color: 'slate' },
    ],
    [
      { criterion: 'Google Business Profile', values: ['Local search and Maps, highest intent', 'Needs constant reviews to stay strong', 'Free'] },
      { criterion: 'Jiji and PigiaMe', values: ['Enormous traffic, fast enquiries', 'Price shoppers, noisy, lots of tyre kicking', 'Free with paid boosts'] },
      { criterion: 'Business directories', values: ['Citations that support local SEO', 'Very low buying intent on their own', 'Usually free'] },
      { criterion: 'Category platforms', values: ['Buyers already want your category', 'Commission, or a Nairobi bias', 'Free to 18 percent'] },
      { criterion: 'Social and WhatsApp', values: ['Where Kenyan buying conversations happen', 'Invisible to search, dies without posting', 'Free'] },
    ],
  ),

  block('Classifieds: volume without filter', 'h3'),

  rich([
    { text: 'Jiji', link: X.jiji },
    { text: ' and PigiaMe are the giants of Kenyan classifieds and they do bring enquiries. The trade is quality. You are listed next to unrelated categories, buyers arrive expecting to negotiate hard, and a lot of the contact you get will not convert. For a car hire firm or a hardware supplier that volume is worth having. For a boutique villa it mostly wastes your time.' },
  ]),

  block('Directories: useful, but not what you think', 'h3'),

  rich([
    { text: 'Sites like ' },
    { text: 'BusinessList Kenya', link: X.businesslist },
    { text: ' are worth twenty minutes because consistent name, address and phone details across the web genuinely support how Google understands your business. What they are not is a source of customers in their own right. Do them once, keep the details identical everywhere, and move on. Anyone selling you a package of forty directory submissions is selling you very little.' },
  ]),

  tip('warning', '📋', 'Keep your details identical everywhere', 'Google cross references your business name, address and phone number across the web. "Bofa Beach Cafe" on one site and "Bofa Beach Café Ltd" with a different phone number on another actively weakens both. Pick one exact format and use it everywhere, including the spacing on the phone number.'),

  img(IMG.naivas, 'The entrance of a Naivas supermarket in Kenya', 'Big retail has a marketing department. Everyone else has an afternoon.'),

  /* ── 3. By type ─────────────────────────────────────────── */
  block('The right second platform for your business', 'h2'),

  block('This is the part that actually matters. After Google, pick one and do it properly.'),

  budgetTable(
    ['Where to be, after Google'],
    [
      { label: 'Restaurant or cafe, Nairobi', values: ['EatOut, plus Instagram'] },
      { label: 'Restaurant or cafe, coast', values: ['Klickenya, plus Google reviews'] },
      { label: 'Hotel, villa or guesthouse', values: ['Booking or Airbnb for volume, direct site for margin'] },
      { label: 'Safari, dive or tour operator', values: ['TripAdvisor, plus a marketplace listing'] },
      { label: 'Car hire, transfers, services', values: ['Jiji or PigiaMe for volume'] },
      { label: 'Shop or hardware', values: ['Google, plus WhatsApp Business'] },
      { label: 'Property for sale', values: ['A property portal, covered separately'] },
    ],
  ),

  rich([
    { text: 'For restaurants in Nairobi, ' },
    { text: 'EatOut', link: X.eatout },
    { text: ' is the established discovery platform and worth being on. For accommodation, ' },
    { text: 'Airbnb', link: X.airbnb },
    { text: ' and Booking bring real volume, and they charge for it: commission generally lands somewhere between fifteen and eighteen percent depending on your plan. That is not a reason to avoid them. It is a reason to also have somewhere you keep the full amount. For safaris, diving and tours, ' },
    { text: 'TripAdvisor', link: X.tripadvisor },
    { text: ' remains the review platform international visitors check before they book anything.' },
  ]),

  statRow([
    { number: '15 to 18%', label: 'typical OTA commission per booking' },
    { number: '0%', label: 'commission on a Klickenya booking' },
    { number: '200+', label: 'hosts already listed with us' },
    { number: '24 hrs', label: 'our review time for a new listing' },
  ]),

  /* ── 4. Klickenya, honestly ─────────────────────────────── */
  block('Where Klickenya fits, and where it does not', 'h2'),

  block('We are a Kenyan marketplace focused on the coast: Watamu, Kilifi, Malindi and Diani, with growing coverage inland. We are not going to pretend we send more raw traffic than Jiji, because we do not. What we do differently is worth knowing if your business is on the coast.'),

  ...bullets([
    'Listing is free and there is no commission. You keep one hundred percent of what a guest pays you.',
    'Enquiries come to you directly, with the guest’s phone number, rather than through a masked messaging system.',
    'Every submission is reviewed by a person within about twenty four hours, so the marketplace stays worth browsing.',
    'You get a real page that ranks, not a row in a database. Our listing pages are built for search.',
    'We are coast first. If you run a business in Kisumu or Eldoret, we are honestly not your best option yet.',
  ]),

  img(IMG.saltys, 'Salty’s Kitesurf Village on Bofa Beach in Kilifi, a coastal Kenyan business', 'Salty’s in Kilifi. The kind of business the coast is full of and the national platforms describe badly.'),

  pullQuote('A national platform can tell someone your restaurant exists. It cannot tell them the beach in front of it is clean in August. That is the gap we are built for.'),

  block('Why it pays to be early', 'h3'),

  block('We are a newer platform than the classifieds giants, and for someone listing a business that is an advantage rather than a drawback. On a site with tens of thousands of listings, yours is one row deep in a results page nobody scrolls to. Here you are one of a few hundred, on a site that already ranks for the towns these businesses are in. Early listings also build up reviews, enquiries and search history that later arrivals have to spend a year catching up with.'),

  block('There is no cost to finding out whether it works for you, which is the whole point of it being free.'),

  rich([
    { text: 'You can ' },
    { text: 'list your business here', link: J.list },
    { text: ' in about five minutes, or read ' },
    { text: 'how hosting works', link: J.host },
    { text: ' first if you would rather see the detail. There is nothing to pay at any stage.' },
  ]),

  /* ── 5. What actually works ─────────────────────────────── */
  block('What actually brings customers', 'h2'),

  block('Having read a lot of these listings, the businesses that do well are not the ones on the most platforms. They are the ones that did these six things.'),

  packingList('The list that matters', [
    { icon: '📸', text: 'Twenty good photos, taken in daylight, on a phone is fine' },
    { icon: '⭐', text: 'A habit of asking for reviews, not a one off push' },
    { icon: '⚡', text: 'Replying to enquiries within the hour, not the day' },
    { icon: '💬', text: 'A WhatsApp number that a human actually answers' },
    { icon: '💰', text: 'Prices published, so nobody has to ask' },
    { icon: '📍', text: 'Identical name, address and phone everywhere online' },
  ]),

  tip('teal', '⚡', 'Response time is the quiet differentiator', 'On every platform we run, the businesses that reply within an hour convert several times better than the ones that reply the next day. Most enquiries are from someone comparing three places at once. The first useful reply usually wins, and it costs nothing.'),

  img(IMG.safaricom, 'Staff serving a customer at a Safaricom M-Pesa shop counter in Kenya', 'Get M-Pesa payments set up properly before you chase listings. It removes friction at the point of sale.'),

  rich([
    { text: 'One more practical thing: make sure you can actually take payment easily. If you are not set up for M-Pesa paybill or till payments yet, our ' },
    { text: 'guide to money in Kenya', link: J.money },
    { text: ' covers the basics from the customer’s side and explains what visitors expect to be able to do.' },
  ]),

  /* ── 6. Decider ─────────────────────────────────────────── */
  block('Pick your two and stop there', 'h2'),

  deciderGrid([
    {
      label: 'EVERYONE', color: 'teal', title: 'Google Business Profile',
      items: ['Free and non negotiable', 'Verify it properly', 'Fifteen photos minimum', 'Ask for reviews weekly'],
    },
    {
      label: 'HOSPITALITY', color: 'blue', title: 'A marketplace or OTA',
      items: ['Booking and Airbnb for reach, at 15 to 18 percent', 'Klickenya for the coast, free', 'TripAdvisor for tours and diving', 'Keep a direct channel too'],
    },
    {
      label: 'SERVICES', color: 'amber', title: 'Classifieds',
      items: ['Jiji or PigiaMe for volume', 'Expect price negotiation', 'Good for car hire and trades', 'Refresh listings regularly'],
    },
    {
      label: 'SKIP', color: 'purple', title: 'Directory spam packages',
      items: ['Forty submissions is not a strategy', 'Low intent, low return', 'Do two or three, consistently', 'Spend the time on reviews instead'],
    },
  ]),

  verdictCard(
    'teal',
    'THE VERDICT',
    'Google, then one platform that fits, then stop',
    [
      'Google Business Profile is free and outperforms every directory',
      'One well chosen second platform beats ten badly filled ones',
      'Reviews, photos and reply speed move the needle more than reach',
      'On the coast, a free listing with no commission protects your margin',
    ],
    [
      'None of this works without ongoing reviews',
      'OTAs bring volume but take fifteen to eighteen percent',
      'Classifieds bring enquiries that often will not convert',
      'Klickenya is genuinely coast first, so inland businesses get less from us today',
    ],
  ),

  whoIsItFor('🎯 This is for you if you run...', [
    { icon: '🏡', text: 'A villa, guesthouse or boutique hotel' },
    { icon: '🍽️', text: 'A restaurant, cafe or beach bar' },
    { icon: '🤿', text: 'A dive centre, kite school or tour company' },
    { icon: '🚗', text: 'Car hire, transfers or a service business' },
    { icon: '🛍️', text: 'A shop that people need to find locally' },
    { icon: '🏗️', text: 'Property, which needs a different set of platforms' },
  ]),

  /* ── FAQ ────────────────────────────────────────────────── */
  block('Listing your business in Kenya: frequently asked questions', 'h2'),

  block('What is the best website to list my business in Kenya?', 'h3'),
  block('Google Business Profile, without qualification. It is free, it feeds Google Maps and local search, and it reaches more genuine buyers than any Kenyan directory. Everything else is a second choice made according to what you sell, and most businesses only need one more platform beyond Google.'),

  block('Is it free to list a business online in Kenya?', 'h3'),
  block('Mostly yes. Google Business Profile, business directories, Jiji, PigiaMe and Klickenya are all free to list on. What is not free is commission: booking platforms such as Airbnb and Booking typically take between fifteen and eighteen percent of each reservation, which only applies when you actually get paid.'),

  block('How many directories should I list my business on?', 'h3'),
  block('Two or three, done consistently, is enough. The returns fall away sharply after that and anyone selling a package of forty submissions is selling volume rather than value. What matters far more is that your business name, address and phone number are written identically everywhere they appear.'),

  block('Does Klickenya charge commission?', 'h3'),
  block('No. Listing is free and there is no commission on bookings or enquiries, so you keep the full amount a guest pays you. Every submission is reviewed by a person within about twenty four hours before it goes live, which is how the marketplace stays worth browsing.'),

  block('How do I get more customers for my restaurant in Kenya?', 'h3'),
  block('Reviews and photographs, ahead of anything else. A verified Google Business Profile with current photos and a steady flow of recent reviews will bring more people through the door than being listed on ten directories. In Nairobi, add EatOut. On the coast, add a marketplace listing and make sure your menu and prices are published.'),

  block('What should I do first if I have limited time?', 'h3'),
  block('Claim and verify your Google Business Profile, upload fifteen good photos, and ask ten recent customers for a review this week. That is one afternoon and it will do more than every other item on this page combined.'),

  /* ── Close ──────────────────────────────────────────────── */
  block('The bottom line', 'h2'),

  block('Being listed in more places is not a strategy. Being findable where your customers actually look, with photos that show what you really offer and reviews that prove other people liked it, is. Do Google properly, add one platform that fits what you sell, and put the rest of your effort into replying quickly.'),

  block('Add your business to Klickenya', 'h3'),

  rich([
    { text: 'Free to list. No commission. Reviewed within 24 hours.', bold: true },
    { text: ' If your business is on the Kenyan coast, or anywhere travellers go in Kenya, put it in front of them. It takes about five minutes and you keep one hundred percent of every booking.' },
  ]),

  rich([
    { text: '→ ' },
    { text: 'Add your listing', link: J.list },
    { text: '   ·   ' },
    { text: 'See how hosting works', link: J.host },
    { text: '   ·   ' },
    { text: 'Selling property instead?', link: J.property },
  ]),

  rich([
    { text: 'Not sure how we work? Read ' },
    { text: 'how it works', link: J.how },
    { text: '. And if you want a sense of what we publish about the places our hosts operate in, start with our guides to ' },
    { text: 'Watamu', link: J.watamu },
    { text: ', ' },
    { text: 'Kilifi', link: J.kilifi },
    { text: ' and ' },
    { text: 'Diani', link: J.diani },
    { text: ', or the restaurant guides for ' },
    { text: 'Watamu', link: J.eatsWatamu },
    { text: ' and ' },
    { text: 'Kilifi', link: J.eatsKilifi },
    { text: '.' },
  ]),
]

const doc = {
  _id: POST_ID,
  _type: 'blogPost',
  title: 'Where to List Your Business in Kenya (2026): What Actually Brings Customers',
  slug: { _type: 'slug', current: SLUG },
  status: 'published',
  author: { _type: 'reference', _ref: AUTHOR_ID },
  excerpt:
    'Google Business Profile first, then one platform that fits what you sell. An honest comparison of Kenyan listing options, commission costs, and what actually converts.',
  coverImage: {
    _type: 'image',
    alt: 'Salty’s Kitesurf Village on Bofa Beach in Kilifi, a coastal Kenyan business',
    asset: { _type: 'reference', _ref: IMG.saltys },
  },
  primaryCategory: 'living_in_kenya',
  postType: 'guide',
  location: 'kenya_general',
  focusKeyword: 'list your business in kenya',
  keywords: ['list your business in kenya', 'business listing sites kenya', 'google business profile kenya', 'advertise business kenya', 'get more customers kenya', 'free business listing kenya'],
  tags: ['business', 'hosts', 'marketing', 'kenya', 'practical'],
  readingTime: 9,
  publishedAt: '2026-08-25T11:00:00Z',
  seoTitle: 'Where to List Your Business in Kenya 2026 (Honest Guide)',
  seoDescription:
    'Google Business Profile first, then one platform that fits. Kenyan listing sites compared honestly, including commission costs and what actually brings customers.',
  body,
}

async function main() {
  const words = body.filter((b) => b._type === 'block')
    .flatMap((b) => (b.children ?? []).map((c: any) => c.text)).join(' ').split(/\s+/).filter(Boolean).length
  const mix = body.reduce<Record<string, number>>((a, b) => { a[b._type] = (a[b._type] ?? 0) + 1; return a }, {})
  const ext = new Set<string>(); const int = new Set<string>()
  for (const b of body) for (const m of b.markDefs ?? []) if (m._type === 'link') (m.href.startsWith('http') ? ext : int).add(m.href)
  console.log(`📝 ${doc.title}`)
  console.log(`   /journal/${SLUG}`)
  console.log(`   ${body.length} blocks · ~${words} words · ${ext.size} external · ${int.size} internal · ${body.filter((b) => b._type === 'image').length} images`)
  console.log(`   block mix: ${Object.entries(mix).map(([k, v]) => `${k.replace('Block', '')}×${v}`).join(', ')}`)
  if (DRY) { console.log('\nDry run.'); return }
  await client.createOrReplace(doc)
  console.log(`\n✅ Published: https://www.klickenya.com/journal/${SLUG}`)
}
main().catch((e) => { console.error('❌', e); process.exit(1) })
