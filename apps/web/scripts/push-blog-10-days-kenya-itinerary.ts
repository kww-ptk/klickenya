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

// ── POST: 10 Days in Kenya Itinerary ──────────────────

const postBody = [
  // Quick Facts
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Quick Facts',
    accentColor: 'amber',
    items: [
      { icon: '📅', label: 'Duration', value: '10 days / 9 nights' },
      { icon: '💰', label: 'Budget', value: '$2,500–4,000 per person' },
      { icon: '🦁', label: 'Big Five', value: 'All five — guaranteed' },
      { icon: '✈️', label: 'Entry', value: 'Jomo Kenyatta (NBO)' },
      { icon: '🌤', label: 'Best months', value: 'Jul–Oct, Jan–Mar' },
      { icon: '🛂', label: 'Visa', value: 'eTA required ($30)' },
    ],
  },

  textBlock('Your route at a glance', 'h2'),
  textBlock('This itinerary takes you from Nairobi through the Great Rift Valley, into the Masai Mara, down to Lake Naivasha, and finishes on the white-sand beaches of the Kenya coast. It balances safari, culture, and downtime — so you come home rested, not exhausted.'),

  // Day 1
  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 1,
    location: 'Nairobi',
    title: 'Arrive & explore the capital',
    meta: 'Airport transfer · City tour',
    timeline: [
      { time: '10:00 AM', title: 'Land at JKIA', description: 'Clear immigration, collect bags, meet your driver.' },
      { time: '12:00 PM', title: 'Check in to hotel', description: 'Rest and freshen up at Nairobi Serena or similar.' },
      { time: '2:00 PM', title: 'Giraffe Centre', description: 'Hand-feed endangered Rothschild giraffes at eye level.' },
      { time: '4:30 PM', title: 'Karen Blixen Museum', description: 'Tour the colonial homestead from Out of Africa.' },
      { time: '7:00 PM', title: 'Dinner at Carnivore', description: 'Nairobi\'s legendary open-fire restaurant — try the crocodile.', badge: 'Must-try' },
    ],
    costs: ['Hotel: $120–200', 'Giraffe Centre: $15', 'Karen Blixen: $12'],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💡',
    label: 'Pro tip — jet lag hack',
    text: 'Kenya is GMT+3, so if you\'re coming from Europe the jet lag is minimal. From the US, arrive in the morning and force yourself to stay awake until sunset — you\'ll be adjusted by Day 2.',
  },

  // Day 2
  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 2,
    location: 'Nairobi → Naivasha',
    title: 'Into the Great Rift Valley',
    meta: '2h drive · Scenic escarpment',
    timeline: [
      { time: '7:00 AM', title: 'Depart Nairobi', description: 'Drive northwest on the A104 with spectacular Rift Valley views.' },
      { time: '9:30 AM', title: 'Lake Naivasha', description: 'Check in to your lakeside lodge.' },
      { time: '11:00 AM', title: 'Boat safari on the lake', description: 'Spot hippos, fish eagles, and kingfishers from a wooden boat.' },
      { time: '2:00 PM', title: 'Crescent Island walk', description: 'Walk among giraffes, zebras, and wildebeest — no fences.', badge: 'Unique' },
      { time: '5:00 PM', title: 'Sundowner at the lodge', description: 'Watch the sun set over the lake with a Tusker in hand.' },
    ],
    costs: ['Boat safari: $30', 'Crescent Island: $30', 'Lodge: $150–250'],
  },

  // Day 3
  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 3,
    location: 'Naivasha → Nakuru',
    title: 'Flamingos & rhinos at Lake Nakuru',
    meta: '1.5h drive · Full day game drive',
    timeline: [
      { time: '6:30 AM', title: 'Early departure', description: 'Drive north to Lake Nakuru National Park.' },
      { time: '8:30 AM', title: 'Enter the park', description: 'Game drive begins — look for black and white rhinos immediately.' },
      { time: '12:00 PM', title: 'Baboon Cliff viewpoint', description: 'Panoramic views of the entire lake basin — flamingos carpet the shore.' },
      { time: '1:00 PM', title: 'Picnic lunch', description: 'Packed lunch at the designated picnic site inside the park.' },
      { time: '4:00 PM', title: 'Afternoon game drive', description: 'Lions, leopards, buffalo, and Rothschild giraffes.' },
    ],
    costs: ['Park entry: $60', 'Guide: $40', 'Lodge: $150–280'],
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '1.5M+', label: 'wildebeest in the Great Migration' },
      { number: '5', label: 'national parks on this route' },
      { number: '600+', label: 'bird species across Kenya' },
    ],
  },

  // Days 4-5
  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 4,
    location: 'Nakuru → Masai Mara',
    title: 'Journey to the Mara',
    meta: '5h drive · Arrive by lunch',
    timeline: [
      { time: '6:00 AM', title: 'Depart Nakuru', description: 'Long but scenic drive through the Rift Valley highlands.' },
      { time: '11:30 AM', title: 'Arrive at Mara camp', description: 'Check in to your tented camp — the real safari begins.' },
      { time: '3:00 PM', title: 'Afternoon game drive', description: 'First Mara game drive — expect lions, elephants, and herds of zebra.', badge: 'Big Five' },
      { time: '6:30 PM', title: 'Bush dinner', description: 'Candlelit dinner under the stars at your camp.' },
    ],
    costs: ['Camp: $250–500', 'Park entry: $80/day', 'Bush dinner: included'],
  },

  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 5,
    location: 'Masai Mara',
    title: 'Full day in the Mara',
    meta: 'Game drives · Maasai village visit',
    timeline: [
      { time: '5:30 AM', title: 'Sunrise game drive', description: 'The golden hour is when predators are most active.' },
      { time: '8:00 AM', title: 'Bush breakfast', description: 'Your guide sets up breakfast by the Mara River — hippos and crocs included.' },
      { time: '10:00 AM', title: 'Maasai village visit', description: 'Learn about Maasai culture, beadwork, and traditional jumping dances.' },
      { time: '3:00 PM', title: 'Afternoon game drive', description: 'Focus on the big cats — the Mara has the highest density of lions in Africa.', badge: 'Highlight' },
    ],
    costs: ['Village visit: $20', 'Guide tip: $20–30/day'],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'Important — Mara River crossing',
    text: 'If you\'re visiting between July and October, ask your guide about the Great Migration river crossings. These are the most dramatic wildlife events on Earth — but timing is unpredictable. Stay flexible and trust your guide\'s instincts.',
  },

  // Days 6-7
  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 6,
    location: 'Masai Mara → Amboseli',
    title: 'Kilimanjaro views & elephants',
    meta: 'Internal flight + 2h drive',
    timeline: [
      { time: '7:00 AM', title: 'Fly to Nairobi (Wilson)', description: '45-minute bush flight back to the capital.' },
      { time: '10:00 AM', title: 'Drive to Amboseli', description: 'Southeast towards the Tanzania border — Kilimanjaro appears.' },
      { time: '1:00 PM', title: 'Check in to lodge', description: 'Amboseli Serena or Tortilis Camp with Kilimanjaro views.' },
      { time: '3:30 PM', title: 'Game drive', description: 'Amboseli is famous for its large elephant herds with Kilimanjaro as the backdrop.', badge: 'Iconic' },
    ],
    costs: ['Bush flight: $150–250', 'Park entry: $60', 'Lodge: $200–400'],
  },

  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 7,
    location: 'Amboseli',
    title: 'Elephants, swamps & sundowners',
    meta: 'Full day game drives',
    timeline: [
      { time: '6:00 AM', title: 'Sunrise drive', description: 'Clear morning = best Kilimanjaro views. Bring your telephoto lens.' },
      { time: '9:00 AM', title: 'Observation Hill', description: 'Climb the small hill for 360° views of the park and swamps below.' },
      { time: '2:00 PM', title: 'Swamp game drive', description: 'The marshes attract elephant families, buffalo herds, and over 400 bird species.' },
      { time: '5:30 PM', title: 'Sundowner cocktails', description: 'Gin & tonic with a Kilimanjaro sunset — peak Kenya.', badge: 'Must-do' },
    ],
    costs: ['Guide: $40', 'Sundowner: included at most camps'],
  },

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'There is something about safari life that makes you forget all your sorrows and feel as if you had drunk half a bottle of champagne — bubbling over with heartfelt gratitude for being alive.',
    attribution: '— Isak Dinesen, Out of Africa',
    accentColor: 'amber',
  },

  // Days 8-10
  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 8,
    location: 'Amboseli → Diani Beach',
    title: 'Safari to coast transition',
    meta: 'Flight to Mombasa · 1h drive south',
    timeline: [
      { time: '8:00 AM', title: 'Fly to Mombasa', description: '1-hour flight from Amboseli airstrip to Moi International.' },
      { time: '11:00 AM', title: 'Arrive Diani Beach', description: 'Check in to your beachfront resort and exhale.' },
      { time: '1:00 PM', title: 'Beach time', description: 'White sand, warm Indian Ocean, cold Tusker. You\'ve earned this.' },
      { time: '6:00 PM', title: 'Seafood dinner', description: 'Fresh lobster at Ali Barbour\'s Cave Restaurant — literally inside a coral cave.', badge: 'Must-try' },
    ],
    costs: ['Flight: $150–200', 'Resort: $150–350/night', 'Cave dinner: $40–60'],
  },

  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 9,
    location: 'Diani Beach',
    title: 'Water sports & Old Town',
    meta: 'Snorkelling · Mombasa day trip optional',
    timeline: [
      { time: '8:00 AM', title: 'Snorkelling at Kisite', description: 'Boat to Kisite-Mpunguti Marine Park — dolphins, turtles, coral gardens.' },
      { time: '12:00 PM', title: 'Beach lunch', description: 'Grilled fish at Nomad Beach Bar on the sand.' },
      { time: '3:00 PM', title: 'Optional: Mombasa Old Town', description: 'Fort Jesus, narrow streets, spice markets, fresh juice stalls.' },
      { time: '7:00 PM', title: 'Farewell dinner', description: 'Sunset dinner at Sails Beach Bar.' },
    ],
    costs: ['Kisite trip: $80', 'Fort Jesus: $12'],
  },

  {
    _type: 'dayCardBlock',
    _key: key(),
    dayNumber: 10,
    location: 'Diani → Departure',
    title: 'Last morning & fly home',
    meta: 'Beach · Airport transfer',
    timeline: [
      { time: '7:00 AM', title: 'Sunrise swim', description: 'One last dip in the Indian Ocean.' },
      { time: '9:00 AM', title: 'Breakfast & pack', description: 'Take your time — you\'ll be back.' },
      { time: '12:00 PM', title: 'Transfer to Mombasa airport', description: 'Or fly from Ukunda airstrip direct to Nairobi for your connection.' },
    ],
    costs: ['Transfer: $40–60'],
  },

  textBlock('What to budget', 'h2'),

  {
    _type: 'budgetTableBlock',
    _key: key(),
    columns: ['Category', 'Budget', 'Mid-range', 'Luxury'],
    rows: [
      { label: 'Accommodation (9 nights)', values: ['$1,080', '$2,250', '$4,500'] },
      { label: 'Park fees', values: ['$400', '$400', '$400'] },
      { label: 'Internal flights', values: ['$350', '$450', '$700'] },
      { label: 'Meals & drinks', values: ['$270', '$450', '$900'] },
      { label: 'Activities & tips', values: ['$200', '$400', '$800'] },
      { label: 'Transport & transfers', values: ['$200', '$350', '$600'] },
    ],
    totalRow: ['Total per person', '$2,500', '$4,300', '$7,900'],
  },

  textBlock('What to pack', 'h2'),

  {
    _type: 'packingListBlock',
    _key: key(),
    title: '🎒 Essential packing list',
    items: [
      { icon: '🧥', text: 'Warm fleece (Mara mornings are cold)' },
      { icon: '👒', text: 'Wide-brim hat' },
      { icon: '🕶', text: 'Polarised sunglasses' },
      { icon: '🧴', text: 'SPF 50+ sunscreen' },
      { icon: '📷', text: 'Camera + telephoto lens (200mm+)' },
      { icon: '🔌', text: 'UK-style power adapter (Type G)' },
      { icon: '💊', text: 'Anti-malaria medication' },
      { icon: '🩴', text: 'Reef-safe sandals for coast' },
      { icon: '🎒', text: 'Daypack for game drives' },
      { icon: '👕', text: 'Neutral-coloured safari clothes' },
      { icon: '🦟', text: 'DEET insect repellent' },
      { icon: '🔦', text: 'Head torch for camp nights' },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌿',
    label: 'Sustainability note',
    text: 'Choose conservancy camps over mass-market lodges where possible. Conservancies directly fund land leases from Maasai communities and employ local guides. Your safari money goes further when it stays in the community.',
  },
]

async function push() {
  console.log('Pushing: 10 Days in Kenya Itinerary...')

  await client.createOrReplace({
    _id: 'blog-10-days-kenya-itinerary',
    _type: 'blogPost',
    title: "10 Days in Kenya: The Ultimate First-Timer's Itinerary",
    slug: { _type: 'slug', current: '10-days-kenya-itinerary' },
    status: 'published',
    excerpt: 'From Nairobi to the Masai Mara to Diani Beach — the perfect 10-day route for first-time visitors to Kenya, with day-by-day plans, costs, and insider tips.',
    tags: ['Safari', 'Road Trip', 'Budget Travel', 'Wildlife', 'Beach'],
    readingTime: 15,
    publishedAt: '2026-03-10T08:00:00Z',
    body: postBody,
  })

  console.log('✓ Done: blog-10-days-kenya-itinerary')
}

push().catch((err) => {
  console.error('Push failed:', err)
  process.exit(1)
})
