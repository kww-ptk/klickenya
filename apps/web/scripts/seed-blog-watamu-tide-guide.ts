/**
 * Seed the "Tide Guide for Watamu and the Kenyan Coast" blog post.
 *
 * Run locally (needs the Sanity WRITE token):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-watamu-tide-guide.ts
 *
 * Idempotent: createOrReplace with a fixed _id. Route: /journal/watamu-tide-guide
 *
 * House rules applied:
 *  - no dashes in prose
 *  - every internal link verified against live Sanity (Aug 2026); archived listings excluded
 *  - external links checked for HTTP 200 before use
 *  - gradient placeholder images after each main section, uploaded by this script
 *
 * The requested webcam insert: SkylineWebcams runs a live camera on Watamu Bay from Visiwa
 * Beach Resort, with a daily timelapse page. Both verified 200. The timelapse is the clearest
 * way to actually see low tide versus high tide, so it gets its own section plus a tip card.
 *   live:      https://www.skylinewebcams.com/en/webcam/kenya/malindi/watamu/watamu-beach.html
 *   timelapse: https://www.skylinewebcams.com/en/webcam/kenya/malindi/watamu/watamu-beach/timelapse.html
 * Visiwa, where the camera sits, is a Klickenya listing, so it is linked internally too.
 *
 * NOTE: this post links to /journal/best-boutique-hotels-watamu. Seed that post first, or
 * the link will 404 until it is published.
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
const POST_ID = 'blog-watamu-tide-guide'

/* ── External links (all verified HTTP 200) ──────────────── */
const WEBCAM_LIVE = 'https://www.skylinewebcams.com/en/webcam/kenya/malindi/watamu/watamu-beach.html'
const WEBCAM_TIMELAPSE = 'https://www.skylinewebcams.com/en/webcam/kenya/malindi/watamu/watamu-beach/timelapse.html'
const TIDE_FORECAST = 'https://www.tide-forecast.com/locations/Malindi-Kenya/tides/latest'
const WINDFINDER = 'https://www.windfinder.com/tide/watamu'

/* ── Listing ids (live and published, verified) ──────────── */
const LISTING = {
  jacaranda: '2riX1AdO9O53izfAmrInwx',
  garoda: '2riX1AdO9O53izfAmrIrcS',
  shortBeach: '2riX1AdO9O53izfAmrIrIS',
  midaCreek: 'U1j2mvjVVumuzihYzAQorf',
  crabShack: '76y5EjmeLusgbergeavVGU',
  captainSammy: '2riX1AdO9O53izfAmrIoJS',
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
function budgetTable(columns: string[], rows: Array<{ label: string; values: string[] }>): any {
  return { _type: 'budgetTableBlock', _key: key(), columns, rows: rows.map((r) => ({ _type: 'object', _key: key(), label: r.label, values: r.values })) }
}
function compareTable(columns: Array<{ label: string; color?: string }>, rows: Array<{ criterion: string; values: string[] }>): any {
  return {
    _type: 'compareTableBlock',
    _key: key(),
    columns: columns.map((c) => ({ _type: 'object', _key: key(), label: c.label, ...(c.color ? { color: c.color } : {}) })),
    rows: rows.map((r) => ({ _type: 'object', _key: key(), criterion: r.criterion, values: r.values })),
  }
}
function statRow(stats: Array<{ number: string; label: string }>): any {
  return { _type: 'statRowBlock', _key: key(), stats: stats.map((s) => ({ _type: 'object', _key: key(), ...s })) }
}
function deciderGrid(cards: Array<{ label: string; color: string; title: string; items: string[] }>): any {
  return { _type: 'deciderGridBlock', _key: key(), cards: cards.map((c) => ({ _type: 'object', _key: key(), ...c })) }
}
function distanceChips(chips: Array<{ icon: string; label: string; value: string }>): any {
  return { _type: 'distanceChipsBlock', _key: key(), chips: chips.map((c) => ({ _type: 'object', _key: key(), ...c })) }
}
function packingList(title: string, items: Array<{ icon: string; text: string }>): any {
  return { _type: 'packingListBlock', _key: key(), title, items: items.map((i) => ({ _type: 'object', _key: key(), ...i })) }
}
function pullQuote(text: string, accentColor = 'teal'): any {
  return { _type: 'pullQuoteBlock', _key: key(), text, accentColor }
}

/* ── Gradient placeholders ───────────────────────────────── */
const GRADIENTS: Record<string, [string, string, string]> = {
  cover: ['#062E52', '#1E88B8', '#7FE3E0'],
  science: ['#1B1B4B', '#4A3E8E', '#8B4DAB'],
  springNeap: ['#2A1B4B', '#6B2D8B', '#E8A020'],
  range: ['#0B4F73', '#2E9BC4', '#9BE8E0'],
  webcam: ['#0E4E5E', '#1FA8B8', '#F0E2B0'],
  timing: ['#0F5F52', '#2FA98A', '#9BD8C8'],
  activities: ['#0B3F63', '#3BA0C8', '#E8A020'],
  seasons: ['#4A3410', '#B07820', '#E8C070'],
  checking: ['#123A5E', '#3E7FA8', '#8FC8D8'],
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
      filename: `watamu-tide-guide-${name}.svg`,
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
    block('Tides in Watamu, Kenya, run on a roughly six hour cycle, with two high tides and two low tides every day and a swing of about one to three metres between them. Low tide is when the sandbanks appear at Jacaranda Bay and Garoda and the water turns that famous turquoise. Mid tide is the best time to swim. High tide is for gentle waves, boat trips and heading into Mida Creek. If you only remember one thing from this guide, make it this: in Watamu you plan your day around the tide, not around the clock.'),

    block('If you have spent any time on the Kenyan coast you will have noticed how dramatically the sea changes through the day. A beach that looks wide, blue and inviting at breakfast can be a completely different landscape by mid afternoon, and a stretch of sand that was underwater in the morning can be a walkable sandbank by lunch. That is the tide, and once you understand it you stop being surprised by the coast and start planning around it. Here is everything you need to know about tides in Watamu and along the rest of the Kenyan coast.'),

    img(IMG.cover, 'Turquoise shallows and exposed sandbank at low tide in Watamu, Kenya', 'The same beach can look like two different places depending on the tide'),

    statRow([
      { number: '2 + 2', label: 'high tides and low tides every day' },
      { number: '~6 hrs', label: 'between one tide and the next' },
      { number: '1 to 3 m', label: 'typical swing between low and high' },
    ]),

    // ── The science ────────────────────────────────────────
    block('What are tides, and why does the sea move so much?', 'h2'),
    block('Tides are the rise and fall of sea level, caused mainly by the gravitational pull of the Moon and the Sun combined with the rotation of the Earth. The oceans bulge slightly toward the Moon, and as the Earth turns, coastlines rotate through those bulges. When your stretch of coast passes through a bulge you get high tide. When it sits between them you get low tide.'),
    block('In practice that gives Watamu two high tides and two low tides in every twenty four hour period, with roughly six hours between each one. So if high tide is at 6am, low tide will fall around midday, the next high tide around 6pm, and the next low tide close to midnight.'),
    quickFacts([
      { icon: '🌙', label: 'Main driver', value: 'Gravity of the Moon and the Sun' },
      { icon: '🔄', label: 'Cycle', value: '2 highs and 2 lows every day' },
      { icon: '⏱️', label: 'Gap between tides', value: 'About 6 hours' },
      { icon: '➡️', label: 'Daily drift', value: 'Tides run about 50 minutes later each day' },
    ], 'purple', '✦ Tides in one box'),
    tip('The detail nobody tells you, and the one that catches visitors out: the tide does not happen at the same time every day. Each cycle runs about fifty minutes later than the day before. So the perfect midday low tide you enjoyed on Monday will be closer to 2pm by Wednesday and gone by the weekend. If you have a sandbank day planned, check the chart again the night before rather than assuming yesterday applies.', 'Klickenya local tip', 'tip', '⏰'),
    img(IMG.science, 'Illustration style gradient representing the moon and ocean tidal cycle', 'Two highs, two lows, and everything shifting about fifty minutes later each day'),

    // ── Spring and neap ────────────────────────────────────
    block('Spring tides and neap tides: why some weeks are more extreme', 'h2'),
    block('Not every tide is equal. Across the lunar month the difference between high and low water grows and shrinks, and this is the part that decides whether you get a spectacular sandbank or a fairly ordinary beach day.'),
    compareTable(
      [{ label: 'Spring tides', color: 'teal' }, { label: 'Neap tides', color: 'purple' }],
      [
        { criterion: 'When', values: ['Full moon and new moon', 'Quarter moons'] },
        { criterion: 'High tide', values: ['Higher than usual', 'Lower than usual'] },
        { criterion: 'Low tide', values: ['Lower than usual', 'Higher than usual'] },
        { criterion: 'What you see', values: ['Biggest sandbanks, most dramatic change', 'Gentler change through the day'] },
        { criterion: 'Best for', values: ['Sandbank walks, photography, island hopping', 'Swimming at more hours of the day'] },
      ],
    ),
    tip('If your trip is flexible and you want the big Instagram sandbanks at Jacaranda Bay or Garoda, aim for the days around a full moon or a new moon. That is when spring tides pull the water furthest out and a second sandbank can appear behind the first. Check the moon phase when you book, not when you land.', 'Klickenya local tip', 'tip', '🌕'),
    img(IMG.springNeap, 'Gradient graphic representing full moon spring tides and quarter moon neap tides', 'Spring tides around the full and new moon give the most dramatic low water'),

    // ── How much ───────────────────────────────────────────
    block('How much does the tide actually change in Kenya?', 'h2'),
    block('Along the Kenyan coast, high tide typically sits somewhere between three and three and a half metres, and low tide drops to around half a metre to one metre, depending on where you are in the spring and neap cycle. In Watamu the exact numbers vary a little, but you should expect most beaches to shift by roughly one to three metres of water height between low and high.'),
    block('That vertical number matters less than what it does horizontally. Because the reef flats here are so shallow and so wide, a two metre drop in water level can pull the sea back hundreds of metres, which is why the coastline looks so different at either end of the day.'),
    budgetTable(
      ['Tide state', 'Rough water height', 'What the beach looks like', 'Best for'],
      [
        { label: 'High tide', values: ['About 3.0 to 3.5 m', 'Water right up the sand, small gentle waves', 'Swimming, boat trips, playing in the shallows'] },
        { label: 'Mid tide', values: ['Around 2 m', 'Comfortable depth over sand, reef still covered', 'The safest all round swimming window'] },
        { label: 'Low tide', values: ['About 0.5 to 1.0 m', 'Sandbanks exposed, brilliant turquoise shallows', 'Walking out, photography, shallow snorkelling'] },
        { label: 'Very low spring tide', values: ['Under 0.5 m', 'Rock pools and coral exposed', 'Rock pooling and photos, not swimming'] },
      ],
    ),
    tip('Reef shoes are the single most useful thing you can pack for Watamu, and almost nobody brings them. At low tide you are walking over coral rubble, sea urchins and sharp rock to reach the sandbanks. You can buy a pair in town, but bringing your own saves an afternoon.', 'Klickenya local tip', 'tip', '👟'),
    img(IMG.range, 'Gradient showing shallow turquoise water over a wide reef flat in Watamu', 'A two metre drop in height pulls the sea back hundreds of metres across the reef flat'),

    // ── Webcam ─────────────────────────────────────────────
    block('See the difference for yourself: the Watamu beach webcam and timelapse', 'h2'),
    rich([
      { text: 'Reading about a three metre tidal range is one thing. Watching it happen is much more convincing. There is a live camera pointed at Watamu Bay, and it also publishes a daily timelapse, which compresses the whole day into a short clip. Play it once and you see the sea march out across the reef, the sandbanks emerge, and then the water climb all the way back up the beach. It is the clearest possible illustration of what low tide versus high tide actually means here. Watch the ' },
      { text: 'Watamu Beach timelapse', link: WEBCAM_TIMELAPSE },
      { text: ', or check the ' },
      { text: 'live Watamu Beach webcam', link: WEBCAM_LIVE },
      { text: ' to see the state of the tide right now before you head out.' },
    ]),
    rich([
      { text: 'The camera sits on Watamu Bay at Visiwa Beach Resort, so what you are looking at is the town beach rather than Garoda or Jacaranda. Handy detail if you want to eat where the view is filmed: ' },
      { text: 'Visiwa Restaurant', link: '/experiences/watamu/visiwa-restaurant-Amici-Miei' },
      { text: ' is right there.' },
    ]),
    tip('Use the timelapse as a planning tool, not just a novelty. Before a sandbank day, play yesterday timelapse and note roughly what time the water was furthest out. Then shift that by about fifty minutes per day forward to estimate today. It takes thirty seconds and it is more intuitive than reading a chart, especially if you are travelling with people who do not want a lecture about the Moon.', 'Klickenya local tip', 'tip', '📹'),
    img(IMG.webcam, 'Wide view of Watamu Bay beach in Kenya as seen from a beachfront webcam', 'The daily timelapse is the fastest way to understand the tidal range in Watamu'),

    // ── Best tide per beach ────────────────────────────────
    block('When is the tide best for Watamu beaches?', 'h2'),
    block('Every beach in Watamu has a tide that suits it, and the difference between arriving at the right moment and the wrong one is enormous. This is the part locals think about automatically and visitors usually discover on day four.'),
    deciderGrid([
      { label: 'Low tide', color: 'teal', title: 'Sandbanks and turquoise', items: ['Jacaranda Bay at its best', 'Garoda sandbank appears', 'Shallow water, brilliant colour', 'Ideal window is 10am to 3pm'] },
      { label: 'Mid tide', color: 'blue', title: 'The best swimming', items: ['Papa Remo and Turtle Bay', 'Enough water over the reef', 'No exposed coral underfoot', 'Comfortable for children'] },
      { label: 'High tide', color: 'amber', title: 'Waves and boats', items: ['Small gentle waves to play in', 'Boat and dhow trips run', 'Mida Creek fills up', 'Generally safe, calm ocean'] },
      { label: 'Very low tide', color: 'purple', title: 'Rock pools', items: ['Coral and rock pools exposed', 'Beautiful to explore', 'Not for swimming', 'Reef shoes essential'] },
    ]),
    rich([
      { text: 'A low tide that falls between roughly 10am and 3pm is the jackpot. The sun is high, the shallow water lights up turquoise, the photography is at its best, and you have hours to walk out. ' },
      { text: 'Jacaranda Beach', link: '/experiences/watamu/jacaranda-beach' },
      { text: ' and ' },
      { text: 'Garoda Beach', link: '/experiences/watamu/garoda-beach' },
      { text: ' are the two that transform most completely. For a full breakdown of which beach suits which mood, read our ' },
      { text: '7 best beaches in Watamu guide', link: '/journal/7-best-beaches-watamu-kenya' },
      { text: '.' },
    ]),
    budgetTable(
      ['Beach', 'Best tide', 'Why', 'Watch out for'],
      [
        { label: 'Jacaranda Bay', values: ['Low to mid', 'Sandbanks and shallow turquoise pools', 'Seaweed in the Kusi months'] },
        { label: 'Garoda', values: ['Low', 'The sandbank emerges, sometimes two', 'Boats coming and going on tours'] },
        { label: 'Papa Remo and Seven Islands', values: ['Low to mid', 'Sandbars link up toward the islets', 'Busy in high season'] },
        { label: 'Turtle Bay stretch', values: ['High for swimming, low for walking', 'Low tide exposes reef, so walk it instead', 'Do not swim over exposed coral'] },
        { label: 'Watamu Bay', values: ['Mid to high', 'Family friendly shallows near town', 'The busiest beach'] },
        { label: 'Short Beach', values: ['Low, for sunset', 'Creek mouth views and the only ocean sunset', 'Strong current when the tide runs'] },
      ],
    ),
    tip('Short Beach deserves a specific warning that most guides skip. It sits at the mouth of Mida Creek, and when the tide is actively running in or out, an enormous volume of water is squeezing through that gap. The current is genuinely strong. Treat it as a sunset and paddling beach, not a swimming beach, and keep children in the shallows.', 'Safety tip', 'warning', '⚠️'),
    listingCard(LISTING.garoda, 'See Garoda Beach on Klickenya'),
    img(IMG.timing, 'Sandbank emerging from turquoise water at low tide on a Watamu beach', 'A low tide between 10am and 3pm is the best window Watamu offers'),

    // ── Activities ─────────────────────────────────────────
    block('How the tide changes what you can actually do', 'h2'),
    block('Tide timing is not just about how pretty the beach looks. It decides whether your activity is possible at all, and getting it wrong is the difference between a great day and a wasted morning.'),
    packingList('🕒 Plan these around the tide', [
      { icon: '🤿', text: 'Snorkelling and diving: boats need water, so trips usually run around higher tides' },
      { icon: '🏝️', text: 'Walking to sandbanks and islands: strictly a low tide activity' },
      { icon: '🪁', text: 'Kitesurfing: low to mid tide gives the flat water over the sandbanks' },
      { icon: '⛵', text: 'Dhow trips and creek boats: need enough depth, so book near high tide' },
      { icon: '🦀', text: 'Mida Creek and the boardwalk: high tide for water, low tide for birds on the mudflats' },
      { icon: '🏊', text: 'Swimming: mid to high tide, when reef and coral are safely covered' },
    ]),
    rich([
      { text: 'Kitesurfers get the best of both worlds here, because the wide flat lagoons at Garoda and Jacaranda turn into perfect flat water at low and mid tide. Our ' },
      { text: 'kitesurfing in Watamu guide', link: '/journal/kitesurfing-watamu-guide' },
      { text: ' covers the Kaskazi and Kusi wind seasons, the schools and what lessons cost.' },
    ]),
    rich([
      { text: 'Mida Creek is the place where tide timing matters most, and where locals really do check the chart before leaving the house. At high tide the creek fills and the water goes glassy, which is when the boardwalk and the boats are at their best. At low tide the mudflats appear and the birdlife comes out to feed, which is the better shout if you care about wildlife. Both are worth doing. Book through ' },
      { text: 'Mida Creek', link: '/experiences/watamu/mida-creek' },
      { text: ' or go out with ' },
      { text: 'Captain Sammy on a dhow', link: '/experiences/watamu/captain-sammy-dhow' },
      { text: '.' },
    ]),
    tip('The classic Mida Creek move: book a table at the Crab Shack in Dabaso for a high tide sunset. The walkway out through the mangroves is beautiful when the water is up underneath it, and the whole thing falls a bit flat over mud. Call ahead and ask them which sitting matches the tide that day, they will tell you honestly.', 'Klickenya local tip', 'tip', '🦀'),
    listingCard(LISTING.crabShack, 'Book Crab Shack Dabaso on Klickenya'),
    rich([
      { text: 'One rule that applies at every tide: never walk on live coral. At low water it is tempting to strike out across the reef, but coral takes decades to grow and moments to break. Stick to sand channels, wear reef shoes, and if you are unsure, follow the route a local guide takes. If you want sunset instead of sandbanks, our ' },
      { text: 'Watamu sunset spots guide', link: '/journal/watamu-sunset-spots-guide' },
      { text: ' has the timings.' },
    ]),
    img(IMG.activities, 'Kitesurfing kites and a dhow over shallow turquoise water in Watamu, Kenya', 'Sandbank walks need low tide, boats need high tide, kites want something in between'),

    // ── Seasons ────────────────────────────────────────────
    block('Seasons, rough seas and seaweed', 'h2'),
    block('Tides run on the Moon, but sea conditions run on the monsoon, and the two together decide what your beach day looks like. Watamu has two wind seasons and they change the water completely.'),
    budgetTable(
      ['Season', 'Months', 'Sea conditions', 'What it means for you'],
      [
        { label: 'Kaskazi, the dry high season', values: ['December to March', 'Calm, clear, warm, least seaweed', 'The best months for swimming, snorkelling and photography'] },
        { label: 'Long rains', values: ['April to June', 'Water can cloud up, occasional storms', 'Quietest and cheapest, some places close'] },
        { label: 'Kusi, the southeast monsoon', values: ['June to September or October', 'Rougher, cooler, windier, more seaweed', 'Great for kitesurfing, choose your beach carefully'] },
      ],
    ),
    block('Seaweed is the honest caveat. During the Kusi months sargassum washes up on the exposed beaches, worst around August and September, and how much arrives genuinely varies from year to year with the currents and the weather. It is not a reason to avoid the coast, it is a reason to pick the right beach.'),
    tip('Garoda is your seaweed season insurance. When the exposed north facing beaches are collecting weed from June to October, Garoda cove usually stays close to clean, which is why locals send visitors there in those months. Combine that with a midday low tide and you still get the postcard version of Watamu in the middle of the off season.', 'Klickenya local tip', 'tip', '🌿'),
    rich([
      { text: 'For the full season by season picture, including water temperature, what closes when and how prices move, read our ' },
      { text: 'best time to visit Watamu guide', link: '/journal/best-time-to-visit-watamu' },
      { text: '.' },
    ]),
    img(IMG.seasons, 'Windy sea and seaweed on a Kenyan coast beach during the Kusi monsoon', 'The monsoon seasons decide the sea state, the tide decides the shape of your day'),

    // ── Checking the tide ──────────────────────────────────
    block('How to check the tide before you go', 'h2'),
    rich([
      { text: 'Checking the tide takes about ten seconds and it will improve your holiday more than almost anything else you do. The most reliable daily predictions for this stretch of coast are the ' },
      { text: 'Malindi tide charts on Tide Forecast', link: TIDE_FORECAST },
      { text: ', which give high and low tide times, heights and the moon phase. ' },
      { text: 'Windfinder also publishes a Watamu tide page', link: WINDFINDER },
      { text: ', which is useful if you are watching the wind for kitesurfing at the same time.' },
    ]),
    block('One honest caveat about the numbers. Malindi is the nearest official tide station, and it is around nineteen kilometres up the coast from Watamu, so the published times drift slightly from what you will actually see on the sand. The difference is small, a matter of minutes rather than hours, but if you are planning a tight window around the very bottom of a spring low tide, give yourself a buffer either side rather than treating the chart as a stopwatch.'),
    distanceChips([
      { icon: '📊', label: 'Tide charts', value: 'Tide Forecast, Malindi station' },
      { icon: '💨', label: 'Wind and tide together', value: 'Windfinder Watamu' },
      { icon: '📹', label: 'See it live', value: 'Watamu Beach webcam and timelapse' },
      { icon: '📏', label: 'Nearest station', value: 'Malindi, about 19 km away' },
    ]),
    tip('The simplest local habit worth copying: check the tide the night before, not in the morning. If low tide lands at 11am you plan a sandbank day. If it lands at 6am you have a lazy breakfast, swim at midday and save the sandbank for the day after. Locals do not fight the tide, they just move the plan.', 'Klickenya local tip', 'tip', '📱'),
    listingCard(LISTING.jacaranda, 'See Jacaranda Beach on Klickenya'),
    img(IMG.checking, 'Tide chart and turquoise Kenyan coastline at low water', 'Check the chart the night before and build the day around it'),

    // ── FAQ ────────────────────────────────────────────────
    block('Tides in Watamu and the Kenyan coast: your questions answered', 'h2'),
    block('Why do tides change along the Kenyan coast?', 'h3'),
    block('Tides in Watamu and the rest of the Kenyan coastline change because of the gravitational pull of the Moon and the Sun combined with the rotation of the Earth. Those forces create alternating high and low tides roughly every six hours.'),
    block('How many tides happen each day in Watamu?', 'h3'),
    block('There are two high tides and two low tides every day. If the first high tide is around 6am, the next low tide falls close to midday, followed by another high tide around 6pm and another low tide near midnight. Each cycle also shifts about fifty minutes later the following day.'),
    block('What are spring and neap tides?', 'h3'),
    block('Spring tides happen around the new moon and the full moon, and they produce higher high tides and lower low tides. Neap tides happen around the quarter moons, when the difference between high and low water is smaller. Spring tides give you the biggest sandbanks in Watamu.'),
    block('How much does the water level change in Watamu?', 'h3'),
    block('The tide in Watamu and along most of the Kenyan coast varies by roughly one to three metres between low and high water. High tide usually sits around three to three and a half metres and low tide drops to about half a metre to one metre, with the biggest swings during spring tides.'),
    block('What is the best time of day to visit Watamu beaches?', 'h3'),
    block('A low to mid tide falling between about 10am and 3pm is ideal. That is when beaches like Jacaranda Bay and Garoda reveal their sandbanks and the shallow water turns bright turquoise, and the high sun gives you the best light for photographs.'),
    block('Are the tides safe for swimming in Watamu?', 'h3'),
    block('Generally yes. The Indian Ocean here is protected by the reef and the water is usually calm, so swimming is safe for most people. The exceptions are very low tide, when exposed coral and rock make swimming impractical and unsafe, and the mouth of Mida Creek at Short Beach, where the current runs strongly as the tide moves. Check the tide chart before you get in.'),
    block('How do tides affect snorkelling and kitesurfing?', 'h3'),
    block('Low tide is best for walking out to sandbanks and for shallow snorkelling close to shore, while mid to high tide is better for deeper swimming, boat based snorkelling trips and dhow excursions. Kitesurfers usually want low to mid tide, when the lagoons at Garoda and Jacaranda turn into flat water.'),
    block('How do the seasons affect tides in Kenya?', 'h3'),
    block('The tidal cycle itself does not change with the seasons, but sea conditions do. The Kusi monsoon from June to September and the long rains from April to June bring rougher seas and more seaweed. The dry Kaskazi season from December to March gives calmer, clearer water and the best beach conditions.'),
    block('Where can I find updated tide charts for Watamu?', 'h3'),
    rich([
      { text: 'Use the ' },
      { text: 'Malindi tide forecast', link: TIDE_FORECAST },
      { text: ', which is the nearest official station to Watamu and publishes daily high and low tide times, heights and moon phases. ' },
      { text: 'Windfinder', link: WINDFINDER },
      { text: ' has a Watamu tide page too. For a visual check, the ' },
      { text: 'Watamu Beach webcam timelapse', link: WEBCAM_TIMELAPSE },
      { text: ' shows you the day compressed into a clip.' },
    ]),
    block('Why should I plan my beach day around the tide?', 'h3'),
    block('Because the tide changes both how each beach looks and what you can do there. Jacaranda Bay is at its most beautiful at low tide for walking and photography, while Turtle Bay and Papa Remo are better at mid tide for swimming, and Mida Creek boat trips need high water. Checking the chart is the difference between seeing Watamu at its best and just missing it.'),

    // ── Close ──────────────────────────────────────────────
    pullQuote('In Watamu the tide is not weather, it is the timetable. Learn to read it and the coast opens up: sandbanks at midday, a swim in the afternoon, a boat into the creek at sunset.', 'teal'),
    rich([
      { text: 'Ready to plan around it? Browse ' },
      { text: 'things to do in Watamu', link: '/experiences/watamu' },
      { text: ', find somewhere to sleep in our ' },
      { text: 'best boutique hotels in Watamu guide', link: '/journal/best-boutique-hotels-watamu' },
      { text: ', and read the ' },
      { text: 'complete guide to Watamu', link: '/journal/complete-guide-watamu-kenya-2026' },
      { text: ' before you travel.' },
    ]),
  ]
}

/* ── Main ────────────────────────────────────────────────── */
async function main() {
  console.log('🌊 Seeding blog post: Tide Guide for Watamu and the Kenyan Coast\n')

  console.log('   uploading gradient placeholders...')
  const IMG = await uploadGradients()

  const doc = {
    _id: POST_ID,
    _type: 'blogPost',
    title: 'Tide Guide for Watamu and the Kenyan Coast: Why Timing the Ocean Matters',
    slug: { _type: 'slug', current: 'watamu-tide-guide' },
    status: 'published',
    author: { _type: 'reference', _ref: AUTHOR_ID },
    primaryCategory: 'beaches_coast',
    subcategory: 'practical_info',
    postType: 'guide',
    location: 'watamu',
    series: 'Watamu Beaches and Coast',
    focusKeyword: 'tides in watamu',
    seoTitle: 'Tide Guide for Watamu, Kenya: High and Low Tides 2026',
    seoDescription:
      'Everything about tides in Watamu and along the Kenyan coast: when to visit Jacaranda Bay and Garoda, how tides affect swimming, snorkelling and kitesurfing, and the best times for turquoise water.',
    excerpt:
      'A local guide to tides in Watamu and the Kenyan coast. How the tide works, spring versus neap, the best tide for every beach, how it changes snorkelling, kitesurfing and boat trips, and where to check the chart before you go.',
    readingTime: 10,
    publishedAt: '2026-08-15T09:00:00Z',
    keywords: [
      'tides in watamu',
      'watamu tide times',
      'watamu tide chart',
      'kenya coast tides',
      'low tide watamu',
      'high tide watamu',
      'watamu sandbank low tide',
      'jacaranda bay tide',
      'garoda beach tide',
      'spring tide neap tide kenya',
      'best time of day watamu beach',
      'watamu beach webcam',
    ],
    tags: ['Watamu', 'Beaches', 'Coast', 'Kenya', 'Travel Tips', 'Practical Info'],
    relatedListings: [
      { _type: 'reference', _key: key(), _ref: LISTING.garoda },
      { _type: 'reference', _key: key(), _ref: LISTING.jacaranda },
      { _type: 'reference', _key: key(), _ref: LISTING.midaCreek },
    ],
    coverImage: {
      _type: 'image',
      alt: 'Turquoise shallows and exposed sandbank at low tide in Watamu, Kenya',
      asset: { _type: 'reference', _ref: IMG.cover },
    },
    body: buildBody(IMG),
  }

  await client.createOrReplace(doc)
  console.log('\n✅ Published: /journal/watamu-tide-guide')
  console.log('   (Allow up to 60s for the site revalidate to reflect it.)')
  console.log('   Next: swap the gradient placeholders for real photos in Sanity Studio.')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
