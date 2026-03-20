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
    if (buffer.length < 5000) throw new Error(`Too small (${buffer.length} bytes)`)
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

const FIXES: Record<string, { urls: string[]; alts: string[] }> = {
  // Non Solo Pane — use Wanderlog images
  'non-solo-pane-watamu': {
    urls: [
      'https://itin-dev.wanderlogstatic.com/freeImage/F3dDfCKZWYWQUf5ZHEbhTr82vFRhmfZU',
      'https://itin-dev.wanderlogstatic.com/freeImage/HCNTicmgU8xC9oQxpAwXVvgCijMUVugw',
    ],
    alts: ['Non Solo Pane bakery Watamu', 'Non Solo Pane fresh baked goods'],
  },
  // Friday Lab — use klickenya.com Sunset Lab images
  'friday-lab-watamu': {
    urls: [
      'https://klickenya.com/wp-content/uploads/2025/11/sunset_lab_watamu_klickenya_3-1200x799.webp',
      'https://klickenya.com/wp-content/uploads/2025/11/sunset_lab_watamu_klickenya_1-1200x799.webp',
    ],
    alts: ['Friday Lab at Sunset Beach Lab Watamu', 'Sunset Lab beach venue Watamu'],
  },
  // Horsebay Watamu — use Airbnb images
  'horsebay-watamu': {
    urls: [
      'https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTMyMDk1NDA3Mzg0MTkxMDUzNQ==/original/f2349688-57ff-477f-9ead-0300c599031b.jpeg',
      'https://a0.muscache.com/im/pictures/miso/Hosting-1320954073841910535/original/76692725-9f8e-4758-9016-9c6006eac1e3.jpeg',
    ],
    alts: ['Horsebay Watamu treehouse accommodation', 'Horsebay Watamu nature retreat'],
  },
  // Halashymia — use a generic Watamu town image from klickenya
  'halashymia-supermarket-watamu': {
    urls: [
      'https://klickenya.com/wp-content/uploads/2025/11/Watamu-Beach-Bay-mapango-beach-520x397.webp',
    ],
    alts: ['Halashymia Supermarket Watamu'],
  },
  // Nice to See You — use Watamu town image
  'nice-to-see-you-watamu': {
    urls: [
      'https://klickenya.com/wp-content/uploads/2025/11/sunset_lab_watamu_klickenya_4-1200x1500.jpg',
    ],
    alts: ['Nice to See You Hair and Beauty Watamu'],
  },
}

async function main() {
  const allListings: any[] = await client.fetch(
    '*[_type == "listing"]{ _id, "slug": slug.current, title, "photoCount": count(photos) }'
  )

  const slugToListing = new Map<string, any>()
  for (const l of allListings) slugToListing.set(l.slug, l)

  const slugs = Object.keys(FIXES)
  console.log(`📸 Fixing images for ${slugs.length} listings...\n`)

  for (const slug of slugs) {
    const listing = slugToListing.get(slug)
    if (!listing) {
      console.log(`  ⏭️  ${slug} — not found`)
      continue
    }
    if (listing.photoCount > 0) {
      console.log(`  ⏭️  ${listing.title} — already has ${listing.photoCount} photo(s)`)
      continue
    }

    const { urls, alts } = FIXES[slug]
    console.log(`  → ${listing.title}...`)

    const photos: any[] = []
    for (let i = 0; i < urls.length; i++) {
      const filename = `${slug}-${i + 1}.jpg`
      console.log(`      Uploading ${filename}...`)
      const img = await uploadImageFromUrl(urls[i], filename)
      if (img) {
        img.alt = alts[i] || listing.title
        photos.push(img)
      }
    }

    if (photos.length > 0) {
      await client.patch(listing._id).set({ photos }).commit()
      console.log(`    ✅ ${photos.length} photo(s) added`)
    } else {
      console.log(`    ⚠️ No photos could be uploaded`)
    }
  }

  console.log('\n✅ Done!')
}

main().catch((err) => {
  console.error('❌ Script failed:', err)
  process.exit(1)
})
