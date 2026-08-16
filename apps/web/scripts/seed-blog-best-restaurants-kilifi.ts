/**
 * Seed the "15 Best Restaurants in Kilifi 2026" blog post.
 *
 * Run locally (needs the Sanity WRITE token):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/republish-kilifi-restaurants.ts   # FIRST
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-best-restaurants-kilifi.ts
 *
 * Idempotent: createOrReplace with a fixed _id. Route: /journal/best-restaurants-kilifi
 *
 * IMPORTANT: run republish-kilifi-restaurants.ts first. Every Kilifi listing in Sanity is
 * currently archived, and archived listings are excluded from generateStaticParams, so the
 * 9 listing links in this post will 404 until that script has been run.
 *
 * House rules applied:
 *  - no dashes in prose
 *  - every internal link verified against live Sanity (Aug 2026)
 *  - price shown as bands only (Budget / Mid range / High end), never invented figures
 *  - positive about every venue, honest about what each one is for
 *  - gradient placeholder images after each main section, uploaded by this script
 *
 * Uses the new `filterableListBlock` (added alongside this post) to give readers two filter
 * chips: waterfront places and local food.
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
const POST_ID = 'blog-best-restaurants-kilifi'

/* ── Listing ids (republished by republish-kilifi-restaurants.ts) ── */
const LISTING = {
  tribalTable: 'tribal-table',
  indigoVibe: 'indigo-vibe-cafe-kilifi',
  saltysCreek: 'saltys-on-the-creek-kilifi',
  saltysBofa: 'saltys-beach-bar-kilifi',
  twistedFig: 'the-twisted-fig-kilifi',
  foodMovement: 'the-food-movement-kilifi',
  boatyard: 'kilifi-boatyard',
  villageDishes: 'village-dishes-kilifi',
  mnarani: 'mnarani-beach-club-kilifi',
}
const url = (slug: string) => `/experiences/kilifi/${slug}`

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
function budgetTable(columns: string[], rows: Array<{ label: string; values: string[] }>): any {
  return { _type: 'budgetTableBlock', _key: key(), columns, rows: rows.map((r) => ({ _type: 'object', _key: key(), label: r.label, values: r.values })) }
}
function statRow(stats: Array<{ number: string; label: string }>): any {
  return { _type: 'statRowBlock', _key: key(), stats: stats.map((s) => ({ _type: 'object', _key: key(), ...s })) }
}
function deciderGrid(cards: Array<{ label: string; color: string; title: string; items: string[] }>): any {
  return { _type: 'deciderGridBlock', _key: key(), cards: cards.map((c) => ({ _type: 'object', _key: key(), ...c })) }
}
function whoIsItFor(title: string, items: Array<{ icon: string; text: string }>): any {
  return { _type: 'whoIsItForBlock', _key: key(), title, items: items.map((i) => ({ _type: 'object', _key: key(), ...i })) }
}
function pullQuote(text: string, accentColor = 'teal'): any {
  return { _type: 'pullQuoteBlock', _key: key(), text, accentColor }
}
function filterableList(v: {
  title: string
  intro: string
  allLabel?: string
  filters: Array<{ label: string; value: string; icon?: string; color?: string }>
  items: Array<{ name: string; tags?: string[]; priceBand?: string; blurb?: string; href?: string }>
}): any {
  return {
    _type: 'filterableListBlock',
    _key: key(),
    title: v.title,
    intro: v.intro,
    allLabel: v.allLabel ?? 'All',
    filters: v.filters.map((f) => ({ _type: 'object', _key: key(), ...f })),
    items: v.items.map((i) => ({ _type: 'object', _key: key(), ...i })),
  }
}

/* ── Gradient placeholders ───────────────────────────────── */
const GRADIENTS: Record<string, [string, string, string]> = {
  cover: ['#6B2D8B', '#B0562A', '#E8A020'],
  newWave: ['#0F5F52', '#2FA98A', '#E8C070'],
  waterfront: ['#0B4F73', '#2E9BC4', '#9BE8E0'],
  fineDining: ['#4A1E63', '#8B4DAB', '#E8A020'],
  classics: ['#7A3B12', '#C47A24', '#F0D08A'],
  localFood: ['#1F5B2E', '#6BA02E', '#E8C838'],
  choosing: ['#5A2470', '#A8562A', '#E8A020'],
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
    const asset = await client.assets.upload('image', Buffer.from(makeSvg(name, colors)), {
      filename: `best-restaurants-kilifi-${name}.svg`,
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
    block('Looking for the best restaurants in Kilifi, Kenya? The short answer: Tribal Table on Bofa Beach for an elegant dinner, Asian Kitchen on the cliffs for the noodles and sushi nobody else in town does, Indigo Vibe for coffee and pastries in air conditioning, Salty\'s on the Creek for sunset seafood, Salt and Smoke for steak, The Twisted Fig for the view over the valley, The Boatyard for crab samosas, and Village Dishes for the cheapest and best local food and fresh juice in Kilifi. Fifteen places, all of them worth your time.'),

    block('Kilifi was limited for restaurants for a long time. Locals will tell you the same thing: the good places were good, but you could count them, and you worked your way round the same rotation. That has changed. Quite a few new spots have arrived recently and the whole scene has more energy than it has had in years, with more choice for residents and for anyone passing through. The places that have been here a while are still excellent, and the new arrivals have raised the ceiling. It is still growing, which is the exciting part.'),

    rich([
      { text: 'The newest additions are ' },
      { text: 'Asian Kitchen, Tribal Table and Non Solo Gelato', bold: true },
      { text: ', all of which have landed in the last stretch and all of which have found an audience fast. This is our honest, local list of the fifteen best places to eat in Kilifi right now, from elevated dinners on the beach to a shawarma that costs almost nothing. For the wider picture of the town, read our ' },
      { text: 'complete guide to Kilifi', link: '/journal/complete-guide-kilifi-kenya-2026' },
      { text: '.' },
    ]),

    img(IMG.cover, 'Restaurant table with coastal food and ocean view in Kilifi, Kenya', 'Kilifi\'s food scene has more going on right now than at any point in the last decade'),

    statRow([
      { number: '15', label: 'places genuinely worth eating at' },
      { number: '3', label: 'brand new arrivals this year' },
      { number: '7', label: 'of them on the water' },
    ]),

    // ── FILTER BLOCK ───────────────────────────────────────
    block('Find your Kilifi restaurant', 'h2'),
    filterableList({
      title: 'Filter the list',
      intro: 'Press a filter to narrow the list. Waterfront covers everywhere on the beach, the cliffs or the creek. Local food covers the Swahili and Kenyan spots where you eat very well for very little.',
      allLabel: 'All',
      filters: [
        { label: 'Waterfront', value: 'waterfront', icon: '🌊', color: 'blue' },
        { label: 'Local food', value: 'local', icon: '🍛', color: 'green' },
      ],
      items: [
        { name: 'Tribal Table', tags: ['waterfront'], priceBand: 'High end', blurb: 'Elegant dining on Bofa Beach with excellent cocktails and a crab burger worth ordering.', href: url(LISTING.tribalTable) },
        { name: 'Asian Kitchen', tags: ['waterfront'], priceBand: 'Mid range', blurb: 'Noodles, sushi and more on a dramatic clifftop, the only Asian food in Kilifi.' },
        { name: 'Indigo Vibe', priceBand: 'Budget', blurb: 'New cafe doing very good bread, pastries and coffee, with air conditioning and cocktails.', href: url(LISTING.indigoVibe) },
        { name: "Salty's on the Creek", tags: ['waterfront'], priceBand: 'High end', blurb: 'Seafood and cocktails in a stunning creekside setting. The best sunset on this list.', href: url(LISTING.saltysCreek) },
        { name: "Salty's Beach Bar, Bofa", tags: ['waterfront'], priceBand: 'Mid range', blurb: 'Laid back beachfront with a menu that changes daily. Reliably good.', href: url(LISTING.saltysBofa) },
        { name: 'Salt and Smoke', priceBand: 'High end', blurb: 'Spanish and Argentinian fire cooking. High quality meat, properly done.' },
        { name: 'The Twisted Fig', priceBand: 'High end', blurb: 'Views over a forested valley, reached by a suspension bridge. An occasion in itself.', href: url(LISTING.twistedFig) },
        { name: 'The Boatyard', tags: ['waterfront'], priceBand: 'Mid range', blurb: 'A Kilifi institution. Come for the crab samosas and stay all afternoon.', href: url(LISTING.boatyard) },
        { name: 'The Food Movement', priceBand: 'Budget', blurb: 'Small menu, big flavour, deep in the plantations. Casual and very good.', href: url(LISTING.foodMovement) },
        { name: 'Mnarani Club Restaurant', tags: ['waterfront'], priceBand: 'Mid range', blurb: 'Long varied menu and beautiful creek views from the upstairs dining room.', href: url(LISTING.mnarani) },
        { name: 'Village Dishes', tags: ['local'], priceBand: 'Budget', blurb: 'Swahili and coastal food, barbecue, shawarma and unbeatable fresh juice.', href: url(LISTING.villageDishes) },
        { name: 'Baharini', tags: ['local', 'waterfront'], priceBand: 'Budget', blurb: 'Enormous menu, creek views upstairs, brilliant fish curry and fresh juice.' },
        { name: 'Members Club', tags: ['local', 'waterfront'], priceBand: 'Budget', blurb: 'Old Kilifi classic for Kenyan food, with elevated creek views. Order ahead.' },
        { name: 'Nuus Shawarma', tags: ['local'], priceBand: 'Budget', blurb: 'The best shawarma in town and very easy on the pocket.' },
        { name: 'Non Solo Gelato', priceBand: 'Budget', blurb: 'Finally, proper ice cream in Kilifi. Food too. Above the Rubis petrol station.' },
      ],
    }),
    tip('If you are only in Kilifi for one night, press the waterfront filter and pick from those. The single biggest thing this town has going for it is that you can eat with the creek or the ocean in front of you, and it costs no more than eating inland.', 'Klickenya local tip', 'tip', '🌊'),

    // ── The new wave ───────────────────────────────────────
    block('1. Tribal Table: the newest and the most elegant', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'Bofa Beach' },
      { icon: '💰', label: 'Price', value: 'High end' },
      { icon: '✨', label: 'Best for', value: 'Special occasions and dates' },
      { icon: '🍸', label: 'Order', value: 'The cocktails, and the crab burger' },
    ], 'purple', '✦ Tribal Table'),
    block('Tribal Table is the newest restaurant in Kilifi and it has arrived with real confidence. It sits on Bofa Beach, and you look out at the water through the palms with the breeze coming straight off the ocean, which is about as good as a dinner setting gets on this coast. The room is elegant and quietly romantic, so it is the one to book when the evening actually matters, whether that is an anniversary, a birthday or simply the night you want to make a fuss of someone.'),
    block('The menu is varied and it is not afraid of a twist. The crab burger is the one people talk about afterwards, and it is a good example of what the kitchen is doing: familiar idea, done properly, with something unexpected in it. Seafood comes in fresh from the Kilifi dhows, and the cooking leans on fire and seasonal produce. The cocktails are genuinely very good, which is rarer than it should be, and the service is warm without hovering. This is elevated dining that still feels like the coast rather than an imported city restaurant.'),
    tip('Book for golden hour rather than full dark. The light coming through the palms onto Bofa Beach is the whole point of the location, and it is wasted if you arrive at nine. There is live acoustic music on Friday evenings, so that is the night to pick if you want atmosphere with it.', 'Klickenya local tip', 'tip', '🌅'),
    rich([{ text: 'Find it here: ' }, { text: 'Tribal Table on Klickenya', link: url(LISTING.tribalTable) }, { text: '.' }]),

    block('2. Asian Kitchen: the food nobody else in Kilifi does', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'Clifftop, plantation side' },
      { icon: '💰', label: 'Price', value: 'Mid range' },
      { icon: '🍜', label: 'Best for', value: 'Noodles, sushi, something different' },
      { icon: '🌊', label: 'The view', value: 'Dramatic cliff and ocean' },
    ], 'teal', '✦ Asian Kitchen'),
    block('Asian Kitchen is very new and it has become popular very quickly, for a simple reason: nowhere else in Kilifi does this food. Noodles, sushi and a proper spread of Asian dishes, in a town where the choice used to be Italian, Swahili or grilled fish. If you have been in Kilifi for a while and you are craving something genuinely different, this is the answer, and if you are just passing through it is still worth the trip.'),
    block('The location does a lot of the work too. It sits on the plantation side on a clifftop, and the views down over the water are dramatic in a way that the flatter beach spots cannot match. Sitting up there with a bowl of noodles as the light goes is a lovely way to spend an evening. If you like Asian food at all, put this near the top of your list.'),
    tip('This is the one place in town where booking ahead genuinely matters, because it is new, small and busy. Ring during the day rather than turning up and hoping, particularly at weekends.', 'Klickenya local tip', 'tip', '📞'),

    block('3. Indigo Vibe: coffee, pastries and air conditioning', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'In town' },
      { icon: '💰', label: 'Price', value: 'Budget' },
      { icon: '🥐', label: 'Best for', value: 'Breakfast, coffee, working' },
      { icon: '❄️', label: 'The luxury', value: 'Air conditioning' },
    ], 'blue', '✦ Indigo Vibe'),
    block('Indigo Vibe is a new cafe and it is a must visit. The breads and pastries are genuinely yummy, the coffee is good, and it has air conditioning, which on a hot Kilifi afternoon turns out to be a more valuable feature than anything on the menu. It is the kind of place you plan to stop at for twenty minutes and leave ninety minutes later.'),
    block('The owner is lovely, kind and friendly in a way that makes the place feel like somewhere you belong after two visits, and that matters more than any single dish. They also do cocktails, and they host small events from time to time, so it quietly doubles as an evening spot rather than only a daytime cafe. Easily the best new addition for anyone who wants a proper coffee and somewhere comfortable to sit.'),
    whoIsItFor('🎯 Indigo Vibe is perfect for', [
      { icon: '💻', text: 'Working for a few hours out of the heat' },
      { icon: '🥐', text: 'Breakfast, fresh bread and pastries' },
      { icon: '☕', text: 'Anyone who takes coffee seriously' },
      { icon: '🍸', text: 'A quiet cocktail without a big night out' },
    ]),
    rich([{ text: 'Find it here: ' }, { text: 'Indigo Vibe Cafe on Klickenya', link: url(LISTING.indigoVibe) }, { text: '.' }]),
    img(IMG.newWave, 'Coffee, pastries and cocktails at a new cafe in Kilifi, Kenya', 'The new wave: Tribal Table, Asian Kitchen and Indigo Vibe have all landed recently'),

    // ── On the water ───────────────────────────────────────
    block("4. Salty's on the Creek: the best sunset in Kilifi", 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'On Kilifi Creek' },
      { icon: '💰', label: 'Price', value: 'High end' },
      { icon: '🦐', label: 'Best for', value: 'Seafood and sundowners' },
      { icon: '🌅', label: 'Go for', value: 'Sunset, every time' },
    ], 'amber', "✦ Salty's on the Creek"),
    block('The location is the headline here and it deserves to be. Salty\'s on the Creek sits in a stunning and genuinely unique spot on the water, and at sunset it is hard to beat anywhere on this stretch of coast. The light comes across the creek, the water goes still and gold, and the whole place slows down. If you do one sundowner in Kilifi, do it here.'),
    block('The food leans heavily and happily into seafood, and it is done well. The cocktails are delicious and they take them seriously. It sits at the higher end of the Kilifi budget range, but you are paying for a setting that does not exist anywhere else in town, and for cooking that holds its own. Come early enough to get the good seats and stay through the light change.'),
    tip('Time your table for about an hour before sunset. You want to be seated with a drink in hand before the light goes rather than arriving into it, because the good creekside tables fill up fast on clear evenings and nobody gives one up once the sky starts turning.', 'Klickenya local tip', 'tip', '🌅'),
    rich([{ text: 'Find it here: ' }, { text: "Salty's on the Creek on Klickenya", link: url(LISTING.saltysCreek) }, { text: '.' }]),

    block("5. Salty's Beach Bar on Bofa: reliably good, properly laid back", 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'Bofa Beach' },
      { icon: '💰', label: 'Price', value: 'Mid range' },
      { icon: '🍽️', label: 'Menu', value: 'Changes daily' },
      { icon: '🏖️', label: 'Vibe', value: 'Beachfront and unhurried' },
    ], 'teal', "✦ Salty's Beach Bar"),
    block('The Salty\'s group has three sites around Kilifi, including the Kitesurf Village and the creek location, and the beachfront bar on Bofa is the most laid back of them. The atmosphere is easy, nobody is rushing you, and it is the sort of place where lunch drifts into the afternoon without anyone minding.'),
    block('The menu changes daily, which is a genuine plus and a small catch at the same time. It means what you get is fresh and thought about rather than sitting on a laminated list all year, but it also means there is not a huge amount of choice on any given day. In practice that has never been a problem, because it is reliably good. Turn up, see what they are doing, order it.'),
    tip('The three Salty\'s sites have quite different personalities, so do not assume one visit covers them all. Bofa is the laid back beach one, the creek site is the sunset and seafood one, and the Kitesurf Village is where you go if you want the water sports crowd and the energy that comes with it.', 'Klickenya local tip', 'tip', '🪁'),
    rich([{ text: 'Find it here: ' }, { text: "Salty's Beach Bar and Restaurant on Klickenya", link: url(LISTING.saltysBofa) }, { text: '.' }]),

    block('6. The Boatyard: the Kilifi classic', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'On the water' },
      { icon: '💰', label: 'Price', value: 'Mid range' },
      { icon: '🥟', label: 'Order', value: 'The crab samosas' },
      { icon: '⚓', label: 'Status', value: 'A proper Kilifi hangout' },
    ], 'blue', '✦ The Boatyard'),
    block('The Boatyard has been here for ages and it has earned its place. This is a real Kilifi hangout, the spot where you run into people you know without arranging it, and where the crowd is a genuine mix of residents, sailors and visitors. Some restaurants are about the food and some are about the room. The Boatyard manages both, which is why it has lasted.'),
    block('The crab samosas are the thing. They are amazing, and everyone will tell you the same, so just order them before you have opened the menu properly. Beyond that the food is reliably good across the board, which after this many years is genuinely impressive. If someone asks you to name one restaurant that sums up Kilifi, this is probably the answer.'),
    rich([{ text: 'Find it here: ' }, { text: 'Kilifi Boatyard on Klickenya', link: url(LISTING.boatyard) }, { text: '.' }]),

    block('7. Mnarani Club Restaurant: the creek view and the long menu', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'Above Kilifi Creek' },
      { icon: '💰', label: 'Price', value: 'Mid range' },
      { icon: '📖', label: 'Menu', value: 'Long and varied' },
      { icon: '🍳', label: 'Also', value: 'Hotel buffet available' },
    ], 'amber', '✦ Mnarani Club'),
    block('Mnarani Club is the safe choice in the best sense, the one that works when you are feeding a group with different tastes and somebody has decided they do not want seafood. The menu is long and varied, the prices are mid range, and the odds of everyone at the table finding something they want are very high.'),
    block('The reason to choose it over other all rounders is the view. The upstairs restaurant looks out over Kilifi Creek and it is beautiful, particularly in the late afternoon. You can also eat the hotel buffet here if you would rather graze than order, which suits a long lunch or a hungry family. Comfortable, dependable and one of the nicest outlooks in town.'),
    rich([{ text: 'Find it here: ' }, { text: 'Mnarani Beach Club on Klickenya', link: url(LISTING.mnarani) }, { text: '.' }]),
    img(IMG.waterfront, 'Creekside restaurant table at sunset in Kilifi, Kenya', 'Seven of the fifteen sit on the beach, the cliffs or the creek'),

    // ── Special occasion ───────────────────────────────────
    block('8. Salt and Smoke: the steak house', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'Bofa Road' },
      { icon: '💰', label: 'Price', value: 'High end' },
      { icon: '🥩', label: 'Best for', value: 'Meat, cooked properly' },
      { icon: '🔥', label: 'Style', value: 'Spanish and Argentinian fire' },
    ], 'purple', '✦ Salt and Smoke'),
    block('Salt and Smoke is where you go when you want meat and you want it done seriously. It is a Spanish and Argentinian influenced grill house built around fire, with high quality cuts, and the difference in quality is obvious from the first plate. The sides and starters get proper attention too rather than being an afterthought to the grill.'),
    block('It sits at the very high end price wise, and that is worth knowing before you sit down. But this is a special occasion restaurant and it behaves like one, so if you have been eating shawarma and daily specials all week and you want one big dinner, this is a very good way to spend it.'),

    block('9. The Twisted Fig: the view and the walk to get there', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'Beneath the Baobabs festival grounds' },
      { icon: '💰', label: 'Price', value: 'High end' },
      { icon: '🌲', label: 'The view', value: 'Over a forested valley' },
      { icon: '🌉', label: 'Getting there', value: 'Suspension bridge or road' },
    ], 'green', '✦ The Twisted Fig'),
    block('The Twisted Fig has one of the most beautiful settings of any restaurant in Kilifi County, perched on the festival grounds with a view out over a valley thick with forest. It is a very high budget option, and it is the sort of place you go for the whole experience rather than just a meal, with handcrafted breads, good seafood and a menu that has clearly been thought about.'),
    block('What makes it genuinely special now is the arrival. They recently built a suspension bridge, which makes access much easier than it used to be and turns the last stretch into a small adventure. Walking out over the valley with the canopy below you before you have even sat down is a lovely bit of theatre, and it is the part people describe first when they get home. You can still drive in if you prefer.'),
    tip('Walk in over the suspension bridge rather than driving right up if your knees and your shoes allow it. It takes a few minutes, the view from the middle of the valley is the best part of the visit, and it costs nothing. Go in daylight so you actually see it.', 'Klickenya local tip', 'tip', '🌉'),
    rich([{ text: 'Find it here: ' }, { text: 'The Twisted Fig on Klickenya', link: url(LISTING.twistedFig) }, { text: '.' }]),

    block('10. The Food Movement: small menu, very tasty', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'In the plantations' },
      { icon: '💰', label: 'Price', value: 'Budget' },
      { icon: '🍽️', label: 'Menu', value: 'Small and focused' },
      { icon: '🌿', label: 'Vibe', value: 'Laid back and casual' },
    ], 'green', '✦ The Food Movement'),
    block('The Food Movement sits in the middle of the plantations and it is delightfully casual, the sort of place with no ceremony at all where the food quietly outperforms the setting. The menu is small, which is usually a good sign, and everything on it is very tasty.'),
    block('This is the one for a relaxed lunch when you do not want an occasion, just something genuinely good to eat somewhere peaceful and green. It is also a nice excuse to drive out through the plantations, which is a lovely part of Kilifi that visitors rarely see.'),
    rich([{ text: 'Find it here: ' }, { text: 'The Food Movement on Klickenya', link: url(LISTING.foodMovement) }, { text: '.' }]),
    img(IMG.fineDining, 'Grilled meat and fine dining plate at a Kilifi restaurant, Kenya', 'Salt and Smoke and The Twisted Fig are the two big occasion restaurants'),

    // ── Local food ─────────────────────────────────────────
    block('11. Village Dishes: the best value food in Kilifi', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'In town' },
      { icon: '💰', label: 'Price', value: 'Budget' },
      { icon: '🍛', label: 'Food', value: 'Swahili, coastal, barbecue, shawarma' },
      { icon: '🥤', label: 'Do not skip', value: 'The fresh juice' },
    ], 'green', '✦ Village Dishes'),
    block('Village Dishes is a Kilifi classic and it is the place we send everyone. Swahili and coastal local food, barbecue, shawarma, all of it fast, all of it tasty, and all of it so cheap that you will check the bill twice. If you want to understand how people actually eat in Kilifi rather than how visitors eat, start here.'),
    block('The fresh juice deserves its own paragraph. It is genuinely outstanding. Ask for the avocado, mango and beetroot mixed together, which sounds like a strange combination and is one of the best things you will drink on this coast, or go for the pineapple if you want something simpler. Either way, do not treat the juice as an afterthought to the food. Plenty of locals stop in for the juice alone.'),
    tip('Order the avocado, mango and beetroot juice mixed. Say it exactly like that. It is the single best value thing on any menu in Kilifi and almost no visitor ever orders it because it sounds odd written down.', 'Klickenya local tip', 'tip', '🥤'),
    rich([{ text: 'Find it here: ' }, { text: 'Village Dishes on Klickenya', link: url(LISTING.villageDishes) }, { text: '.' }]),

    block('12. Baharini: the long menu with the creek breeze', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'Upstairs, creek views' },
      { icon: '💰', label: 'Price', value: 'Budget' },
      { icon: '🐟', label: 'Order', value: 'The fish curry, and a fresh juice' },
      { icon: '📖', label: 'Menu', value: 'Very long' },
    ], 'blue', '✦ Baharini'),
    block('Baharini does local food in Kilifi and does it very well. The menu is very long with an enormous number of options, and the portions are generous for what you pay, which is a combination that makes it easy to keep going back. The fish curry is excellent and it is the thing to order first. The fresh juice here is incredible too, and it is worth ordering even if you would not normally.'),
    block('Sit upstairs. That is where you get the creek views and a proper breeze coming through, which makes a real difference in the middle of the day. It is a lovely, unfussy place to eat well for very little money with a view most restaurants would charge for.'),

    block('13. Members Club: old Kilifi, Kenyan food, great views', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'Elevated, above the creek' },
      { icon: '💰', label: 'Price', value: 'Budget' },
      { icon: '🍲', label: 'Best for', value: 'Kenyan food' },
      { icon: '⏳', label: 'Know this', value: 'It is slow, on purpose or not' },
    ], 'amber', '✦ Members Club'),
    block('Members Club is an old classic and a proper piece of Kilifi. The Kenyan food is good, the prices are very affordable, and the creek views from its elevated position are lovely, particularly if you get there while there is still light. It has the unhurried feel of a place that has been doing the same thing for a long time and sees no reason to change.'),
    block('One honest and genuinely useful piece of advice: it is slow. Not occasionally slow, reliably slow. That is simply how it works, and once you know it you can plan around it very happily. Ring ahead and order before you arrive, or go with the expectation that you will be sitting for a while with a cold drink and the view. Treated that way it is a lovely afternoon. Treated as a quick lunch before a bus, it is not.'),
    tip('Call ahead and place your order before you set off, or accept that you are there for the long haul. Locals do the former. Either approach works, but turning up hungry and in a rush is the one way to have a bad time at Members Club.', 'Klickenya local tip', 'tip', '⏳'),

    block('14. Nuus Shawarma: the best shawarma in town', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'In town' },
      { icon: '💰', label: 'Price', value: 'Budget' },
      { icon: '🌯', label: 'Order', value: 'Shawarma, obviously' },
      { icon: '⚡', label: 'Best for', value: 'Fast, cheap and very good' },
    ], 'teal', '✦ Nuus Shawarma'),
    block('Nuus is the best shawarma spot in Kilifi and it is very easy on the pocket. That is the whole review, and it is the highest compliment a place like this can get. When you want something fast, filling and genuinely good without spending anything, this is the answer, and it is the sort of place that quietly becomes part of your week if you live here.'),

    block('15. Non Solo Gelato: finally, ice cream in Kilifi', 'h2'),
    quickFacts([
      { icon: '📍', label: 'Where', value: 'Above the Rubis petrol station' },
      { icon: '💰', label: 'Price', value: 'Budget' },
      { icon: '🍦', label: 'Best for', value: 'Gelato, and food too' },
      { icon: '🎉', label: 'Why it matters', value: 'Kilifi has waited for this' },
    ], 'purple', '✦ Non Solo Gelato'),
    block('Finally, ice cream in Kilifi. Non Solo Gelato is one of the newest arrivals and it fills a gap that residents have been complaining about for years, which is why it was busy almost immediately. They do food as well, so it is not only a dessert stop, but the gelato is the reason to go.'),
    block('It sits above the Rubis petrol station, which is not a glamorous address and does not need to be. This is a place you go for a cone at the end of a hot afternoon, and on that measure it is perfect.'),
    img(IMG.localFood, 'Swahili coastal food and fresh juice at a local restaurant in Kilifi, Kenya', 'Village Dishes, Baharini and Nuus are where Kilifi actually eats'),

    // ── How to choose ──────────────────────────────────────
    block('Where to eat in Kilifi, by the evening you want', 'h2'),
    deciderGrid([
      { label: 'Special occasion', color: 'purple', title: 'Tribal Table or Salt and Smoke', items: ['Elegant and romantic on Bofa', 'Or serious meat and fire', 'Book ahead for both', 'High end, worth it'] },
      { label: 'Sunset', color: 'amber', title: "Salty's on the Creek", items: ['The best light in Kilifi', 'Seafood and good cocktails', 'Arrive an hour before', 'The Twisted Fig runs it close'] },
      { label: 'Something different', color: 'teal', title: 'Asian Kitchen', items: ['Noodles and sushi', 'Nowhere else does this here', 'Clifftop ocean views', 'Book at weekends'] },
      { label: 'Cheap and excellent', color: 'green', title: 'Village Dishes', items: ['Swahili and coastal food', 'Barbecue and shawarma', 'The famous fresh juice', 'Nuus for shawarma alone'] },
    ]),
    budgetTable(
      ['Price band', 'What it means', 'Where'],
      [
        { label: 'Budget', values: ['Local food, cafes, fast and cheap', 'Village Dishes, Baharini, Members Club, Nuus Shawarma, Indigo Vibe, The Food Movement, Non Solo Gelato'] },
        { label: 'Mid range', values: ['A proper sit down meal without an event', "Salty's Beach Bar, The Boatyard, Mnarani Club, Asian Kitchen"] },
        { label: 'High end', values: ['Occasion dinners, the top of the Kilifi range', "Tribal Table, Salty's on the Creek, Salt and Smoke, The Twisted Fig"] },
      ],
    ),
    tip('Kilifi is small and most of these are a short drive or tuk-tuk from each other, so you can genuinely eat somewhere different every night for two weeks. What you cannot do is rely on walking between them after dark, particularly out to the plantations or the festival grounds. Sort your ride home before you sit down.', 'Klickenya local tip', 'tip', '🛺'),
    img(IMG.choosing, 'Evening restaurant terrace with lights and coastal view in Kilifi, Kenya', 'Fifteen restaurants, a small town, and a food scene still picking up speed'),

    // ── FAQ ────────────────────────────────────────────────
    block('Best restaurants in Kilifi: your questions answered', 'h2'),
    block('What is the best restaurant in Kilifi?', 'h3'),
    block('For a special dinner, Tribal Table on Bofa Beach is the current pick, with elegant coastal dining, very good cocktails and an ocean view through the palms. For the best sunset, Salty\'s on the Creek. For the best value, Village Dishes. The honest answer is that Kilifi is small enough that the best restaurant depends entirely on the evening you want.'),
    block('What are the newest restaurants in Kilifi?', 'h3'),
    block('Asian Kitchen, Tribal Table and Non Solo Gelato are the newest arrivals, and all three opened recently. Asian Kitchen brought Asian food to a town that had none, Tribal Table brought elevated beachfront dining, and Non Solo Gelato finally brought proper ice cream. Indigo Vibe and Salt and Smoke are also recent additions.'),
    block('Where can I eat on the water in Kilifi?', 'h3'),
    block("Tribal Table and Salty's Beach Bar are on Bofa Beach, Asian Kitchen is on the clifftop, and Salty's on the Creek, The Boatyard, Mnarani Club, Baharini and Members Club all look out over Kilifi Creek. Use the waterfront filter near the top of this guide to see them all together."),
    block('Where is the best local food in Kilifi?', 'h3'),
    block('Village Dishes for Swahili and coastal food, barbecue and shawarma, plus the best fresh juice in town. Baharini for a very long menu, generous portions and an excellent fish curry with a creek view upstairs. Nuus Shawarma for the best shawarma in Kilifi. Members Club for Kenyan food with a view, if you are not in a hurry.'),
    block('Is eating out in Kilifi expensive?', 'h3'),
    block('It does not have to be. Kilifi has a genuinely wide range, from local spots where a full meal and a fresh juice cost very little through to occasion restaurants like Salt and Smoke and The Twisted Fig that sit at the top of the coastal price range. Most visitors mix the two, which is the right approach.'),
    block('Do I need to book a table in Kilifi?', 'h3'),
    block('For most places, no. For Asian Kitchen, Tribal Table, Salt and Smoke and The Twisted Fig, yes, particularly at weekends and in high season, because they are either new, small or both. At Members Club it is worth calling ahead to place your order rather than to reserve, because the kitchen is slow.'),
    block('Which Kilifi restaurant has the best view?', 'h3'),
    block('The Twisted Fig for the valley and forest canopy, reached by its suspension bridge. Salty\'s on the Creek for the water at sunset. Asian Kitchen for the drama of the clifftop. Mnarani Club and Baharini both have lovely creek views from upstairs. You are spoilt here.'),
    block('Is the Kilifi food scene actually good now?', 'h3'),
    block('Yes, and it is still improving. Kilifi was limited for a long time and the same handful of places carried the town. Over the last stretch several new restaurants have opened, the older ones have held their standards, and there is real energy in the scene for the first time in years. It is genuinely worth planning meals around now.'),

    // ── Close ──────────────────────────────────────────────
    pullQuote('Kilifi spent years as the place you passed through on the way to somewhere else. Between the new arrivals and the classics that never dropped their standards, it is now a town you can happily eat your way around for a fortnight.', 'teal'),
    rich([
      { text: 'Planning a trip? Browse ' },
      { text: 'things to do in Kilifi', link: '/experiences/kilifi' },
      { text: ', read our ' },
      { text: 'complete guide to Kilifi', link: '/journal/complete-guide-kilifi-kenya-2026' },
      { text: ', and if you are deciding between the coastal towns our guide to ' },
      { text: 'Watamu, Kilifi, Diani and Lamu', link: '/journal/watamu-kilifi-diani-lamu-kenya-coast-guide' },
      { text: ' breaks down the differences. Heading up the coast too? Here are the ' },
      { text: 'best restaurants in Watamu', link: '/journal/best-restaurants-watamu-kenya' },
      { text: '.' },
    ]),
  ]
}

/* ── Main ────────────────────────────────────────────────── */
async function main() {
  console.log('🍽️  Seeding blog post: 15 Best Restaurants in Kilifi 2026\n')

  console.log('   uploading gradient placeholders...')
  const IMG = await uploadGradients()

  const doc = {
    _id: POST_ID,
    _type: 'blogPost',
    title: 'The 15 Best Restaurants in Kilifi (2026): A Local Guide to a Food Scene Finally Taking Off',
    slug: { _type: 'slug', current: 'best-restaurants-kilifi' },
    status: 'published',
    author: { _type: 'reference', _ref: AUTHOR_ID },
    primaryCategory: 'food_restaurants',
    subcategory: 'food_guide',
    postType: 'listicle',
    location: 'kilifi',
    series: 'Kenya Coast Food Guides',
    focusKeyword: 'best restaurants in kilifi',
    seoTitle: 'The 15 Best Restaurants in Kilifi, Kenya (2026)',
    seoDescription:
      'The 15 best restaurants in Kilifi, Kenya, chosen by locals. Tribal Table, Asian Kitchen, Salty\'s on the Creek, Salt and Smoke, The Twisted Fig, Village Dishes and more, with price bands and waterfront and local food filters.',
    excerpt:
      'A local 2026 guide to the best restaurants in Kilifi, Kenya. Fifteen places worth your time, from new arrivals like Tribal Table and Asian Kitchen to classics like The Boatyard and Village Dishes, filterable by waterfront and local food.',
    readingTime: 12,
    publishedAt: '2026-08-15T10:00:00Z',
    keywords: [
      'best restaurants in kilifi',
      'kilifi restaurants',
      'where to eat in kilifi',
      'kilifi kenya food',
      'tribal table kilifi',
      'asian kitchen kilifi',
      'saltys on the creek kilifi',
      'the twisted fig kilifi',
      'salt and smoke kilifi',
      'village dishes kilifi',
      'kilifi beachfront restaurant',
      'kilifi local food',
    ],
    tags: ['Kilifi', 'Food & Culture', 'Restaurants', 'Kenya', 'Coast', 'Travel Guide'],
    relatedListings: [
      { _type: 'reference', _key: key(), _ref: 'nm8JEDxpi0X74uOLT5Vvf0' },  // Tribal Table
      { _type: 'reference', _key: key(), _ref: '2riX1AdO9O53izfAmra67x' },  // Salty's on the Creek
      { _type: 'reference', _key: key(), _ref: 'U1j2mvjVVumuzihYzB0gxt' },  // Village Dishes
    ],
    coverImage: {
      _type: 'image',
      alt: 'Restaurant table with coastal food and ocean view in Kilifi, Kenya',
      asset: { _type: 'reference', _ref: IMG.cover },
    },
    body: buildBody(IMG),
  }

  await client.createOrReplace(doc)
  console.log('\n✅ Published: /journal/best-restaurants-kilifi')
  console.log('   (Allow up to 60s for the site revalidate to reflect it.)')
  console.log('   Next: swap the gradient placeholders for real photos in Sanity Studio.')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
