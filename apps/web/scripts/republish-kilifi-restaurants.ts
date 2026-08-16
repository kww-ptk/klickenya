/**
 * Republish the Kilifi restaurant listings featured in the "Best Restaurants in Kilifi" blog.
 *
 * Why this exists: every Kilifi listing in Sanity is currently `status: "archived"`.
 * Archived listings are excluded from LISTING_SLUGS_QUERY, which feeds generateStaticParams
 * on /[type]/[city]/[slug], so their URLs do not resolve. The blog post links to them, so
 * they need to be published first or the post ships with dead links.
 *
 * Run locally (needs the Sanity WRITE token), BEFORE seeding the blog post:
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/republish-kilifi-restaurants.ts
 *
 * Scope: only the 9 venues featured in the blog. Every other archived Kilifi listing
 * (Distant Relatives, Nivas Supermarket, Maya Kobe, the yoga events, Apache Indian Cafe,
 * Bahari Pizza, Fayaz Bakery, Vegan Basket, Wild Living Cafe, Bofa Beach Resort) is left
 * archived on purpose. Add slugs here if you want more of them back.
 *
 * Safe to re-run. Prints the resulting URL for each listing so you can click through.
 */
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

const SLUGS = [
  'tribal-table',
  'indigo-vibe-cafe-kilifi',
  'saltys-beach-bar-kilifi',
  'saltys-on-the-creek-kilifi',
  'the-twisted-fig-kilifi',
  'the-food-movement-kilifi',
  'kilifi-boatyard',
  'village-dishes-kilifi',
  'mnarani-beach-club-kilifi',
]

const TYPE_TO_PLURAL: Record<string, string> = {
  stay: 'stays',
  experience: 'experiences',
  event: 'events',
  rental: 'rentals',
  service: 'services',
  restaurant: 'restaurants',
}

async function main() {
  console.log('🍽️  Republishing Kilifi restaurant listings\n')

  const docs: Array<{ _id: string; title: string; type: string; city: string; status: string; slug: string }> =
    await client.fetch(
      `*[_type == "listing" && slug.current in $slugs]{
        _id, title, type, city, status, "slug": slug.current
      }`,
      { slugs: SLUGS },
    )

  const found = new Set(docs.map((d) => d.slug))
  const missing = SLUGS.filter((s) => !found.has(s))
  if (missing.length) {
    console.log('⚠️  Not found in Sanity, skipping:')
    missing.forEach((s) => console.log(`   ${s}`))
    console.log('')
  }

  let changed = 0
  for (const doc of docs) {
    if (doc.status === 'published') {
      console.log(`   already published: ${doc.title}`)
      continue
    }
    await client.patch(doc._id).set({ status: 'published' }).commit()
    changed++
    console.log(`✓  published: ${doc.title} (was ${doc.status})`)
  }

  console.log(`\n✅ ${changed} listing(s) republished, ${docs.length - changed} already live.\n`)
  console.log('URLs now live:')
  for (const doc of docs) {
    const citySlug = doc.city.toLowerCase().replace(/\s+/g, '-')
    console.log(`   /${TYPE_TO_PLURAL[doc.type] ?? doc.type}/${citySlug}/${doc.slug}`)
  }
  console.log('\nNote: /[type]/[city]/[slug] is force-static with revalidate 3600, so allow')
  console.log('a little time (or redeploy) for the new static params to be picked up.')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
