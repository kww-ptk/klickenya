import { createClient } from 'next-sanity'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

function makeSvg(id: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6B2D8B"/>
      <stop offset="50%" style="stop-color:#8B4DAB"/>
      <stop offset="100%" style="stop-color:#E8A020"/>
    </linearGradient>
    <radialGradient id="${id}b" cx="80%" cy="20%" r="60%">
      <stop offset="0%" style="stop-color:#E8A020;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#E8A020;stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="${id}c" cx="20%" cy="80%" r="50%">
      <stop offset="0%" style="stop-color:#6B2D8B;stop-opacity:0.25"/>
      <stop offset="100%" style="stop-color:#6B2D8B;stop-opacity:0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#${id})"/>
  <rect width="1600" height="900" fill="url(#${id}b)"/>
  <rect width="1600" height="900" fill="url(#${id}c)"/>
</svg>`
}

const covers = [
  {
    docId: 'blog-kenya-national-parks-guide',
    alt: 'Kenya National Parks Guide — Klickenya',
  },
  {
    docId: 'blog-watamu-transport-guide',
    alt: 'How to Get to Watamu Kenya — Klickenya',
  },
  {
    docId: 'blog-watamu-nightlife-guide',
    alt: 'Watamu Nightlife Guide — Klickenya',
  },
  {
    docId: 'blog-10-days-kenya-itinerary',
    alt: '10 Days in Kenya Itinerary — Klickenya',
  },
]

async function upload() {
  console.log('Uploading cover images...\n')

  for (const cover of covers) {
    const svg = makeSvg(cover.docId.slice(-6))
    const tmpFile = path.join(os.tmpdir(), `${cover.docId}.svg`)
    fs.writeFileSync(tmpFile, svg)

    const asset = await client.assets.upload('image', fs.createReadStream(tmpFile), {
      filename: `${cover.docId}.svg`,
      contentType: 'image/svg+xml',
    })

    await client
      .patch(cover.docId)
      .set({
        coverImage: {
          _type: 'image',
          alt: cover.alt,
          asset: { _type: 'reference', _ref: asset._id },
        },
      })
      .commit()

    console.log(`✓ ${cover.docId}`)
    fs.unlinkSync(tmpFile)
  }

  console.log('\nDone!')
}

upload().catch((err) => {
  console.error('Upload failed:', err)
  process.exit(1)
})
