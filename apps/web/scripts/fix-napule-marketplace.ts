/**
 * One-off fix: make the existing Napul'è Restaurant listing appear on the main
 * klickenya.com marketplace.
 *
 * It is a partner listing (partner: "Napulè Restaurant") with publishToMarketplace
 * unset, so the marketplace filter (!defined(partner) || publishToMarketplace == true)
 * was hiding it. This sets publishToMarketplace = true, which keeps the partner
 * storefront working AND surfaces it on the marketplace.
 *
 * Run:
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/fix-napule-marketplace.ts
 */
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

async function main() {
  const target = await client.fetch(
    `*[_type == "listing" && slug.current == "napul-restaurant"][0]{ _id, title, publishToMarketplace, "hasPartner": defined(partner) }`
  )
  if (!target?._id) {
    console.error('❌ Napul\'è listing (slug: napul-restaurant) not found')
    process.exit(1)
  }
  console.log(`Found: ${target.title} (${target._id})`)
  console.log(`  hasPartner=${target.hasPartner}  publishToMarketplace=${target.publishToMarketplace}`)

  await client.patch(target._id).set({ publishToMarketplace: true }).commit()

  const check = await client.fetch(
    `*[_type == "listing" && slug.current == "napul-restaurant" && (!defined(partner) || publishToMarketplace == true)][0]{ title, publishToMarketplace, status }`
  )
  console.log('✅ Updated. Now passes the marketplace filter:', JSON.stringify(check))
  console.log('   (Allow up to 60s for the site revalidate to reflect it.)')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
