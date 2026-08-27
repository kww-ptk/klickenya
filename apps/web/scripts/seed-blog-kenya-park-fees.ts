/**
 * Seed "Kenya National Park Fees" — the KWS conservation fee pillar.
 *
 * Route: /journal/kenya-national-park-fees
 *
 * Why this post: the SERP for Kenya park fee queries is entirely operators and
 * affiliates quoting numbers that contradict each other, and Kenya Wildlife
 * Service does not rank on its own pricing. One of the top results is
 * kenyatourism.in, an Indian aggregator outranking KWS on Kenyan park fees.
 *
 * SOURCE OF TRUTH: every KWS figure below is taken from the official tariff,
 * "Conservation Fees 2025", published by KWS and linked directly in the post:
 *   https://kws.go.ke/wp-content/uploads/2026/05/KWS-Conservation-Fee-October-2025.pdf
 * The PDF was downloaded and read, not summarised from aggregators. Nobody else
 * on that SERP links the source document.
 *
 * Differentiators nobody else covers properly:
 *   - the Maasai Mara is NOT KWS. Narok County sets its own rates and they
 *     double from USD 100 to USD 200 on 1 July
 *   - the Mara ticket is 12 hours; a KWS daily fee is "not exceeding 24 hours"
 *     (the tariff's own wording). Nobody puts those side by side
 *   - marine parks (Watamu, Malindi, Kisite, Mombasa, Kiunga, Diani Chale) are
 *     USD 25, the cheapest wildlife fee in the country, and almost unpublished
 *   - the four payer tiers and what legally defines each one
 *   - the exemptions: Kenyan citizens 70+, persons with disability, children 5
 *     and under, registered guides, drivers, boat crew and porters
 *   - drone fees of USD 300 per drone per day, which catch people out
 *
 * MAINTENANCE: this is a price page. It carries a visible "checked on" date and
 * links the source so a reader can verify. Re-run this script when KWS or Narok
 * publish new rates, and update LAST_CHECKED.
 *
 * EXTERNAL LINKS verified 200 before writing:
 *   kws.go.ke (tariff PDF), kws.go.ke/parks, kwspay.ecitizen.go.ke, narok.go.ke
 * Deliberately NOT linked: tourism.go.ke (intermittent timeouts), nation.africa
 * and magicalkenya.com (both block automated checks, so unverifiable here).
 *
 * IMAGES: verified by eye. Note wildlife-and-safari-experiences.jpg in the
 * library carries a third party photographer watermark and is NOT used.
 * maasai-mara-safari.jpg is real but not clearly identifiable as the Mara, so it
 * is captioned neutrally as Kenyan savannah rather than asserting a location.
 *
 * Run locally:
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-kenya-park-fees.ts --dry
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-kenya-park-fees.ts
 */
import { createClient } from 'next-sanity'

const DRY = process.argv.includes('--dry')
const LAST_CHECKED = '25 August 2026'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

const AUTHOR_ID = '0a5287ef-f74d-4893-a487-6b672cb63477'
const POST_ID = 'blog-kenya-national-park-fees'
const SLUG = 'kenya-national-park-fees'

const IMG = {
  savannah: 'image-c7055ec9895ca41fbf59ab7a15c1e6bac045de8e-1600x1066-jpg',
  amboseli: 'image-fe45d34c432833d1b5a6ff4abb6987e2eeb58a8f-1080x1350-jpg',
  reef: 'image-8a76f730729ea803a333abf04808a36c527e666a-1280x960-jpg',
}

const X = {
  tariff: 'https://kws.go.ke/wp-content/uploads/2026/05/KWS-Conservation-Fee-October-2025.pdf',
  kwsParks: 'https://www.kws.go.ke/parks',
  kwsPay: 'https://kwspay.ecitizen.go.ke/',
  kws: 'https://www.kws.go.ke/',
  narok: 'https://narok.go.ke/',
}

const J = {
  parks: '/journal/kenya-national-parks-guide',
  money: '/journal/money-in-kenya-guide',
  itinerary: '/journal/10-days-kenya-itinerary',
  watamu: '/journal/complete-guide-watamu-kenya-2026',
  beaches: '/journal/7-best-beaches-watamu-kenya',
  seaweed: '/journal/kenya-coast-seaweed-season-guide',
  transport: '/journal/watamu-transport-guide',
  mombasa: '/journal/mombasa-airport-to-watamu',
  kilifi: '/journal/complete-guide-kilifi-kenya-2026',
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
const whoIsItFor = (title: string, items: Array<{ icon: string; text: string }>): B => ({
  _type: 'whoIsItForBlock', _key: key('wf'), title, items: items.map((i) => ({ _key: key('wfi'), ...i })),
})
const pullQuote = (text: string, accentColor = 'teal'): B =>
  ({ _type: 'pullQuoteBlock', _key: key('pq'), text, accentColor })

/* ── Body ──────────────────────────────────────────────────────────── */

const body: B[] = [
  quickFacts('✦ Park Fees at a Glance', 'amber', [
    { icon: '🐘', label: 'Amboseli, Lake Nakuru', value: 'USD 90 adult, 45 child' },
    { icon: '🦁', label: 'Tsavo East and West', value: 'USD 80 adult, 40 child' },
    { icon: '🌍', label: 'Maasai Mara', value: 'USD 100 or 200, by season' },
    { icon: '🐠', label: 'Marine parks', value: 'USD 25 adult, 15 child' },
    { icon: '🕐', label: 'Ticket validity', value: '24 hrs at KWS, 12 hrs at the Mara' },
    { icon: '💳', label: 'Payment', value: 'Cashless. Prepay online' },
  ]),

  block('Kenya National Park Fees 2026', 'h2'),

  rich([
    { text: 'Most Kenyan parks are run by Kenya Wildlife Service and charge foreign visitors between USD 25 and USD 90 per adult per day. ', bold: true },
    { text: 'The Maasai Mara is the exception that skews every comparison you will read: it is not a KWS park, it is run by Narok County, and its fee doubles from USD 100 to USD 200 on 1 July. Fees are per person per day, vehicles are charged separately, and none of it can be paid in cash at the gate any more.' },
  ]),

  rich([
    { text: 'Every KWS figure on this page comes from the official ' },
    { text: 'KWS conservation fees tariff', link: X.tariff },
    { text: ', not from another travel site. Checked ' },
    { text: LAST_CHECKED, bold: true },
    { text: '. Rates do change, so open that document before you budget a big trip.' },
  ]),

  img(IMG.savannah, 'Acacia tree and open savannah at sunset in a Kenyan national park', 'Fees are charged per person per day, and a vehicle fee sits on top.'),

  /* ── The Mara confusion ─────────────────────────────────── */
  block('The thing almost every guide gets wrong', 'h2'),

  block('The Maasai Mara is not a national park and it is not run by Kenya Wildlife Service. It is a national reserve managed by Narok County, which sets its own prices, its own ticket rules and its own seasons. That single fact explains why the numbers you find online never seem to agree.'),

  block('So when someone publishes a table of "Kenya park fees" with the Mara in the same column as Amboseli, the table is wrong. They are two different systems.'),

  compareTable(
    [
      { label: 'KWS parks', color: 'teal' },
      { label: 'Maasai Mara', color: 'amber' },
    ],
    [
      { criterion: 'Who runs it', values: ['Kenya Wildlife Service, national', 'Narok County Government'] },
      { criterion: 'Adult fee, foreign visitor', values: ['USD 25 to 90 depending on park', 'USD 100 or USD 200 by season'] },
      { criterion: 'Ticket validity', values: ['Up to 24 hours', '12 hours, gates 6am to 6pm'] },
      { criterion: 'Seasonal pricing', values: ['No', 'Yes, it doubles on 1 July'] },
      { criterion: 'Where you pay', values: ['KWSPay on eCitizen', 'Narok County systems'] },
    ],
  ),

  tip('warning', '📅', 'The 1 July jump', 'Narok County charges foreign adults USD 100 per day from 1 January to 30 June, and USD 200 per day from 1 July to 31 December. Two people on a four day Mara trip pay USD 800 in July and USD 400 in June for exactly the same reserve. If your dates are flexible at all, that is the single largest saving available anywhere in Kenyan tourism.'),

  /* ── The official table ─────────────────────────────────── */
  block('Official KWS park fees, foreign visitors', 'h2'),

  block('These are the non resident rates in US dollars, per person, per day, taken straight from the KWS tariff. Children are counted from five years old up to eighteen.'),

  budgetTable(
    ['Adult (USD)', 'Child or student (USD)'],
    [
      { label: 'Amboseli and Lake Nakuru', values: ['90', '45'] },
      { label: 'Nairobi National Park', values: ['80', '40'] },
      { label: 'Tsavo East and Tsavo West', values: ['80', '40'] },
      { label: 'Meru, Kora and Aberdare', values: ['70', '40'] },
      { label: 'Mt Kenya', values: ['70', '35'] },
      { label: 'Hell’s Gate, Longonot, Elgon, Shimba Hills', values: ['50', '25'] },
      { label: 'Mwea, Ruma, Sibiloi, Chyulu Hills, Marsabit', values: ['40', '20'] },
      { label: 'Marine parks: Watamu, Malindi, Kisite, Mombasa', values: ['25', '15'] },
      { label: 'Nairobi Animal Orphanage, Safari Walk', values: ['25', '15'] },
    ],
  ),

  block('Two of those categories are worth a second look. Lake Nakuru is a premium park at the same price as Amboseli, which surprises people expecting it to be cheaper. And the marine parks at USD 25 are the cheapest wildlife access in the country by a distance.'),

  block('Multi park packages', 'h3'),

  budgetTable(
    ['Adult (USD)', 'Child or student (USD)'],
    [
      { label: 'Tsavo West and Amboseli', values: ['150', '80'] },
      { label: 'Tsavo East, Tsavo West and Amboseli', values: ['215', '115'] },
      { label: 'Nairobi Park, Orphanage and Safari Walk', values: ['105', '55'] },
    ],
  ),

  img(IMG.amboseli, 'An elephant in front of Mount Kilimanjaro in Amboseli National Park, Kenya', 'Amboseli is a premium park at USD 90 per adult per day.'),

  /* ── 12 vs 24 ───────────────────────────────────────────── */
  block('How long does a park ticket last?', 'h2'),

  rich([
    { text: 'This is the rule that quietly costs people money and it is barely mentioned anywhere. The KWS tariff defines a daily fee as payable for ' },
    { text: 'a single access, valid for a period not exceeding twenty four hours', bold: true },
    { text: '. The Maasai Mara ticket, by contrast, is valid for twelve hours, with gates operating 6am to 6pm.' },
  ]),

  statRow([
    { number: '24 hrs', label: 'KWS daily fee validity' },
    { number: '12 hrs', label: 'Maasai Mara ticket validity' },
    { number: '1', label: 'single access, not re entry' },
    { number: '5', label: 'age a child starts paying' },
  ]),

  block('The practical consequence is that a three night Mara stay is charged as three separate days regardless of when you arrive, while a KWS park gives you a genuine twenty four hour window. Plan arrival times accordingly, and do not assume you can leave and come back on one ticket.'),

  /* ── Marine ─────────────────────────────────────────────── */
  block('Marine parks: the cheapest wildlife in Kenya', 'h2'),

  rich([
    { text: 'Kisite Mpunguti, Watamu, Malindi, Mombasa, Kiunga and Diani Chale are all KWS marine protected areas, and entry is ' },
    { text: 'USD 25 for a foreign adult and USD 15 for a child', bold: true },
    { text: '. For residents it is KSh 675 and KSh 350, and for East African citizens KSh 500 and KSh 250. For the price of a quarter of an Amboseli ticket you get a coral reef.' },
  ]),

  img(IMG.reef, 'Porcelain crabs sheltering in a sea anemone on a coral reef in a Kenyan marine park', 'Reef life inside a marine protected area. Entry is USD 25.'),

  block('A few marine specific charges are worth knowing. A dhow excursion inside a marine protected area is USD 10 per person, sport fishing per line outside the marine parks is USD 15, and there is a marine annual pass at KSh 10,500 which pays for itself in about four visits.'),

  rich([
    { text: 'If you are on the north coast, the marine park sits directly off ' },
    { text: 'Watamu’s beaches', link: J.beaches },
    { text: ' and most snorkelling trips include the fee in their price. Check whether yours does, because operators are not consistent about it. Our ' },
    { text: 'Watamu guide', link: J.watamu },
    { text: ' has more on the reef and when to go.' },
  ]),

  /* ── Extras ─────────────────────────────────────────────── */
  block('The charges that are not the entry fee', 'h2'),

  block('Park entry is per person. Almost everything else is billed separately, and this is where a budget quietly grows.'),

  budgetTable(
    ['Charge'],
    [
      { label: 'Vehicle, under 6 seats, per day', values: ['KSh 600'] },
      { label: 'Vehicle, 6 to 12 seats, per day', values: ['KSh 1,500'] },
      { label: 'Vehicle, 13 to 24 seats, per day', values: ['KSh 3,000'] },
      { label: 'Public campsite, foreign adult', values: ['USD 20 to 30 by park'] },
      { label: 'Special campsite, foreign adult', values: ['USD 35 to 50 by park'] },
      { label: 'Balloon safari, per landing', values: ['USD 80 adult, 40 child'] },
      { label: 'Night game drive, per person', values: ['USD 50'] },
      { label: 'Drone, per drone per day per park', values: ['USD 300, KCAA licence required'] },
    ],
  ),

  tip('warning', '🚁', 'The drone fee is real, and it is USD 300', 'A drone costs USD 300 per drone per day per park for foreign visitors, and you need a licence from the Kenya Civil Aviation Authority before you fly at all. People arrive assuming a drone is a camera. It is not, and rangers do enforce this. If you are not filming commercially, leave it in the bag.'),

  block('One more that is not a fee but will end your day badly: every KWS park, reserve and sanctuary is a single use plastic free zone. Water bottles and bags are checked at the gate.'),

  /* ── Tiers ──────────────────────────────────────────────── */
  block('Which price applies to you?', 'h2'),

  block('There are four payer tiers and the gap between them is large. The tariff defines each one precisely, and the definitions matter more than most visitors realise.'),

  compareTable(
    [
      { label: 'Who qualifies', color: 'slate' },
      { label: 'Amboseli example', color: 'teal' },
    ],
    [
      { criterion: 'East African Citizen', values: ['Citizen of an EAC member state', 'KSh 1,500 adult'] },
      { criterion: 'Kenya Resident', values: ['Non citizen living in Kenya on a valid permit', 'KSh 2,025 adult'] },
      { criterion: 'African Citizen', values: ['National of an African country outside East Africa', 'USD 50 adult'] },
      { criterion: 'Non Resident', values: ['Everyone else', 'USD 90 adult'] },
    ],
  ),

  ...bullets([
    'A child is five years old or above but under eighteen. Under fives are free.',
    'A student means someone not older than twenty three, from a recognised school, college or university, visiting under a documented educational arrangement.',
    'Resident status needs a valid permit, and you will be asked to show it. Bring the physical card.',
    'The African Citizen tier is roughly half the non resident rate and is frequently missed by travellers who qualify for it.',
  ]),

  tip('tip', '🪪', 'Carry the document that proves your tier', 'Gate staff apply the tier you can evidence, not the one you claim. Residents need the permit card, students need the institutional letter, and East African citizens need the passport or national ID. Turning up without it means paying the top rate, and refunds afterwards are not a thing.'),

  /* ── Exemptions ─────────────────────────────────────────── */
  block('Who gets in free', 'h2'),

  block('The tariff lists specific exemptions from conservation fees, and they are almost never published anywhere else:'),

  ...bullets([
    'Kenyan citizens aged seventy and above.',
    'Persons with disability, as defined in the Persons with Disabilities Act.',
    'Children aged five years and younger.',
    'Tour drivers, guides, boat crew and porters registered with the Tourism Regulatory Authority and belonging to a registered association.',
    'Beach Management Unit fishing boats are exempt from boat anchoring fees.',
  ]),

  pullQuote('If you are travelling with grandparents who are Kenyan citizens over seventy, or with a child under five, do not let anyone sell you a ticket for them.'),

  /* ── Paying ─────────────────────────────────────────────── */
  block('How to actually pay', 'h2'),

  rich([
    { text: 'KWS parks are cashless. You cannot rock up to a gate with dollars and expect to get in. Fees are paid through ' },
    { text: 'KWSPay on the eCitizen platform', link: X.kwsPay },
    { text: ', by card or M-Pesa, and you arrive with a digital receipt and a QR code that the gate scans. Fees are quoted in dollars for foreign visitors but settled in shillings at the prevailing rate.' },
  ]),

  ...bullets([
    'Pay before you travel, not at the gate.',
    'Save the receipt as a screenshot as well as a PDF. Signal at gates is often poor.',
    'Book the correct tier and carry the document that proves it.',
    'Bring the passport or ID that matches the booking.',
  ]),

  rich([
    { text: 'If you have not set up mobile money yet, our ' },
    { text: 'guide to money in Kenya', link: J.money },
    { text: ' covers how visitors register for M-Pesa with a passport in about twenty minutes, which makes paying for all of this considerably easier.' },
  ]),

  /* ── Planning ───────────────────────────────────────────── */
  block('What a realistic park budget looks like', 'h2'),

  block('Two foreign adults with a small hired vehicle, ignoring accommodation and fuel, purely on fees:'),

  budgetTable(
    ['Fees only'],
    [
      { label: 'Two days Tsavo East', values: ['USD 320 plus KSh 1,200 vehicle'] },
      { label: 'Two days Amboseli', values: ['USD 360 plus KSh 1,200 vehicle'] },
      { label: 'Three days Maasai Mara in June', values: ['USD 600'] },
      { label: 'Three days Maasai Mara in August', values: ['USD 1,200'] },
      { label: 'One day Watamu Marine Park', values: ['USD 50'] },
    ],
  ),

  deciderGrid([
    {
      label: 'BEST VALUE', color: 'teal', title: 'Marine parks',
      items: ['USD 25 per adult per day', 'Watamu, Malindi, Kisite, Diani Chale', 'Annual marine pass KSh 10,500', 'Snorkelling trips often include it'],
    },
    {
      label: 'GOOD VALUE', color: 'blue', title: 'Tsavo East and West',
      items: ['USD 80 per adult per day', 'Enormous, and far quieter than the Mara', 'Easy from the coast', 'Package with Amboseli for USD 215'],
    },
    {
      label: 'PREMIUM', color: 'amber', title: 'Amboseli and Lake Nakuru',
      items: ['USD 90 per adult per day', 'Amboseli for elephants and Kilimanjaro', 'Nakuru for rhino and flamingo', 'Both compact, so one day works'],
    },
    {
      label: 'MOST EXPENSIVE', color: 'purple', title: 'Maasai Mara',
      items: ['USD 100 January to June', 'USD 200 July to December', '12 hour ticket, not 24', 'Not KWS, so book through Narok'],
    },
  ]),

  verdictCard(
    'teal',
    'THE VERDICT',
    'Prepay online, travel before July, carry your documents',
    [
      'Shifting Mara dates from July to June halves the entry cost',
      'Tsavo delivers a comparable safari at USD 80 instead of USD 200',
      'Marine parks are the best value wildlife in Kenya at USD 25',
      'Under fives, Kenyan over seventies and registered guides go free',
    ],
    [
      'Vehicle, camping and activity charges all sit on top of entry',
      'No cash at the gate, so an unbooked arrival is a problem',
      'Drone fees are USD 300 a day and need a KCAA licence',
      'Rates change, so verify against the tariff before you budget',
    ],
  ),

  packingList('Before you reach the gate', [
    { icon: '🎟️', text: 'Prepaid receipt and QR code, saved offline' },
    { icon: '🪪', text: 'Passport or ID matching the booking' },
    { icon: '📄', text: 'Residence permit or student letter if claiming a tier' },
    { icon: '📱', text: 'M-Pesa set up, for anything unexpected' },
    { icon: '🚯', text: 'No single use plastic, it is checked' },
    { icon: '🚁', text: 'Drone left at home unless licensed and paid for' },
  ]),

  whoIsItFor('🎯 This page is for you if...', [
    { icon: '🧮', text: 'You are budgeting a safari and want real numbers' },
    { icon: '🇰🇪', text: 'You are a resident or East African citizen paying the wrong rate' },
    { icon: '🏖️', text: 'You are on the coast and did not know marine parks are USD 25' },
    { icon: '📅', text: 'Your Mara dates are still flexible' },
    { icon: '👨‍👩‍👧', text: 'You are travelling with under fives or over seventies' },
    { icon: '🎥', text: 'You were planning to bring a drone' },
  ]),

  /* ── FAQ ────────────────────────────────────────────────── */
  block('Kenya park fees: frequently asked questions', 'h2'),

  block('How much is entry to a Kenyan national park?', 'h3'),
  block('For foreign visitors, between USD 25 and USD 90 per adult per day at KWS parks. Marine parks are USD 25, Tsavo East and West and Nairobi National Park are USD 80, and the premium parks Amboseli and Lake Nakuru are USD 90. The Maasai Mara is separate at USD 100 or USD 200 depending on the month.'),

  block('Why is the Maasai Mara more expensive than other parks?', 'h3'),
  block('Because it is not a KWS park. The Mara is a national reserve run by Narok County, which sets its own rates independently and has adopted a low volume, high value pricing model. Its fee is USD 100 per foreign adult per day from January to June and USD 200 from July to December, covering the migration season.'),

  block('How long is a Kenya park ticket valid?', 'h3'),
  block('At KWS parks, a daily fee covers a single access valid for up to twenty four hours. At the Maasai Mara the ticket is twelve hours and the gates run from 6am to 6pm. In both cases it is single access rather than unlimited re entry, so plan your movements around it.'),

  block('Can I pay park fees in cash at the gate?', 'h3'),
  block('No. KWS parks are fully cashless. Fees must be paid in advance through KWSPay on the eCitizen platform using a card or M-Pesa, and you present a digital receipt with a QR code at the gate. Save it offline, because network coverage at park gates is frequently poor.'),

  block('Do children pay park fees in Kenya?', 'h3'),
  block('Children aged five up to eighteen pay a reduced rate, generally about half the adult fee. Children aged five and under are exempt entirely. Students up to the age of twenty three can also qualify for the child and student rate when visiting under a documented educational arrangement.'),

  block('Are park fees cheaper for residents in Kenya?', 'h3'),
  block('Substantially. Amboseli is KSh 1,500 for an East African citizen and KSh 2,025 for a Kenya resident, against USD 90 for a non resident. There is also an African Citizen tier at USD 50 for nationals of African countries outside East Africa. You must be able to prove your status at the gate.'),

  block('How much are Watamu and Malindi marine park fees?', 'h3'),
  block('USD 25 for a foreign adult and USD 15 for a child, the same across Kisite Mpunguti, Watamu, Malindi, Mombasa, Kiunga and Diani Chale. Residents pay KSh 675 and East African citizens KSh 500. There is also a marine annual pass at KSh 10,500 that is excellent value if you visit often.'),

  block('Do I need to pay extra for my vehicle?', 'h3'),
  block('Yes, and it is charged per day on top of every person in it. A vehicle with fewer than six seats is KSh 600 per day, six to twelve seats is KSh 1,500, and thirteen to twenty four seats is KSh 3,000. Camping, night drives, balloon safaris and drones are all separate charges again.'),

  /* ── Close ──────────────────────────────────────────────── */
  block('The bottom line', 'h2'),

  block('Park fees are the largest fixed cost of a Kenyan safari and the one most people underestimate, because entry is quoted per person per day and everything else is billed on top. The two decisions that actually move the number are which park you choose and, if it is the Mara, which side of 1 July you travel.'),

  rich([
    { text: 'Verify anything here against the official ' },
    { text: 'KWS tariff', link: X.tariff },
    { text: ' before you commit, browse the parks themselves on ' },
    { text: 'kws.go.ke', link: X.kwsParks },
    { text: ', and pay through ' },
    { text: 'KWSPay', link: X.kwsPay },
    { text: '. Mara bookings go through ' },
    { text: 'Narok County', link: X.narok },
    { text: ' rather than ' },
    { text: 'KWS', link: X.kws },
    { text: '.' },
  ]),

  rich([
    { text: 'Planning the wider trip? Our ' },
    { text: 'guide to Kenya’s national parks', link: J.parks },
    { text: ' covers which ones are worth the fee, the ' },
    { text: '10 day Kenya itinerary', link: J.itinerary },
    { text: ' shows how bush and beach fit together, and if you are finishing on the coast, start with ' },
    { text: 'Watamu', link: J.watamu },
    { text: ' or ' },
    { text: 'Kilifi', link: J.kilifi },
    { text: '. The ' },
    { text: 'seaweed season guide', link: J.seaweed },
    { text: ' tells you which coastal months to aim for, and getting there is covered in our ' },
    { text: 'transport guide', link: J.transport },
    { text: ' and the ' },
    { text: 'Mombasa airport route', link: J.mombasa },
    { text: '.' },
  ]),
]

const doc = {
  _id: POST_ID,
  _type: 'blogPost',
  title: 'Kenya National Park Fees 2026: Every Park, Every Rate, From the Official Tariff',
  slug: { _type: 'slug', current: SLUG },
  status: 'published',
  author: { _type: 'reference', _ref: AUTHOR_ID },
  excerpt:
    'KWS park fees run USD 25 to 90 per adult per day. The Maasai Mara is not KWS and doubles to USD 200 on 1 July. Official rates, ticket rules, exemptions and how to pay.',
  coverImage: {
    _type: 'image',
    alt: 'Acacia tree and open savannah at sunset in a Kenyan national park',
    asset: { _type: 'reference', _ref: IMG.savannah },
  },
  primaryCategory: 'safari_wildlife',
  subcategory: 'practical_info',
  postType: 'guide',
  location: 'kenya_general',
  focusKeyword: 'kenya national park fees',
  keywords: ['kenya national park fees', 'kws park fees 2026', 'maasai mara entry fee', 'amboseli entry fee', 'tsavo park fees', 'watamu marine park fee', 'kws conservation fees'],
  tags: ['safari', 'travel tips', 'money', 'practical', 'kenya'],
  readingTime: 11,
  publishedAt: '2026-08-25T09:00:00Z',
  seoTitle: 'Kenya National Park Fees 2026: Official KWS Rates',
  seoDescription:
    'Official 2026 KWS park fees: USD 25 to 90 per adult per day. Why the Maasai Mara costs USD 200 from July, ticket validity rules, exemptions and how to prepay.',
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
  console.log(`   figures checked: ${LAST_CHECKED}`)
  if (DRY) { console.log('\n  external:'); ext.forEach((u) => console.log('   ', u)); console.log('\nDry run. Re-run without --dry to publish.'); return }
  await client.createOrReplace(doc)
  console.log(`\n✅ Published: https://www.klickenya.com/journal/${SLUG}`)
}

main().catch((err) => { console.error('❌ Failed:', err); process.exit(1) })
