/**
 * Reorder the "7 Best Beaches in Watamu" blog post.
 *
 * Fetches the LIVE published blogPost from Sanity, reorders the 7 beach
 * sections into the new sequence, renumbers the headings, reorders the
 * "at a glance" comparison table to match, injects a Google Maps link
 * under each beach, and refreshes the title + SEO fields.
 *
 * The script is idempotent — running it twice produces the same result.
 *
 * Usage (run locally — this environment cannot reach api.sanity.io to write):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/reorder-beaches-blog.ts --dry   # preview, no write
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/reorder-beaches-blog.ts         # commit
 */

import { createClient } from 'next-sanity'

const SLUG = '7-best-beaches-watamu-kenya'
const DRY = process.argv.includes('--dry')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

/* ── Desired order + per-beach metadata ─────────────────────────────
 * headingKw   — unique lowercase substring found in the section H2
 * rowKw       — unique lowercase substring found in the glance-table row label
 * mapName     — link text
 * mapsQuery   — Google Maps search query
 */
type Beach = {
  id: string
  headingKw: string
  rowKw: string
  mapName: string
  mapsQuery: string
}

const ORDER: Beach[] = [
  { id: 'garoda',   headingKw: 'garoda beach', rowKw: 'garoda',     mapName: 'Garoda Beach',      mapsQuery: 'Garoda Beach, Watamu, Kenya' },
  { id: 'papa',     headingKw: 'papa remo',    rowKw: 'papa',       mapName: 'Papa Remo Beach',   mapsQuery: 'Papa Remo Beach, Watamu, Kenya' },
  { id: 'turtle',   headingKw: 'turtle bay',   rowKw: 'turtle',     mapName: 'Turtle Bay Beach',  mapsQuery: 'Turtle Bay Beach, Watamu, Kenya' },
  { id: 'jacaranda',headingKw: 'jacaranda',    rowKw: 'jacaranda',  mapName: 'Jacaranda Bay',     mapsQuery: 'Jacaranda Bay, Watamu, Kenya' },
  { id: 'ocean',    headingKw: 'ocean breeze', rowKw: 'ocean',      mapName: 'Ocean Breeze Beach',mapsQuery: 'Ocean Breeze Beach, Watamu, Kenya' },
  { id: 'watamubay',headingKw: 'watamu bay',   rowKw: 'watamu bay', mapName: 'Watamu Bay Beach',  mapsQuery: 'Watamu Bay Beach, Watamu, Kenya' },
  { id: 'short',    headingKw: 'short beach',  rowKw: 'short',      mapName: 'Short Beach',       mapsQuery: 'Short Beach, Watamu, Kenya' },
]

/* ── Title + SEO refresh ─────────────────────────────────────────── */
const NEW_TITLE = "The 7 Best Beaches in Watamu, Kenya (2026): A Local's Guide to Sandbanks, Sunsets & Hidden Gems"
const NEW_SEO_TITLE = '7 Best Beaches in Watamu, Kenya (2026 Local Guide)'
const NEW_SEO_DESCRIPTION =
  "The 7 best beaches in Watamu, Kenya, from Garoda's seaweed-free sandbanks to Short Beach's sunset cove — a local's 2026 guide with tide and seaweed timing."

/* ── Helpers ─────────────────────────────────────────────────────── */
type Block = Record<string, any>

function headingText(b: Block): string {
  if (b?._type !== 'block' || b?.style !== 'h2') return ''
  return (b.children || []).map((c: any) => c.text || '').join('')
}

function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function mapLinkBlock(beach: Beach): Block {
  const linkKey = `mlk-${beach.id}`
  return {
    _type: 'block',
    _key: `maplink-${beach.id}`,
    style: 'normal',
    markDefs: [{ _type: 'link', _key: linkKey, href: mapsUrl(beach.mapsQuery), blank: true }],
    children: [
      { _type: 'span', _key: `mls1-${beach.id}`, text: '📍 ', marks: [] },
      { _type: 'span', _key: `mls2-${beach.id}`, text: `Open ${beach.mapName} in Google Maps`, marks: [linkKey] },
    ],
  }
}

async function main() {
  const doc = await client.fetch<Block | null>(
    `*[_type == "blogPost" && slug.current == $slug][0]{ _id, title, seoTitle, seoDescription, body }`,
    { slug: SLUG }
  )
  if (!doc) throw new Error(`Post not found for slug "${SLUG}"`)

  const body: Block[] = doc.body || []

  // 1. Locate the beach region: first beach heading → "Timing the tides" heading.
  const h2Indices = body
    .map((b, i) => (b?._type === 'block' && b.style === 'h2' ? i : -1))
    .filter((i) => i >= 0)

  const endIdx = h2Indices.find((i) => headingText(body[i]).toLowerCase().includes('timing the tides'))
  if (endIdx === undefined) throw new Error('Could not find the "Timing the tides" section boundary')

  const startIdx = h2Indices.find((i) => {
    const t = headingText(body[i]).toLowerCase()
    return ORDER.some((b) => t.includes(b.headingKw))
  })
  if (startIdx === undefined) throw new Error('Could not find the first beach section')

  const sectionStarts = h2Indices.filter((i) => i >= startIdx && i < endIdx)
  if (sectionStarts.length !== ORDER.length) {
    throw new Error(`Expected ${ORDER.length} beach sections, found ${sectionStarts.length}`)
  }

  // 2. Slice each section into its own block list, keyed by beach id.
  const sections = new Map<string, Block[]>()
  sectionStarts.forEach((start, idx) => {
    const stop = idx + 1 < sectionStarts.length ? sectionStarts[idx + 1] : endIdx
    const slice = body.slice(start, stop)
    const t = headingText(body[start]).toLowerCase()
    const beach = ORDER.find((b) => t.includes(b.headingKw))
    if (!beach) throw new Error(`Unrecognised beach heading: "${headingText(body[start])}"`)
    if (sections.has(beach.id)) throw new Error(`Duplicate match for beach ${beach.id}`)
    sections.set(beach.id, slice)
  })

  // 3. Rebuild the region in the desired order: renumber heading, refresh map link.
  const newRegion: Block[] = []
  ORDER.forEach((beach, i) => {
    const slice = sections.get(beach.id)!
    // Renumber the H2 heading (strip any leading "N. " then prefix new number).
    const heading = slice[0]
    const span = heading.children[0]
    span.text = `${i + 1}. ${span.text.replace(/^\s*\d+\.\s*/, '')}`

    // Drop any previously-inserted map link, then re-insert after the quickFactsBlock.
    let rebuilt = slice.filter((b) => b._key !== `maplink-${beach.id}`)
    const qfIdx = rebuilt.findIndex((b) => b._type === 'quickFactsBlock')
    const insertAt = qfIdx >= 0 ? qfIdx + 1 : 1
    rebuilt = [...rebuilt.slice(0, insertAt), mapLinkBlock(beach), ...rebuilt.slice(insertAt)]
    newRegion.push(...rebuilt)
  })

  // 4. Reorder the "at a glance" comparison table rows to match the new order.
  const table = body.find(
    (b) => b._type === 'budgetTableBlock' && Array.isArray(b.columns) && String(b.columns[0]).toLowerCase() === 'beach'
  )
  if (table) {
    const pool: Block[] = [...table.rows]
    const reordered: Block[] = []
    for (const beach of ORDER) {
      const idx = pool.findIndex((r) => String(r.label).toLowerCase().includes(beach.rowKw))
      if (idx >= 0) reordered.push(pool.splice(idx, 1)[0])
    }
    reordered.push(...pool) // safety: keep any unmatched rows
    table.rows = reordered
  }

  // 5. Reassemble the full body.
  const newBody = [...body.slice(0, startIdx), ...newRegion, ...body.slice(endIdx)]

  // ── Report ──
  console.log('New section order:')
  ORDER.forEach((b) => console.log(`  ${headingText(sections.get(b.id)![0])}`))
  console.log('\nGlance table order:', table ? table.rows.map((r: Block) => r.label).join(' → ') : '(no table)')
  console.log('\nTitle    :', NEW_TITLE)
  console.log('seoTitle :', NEW_SEO_TITLE, `(${NEW_SEO_TITLE.length} chars)`)
  console.log('seoDesc  :', NEW_SEO_DESCRIPTION, `(${NEW_SEO_DESCRIPTION.length} chars)`)
  console.log(`\nBody blocks: ${body.length} → ${newBody.length} (map links added: ${ORDER.length})`)

  if (DRY) {
    console.log('\n[--dry] No changes committed.')
    return
  }

  await client
    .patch(doc._id)
    .set({ title: NEW_TITLE, seoTitle: NEW_SEO_TITLE, seoDescription: NEW_SEO_DESCRIPTION, body: newBody })
    .commit()

  console.log(`\n✓ Committed to ${doc._id}. Live page revalidates within 60s (ISR).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
