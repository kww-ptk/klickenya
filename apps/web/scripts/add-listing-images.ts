import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

function key() {
  return Math.random().toString(36).slice(2, 12)
}

async function uploadImageFromUrl(url: string, filename: string): Promise<any> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*,*/*',
        'Referer': new URL(url).origin,
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 5000) throw new Error(`Too small (${buffer.length} bytes) — likely not a real image`)
    const asset = await client.assets.upload('image', buffer, { filename })
    return {
      _type: 'image',
      _key: key(),
      asset: { _type: 'reference', _ref: asset._id },
      alt: filename.replace(/[-_]/g, ' ').replace(/\.\w+$/, ''),
    }
  } catch (e: any) {
    console.warn(`      ⚠ Failed: ${filename} — ${e.message}`)
    return null
  }
}

// Map: slug → image URLs to try (in order of preference)
const LISTING_IMAGES: Record<string, { urls: string[]; alts: string[] }> = {
  // ── BATCH 3: New listings ──
  'rock-and-sea-watamu': {
    urls: [
      'https://www.safari-center.com/wp-content/uploads/2022/06/1a25ba_0a523e58c6324c87b46ce48f55d1e6d1mv2.jpeg',
      'https://www.safari-center.com/wp-content/uploads/2022/06/1a25ba_558124bc7dcf4dec86f258c45836c074mv2-e1655217751802.jpeg',
    ],
    alts: ['Rock and Sea bubble dome overlooking Mida Creek', 'Rock and Sea infinity pool and coral cliff'],
  },
  'non-solo-gelato-watamu': {
    urls: [
      'https://itin-dev.wanderlogstatic.com/freeImage/b6d841YQi9NW5gOvFDfDFKXquaud482D',
      'https://itin-dev.wanderlogstatic.com/freeImage/IRdC23tvdmm2FWcDGGSVbhwizqn6fKFa',
    ],
    alts: ['Non Solo Gelato storefront Watamu', 'Non Solo Gelato display'],
  },
  'palm-garden-spa-watamu': {
    urls: [
      'https://images.squarespace-cdn.com/content/v1/613dd349de5d7c41e779933c/93a976d4-bd0e-436d-b5c8-4f342caaf214/Palm+Garden+Client+4+Massage.jpg',
      'https://images.squarespace-cdn.com/content/v1/613dd349de5d7c41e779933c/d95e2893-0281-4917-b6b0-157ada4c7b9b/Palm_Garden_watamu_1.jpg',
    ],
    alts: ['Palm Garden Spa massage treatment', 'Palm Garden tropical garden and pool'],
  },
  'isla-cafe-watamu': {
    urls: [
      'https://klickenya.com/wp-content/uploads/2025/11/Watamu-Beach-Bay-mapango-beach-520x397.webp',
    ],
    alts: ['The Isla Cafe Watamu'],
  },
  'non-solo-pane-watamu': {
    urls: [
      'https://img5.bakerias.com/741/236/1213859167412364.jpg',
      'https://img5.bakerias.com/501/913/1204458145019133.jpg',
    ],
    alts: ['Non Solo Pane bakery interior', 'Non Solo Pane fresh pastries'],
  },
  'aqua-ventures-watamu': {
    urls: [
      'https://www.watamumarine.co.ke/my_uploads/2017/09/marine.jpg',
    ],
    alts: ['Aqua Ventures diving in Watamu Marine Park'],
  },
  'crab-shack-dabaso-watamu': {
    urls: [
      'https://www.watamurestaurants.com/storage/public/restaurants/441-crab-shack-dabaso-mida-creek-restaurant-watamu/profile/gallery/crab-shack-1-3.jpg',
      'https://comewithmeonabudget.travel.blog/wp-content/uploads/2020/12/20201125_1615346549618067790146985.jpg',
    ],
    alts: ['Crab Shack Dabaso on Mida Creek', 'Crab Shack mangrove boardwalk'],
  },
  'local-ocean-conservation-watamu': {
    urls: [
      'https://localocean.co/wp-content/uploads/2019/05/WEBSITE-HERO-IMAGE-No-Lockup.jpg',
      'https://localocean.co/wp-content/uploads/2018/11/HP-EcoVisits.jpg',
    ],
    alts: ['Local Ocean Conservation sea turtle release', 'Local Ocean Conservation eco visit'],
  },
  'watamu-marine-national-park': {
    urls: [
      'https://www.watamumarine.co.ke/my_uploads/2017/09/marine.jpg',
      'https://www.watamumarine.co.ke/my_uploads/2017/09/marine_7-458x425.jpg',
    ],
    alts: ['Watamu Marine National Park coral reef', 'Watamu Marine Park underwater'],
  },

  // ── BATCH 2: Hotels, services, events ──
  'new-carrefour-supermarket-watamu': {
    urls: [
      'https://www.malindikenya.net/images/uploads/articoli/7304_l.jpg',
    ],
    alts: ['New Carrefour Supermarket Watamu'],
  },
  'nivas-supermarket-kilifi': {
    urls: [
      'https://naivas.info/wp-content/uploads/2022/08/naivas-locations-1.jpg',
    ],
    alts: ['Naivas Supermarket Kilifi'],
  },
  'zuri-boutique-hotel-watamu': {
    urls: [
      'https://tribalsand.com/images/zuri-hero.webp',
      'https://tribalsand.com/images/zuri/Pool/Zuri%20Best3.jpg',
    ],
    alts: ['Zuri Boutique Hotel Watamu aerial view', 'Zuri Boutique Hotel pool'],
  },
  'palm-garden-boutique-hotel-watamu': {
    urls: [
      'https://images.squarespace-cdn.com/content/v1/613dd349de5d7c41e779933c/fb022a17-c723-402a-8be6-b24cd895004c/palm-garden-drone.jpeg',
      'https://images.squarespace-cdn.com/content/v1/613dd349de5d7c41e779933c/3d0a86ba-0e89-47aa-ab0d-af754c233831/Palm+Garden+5.jpg',
    ],
    alts: ['Palm Garden Boutique Hotel aerial view', 'Palm Garden Hotel garden and pool'],
  },
  'maya-kobe-boutique-hotel-kilifi': {
    urls: [
      'https://tribalsand.com/images/maya-kobe/Aerial/Maya%20Kobe%20Best1.JPG',
      'https://tribalsand.com/images/maya-kobe/Maya%20Kobe%20-%20Day%20Outdoor,%20Pool,%20Beach/Maya%20Kobe%20Best14.jpg',
    ],
    alts: ['Maya Kobe Boutique Hotel Kilifi aerial', 'Maya Kobe Hotel pool and beach'],
  },
  'treehouse-watamu': {
    urls: [
      'https://images.squarespace-cdn.com/content/v1/52c9f4ebe4b02c7007cdd86a/1637075456797-FZT85Z1GM83GPRWQKDMJ/GRADED-WEB-Arial-House-From-Paul-Edited-1.jpg',
      'https://images.squarespace-cdn.com/content/v1/52c9f4ebe4b02c7007cdd86a/1466383500302-G0B90Q0ZMC8BCV4EMAI4/Treehouse+Balcony+1.jpg',
    ],
    alts: ['Treehouse Watamu aerial view', 'Treehouse Watamu balcony'],
  },
  'gim-and-tonic-watamu': {
    urls: [
      'https://cdn.prod.website-files.com/667d4286644e58960632a8d7/66de03f72d65d4c963db46b3_IMG_2484%203%20Large.jpeg',
      'https://cdn.prod.website-files.com/667d4286644e58960632a8d7/66e0d4c2db40afa668edc829_NIRB0067%20Large.jpeg',
    ],
    alts: ['Gim and Tonic gym Watamu', 'Gim and Tonic outdoor workout area'],
  },
  'papa-remo-beach-party-watamu': {
    urls: [
      'https://www.paparemobeach.com/assets/images/optimized/General/beach_party.jpg',
      'https://www.paparemobeach.com/assets/images/optimized/General/in_entrance.jpg',
    ],
    alts: ['Papa Remo Beach Party Watamu', 'Papa Remo Beach entrance'],
  },
}

async function main() {
  // First, get all listings to map slug → _id
  const allListings: any[] = await client.fetch(
    '*[_type == "listing"]{ _id, "slug": slug.current, title, "photoCount": count(photos) }'
  )

  const slugToListing = new Map<string, any>()
  for (const l of allListings) {
    slugToListing.set(l.slug, l)
  }

  const slugs = Object.keys(LISTING_IMAGES)
  console.log(`📸 Adding images to ${slugs.length} listings...\n`)

  let successCount = 0
  let skipCount = 0

  for (const slug of slugs) {
    const listing = slugToListing.get(slug)
    if (!listing) {
      console.log(`  ⏭️  ${slug} — not found in Sanity, skipping`)
      skipCount++
      continue
    }

    // Skip if listing already has photos
    if (listing.photoCount > 0) {
      console.log(`  ⏭️  ${listing.title} — already has ${listing.photoCount} photo(s)`)
      skipCount++
      continue
    }

    const { urls, alts } = LISTING_IMAGES[slug]
    console.log(`  → ${listing.title}...`)

    const photos: any[] = []
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const alt = alts[i] || listing.title
      const ext = url.match(/\.(jpe?g|png|webp)/i)?.[1] || 'jpg'
      const filename = `${slug}-${i + 1}.${ext}`
      console.log(`      Uploading ${filename}...`)
      const img = await uploadImageFromUrl(url, filename)
      if (img) {
        img.alt = alt
        photos.push(img)
      }
    }

    if (photos.length > 0) {
      await client.patch(listing._id).set({ photos }).commit()
      console.log(`    ✅ ${photos.length} photo(s) added`)
      successCount++
    } else {
      console.log(`    ⚠️ No photos could be uploaded`)
    }
  }

  console.log(`\n✅ Done — ${successCount} listings updated, ${skipCount} skipped`)
}

main().catch((err) => {
  console.error('❌ Script failed:', err)
  process.exit(1)
})
