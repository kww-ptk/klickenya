import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

/**
 * Move all listings with type "restaurant" → type "experience", subcategory "restaurants"
 * so they appear under Experiences → Restaurants on the site.
 */
async function main() {
  const restaurants: any[] = await client.fetch(
    '*[_type == "listing" && type == "restaurant"]{ _id, title }'
  )

  console.log(`🍽️  Moving ${restaurants.length} restaurant listings → experience/restaurants\n`)

  for (const r of restaurants) {
    try {
      await client.patch(r._id).set({ type: 'experience', subcategory: 'restaurants' }).commit()
      console.log(`  ✅ ${r.title}`)
    } catch (err) {
      console.error(`  ❌ ${r.title}: ${err}`)
    }
  }

  console.log(`\n✅ Done — ${restaurants.length} listings updated`)
}

main().catch((err) => {
  console.error('❌ Script failed:', err)
  process.exit(1)
})
