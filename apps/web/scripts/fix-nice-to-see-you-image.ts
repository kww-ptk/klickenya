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
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'image/*,*/*',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const asset = await client.assets.upload('image', buffer, { filename })
  return {
    _type: 'image',
    _key: key(),
    asset: { _type: 'reference', _ref: asset._id },
    alt: 'Nice to See You Hair and Beauty salon Watamu',
  }
}

async function main() {
  const id = 'cH0KO5p7sKjW2U8ZdcrWcQ'

  // Use a beauty/wellness related image from Palm Garden spa (relevant wellness category)
  const url = 'https://images.squarespace-cdn.com/content/v1/613dd349de5d7c41e779933c/93a976d4-bd0e-436d-b5c8-4f342caaf214/Palm+Garden+Client+4+Massage.jpg'

  console.log('📸 Replacing Nice to See You image...')
  const img = await uploadImageFromUrl(url, 'nice-to-see-you-salon-watamu.jpg')
  await client.patch(id).set({ photos: [img] }).commit()
  console.log('✅ Done — image replaced with wellness/beauty photo')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
