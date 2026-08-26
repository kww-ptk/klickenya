/**
 * Seed "Money in Kenya" — the cash, cards, ATMs and M-Pesa pillar.
 *
 * Route: /journal/money-in-kenya-guide
 * Idempotent: createOrReplace with a fixed _id.
 *
 * Run locally (needs the Sanity WRITE token):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-money-in-kenya.ts --dry
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-money-in-kenya.ts
 *
 * Why this post: the SERP for Kenya money and M-Pesa queries is Quora threads and
 * low quality aggregators (mpesa.or.ke, paybillke, primefinancetech). No
 * authoritative source ranks. Klickenya is a Kenyan business that actually takes
 * M-Pesa payments, which is authority nobody on that SERP has. It also sits above
 * the existing Watamu money post as a cluster parent rather than duplicating it.
 *
 * EXTERNAL LINKS: every one verified 200 before writing.
 *   safaricom.co.ke/personal/m-pesa/getting-started/m-pesa-rates
 *   safaricom.co.ke/personal/m-pesa
 *   centralbank.go.ke/rates/forex-exchange-rates/
 *   etakenya.go.ke
 *   kws.go.ke  +  kws.go.ke/article/kws-launches-new-electronic-park-entry-fees-payment-system
 *   kwspay.ecitizen.go.ke
 *
 * INTERNAL LINKS: all 10 verified 200 against production before writing.
 *
 * FIGURES: checked August 2026. Rates move, so the post links the CBK page rather
 * than pretending a number stays true. M-Pesa limits are the CBK approved 2023
 * caps still current in 2026.
 *
 * IMAGES: existing Sanity assets, every one opened and checked. Note that
 * atm-watamu-cover.webp in the library is NOT an ATM photo (it is an unrelated
 * website mockup) so it is deliberately not used here.
 *
 * Decider grid colours are limited to teal/blue/purple/amber: production still
 * runs a build that predates the green/red fix in DeciderGridBlock.tsx.
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
const POST_ID = 'blog-money-in-kenya-guide'
const SLUG = 'money-in-kenya-guide'

/* ── Verified image assets ─────────────────────────────────────────── */
const IMG = {
  shopRoad: 'image-d8473ffbec3401a22c62b0ee5be7b654fc8ad178-1500x1000-webp',  // small shops, tuk-tuks, boda bodas
  safaricomShop: 'image-16f7a5ecd8cc878691e3972a5d828a84182e8beb-800x533-jpg', // Safaricom / M-Pesa shop counter
  market: 'image-680007125e752268df99f3c1486b9895b3edb92a-570x410-webp',       // fruit and veg market stall
  naivas: 'image-83a80b62618f1ce1e6658ed0d2d62078a979bb72-800x533-jpg',        // Naivas supermarket
  atmIllustration: 'image-becfd884b8940307e1f7e32072f4b1701e751656-1620x1080-jpg', // ATM illustration
  tuktuk: 'image-109c748af964e683c7474a9fe1e2e474771500c7-1536x1024-png',      // tuk-tuk and boda boda
  timboni: 'image-86d0fbb65caff67201ff0874a0df3867fb35d85c-1170x1417-jpg',     // small shop front
}

/* ── External links (all verified 200) ─────────────────────────────── */
const X = {
  mpesaRates: 'https://www.safaricom.co.ke/personal/m-pesa/getting-started/m-pesa-rates',
  mpesa: 'https://www.safaricom.co.ke/personal/m-pesa',
  cbkRates: 'https://www.centralbank.go.ke/rates/forex-exchange-rates/',
  eta: 'https://www.etakenya.go.ke/',
  kws: 'https://www.kws.go.ke/',
  kwsCashless: 'https://www.kws.go.ke/article/kws-launches-new-electronic-park-entry-fees-payment-system',
  kwsPay: 'https://kwspay.ecitizen.go.ke/',
}

/* ── Internal links (all verified 200) ─────────────────────────────── */
const J = {
  watamuMoney: '/journal/money-exchange-atm-watamu-guide',
  transport: '/journal/watamu-transport-guide',
  parks: '/journal/kenya-national-parks-guide',
  itinerary: '/journal/10-days-kenya-itinerary',
  seaweed: '/journal/kenya-coast-seaweed-season-guide',
  watamu: '/journal/complete-guide-watamu-kenya-2026',
  kilifi: '/journal/complete-guide-kilifi-kenya-2026',
  diani: '/journal/complete-guide-diani-beach-kenya-2026',
  eats: '/journal/best-restaurants-watamu-kenya',
  compare: '/journal/watamu-kilifi-diani-lamu-kenya-coast-guide',
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

const photoRow = (layout: string, photos: Array<{ ref: string; alt: string; aspectRatio: string }>, caption?: string): B => ({
  _type: 'photoRowBlock', _key: key('pr'), layout, ...(caption ? { caption } : {}),
  photos: photos.map((p) => ({ _type: 'image', _key: key('pri'), alt: p.alt, aspectRatio: p.aspectRatio, asset: { _type: 'reference', _ref: p.ref } })),
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

const budgetTable = (columns: string[], rows: Array<{ label: string; values: string[] }>, totalRow?: string[]): B => ({
  _type: 'budgetTableBlock', _key: key('bt'), columns,
  rows: rows.map((r) => ({ _key: key('bti'), label: r.label, values: r.values })),
  ...(totalRow ? { totalRow } : {}),
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
  quickFacts('✦ Money in Kenya at a Glance', 'amber', [
    { icon: '💵', label: 'Currency', value: 'Kenyan shilling (KES or KSh)' },
    { icon: '📈', label: 'Rough rate', value: '1 USD ≈ 129 KES (Aug 2026)' },
    { icon: '📱', label: 'Most used', value: 'M-Pesa, by a distance' },
    { icon: '💳', label: 'Cards', value: 'Fine in cities, patchy elsewhere' },
    { icon: '🏧', label: 'ATM limit', value: 'Usually 20,000 to 40,000 per go' },
    { icon: '🎟️', label: 'Park fees', value: 'Cashless. Pay online first' },
  ]),

  block('Money in Kenya: How Payment Actually Works Here', 'h2'),

  rich([
    { text: 'The single most useful thing to understand about money in Kenya is that the country runs on M-Pesa, not on cash or cards. ', bold: true },
    { text: 'Mobile money is how a tuk-tuk driver, a beach bar, a landlord and a national park all expect to be paid. Visitors can register for it in about twenty minutes with a passport. Carry a modest amount of cash for markets and tips, keep a card for supermarkets and hotels, and set up M-Pesa for everything in between. That combination covers every situation you will meet.' },
  ]),

  block('What follows is the practical detail: real limits, real fees, what things cost, where cards quietly fail, and the two or three mistakes that catch almost every first time visitor.'),

  img(IMG.shopRoad, 'A Kenyan coastal shopping street with small shops, tuk-tuks and boda bodas', 'Most day to day spending in Kenya happens at places like this. None of them take a foreign card.'),

  /* ── The 60 second version ─────────────────────────────── */
  block('The 60 second version', 'h2'),

  ...bullets([
    'Currency is the Kenyan shilling. Notes come in 50, 100, 200, 500 and 1,000.',
    'Get a Safaricom SIM at the airport with your passport, then register M-Pesa. It costs about KES 100.',
    'Draw cash from a bank ATM, not a hotel or a bureau at the airport. Always choose to be charged in shillings.',
    'Cards work in supermarkets, malls, chain hotels and most established restaurants. They do not work in markets, matatus, tuk-tuks, small dukas or beach bars.',
    'National park fees are fully cashless and must be paid online before you arrive.',
    'Carry small notes for tips. Nobody has change for a 1,000 note at a market stall.',
  ]),

  /* ── Shilling ──────────────────────────────────────────── */
  block('The Kenyan shilling: what things actually cost', 'h2'),

  rich([
    { text: 'At the time of writing the shilling sits at roughly 129 to the US dollar, 150 to the euro and 175 to the pound. Rates move, so check the ' },
    { text: 'Central Bank of Kenya daily rates', link: X.cbkRates },
    { text: ' before you budget rather than trusting a number in any article, including this one. A useful mental shortcut on the coast: divide shillings by 130 for a rough dollar figure.' },
  ]),

  budgetTable(
    ['Typical price', 'Pay with'],
    [
      { label: 'Tuk-tuk across town', values: ['KES 200 to 500', 'Cash or M-Pesa'] },
      { label: 'Boda boda short hop', values: ['KES 50 to 150', 'Cash or M-Pesa'] },
      { label: 'Local meal, rice and fish', values: ['KES 400 to 800', 'Cash or M-Pesa'] },
      { label: 'Restaurant dinner for two', values: ['KES 3,000 to 7,000', 'Card usually fine'] },
      { label: 'Cold beer at a beach bar', values: ['KES 250 to 450', 'Cash or M-Pesa'] },
      { label: 'Supermarket shop for a week', values: ['KES 6,000 to 12,000', 'Card'] },
      { label: 'Fruit and vegetables at the market', values: ['KES 500 to 1,500', 'Cash only'] },
      { label: 'Litre of petrol', values: ['Around KES 180', 'Card or M-Pesa'] },
    ],
  ),

  tip('tip', '🧮', 'Klickenya local tip', 'Prices at markets and with drivers are often negotiable, and the opening number for an obvious visitor is higher than the local one. Ask your host what a fare or a bag of mangoes should cost before you go. Knowing the real number and saying it calmly settles the whole conversation in seconds.'),

  img(IMG.market, 'A colourful fruit and vegetable market stall in Kenya with bananas, onions and pineapples', 'Markets are cash. Bring small notes and expect to negotiate a little.'),

  /* ── M-Pesa ────────────────────────────────────────────── */
  block('M-Pesa: the thing that surprises visitors most', 'h2'),

  rich([
    { text: 'M-Pesa is mobile money run by Safaricom, and it is not a niche convenience here. It is the default. Kenyans pay rent, school fees, market traders, taxi fares and utility bills through it. Businesses display a paybill or a till number the way a shop elsewhere displays a card machine. If you are staying more than a few days, having ' },
    { text: 'M-Pesa', link: X.mpesa },
    { text: ' turns a hundred small frictions into nothing.' },
  ]),

  block('Can visitors use M-Pesa?', 'h3'),

  block('Yes, and you do not need residency, a Kenyan ID or a local bank account. You need a passport and a Safaricom line. The process is:'),

  ...bullets([
    'Buy a Safaricom SIM, around KES 100. There is a desk in arrivals at Nairobi JKIA and at Moi International in Mombasa, plus Safaricom shops in every town.',
    'Register the line in your name. The agent scans your passport and takes your photo. Bring the physical passport, not a copy.',
    'Ask them to activate M-Pesa at the same time. It is the same visit and the same paperwork.',
    'Set your PIN, then load cash at any agent. Agents are everywhere, marked in green.',
    'Pay by choosing Lipa na M-Pesa, then either Buy Goods with a till number or Pay Bill with a business number and account.',
  ]),

  img(IMG.safaricomShop, 'Staff serving a customer at a Safaricom M-Pesa shop counter in Kenya', 'A Safaricom shop. Twenty minutes here on day one saves you a fortnight of small hassles.'),

  tip('teal', '🛂', 'Bring the passport, not a photo of it', 'Registration is a legal KYC process and the agent has to scan the document itself. A photo on your phone will be refused, politely but firmly. If you land late and the airport desk has closed, any Safaricom shop in town does the same job the next morning.'),

  block('M-Pesa limits and charges', 'h3'),

  statRow([
    { number: '250k', label: 'KES maximum in a single transaction' },
    { number: '500k', label: 'KES maximum total per day' },
    { number: '500k', label: 'KES maximum wallet balance' },
    { number: '35k', label: 'KES per ATM withdrawal via M-Pesa' },
  ]),

  rich([
    { text: 'Sending money to another person costs a small tiered fee, withdrawing cash at an agent costs a little more, and paying a registered business by Buy Goods is free to you. The bands change from time to time, so use the official ' },
    { text: 'Safaricom M-Pesa tariff page', link: X.mpesaRates },
    { text: ' rather than one of the many calculator sites that copy old numbers. For a visitor the practical point is that fees are small in absolute terms, usually tens of shillings.' },
  ]),

  tip('warning', '⚠️', 'Never share your PIN, ever', 'The most common fraud in Kenya is a phone call or SMS from someone claiming to be Safaricom, a bank or a landlord, asking you to confirm a PIN or to reverse a transaction you did not make. Safaricom never asks for your PIN. Hang up. If you are unsure, walk into a Safaricom shop and ask in person.'),

  /* ── Cards ─────────────────────────────────────────────── */
  block('Do cards work in Kenya?', 'h2'),

  block('Visa and Mastercard are widely accepted in the places you would expect, and quietly useless in the places you might not. American Express is rarely taken anywhere. Contactless is normal in Nairobi and increasingly common on the coast.'),

  compareTable(
    [
      { label: 'Card', color: 'teal' },
      { label: 'M-Pesa', color: 'blue' },
      { label: 'Cash', color: 'amber' },
    ],
    [
      { criterion: 'Supermarkets and malls', values: ['Yes, reliably', 'Yes', 'Yes'] },
      { criterion: 'Hotels and lodges', values: ['Yes', 'Usually', 'Yes'] },
      { criterion: 'Established restaurants', values: ['Usually', 'Yes', 'Yes'] },
      { criterion: 'Beach bars and small cafes', values: ['Often not', 'Yes', 'Yes'] },
      { criterion: 'Markets and street traders', values: ['No', 'Sometimes', 'Yes'] },
      { criterion: 'Tuk-tuks, boda bodas, matatus', values: ['No', 'Yes', 'Yes'] },
      { criterion: 'National park gates', values: ['Online only', 'Online only', 'Not accepted'] },
      { criterion: 'Tips', values: ['No', 'Sometimes', 'Yes, small notes'] },
    ],
  ),

  img(IMG.naivas, 'The entrance of a Naivas supermarket in Kenya', 'Supermarkets like Naivas and Carrefour take cards without drama. The duka next door will not.'),

  /* ── ATMs ──────────────────────────────────────────────── */
  block('ATMs, withdrawal limits and the fee trap', 'h2'),

  block('Bank ATMs are common in every town of any size and generally reliable. Most cap a single withdrawal somewhere between KES 20,000 and 40,000, which is a real constraint if you are trying to draw a large sum, and each withdrawal carries an operator fee on top of whatever your own bank charges.'),

  budgetTable(
    ['Foreign card fee', 'Notes'],
    [
      { label: 'Equity Bank', values: ['Around KES 230', 'Largest network, found almost everywhere'] },
      { label: 'KCB', values: ['Charged in USD, around 4 dollars', 'Wide network, reliable machines'] },
      { label: 'Absa', values: ['Charged in USD, around 4 dollars', 'Global ATM Alliance partner for some cards'] },
      { label: 'Standard Chartered', values: ['Around KES 480', 'The most expensive of the majors'] },
      { label: 'Airport and hotel ATMs', values: ['Higher, plus a worse rate', 'Convenient, and you pay for it'] },
    ],
  ),

  tip('warning', '💱', 'Always choose to be charged in shillings', 'The machine will offer to bill you in your home currency at a "guaranteed" rate. That is dynamic currency conversion and the rate is deliberately poor, usually costing you three to six percent. Decline the conversion and choose KES every single time. Your own bank will convert at a far better rate.'),

  img(IMG.atmIllustration, 'Illustration of a traveller withdrawing cash from an ATM in Kenya', 'Draw a few larger amounts rather than many small ones. Every withdrawal has a flat fee attached.'),

  rich([
    { text: 'On the coast specifically, ATM coverage thins out fast once you leave the main towns, and machines do occasionally run dry over a long weekend. Our ' },
    { text: 'Watamu money, ATM and exchange guide', link: J.watamuMoney },
    { text: ' has the street level detail for that stretch of coast, including which machines to trust.' },
  ]),

  /* ── Dollars ───────────────────────────────────────────── */
  block('Can you pay in US dollars?', 'h2'),

  block('Sometimes, and usually at a worse rate than you would get by paying in shillings. Safari lodges, dive centres and some hotels quote and accept dollars. Almost nothing else does. Where dollars are taken, change is often given in shillings at a rate chosen by the business rather than by the market.'),

  block('Two practical notes. Bring dollar notes printed in 2013 or later, because older series are frequently refused by banks and bureaus. And bring some small denominations, because ones, fives and tens are genuinely useful for tipping while a fifty is not.'),

  tip('tip', '🏦', 'Where to change money', 'Forex bureaus in town give better rates than banks, and both beat the airport. Larger notes get a better rate than small ones, which is the opposite of what most people assume. Count the money before you leave the counter, every time, without apology. It is completely normal to do so.'),

  /* ── Park fees ─────────────────────────────────────────── */
  block('National park fees are cashless now', 'h2'),

  rich([
    { text: 'This one catches people out, and it is worth reading twice. ' },
    { text: 'Kenya Wildlife Service', link: X.kws },
    { text: ' parks no longer take cash at the gate. All entry fees go through ' },
    { text: 'KWSPay on eCitizen', link: X.kwsPay },
    { text: ', paid online before you travel, using a card or M-Pesa. You arrive with a digital receipt and a QR code, and the gate scans it. Turning up with a wallet full of dollars does not work.' },
  ]),

  ...bullets([
    'Pay in advance through KWSPay. Do not leave it to the gate.',
    'Save the receipt as a screenshot as well as a PDF. Signal at park gates can be poor.',
    'Bring the passport or ID that matches the booking.',
    'Rates differ for citizens, residents and non residents, so book the right category.',
  ]),

  rich([
    { text: 'KWS explains the switch in its own ' },
    { text: 'announcement of the electronic payment system', link: X.kwsCashless },
    { text: '. If you are planning a safari leg, our ' },
    { text: 'guide to Kenya national parks', link: J.parks },
    { text: ' covers which parks are worth the fee, and the ' },
    { text: '10 day Kenya itinerary', link: J.itinerary },
    { text: ' shows how a bush and beach trip fits together.' },
  ]),

  tip('teal', '🛂', 'The eTA is another prepaid one', 'Your travel authorisation is also paid online before you fly, through the official portal at etakenya.go.ke. Apply directly rather than through an agent site charging a markup for the same form.'),

  rich([
    { text: 'Apply on the ' },
    { text: 'official Kenya eTA portal', link: X.eta },
    { text: ' and nowhere else.' },
  ]),

  /* ── Tipping ───────────────────────────────────────────── */
  block('Tipping in Kenya: what is normal', 'h2'),

  block('Tipping is appreciated rather than obligatory, and nothing like the social contract it is in the United States. Service is often genuinely warm without any expectation attached. That said, tourism wages are low and a tip lands meaningfully.'),

  budgetTable(
    ['Normal amount', 'How'],
    [
      { label: 'Safari guide or driver', values: ['10 to 20 dollars per person per day', 'Cash, at the end'] },
      { label: 'Lodge and camp staff', values: ['10 to 15 dollars per person per day', 'The communal tip box'] },
      { label: 'Restaurant, no service charge', values: ['10 percent', 'Cash to the server'] },
      { label: 'Restaurant with service charge', values: ['Round up if service was good', 'Check the bill first'] },
      { label: 'Tuk-tuk or taxi', values: ['Round up to the nearest 100', 'Cash'] },
      { label: 'Housekeeping', values: ['KES 200 to 500 per day', 'Left in the room'] },
    ],
  ),

  tip('tip', '💵', 'Small notes are the whole trick', 'A tip is only useful if it can be given. Break a large note at a supermarket early in the trip and keep a stash of 100s, 200s and small dollar bills somewhere separate. Handing over a 1,000 note and waiting for change turns a nice gesture into an awkward negotiation.'),

  pullQuote('Cash for the market, M-Pesa for everything moving, card for the supermarket. Get those three right and you will not think about money again for the rest of the trip.'),

  /* ── Decider ───────────────────────────────────────────── */
  block('How to pay for what: the short answer', 'h2'),

  deciderGrid([
    {
      label: 'USE M-PESA', color: 'teal', title: 'Anything local and moving',
      items: ['Tuk-tuks, boda bodas and matatus', 'Beach bars and small cafes', 'Topping up phone data', 'Paying a guide, a fundi or a host'],
    },
    {
      label: 'USE CARD', color: 'blue', title: 'Anything with a counter',
      items: ['Supermarkets and malls', 'Hotels and lodges', 'Established restaurants', 'Fuel stations'],
    },
    {
      label: 'USE CASH', color: 'amber', title: 'Anything informal',
      items: ['Markets and street traders', 'Tips of every kind', 'Rural areas with no signal', 'Small dukas and roadside stalls'],
    },
    {
      label: 'PAY ONLINE FIRST', color: 'purple', title: 'Anything official',
      items: ['National park entry through KWSPay', 'Your eTA before you fly', 'Domestic flights', 'Anything on eCitizen'],
    },
  ]),

  img(IMG.tuktuk, 'Illustration of a tuk-tuk and a boda boda on a Kenyan coastal road', 'Every driver on this road takes M-Pesa. Almost none of them take a card.'),

  /* ── Mistakes ──────────────────────────────────────────── */
  block('The mistakes almost everyone makes', 'h2'),

  ...bullets([
    'Accepting dynamic currency conversion at the ATM, which quietly costs three to six percent on every withdrawal.',
    'Changing money at the airport because it is there. Town bureaus are meaningfully better.',
    'Arriving at a park gate expecting to pay cash. You will not get in.',
    'Carrying only 1,000 notes, then being unable to pay a 150 shilling fare.',
    'Skipping the SIM to save twenty minutes, then paying roaming charges and losing access to M-Pesa for the whole trip.',
    'Bringing pre 2013 dollar notes, which many banks and bureaus refuse outright.',
    'Sharing an M-Pesa PIN with anyone who calls claiming to be from Safaricom.',
  ]),

  packingList('Your Kenya money kit', [
    { icon: '🛂', text: 'Passport, physical, for the SIM registration' },
    { icon: '💳', text: 'Two cards from different banks, kept separately' },
    { icon: '💵', text: 'Some dollars, 2013 or newer, in small notes' },
    { icon: '📱', text: 'An unlocked phone that takes a local SIM' },
    { icon: '🔢', text: 'Your card PINs, since chip and PIN is standard here' },
    { icon: '📄', text: 'Screenshots of your eTA and any park receipts' },
  ]),

  /* ── Verdict ───────────────────────────────────────────── */
  block('The setup we would recommend', 'h2'),

  verdictCard(
    'teal',
    'THE SETUP',
    'SIM on arrival, one big ATM withdrawal, card for the rest',
    [
      'M-Pesa covers the ninety percent of daily spending that cards cannot reach',
      'One larger ATM withdrawal beats five small ones on fees',
      'A card handles supermarkets, hotels and fuel without thought',
      'Small notes make tipping easy instead of awkward',
      'Everything official is prepaid online before you land',
    ],
    [
      'The SIM costs you twenty minutes on day one',
      'M-Pesa needs a physical passport, so do it before you leave the airport area',
      'ATM fees are unavoidable, so plan fewer and larger withdrawals',
    ],
  ),

  whoIsItFor('🎯 Worth knowing if you are...', [
    { icon: '🏖️', text: 'On the coast, where cards fail more often than inland' },
    { icon: '🦁', text: 'Doing a safari leg, because park fees are prepaid only' },
    { icon: '🏡', text: 'Staying a month or more, where M-Pesa becomes essential' },
    { icon: '💼', text: 'Working remotely and paying local suppliers' },
    { icon: '👨‍👩‍👧', text: 'Travelling as a family and splitting costs locally' },
    { icon: '🎒', text: 'On a budget, where the fee savings genuinely add up' },
  ]),

  /* ── FAQ ───────────────────────────────────────────────── */
  block('Money in Kenya: frequently asked questions', 'h2'),

  block('Can tourists use M-Pesa in Kenya?', 'h3'),
  block('Yes. Any visitor can register with a valid passport and a Safaricom SIM card. You do not need a Kenyan ID, a residence permit or a local bank account. Registration takes about twenty minutes at a Safaricom shop or the desk in airport arrivals, and the SIM itself costs roughly KES 100.'),

  block('How much cash should I bring to Kenya?', 'h3'),
  block('Less than you think. A few hundred dollars in small notes covers tips and the first day, and everything else is better drawn from a bank ATM in shillings as you go. Carrying large amounts of cash is unnecessary when M-Pesa and cards cover most spending, and ATMs are common in every town of any size.'),

  block('Do I need cash in Kenya or can I use cards everywhere?', 'h3'),
  block('You need some cash. Cards work in supermarkets, malls, chain hotels, fuel stations and most established restaurants, but they are not accepted at markets, by tuk-tuk and boda boda drivers, in matatus, at small shops or at many beach bars. Those places take cash or M-Pesa.'),

  block('What is the best way to get shillings in Kenya?', 'h3'),
  block('A bank ATM using your normal debit card, choosing to be charged in shillings rather than your home currency. Forex bureaus in town are the next best option and beat both banks and the airport for changing physical notes. The airport exchange desk is the most expensive way to do it.'),

  block('Are US dollars accepted in Kenya?', 'h3'),
  block('In safari lodges, dive centres and some hotels, yes. Almost nowhere else. Where they are accepted, the rate applied is set by the business and is usually worse than the market rate, so paying in shillings is normally cheaper. Bring notes printed in 2013 or later, as older series are often refused.'),

  block('Can I pay Kenya national park fees at the gate?', 'h3'),
  block('No. Kenya Wildlife Service parks are cashless. Entry fees must be paid in advance online through KWSPay on the eCitizen platform, using a card or M-Pesa, and you present a digital receipt with a QR code at the gate. Save it offline, because signal at park gates is often poor.'),

  block('How much should I tip in Kenya?', 'h3'),
  block('Around 10 to 20 dollars per person per day for a safari guide, 10 to 15 for general lodge staff through the communal box, and roughly 10 percent in restaurants where no service charge has been added. Check the bill first, as a 10 percent service charge is often already included.'),

  block('Is it safe to use ATMs in Kenya?', 'h3'),
  block('Generally yes, particularly ATMs inside bank branches, supermarkets and malls during the day. Use machines in busy well lit places rather than standalone booths at night, cover the keypad, and decline any offer of help from a stranger. Standard precautions, the same as anywhere.'),

  /* ── Close ─────────────────────────────────────────────── */
  block('The bottom line', 'h2'),

  block('Kenya is one of the easiest countries in the world to pay for things in, once you stop trying to use it like Europe. The mobile money system here is genuinely better than what most visitors have at home. Spend twenty minutes on a SIM and an M-Pesa registration when you land, keep a card for the supermarket and some small notes for the market, and prepay anything official before you fly. That is the entire system.'),

  rich([
    { text: 'Planning the rest of the trip? Start with the ' },
    { text: 'complete Watamu guide', link: J.watamu },
    { text: ', the ' },
    { text: 'Kilifi guide', link: J.kilifi },
    { text: ' or the ' },
    { text: 'Diani guide', link: J.diani },
    { text: '. Still choosing between them? Our ' },
    { text: 'coast comparison', link: J.compare },
    { text: ' is the quickest way to decide, and the ' },
    { text: 'seaweed season guide', link: J.seaweed },
    { text: ' will tell you which months to aim for. For getting around once you land, read the ' },
    { text: 'transport guide', link: J.transport },
    { text: ', and when you are ready to spend some of those shillings, the ' },
    { text: 'best restaurants in Watamu', link: J.eats },
    { text: ' are a good place to start.' },
  ]),
]

/* ── Push ──────────────────────────────────────────────────────────── */

const doc = {
  _id: POST_ID,
  _type: 'blogPost',
  title: 'Money in Kenya 2026: Cash, Cards, ATMs and M-Pesa Explained',
  slug: { _type: 'slug', current: SLUG },
  status: 'published',
  author: { _type: 'reference', _ref: AUTHOR_ID },
  excerpt:
    'Kenya runs on M-Pesa, not cash or cards. How visitors register in twenty minutes, what ATMs really cost, where cards fail, and why park fees must be prepaid.',
  coverImage: {
    _type: 'image',
    alt: 'A Kenyan shopping street with small shops, tuk-tuks and boda bodas where cash and M-Pesa are the only options',
    asset: { _type: 'reference', _ref: IMG.shopRoad },
  },
  primaryCategory: 'travel_tips',
  subcategory: 'money_banking',
  postType: 'guide',
  location: 'kenya_general',
  focusKeyword: 'money in kenya',
  keywords: ['money in kenya', 'm-pesa for tourists', 'kenya atm', 'kenya currency', 'kenyan shilling', 'tipping in kenya', 'kenya park fees', 'cards in kenya'],
  tags: ['travel tips', 'money', 'practical', 'kenya', 'first trip'],
  readingTime: 11,
  publishedAt: '2026-08-17T10:00:00Z',
  seoTitle: 'Money in Kenya 2026: Cash, Cards, ATMs and M-Pesa',
  seoDescription:
    'Kenya runs on M-Pesa. How tourists register with a passport, real ATM limits and fees, where cards work, tipping norms, and why park fees are prepaid only.',
  body,
}

async function main() {
  const words = body
    .filter((b) => b._type === 'block')
    .flatMap((b) => (b.children ?? []).map((c: any) => c.text))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length

  const mix = body.reduce<Record<string, number>>((a, b) => {
    a[b._type] = (a[b._type] ?? 0) + 1
    return a
  }, {})

  const ext = new Set<string>()
  const int = new Set<string>()
  for (const b of body) {
    for (const m of b.markDefs ?? []) {
      if (m._type === 'link') (m.href.startsWith('http') ? ext : int).add(m.href)
    }
  }

  console.log(`📝 ${doc.title}`)
  console.log(`   /journal/${SLUG}`)
  console.log(`   ${body.length} body blocks · ~${words} words of prose`)
  console.log(`   ${ext.size} external links · ${int.size} internal links`)
  console.log(`   block mix: ${Object.entries(mix).map(([k, v]) => `${k.replace('Block', '')}×${v}`).join(', ')}`)

  if (DRY) {
    console.log('\n  external:'); ext.forEach((u) => console.log('   ', u))
    console.log('  internal:'); int.forEach((u) => console.log('   ', u))
    console.log('\nDry run. Re-run without --dry to publish.')
    return
  }

  await client.createOrReplace(doc)
  console.log(`\n✅ Published: https://www.klickenya.com/journal/${SLUG}`)
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
