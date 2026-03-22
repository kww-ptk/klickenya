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

// ══════════════════════════════════════════════════════
// The Complete Guide to Diani Beach, Kenya 2026
// ══════════════════════════════════════════════════════

const dianiBody = [
  // ── Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Diani Beach — at a glance',
    accentColor: 'purple',
    items: [
      { icon: '🏖', label: 'Beach length', value: '17 km of white sand' },
      { icon: '✈️', label: 'Nearest airport', value: 'Ukunda Airstrip (UKA)' },
      { icon: '💰', label: 'Budget range', value: 'KSh 3,000–80,000+/night' },
      { icon: '🌊', label: 'Water temp', value: '25–29°C year-round' },
      { icon: '🌤', label: 'Best months', value: 'Jan–Mar, Jul–Oct' },
      { icon: '🏆', label: 'Awards', value: "Africa's Leading Beach — multiple years" },
    ],
  },

  // ── Stat Row ──
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { _key: key(), number: '17 km', label: 'of unbroken white-sand coastline' },
      { _key: key(), number: '30+', label: 'dive sites along the reef' },
      { _key: key(), number: '~480 km', label: 'from Nairobi by road (7–8 hrs)' },
    ],
  },

  // ── Section 1: Why Diani ──
  textBlock('Why Diani Beach — Africa\'s Award-Winning Destination', 'h2'),

  textBlock('If you\'re searching for a diani beach kenya travel guide 2026, you\'ve picked the right destination. Diani has been voted Africa\'s Leading Beach Destination at the World Travel Awards multiple times, and when you step onto that sand for the first time, you understand why. The white sand is not exaggerated — it is genuinely, almost absurdly white. The water shifts between turquoise and deep blue depending on the tide and the light. The reef sits just offshore, protecting a calm lagoon that feels like a natural swimming pool.'),

  textBlock('Diani is Kenya\'s premium beach destination. It sits on the south coast of Mombasa, roughly 30 km past the Likoni Ferry crossing. Unlike the north coast towns of Kilifi and Watamu, Diani has always positioned itself as the polished, resort-focused option. Big-name hotels line the beach. The road infrastructure is solid. There are ATMs, supermarkets, and a proper shopping centre. If Kilifi is the bohemian artist and Watamu is the marine biologist, Diani is the well-dressed cousin who books the best table at the restaurant.'),

  textBlock('It\'s hugely popular with Nairobi residents as a weekend getaway — especially during school holidays and long weekends. Mombasa locals drive down regularly. International visitors, particularly from Europe, have been coming for decades. The result is a destination with genuine tourism infrastructure that actually works.'),

  // ── Section 2: Getting to Diani ──
  textBlock('Getting to Diani Beach', 'h2'),

  textBlock('By air: Ukunda Airstrip sits right at the edge of Diani. Fly540, Safarilink, and Jambojet operate daily flights from Nairobi\'s Wilson Airport (1 hour, KSh 8,000–15,000 one way). There are also connections from Malindi and the Masai Mara during high season. From the airstrip, a tuk-tuk to most hotels costs KSh 300–500.', 'h3'),

  textBlock('By road from Mombasa: The drive from Mombasa Island to Diani is only 30 km, but it includes the Likoni Ferry crossing. The ferry itself is free for pedestrians and costs KSh 300 for a standard car. The problem is the queues — during rush hours and holidays, you can wait 1–3 hours. On a good day with no traffic, Mombasa to Diani takes 45 minutes. On a bad day, it takes three hours.'),

  textBlock('By road from Nairobi: The Nairobi–Mombasa highway is about 480 km. Budget 7–8 hours including stops. The SGR Madaraka Express train from Nairobi to Mombasa (KSh 1,000–3,000, 4.5 hours) is a far better option — then taxi or matatu from Mombasa terminus to Diani. Total cost for train + taxi: roughly KSh 4,000–6,000.'),

  // ── Likoni Ferry Tip ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💡',
    label: 'Beating the Likoni Ferry queue',
    text: 'Cross before 7 AM or after 8 PM to avoid the worst queues. Alternatively, the Dongo Kundu bypass road (opened 2024) connects the south coast to the mainland without using the ferry — it adds distance but saves enormous time during peak periods. If you\'re a pedestrian, just walk on — there\'s never a queue for foot passengers.',
  },

  // ── Section 3: Best Time to Visit ──
  textBlock('Best Time to Visit Diani', 'h2'),

  textBlock('Diani\'s peak season runs from December to March and July to October. These are the driest months with the calmest seas. January and February are the hottest months — expect temperatures around 30–33°C and humidity that hits hard. The water is warmest and the visibility for diving and snorkelling is at its best.'),

  textBlock('April to June is the long rains season. Many resorts offer steep discounts (40–60% off), but be prepared for heavy afternoon showers, rougher seas, and some beach erosion. A few smaller hotels close entirely. That said, mornings are often clear and the landscape turns impossibly green.'),

  textBlock('One honest observation: Diani has gotten noticeably quieter in recent years. The pandemic hit the international tourism hard, and not all of it has come back. Some long-running restaurants and bars have closed. The upside is that the beach feels less crowded than it did ten years ago. The downside is that some of the community energy and nightlife has faded.'),

  // ── Section 4: Areas of Diani ──
  textBlock('Areas of Diani Explained', 'h2'),

  textBlock('Diani isn\'t one single beach — it\'s a 17 km stretch with distinct areas, each with a different character. Where you stay matters more than people realise.'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: '🏖 North Diani', color: 'teal' },
      { _key: key(), label: '🌴 South Diani', color: 'blue' },
      { _key: key(), label: '🐚 Tiwi Beach', color: 'purple' },
      { _key: key(), label: '🌊 Galu Beach', color: 'amber' },
    ],
    rows: [
      { _key: key(), criterion: 'Vibe', values: ['Resort-heavy, busy', 'Quieter, more spread out', 'Secluded, raw, budget', 'Upmarket residential'], winners: [] },
      { _key: key(), criterion: 'Beach', values: ['Wide, white, good swimming', 'Wider, fewer people', 'Rocky in parts, dramatic', 'Long, clean, palm-lined'], winners: [1, 3] },
      { _key: key(), criterion: 'Hotels', values: ['Leopard Beach, Baobab', 'Almanara, The Sands', 'Budget guesthouses, Airbnbs', 'Kinondo Kwetu, private villas'], winners: [] },
      { _key: key(), criterion: 'Best for', values: ['First-timers, resort lovers', 'Couples, repeat visitors', 'Backpackers, solitude', 'Luxury seekers, families'], winners: [] },
    ],
  },

  // ── Section 5: Diani Beach Road ──
  textBlock('Diani Beach Road — The Main Strip', 'h2'),

  textBlock('Everything in Diani happens on one road. Diani Beach Road runs parallel to the coast for about 15 km, and it\'s where you\'ll find every restaurant, bar, shop, and service you need. Diani Beach Shopping Centre is the main hub — it has Nakumatt (now Naivas), a Barclays ATM, forex bureaus, a pharmacy, and several tour operators. There\'s also the smaller Ukunda Junction area closer to the main highway.'),

  textBlock('Getting around Diani Beach Road is easy. Tuk-tuks are everywhere and charge KSh 100–300 for most trips along the strip. Boda-bodas (motorbike taxis) are cheaper at KSh 50–200 but come with the usual safety caveats. Several hotels offer free shuttle services. You can also rent a car — a basic SUV runs about KSh 4,000–7,000 per day.'),

  // ── Section 6: Water Sports ──
  textBlock('Water Sports & Activities', 'h2'),

  textBlock('This is where Diani genuinely earns its reputation. The Indian Ocean reef system here is extensive and in good condition. There are over 30 mapped dive sites within a 30-minute boat ride.'),

  textBlock('Diving', 'h3'),
  textBlock('Diani\'s diving is world-class. The reef drops to 30+ metres and is home to moray eels, whale sharks (seasonal, October–March), reef sharks, rays, and an enormous diversity of tropical fish. A single dive costs KSh 5,000–8,000; a PADI Open Water course runs KSh 35,000–50,000. Diving Diani and Diani Marine are both reputable operators with modern equipment.'),

  textBlock('Kitesurfing', 'h3'),
  textBlock('Diani is one of East Africa\'s best kitesurfing spots. The trade winds blow consistently from June to September and December to March. Galu Beach is the prime kite spot — the lagoon is wide and shallow at low tide, perfect for beginners. Expect to pay KSh 8,000–12,000 for a 2-hour beginner lesson. H2O Extreme and Kite Centre Diani are the established schools.'),

  textBlock('Snorkelling & More', 'h3'),
  textBlock('Snorkelling trips to the reef cost KSh 2,000–4,000 per person including equipment. Deep-sea fishing charters start at KSh 25,000 for a half day. Glass-bottom boat rides are popular with families at KSh 1,500–2,500. Jet skiing, paddleboarding, and kayaking are all available along the main beach strip.'),

  textBlock('Browse all Diani water sports and activities at /experiences/diani-beach.'),

  // ── Pull Quote ──
  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'The first time you surface from a dive on the Diani reef and look back at that endless white coastline from the water — you understand why people keep coming back.',
    attribution: '— Longtime Diani dive instructor',
    accentColor: 'amber',
  },

  // ── Section 7: Where to Stay ──
  textBlock('Where to Stay in Diani', 'h2'),

  textBlock('Diani has the widest range of accommodation on the Kenya coast. At the top end, you\'re looking at places like Almanara Luxury Villas (from KSh 50,000/night), Kinondo Kwetu (an intimate boutique hotel on Galu Beach), and The Sands at Nomad (KSh 25,000–45,000). These are genuinely excellent properties with private beach access, pools, and spa facilities.'),

  textBlock('The mid-range is strong. Leopard Beach Resort (KSh 15,000–30,000) is the grand old dame of Diani — sprawling, reliable, great pool. Baobab Beach Resort is similar. Diani Reef Beach Resort is popular with tour groups. Swahili Beach Resort has a more modern feel.'),

  textBlock('Budget travellers have options too, though they\'re mostly on the inland side of Diani Beach Road. Airbnbs and guesthouses start from KSh 2,500–5,000 per night. Stilts Backpackers is a Diani institution for the budget crowd. Diani Backpackers is another solid option with a social vibe.'),

  textBlock('See all Diani stays and book at /stays/diani-beach.'),

  // ── Section 8: Where to Eat ──
  textBlock('Where to Eat in Diani', 'h2'),

  textBlock('Diani\'s food scene is solid if not spectacular. The big resort restaurants are reliable but unsurprising. Where it gets interesting is the independent spots along Diani Beach Road. Ali Barbour\'s Cave Restaurant is the most famous — you literally dine inside a coral cave that\'s hundreds of thousands of years old. It\'s touristy but genuinely atmospheric. Budget KSh 4,000–7,000 per person.'),

  textBlock('For casual eating, Sails Beach Bar does good seafood and pizza right on the sand. Leonardo\'s serves reliable Italian. Nomad Beach Bar at The Sands is one of the best sunset spots on the coast. For local food, the small hotels and roadside spots along the main road serve pilau, biryani, and fresh fish for KSh 300–800.'),

  textBlock('Full restaurant guide at /experiences/diani-beach?sub=restaurants.'),

  // ── Section 9: Nightlife ──
  textBlock('Diani Nightlife', 'h2'),

  textBlock('Let\'s be honest: Diani\'s nightlife isn\'t what it was. In its heyday, Forty Thieves Beach Bar was legendary — a barefoot, on-the-sand institution that packed out every weekend. It still operates and remains the default nightlife spot, but the crowds are thinner and the energy is more relaxed than raucous.'),

  textBlock('Beach parties happen occasionally during high season, usually organized by the larger resorts or pop-up event companies. Shakatak is another late-night option. Most visitors end up having sundowners at their hotel bar, dinner at a restaurant, and calling it a night. If you\'re looking for Ibiza-on-the-Indian-Ocean, Diani isn\'t it anymore — but if you want a cold Tusker with your feet in the sand under the stars, it delivers perfectly.'),

  // ── Section 10: Day Trips ──
  textBlock('Day Trips from Diani', 'h2'),

  textBlock('Wasini Island', 'h3'),
  textBlock('The most popular day trip from Diani. A dhow sails you to Wasini Island for snorkelling on the coral garden, a seafood lunch on the island, and often dolphin spotting en route. Full-day trips cost KSh 5,000–9,000 per person including boat, lunch, and park fees. The snorkelling at Kisite-Mpunguti Marine Park is superb — better than anything you\'ll find on the main Diani reef. Expect to see dolphins, turtles, and if you\'re lucky, whale sharks.'),

  textBlock('Shimba Hills National Reserve', 'h3'),
  textBlock('Just 30 minutes inland from Diani, Shimba Hills is a beautiful patch of coastal rainforest with elephants, Sable antelope (rare and hard to find elsewhere in Kenya), buffalo, and over 200 bird species. The Sheldrick Falls hike is excellent — a 45-minute walk through the forest ending at a waterfall where you can swim. Park entry is $25 for non-residents. The whole trip can be done in half a day.'),

  textBlock('Funzi Island', 'h3'),
  textBlock('A quieter, more authentic alternative to Wasini. You navigate through mangrove channels by dhow, visit a traditional Swahili fishing village, and might spot dolphins in the Funzi Channel. Fewer tourists, more genuine. Full-day trips cost KSh 4,000–7,000.'),

  textBlock('Tsavo East National Park', 'h3'),
  textBlock('A 3-hour drive from Diani gets you to Tsavo East — Kenya\'s largest national park. Famous for its red elephants (they dust themselves in the red laterite soil), vast open plains, and Lugard Falls. You can do it as a long day trip or an overnight. Day trips start at KSh 15,000–25,000 per person through Diani tour operators.'),

  // ── Day Trip Tip ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💡',
    label: 'Best day trip combo',
    text: 'If you only have time for one day trip, Wasini Island is the answer. The dolphin-snorkelling-seafood combination is hard to beat. If you have two days, add Shimba Hills — the contrast between the coastal forest and the beach is striking, and it\'s close enough to be back for a late lunch.',
  },

  // ── Safety Warning ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'Beach safety in Diani',
    text: 'Beach boys can be persistent, especially in the main tourist areas of north Diani. A firm "no thank you" works — don\'t engage or negotiate. Swim in the designated areas near the main hotels where lifeguards are present. Rip currents can form at certain tide states, particularly near the gaps in the reef. Ask your hotel staff about current conditions before swimming. Don\'t walk on the beach alone at night.',
  },

  // ── Section 11: Budget ──
  textBlock('How Much Does Diani Cost?', 'h2'),

  textBlock('Diani is more expensive than Kilifi and comparable to Watamu at the mid-range level. At the luxury end, it\'s the most expensive beach destination in Kenya. Here\'s what to budget per person per day in KES:'),

  {
    _type: 'budgetTableBlock',
    _key: key(),
    columns: ['Category', 'Budget', 'Mid-range', 'Luxury'],
    rows: [
      { label: 'Accommodation', values: ['KSh 3,000–5,000', 'KSh 12,000–25,000', 'KSh 40,000–80,000+'] },
      { label: 'Meals (3/day)', values: ['KSh 1,000–2,000', 'KSh 3,000–6,000', 'KSh 8,000–15,000'] },
      { label: 'Transport (local)', values: ['KSh 300–500', 'KSh 500–1,500', 'KSh 2,000–5,000'] },
      { label: 'Activities', values: ['KSh 1,500–3,000', 'KSh 5,000–10,000', 'KSh 15,000–30,000'] },
      { label: 'Drinks & extras', values: ['KSh 500–1,000', 'KSh 1,500–3,000', 'KSh 3,000–8,000'] },
    ],
    totalRow: ['Daily total (per person)', 'KSh 6,300–11,500', 'KSh 22,000–45,500', 'KSh 68,000–138,000'],
  },

  // ── Section 12: Honest Assessment ──
  textBlock('The Honest Assessment', 'h2'),

  textBlock('Diani\'s beach is — genuinely, no exaggeration — one of the most beautiful beaches in Africa. The sand is white, fine, and soft. The water is warm and clear. The reef creates a protected lagoon that\'s safe and calm for most of the year. On a sunny morning at low tide, it is postcard-perfect. That part of the reputation is entirely earned.'),

  textBlock('What\'s changed is the energy around the beach. Diani has gotten quieter over the past five or six years. Several restaurants and bars that were institutions have closed. The nightlife is a shadow of what it was a decade ago. Some of the international tourist crowd hasn\'t returned since the pandemic. The community feel — the sense of a buzzing little beach town — has faded somewhat.'),

  textBlock('That said, the infrastructure is still excellent. The hotels are well-maintained. The diving and water sports are genuinely world-class. It\'s popular with domestic tourists, especially Nairobi and Mombasa weekenders, which keeps the economy ticking. And the quieter vibe might actually suit you better if you want relaxation over social scene.'),

  textBlock('The honest comparison: if you want community and nightlife, Kilifi is a better bet. If you want marine life and eco-tourism, Watamu edges it. But if you want the best beach, the widest range of hotels, and the most reliable tourist infrastructure on the Kenya coast — Diani is still the answer.'),

  // ── Verdict Card ──
  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'purple',
    label: 'Diani verdict',
    title: 'Africa\'s best beach with world-class diving — but quieter than it used to be.',
    pros: [
      'Genuinely stunning 17 km white-sand beach',
      'World-class diving and kitesurfing',
      'Widest range of accommodation on the Kenya coast',
      'Excellent tourist infrastructure — ATMs, shops, hospitals',
      'Easy domestic flights from Nairobi via Ukunda',
      'Great day trips to Wasini Island and Shimba Hills',
    ],
    cons: [
      'Nightlife has declined significantly',
      'Beach boys can be persistent in tourist areas',
      'Likoni Ferry crossing can add hours to journey from Mombasa',
      'More expensive than Kilifi and north coast alternatives',
      'Less community feel than it had 5–10 years ago',
    ],
  },

  // ── Who Is It For ──
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Diani is perfect for...',
    items: [
      { icon: '🏖', text: 'Beach lovers who want Africa\'s best white sand' },
      { icon: '🤿', text: 'Divers and snorkellers — 30+ reef sites' },
      { icon: '💎', text: 'Luxury seekers wanting world-class resorts' },
      { icon: '🪁', text: 'Kitesurfers — consistent trade winds, wide lagoon' },
      { icon: '🏙', text: 'Nairobi weekenders — quick flights to Ukunda' },
      { icon: '👨‍👩‍👧', text: 'Families wanting reliable infrastructure and calm water' },
    ],
  },

  // ── Decider Grid ──
  {
    _type: 'deciderGridBlock',
    _key: key(),
    cards: [
      {
        _key: key(),
        label: 'Beach & Relax',
        color: 'teal',
        title: 'Pure beach holiday',
        items: [
          'Book a beachfront resort in south Diani or Galu',
          'Morning swims, afternoon naps, sunset cocktails',
          'Ali Barbour\'s Cave for one special dinner',
          'Spa day at Almanara or Swahili Beach',
          'Snorkelling trip to the reef',
        ],
      },
      {
        _key: key(),
        label: 'Adventure Seeker',
        color: 'blue',
        title: 'Dive, kite, explore',
        items: [
          'PADI course or advanced dives on the reef',
          'Kitesurfing lessons at Galu Beach',
          'Wasini Island dhow trip with dolphins',
          'Shimba Hills hike to Sheldrick Falls',
          'Deep-sea fishing charter',
        ],
      },
      {
        _key: key(),
        label: 'Family Holiday',
        color: 'purple',
        title: 'Kids, comfort, activities',
        items: [
          'Leopard Beach or Baobab — pools, kids clubs',
          'Glass-bottom boat ride on the reef',
          'Colobus Conservation Centre visit',
          'Shimba Hills morning safari',
          'Snorkelling in the calm lagoon at low tide',
        ],
      },
    ],
  },

  // ── Distance Chips ──
  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: '30 km south of Mombasa (via Likoni Ferry)' },
      { icon: 'pin', text: '~480 km from Nairobi' },
      { icon: 'clock', text: '1 hr flight from Nairobi (Wilson → Ukunda)' },
      { icon: 'clock', text: '45 min–3 hrs from Mombasa (ferry dependent)' },
      { icon: 'clock', text: '7–8 hrs drive from Nairobi' },
    ],
  },
]

// ══════════════════════════════════════════════════════
// Seed
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('Seeding Diani Beach guide...\n')

  await client.createOrReplace({
    _id: 'blog-complete-guide-diani-2026',
    _type: 'blogPost',
    title: 'The Complete Guide to Diani Beach, Kenya 2026',
    slug: { _type: 'slug', current: 'complete-guide-diani-beach-kenya-2026' },
    status: 'published',
    primaryCategory: 'destination_guide',
    subcategory: 'city_guide',
    location: 'diani',
    series: 'Kenya Destination Guides',
    postType: 'guide',
    focusKeyword: 'diani beach kenya travel guide 2026',
    seoTitle: "Diani Beach Guide 2026 — Kenya's Best Beach",
    seoDescription:
      "Diani Beach has been voted Africa's best beach. White sand, turquoise water, world-class diving. Your complete 2026 guide.",
    excerpt:
      "Diani Beach has been voted Africa's leading beach destination multiple times — and the white sand really is that white. Here's everything you need to know for 2026.",
    readingTime: 13,
    publishedAt: '2026-03-20T08:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Beach', 'Coast', 'Diani'],
    keywords: ['diani', 'beach', 'coast', 'kenya', 'diving', 'kitesurfing', 'white sand'],
    body: dianiBody,
  })

  console.log('✅ Diani guide seeded')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
