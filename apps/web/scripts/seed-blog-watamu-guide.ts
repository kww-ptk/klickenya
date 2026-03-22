import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
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
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }
}

function richTextBlock(children: Array<{ text: string; bold?: boolean }>): any {
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: children.map((c) => ({
      _type: 'span',
      _key: key(),
      text: c.text,
      marks: c.bold ? ['strong'] : [],
    })),
  }
}

// ══════════════════════════════════════════════════════
// The Complete Guide to Watamu, Kenya 2026
// ══════════════════════════════════════════════════════

const body = [
  // ── 1. Quick Facts ──────────────────────────────────
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Watamu at a glance',
    accentColor: 'amber',
    items: [
      { icon: '📅', label: 'Best time', value: 'Dec–Mar (dry & hot), Jun–Oct (dry & cooler)' },
      { icon: '✈️', label: 'Getting there', value: 'Fly to Malindi (45 min from NBO)' },
      { icon: '💰', label: 'Budget', value: 'KSh 5,000–30,000/day per person' },
      { icon: '🌴', label: 'Vibe', value: 'Relaxed beach village, Italian-influenced' },
      { icon: '🗣️', label: 'Language', value: 'Swahili, English, some Italian' },
      { icon: '🕐', label: 'Time zone', value: 'EAT (UTC+3) — no daylight saving' },
    ],
  },

  // ── 2. Stats Row ────────────────────────────────────
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '10 km²', label: 'Watamu Marine National Park — one of Kenya\'s oldest' },
      { number: '120 km', label: 'north of Mombasa along the coast road' },
      { number: '30+', label: 'restaurants within walking distance of the beach' },
    ],
  },

  // ── 3. Why Watamu — and Why It's Different ──────────
  textBlock('Why Watamu — and Why It\'s Different', 'h2'),

  richTextBlock([
    { text: 'If you\'re looking for a Watamu Kenya travel guide for 2026 that actually tells you what to expect, you\'re in the right place. Watamu is Kenya\'s most complete beach destination — a small village on the north coast where ' },
    { text: 'world-class marine life, Italian-quality restaurants, and genuinely stunning white-sand beaches', bold: true },
    { text: ' exist within a few kilometres of each other.' },
  ]),

  richTextBlock([
    { text: 'What makes Watamu different from Diani, Kilifi, or Lamu? Three things. First, the ' },
    { text: 'Watamu Marine National Park', bold: true },
    { text: ' — established in 1968, it\'s one of Africa\'s oldest marine protected areas, and the snorkelling and diving are outstanding. Second, the ' },
    { text: 'Italian influence', bold: true },
    { text: '. A large Italian community has called Watamu home for decades, and the food scene reflects it — you\'ll eat better pasta and seafood here than in most European beach towns. Third, the ' },
    { text: 'village feel', bold: true },
    { text: '. Despite being the most tourist-oriented town on the Kenya coast, Watamu is still small enough to walk end-to-end in 20 minutes.' },
  ]),

  textBlock('It is, honestly, the easiest place in Kenya to have a great beach holiday without planning much. That is both its greatest strength and its one limitation — more on that later.'),

  // ── 4. How to Get to Watamu ─────────────────────────
  textBlock('How to Get to Watamu', 'h2'),

  richTextBlock([
    { text: 'Watamu sits 120 km north of Mombasa and 25 km south of Malindi, on Kenya\'s north coast. There is no airport in Watamu itself — the nearest is ' },
    { text: 'Malindi Airport', bold: true },
    { text: ', a 30-minute drive away.' },
  ]),

  textBlock('From Nairobi by air', 'h3'),

  richTextBlock([
    { text: 'Multiple daily flights from Nairobi (JKIA or Wilson) to Malindi on Kenya Airways, Jambojet, AirKenya, and Fly 540. Flight time is ' },
    { text: '45 minutes', bold: true },
    { text: '. One-way fares start from KSh 4,000–6,000 if booked early, rising to KSh 12,000+ during peak season (December–January). From Malindi Airport, a taxi to Watamu costs KSh 2,000–3,000.' },
  ]),

  textBlock('From Nairobi by train + road', 'h3'),

  richTextBlock([
    { text: 'Take the ' },
    { text: 'SGR Madaraka Express', bold: true },
    { text: ' from Nairobi Terminus to Mombasa Terminus — 4.5 hours, KSh 1,000 (economy) or KSh 3,000 (first class). From Mombasa, take a private taxi to Watamu (KSh 7,000–9,000, 2.5 hours) or save money with a matatu from Mombasa\'s Kobil stage to Malindi (KSh 250–350, 2 hours) then a tuk-tuk to Watamu (KSh 100–200, 30 minutes).' },
  ]),

  textBlock('From Mombasa by road', 'h3'),

  textBlock('The coast road from Mombasa to Watamu takes about 2.5–3 hours depending on traffic at the Likoni Ferry crossing (southbound) or through Mombasa city. The road is tarmac the entire way and runs through Kilifi, which is worth a stop. A private taxi costs KSh 7,000–9,000. A matatu is under KSh 600 total but takes closer to 3 hours with the connection in Malindi.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '✈️',
    label: 'Always fly into Malindi, not Mombasa',
    text: 'Unless you want time in Mombasa itself, fly into Malindi. The 45-minute flight plus 30-minute taxi is far better than landing in Mombasa and spending 2.5 hours on the road. The price difference is usually under KSh 2,000 and you save half a day.',
  },

  // ── 5. Best Time to Visit ───────────────────────────
  textBlock('The Best Time to Visit Watamu', 'h2'),

  richTextBlock([
    { text: 'Watamu has a tropical coastal climate — warm year-round with two rainy seasons. The ' },
    { text: 'best months are December to March', bold: true },
    { text: ' (hot, dry, calm seas, perfect snorkelling) and ' },
    { text: 'June to October', bold: true },
    { text: ' (dry, slightly cooler, best kite season). Here is the breakdown:' },
  ]),

  richTextBlock([
    { text: 'December–March (High season): ', bold: true },
    { text: 'The most popular time. Temperatures hit 30–33°C, the sea is calm and clear, and the marine park is at its best for snorkelling. Prices are highest, especially Christmas/New Year when villas book out months in advance. This is when most European visitors come.' },
  ]),

  richTextBlock([
    { text: 'April–May (Long rains): ', bold: true },
    { text: 'The wettest months. Rain can be heavy but it rarely rains all day — mornings are often clear. Accommodation drops 30–50% in price. Some restaurants close or reduce hours. Snorkelling visibility is reduced. Genuinely good value if you don\'t mind occasional downpours.' },
  ]),

  richTextBlock([
    { text: 'June–October (Dry & cool): ', bold: true },
    { text: 'An underrated sweet spot. The Kaskazi winds die down and the Kusi trade winds pick up — perfect for kitesurfing. Temperatures are a comfortable 25–28°C. Fewer tourists but everything is open. Whale sharks sometimes appear June–September.' },
  ]),

  richTextBlock([
    { text: 'November (Short rains): ', bold: true },
    { text: 'A transitional month. Some rain but less predictable than April–May. Prices start rising as high season approaches. Decent for a quieter visit.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌊',
    label: 'The secret shoulder season',
    text: 'June and early July offer the best value in Watamu. The long rains are over, the kite season is starting, prices are still low-season, and the crowds have not arrived. If you are flexible on dates, this is when the locals would tell you to come.',
  },

  // ── 6. Areas of Watamu Explained ────────────────────
  textBlock('Areas of Watamu Explained', 'h2'),

  textBlock('Watamu is small, but where you stay matters. Each area has a different character, and they are all within 10 minutes of each other by tuk-tuk.'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: 'Watamu Town', color: 'teal' },
      { _key: key(), label: 'Turtle Bay', color: 'blue' },
      { _key: key(), label: 'Blue Lagoon', color: 'purple' },
      { _key: key(), label: 'Garoda Beach', color: 'teal' },
    ],
    rows: [
      {
        _key: key(),
        criterion: 'Vibe',
        values: ['Local village life, shops, markets', 'Resort area, family-friendly', 'Quiet, secluded, romantic', 'Wild and natural, less developed'],
        winners: [],
      },
      {
        _key: key(),
        criterion: 'Beach quality',
        values: ['Decent — town beach gets busy', 'Excellent — sheltered bay, calm water', 'Stunning — turquoise lagoon', 'Outstanding — wide, empty, dramatic'],
        winners: [2, 3],
      },
      {
        _key: key(),
        criterion: 'Restaurants nearby',
        values: ['Many — the centre of dining', 'Several resort restaurants', 'Very few — you need transport', 'Almost none — bring supplies'],
        winners: [0],
      },
      {
        _key: key(),
        criterion: 'Best for',
        values: ['Budget travellers, foodies, walkers', 'Families, resort lovers, snorkellers', 'Couples, honeymooners, privacy', 'Adventurers, kite surfers, photographers'],
        winners: [],
      },
    ],
  },

  // ── 7. Where to Stay ───────────────────────────────
  textBlock('Where to Stay', 'h2'),

  richTextBlock([
    { text: 'Watamu has ' },
    { text: 'the widest range of accommodation on the Kenya coast', bold: true },
    { text: '. From all-inclusive resorts and boutique hotels to private villas with pools and simple guest houses — whatever your budget, something exists here.' },
  ]),

  richTextBlock([
    { text: 'The villa scene is particularly strong. Groups of 4–8 people can rent a ' },
    { text: 'private staffed villa with pool, chef, and beach access', bold: true },
    { text: ' for surprisingly reasonable prices — often cheaper per person than a mid-range hotel. This is how most repeat visitors to Watamu stay, and it is the single best-value way to experience the coast.' },
  ]),

  textBlock('Resorts and hotels range from international chains to family-run Italian-owned boutique places. Budget rooms start from around KSh 3,000/night. Mid-range hotels run KSh 8,000–15,000. High-end villas and resorts go from KSh 25,000–80,000+ per night for the whole property.'),

  textBlock('Browse all verified stays at /stays/watamu — we have vetted each property personally.'),

  // ── 8. What to Do in Watamu ─────────────────────────
  textBlock('What to Do in Watamu', 'h2'),

  richTextBlock([
    { text: 'Watamu punches far above its weight for activities. The ' },
    { text: 'marine park alone justifies a visit', bold: true },
    { text: ', but there is genuinely enough here to fill 7–10 days without repeating yourself.' },
  ]),

  textBlock('Watamu Marine National Park', 'h3'),

  richTextBlock([
    { text: 'Established in 1968, the park covers 10 km² of protected reef, seagrass beds, and open water. ' },
    { text: 'Snorkelling trips cost KSh 1,500–3,000 per person', bold: true },
    { text: ' including park entry (KSh 1,775 for non-residents) and boat hire. You will see parrotfish, angel fish, moray eels, sea turtles, and if you are lucky, dolphins. Glass-bottom boats are available for non-swimmers. The best visibility is December–March.' },
  ]),

  textBlock('Kitesurfing', 'h3'),

  richTextBlock([
    { text: 'Watamu is ' },
    { text: 'Kenya\'s kite capital', bold: true },
    { text: '. The lagoon at Garoda Beach is flat, shallow, and ideal for beginners. Advanced riders head to the open water near Turtle Bay. The main season runs June–October when the Kusi winds blow consistently at 15–25 knots. Several IKO-certified schools operate on the beach — lessons start from around KSh 8,000 for a 2-hour session.' },
  ]),

  textBlock('Arabuko Sokoke Forest', 'h3'),

  richTextBlock([
    { text: 'The largest remaining fragment of East African coastal forest sits just 10 minutes from Watamu town. This is where you come for ' },
    { text: 'elephants at sunset', bold: true },
    { text: ' — a small population of around 100 forest elephants lives here and they come to drink at the salt lick in the evening. The bird watching is exceptional: the Sokoke Scops Owl, Amani Sunbird, and Clarke\'s Weaver are all globally threatened species found here. Entry is KSh 600 for non-residents.' },
  ]),

  textBlock('Mida Creek', 'h3'),

  textBlock('A tidal inlet surrounded by mangroves, Mida Creek is a bird sanctuary and one of the most peaceful spots on the coast. Take a canoe trip through the mangroves at high tide (KSh 1,000–2,000) or walk the boardwalk at low tide. Over 350 bird species have been recorded here. The community-run eco-tourism project means your money goes directly to local conservation.'),

  textBlock('Dhow trips', 'h3'),

  textBlock('Traditional wooden sailing boats take you out to sandbars and coral gardens. Half-day trips cost KSh 2,000–5,000 per person and typically include snorkelling gear and fresh seafood grilled on the beach. Sundowner dhow cruises are magical — the light on the water at 5:30pm is something you will photograph and never tire of.'),

  textBlock('Browse all experiences at /experiences/watamu.'),

  // ── 9. Pull Quote ───────────────────────────────────
  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'There is a moment in Watamu — usually around the third day — when you stop checking your phone and start checking the tide. That is when the place gets you.',
    attribution: '— Overheard at a beach bar in Turtle Bay',
    accentColor: 'teal',
  },

  // ── 10. Where to Eat ───────────────────────────────
  textBlock('Where to Eat in Watamu', 'h2'),

  richTextBlock([
    { text: 'Watamu\'s food scene is ' },
    { text: 'genuinely one of the best on the entire East African coast', bold: true },
    { text: '. The Italian influence is everywhere — proper wood-fired pizza, handmade pasta, fresh seafood — but there is also excellent Swahili cuisine, Indian food, and a growing number of fusion restaurants.' },
  ]),

  richTextBlock([
    { text: 'For a village of its size, the density of good restaurants is remarkable. You can eat incredibly well for KSh 800–1,500 at local places, or spend KSh 3,000–6,000 per person at the high-end Italian spots. ' },
    { text: 'Cocktail bars have multiplied in recent years', bold: true },
    { text: ' — sunset drinks with ocean views are a nightly ritual. Several excellent cafes now serve proper espresso-based coffee, which is a welcome change from the instant Nescafe that dominates most of coastal Kenya.' },
  ]),

  textBlock('Watamu town is also the most tourist-friendly area on the north coast for shopping — souvenir shops, beach wear, handmade jewellery, and local art are all within walking distance of the main strip.'),

  textBlock('Browse restaurants at /experiences/watamu?sub=restaurants.'),

  // ── 11. Nightlife ───────────────────────────────────
  textBlock('Watamu Nightlife', 'h2'),

  richTextBlock([
    { text: 'Watamu\'s nightlife scene has grown dramatically over the past few years. It is not Mombasa or Nairobi — this is still a beach village — but on the right nights, ' },
    { text: 'the energy is genuinely excellent', bold: true },
    { text: '.' },
  ]),

  richTextBlock([
    { text: 'Friday Lab', bold: true },
    { text: ' at Sunset Lab is the anchor event — a weekly Friday night party that draws people from Malindi and even Kilifi. DJs, live music, open-air dancefloor, and a crowd that mixes international visitors with locals and expats. ' },
    { text: 'Paparemo', bold: true },
    { text: ' hosts beach parties on weekends with bonfires and music right on the sand. ' },
    { text: 'Speedy\'s Backyard', bold: true },
    { text: ' is where you end up at 2am when everything else winds down — cheap drinks, good vibes, and a genuinely local crowd.' },
  ]),

  textBlock('Most venues get going around 10pm and run until 2–3am on weekends. Tuk-tuks are available all night — expect to pay KSh 300–600 between venues.'),

  textBlock('Read the full guide at /journal/watamu-nightlife-guide.'),

  // ── 12. Money, SIMs, Practical Info ─────────────────
  textBlock('Money, SIMs and Practical Info', 'h2'),

  textBlock('M-Pesa and cash', 'h3'),

  richTextBlock([
    { text: 'M-Pesa is Kenya\'s mobile money system and it is ' },
    { text: 'used everywhere in Watamu', bold: true },
    { text: '. Most restaurants, shops, and even tuk-tuk drivers accept it. To use M-Pesa as a visitor, you need a Kenyan SIM card registered with your passport. Safaricom is the best network on the coast — buy a SIM at any agent in Watamu town for KSh 100.' },
  ]),

  textBlock('Always carry some cash in KES. ATMs exist in Watamu town (KCB and Equity are the most reliable) but they do run out, especially during peak season. Card machines work at larger hotels and restaurants but are unreliable at smaller places. Draw cash in Malindi or Mombasa as a backup.'),

  textBlock('SIM cards and internet', 'h3'),

  textBlock('Safaricom 4G coverage is good across Watamu — fast enough for video calls in most areas. Buy a data bundle: 5GB costs around KSh 500 (valid 7 days). Wi-Fi at hotels and restaurants varies wildly — some excellent, some barely functional. Do not rely on hotel Wi-Fi for remote work.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🛡️',
    label: 'Safety in Watamu',
    text: 'Watamu is one of the safest beach destinations in Kenya. The tourism police have a visible presence and the community is welcoming. Standard precautions apply: don\'t walk alone on unlit beaches after dark, keep valuables out of sight, and use a tuk-tuk for night journeys. Violent crime targeting tourists is very rare.',
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'Beach boys and scam awareness',
    text: 'Beach vendors ("beach boys") will approach you offering tours, boat trips, and souvenirs. Most are harmless and just trying to earn a living, but prices quoted on the beach are typically 3–5x what you would pay if you booked through your hotel or a verified operator. Politely decline and book activities through trusted channels. Never hand over money in advance to someone you met on the beach.',
  },

  // ── 13. How Much Does Watamu Cost? ──────────────────
  textBlock('How Much Does Watamu Cost?', 'h2'),

  textBlock('Here is what a day in Watamu actually costs in 2026, broken down by budget level. All prices are per person.'),

  {
    _type: 'budgetTableBlock',
    _key: key(),
    columns: ['Category', 'Budget', 'Mid-range', 'Luxury'],
    rows: [
      { _key: key(), label: 'Accommodation', values: ['KSh 2,000–4,000', 'KSh 8,000–15,000', 'KSh 25,000–60,000'] },
      { _key: key(), label: 'Food (3 meals)', values: ['KSh 1,500–2,500', 'KSh 3,000–5,000', 'KSh 6,000–12,000'] },
      { _key: key(), label: 'Transport', values: ['KSh 300–600', 'KSh 500–1,500', 'KSh 2,000–5,000'] },
      { _key: key(), label: 'Activities', values: ['KSh 500–2,000', 'KSh 2,000–5,000', 'KSh 5,000–15,000'] },
    ],
    totalRow: ['Daily total', 'KSh 4,300–9,100', 'KSh 13,500–26,500', 'KSh 38,000–92,000'],
  },

  textBlock('Budget travellers can absolutely do Watamu on KSh 5,000–8,000 per day by staying in guest houses, eating at local restaurants, and walking everywhere. Mid-range visitors spending KSh 15,000–25,000 will eat very well, stay comfortably, and do an activity a day. Luxury visitors in private villas with a chef can spend anything they want.'),

  // ── 14. The Honest Assessment ───────────────────────
  textBlock('The Honest Assessment', 'h2'),

  richTextBlock([
    { text: 'We love Watamu. It is the most polished, most visitor-friendly beach destination in Kenya. If you are coming to the coast for the first time, or travelling with family, or you want guaranteed good food and easy logistics — ' },
    { text: 'Watamu is the obvious choice', bold: true },
    { text: '.' },
  ]),

  richTextBlock([
    { text: 'The marine park is world-class. The food scene is extraordinary for a village this size. The beaches are stunning. The kite conditions are excellent. For families, the infrastructure and safety make it the easiest beach in Kenya.' },
  ]),

  richTextBlock([
    { text: 'The honest downsides? ' },
    { text: 'Watamu is the most touristy place on the Kenya coast.', bold: true },
    { text: ' Beach vendors are persistent. Prices are higher than Kilifi or Diani for comparable quality. And because the town is so geared towards visitors, you don\'t always get the depth of connection to Kenyan life and culture that you might find in Kilifi, where the local and international communities are more integrated.' },
  ]),

  textBlock('It is a curated experience — beautiful, easy, and enjoyable, but curated nonetheless. If you want raw authenticity and a deeper sense of place, Kilifi or Lamu might be better fits. If you want the best all-round beach holiday in Kenya with the least amount of planning, Watamu wins every time.'),

  // ── 15. Verdict Card ────────────────────────────────
  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Our Verdict',
    title: 'Watamu — Kenya\'s most complete beach destination',
    pros: [
      'World-class marine park and snorkelling',
      'Best food scene on the Kenya coast',
      'Widest range of accommodation from budget to luxury',
      'Excellent for families — safe, easy, well-organised',
      'Kenya\'s best kitesurfing conditions',
      'Beautiful beaches — Garoda and Blue Lagoon are stunning',
    ],
    cons: [
      'Most touristy town on the coast — persistent beach vendors',
      'Prices higher than Kilifi or Diani for comparable quality',
      'Can feel curated — less authentic local integration',
      'Gets busy Dec–Jan — book villas well in advance',
      'Limited nightlife compared to Kilifi or Mombasa',
    ],
  },

  // ── 16. Who Is It For ───────────────────────────────
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Watamu is perfect for...',
    items: [
      { _key: key(), icon: '👨‍👩‍👧‍👦', text: 'Families — safe beaches, easy logistics, kid-friendly restaurants' },
      { _key: key(), icon: '💑', text: 'Couples — romantic villas, sunset dhow cruises, candlelit Italian dinners' },
      { _key: key(), icon: '🍝', text: 'Foodies — the best restaurant density on the Kenya coast' },
      { _key: key(), icon: '🪁', text: 'Kite surfers — world-class lagoon conditions June–October' },
      { _key: key(), icon: '🐢', text: 'Marine life enthusiasts — turtles, dolphins, whale sharks, coral reefs' },
      { _key: key(), icon: '🏡', text: 'Villa groups — staffed private villas with pools at incredible value' },
    ],
  },

  // ── 17. Distance Chips ──────────────────────────────
  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { _key: key(), icon: 'pin', text: '120 km north of Mombasa' },
      { _key: key(), icon: 'pin', text: '25 km south of Malindi' },
      { _key: key(), icon: 'pin', text: '560 km from Nairobi' },
      { _key: key(), icon: 'clock', text: '45 min flight from Nairobi to Malindi' },
      { _key: key(), icon: 'clock', text: '2.5 hrs drive from Mombasa' },
      { _key: key(), icon: 'clock', text: '30 min taxi from Malindi Airport' },
    ],
  },
]

// ══════════════════════════════════════════════════════
// Seed the post
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('Seeding Watamu complete guide...')

  await client.createOrReplace({
    _id: 'blog-complete-guide-watamu-2026',
    _type: 'blogPost',
    title: 'The Complete Guide to Watamu, Kenya 2026',
    slug: { _type: 'slug', current: 'complete-guide-watamu-kenya-2026' },
    status: 'published',
    primaryCategory: 'destination_guide',
    subcategory: 'city_guide',
    location: 'watamu',
    series: 'Kenya Destination Guides',
    postType: 'guide',
    focusKeyword: 'watamu kenya travel guide 2026',
    seoTitle: 'Watamu Kenya Guide 2026 — Everything You Need',
    seoDescription:
      'The only Watamu guide you need. Beaches, restaurants, villas, transport, costs and insider tips from locals who live here.',
    excerpt:
      "Everything you need to know about Watamu — Kenya's most stunning beach destination. Where to stay, what to eat, how to get there, and what the guide books don't tell you.",
    readingTime: 14,
    publishedAt: '2026-03-20T08:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Beach', 'Coast', 'Watamu'],
    keywords: ['watamu', 'beach', 'coast', 'kenya', 'marine park', 'snorkelling', 'villas'],
    body,
  })

  console.log('✅ Watamu guide seeded')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
