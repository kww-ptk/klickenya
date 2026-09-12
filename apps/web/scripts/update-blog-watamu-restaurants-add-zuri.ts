/**
 * Add Zuri Restaurant at position 3 of the Watamu restaurants guide, renumber
 * everything below it, and refresh the post.
 *
 * Post: /journal/best-restaurants-watamu-kenya  (_id blog-best-restaurants-watamu)
 *
 * This is a PATCH of one existing document, not a reseed. It reads the current
 * body, splices the new entry in, renumbers the h2 headings and writes it back,
 * so any edits made in Studio since the original seed survive.
 *
 * Facts are taken from the venue's own page at https://tribalsand.com/zuri-restaurant
 * (read 10 Sep 2026), not invented:
 *   - Garoda Beach, Watamu; inside Zuri Boutique Hotel, part of the Tribal Sand group
 *   - newly open to the public rather than residents only
 *   - reservation only, intimate seating on a private beachfront terrace
 *   - coastal à la carte; seafood off the Watamu boats, produce from farms on the
 *     Kilifi road, Swahili spicing (tamarind, coconut, cardamom, lime)
 *   - short menu that changes with the day's catch
 *   - lunch relaxed by the pool, dinner candlelit near the sand
 *   - bookings confirmed within 24 hours, no payment taken at request stage
 * No prices are quoted because the venue does not publish any.
 *
 * Zuri Boutique Hotel is already a published Klickenya listing, so the entry
 * carries a real inlineListingBlock rather than only an outbound link.
 *
 * Counts fixed while here: title said 18, seoTitle said 17. Both now say 19.
 *
 * Run:
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/update-blog-watamu-restaurants-add-zuri.ts --dry
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/update-blog-watamu-restaurants-add-zuri.ts
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

const POST_ID = 'blog-best-restaurants-watamu'
const ZURI_HOTEL_LISTING = '3fVk255H0aipQzY5mJQoLw'   // Zuri Boutique Hotel, published
const ZURI_URL = 'https://tribalsand.com/zuri-restaurant'

/* Verified Sanity assets — both opened and checked. Neither is captioned as
 * the dining terrace, because neither shows a laid table. */
const IMG = {
  terrace: 'image-4c459d12c3777b07c5df36ab4c1b6ba61dc50fa1-1600x900-jpg',   // open terrace over the pool
  pool: 'image-8cf64305022e7da3ede43b67a4afefed1a64e938-1600x1067-jpg',     // pool and palms
}

let n = 0
const key = (p = 'z') => `${p}${++n}`
type B = Record<string, any>

const block = (text: string, style = 'normal', listItem?: string): B => ({
  _type: 'block', _key: key('b'), style, markDefs: [],
  ...(listItem ? { listItem, level: 1 } : {}),
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

/* ── The new entry, matching the house pattern used by every other entry:
   h2 · quickFacts · paragraphs · photoRow · h3 What to order · bullets ·
   inlineListing · tipCard ── */
const zuriEntry: B[] = [
  block('3. Zuri Restaurant', 'h2'),

  {
    _type: 'quickFactsBlock', _key: key('qf'), accentColor: 'amber',
    items: [
      { _key: key('qfi'), _type: 'object', icon: '🍴', label: 'Cuisine', value: 'Coastal à la carte, seafood led' },
      { _key: key('qfi'), _type: 'object', icon: '💰', label: 'Price', value: 'High' },
      { _key: key('qfi'), _type: 'object', icon: '✨', label: 'Vibe', value: 'Intimate, exclusive, occasion dining' },
      { _key: key('qfi'), _type: 'object', icon: '📍', label: 'Location', value: 'Garoda Beach, Watamu' },
    ],
  },

  rich([
    { text: 'Zuri is the newest serious opening in Watamu and the hardest table in town to walk into, because you cannot. ' },
    { text: 'The beachfront kitchen at ', },
    { text: 'Zuri', link: ZURI_URL },
    { text: ', the six suite boutique hotel on Garoda Beach, has only recently opened to people who are not staying there, and it takes guests by reservation only. That is not gatekeeping for its own sake. The terrace seats a handful of tables, so the room stays quiet in a way almost nothing else on this coast manages.' },
  ]),

  block('The cooking is coastal and deliberately short. Seafood comes off the Watamu boats, vegetables and fruit come from farms along the Kilifi road, and the spicing is the Swahili register the coast has used for centuries: tamarind, coconut, cardamom, lime. The à la carte menu shifts with what the day actually landed, which is why there is not much on it and why what is on it is cooked properly.'),

  block('Lunch is the relaxed version, served by the pool with the garden around you and no particular need for shoes. Dinner is the other thing entirely: candlelit, steps from the sand, and quiet enough to hear the water. It has become the Watamu booking people make for anniversaries, birthdays and last nights of a holiday, which tells you most of what you need to know about the setting.'),

  {
    _type: 'photoRowBlock', _key: key('pr'), layout: 'cols-2',
    caption: 'Zuri, Garoda Beach',
    photos: [
      { _type: 'image', _key: key('pri'), alt: 'Open terrace looking over the pool and garden at Zuri, Garoda Beach Watamu', aspectRatio: 'wide', asset: { _type: 'reference', _ref: IMG.terrace } },
      { _type: 'image', _key: key('pri'), alt: 'The pool and palms at Zuri on Garoda Beach, Watamu', aspectRatio: 'wide', asset: { _type: 'reference', _ref: IMG.pool } },
    ],
  },

  block('What to order', 'h3'),
  block('Whatever came off the boat that morning', 'normal', 'bullet'),
  block('The short à la carte, which changes daily', 'normal', 'bullet'),
  block('Swahili spiced seafood, tamarind and coconut', 'normal', 'bullet'),
  block('A long relaxed lunch by the pool', 'normal', 'bullet'),
  block('Dinner on the terrace, booked well ahead', 'normal', 'bullet'),

  {
    _type: 'inlineListingBlock', _key: key('il'),
    label: 'See Zuri Boutique Hotel on Klickenya',
    listing: { _type: 'reference', _ref: ZURI_HOTEL_LISTING },
  },

  {
    _type: 'tipCardBlock', _key: key('tc'), variant: 'teal', icon: '📍',
    label: 'Klickenya tip',
    text: 'Reservation only means exactly that, and the tables are few. Request one well before you want it, ideally before you fly, and say what you are marking if it is an occasion. Bookings are confirmed within about 24 hours and nothing is charged at the request stage.',
  },
]

async function main() {
  const doc = await client.getDocument(POST_ID)
  if (!doc) throw new Error(`${POST_ID} not found`)

  const body: B[] = [...(doc.body as B[])]
  if (body.some((b) => b._type === 'block' && (b.children ?? []).some((c: any) => /Zuri Restaurant/.test(c.text ?? '')))) {
    console.log('⚠ Zuri already present — nothing to do. Aborting so a re-run cannot duplicate it.')
    return
  }

  /* 1. Renumber existing entries 3 and above, so 3..18 become 4..19. */
  let renumbered = 0
  for (const b of body) {
    if (b._type !== 'block' || b.style !== 'h2') continue
    const span = (b.children ?? [])[0]
    const m = /^(\d+)\.\s+(.*)$/.exec(span?.text ?? '')
    if (!m) continue
    const num = Number(m[1])
    if (num >= 3) {
      span.text = `${num + 1}. ${m[2]}`
      renumbered += 1
    }
  }

  /* 2. Splice Zuri in ahead of what is now entry 4. */
  const insertAt = body.findIndex(
    (b) => b._type === 'block' && b.style === 'h2' && /^4\.\s/.test((b.children ?? [])[0]?.text ?? ''),
  )
  if (insertAt < 0) throw new Error('Could not locate entry 4 after renumbering')
  body.splice(insertAt, 0, ...zuriEntry)

  const patch = {
    body,
    title: '19 Best Restaurants in Watamu (2026): Seafood, Italian, Swahili Food, Pizza and Sunset Spots',
    seoTitle: '19 Best Restaurants in Watamu 2026: Seafood, Italian & Pizza',
    seoDescription:
      'The honest local guide to the best restaurants in Watamu: seafood, Italian food, Swahili dishes, pizza, cafés, cocktails, beach bars and sunset spots. Updated September 2026.',
    readingTime: 16,
  }

  console.log(`📝 ${doc.title}`)
  console.log(`   entries renumbered : ${renumbered}  (3..18 → 4..19)`)
  console.log(`   Zuri inserted at   : block index ${insertAt} as entry 3`)
  console.log(`   body blocks        : ${(doc.body as B[]).length} → ${body.length}`)
  console.log(`   title              : 18 → 19`)
  console.log(`   seoTitle           : 17 → 19  (was already out of sync)`)

  if (DRY) {
    console.log('\n   new heading order:')
    body.filter((b) => b._type === 'block' && b.style === 'h2')
      .forEach((b) => console.log('     ' + ((b.children ?? [])[0]?.text ?? '')))
    console.log('\nDry run. Re-run without --dry to apply.')
    return
  }

  await client.patch(POST_ID).set(patch).commit()
  console.log('\n✅ Updated: https://www.klickenya.com/journal/best-restaurants-watamu-kenya')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
