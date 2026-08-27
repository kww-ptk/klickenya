/**
 * Seed "Seaweed on the Kenya Coast" — the month by month guide.
 *
 * Route: /journal/kenya-coast-seaweed-season-guide
 * Idempotent: createOrReplace with a fixed _id.
 *
 * Run locally (needs the Sanity WRITE token):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-kenya-seaweed-season.ts --dry
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-kenya-seaweed-season.ts
 *
 * Why this post: the SERP for Kenya seaweed queries is TripAdvisor forum threads and
 * generic operator pages. Nobody owns it. Meanwhile the whole "sargassum" content
 * category online is Caribbean and Mexican, which is a different phenomenon, so
 * travellers googling Kenya land on Cancun horror photos and panic. The angle is
 * accuracy plus honesty plus beach level specifics nobody else has.
 *
 * House rules applied (docs/how-to-add-a-blog-post.md section 7):
 *  - no dashes in prose, "tuk-tuk" excepted; the word "refined" avoided
 *  - every internal link verified 200 against production before writing
 *  - custom blocks throughout, not walls of paragraphs
 *  - direct answer paragraph up top for AI search, question style headings, real FAQ
 *
 * Images: existing Sanity assets, every one opened and visually checked. The "with
 * seaweed" shots genuinely show seaweed (a banked high water line, an exposed weed
 * bank at low tide, and staff raking the beach). Nothing is captioned as something
 * it is not.
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
const POST_ID = 'blog-kenya-coast-seaweed-guide'
const SLUG = 'kenya-coast-seaweed-season-guide'

/* ── Verified image assets ─────────────────────────────────────────
 * WITH seaweed and WITHOUT seaweed, checked by eye at full resolution.  */
const IMG = {
  // WITH seaweed
  seaweedLine: 'image-6a23a5c93052acc08d14ba539950148cd5d5a5c0-1170x864-jpg',   // thick weed band along the high water line
  raking: 'image-22e3789982ee4d23198ebfb003b336dfcc96ccf3-1170x864-jpg',        // beach staff raking weed off the sand
  weedBank: 'image-00ada705d30557108d13d3d9f34a5e68f3b8f8fd-1170x818-jpg',      // exposed weed bank at low tide, Watamu Bay
  // WITHOUT seaweed
  clearWater: 'image-63df462742ea2467334998275abf0b7eb9a2d785-2048x1536-jpg',   // gin clear water over clean sand
  rippledSand: 'image-06635cdcf93cb7b6c19d7f7deb31c3be09d81df4-1900x1425-webp', // rippled sandbank, spotless
  shortBeach: 'image-92bf4b25d553a4031fa5ee943a12eb5944a7f447-1152x977-jpg',    // Short Beach cove
  garoda: 'image-3bddbbe194262c409a18c8042a73647236a4762a-1400x788-jpg',        // Garoda from the air
  bofa: 'image-ad29e174f51cf8d8a21c3eb2804a737121412b45-3840x2157-jpg',         // Bofa Beach, Kilifi
  diani: 'image-69b24eecbf3e2114afeb311c022edeaf52930351-1960x1307-jpg',        // Diani from the air
}

/* ── Listing references (all verified published) ───────────────────── */
const LISTING = {
  garoda: '2riX1AdO9O53izfAmrIrcS',
  shortBeach: '2riX1AdO9O53izfAmrIrIS',
  jacaranda: '2riX1AdO9O53izfAmrInwx',
  watamuBay: 'OTOIQY89AHB7SUiuiBVdzV',
  oceanBreeze: '2riX1AdO9O53izfAmrIeLx',
  sevenIslands: '2riX1AdO9O53izfAmrIeVx',
  bofa: 'listing-bofa-beach-kilifi',
  kilifiBeach: 'listing-kilifi-beach',
  redHouse: 'listing-red-house-beach-kilifi',
}

/* ── Internal journal links (all verified 200) ─────────────────────── */
const J = {
  beaches: '/journal/7-best-beaches-watamu-kenya',
  bestTime: '/journal/best-time-to-visit-watamu',
  tides: '/journal/watamu-tide-guide',
  kite: '/journal/kitesurfing-watamu-guide',
  watamu: '/journal/complete-guide-watamu-kenya-2026',
  kilifi: '/journal/complete-guide-kilifi-kenya-2026',
  diani: '/journal/complete-guide-diani-beach-kenya-2026',
  compare: '/journal/watamu-kilifi-diani-lamu-kenya-coast-guide',
  eats: '/journal/best-restaurants-watamu-kenya',
}

/* ── Helpers ───────────────────────────────────────────────────────── */

let n = 0
function key(p = 'k') {
  n += 1
  return `${p}${n}`
}

type B = Record<string, any>

function block(text: string, style = 'normal'): B {
  return { _type: 'block', _key: key('b'), style, markDefs: [], children: [{ _type: 'span', _key: key('s'), text, marks: [] }] }
}

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

function bullets(items: string[]): B[] {
  return items.map((t) => ({
    _type: 'block', _key: key('b'), style: 'normal', listItem: 'bullet', level: 1,
    markDefs: [], children: [{ _type: 'span', _key: key('s'), text: t, marks: [] }],
  }))
}

function img(assetId: string, alt: string, caption?: string): B {
  return { _type: 'image', _key: key('i'), alt, ...(caption ? { caption } : {}), asset: { _type: 'reference', _ref: assetId } }
}

function photoRow(
  layout: string,
  photos: Array<{ ref: string; alt: string; aspectRatio: string }>,
  caption?: string,
): B {
  return {
    _type: 'photoRowBlock', _key: key('pr'), layout, ...(caption ? { caption } : {}),
    photos: photos.map((p) => ({ _type: 'image', _key: key('pri'), alt: p.alt, aspectRatio: p.aspectRatio, asset: { _type: 'reference', _ref: p.ref } })),
  }
}

function quickFacts(title: string, accentColor: string, items: Array<{ icon: string; label: string; value: string }>): B {
  return { _type: 'quickFactsBlock', _key: key('qf'), title, accentColor, items: items.map((i) => ({ _key: key('qfi'), ...i })) }
}

function tip(variant: string, icon: string, label: string, text: string): B {
  return { _type: 'tipCardBlock', _key: key('tc'), variant, icon, label, text }
}

function statRow(stats: Array<{ number: string; label: string }>): B {
  return { _type: 'statRowBlock', _key: key('sr'), stats: stats.map((s) => ({ _key: key('sri'), ...s })) }
}

function budgetTable(columns: string[], rows: Array<{ label: string; values: string[] }>): B {
  return { _type: 'budgetTableBlock', _key: key('bt'), columns, rows: rows.map((r) => ({ _key: key('bti'), label: r.label, values: r.values })) }
}

function compareTable(columns: Array<{ label: string; color: string }>, rows: Array<{ criterion: string; values: string[] }>): B {
  return {
    _type: 'compareTableBlock', _key: key('ct'),
    columns: columns.map((c) => ({ _key: key('cti'), ...c })),
    rows: rows.map((r) => ({ _key: key('ctr'), criterion: r.criterion, values: r.values })),
  }
}

function deciderGrid(cards: Array<{ label: string; color: string; title: string; items: string[] }>): B {
  return { _type: 'deciderGridBlock', _key: key('dg'), cards: cards.map((c) => ({ _key: key('dgi'), ...c })) }
}

function verdictCard(variant: string, label: string, title: string, pros: string[], cons: string[]): B {
  return { _type: 'verdictCardBlock', _key: key('vc'), variant, label, title, pros, cons }
}

function packingList(title: string, items: Array<{ icon: string; text: string }>): B {
  return { _type: 'packingListBlock', _key: key('pl'), title, items: items.map((i) => ({ _key: key('pli'), ...i })) }
}

function whoIsItFor(title: string, items: Array<{ icon: string; text: string }>): B {
  return { _type: 'whoIsItForBlock', _key: key('wf'), title, items: items.map((i) => ({ _key: key('wfi'), ...i })) }
}

function pullQuote(text: string, accentColor = 'teal'): B {
  return { _type: 'pullQuoteBlock', _key: key('pq'), text, accentColor }
}

function listingCard(ref: string, label?: string): B {
  return { _type: 'inlineListingBlock', _key: key('il'), ...(label ? { label } : {}), listing: { _type: 'reference', _ref: ref } }
}

function listingSlider(heading: string, refs: string[]): B {
  return {
    _type: 'listingSliderBlock', _key: key('ls'), heading,
    listings: refs.map((r) => ({ _type: 'reference', _key: key('lsi'), _ref: r })),
  }
}

/* ── Body ──────────────────────────────────────────────────────────── */

const body: B[] = [
  quickFacts('✦ Seaweed at a Glance', 'teal', [
    { icon: '🗓️', label: 'Worst months', value: 'August and September' },
    { icon: '✅', label: 'Clearest months', value: 'December to March' },
    { icon: '🌬️', label: 'What causes it', value: 'The Kusi, the southeast monsoon' },
    { icon: '🏖️', label: 'Cleanest beach', value: 'Garoda, Watamu' },
    { icon: '🩺', label: 'Is it harmful', value: 'No, it is not toxic' },
    { icon: '🧹', label: 'Do hotels clear it', value: 'Most rake at dawn, daily' },
  ]),

  block('Seaweed on the Kenya Coast: The Honest Guide', 'h2'),

  rich([
    { text: 'Seaweed on the Kenya coast is real, it is seasonal, and it is nowhere near as bad as the internet makes it look. ', bold: true },
    { text: 'The short version: the weed arrives with the Kusi, the southeast monsoon that blows from roughly June to October, and it peaks in August and September. From December to March the water is close to spotless. Even in the worst weeks it varies enormously beach by beach, so where you stay matters far more than when you come. Garoda in Watamu stays clean when almost everything else on the north coast gets hit.' },
  ]),

  block('That is the answer most people came for. The rest of this guide is the detail nobody else publishes: what the weed actually is, why one beach is clean while the beach next door is buried, what it looks like on the sand, and how to plan a trip in August without ruining it.'),

  photoRow(
    'cols-2',
    [
      { ref: IMG.seaweedLine, alt: 'Thick brown seaweed banked along the high water line on a Watamu beach', aspectRatio: 'wide' },
      { ref: IMG.clearWater, alt: 'Gin clear water over clean white sand on the same Watamu coastline in the clear season', aspectRatio: 'wide' },
    ],
    'Left: seaweed banked up along the high water line in Watamu. Right: the same coastline in the clear months. Both are completely normal. Which one you get is mostly a question of timing and of which beach you booked.',
  ),

  /* ── 1. What it actually is ─────────────────────────────── */
  block('Is it sargassum? No, and the difference matters', 'h2'),

  block('If you have googled beach seaweed recently you have seen photos of Cancun, Tulum and Barbados buried under a metre of rotting brown weed. That is Atlantic sargassum. It is a genuine ecological crisis, it is driven by a vast floating bloom that stretches across the tropical Atlantic, and it has essentially nothing to do with Kenya.'),

  block('What washes up on the Kenya coast is mostly local. The lagoons inside the reef here are carpeted with seagrass meadows, dominated by a species called Thalassodendron ciliatum, along with native brown and red algae growing on the reef itself. When the monsoon swell picks up, it tears that growth loose and pushes it shoreward. The weed on your beach in August grew about four hundred metres away.'),

  tip('warning', '🚫', 'Do not trust the Caribbean photos', 'Searching "sargassum" will show you images from Mexico and the Caribbean that look apocalyptic. Kenya does not get that. Ours arrives in a band along the tide line, not in drifts you have to wade through, and it comes and goes with the tide rather than sitting and rotting for weeks.'),

  block('That distinction is not pedantry, it changes what you should expect:'),

  ...bullets([
    'It arrives in a line along the high water mark, not as a floating raft offshore that blocks swimming.',
    'It moves. A beach that is weedy on the morning tide can be clean by the afternoon one.',
    'It is patchy over very short distances, because it depends on the angle of the reef and the shape of each cove.',
    'It is not toxic and it does not sting. Walking through it is unpleasant underfoot, nothing worse.',
    'It smells only once it has been sitting in the sun for a day or two, which is why beaches get raked at dawn.',
  ]),

  /* ── 2. When ────────────────────────────────────────────── */
  block('When is seaweed season in Kenya?', 'h2'),

  block('The whole coast runs on two monsoons, and once you understand them you can predict the beach conditions for any month of the year.'),

  block('The Kaskazi blows from the northeast between roughly November and March. It is the gentle one: light wind, flat sea, hot sun and the clearest water of the year. The Kusi blows from the southeast between roughly June and October. It is stronger, cooler and pushes real swell onto the reef. That swell is what strips the lagoon and delivers the weed.'),

  statRow([
    { number: '2', label: 'monsoons that set the whole rhythm' },
    { number: 'Aug', label: 'the single weediest month' },
    { number: 'Dec to Mar', label: 'the clearest water of the year' },
    { number: '15 min', label: 'walk that usually finds clean sand' },
  ]),

  budgetTable(
    ['Sea and wind', 'Seaweed', 'Verdict'],
    [
      { label: 'December to March', values: ['Kaskazi. Calm, flat, hot', 'Minimal to none', 'The best window. Book months ahead'] },
      { label: 'April to May', values: ['Long rains. Transitional', 'Light and patchy', 'Quiet and cheap. Water can cloud up'] },
      { label: 'June to July', values: ['Kusi building. Breezy', 'Starts arriving', 'Still good, especially in the coves'] },
      { label: 'August to September', values: ['Kusi at full strength', 'The worst of it', 'Fine if you pick the right beach'] },
      { label: 'October to November', values: ['Kusi fading, Kaskazi returns', 'Clearing week by week', 'Underrated. Improves fast'] },
    ],
  ),

  rich([
    { text: 'Worth saying plainly: these are patterns, not guarantees. Seaweed shifts year to year with wind strength, water temperature and currents, and locals will tell you some Augusts are barely noticeable while others are heavy. Our ' },
    { text: 'guide to the best time to visit', link: J.bestTime },
    { text: ' covers the rest of the seasonal picture, including rain, heat and crowds.' },
  ]),

  img(IMG.rippledSand, 'A spotless rippled sandbank at low tide on the Kenya coast during the clear season', 'Late December. The same coast that collects weed in August.'),

  /* ── 3. Which beaches ───────────────────────────────────── */
  block('Which Kenya beaches stay cleanest in seaweed season?', 'h2'),

  block('This is the part that actually decides your holiday, and it is the part every other article skips. Two beaches ten minutes apart can be completely different on the same morning. It comes down to three things: how deep the cove is, what angle the offshore reef sits at, and whether the beach faces into the Kusi or away from it.'),

  compareTable(
    [
      { label: 'In the Kusi', color: 'teal' },
      { label: 'Why', color: 'slate' },
      { label: 'Best for', color: 'amber' },
    ],
    [
      { criterion: 'Garoda, Watamu', values: ['Usually stays clean', 'Deep cove, reef angle protects it', 'The safest bet in August'] },
      { criterion: 'Short Beach, Watamu', values: ['Usually light', 'Small sheltered cove', 'A quiet swim away from crowds'] },
      { criterion: 'Bofa, Kilifi', values: ['Light', 'Long beach, reef well offshore', 'Empty sand and kite wind'] },
      { criterion: 'Turtle Bay, Watamu', values: ['Gets hit', 'Open and exposed', 'Walk south toward Garoda'] },
      { criterion: 'Watamu Bay', values: ['Gets hit', 'Shallow bay collects and holds it', 'Boats and sunset, not swimming'] },
      { criterion: 'Diani central', values: ['Gets hit', 'Long exposed beach facing the Kusi', 'Hotels here rake daily'] },
      { criterion: 'Galu, Diani', values: ['Cleaner than central', 'Reef curves away differently', 'The south coast pick in Kusi'] },
    ],
  ),

  tip('teal', '🚶', 'Klickenya local tip', 'If your stretch is weedy, walk. Fifteen to twenty minutes in either direction very often puts you on clean sand, because the weed collects in some coves and skips others entirely. Ask the beach staff at your hotel which way to go. They walk it every morning and they always know.'),

  block('Garoda is the one worth planning around. It is the beach locals send people to when the seaweed reports start, and it holds up when Turtle Bay and the town beach are covered. If you are travelling in August or September and you only care about one thing, book near Garoda.'),

  listingCard(LISTING.garoda, 'The seaweed season insurance policy'),

  img(IMG.garoda, 'Aerial view of Garoda Beach in Watamu with clean white sand and the reef offshore', 'Garoda holds its sand through the Kusi when the exposed beaches do not.'),

  rich([
    { text: 'Up the coast in Kilifi, ' },
    { text: 'Bofa Beach', link: '/experiences/kilifi/bofa-beach' },
    { text: ' is long, open and quiet, and it tends to see lighter weed than the north coast average. It is also the emptiest good beach on this stretch of coast, which is its own argument. The ' },
    { text: 'full Kilifi guide', link: J.kilifi },
    { text: ' has the rest.' },
  ]),

  listingCard(LISTING.bofa, 'Kilifi in seaweed season'),

  /* ── 4. What it looks like ──────────────────────────────── */
  block('What does it actually look like when it lands?', 'h2'),

  block('Honestly, it looks like a brown or reddish band lying along the top of the beach where the last high tide reached. Sometimes it is a thin scatter you barely notice. In a bad week it is a continuous bank, ankle deep and a couple of metres wide, running the length of the beach. The water beyond it is usually still clear and swimmable, which surprises people. It is the walk from your towel to the sea that is unpleasant, not the swim.'),

  photoRow(
    'cols-2',
    [
      { ref: IMG.weedBank, alt: 'A weed bank exposed along the shoreline at low tide in Watamu Bay with fishing boats moored beyond', aspectRatio: 'wide' },
      { ref: IMG.raking, alt: 'Beach staff raking seaweed off the sand in front of a beach bar in Watamu', aspectRatio: 'wide' },
    ],
    'Left: a weed bank exposed at low tide in Watamu Bay. Right: the reason most hotel beaches look fine by breakfast. Raking starts at first light and often happens twice a day in the peak weeks.',
  ),

  block('Almost every hotel and beach bar on the coast rakes. Staff start at dawn, pile the weed above the tide line or cart it off, and by the time guests come down for breakfast the beach in front of the property is clean. Then the midday tide brings more. In August the good places rake twice. This is completely routine and nobody makes a fuss about it.'),

  tip('tip', '👃', 'The smell question', 'Fresh weed smells of the sea and nothing more. What you occasionally catch is older weed that has been baking above the tide line for a day or two, which turns slightly sulphurous. It is localised and it passes. If your beach smells, you are downwind of an old pile rather than of the ocean itself.'),

  block('The other honest note: piles that sit for a few days attract sandflies. Not a swarm, not a health issue, but if you are sensitive to bites keep your towel away from an old bank and you will not notice them.'),

  /* ── 5. Planning ────────────────────────────────────────── */
  block('How do you plan a trip around it?', 'h2'),

  block('Five things actually move the needle. None of them involve cancelling.'),

  ...bullets([
    'Book a cove, not an open stretch. Coves and marine park beaches with the reef close in take far less weed than long exposed shorelines.',
    'Time your swim to the tide, not the clock. The band sits at the high water mark, so at mid to low tide there is clean wet sand between it and the sea.',
    'Ask before you book. Message the property and ask directly what their beach was like last week. Honest hosts will tell you, and the answer tells you a lot about the host.',
    'Have a second beach in mind. Fifteen minutes in a tuk-tuk gives you a completely different result on the same day.',
    'Travel in the shoulder. October and November clear fast, prices are still low, and the sea warms back up.',
  ]),

  rich([
    { text: 'Tide timing is the single most useful skill on this coast and it pays off well beyond seaweed. Our ' },
    { text: 'Watamu tide guide', link: J.tides },
    { text: ' explains how to read it and why the beach here transforms twice a day.' },
  ]),

  packingList('Packing for the Kusi months', [
    { icon: '👟', text: 'Water shoes, for walking through a weed line' },
    { icon: '🩴', text: 'Flip flops you do not mind rinsing' },
    { icon: '🤿', text: 'Mask and snorkel, the water is clearer than the sand suggests' },
    { icon: '🧴', text: 'Reef safe sunscreen' },
    { icon: '🪟', text: 'Insect repellent, for the old piles' },
    { icon: '🧺', text: 'A mat, so you are not sitting on damp weedy sand' },
  ]),

  pullQuote('The weed is a two week problem that people turn into a two month one. Pick the right beach and August on this coast is still extraordinary.'),

  /* ── 6. Decider ─────────────────────────────────────────── */
  block('Travelling in August or September? Start here', 'h2'),

  // Colours limited to teal/blue/purple/amber on purpose. The schema also allows
  // green and red, and DeciderGridBlock.tsx handles them on main, but the build
  // currently deployed to klickenya.com predates that fix and 500s on either one.
  // Revisit once production is redeployed from main.
  deciderGrid([
    {
      label: 'BEST BET', color: 'teal', title: 'Garoda, Watamu',
      items: ['Stays clean when the rest of the north coast does not', 'Deep cove, protected reef angle', 'Kite schools, sandbank at low tide', 'Book accommodation on this side'],
    },
    {
      label: 'STRONG', color: 'blue', title: 'Bofa, Kilifi',
      items: ['Lighter weed than the coast average', 'Empty even in peak season', 'Reliable Kusi wind for kiting', 'Very few places to eat on the beach'],
    },
    {
      label: 'WITH CARE', color: 'amber', title: 'Diani',
      items: ['Central Diani takes the Kusi full on', 'Hotels rake daily, so resort beaches look fine', 'Galu and the southern end stay cleaner', 'Ask the property before booking'],
    },
    {
      label: 'AVOID', color: 'purple', title: 'Booking blind',
      items: ['Do not book an exposed beach sight unseen in August', 'Do not judge Kenya by Caribbean sargassum photos', 'Do not assume one bad report covers the whole coast', 'Do not skip asking the host directly'],
    },
  ]),

  img(IMG.bofa, 'Aerial view of the long empty white sand of Bofa Beach in Kilifi', 'Bofa, Kilifi. Long, open and usually lighter on weed than the coast average.'),

  /* ── 7. Verdict ─────────────────────────────────────────── */
  block('So should you still come in seaweed season?', 'h2'),

  verdictCard(
    'teal',
    'THE VERDICT',
    'Yes, with one decision made carefully',
    [
      'Prices drop hard between June and October',
      'Beaches are genuinely empty compared with December',
      'The Kusi is the best kitesurfing wind of the year',
      'Water is still warm and still swimmable throughout',
      'Cove beaches like Garoda barely notice it',
    ],
    [
      'August and September need you to choose the right beach',
      'Exposed stretches can be weedy for days at a time',
      'Sea is rougher and visibility for diving drops',
      'It is cooler and greyer than the Kaskazi months',
    ],
  ),

  rich([
    { text: 'If your trip is fixed to August and you want the strongest version of it, put Watamu near Garoda at the top of the list, and read the ' },
    { text: 'seven best beaches in Watamu', link: J.beaches },
    { text: ' for the beach by beach detail. If you are still choosing a destination entirely, our ' },
    { text: 'comparison of Watamu, Kilifi, Diani and Lamu', link: J.compare },
    { text: ' is the faster way to decide.' },
  ]),

  listingSlider('Beaches that hold up in seaweed season', [
    LISTING.garoda,
    LISTING.shortBeach,
    LISTING.bofa,
    LISTING.kilifiBeach,
    LISTING.jacaranda,
  ]),

  whoIsItFor('🎯 Seaweed season suits you if...', [
    { icon: '💰', text: 'You want low season prices on the same coast' },
    { icon: '🪁', text: 'You kitesurf, the Kusi is the best wind of the year' },
    { icon: '🤫', text: 'You would rather have an empty beach than a perfect one' },
    { icon: '🧭', text: 'You are willing to walk to a cleaner stretch' },
    { icon: '📸', text: 'Less good if you need flawless sand for photos' },
    { icon: '🤿', text: 'Less good if diving visibility is your main reason to come' },
  ]),

  img(IMG.diani, 'Aerial view of the long white sand of Diani Beach on the Kenya south coast', 'Diani. Long, beautiful and fully exposed to the Kusi, which is why the resorts rake every morning.'),

  /* ── 8. FAQ ─────────────────────────────────────────────── */
  block('Kenya seaweed: frequently asked questions', 'h2'),

  block('Which month has the most seaweed in Kenya?', 'h3'),
  block('August, closely followed by September. These are the two months when the Kusi is at full strength and the swell is stripping the most growth off the lagoon. If you have any flexibility, shifting a trip to late October makes a visible difference.'),

  block('Is the seaweed in Kenya the same as Caribbean sargassum?', 'h3'),
  block('No. The Atlantic sargassum blooms affecting Mexico, the Caribbean and West Africa are a separate phenomenon on a completely different scale. Kenya gets local seagrass and reef algae torn loose by monsoon swell. It arrives in a band at the tide line rather than in drifts, and it clears with the tide.'),

  block('Is Kenya seaweed dangerous or dirty?', 'h3'),
  block('It is neither toxic nor a sign of pollution. It is living marine growth that has been detached by weather. It does not sting and it is safe to walk through, though water shoes make it more pleasant. Old piles left in the sun for several days can smell and attract sandflies, which is why beaches are raked daily.'),

  block('Do hotels clean the seaweed off the beach?', 'h3'),
  block('Almost all of them do, and they start before you are awake. Staff rake the beach in front of the property at first light, and in the peak weeks many rake again in the afternoon. Resort beaches in Diani and Watamu usually look clean by breakfast regardless of the season.'),

  block('Which Kenya beach has the least seaweed?', 'h3'),
  block('Garoda Beach in Watamu, consistently. Its cove shape and the angle of the reef in front of it mean it stays close to clean even in the weeks when the exposed beaches nearby are covered. Short Beach in Watamu and Bofa Beach in Kilifi are the next best on the north coast, and Galu is the pick on the south coast.'),

  block('Does seaweed stop you swimming in Kenya?', 'h3'),
  block('Very rarely. The band sits on the sand at the high water mark, not out in the swimming water, so the sea itself is usually clear. What changes is the walk from your towel to the water. Timing your swim for mid or low tide gives you clean wet sand to cross.'),

  block('Is there seaweed in Kenya in December and January?', 'h3'),
  block('Barely any. December to March is the Kaskazi, the calm northeast monsoon, and it produces the clearest water and cleanest sand of the year. This is also peak season, so accommodation books out months ahead and prices are at their highest.'),

  /* ── Close ──────────────────────────────────────────────── */
  block('The bottom line', 'h2'),

  block('Seaweed is the most over researched and least understood thing about the Kenya coast. It is seasonal, it is local, it is harmless, and it is wildly variable between beaches that are a short walk apart. The travellers who have a bad time with it are almost always the ones who booked an exposed beach in August without asking anyone first. The ones who have a great time booked a cove, learned the tide, and got low season prices on one of the most beautiful coastlines in the world.'),

  rich([
    { text: 'Planning around it? Start with the ' },
    { text: 'complete Watamu guide', link: J.watamu },
    { text: ', the ' },
    { text: 'Kilifi guide', link: J.kilifi },
    { text: ' or the ' },
    { text: 'Diani guide', link: J.diani },
    { text: '. If you are coming for wind rather than sand, the Kusi months are covered in our ' },
    { text: 'Watamu kitesurfing guide', link: J.kite },
    { text: '. And when you get hungry, the ' },
    { text: 'best restaurants in Watamu', link: J.eats },
    { text: ' do not care what the tide is doing.' },
  ]),
]

/* ── Push ──────────────────────────────────────────────────────────── */

const doc = {
  _id: POST_ID,
  _type: 'blogPost',
  title: 'Seaweed on the Kenya Coast: An Honest Month by Month Guide (2026)',
  slug: { _type: 'slug', current: SLUG },
  status: 'published',
  author: { _type: 'reference', _ref: AUTHOR_ID },
  excerpt:
    'Seaweed on the Kenya coast is seasonal, local and harmless, and it is not Caribbean sargassum. When it peaks, which beaches stay clean, and how to plan around it.',
  coverImage: {
    _type: 'image',
    alt: 'Seaweed banked along the high water line on a Watamu beach with clear turquoise water beyond',
    asset: { _type: 'reference', _ref: IMG.seaweedLine },
  },
  primaryCategory: 'beaches_coast',
  subcategory: 'seasonal_guide',
  postType: 'guide',
  location: 'kenya_general',
  focusKeyword: 'seaweed kenya coast',
  keywords: ['seaweed', 'sargassum', 'kenya coast', 'kusi', 'kaskazi', 'watamu', 'diani', 'kilifi', 'best time to visit'],
  tags: ['beaches', 'seasons', 'travel tips', 'watamu', 'diani', 'kilifi'],
  readingTime: 9,
  publishedAt: '2026-08-17T08:00:00Z',
  seoTitle: 'Seaweed on the Kenya Coast: Month by Month Guide (2026)',
  seoDescription:
    'When is seaweed season in Kenya? It peaks in August and September with the Kusi monsoon. Which beaches stay clean, what it looks like, and how to plan around it.',
  relatedListings: [
    { _type: 'reference', _key: 'rl1', _ref: LISTING.garoda },
    { _type: 'reference', _key: 'rl2', _ref: LISTING.bofa },
    { _type: 'reference', _key: 'rl3', _ref: LISTING.shortBeach },
  ],
  body,
}

async function main() {
  const blocks = body.length
  const words = body
    .filter((b) => b._type === 'block')
    .flatMap((b) => (b.children ?? []).map((c: any) => c.text))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length

  const blockTypes = body.reduce<Record<string, number>>((acc, b) => {
    acc[b._type] = (acc[b._type] ?? 0) + 1
    return acc
  }, {})

  console.log(`📝 ${doc.title}`)
  console.log(`   /journal/${SLUG}`)
  console.log(`   ${blocks} body blocks · ~${words} words of prose`)
  console.log(`   block mix: ${Object.entries(blockTypes).map(([k, v]) => `${k.replace('Block', '')}×${v}`).join(', ')}`)

  if (DRY) {
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
