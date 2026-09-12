/**
 * Seed "Where to List Your House for Sale in Kenya" — supply side lead magnet.
 *
 * Route: /journal/where-to-list-house-for-sale-in-kenya
 * Target phrase: "where to list my house for sale in kenya"
 *
 * POSITIONING. The stated ambition is to become the Zillow or Idealista of
 * Kenya. Worth being clear about the gap between that and today, because it
 * decides whether this post works:
 *
 *   BuyRentKenya and Property24 own national property search and have years of
 *   domain authority. The SERP for this phrase is already saturated with "top
 *   10 property sites in Kenya" listicles, most of them written BY portals
 *   ranking themselves first. Writing another one of those, with Klickenya at
 *   number one, loses on both credibility and authority.
 *
 * So this post is national in scope and genuinely useful about the competition,
 * which is what earns the ranking and the trust, and positions Klickenya on the
 * ground it can actually defend today: the coast, free listings, and pricing in
 * the currency coastal property is actually sold in. You become the category
 * leader by being the most useful resource first, not by claiming the title.
 *
 * The currency point is a real differentiator taken from our own codebase:
 * `property.currency` exists because coastal stock is genuinely sold in euro,
 * and a 485,000 euro asking price rendered as "KSh 485,000" before we added it.
 * The national portals assume shillings. That is a concrete, checkable gap.
 *
 * EXTERNAL LINKS: property24.co.ke and hauzisha.co.ke verified 200.
 * BuyRentKenya, Jiji and PigiaMe return 403 to automated requests (bot
 * blocking, not dead sites) so they are named in the text without links rather
 * than linking something unverifiable. Same rule as the business post.
 *
 * Run locally:
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-list-house-for-sale-kenya.ts --dry
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-list-house-for-sale-kenya.ts
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
const POST_ID = 'blog-where-to-list-house-for-sale-in-kenya'
const SLUG = 'where-to-list-house-for-sale-in-kenya'

const IMG = {
  horizon: 'image-196b677e0aca58c88437f69b06c54fa85789b406-1600x1066-jpg',
  whiteHouse: 'image-08dd9e4915f992162f48c8de5d1947e28df71566-1200x800-webp',
  creekView: 'image-4246128698bdcaf15ad9fc3606fe4233e60d070a-1200x800-webp',
}

const X = {
  property24: 'https://www.property24.co.ke/',
  hauzisha: 'https://hauzisha.co.ke/',
  buyRentKenya: 'https://www.buyrentkenya.com/',
  jiji: 'https://jiji.co.ke/',
}

const J = {
  listProperty: '/real-estate/list',
  realEstate: '/real-estate',
  forSale: '/real-estate/for-sale',
  land: '/real-estate/land',
  business: '/journal/where-to-list-your-business-in-kenya',
  how: '/how-it-works',
  watamu: '/journal/complete-guide-watamu-kenya-2026',
  kilifi: '/journal/complete-guide-kilifi-kenya-2026',
  diani: '/journal/complete-guide-diani-beach-kenya-2026',
  compare: '/journal/watamu-kilifi-diani-lamu-kenya-coast-guide',
  money: '/journal/money-in-kenya-guide',
  school: '/journal/kivukoni-school-kilifi-guide',
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
  quickFacts('✦ The Short Version', 'amber', [
    { icon: '🏆', label: 'Widest reach', value: 'BuyRentKenya and Property24' },
    { icon: '📢', label: 'Most raw traffic', value: 'Jiji and PigiaMe' },
    { icon: '🏖️', label: 'Coastal property', value: 'Klickenya, free to list' },
    { icon: '💱', label: 'Often missed', value: 'Coastal stock sells in euro' },
    { icon: '📄', label: 'Sells faster', value: 'Clean title documents' },
    { icon: '🔢', label: 'How many sites', value: 'Two or three, not ten' },
  ]),

  block('Where to List Your House for Sale in Kenya', 'h2'),

  rich([
    { text: 'If you are asking where to list my house for sale in Kenya, the practical answer is two or three places, not ten. ', bold: true },
    { text: 'BuyRentKenya and Property24 are the established property portals and give you the widest reach with buyers who are actually searching for property. Jiji and PigiaMe add raw volume at the cost of quality. And if the house is on the coast, the national portals will underserve it in a specific and fixable way that we will come to.' },
  ]),

  block('This guide is written by a marketplace that lists property, so read it accordingly. We have described the portals that beat us on reach honestly, because you deserve to know where each one is strong before you spend a weekend uploading photographs.'),

  rich([
    { text: 'In a hurry? ', bold: true },
    { text: 'Listing a property with us is free, there is no commission on the sale, and we build the listing for you from what you send. ' },
    { text: 'Submit your property here', link: J.listProperty },
    { text: ', then come back and read the rest.' },
  ]),

  img(IMG.horizon, 'A coastal apartment development with a pool in Kenya', 'The right portal depends far more on where the property is than on what it costs.'),

  /* ── The landscape ──────────────────────────────────────── */
  block('The Kenyan property portals, compared', 'h2'),

  compareTable(
    [
      { label: 'Strongest at', color: 'teal' },
      { label: 'The catch', color: 'amber' },
      { label: 'Cost to list', color: 'slate' },
    ],
    [
      { criterion: 'BuyRentKenya', values: ['Widest reach, strong Google visibility', 'Agent oriented, crowded, paid tiers', 'Free tier, paid packages'] },
      { criterion: 'Property24', values: ['Polished listings, property only audience', 'Nairobi weighted, agent focused', 'Free tier, paid packages'] },
      { criterion: 'Jiji', values: ['Enormous traffic volume', 'Bargain hunters, sits beside used phones', 'Free with paid boosts'] },
      { criterion: 'PigiaMe', values: ['Large classifieds audience', 'Same noise problem as Jiji', 'Free with paid boosts'] },
      { criterion: 'Hauzisha and smaller portals', values: ['Less competition per listing', 'Much smaller audience', 'Free'] },
      { criterion: 'A local agent', values: ['Does the work, knows real prices', 'Commission, typically a few percent', 'Commission on sale'] },
      { criterion: 'Klickenya', values: ['Coastal property, multi currency pricing', 'Coast first, thinner inland', 'Free'] },
    ],
  ),

  block('The two national portals', 'h3'),

  rich([
    { text: 'BuyRentKenya', link: X.buyRentKenya },
    { text: ' is the best known property portal in the country and the one most Kenyan property searches surface. ' },
    { text: 'Property24', link: X.property24 },
    { text: ' runs across several African markets and tends to look more polished, with better structured listings and floor plans. Both are built primarily around agents rather than private sellers, both weight heavily towards Nairobi, and on both your listing sits in a very crowded results page. They are still the first two places most sellers should be.' },
  ]),

  block('The classifieds', 'h3'),

  rich([
    { text: 'Jiji', link: X.jiji },
    { text: ' and PigiaMe bring genuinely large volumes of traffic. The trade is that your house appears in the same environment as second hand phones and furniture, and the enquiries reflect that. Expect a lot of contact from people testing whether you will drop the price by a third. For land and lower value property this is often worth the noise. For a finished home at market price it usually is not.' },
  ]),

  rich([
    { text: 'Smaller portals such as ' },
    { text: 'Hauzisha', link: X.hauzisha },
    { text: ' have far less traffic but also far less competition per listing. They cost nothing and take ten minutes, so there is little reason not to add one.' },
  ]),

  tip('warning', '💸', 'Free tier does not mean visible', 'Most Kenyan portals let you list free, then charge to be seen. A free listing typically sinks below the paid and featured ones within days. Before you pay for a boost, ask the portal how many views your listing has actually had. If they will not tell you, that is your answer.'),

  /* ── The coast gap ──────────────────────────────────────── */
  block('If your house is on the coast, read this part', 'h2'),

  block('There is a specific structural gap in how the national portals handle coastal property, and it costs sellers money.'),

  ...bullets([
    'Coastal buyers are frequently international or diaspora, searching from Europe rather than from Nairobi.',
    'They are buying a location and a lifestyle, not a commute. A listing with no context about the beach, the season or the neighbourhood cannot sell that.',
    'Agents on national portals are largely Nairobi based and often cannot answer basic questions about Watamu, Kilifi or Diani.',
    'And the big one: a great deal of coastal property is priced in euro, which is the one currency the national portals do not handle.',
  ]),

  rich([
    { text: 'That last point is worth being precise about, because we checked. ' },
    { text: 'BuyRentKenya', link: X.buyRentKenya },
    { text: ' does have a display currency switcher and it offers shillings, dollars and pounds. What it does not offer is euro, and euro is exactly what a large share of coastal property is actually priced in. It is also a display conversion applied to a shilling figure rather than a price set natively, so what a European buyer sees drifts with the exchange rate instead of matching the price you agreed. We hit the underlying problem ourselves: a 485,000 euro asking price rendered as if it were 485,000 shillings until we built currency properly into our property data. When a listing shows a nonsense number, serious buyers do not email to ask. They scroll past.' },
  ]),

  img(IMG.whiteHouse, 'A white Swahili style villa with a swimming pool on the Kenyan coast', 'Coastal property sells on lifestyle and location. Most national listings describe neither.'),

  statRow([
    { number: '0', label: 'cost to list a property with us' },
    { number: '4', label: 'currencies supported: KES, EUR, USD, GBP' },
    { number: '24 hrs', label: 'review time for a new submission' },
    { number: '2 to 3', label: 'portals worth listing on, not ten' },
  ]),

  pullQuote('A buyer in Milan searching for a house in Watamu is not comparing it to an apartment in Kilimani. Listing it as though they are is the most common mistake on the coast.'),

  /* ── Klickenya, honestly ────────────────────────────────── */
  block('Where Klickenya fits', 'h2'),

  block('We are building the property side of a Kenyan marketplace, and we are being straight with you about where that stands. We do not yet have the national reach of BuyRentKenya, and if you are selling an apartment in Westlands they will almost certainly do more for you than we will today.'),

  block('Where we are genuinely better is the coast, and it comes down to four things:'),

  ...bullets([
    'Listing is free. No packages, no boosts, no commission taken from the sale.',
    'Prices can be set in euro, dollars, pounds or shillings and are displayed in the currency the property is actually sold in.',
    'Every listing sits inside a site that already ranks for the places these houses are in, so the buyer arrives already reading about the town.',
    'A person reviews each submission within about twenty four hours, and we will build the listing out for you from what you send.',
  ]),

  block('Why it pays to be early', 'h3'),

  block('We are newer than BuyRentKenya and Property24, and for someone with a property to sell that cuts both ways. Less reach, yes. But also a fraction of the competition. On a national portal your coastal villa is one of thousands of results, most of them Nairobi apartments, and it is buried by paid placements within days. Here it sits among a few hundred properties, on a site that already ranks for Watamu, Kilifi and Diani, next to guides that the exact buyer you want is already reading.'),

  block('Listing costs nothing and there is no exclusivity, so it sits alongside whatever else you are doing rather than replacing it. The sellers who get the most out of a growing platform are the ones who were on it before everyone else was.'),

  rich([
    { text: 'You can ' },
    { text: 'submit a property here', link: J.listProperty },
    { text: '. It is a short form covering who you are and what you are selling, and our team builds the listing from there. Browse what is already on there under ' },
    { text: 'property for sale', link: J.forSale },
    { text: ' and ' },
    { text: 'land and plots', link: J.land },
    { text: ' to see the format.' },
  ]),

  img(IMG.creekView, 'A pool overlooking Kilifi Creek at a coastal Kenyan property', 'Kilifi Creek. The kind of view that needs a photograph, not a bullet point.'),

  /* ── How to actually sell ───────────────────────────────── */
  block('What actually sells a house in Kenya', 'h2'),

  block('The portal matters less than the listing. These are the things that consistently separate the properties that sell from the ones that sit for a year.'),

  budgetTable(
    ['Why it matters'],
    [
      { label: 'Clean title documents ready', values: ['The single biggest cause of collapsed sales'] },
      { label: 'Twenty five good photographs', values: ['Listings with under ten photos are skipped'] },
      { label: 'A realistic asking price', values: ['Overpricing costs more than any portal fee'] },
      { label: 'The right currency shown', values: ['Wrong currency reads as a scam or an error'] },
      { label: 'A video walkthrough', values: ['Essential for diaspora and overseas buyers'] },
      { label: 'Replying within a day', values: ['Serious buyers are contacting several sellers'] },
    ],
  ),

  tip('tip', '📄', 'Sort the paperwork before you list', 'Have the title deed, a recent search from the lands registry, land rates and rent clearance, and any approved plans ready before the first viewing. Kenyan property sales fall apart over documents far more often than over price, and a buyer who senses uncertainty about title will walk away rather than negotiate.'),

  tip('teal', '🌍', 'Klickenya local tip on diaspora buyers', 'A large share of coastal purchases come from Kenyans abroad and from Europeans who have holidayed on the coast for years. They cannot drop in for a viewing. A five minute walkthrough video shot on a phone, plus honest photographs of the road in and the neighbours, does more to close that sale than any amount of paid promotion.'),

  rich([
    { text: 'On payment and transfer, make sure you understand how funds will actually move before you agree a price, particularly with an overseas buyer. Our ' },
    { text: 'guide to money in Kenya', link: J.money },
    { text: ' covers the basics of how money works here from the buyer’s side.' },
  ]),

  /* ── Decider ────────────────────────────────────────────── */
  block('Where to list, by property type', 'h2'),

  deciderGrid([
    {
      label: 'NAIROBI HOME', color: 'blue', title: 'The national portals',
      items: ['BuyRentKenya and Property24 first', 'Consider a local agent', 'Expect a crowded results page', 'Paid placement may be worth it'],
    },
    {
      label: 'COASTAL HOME', color: 'teal', title: 'Coast focused, plus one national',
      items: ['Klickenya, free and multi currency', 'Add one national portal for reach', 'Lead with lifestyle and location', 'Video walkthrough is essential'],
    },
    {
      label: 'LAND OR PLOTS', color: 'amber', title: 'Classifieds plus a portal',
      items: ['Jiji and PigiaMe suit land well', 'Buyers here expect to negotiate', 'Title clarity matters even more', 'Show boundaries and access clearly'],
    },
    {
      label: 'AVOID', color: 'purple', title: 'Listing on ten sites',
      items: ['Duplicate listings look distressed', 'You cannot keep ten updated', 'Stale listings put buyers off', 'Two or three, kept current, is better'],
    },
  ]),

  verdictCard(
    'teal',
    'THE VERDICT',
    'Two or three portals, clean papers, honest photographs',
    [
      'BuyRentKenya and Property24 give the widest genuine reach',
      'Coastal property does better somewhere that understands the coast',
      'Free listing with no commission protects your sale price',
      'Documents ready before listing prevents most collapsed sales',
    ],
    [
      'Free tiers sink fast without paid promotion',
      'Classifieds bring volume but a lot of low offers',
      'Klickenya is coast first, so Nairobi sellers get less from us today',
      'No portal fixes an overpriced house',
    ],
  ),

  packingList('Before you list anything', [
    { icon: '📄', text: 'Title deed and a recent registry search' },
    { icon: '🧾', text: 'Land rates and rent clearance certificates' },
    { icon: '📐', text: 'Approved plans, if there are buildings' },
    { icon: '📸', text: 'Twenty five photographs taken in daylight' },
    { icon: '🎥', text: 'A phone video walkthrough for overseas buyers' },
    { icon: '💱', text: 'The currency you are actually selling in' },
  ]),

  whoIsItFor('🎯 This is for you if you are...', [
    { icon: '🏠', text: 'Selling a home privately, without an agent' },
    { icon: '🏖️', text: 'Selling a villa or apartment on the coast' },
    { icon: '🌍', text: 'Living abroad and selling a Kenyan property' },
    { icon: '🏗️', text: 'A developer with units to move' },
    { icon: '🌾', text: 'Selling land or plots' },
    { icon: '🤝', text: 'An agent looking for another channel' },
  ]),

  /* ── FAQ ────────────────────────────────────────────────── */
  block('Selling property in Kenya: frequently asked questions', 'h2'),

  block('Where can I list my house for sale in Kenya?', 'h3'),
  block('BuyRentKenya and Property24 are the two established property portals and give the widest reach. Jiji and PigiaMe add volume through classifieds. Smaller portals such as Hauzisha have less competition. If the property is on the coast, add a coast focused marketplace such as Klickenya, where listing is free and prices can be shown in euro or dollars.'),

  block('Is it free to list a property for sale in Kenya?', 'h3'),
  block('Listing is usually free, but visibility often is not. Most portals operate a free tier and then charge for featured or boosted placement, and a free listing tends to sink below the paid ones within a few days. Klickenya is free with no paid tiers and no commission on the sale.'),

  block('How many property sites should I list on?', 'h3'),
  block('Two or three, kept up to date. Listing on ten sites is counterproductive: you cannot keep them all current, duplicate listings across many portals can make a property look distressed, and stale listings with outdated prices actively put buyers off.'),

  block('Can I sell a house in Kenya without an agent?', 'h3'),
  block('Yes, and many private sellers do. You take on the viewings, the negotiation and the paperwork coordination yourself. The trade off is saving the agent commission against the time and the risk of mishandling documents. Whichever way you go, have the title deed and clearances ready before you list.'),

  block('What documents do I need to sell property in Kenya?', 'h3'),
  block('At minimum the title deed, a recent official search from the lands registry, land rates and land rent clearance certificates, and approved plans where there are buildings. Sales collapse over documentation more often than over price, so assemble these before the first viewing rather than after an offer.'),

  block('Can I list a Kenyan property for sale in euro or dollars?', 'h3'),
  block('Not properly. BuyRentKenya offers a display currency switcher covering shillings, dollars and pounds, but not euro, and it converts from a shilling price rather than letting you set the price natively in another currency. That is a real problem on the coast, where a great deal of property is genuinely priced in euro. Klickenya supports shillings, euro, dollars and pounds and shows the currency the property is actually sold in.'),

  block('How do I sell to buyers who live overseas?', 'h3'),
  block('Video and honesty. A large share of coastal buyers are diaspora Kenyans or Europeans who cannot visit before deciding, so a phone walkthrough video, photographs of the access road and the surroundings, and clear answers about title and utilities matter more than polished marketing copy.'),

  /* ── Close ──────────────────────────────────────────────── */
  block('The bottom line', 'h2'),

  block('Pick two or three portals, get the documents in order first, take far more photographs than feels necessary, and price the property in the currency your actual buyer thinks in. The portal is a distribution channel. The listing is what sells the house.'),

  block('List your property on Klickenya', 'h3'),

  rich([
    { text: 'Free to list. No commission on the sale. Priced in euro, dollars, pounds or shillings.', bold: true },
    { text: ' Send us the details and our team builds the listing for you, usually within twenty four hours. Your property lands on a site the right buyers are already reading before they buy.' },
  ]),

  rich([
    { text: '→ ' },
    { text: 'List your property', link: J.listProperty },
    { text: '   ·   ' },
    { text: 'See current listings', link: J.forSale },
    { text: '   ·   ' },
    { text: 'Running a business instead?', link: J.business },
  ]),

  rich([
    { text: 'For buyers weighing up where on the coast to look, our guides to ' },
    { text: 'Watamu', link: J.watamu },
    { text: ', ' },
    { text: 'Kilifi', link: J.kilifi },
    { text: ' and ' },
    { text: 'Diani', link: J.diani },
    { text: ' are a good start, and the ' },
    { text: 'coast comparison', link: J.compare },
    { text: ' is the fastest way to decide between them. Families relocating often ask about schooling, which we cover in the ' },
    { text: 'Kivukoni School guide', link: J.school },
    { text: '. Browse current stock on ' },
    { text: 'Klickenya property', link: J.realEstate },
    { text: '.' },
  ]),
]

const doc = {
  _id: POST_ID,
  _type: 'blogPost',
  title: 'Where to List Your House for Sale in Kenya (2026): An Honest Comparison',
  slug: { _type: 'slug', current: SLUG },
  status: 'published',
  author: { _type: 'reference', _ref: AUTHOR_ID },
  excerpt:
    'BuyRentKenya and Property24 for reach, Jiji for volume, and a coast focused option if your property is on the coast. Portals compared, plus what actually sells a house.',
  coverImage: {
    _type: 'image',
    alt: 'A coastal apartment development with a swimming pool in Kenya',
    asset: { _type: 'reference', _ref: IMG.horizon },
  },
  primaryCategory: 'living_in_kenya',
  postType: 'guide',
  location: 'kenya_general',
  focusKeyword: 'where to list my house for sale in kenya',
  keywords: ['where to list my house for sale in kenya', 'sell my house in kenya', 'property listing sites kenya', 'buyrentkenya alternative', 'list property for sale kenya', 'sell coastal property kenya', 'free property listing kenya'],
  tags: ['property', 'real estate', 'selling', 'kenya', 'practical'],
  readingTime: 10,
  publishedAt: '2026-08-25T12:00:00Z',
  seoTitle: 'Where to List My House for Sale in Kenya (2026 Guide)',
  seoDescription:
    'Where to list your house for sale in Kenya: BuyRentKenya, Property24, Jiji and coast focused options compared honestly, plus the documents and photos that sell.',
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
  console.log(`   focus: "${doc.focusKeyword}"`)
  console.log(`   ${body.length} blocks · ~${words} words · ${ext.size} external · ${int.size} internal · ${body.filter((b) => b._type === 'image').length} images`)
  console.log(`   block mix: ${Object.entries(mix).map(([k, v]) => `${k.replace('Block', '')}×${v}`).join(', ')}`)
  if (DRY) { console.log('\nDry run.'); return }
  await client.createOrReplace(doc)
  console.log(`\n✅ Published: https://www.klickenya.com/journal/${SLUG}`)
}
main().catch((e) => { console.error('❌', e); process.exit(1) })
