/**
 * Seed the "5 Best Boutique Hotels in Watamu 2026" blog post.
 *
 * Run locally (needs the Sanity WRITE token):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-best-boutique-hotels-watamu.ts
 *
 * Idempotent: createOrReplace with a fixed _id. Route: /journal/best-boutique-hotels-watamu
 *
 * House rules applied:
 *  - no dashes in prose
 *  - every internal link verified against live Sanity (listing slugs + blog slugs, Aug 2026)
 *  - local knowledge from the brief woven through as genuine local tips
 *  - gradient placeholder images after each main section, uploaded by this script.
 *    Swap them for real photos in Sanity Studio when you have them.
 *
 * Verified listing URLs used below:
 *   /stays/watamu/zuri-boutique-hotel-watamu          (Zuri Boutique Hotel)
 *   /stays/watamu/palm-garden-boutique-hotel-watamu   (Palm Garden Boutique Hotel)
 *   /stays/watamu/treehouse-watamu                    (Treehouse Watamu)
 *   /stays/watamu/rock-and-sea-watamu                 (Rock & Sea Bubble Eco Lodge)
 *   /experiences/watamu/kobe-suite-resort-restaurant  (Kobe Suite Resort Restaurant)
 *   /experiences/watamu/the-rock-and-sea-watamu       (The Rock and Sea restaurant)
 *   /services/watamu/spa-and-relax-palm-garden        (Spa and Relax at Palm Garden)
 * The Charming Lonno Lodge has no Klickenya listing yet, so it links to related guides only.
 */
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

const AUTHOR_ID = '0a5287ef-f74d-4893-a487-6b672cb63477'
const POST_ID = 'blog-best-boutique-hotels-watamu'

/* ── Listing ids (live, verified) ────────────────────────── */
const LISTING = {
  zuri: '3fVk255H0aipQzY5mJQoLw',
  palmGarden: '3fVk255H0aipQzY5mJQoVU',
  treehouse: '3fVk255H0aipQzY5mJQof2',
  rockAndSea: 'cH0KO5p7sKjW2U8ZdcrWPK',
  kobeRestaurant: 'U1j2mvjVVumuzihYzAnijQ',
}

/* ── Portable text helpers ───────────────────────────────── */
function key() {
  return Math.random().toString(36).slice(2, 12)
}
function block(text: string, style = 'normal'): any {
  return { _type: 'block', _key: key(), style, markDefs: [], children: [{ _type: 'span', _key: key(), text, marks: [] }] }
}
function rich(parts: Array<{ text: string; bold?: boolean; link?: string }>): any {
  const markDefs: any[] = []
  const children = parts.map((p) => {
    const marks: string[] = []
    if (p.bold) marks.push('strong')
    if (p.link) { const k = key(); markDefs.push({ _type: 'link', _key: k, href: p.link }); marks.push(k) }
    return { _type: 'span', _key: key(), text: p.text, marks }
  })
  return { _type: 'block', _key: key(), style: 'normal', markDefs, children }
}
function img(assetId: string, alt: string, caption?: string): any {
  return { _type: 'image', _key: key(), alt, ...(caption ? { caption } : {}), asset: { _type: 'reference', _ref: assetId } }
}
function quickFacts(items: Array<{ icon: string; label: string; value: string }>, accentColor = 'teal', title?: string): any {
  return { _type: 'quickFactsBlock', _key: key(), ...(title ? { title } : {}), accentColor, items: items.map((i) => ({ _type: 'object', _key: key(), ...i })) }
}
function tip(text: string, label = 'Klickenya local tip', variant = 'teal', icon = '📍'): any {
  return { _type: 'tipCardBlock', _key: key(), variant, icon, label, text }
}
function listingCard(refId: string, label?: string): any {
  return { _type: 'inlineListingBlock', _key: key(), ...(label ? { label } : {}), listing: { _type: 'reference', _ref: refId } }
}
function compareTable(columns: Array<{ label: string; color?: string }>, rows: Array<{ criterion: string; values: string[] }>): any {
  return {
    _type: 'compareTableBlock',
    _key: key(),
    columns: columns.map((c) => ({ _type: 'object', _key: key(), label: c.label, ...(c.color ? { color: c.color } : {}) })),
    rows: rows.map((r) => ({ _type: 'object', _key: key(), criterion: r.criterion, values: r.values })),
  }
}
function budgetTable(columns: string[], rows: Array<{ label: string; values: string[] }>): any {
  return { _type: 'budgetTableBlock', _key: key(), columns, rows: rows.map((r) => ({ _type: 'object', _key: key(), label: r.label, values: r.values })) }
}
function statRow(stats: Array<{ number: string; label: string }>): any {
  return { _type: 'statRowBlock', _key: key(), stats: stats.map((s) => ({ _type: 'object', _key: key(), ...s })) }
}
function whoIsItFor(title: string, items: Array<{ icon: string; text: string }>): any {
  return { _type: 'whoIsItForBlock', _key: key(), title, items: items.map((i) => ({ _type: 'object', _key: key(), ...i })) }
}
function verdictCard(v: { variant?: string; label: string; title: string; pros: string[]; cons: string[] }): any {
  return { _type: 'verdictCardBlock', _key: key(), variant: v.variant ?? 'teal', label: v.label, title: v.title, pros: v.pros, cons: v.cons }
}
function deciderGrid(cards: Array<{ label: string; color: string; title: string; items: string[] }>): any {
  return { _type: 'deciderGridBlock', _key: key(), cards: cards.map((c) => ({ _type: 'object', _key: key(), ...c })) }
}
function distanceChips(chips: Array<{ icon: string; label: string; value: string }>): any {
  return { _type: 'distanceChipsBlock', _key: key(), chips: chips.map((c) => ({ _type: 'object', _key: key(), ...c })) }
}
function pullQuote(text: string, accentColor = 'teal'): any {
  return { _type: 'pullQuoteBlock', _key: key(), text, accentColor }
}

/* ── Gradient placeholders ───────────────────────────────── */
/** Section placeholder art. Replace with real photography in Studio when available. */
const GRADIENTS: Record<string, [string, string, string]> = {
  cover: ['#6B2D8B', '#8B4DAB', '#E8A020'],
  zuri: ['#0F5F52', '#1E8E6A', '#9BD8A8'],
  kobe: ['#0B4F73', '#2E9BC4', '#8FD8E8'],
  lonno: ['#8B4A12', '#E8A020', '#F5D08A'],
  treehouse: ['#1F5B2E', '#4E9A54', '#8B4DAB'],
  palmGarden: ['#4A1E63', '#8B4DAB', '#E8A020'],
  rockAndSea: ['#062E52', '#1170A8', '#4FC3D9'],
  choosing: ['#6B2D8B', '#B06BC4', '#E8A020'],
}

function makeSvg(id: string, colors: [string, string, string]): string {
  const [a, b, c] = colors
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="g${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${a}"/>
      <stop offset="55%" style="stop-color:${b}"/>
      <stop offset="100%" style="stop-color:${c}"/>
    </linearGradient>
    <radialGradient id="r${id}" cx="78%" cy="18%" r="62%">
      <stop offset="0%" style="stop-color:${c};stop-opacity:0.35"/>
      <stop offset="100%" style="stop-color:${c};stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="s${id}" cx="18%" cy="82%" r="55%">
      <stop offset="0%" style="stop-color:${a};stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:${a};stop-opacity:0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#g${id})"/>
  <rect width="1600" height="900" fill="url(#r${id})"/>
  <rect width="1600" height="900" fill="url(#s${id})"/>
</svg>`
}

async function uploadGradients(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const [name, colors] of Object.entries(GRADIENTS)) {
    const svg = makeSvg(name, colors)
    const asset = await client.assets.upload('image', Buffer.from(svg), {
      filename: `boutique-hotels-watamu-${name}.svg`,
      contentType: 'image/svg+xml',
    })
    out[name] = asset._id
    console.log(`   uploaded placeholder: ${name}`)
  }
  return out
}

/* ── Body ────────────────────────────────────────────────── */
function buildBody(IMG: Record<string, string>): any[] {
  return [
    // ── Snippet bait intro ─────────────────────────────────
    block('Looking for the best boutique hotels in Watamu, Kenya? The short answer: Zuri for total privacy, tropical gardens and an emerald pool, Kobe Suite Resort for the food and a sandbank view you will not forget, The Charming Lonno Lodge for service and the tower room, Watamu Treehouse for nature, yoga and the best guided tours on the coast, and Palm Garden for a quiet adults only stay with fine dining and the best drinks list in town. Our bonus pick, Rock and Sea, is reached by private boat across Mida Creek and has the most beautiful setting of them all.'),

    block('In Watamu you are genuinely spoilt for choice when it comes to where you sleep. There are big resorts, dozens of villas for rent, and a handful of small boutique hotels that are the real reason people fall in love with this place and come back every year. Narrowing it down was difficult, and honestly there is no wrong answer here. But after a lot of nights, a lot of dinners and a lot of conversations with the people who run them, these are the five we send our own friends and family to, plus one bonus that is technically not even in Watamu.'),

    img(IMG.cover, 'Boutique hotel pool and tropical garden in Watamu, Kenya', 'Watamu is small, but its boutique hotels are some of the best on the Kenyan coast'),

    statRow([
      { number: '5', label: 'boutique hotels worth the trip' },
      { number: '6', label: 'suites at the smallest of them' },
      { number: '1', label: 'that you reach only by boat' },
    ]),

    // ── At a glance ────────────────────────────────────────
    block('The 5 Best Boutique Hotels in Watamu at a Glance', 'h2'),
    block('Every one of these is special for a different reason. Here is the quick version so you can match the hotel to the trip you actually want.'),
    budgetTable(
      ['Hotel', 'Best for', 'Setting', 'The thing that sets it apart'],
      [
        { label: 'Zuri Boutique Hotel', values: ['Privacy and romance', 'Beachfront, quiet stretch', 'Only 6 suites and incredible tropical gardens'] },
        { label: 'Kobe Suite Resort', values: ['Food and views', 'Garoda Beach', 'The cooking, and the sandbank at low tide'] },
        { label: 'The Charming Lonno Lodge', values: ['Service and comfort', 'Other side of Watamu', 'Tower room views and Swahili architecture'] },
        { label: 'Watamu Treehouse', values: ['Nature and wellness', 'Up in the forest canopy', 'Yoga, healthy food and the best guided tours'] },
        { label: 'Palm Garden Boutique Hotel', values: ['Peace and value', 'Garden setting, 1 km from Garoda', 'Adults only, fine dining and the best bar list'] },
        { label: 'Rock and Sea (bonus)', values: ['A once in a lifetime setting', 'Across Mida Creek, boat access', 'Sleeping in a bubble under the stars'] },
      ],
    ),
    tip('Watamu splits into two sides, and it matters more than most people realise when booking. Zuri, Kobe and Palm Garden sit on the Garoda side, where the beach is a wide stretch of white sand. Lonno and the Treehouse are on the other side of town, with different views and a different feel. Read our neighbourhood guide before you book so you know which Watamu you are getting.', 'Klickenya local tip', 'teal', '🗺️'),
    rich([
      { text: 'Not sure which part of town suits you? Our ' },
      { text: 'Watamu areas and neighbourhood guide', link: '/journal/watamu-areas-neighbourhood-guide' },
      { text: ' breaks down Garoda, Timboni, Turtle Bay and the rest, and our ' },
      { text: '7 best beaches in Watamu guide', link: '/journal/7-best-beaches-watamu-kenya' },
      { text: ' explains which beach each one sits on.' },
    ]),

    // ── 1. Zuri ────────────────────────────────────────────
    block('1. Zuri Boutique Hotel: the most private stay in Watamu', 'h2'),
    quickFacts([
      { icon: '🛏️', label: 'Size', value: 'Just 6 suites' },
      { icon: '🌿', label: 'Setting', value: 'Tropical gardens and a 20 metre pool' },
      { icon: '🏖️', label: 'Beach', value: 'One of the quietest stretches in Watamu' },
      { icon: '🪁', label: 'On site', value: 'Kitesurfing school and a restaurant open to all' },
    ], 'teal', '✦ Zuri at a glance'),
    block('Zuri is our idea of a hidden gem, and it is the one we recommend most often to couples. The whole property is only six suites, which means you are never queuing for a sunbed, never sharing your breakfast with a tour group and never really seeing anyone you did not arrive with. It sits on one of the most quiet, private and genuinely beautiful stretches of beach in Watamu, the kind where you walk out in the morning and there are no footprints yet.'),
    block('What people talk about afterwards, though, is the garden. Zuri has put serious care into its tropical planting, and it has grown into something you wander through rather than walk past. There is even a greenhouse producing vegetables for the kitchen, which tells you most of what you need to know about how they think about food here. In the middle of it all sits a long emerald pool, twenty metres of it, framed by green on every side. It is a properly beautiful piece of design and it photographs like a dream, but more importantly it is lovely to actually be in.'),
    block('The food is excellent, and the restaurant is open to the public, so you can book a table even if you are staying elsewhere. There is also a kitesurfing school on site, which makes it a rare combination: a hotel calm enough for a honeymoon that also gets you onto the water in the afternoon.'),
    tip('Zuri has six suites and a loyal following, so it books out early, especially over Christmas, New Year and the August peak. If you check and there is a room free on your dates, take it. That is not a sales line, that is just how it goes here.', 'Klickenya local tip', 'tip', '🔑'),
    rich([
      { text: 'Zuri sits close to some of the flattest, cleanest water on the coast, which is exactly why the kite school is here. If you are thinking about learning, our ' },
      { text: 'kitesurfing in Watamu guide', link: '/journal/kitesurfing-watamu-guide' },
      { text: ' covers the wind seasons, the spots and what a course actually costs.' },
    ]),
    whoIsItFor('🎯 Zuri is perfect for', [
      { icon: '💑', text: 'Couples and honeymooners who want to be left alone' },
      { icon: '🌿', text: 'Anyone who cares about gardens, design and quiet' },
      { icon: '🪁', text: 'Kitesurfers who want the school on the doorstep' },
      { icon: '🍽️', text: 'Food lovers, including non guests booking dinner' },
    ]),
    listingCard(LISTING.zuri, 'See Zuri Boutique Hotel on Klickenya'),
    img(IMG.zuri, 'Emerald swimming pool surrounded by tropical gardens at Zuri Boutique Hotel, Watamu', 'Zuri: six suites, deep green gardens and a twenty metre emerald pool'),

    // ── 2. Kobe ────────────────────────────────────────────
    block('2. Kobe Suite Resort: the best food and the sandbank view', 'h2'),
    quickFacts([
      { icon: '🍽️', label: 'Known for', value: 'Seriously good food' },
      { icon: '🏝️', label: 'View', value: 'Straight out to the Garoda sandbank' },
      { icon: '🛏️', label: 'Rooms', value: 'More room options than the others' },
      { icon: '💑', label: 'Feel', value: 'Romantic, comfortable, a little more social' },
    ], 'blue', '✦ Kobe at a glance'),
    block('If you ask people in Watamu where to eat well, Kobe comes up within about ten seconds. The kitchen is Italian at heart with a lot of fresh fish, and it is consistently one of the best meals on this coast. The octopus has something of a cult following, and if you are a group ordering seafood you tend to get more than you bargained for. It is the sort of place where you sit down for lunch and quietly cancel your afternoon plans.'),
    rich([
      { text: 'The setting earns its reputation too. Kobe sits directly on ' },
      { text: 'Garoda Beach', link: '/journal/7-best-beaches-watamu-kenya' },
      { text: ', which is the widest and cleanest stretch of white sand in Watamu, and at low tide the sandbank emerges in front of you and the whole view changes into something almost unreal. You can walk straight out onto it from your sunbed. Garoda also stays close to seaweed free through the Kusi months when other beaches collect sargassum, so it is the safe bet if you are travelling between June and October.' },
    ]),
    block('Compared to Zuri it is bigger and a little less hidden away, and there are more room types to choose from, which helps if you are travelling as a family or a group of friends rather than a couple. The rooms are comfortable and generous, the service is warm, and the whole thing feels romantic without being precious about it. The restaurant is open to the public, so book a table even if you are sleeping elsewhere.'),
    tip('Go for lunch on a falling tide. You eat with the sandbank appearing in front of you, then walk straight out onto it afterwards. Check a Watamu tide chart the night before and book your table for about an hour before low tide.', 'Klickenya local tip', 'tip', '🌊'),
    listingCard(LISTING.kobeRestaurant, 'Book a table at Kobe Suite Resort Restaurant'),
    rich([
      { text: 'Kobe features in our ' },
      { text: 'best restaurants in Watamu guide', link: '/journal/best-restaurants-watamu-kenya' },
      { text: ' alongside the rest of the food scene, and if you want a sundowner afterwards our ' },
      { text: 'Watamu sunset spots guide', link: '/journal/watamu-sunset-spots-guide' },
      { text: ' has the places locals actually go.' },
    ]),
    img(IMG.kobe, 'View of the Garoda Beach sandbank at low tide from Kobe Suite Resort, Watamu', 'Kobe looks straight out at the Garoda sandbank, which appears at low tide'),

    // ── 3. Lonno ───────────────────────────────────────────
    block('3. The Charming Lonno Lodge: service, architecture and the tower room', 'h2'),
    quickFacts([
      { icon: '⭐', label: 'Known for', value: 'Service people write home about' },
      { icon: '🏛️', label: 'Design', value: 'Swahili influenced architecture' },
      { icon: '🔭', label: 'The room to ask for', value: 'The tower room' },
      { icon: '📍', label: 'Location', value: 'The other side of Watamu' },
    ], 'amber', '✦ Lonno at a glance'),
    block('Lonno is small, around eight rooms, and it has built its reputation on something that is very hard to fake: how well it looks after people. Guests come back year after year and talk about the hosts before they talk about the rooms, which in a town full of beautiful properties is a real differentiator. If your idea of a good holiday involves someone remembering how you take your coffee, this is your place.'),
    block('The building itself is worth the visit. It is built with a strong Swahili influence, all carved detail, cool interiors and thick walls that keep the heat out, and it feels like it belongs on this coast rather than being dropped onto it. The tower room is the one everyone talks about. It sits at the top of the property and the ocean views from it are the kind you sit and stare at for an hour without noticing. If it is available, pay the difference.'),
    block('Being honest, and this is the sort of thing most guides will not tell you: the beach on this side of Watamu is not as good as the Garoda side. Zuri and Kobe have that wide stretch of white sand at the front, and Lonno does not. What it does have is spectacular ocean views, a very peaceful setting and privacy, so it is a trade rather than a loss. If your priority is walking straight onto a big beach every morning, book Garoda side. If it is service, views and coming back to somewhere calm, Lonno is excellent. There is also a helipad, if you happen to be arriving that way.'),
    tip('Ask for the tower room when you book, not on arrival. It is one room, everybody wants it, and it goes first. If it is gone on your dates, ask which room has the best ocean view and take that instead.', 'Klickenya local tip', 'tip', '🔭'),
    rich([
      { text: 'Lonno does not have a Klickenya listing yet, so book direct with the lodge. To understand how its side of town compares to Garoda before you commit, read our ' },
      { text: 'Watamu areas and neighbourhood guide', link: '/journal/watamu-areas-neighbourhood-guide' },
      { text: ', or browse everything we do list in ' },
      { text: 'Watamu stays', link: '/stays/watamu' },
      { text: '.' },
    ]),
    img(IMG.lonno, 'Swahili influenced architecture and ocean view from a tower room in Watamu, Kenya', 'Lonno is known for its service, its Swahili architecture and the view from the tower room'),

    // ── 4. Treehouse ───────────────────────────────────────
    block('4. Watamu Treehouse: nature, yoga and the best tours on the coast', 'h2'),
    quickFacts([
      { icon: '🌳', label: 'Setting', value: 'Two towers built among standing trees' },
      { icon: '🎨', label: 'Design', value: 'Recycled stained glass throughout' },
      { icon: '🧘', label: 'Wellness', value: 'Yoga and meditation most days, open to all' },
      { icon: '🧭', label: 'The differentiator', value: 'Exceptionally well run nature tours' },
    ], 'purple', '✦ Treehouse at a glance'),
    block('The Treehouse is not like anywhere else in Kenya, let alone Watamu. It is two white towers rising out of the forest, built on a property where they did not cut the trees down, so you climb up into the canopy rather than looking at it from a lawn. Panels of coloured recycled glass are set into the walls by the artist Nani Croze, so the light moves through the rooms in a completely different way as the day goes on. Every room is different, there are little corners and terraces everywhere to disappear into, and the sea breeze runs right through the whole building. It is one of the most peaceful places to sleep on this coast.'),
    block('The food is clean, fresh and genuinely healthy, the kind of cooking that makes you feel better after a week rather than heavier. The service is warm and personal, and the host is a big part of why people love it. There is a yoga and meditation space with views over the ocean on one side and the forest and creek on the other, and classes run most days. Both the yoga and the restaurant are open to the public, so you can drop in even if you are staying somewhere else.'),
    block('The thing we would really book it for, though, is the tours. The Treehouse runs the best organised nature and adventure trips in the area by some distance. The guides are excellent and actually know what they are looking at, everything runs on time, and the snacks and drinks are properly thought through rather than an afterthought. If you want to see Mida Creek, the mangroves and the forest with someone who can explain what you are seeing, this is the operator to go with. That alone is a reason to stay here.'),
    tip('You do not have to be a guest to join. Yoga classes and the restaurant are open to the public, so if you are staying elsewhere in Watamu you can still come up for a sunset class and dinner. Book ahead, the space is small.', 'Klickenya local tip', 'tip', '🧘'),
    whoIsItFor('🎯 The Treehouse is perfect for', [
      { icon: '🌿', text: 'Nature lovers and anyone who wants to switch off properly' },
      { icon: '🧘', text: 'Yoga, wellness and retreat travellers' },
      { icon: '🧭', text: 'People who want real guided tours, not a boat and a shrug' },
      { icon: '🎨', text: 'Anyone who appreciates unusual, handmade architecture' },
    ]),
    listingCard(LISTING.treehouse, 'See Treehouse Watamu on Klickenya'),
    img(IMG.treehouse, 'Stained glass and treetop terrace at Watamu Treehouse in the coastal forest, Kenya', 'The Treehouse: two towers in the canopy, coloured glass and a lot of sea breeze'),

    // ── 5. Palm Garden ─────────────────────────────────────
    block('5. Palm Garden Boutique Hotel: the quiet, adults only one', 'h2'),
    quickFacts([
      { icon: '🌴', label: 'Setting', value: 'Garden and pool, 1 km from Garoda Beach' },
      { icon: '🔞', label: 'Policy', value: 'No children under 12' },
      { icon: '🍷', label: 'Known for', value: 'The best wine and spirits list in Watamu' },
      { icon: '💆', label: 'New', value: 'A spa on site' },
    ], 'purple', '✦ Palm Garden at a glance'),
    block('Palm Garden is the one on this list that most people can actually afford without thinking about it too hard, and that is exactly why we like it. It is an eco boutique hotel, it is not beachfront, and it sits about a kilometre back from Garoda Beach. In exchange for that walk you get a lovely property at a much friendlier price, and a level of peace the beachfront places cannot match. With no children under twelve, it is very quiet by design.'),
    block('The layout is built around a pool in the middle, with hanging beds and big loungers set around it under the palms. It is a very aesthetic space and it photographs beautifully, but it is also just a genuinely nice place to spend an afternoon doing nothing. They recently opened a spa on the property, which makes it easy to never leave for a whole day.'),
    block('The other reason to go is the drinking and eating. The restaurant is fine dining and it is very good, but the bar is the real surprise: Palm Garden has the most extensive wine and liquor list in Watamu, by a distance. The cocktails are excellent, the quality of the spirits is a level above what you will find elsewhere in town, and there is a cigar bar too. If you care about a proper drink after dinner, this is the address.'),
    tip('You do not need to be staying here to drink here. Locals treat the Palm Garden bar as the place for a serious cocktail or a good glass of wine, especially after dinner. It is about a kilometre from Garoda, so grab a tuk-tuk rather than walking it in the dark.', 'Klickenya local tip', 'tip', '🍸'),
    rich([
      { text: 'The on site spa is bookable through Klickenya as well: see ' },
      { text: 'Spa and Relax at Palm Garden', link: '/services/watamu/spa-and-relax-palm-garden' },
      { text: '. For where else to drink in the evening, our ' },
      { text: 'Watamu nightlife guide', link: '/journal/watamu-nightlife-guide' },
      { text: ' has the full picture.' },
    ]),
    verdictCard({
      variant: 'purple',
      label: 'Our verdict',
      title: 'Palm Garden: the best value on this list',
      pros: [
        'The most accessible price of the five',
        'Adults only, so genuinely quiet',
        'Best wine, spirits and cocktail list in Watamu',
        'Fine dining restaurant, spa and a beautiful pool area',
      ],
      cons: [
        'Not beachfront, about 1 km from Garoda Beach',
        'No children under 12, so not an option for families',
      ],
    }),
    listingCard(LISTING.palmGarden, 'See Palm Garden Boutique Hotel on Klickenya'),
    img(IMG.palmGarden, 'Pool with hanging beds and palm trees at Palm Garden Boutique Hotel, Watamu', 'Palm Garden: hanging beds, big loungers and the best bar list in town'),

    // ── Bonus: Rock and Sea ────────────────────────────────
    block('Bonus: Rock and Sea, the one you reach by boat', 'h2'),
    quickFacts([
      { icon: '⛵', label: 'Access', value: 'Private boat across Mida Creek' },
      { icon: '🫧', label: 'Signature', value: 'Sleeping in a bubble under the stars' },
      { icon: '🌊', label: 'Setting', value: 'Coral cliff at the mouth of Mida Creek' },
      { icon: '🌳', label: 'Around you', value: 'Beach, mangroves and nothing else' },
    ], 'blue', '✦ Rock and Sea at a glance'),
    block('Rock and Sea is not technically in Watamu, which is the only reason it is a bonus rather than number one. It sits across Mida Creek, and they come and collect you by private boat, which means the journey there is already part of the experience. What you arrive at is genuinely one of the most beautiful settings in Kenya: a coral cliff at the mouth of the creek, with the shades of blue and turquoise below you shifting through the day as the tide moves. Photographs do not really do it.'),
    block('You are completely surrounded by nature here. There is beach, there are mangroves, there are monkeys, and there is very little else, which is the whole point. The design is beautiful and thoughtful, and the signature rooms are transparent bubbles, so you can lie in bed and sleep under the stars with the creek in front of you. It is a genuinely unique thing to do, and the sort of night people remember for years.'),
    tip('Even if you are not staying, book the boat transfer at low tide and go across for lunch. It is one of the best half days you can have on this coast and you will not regret it. Ask them to time the crossing with the tide, it makes a real difference to the water colour.', 'Klickenya local tip', 'tip', '⛵'),
    rich([
      { text: 'You can book the stay as ' },
      { text: 'Rock and Sea Bubble Eco Lodge', link: '/stays/watamu/rock-and-sea-watamu' },
      { text: ', or just the meal at ' },
      { text: 'The Rock and Sea restaurant', link: '/experiences/watamu/the-rock-and-sea-watamu' },
      { text: '.' },
    ]),
    listingCard(LISTING.rockAndSea, 'See Rock and Sea Bubble Eco Lodge on Klickenya'),
    img(IMG.rockAndSea, 'Turquoise water at the mouth of Mida Creek seen from Rock and Sea, Watamu, Kenya', 'Rock and Sea sits above the mouth of Mida Creek, reached by private boat'),

    // ── How to choose ──────────────────────────────────────
    block('How to choose between them', 'h2'),
    block('All six are worth your money. The question is what kind of week you are after, so here is the honest decision tree we use when friends ask.'),
    deciderGrid([
      { label: 'Privacy', color: 'teal', title: 'Book Zuri', items: ['You want to see almost nobody', 'Gardens and design matter to you', 'Honeymoon or a big anniversary', 'You might want to try kitesurfing'] },
      { label: 'Food', color: 'blue', title: 'Book Kobe', items: ['You plan holidays around meals', 'You want the sandbank in front of you', 'You need more than one room type', 'Travelling June to October'] },
      { label: 'Service', color: 'amber', title: 'Book Lonno', items: ['Being looked after is the whole point', 'You want the tower room view', 'You love Swahili architecture', 'The beach is not your top priority'] },
      { label: 'Nature', color: 'green', title: 'Book the Treehouse', items: ['You want yoga and real quiet', 'You want proper guided tours', 'Healthy food matters to you', 'You like unusual buildings'] },
      { label: 'Value', color: 'purple', title: 'Book Palm Garden', items: ['You want boutique without the beachfront price', 'Adults only suits you', 'You care about a good drink', 'You want a spa on site'] },
      { label: 'Wow', color: 'red', title: 'Book Rock and Sea', items: ['You want the most beautiful setting', 'Sleeping under the stars appeals', 'You do not mind arriving by boat', 'One or two nights, not a week'] },
    ]),
    compareTable(
      [{ label: 'Zuri', color: 'teal' }, { label: 'Kobe', color: 'blue' }, { label: 'Palm Garden', color: 'purple' }],
      [
        { criterion: 'Beachfront', values: ['Yes, very quiet stretch', 'Yes, on Garoda', 'No, about 1 km back'] },
        { criterion: 'Size and privacy', values: ['6 suites, most private', 'Larger, more social', 'Small and very quiet'] },
        { criterion: 'Food', values: ['Excellent, garden grown', 'The best on this list', 'Fine dining and the best bar'] },
        { criterion: 'Children', values: ['Better suited to couples', 'Works for families', 'None under 12'] },
        { criterion: 'Price feel', values: ['Top end', 'Top end', 'The most accessible'] },
      ],
    ),
    img(IMG.choosing, 'Palm trees and boutique hotel terrace at golden hour in Watamu, Kenya', 'Whichever you pick, book early: these are small properties with loyal returning guests'),

    // ── When to book ───────────────────────────────────────
    block('When to book, and how far ahead', 'h2'),
    block('These are small hotels. Zuri has six suites, Lonno has around eight rooms and the Treehouse has seven across its two towers, so a single family booking can take out half a property. That changes the booking maths completely compared to a big resort.'),
    budgetTable(
      ['Season', 'Months', 'What it is like', 'Book ahead by'],
      [
        { label: 'Kaskazi, the high season', values: ['December to March', 'Clearest water, hottest, busiest, best beach conditions', '3 to 6 months'] },
        { label: 'Long rains', values: ['April to June', 'Quietest and cheapest, some places close', '3 to 4 weeks'] },
        { label: 'Kusi', values: ['June to October', 'Cooler and windier, more seaweed on exposed beaches, great for kitesurfing', '1 to 2 months'] },
        { label: 'August peak', values: ['August', 'Second high season, Italian and Kenyan holidays overlap', '3 to 4 months'] },
      ],
    ),
    tip('If you are travelling in the Kusi months from June to October and the beach matters to you, book on the Garoda side. Garoda stays close to seaweed free while the exposed beaches collect sargassum, which is why Zuri, Kobe and Palm Garden are the safer picks in those months.', 'Klickenya local tip', 'warning', '⚠️'),
    rich([
      { text: 'For the full season by season breakdown, including water temperature, rain and what closes when, read our ' },
      { text: 'best time to visit Watamu guide', link: '/journal/best-time-to-visit-watamu' },
      { text: '.' },
    ]),

    // ── Getting there ──────────────────────────────────────
    block('Getting to your hotel', 'h2'),
    distanceChips([
      { icon: '✈️', label: 'Malindi airport', value: 'About 30 minutes' },
      { icon: '🛬', label: 'Mombasa airport', value: 'About 2 hours' },
      { icon: '🛺', label: 'Around Watamu', value: 'Tuk-tuk, agree the fare first' },
      { icon: '⛵', label: 'Rock and Sea', value: 'Private boat across Mida Creek' },
    ]),
    rich([
      { text: 'Most of these hotels will arrange an airport transfer if you ask when you book, and it is usually worth taking. Within Watamu, tuk-tuks are the normal way to move around and you should agree the fare before you set off. Rock and Sea is the exception: you arrange the boat with them directly, and you want to time it with the tide. Our ' },
      { text: 'Watamu transport guide', link: '/journal/watamu-transport-guide' },
      { text: ' has current fares, routes and flight options.' },
    ]),

    // ── FAQ ────────────────────────────────────────────────
    block('Best boutique hotels in Watamu: your questions answered', 'h2'),
    block('What is the best boutique hotel in Watamu?', 'h3'),
    block('It depends on what you want, but Zuri Boutique Hotel is our overall pick for most travellers. With only six suites, deep tropical gardens, a twenty metre pool and a position on one of the quietest beaches in Watamu, it is the most private and the most complete of the small hotels. If food is your priority, choose Kobe Suite Resort instead. If price matters, choose Palm Garden.'),
    block('Which Watamu boutique hotel has the best food?', 'h3'),
    block('Kobe Suite Resort. The kitchen is Italian led with a lot of very fresh fish, the octopus has a following, and the restaurant is open to non guests, so you can book a table even if you are sleeping elsewhere. Zuri and Palm Garden are both excellent too, and Palm Garden has the best wine, spirits and cocktail list in Watamu.'),
    block('Are Watamu boutique hotels good for families?', 'h3'),
    block('Some are and some are not. Kobe Suite Resort has the widest choice of room types and works well for families. Palm Garden does not accept children under twelve. Zuri is small and suits couples better, and the Treehouse involves stairs and elevated walkways, so it is not ideal for very young children. Ask before you book.'),
    block('Which Watamu hotels are actually on the beach?', 'h3'),
    block('Zuri and Kobe Suite Resort are beachfront on the Garoda side, which has the widest stretch of white sand. Lonno is on the other side of Watamu with ocean views but a less impressive beach. Palm Garden sits about a kilometre back from Garoda Beach. Rock and Sea is across Mida Creek with its own beach and mangroves.'),
    block('Can you eat at these hotels if you are not staying there?', 'h3'),
    block('Yes, at most of them. Zuri, Kobe, the Treehouse, Palm Garden and Rock and Sea all open their restaurants to the public. The Treehouse also opens its yoga classes to non guests, and Palm Garden opens its bar and spa. Book ahead, because these are small kitchens.'),
    block('How far in advance should I book a boutique hotel in Watamu?', 'h3'),
    block('For December to March, book three to six months ahead. For August, three to four months. These properties have between six and eight rooms each, so they sell out far earlier than the big resorts. In the April to June low season you can often book a few weeks out.'),
    block('Is Rock and Sea in Watamu?', 'h3'),
    block('Not quite. It sits across Mida Creek from Watamu and you reach it by private boat, which they arrange. It is close enough to visit for lunch on a day trip and beautiful enough that we include it on every Watamu list anyway.'),
    block('What is the cheapest boutique hotel in Watamu?', 'h3'),
    block('Of this list, Palm Garden Boutique Hotel is the most accessible on price. It is not beachfront, which is the main reason, but you get a pool, gardens, a spa, a fine dining restaurant and a very quiet adults only setting a kilometre from Garoda Beach.'),

    // ── Close ──────────────────────────────────────────────
    pullQuote('Watamu does not do big and anonymous well. What it does brilliantly is small: six suites in a garden, seven rooms in a treehouse, a table on the sand as the tide goes out. Book early, and pick the one that matches the week you actually want.', 'teal'),
    rich([
      { text: 'Ready to book? Browse all ' },
      { text: 'Watamu stays', link: '/stays/watamu' },
      { text: ' on Klickenya, find ' },
      { text: 'things to do in Watamu', link: '/experiences/watamu' },
      { text: ', and read our ' },
      { text: 'complete guide to Watamu', link: '/journal/complete-guide-watamu-kenya-2026' },
      { text: ' before you pack.' },
    ]),
  ]
}

/* ── Main ────────────────────────────────────────────────── */
async function main() {
  console.log('🏨 Seeding blog post: 5 Best Boutique Hotels in Watamu 2026\n')

  console.log('   uploading gradient placeholders...')
  const IMG = await uploadGradients()

  const doc = {
    _id: POST_ID,
    _type: 'blogPost',
    title: 'The 5 Best Boutique Hotels in Watamu, Kenya (2026): A Local Guide to Where to Actually Stay',
    slug: { _type: 'slug', current: 'best-boutique-hotels-watamu' },
    status: 'published',
    author: { _type: 'reference', _ref: AUTHOR_ID },
    primaryCategory: 'where_to_stay',
    subcategory: 'hotel_review',
    postType: 'listicle',
    location: 'watamu',
    series: 'Where to Stay in Watamu',
    focusKeyword: 'best boutique hotels in watamu',
    seoTitle: 'The 5 Best Boutique Hotels in Watamu, Kenya (2026)',
    seoDescription:
      'The 5 best boutique hotels in Watamu, Kenya, chosen by locals: Zuri, Kobe Suite Resort, Lonno Lodge, Watamu Treehouse and Palm Garden, plus Rock and Sea across Mida Creek.',
    excerpt:
      'A local 2026 guide to the best boutique hotels in Watamu, Kenya. Zuri for privacy and gardens, Kobe for food and the sandbank, Lonno for service, the Treehouse for nature and yoga, Palm Garden for value, plus Rock and Sea as the bonus you reach by boat.',
    readingTime: 11,
    publishedAt: '2026-08-15T08:00:00Z',
    keywords: [
      'best boutique hotels in watamu',
      'watamu boutique hotels',
      'where to stay in watamu',
      'watamu hotels kenya',
      'zuri boutique hotel watamu',
      'kobe suite resort watamu',
      'the charming lonno lodge',
      'watamu treehouse',
      'palm garden boutique hotel watamu',
      'rock and sea watamu',
      'best hotels watamu kenya 2026',
      'romantic hotels watamu',
    ],
    tags: ['Watamu', 'Where to Stay', 'Boutique Hotels', 'Kenya', 'Travel Guide', 'Coast'],
    relatedListings: [
      { _type: 'reference', _key: key(), _ref: LISTING.zuri },
      { _type: 'reference', _key: key(), _ref: LISTING.palmGarden },
      { _type: 'reference', _key: key(), _ref: LISTING.treehouse },
    ],
    coverImage: {
      _type: 'image',
      alt: 'Boutique hotel pool and tropical garden in Watamu, Kenya',
      asset: { _type: 'reference', _ref: IMG.cover },
    },
    body: buildBody(IMG),
  }

  await client.createOrReplace(doc)
  console.log('\n✅ Published: /journal/best-boutique-hotels-watamu')
  console.log('   (Allow up to 60s for the site revalidate to reflect it.)')
  console.log('   Next: swap the gradient placeholders for real photos in Sanity Studio.')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
