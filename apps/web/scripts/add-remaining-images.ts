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

// Title → image URLs (matched by title since these are older listings without known slugs)
const FIXES: { title: string; urls: string[]; alts: string[] }[] = [
  {
    title: 'Bahari Pizza & Coffee',
    urls: [
      'https://baharipizzaandcoffee.com/images/slide2.jpg',
      'https://baharipizzaandcoffee.com/images/slide3.jpg',
    ],
    alts: ['Bahari Pizza and Coffee Kilifi', 'Bahari Pizza interior'],
  },
  {
    title: 'Bofa Beach Resort (Kaya Restaurant)',
    urls: [
      'https://bofabeachresort.com/wp-content/uploads/elementor/thumbs/bofa-beach-resort-Kilifi-141121-qg9qxoxgc6q3wyakyzxp7m8fi4z13kscp8vihdg9x4.jpg',
      'https://bofabeachresort.com/wp-content/uploads/elementor/thumbs/bofa-beach-resort-Kilifi-231121-qg9qyeb3a4vmogi3noepj6m0yallpz1yfkd46t1i1c.jpg',
    ],
    alts: ['Bofa Beach Resort Kilifi', 'Bofa Beach Resort pool and grounds'],
  },
  {
    title: 'Distant Relatives Ecolodge & Restaurant',
    urls: [
      'https://www.kilifibackpackers.com/wp-content/uploads/2026/02/stay.webp',
      'https://www.kilifibackpackers.com/wp-content/uploads/2026/02/Experience.webp',
    ],
    alts: ['Distant Relatives Ecolodge Kilifi', 'Distant Relatives experiences'],
  },
  {
    title: 'Fayaz Bakery Kilifi',
    urls: [
      'https://itin-dev.wanderlogstatic.com/freeImage/BvhI3gjV3Kk9IoR8QyVyN8Zycb1hJlzV',
      'https://www.fayazbakers.com/Images/1020-Intro.jpg',
    ],
    alts: ['Fayaz Bakery Kilifi', 'Fayaz Bakers products'],
  },
  {
    title: 'Indigo Vibe Cafe',
    urls: [
      'https://api.discoverkenya.co.ke/storage/businesses/1167/6192/indigo-vibe-cafe-kilifi-69662da4afda0.jpg',
      'https://api.discoverkenya.co.ke/storage/businesses/1167/6185/indigo-vibe-cafe-kilifi-69662da48c99e.jpg',
    ],
    alts: ['Indigo Vibe Cafe Kilifi', 'Indigo Vibe Cafe interior'],
  },
  {
    title: 'Kilifi Boatyard',
    urls: [
      'https://itin-dev.wanderlogstatic.com/freeImage/4GelgeasYhhbeiGaThBL46h4wibAkGNf',
      'https://greenheartkilifi.life/wp-content/uploads/2025/05/Kilifi-Boatyard.jpg',
    ],
    alts: ['Kilifi Boatyard restaurant', 'Kilifi Boatyard creek view'],
  },
  {
    title: 'Love Island Beach',
    urls: [
      'https://itin-dev.wanderlogstatic.com/freeImage/AhOWfN4cI40doQBAlxBxmjigteN3IvTd',
    ],
    alts: ['Love Island Beach Watamu'],
  },
  {
    title: 'Mnarani Beach Club',
    urls: [
      'https://theholidaydealers.com/wp-content/uploads/2023/03/Mnarani-Club-Spa-Kilifi-2.jpg',
      'https://theholidaydealers.com/wp-content/uploads/2023/03/Mnarani-Club-Spa-Kilifi-7-850x498.jpg',
    ],
    alts: ['Mnarani Beach Club Kilifi', 'Mnarani Beach Club pool'],
  },
  {
    title: 'Saltys Beach Bar & Restaurant',
    urls: [
      'https://images.squarespace-cdn.com/content/v1/5cda706c7a1fbd52c62a5572/1668000878441-VSSV2P2W5YD06S13D2TC/G77A7460-2.jpg',
      'https://images.squarespace-cdn.com/content/v1/5cda706c7a1fbd52c62a5572/1668000878423-D5AKJMSK407B6VI3OTWZ/G77A7504-4.jpg',
    ],
    alts: ['Saltys Beach Bar Kilifi', 'Saltys beach and kitesurfing'],
  },
  {
    title: 'The Twisted Fig',
    urls: [
      'https://beneaththebaobabs.com/btb/wp-content/uploads/2022/01/Fig-Deck.jpeg',
      'https://beneaththebaobabs.com/btb/wp-content/uploads/2021/02/IMG_2454.jpg',
    ],
    alts: ['The Twisted Fig deck dining Kilifi', 'The Twisted Fig food'],
  },
  {
    title: 'Vegan Basket',
    urls: [
      'https://greenheartkilifi.life/wp-content/uploads/2026/03/vegan-basket-1024x768.webp',
    ],
    alts: ['Vegan Basket plant-based food Kilifi'],
  },
  {
    title: 'Wild Living Cafe',
    urls: [
      'https://api.discoverkenya.co.ke/storage/businesses/1170/6211/endoros-wild-living-cafe-kilifi-69662da50ce4b.jpg',
      'https://api.discoverkenya.co.ke/storage/businesses/1170/6218/endoros-wild-living-cafe-kilifi-69662da534e41.jpg',
    ],
    alts: ['Wild Living Cafe Kilifi', 'Wild Living Cafe setting'],
  },
  // Apache Indian & Village Dishes — use generic Kilifi images
  {
    title: 'Apache Indian Cafe',
    urls: [
      'https://itin-dev.wanderlogstatic.com/freeImage/4GelgeasYhhbeiGaThBL46h4wibAkGNf',
    ],
    alts: ['Apache Indian Cafe Kilifi'],
  },
  {
    title: 'Village Dishes',
    urls: [
      'https://greenheartkilifi.life/wp-content/uploads/2025/05/Kilifi-Boatyard.jpg',
    ],
    alts: ['Village Dishes Kilifi'],
  },
]

async function main() {
  // Fetch all listings
  const allListings: any[] = await client.fetch(
    '*[_type == "listing"]{ _id, title, "photoCount": count(photos) }'
  )

  const titleToListing = new Map<string, any>()
  for (const l of allListings) titleToListing.set(l.title, l)

  console.log(`📸 Adding images to ${FIXES.length} listings...\n`)
  let success = 0

  for (const fix of FIXES) {
    const listing = titleToListing.get(fix.title)
    if (!listing) {
      console.log(`  ⏭️  "${fix.title}" — not found in Sanity`)
      continue
    }
    if (listing.photoCount > 0) {
      console.log(`  ⏭️  ${listing.title} — already has ${listing.photoCount} photo(s)`)
      continue
    }

    console.log(`  → ${listing.title}...`)
    const photos: any[] = []

    for (let i = 0; i < fix.urls.length; i++) {
      const slug = fix.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
      const filename = `${slug}-${i + 1}.jpg`
      console.log(`      Uploading ${filename}...`)
      const img = await uploadImageFromUrl(fix.urls[i], filename)
      if (img) {
        img.alt = fix.alts[i] || fix.title
        photos.push(img)
      }
    }

    if (photos.length > 0) {
      await client.patch(listing._id).set({ photos }).commit()
      console.log(`    ✅ ${photos.length} photo(s) added`)
      success++
    } else {
      console.log(`    ⚠️ No photos could be uploaded`)
    }
  }

  console.log(`\n✅ Done — ${success} listings updated`)
}

main().catch((err) => {
  console.error('❌ Script failed:', err)
  process.exit(1)
})
