import { createClient } from 'next-sanity'
import https from 'https'
import http from 'http'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

const RESTAURANTS: { slug: string; imageUrl: string; alt: string }[] = [
  {
    slug: 'ali-barbours-cave-restaurant-diani',
    imageUrl: 'https://www.alibarbours.co/images/slide1.jpg',
    alt: "Ali Barbour's Cave Restaurant — candlelit dining inside ancient coral cave",
  },
  {
    slug: 'nomad-beach-bar-restaurant-diani',
    imageUrl: 'https://www.nomad-beach-resort.com/wp-content/uploads/2022/01/FB_night_shot_1600.jpg',
    alt: 'Nomad Beach Bar & Restaurant — beachfront night setting with string lights',
  },
  {
    slug: 'sails-beach-bar-restaurant-diani',
    imageUrl: 'https://almanararesort.com/wp-content/uploads/2024-Almanara-Sails08.1.jpg',
    alt: 'Sails Beach Bar & Restaurant — iconic sail canopy beachfront dining',
  },
  {
    slug: 'leonardos-restaurant-diani',
    imageUrl: 'https://leonardos-restaurant-diani.com/img/IMG_5571-3.jpg',
    alt: "Leonardo's Restaurant — thatched roof bar and vibrant interior",
  },
  {
    slug: 'the-salty-squid-diani',
    imageUrl: 'https://www.dianirestaurants.com/storage/public/restaurants/323-the-salty-squid-beach-bar-restaurant/profile/gallery/421919647_961567002034285_2997164177145358981_n.jpg',
    alt: 'The Salty Squid — fresh seafood spread at the beach bar',
  },
]

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
  })
}

async function main() {
  console.log('📸 Uploading images for Diani restaurants\n')

  for (const r of RESTAURANTS) {
    console.log(`  📷 ${r.slug}`)

    // Get listing ID
    const id = await client.fetch(
      `*[_type == "listing" && slug.current == $slug][0]._id`,
      { slug: r.slug }
    )
    if (!id) {
      console.log('    ❌ Listing not found, skipping')
      continue
    }

    try {
      console.log(`    Downloading ${r.imageUrl.slice(0, 60)}...`)
      const buffer = await fetchBuffer(r.imageUrl)
      console.log(`    Downloaded ${(buffer.length / 1024).toFixed(0)} KB`)

      // Determine content type
      let contentType = 'image/jpeg'
      if (r.imageUrl.endsWith('.png')) contentType = 'image/png'
      if (r.imageUrl.endsWith('.webp')) contentType = 'image/webp'

      const asset = await client.assets.upload('image', buffer, {
        filename: r.slug + '.jpg',
        contentType,
      })
      console.log(`    Uploaded → ${asset._id}`)

      await client.patch(id).set({
        photos: [
          {
            _type: 'image',
            _key: Math.random().toString(36).slice(2, 12),
            alt: r.alt,
            asset: { _type: 'reference', _ref: asset._id },
          },
        ],
      }).commit()
      console.log('    ✅ Attached to listing\n')
    } catch (err: any) {
      console.log(`    ⚠️ Failed: ${err.message}\n`)
    }
  }

  console.log('✅ Done!')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
