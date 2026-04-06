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

function textBlock(text: string, style: string = 'normal'): any {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }
}

function richTextBlock(children: Array<{ text: string; bold?: boolean }>): any {
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    children: children.map((c) => ({
      _type: 'span',
      _key: key(),
      text: c.text,
      marks: c.bold ? ['strong'] : [],
    })),
  }
}

// ── POST: Watamu Transport Guide ──────────────────────

const postBody = [
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Quick Facts — Getting to Watamu',
    accentColor: 'teal',
    items: [
      { icon: '✈️', label: 'Nearest airport', value: 'Malindi (30 min)' },
      { icon: '🚕', label: 'From Mombasa', value: '2.5 hrs · KSh 7–9k' },
      { icon: '🚌', label: 'From Nairobi', value: 'Train + taxi' },
      { icon: '🛺', label: 'Around town', value: 'KSh 300–600' },
      { icon: '🚶', label: 'Walkable', value: 'Yes — main areas' },
      { icon: '💳', label: 'Cash', value: 'Always carry KES' },
    ],
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '30 min', label: 'from Malindi Airport' },
      { number: '45 min', label: 'flight Nairobi–Malindi' },
      { number: '2.5 hrs', label: 'drive from Mombasa' },
    ],
  },

  textBlock('Getting to Watamu by Air', 'h2'),

  richTextBlock([
    { text: 'Watamu has no airport of its own. Your two options are ' },
    { text: 'Malindi Airport', bold: true },
    { text: ' — the closest at just 30 minutes away — or ' },
    { text: "Mombasa's Moi International Airport", bold: true },
    { text: ', which is 2.5 hours down the coast. For most travellers coming from Nairobi, Malindi is the obvious choice.' },
  ]),

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: '120 km north of Mombasa' },
      { icon: 'pin', text: '25 km south of Malindi' },
      { icon: 'clock', text: '~30 min from Malindi Airport' },
      { icon: 'clock', text: '~2.5 hrs from Mombasa' },
    ],
  },

  textBlock('Flights to Malindi', 'h3'),
  richTextBlock([
    { text: 'From ' },
    { text: 'Nairobi', bold: true },
    { text: ': multiple daily flights on Kenya Airways, Jambojet, AirKenya, and Fly 540. Journey time is just 45 minutes. Fares start from around KSh 4,000 one way if you book early.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '✈️',
    label: 'Malindi vs Mombasa — which airport to use',
    text: "If you're coming from Nairobi, always fly into Malindi. The 45-minute flight and short taxi to Watamu is far better than landing at Mombasa and adding 2.5 hours of road travel. Only use Mombasa if you want time in the city first.",
  },

  textBlock('Getting to Watamu by Road', 'h2'),

  textBlock('The coast road between Mombasa and Malindi is one of Kenya\'s most scenic drives — palm-lined, ocean-glimpsed, and unhurried. From Mombasa it\'s 2.5 hours. From Nairobi, take the SGR Madaraka Express train to Mombasa (4.5 hours, comfortable, affordable) then a taxi or matatu north to Watamu.'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: 'Option', color: 'teal' },
      { _key: key(), label: 'Cost (KES)', color: 'blue' },
      { _key: key(), label: 'Time', color: 'purple' },
    ],
    rows: [
      { _key: key(), criterion: 'Malindi Airport → Watamu', values: ['Taxi', '2,000–3,000', '30 min'] },
      { _key: key(), criterion: 'Mombasa Airport → Watamu', values: ['Taxi', '7,000–9,000', '2.5 hrs'] },
      { _key: key(), criterion: 'Mombasa → Watamu', values: ['Matatu + tuk-tuk', '400–600', '3 hrs'] },
      { _key: key(), criterion: 'Mombasa → Watamu', values: ['Private taxi', '4,000–8,000', '2.5 hrs'] },
      { _key: key(), criterion: 'Nairobi → Mombasa', values: ['SGR train', '1,000–3,000', '4.5 hrs'] },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🚌',
    label: 'The cheap matatu route explained',
    text: "Take a matatu from Mombasa's Kobil stage to Malindi (KSh 250–350, ~2 hours). At Malindi, take another matatu or tuk-tuk to Watamu (KSh 100–200, ~30 min). Total cost under KSh 600. Total time: ~3 hours. Not the most comfortable, but very local and genuinely affordable.",
  },

  textBlock('Getting Around Watamu', 'h2'),

  textBlock('Watamu is small and easy to navigate. Most places are within 15 minutes of each other. The main beach road and town centre are highly walkable during the day. For everything else, tuk-tuks are your best friend.'),

  textBlock('Tuk-tuk (KSh 300–600)', 'h3'),
  textBlock('Three-wheeled and the most fun way to get around. Fits 2–3 people, good for luggage and night journeys. Drivers know all the venues by name. Best at night.'),

  textBlock('Motorbike / boda boda (KSh 100–300)', 'h3'),
  textBlock('Fastest and cheapest for short solo hops. Available at every junction and beach entrance. Great for daytime errands.'),

  textBlock('Walking (Free)', 'h3'),
  textBlock('The beach road and main town are very walkable. Best way to discover restaurants and shops you\'d miss from a tuk-tuk. Stick to lit areas at night.'),

  textBlock('Scooter rental (KSh 1,500–2,500/day)', 'h3'),
  textBlock('Best for stays of 5+ days. Lets you reach Arabuko Forest, Gedi Ruins, and Mida Creek independently. Requires a licence.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🛺',
    label: 'Tuk-tuk fare guide — Watamu 2026',
    text: 'Town centre → Sunset Lab: KSh 300–400. Town centre → Garoda Beach: KSh 500–600. Town centre → Jacaranda Beach: KSh 400–500. Night fares (after 10pm): add KSh 100–200. Always agree the fare before you get in.',
  },

  textBlock('Practical Tips', 'h2'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '🌙',
    label: 'Night safety on motorbikes',
    text: 'Avoid motorbikes on unlit roads after dark. The roads between beaches can be poorly lit and difficult to navigate. Stick to tuk-tuks after sunset — slightly more expensive but far safer for night journeys back to your accommodation.',
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💵',
    label: 'Always carry cash',
    text: "Card readers are unreliable in Watamu — many don't work at all in smaller establishments. Always carry Kenyan shillings for tuk-tuks, motorbikes, market purchases, and smaller restaurants. There is an ATM in Watamu town centre but keep a buffer.",
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: 'KSh 600', label: 'cheapest Mombasa→Watamu by matatu' },
      { number: '15 min', label: 'max tuk-tuk ride anywhere in town' },
      { number: 'Free', label: 'walking the main beach road' },
    ],
  },
]

async function push() {
  console.log('Pushing: Watamu Transport Guide...')

  await client.createOrReplace({
    _id: 'blog-watamu-transport-guide',
    _type: 'blogPost',
    title: 'How to Get to and Around Watamu 2026: Flights, Taxis & Tuk-Tuks (With Prices)',
    slug: { _type: 'slug', current: 'watamu-transport-guide' },
    status: 'published',
    excerpt: 'Complete transport guide for Watamu Kenya. Flights to Malindi, taxis from Mombasa, tuk-tuks, motorbikes and walking — with real 2026 KES prices.',
    tags: ['Coast', 'Budget Travel', 'Road Trip'],
    readingTime: 8,
    publishedAt: '2026-03-12T08:00:00Z',
    seoTitle: 'How to Get to Watamu Kenya 2026 — Flights, Taxis & Prices',
    seoDescription: 'Complete transport guide for Watamu Kenya. Flights to Malindi, taxis from Mombasa, tuk-tuks, motorbikes and walking with real 2026 prices.',
    body: postBody,
  })

  console.log('✓ Done: watamu-transport-guide')
}

push().catch((err) => {
  console.error('Push failed:', err)
  process.exit(1)
})
