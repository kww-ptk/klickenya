import { createClient } from 'next-sanity'

const c = createClient({
  projectId: 'b9zd8u9f', dataset: 'production', apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!, useCdn: false,
})

function k() { return Math.random().toString(36).slice(2, 12) }

async function upload(url: string, name: string, alt: string) {
  const r = await fetch(url)
  if (r.status !== 200) { console.log(`  FAIL ${name} ${r.status}`); return null }
  const buf = Buffer.from(await r.arrayBuffer())
  const a = await c.assets.upload('image', buf, { filename: name })
  return { _type: 'image', _key: k(), asset: { _type: 'reference', _ref: a._id }, alt }
}

const items: [string, string, string, string][] = [
  ['visiwa-beach-resort', 'https://www.visiwawatamu.com/wp-content/uploads/2025/07/visiwa_beach_resort_watamu_food.jpg', 'visiwa-food.jpg', 'Visiwa restaurant food Watamu'],
  ['visiwa-beach-resort', 'https://www.visiwawatamu.com/wp-content/uploads/2025/09/Visiwaresort_restaurant.jpg', 'visiwa-restaurant.jpg', 'Visiwa beachfront restaurant'],
  ['ocean-sports-restaurant', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80', 'ocean-sports-dining.jpg', 'Ocean Sports restaurant deck Watamu'],
  ['tamu-beach-bar-restaurant', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80', 'tamu-restaurant.jpg', 'Tamu Beach Bar restaurant Watamu'],
  ['kobe-suite-resort-restaurant', 'https://www.kobesuiteresort.com/wp-content/uploads/2019/06/Garden_01.jpg', 'kobe-resort.jpg', 'Kobe Suite Resort garden Watamu'],
  ['papa-remo-beach', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80', 'papa-remo.jpg', 'Papa Remo Beach Club Watamu'],
]

async function main() {
  console.log('📸 Uploading images for 5 restaurants...\n')

  for (const [slug, url, name, alt] of items) {
    console.log(`  → ${slug} : ${name}`)
    const docs = await c.fetch(`*[_type == "listing" && slug.current == $slug]{ _id }`, { slug })
    if (docs.length === 0) { console.log('    SKIP: not found'); continue }

    const img = await upload(url, name, alt)
    if (img === null) continue

    await c.patch(docs[0]._id).setIfMissing({ photos: [] }).append('photos', [img]).commit()
    console.log('    ✅')
  }

  console.log('\n✅ Done!')
}

main().catch(err => { console.error('❌', err); process.exit(1) })
