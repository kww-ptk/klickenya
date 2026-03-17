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

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

function makeSvg(title: string, subtitle: string, gradientId: string): string {
  title = esc(title)
  subtitle = esc(subtitle)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6B2D8B;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#8B4DAB;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#E8A020;stop-opacity:1"/>
    </linearGradient>
    <radialGradient id="${gradientId}2" cx="80%" cy="20%" r="60%">
      <stop offset="0%" style="stop-color:rgba(232,160,32,0.3);stop-opacity:1"/>
      <stop offset="100%" style="stop-color:rgba(232,160,32,0);stop-opacity:1"/>
    </radialGradient>
    <radialGradient id="${gradientId}3" cx="20%" cy="80%" r="50%">
      <stop offset="0%" style="stop-color:rgba(107,45,139,0.25);stop-opacity:1"/>
      <stop offset="100%" style="stop-color:rgba(107,45,139,0);stop-opacity:1"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#${gradientId})"/>
  <rect width="1600" height="900" fill="url(#${gradientId}2)"/>
  <rect width="1600" height="900" fill="url(#${gradientId}3)"/>
  <!-- Logo K mark -->
  <g transform="translate(750, 320) scale(0.45)" opacity="0.15">
    <circle cx="112" cy="112" r="100" fill="white"/>
    <text x="112" y="150" text-anchor="middle" font-family="system-ui,sans-serif" font-size="140" font-weight="800" fill="#6B2D8B">K</text>
  </g>
  <!-- KlicKenya text -->
  <text x="800" y="520" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="800" letter-spacing="-1" fill="white" opacity="0.95">
    <tspan>Klic</tspan><tspan fill="#E8A020">K</tspan><tspan>enya</tspan>
  </text>
  <!-- Title -->
  <text x="800" y="590" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="white" opacity="0.6" font-style="italic">${title}</text>
  <!-- Subtitle -->
  <text x="800" y="630" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="white" opacity="0.35">${subtitle}</text>
</svg>`
}

const covers = [
  {
    docId: 'blog-kenya-national-parks-guide',
    title: 'Kenya National Parks Guide',
    subtitle: '54 parks · Honest reviews · 2026',
    alt: 'Kenya National Parks Guide — Klickenya',
    filename: 'cover-national-parks.svg',
  },
  {
    docId: 'blog-watamu-transport-guide',
    title: 'Getting To & Around Watamu',
    subtitle: 'Flights · Taxis · Tuk-tuks · Real prices',
    alt: 'How to Get to Watamu Kenya — Klickenya',
    filename: 'cover-watamu-transport.svg',
  },
  {
    docId: 'blog-watamu-nightlife-guide',
    title: 'Watamu Nightlife Guide',
    subtitle: 'Sunset Lab · Paparemo · Kaleidoscope · 2026',
    alt: 'Watamu Nightlife Guide — Klickenya',
    filename: 'cover-watamu-nightlife.svg',
  },
]

async function upload() {
  console.log('Uploading cover images...\n')

  for (const cover of covers) {
    const svg = makeSvg(cover.title, cover.subtitle, `g${cover.docId.slice(-4)}`)
    const tmpFile = path.join(os.tmpdir(), cover.filename)
    fs.writeFileSync(tmpFile, svg)

    const asset = await client.assets.upload('image', fs.createReadStream(tmpFile), {
      filename: cover.filename,
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

    console.log(`✓ ${cover.docId} — cover uploaded`)
    fs.unlinkSync(tmpFile)
  }

  console.log('\nDone! All cover images uploaded.')
}

upload().catch((err) => {
  console.error('Upload failed:', err)
  process.exit(1)
})
