import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

/*
  Fix all listings:
  1. Set correct subcategory based on content/tags
  2. Set all hostName to "KlicKenya"
*/

interface PatchDef {
  id: string
  title: string
  patch: Record<string, unknown>
}

const patches: PatchDef[] = [
  // ── EXPERIENCES: Beaches ──
  {
    id: '2riX1AdO9O53izfAmrIeLx',
    title: 'Ocean Breezes Beach',
    patch: { subcategory: 'beaches', hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrIeVx',
    title: 'Love Island Beach',
    patch: { subcategory: 'beaches', hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrInwx',
    title: 'Jacaranda Beach',
    patch: { subcategory: 'beaches', hostName: 'KlicKenya' },
  },
  {
    id: 'OTOIQY89AHB7SUiuiBVdzV',
    title: 'Watamu Bay Beach',
    patch: { subcategory: 'beaches', hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrIrIS',
    title: 'Short Beach',
    patch: { subcategory: 'beaches', hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrIrcS',
    title: 'Garoda Beach',
    patch: { subcategory: 'beaches', hostName: 'KlicKenya' },
  },

  // ── EXPERIENCES: Outdoor ──
  {
    id: '2riX1AdO9O53izfAmrIoJS',
    title: 'Captain Sammy Dhow',
    patch: { subcategory: 'outdoor', hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrIp9x',
    title: "Marafa Hell's Kitchen",
    patch: { subcategory: 'outdoor', hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzAQorf',
    title: 'Mida Creek',
    patch: { subcategory: 'outdoor', hostName: 'KlicKenya' },
  },

  // ── EXPERIENCES: Cultural ──
  {
    id: 'OTOIQY89AHB7SUiuiBVuhd',
    title: 'Gede Ruins',
    patch: { subcategory: 'cultural', hostName: 'KlicKenya' },
  },

  // ── RESTAURANTS: Set hostName to KlicKenya ──
  {
    id: '2riX1AdO9O53izfAmrTWVS',
    title: 'Mannis Restaurant & Cocktail Bar',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrVDXx',
    title: 'Visiwa Beach Resort & Restaurant',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrVDhx',
    title: 'Tamu Beach Bar & Restaurant',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrZDRx',
    title: 'Kilifi Boatyard',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrZDbx',
    title: 'Distant Relatives Ecolodge & Restaurant',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmrZDtS',
    title: 'Bofa Beach Resort (Kaya Restaurant)',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmra67x',
    title: 'Saltys On The Creek',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmra6Hx',
    title: 'Apache Indian Cafe',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: '2riX1AdO9O53izfAmraDXx',
    title: 'Bahari Pizza & Coffee',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: '8004da69-d432-47a1-beb8-968a6fb19b88',
    title: 'Sunset Lab',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'OTOIQY89AHB7SUiuiBwXqb',
    title: 'Saltys Beach Bar & Restaurant',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'OTOIQY89AHB7SUiuiBwkfR',
    title: 'Fayaz Bakery Kilifi',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzAniGg',
    title: 'Ocean Sports Restaurant',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzAnijQ',
    title: 'Kobe Suite Resort Restaurant',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzAnj2a',
    title: 'Papa Remo Beach',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzAxhgh',
    title: 'The Twisted Fig',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzAxi9R',
    title: 'Vegan Basket',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzAxiSb',
    title: 'Wild Living Cafe',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzAxill',
    title: 'Mnarani Beach Club',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzB0g2P',
    title: 'The Food Movement',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzB0gxt',
    title: 'Village Dishes',
    patch: { hostName: 'KlicKenya' },
  },
  {
    id: 'U1j2mvjVVumuzihYzB0haD',
    title: 'Indigo Vibe Cafe',
    patch: { hostName: 'KlicKenya' },
  },
]

async function main() {
  console.log(`🔧 Fixing ${patches.length} listings...\n`)

  for (const p of patches) {
    try {
      await client.patch(p.id).set(p.patch).commit()
      const fields = Object.entries(p.patch)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      console.log(`  ✅ ${p.title} → ${fields}`)
    } catch (err) {
      console.error(`  ❌ ${p.title}: ${err}`)
    }
  }

  console.log(`\n✅ Done — ${patches.length} listings updated!`)
}

main().catch((err) => {
  console.error('❌ Script failed:', err)
  process.exit(1)
})
