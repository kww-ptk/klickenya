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

// ── POST 1: Itinerary ──────────────────────────────

const post1Body = [
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

  // Day 4-5
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

// ── POST 2: Comparison ─────────────────────────────

const post2Body = [
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ The three destinations at a glance',
    accentColor: 'purple',
    items: [
      { icon: '🐢', label: 'Watamu', value: 'Marine park, eco-tourism, family beaches, Italian food scene' },
      { icon: '✨', label: 'Kilifi', value: 'Bioluminescence, arts scene, bohemian vibe, kitesurf capital' },
      { icon: '⛳', label: 'Vipingo', value: 'Africa\'s only PGA golf course, luxury estate, private beach club' },
      { icon: '📍', label: 'Distance from Mombasa', value: 'Vipingo: 35km · Kilifi: 55km · Watamu: 120km' },
      { icon: '💸', label: 'Budget range', value: 'Kilifi (lowest) → Watamu (mid) → Vipingo (highest)' },
      { icon: '🏖', label: 'Best beach', value: 'All three are exceptional — but very different in character' },
    ],
  },

  textBlock('The honest comparison', 'h2'),
  textBlock('Before we go destination by destination, here\'s the fast version. Watamu is for marine life, eco-tourism, and families who want structured activities and world-class snorkelling. Kilifi is for the culturally curious, the free-spirited, and the kite-surfer who wants to fall into a town rather than a resort. Vipingo is for the golfer, the luxury-seeker, and the family that wants everything on one secure, manicured estate.'),
  textBlock('The single most useful question to ask yourself: "Do I want to discover a place, or do I want a place to take care of me?" If it\'s the former — Kilifi or Watamu. If it\'s the latter — Vipingo.'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { label: '🐢 Watamu', color: 'teal' },
      { label: '✨ Kilifi', color: 'blue' },
      { label: '⛳ Vipingo', color: 'purple' },
    ],
    rows: [
      { criterion: 'Vibe', values: ['Eco-resort · family', 'Bohemian · creative', 'Luxury estate · golf'], winners: [] },
      { criterion: 'Beach quality', values: ['3 stunning bays + marine park', 'Bofa Beach — empty, powdery', 'Private Kuruwitu beach'], winners: [0] },
      { criterion: 'Water sports', values: ['Snorkelling, diving, kayaking', 'Kitesurfing, SUP, dhow cruises', 'Snorkelling, kayaking, sailing'], winners: [] },
      { criterion: 'Nightlife', values: ['Relaxed bar scene', 'Lively — Distant Relatives, Salty\'s', 'Estate events, beach bonfires'], winners: [1] },
      { criterion: 'Food scene', values: ['Strong Italian influence', 'Creative — Food Movement, Salty\'s', 'Resort restaurants'], winners: [0] },
      { criterion: 'Kids', values: ['Excellent — turtle watching, marine park', 'Good — uncrowded beaches', 'Best — Holiday Club, pony rides'], winners: [2] },
      { criterion: 'Budget (per night)', values: ['KSh 5,000–40,000+', 'KSh 2,000–25,000', 'KSh 15,000–80,000+'], winners: [1] },
      { criterion: 'Best for', values: ['Marine life, honeymooners, eco travellers', 'Backpackers, digital nomads, kitesurfers', 'Golfers, luxury couples, large families'], winners: [] },
    ],
  },

  // Watamu section
  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: 1,
    pill: 'Watamu',
    pillColor: 'teal',
    title: 'The marine paradise',
  },
  textBlock('Watamu means "sweet people" in Swahili, and it lives up to the name — an easy-going, sun-drenched village about 120 kilometres north of Mombasa, where Italian expats have lived alongside Kenyan fishing communities for decades. The result is a town with genuine character: freshly caught red snapper served alongside proper Neapolitan pizza, a KWS-protected marine park where hawksbill turtles nest on the beach, and a laid-back atmosphere that draws you in for longer than you planned.'),

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '500+', label: 'fish species in Watamu Marine Park' },
      { number: '3', label: 'distinct bays — Watamu, Blue Lagoon, Turtle Bay' },
      { number: '10 km²', label: 'of protected marine park and reserve' },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🐋',
    label: 'Seasonal highlight — humpback whales',
    text: 'Between July and September, humpback whales migrate through the waters off Watamu on their way from Antarctica. Hemingways Watamu runs responsible whale-watching excursions with marine experts. Book well in advance — spots sell out fast.',
  },

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Watamu verdict',
    title: 'Choose Watamu if you want structured, world-class marine experiences with a relaxed town to come back to.',
    pros: [
      'Kenya\'s finest snorkelling and marine park',
      'Active turtle conservation you can participate in',
      'Whale sharks (Nov–Mar) and humpbacks (Jul–Sep)',
      'Gedi Ruins + Arabuko Forest for land-based days',
      'Excellent food scene with Italian influence',
    ],
    cons: [
      'Seaweed season in September',
      'Limited nightlife',
      'Far from Mombasa (2.5 hrs)',
      'No golf course',
    ],
  },

  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Watamu is perfect for...',
    items: [
      { icon: '🤿', text: 'Snorkelling and diving enthusiasts' },
      { icon: '🐢', text: 'Wildlife and conservation travellers' },
      { icon: '👨‍👩‍👧', text: 'Families with children' },
      { icon: '💑', text: 'Honeymooners wanting eco-luxury' },
      { icon: '📸', text: 'Underwater photographers' },
      { icon: '🦅', text: 'Birders (150+ species in the forest)' },
    ],
  },

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: '120 km north of Mombasa' },
      { icon: 'pin', text: '25 km south of Malindi' },
      { icon: 'clock', text: '2.5–3 hrs drive from Mombasa' },
      { icon: 'clock', text: '~1 hr from Malindi Airport' },
    ],
  },

  // Kilifi section
  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: 2,
    pill: 'Kilifi',
    pillColor: 'blue',
    title: 'Kenya\'s best-kept secret',
  },
  textBlock('Kilifi is what happens when a coastal town hasn\'t been fully discovered yet — and the word is now spreading fast. Sandwiched between Mombasa and Watamu, 55 kilometres north of the city, Kilifi is built around a spectacular tidal creek where the water is calm, the sunsets are outrageous, and on certain dark nights, the creek itself glows electric blue.'),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'Kilifi reminds me of Canggu before it got famous, or Puerto Escondido before the crowds arrived. It has that rare energy of a place on the edge of something — creative, authentic, and still completely itself.',
    attribution: '— The Partying Traveler, updated 2026',
    accentColor: 'purple',
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'purple',
    icon: '✨',
    label: 'The unmissable experience — bioluminescent plankton',
    text: 'On dark nights — especially around the new moon — Fumbini Beach on Kilifi Creek comes alive with bioluminescent plankton. Every movement in the water ignites blue light around you. Best months are November to April. No equipment needed — just wade in after dark.',
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '55 km', label: 'north of Mombasa — about 1.5 hrs' },
      { number: '2003', label: 'year the Kilifi Gold Triathlon began' },
      { number: 'Jun–Sep', label: 'peak kite season with trade winds' },
    ],
  },

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'blue',
    label: 'Kilifi verdict',
    title: 'Choose Kilifi if you want to discover a place rather than be taken care of. The reward is enormous.',
    pros: [
      'Bioluminescent plankton — genuinely bucket-list',
      'Bofa Beach — empty, pristine, no hawkers',
      'Best nightlife on the north coast',
      'East Africa\'s best kitesurfing conditions',
      'Most affordable of the three destinations',
    ],
    cons: [
      'Limited luxury accommodation options',
      'Infrastructure is basic in places',
      'Beach can have seaweed seasonally',
      'Not ideal if you want everything organised for you',
    ],
  },

  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Kilifi is perfect for...',
    items: [
      { icon: '🏄', text: 'Kitesurfers and water sports enthusiasts' },
      { icon: '💻', text: 'Digital nomads seeking community' },
      { icon: '🎨', text: 'Creatives and culture seekers' },
      { icon: '🎒', text: 'Budget-conscious travellers' },
      { icon: '🌙', text: 'Night owls who love a scene' },
      { icon: '🧘', text: 'Yoga and wellness retreaters' },
    ],
  },

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: '55 km north of Mombasa' },
      { icon: 'pin', text: '65 km south of Watamu' },
      { icon: 'clock', text: '1.5 hrs from Mombasa' },
      { icon: 'clock', text: '45 min from Malindi Airport' },
    ],
  },

  // Vipingo section
  {
    _type: 'destinationSectionBlock',
    _key: key(),
    number: 3,
    pill: 'Vipingo',
    pillColor: 'purple',
    title: 'The luxury estate',
  },
  textBlock('Vipingo Ridge is not a town — it\'s a 2,500-acre private estate perched on coral cliffs above the Indian Ocean, 35 kilometres north of Mombasa. At its centre: Africa\'s only PGA-standard golf course, designed by David Jones, with the ocean visible from 13 of its 18 holes. Everything here is manicured, gated, and designed to make you forget the outside world exists.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'purple',
    icon: '⛳',
    label: 'Golf at Vipingo Ridge',
    text: 'The course is open to non-residents but booking is essential, especially on weekends. Green fees are KSh 8,000–12,000 for visitors. Twilight rates (after 2 PM) offer better value and the best light for the ocean-view holes.',
  },

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'purple',
    label: 'Vipingo verdict',
    title: 'Choose Vipingo if you want a polished, secure, everything-in-one-place experience.',
    pros: [
      'Africa\'s only PGA golf course',
      'Private beach club with no crowds',
      'Excellent kids\' programmes and family facilities',
      'Closest to Mombasa — easy access',
      'Gated estate with 24/7 security',
    ],
    cons: [
      'Most expensive option by far',
      'Feels insulated from real Kenya',
      'Limited restaurant variety outside the estate',
      'Not for backpackers or independent explorers',
    ],
  },

  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Vipingo is perfect for...',
    items: [
      { icon: '⛳', text: 'Golfers (obviously)' },
      { icon: '👔', text: 'Corporate retreat groups' },
      { icon: '👨‍👩‍👧‍👦', text: 'Large families wanting kids\' programmes' },
      { icon: '💎', text: 'Luxury travellers who value privacy' },
      { icon: '🏡', text: 'Property investors scouting the coast' },
      { icon: '🛬', text: 'Short-stay visitors (closest to Mombasa)' },
    ],
  },

  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: '35 km north of Mombasa' },
      { icon: 'clock', text: '35 min from Moi International Airport' },
      { icon: 'clock', text: 'Direct flight to estate airstrip available' },
    ],
  },

  textBlock('The final decision', 'h2'),
  textBlock('Still not sure? Here\'s the simplest way to decide.'),

  {
    _type: 'deciderGridBlock',
    _key: key(),
    cards: [
      {
        label: 'Watamu',
        color: 'teal',
        title: 'Pick Watamu if you want...',
        items: [
          'World-class snorkelling and marine life',
          'A relaxed eco-tourism vibe',
          'Italian-influenced food scene',
          'Activities for the whole family',
          'Turtle conservation experiences',
        ],
      },
      {
        label: 'Kilifi',
        color: 'blue',
        title: 'Pick Kilifi if you want...',
        items: [
          'Bioluminescent plankton at night',
          'East Africa\'s best kitesurfing',
          'A creative, bohemian community',
          'Budget-friendly beach holiday',
          'The best nightlife on the coast',
        ],
      },
      {
        label: 'Vipingo',
        color: 'purple',
        title: 'Pick Vipingo if you want...',
        items: [
          'Africa\'s only PGA golf course',
          'Private beach club exclusivity',
          'Structured kids\' programmes',
          'Gated security and convenience',
          'Closest beach to Mombasa',
        ],
      },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '💡',
    label: 'Can\'t choose? Combine them',
    text: 'With 10+ days on the coast, you can easily split your time: start in Vipingo for golf and relaxation, move to Kilifi for culture and nightlife, and finish in Watamu for marine adventures. All three are on the same road.',
  },
]

// ── Seed both posts ────────────────────────────────

async function seed() {
  console.log('Seeding blog posts...')

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
    body: post1Body,
  })
  console.log('✓ Post 1 seeded: 10-days-kenya-itinerary')

  await client.createOrReplace({
    _id: 'blog-watamu-kilifi-vipingo-coast-guide',
    _type: 'blogPost',
    title: 'Watamu, Kilifi, or Vipingo? How to Choose Your Kenya Coast Base (2026 Guide)',
    slug: { _type: 'slug', current: 'watamu-kilifi-vipingo-kenya-coast-guide' },
    status: 'published',
    excerpt: 'Trying to choose between Watamu, Kilifi, and Vipingo for your Kenya coast holiday? We break down each destination by vibe, activities, budget, and who it\'s really for.',
    tags: ['Beach', 'Coast', 'Budget Travel'],
    readingTime: 10,
    publishedAt: '2026-03-14T08:00:00Z',
    body: post2Body,
  })
  console.log('✓ Post 2 seeded: watamu-kilifi-vipingo-kenya-coast-guide')

  console.log('Done! Both blog posts seeded successfully.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
