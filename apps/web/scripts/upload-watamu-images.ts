/**
 * Attach images to the 15 Watamu restaurant listings created by add-watamu-restaurants.ts.
 *
 * Run locally AFTER add-watamu-restaurants.ts:
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/upload-watamu-images.ts
 *
 * Each URL is downloaded and uploaded to Sanity as an asset, then set on the listing's
 * `photos` array. Failures are logged and skipped (they won't abort the run).
 *
 * ⚠️ Restaurants with NO usable public image URL are listed in NO_IMAGES below — add
 *    photos for these manually in Sanity Studio (grab them from the source pages noted).
 *    Sources without a file extension (Wanderlog/evendo) are direct image endpoints;
 *    the redirect-following fetch handles them, but eyeball the result after import.
 */
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

type ImageSpec = { url: string; alt: string }

const RESTAURANTS: { slug: string; images: ImageSpec[] }[] = [
  {
    slug: 'pilipan-restaurant-watamu',
    images: [
      { url: 'https://images.squarespace-cdn.com/content/v1/5a17d9c62278e73e3d588826/1514640406508-AOW1P96D0SVNQTFL8131/Pilipan-view.jpg', alt: 'Pilipan Restaurant open-air deck and creek view, Watamu' },
      { url: 'https://images.squarespace-cdn.com/content/v1/5a17d9c62278e73e3d588826/1514640375829-N7RD7W1ABY9QLSI3HZD7/Pilipan_1.jpg', alt: 'Pilipan Restaurant setting, Watamu' },
      { url: 'https://images.squarespace-cdn.com/content/v1/5a17d9c62278e73e3d588826/1514640375168-PSAB94IGAHW9ZWIYB0H7/Pilipan-table.jpg', alt: 'Table setting at Pilipan Restaurant, Watamu' },
    ],
  },
  {
    slug: 'prawns-lake-watamu',
    images: [
      { url: 'https://itin-dev.wanderlogstatic.com/freeImage/Jupc9m78Y0LC2XfBTKNjypKTeNgOcbEC', alt: "Prawn's Lake seafood and lakeside setting, Watamu" },
    ],
  },
  {
    slug: 'makuti-ristorante-pizzeria-watamu',
    images: [
      { url: 'https://www.watamurestaurants.com/storage/public/restaurants/421-makuti-restaurant-pizzeria-watamu/profile/gallery/makuti-ristorante-pizzeria.jpg', alt: 'Makuti Ristorante Pizzeria exterior, Watamu' },
      { url: 'https://www.watamurestaurants.com/storage/public/restaurants/421-makuti-restaurant-pizzeria-watamu/profile/gallery/MAKUTI_3.jpg', alt: 'Makuti Ristorante Pizzeria dining area, Watamu' },
      { url: 'https://www.watamurestaurants.com/storage/public/restaurants/421-makuti-restaurant-pizzeria-watamu/profile/gallery/makuti-ristorante-pizzeria__1_.jpg', alt: 'Makuti Ristorante Pizzeria food and interior, Watamu' },
    ],
  },
  {
    slug: 'kokomo-beach-bar-restaurant-watamu',
    images: [
      { url: 'https://media.evendo.com/locations-resized/RestaurantImages/1200x886/302f0e7d-619c-41e1-9914-3be721e17e41', alt: 'Kokomo Beach Bar & Restaurant beachfront setting, Watamu' },
    ],
  },
  {
    slug: 'lichthaus-watamu',
    images: [
      { url: 'https://itin-dev.wanderlogstatic.com/freeImage/rMnzG1yBPy1ojvogGAo9udvI4tnwWW6R', alt: 'Lichthaus over-water setting at Mida Creek, Watamu' },
      { url: 'https://itin-dev.wanderlogstatic.com/freeImage/DLPmIjrGhiPZg2Ettd2ZAaYlwBDxnKZ1', alt: 'Lichthaus food and ambiance, Watamu' },
    ],
  },
  {
    slug: 'la-rosticceria-watamu',
    images: [
      { url: 'https://itin-dev.wanderlogstatic.com/freeImage/nkozibTNBfGLK72De5j7qAhHR25irxYI', alt: 'La Rosticceria dish, Watamu' },
      { url: 'https://itin-dev.wanderlogstatic.com/freeImage/AikhSVZWsYN8jmMTN0Q6oTnM6IN4iBP0', alt: 'La Rosticceria food, Watamu' },
    ],
  },
  {
    slug: 'the-rock-and-sea-watamu',
    images: [
      { url: 'https://static.wixstatic.com/media/1a25ba_77b1eb4226414218a19a8154b79b67ac~mv2.jpg', alt: 'The Rock and Sea panoramic clifftop restaurant, Watamu' },
      { url: 'https://static.wixstatic.com/media/1a25ba_597ac2fc1768485983fd14176289e01d~mv2.jpg', alt: 'Sea and creek views from The Rock and Sea, Watamu' },
      { url: 'https://static.wixstatic.com/media/1a25ba_7a9c991c72ff47bc8f3337195bead87e~mv2.jpg', alt: 'The Rock and Sea eco-lodge setting, Watamu' },
    ],
  },
  // Draft venue — kept here in case you confirm it and want a hero image:
  {
    slug: 'non-solo-padel-watamu',
    images: [
      { url: 'http://www.goplacesdigital.com/wp-content/uploads/2023/07/Padel-Outside-1.jpeg', alt: 'Padel courts and clubhouse at Non Solo Padel, Watamu' },
      { url: 'http://www.goplacesdigital.com/wp-content/uploads/2023/07/Padel-Pizza.jpeg', alt: 'Wood-fired pizza at Non Solo Padel, Watamu' },
      { url: 'http://www.goplacesdigital.com/wp-content/uploads/2022/07/Pasta--819x1024.jpg', alt: 'Italian pasta dish at Non Solo Padel, Watamu' },
    ],
  },
]

/**
 * ⚠️ NO usable public image URL was found for these — add photos manually in Studio.
 *   tortuga-beach-bar-watamu   → Instagram @tortuga_bar_garodawatamu / @tortugabeachh
 *   african-footprint-watamu   → TripAdvisor "African Footprint" Watamu photos
 *   swahili-cafe-watamu        → facebook.com/SwahiliCafe / TripAdvisor
 *   the-musafir-watamu         → Instagram @themusafir_watamu / Temple Point FB
 *   theos-pizza-watamu         → (draft — venue unconfirmed)
 *   napule-watamu              → (draft — venue unconfirmed)
 *   sette-vizi-watamu          → (draft — venue unconfirmed)
 */

function fetchBuffer(url: string, redirects = 0): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'))
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString()
        return fetchBuffer(next, redirects + 1).then(resolve).catch(reject)
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
    req.setTimeout(20000, () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
  })
}

function contentTypeFor(url: string): string {
  const u = url.toLowerCase()
  if (u.endsWith('.png')) return 'image/png'
  if (u.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

async function main() {
  console.log('📸 Uploading images for Watamu restaurants\n')

  for (const r of RESTAURANTS) {
    console.log(`  📷 ${r.slug}`)

    const id = await client.fetch(
      `*[_type == "listing" && slug.current == $slug][0]._id`,
      { slug: r.slug }
    )
    if (!id) {
      console.log('    ❌ Listing not found, skipping\n')
      continue
    }

    const photos: any[] = []
    for (const img of r.images) {
      try {
        console.log(`    ↓ ${img.url.slice(0, 70)}...`)
        const buffer = await fetchBuffer(img.url)
        console.log(`      ${(buffer.length / 1024).toFixed(0)} KB`)
        const asset = await client.assets.upload('image', buffer, {
          filename: `${r.slug}-${photos.length + 1}.jpg`,
          contentType: contentTypeFor(img.url),
        })
        photos.push({
          _type: 'image',
          _key: Math.random().toString(36).slice(2, 12),
          alt: img.alt,
          asset: { _type: 'reference', _ref: asset._id },
        })
        console.log(`      ✅ uploaded → ${asset._id}`)
      } catch (err: any) {
        console.log(`      ⚠️  failed: ${err.message}`)
      }
    }

    if (!photos.length) {
      console.log('    ⚠️  No images uploaded for this listing\n')
      continue
    }

    await client.patch(id).set({ photos }).commit()
    console.log(`    ✅ Attached ${photos.length} photo(s)\n`)
  }

  console.log('✅ Done!')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
