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
// The Complete Guide to Kilifi, Kenya 2026
// ══════════════════════════════════════════════════════

const kilifiGuideBody = [
  // ── Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Kilifi at a glance',
    accentColor: 'teal',
    items: [
      { icon: '📍', label: 'Location', value: '55 km north of Mombasa, Kenya Coast' },
      { icon: '🌡️', label: 'Climate', value: '26–32°C year-round, humid tropical' },
      { icon: '💰', label: 'Budget range', value: 'KSh 2,000–25,000 per night' },
      { icon: '🕐', label: 'From Mombasa', value: '1.5 hrs north via Kilifi Bridge' },
      { icon: '🌊', label: 'Star feature', value: 'Kilifi Creek — vast tidal inlet' },
      { icon: '👥', label: 'Known for', value: 'Creative expats, wellness, kitesurfing' },
    ],
  },

  // ── Stat Row ──
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { _key: key(), number: '55 km', label: 'north of Mombasa' },
      { _key: key(), number: '30 min', label: 'south of Watamu' },
      { _key: key(), number: '1,200+', label: 'expats in the Kilifi community' },
    ],
  },

  // ── Why Kilifi ──
  textBlock('Why Kilifi — Kenya\'s Best-Kept Secret', 'h2'),

  textBlock('If you are looking for a Kilifi Kenya travel guide for 2026, you have probably already heard the whispers. Kilifi is what happens when you take the natural beauty of the Kenyan coast — white sand, turquoise water, coconut palms — and add a community of artists, wellness practitioners, musicians, and people who came for a week and simply never left. Unlike Watamu to the north or Diani to the south, Kilifi has not been shaped by mass tourism. It has been shaped by the people who chose to live here.'),

  textBlock('The town sits on the banks of Kilifi Creek, a vast tidal inlet that stretches inland like a lake. The creek is the soul of the place — calm, sheltered, impossibly beautiful. Around it, a loose community of Kenyan families, creative expats, yoga teachers, and small-business owners have built something genuinely special. There is a recording studio in the baobab trees (Baobab Studio, where international artists come to lay down tracks). There are weekly community yoga sessions, full moon parties, and farmers markets where you buy fresh passion fruit from the woman who grew it.'),

  textBlock('Kilifi is not trying to be Tulum. It is not trying to be Bali. It is not trying to be anything other than what it is — a functioning Kenyan town with an extraordinary creek, a warm creative community, and the kind of quiet that ambitious people move to when they are done performing busyness. If Watamu is the beach holiday, Kilifi is the life decision.'),

  // ── Getting to Kilifi ──
  textBlock('Getting to Kilifi', 'h2'),

  textBlock('From Nairobi', 'h3'),
  textBlock('The most comfortable route is to take the SGR train from Nairobi Terminus to Mombasa (KSh 1,000–3,000 depending on class, roughly 5 hours). From Mombasa, hire a taxi or take a matatu north on the Mombasa–Malindi highway. The drive takes around 1.5 hours and crosses the dramatic Kilifi Bridge, which spans the mouth of the creek. By road from Nairobi the entire way is roughly 7 hours via the Nairobi–Mombasa highway, though most people prefer the SGR for the Nairobi–Mombasa leg.'),

  textBlock('From Mombasa', 'h3'),
  textBlock('Head north on the A7 highway towards Malindi. Kilifi is 55 kilometres from Mombasa city centre, about 1–1.5 hours depending on traffic through Mtwapa and Kikambala. A taxi from Mombasa will cost KSh 4,000–6,000 one way. Matatus run frequently from Mombasa\'s Buxton terminus to Kilifi town for around KSh 300–500. You can also fly into Mombasa\'s Moi International Airport and arrange a transfer.'),

  textBlock('From Watamu or Malindi', 'h3'),
  textBlock('Kilifi is just 30 minutes south of Watamu and 45 minutes south of Malindi by road. A boda boda (motorbike taxi) from Watamu costs around KSh 500–800, while a tuk-tuk will be KSh 1,000–1,500. Many people staying in Watamu do day trips to Kilifi for the nightlife and creek activities.'),

  // ── Transport tip ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💡',
    label: 'Getting around Kilifi',
    text: 'Once in Kilifi, a bicycle or boda boda is the easiest way to get around. The town is compact, but Bofa Beach and the creek are a few kilometres apart. Renting a motorbike costs around KSh 1,500 per day. For the creek and 3 Degrees South, you will need a short boda ride from town — about KSh 100–200.',
  },

  // ── Best Time to Visit ──
  textBlock('Best Time to Visit Kilifi', 'h2'),

  textBlock('Kilifi enjoys warm tropical weather year-round, but the seasons make a real difference to your experience.'),

  textBlock('January to March (high season)', 'h3'),
  textBlock('Hot, dry, and perfect. Daytime temperatures sit around 30–33°C with minimal rain. The creek is calm, the kitesurfing wind is consistent (the Kaskazi wind blows from the northeast), and the social calendar is at its peak. This is when the expat community is at full strength and events happen almost nightly. Book accommodation early — the limited supply fills up fast.'),

  textBlock('April to June (long rains)', 'h3'),
  textBlock('The long rains hit the coast from April through June. Kilifi gets significantly quieter — many expats head to Europe, some restaurants close temporarily, and the humidity can be intense. However, prices drop by 30–50 percent and the landscape turns a vivid green. If you do not mind afternoon downpours and want the coast almost to yourself, this is the time.'),

  textBlock('July to October (cool season)', 'h3'),
  textBlock('The Kuzi monsoon wind blows from the south, bringing cooler temperatures (24–28°C) and dry conditions. This is excellent for sailing and water sports on the creek. The town wakes back up after the rains, community events resume, and the weather is comfortable without the peak-season heat. A sweet spot for visiting.'),

  textBlock('November to December (short rains)', 'h3'),
  textBlock('Brief afternoon showers that rarely ruin a day. The coast is lush, tourist numbers are moderate, and the festive season brings a lively atmosphere. December in Kilifi is magical — the community comes together for end-of-year gatherings and the creek glows under clear skies between the showers.'),

  textBlock('Despite having a better nightlife and social scene than Watamu, Kilifi is also paradoxically more peaceful and quiet on a day-to-day basis. The town itself is calmer, the beaches are emptier, and the pace is genuinely slow. The energy picks up for events and weekends, then settles back into a gentle rhythm.'),

  // ── Neighbourhoods ──
  textBlock('Kilifi Neighbourhoods', 'h2'),

  textBlock('Kilifi is not a big place, but the different areas have distinct personalities. Where you stay shapes your experience.'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: 'Kilifi Town', color: 'teal' },
      { _key: key(), label: 'Bofa Beach', color: 'blue' },
      { _key: key(), label: 'Mnarani', color: 'teal' },
      { _key: key(), label: 'Takaungu', color: 'purple' },
    ],
    rows: [
      { _key: key(), criterion: 'Vibe', values: ['Busy market town, authentic Kenyan life', 'Quiet, coconut palms, empty white sand', 'Creek-side, historic ruins, laid-back', 'Tiny fishing village, off the beaten path'], winners: [] },
      { _key: key(), criterion: 'Beach', values: ['No beach — town is inland from creek', 'Best beach in Kilifi — long and uncrowded', 'No beach but stunning creek access', 'Small beautiful cove, very quiet'], winners: [1] },
      { _key: key(), criterion: 'Community', values: ['Local Kenyan — markets, mosques, matatus', 'Mixed — expats and Kenyan families', 'Expat-heavy — yoga, wellness, studios', 'Barely any tourists — genuine village life'], winners: [] },
      { _key: key(), criterion: 'Best for', values: ['Budget stays, local food, transport hub', 'Beach lovers, families, peaceful stays', 'Creek activities, long-stayers, creatives', 'Adventure seekers, photographers, solitude'], winners: [] },
    ],
  },

  textBlock('Mnarani is where much of the expat community has settled — it sits on the south bank of the creek with views across the water. Bofa Beach is the go-to for a classic beach day, roughly 3 kilometres south of town. Kilifi Town itself is the commercial centre — banks, supermarkets, matatu stand, and the loud, colourful energy of everyday Kenyan coast life. Takaungu, about 15 kilometres south, is a tiny Swahili fishing village that feels like stepping back in time.'),

  // ── The Creek ──
  textBlock('The Kilifi Creek', 'h2'),

  textBlock('The creek is the reason Kilifi exists — and the reason people fall in love with the place. Kilifi Creek is a vast tidal inlet, roughly 3 kilometres wide at its mouth and stretching several kilometres inland. At high tide it looks like a turquoise lake bordered by mangroves and baobabs. At low tide, sandbanks emerge where you can walk out into the middle of what was, an hour earlier, deep water.'),

  textBlock('The creek is calm, sheltered from the open ocean by a sandbar at the entrance. This makes it perfect for water sports that would be impossible on the exposed coast. 3 Degrees South is the hub — a water sports centre on the creek that offers sailing, waterskiing, wakeboarding, kayaking, stand-up paddleboarding, and diving excursions to the reef outside. For families, the creek is a safe swimming spot without the undertow of the open ocean.'),

  textBlock('Kitesurfing has become a major draw. The consistent monsoon winds and flat creek water make Kilifi one of the best kitesurfing spots on the East African coast. Several instructors operate from the creek banks, and the community of kiters is tight-knit and welcoming. Beginners can learn in waist-deep water with no waves — ideal conditions.'),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'The first time you see the creek at sunset — the water turning gold, dhows drifting past, the sound of nothing but birds — you understand why people never leave Kilifi.',
    attribution: '— Long-term Kilifi resident',
    accentColor: 'amber',
  },

  // ── What to Do ──
  textBlock('What to Do in Kilifi', 'h2'),

  textBlock('Kilifi is not a place where you tick off sightseeing boxes. It is a place where you settle into a rhythm — mornings on the creek, afternoons in the shade, evenings around a communal table. But if you want structure, there is plenty.'),

  textBlock('Water sports', 'h3'),
  textBlock('The creek is your playground. 3 Degrees South offers half-day and full-day sailing trips (from KSh 3,500), waterskiing sessions (KSh 2,500 per set), kayak hire (KSh 1,000 per hour), and snorkelling excursions to the reef outside the creek mouth. Kitesurfing lessons run around KSh 5,000–8,000 per session with local instructors. Stand-up paddleboarding on the flat creek water at sunrise is one of the best experiences on the Kenyan coast.'),

  textBlock('Wellness and movement', 'h3'),
  textBlock('Kilifi has become a genuine wellness hub. Weekly community yoga sessions happen at various locations around the creek — often donation-based or free. There are dedicated yoga studios, outdoor workout groups, breathwork circles, and movement classes run by practitioners who have settled here from around the world. The wellness scene is not performative or expensive — it is woven into the daily life of the community.'),

  textBlock('Community events', 'h3'),
  textBlock('Kilifi thrives on community gatherings. Full moon parties, live music nights, art exhibitions, film screenings, farmers markets, and food pop-ups happen regularly. The Kilifi New Year festival (held annually between Christmas and New Year) is one of the most celebrated music and arts festivals in East Africa, drawing international DJs and artists to the creek. Throughout the year, venues like Distant Relatives Ecolodge host events that bring the community together.'),

  textBlock('Check out the full list of things to do on our Kilifi experiences page at /experiences/kilifi.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💡',
    label: 'Find the community',
    text: 'Ask any local expat about the WhatsApp groups. There are community groups for events, buy-and-sell, wellness classes, and water sports. Getting added to the Kilifi Community WhatsApp group within your first day will transform your trip — you will hear about pop-up dinners, sunset sessions, and impromptu creek trips that never make it to Instagram.',
  },

  // ── Where to Stay ──
  textBlock('Where to Stay in Kilifi', 'h2'),

  textBlock('This is where Kilifi shows its one genuine weakness compared to Watamu: there is significantly less accommodation. Watamu has dozens of hotels, guesthouses, and Airbnbs at every price point. Kilifi has fewer options, but the ones that exist have real character.'),

  textBlock('For groups and families, Kilifi excels. There are beautiful private villas along the creek and near Bofa Beach that sleep 10–12 people comfortably, often with private pools, staff, and direct creek or beach access. These represent outstanding value when split between a large group — KSh 40,000–80,000 per night for a villa works out to KSh 4,000–8,000 per person in a group of ten.'),

  textBlock('For backpackers and solo travellers, Distant Relatives Ecolodge is the spot — a lively, well-run hostel on the creek with dorm beds from KSh 2,000 and private rooms from KSh 5,000. It is also the social hub of the backpacker community, hosting regular events, live music, and communal dinners.'),

  textBlock('For couples and solo travellers wanting something quieter, the options are more limited. There are a handful of mid-range guesthouses and boutique stays, but nothing like the range you find in Watamu. This is changing — more accommodation is being built and new properties are opening in 2026 — but for now, book early, especially in high season.'),

  textBlock('Browse available stays on our Kilifi accommodation page at /stays/kilifi.'),

  // ── Where to Eat ──
  textBlock('Where to Eat in Kilifi', 'h2'),

  textBlock('Kilifi\'s food scene is smaller than Watamu\'s but punches above its weight. The restaurants here tend to be creative, community-driven, and genuinely good. You will find fresh seafood, Swahili coast cuisine, wood-fired pizza, healthy bowls, and the kind of home-cooked food that comes from chefs who moved here to live well rather than to run a restaurant empire.'),

  textBlock('Kilifi town itself has excellent local food — nyama choma (grilled meat), fresh fish, chapati, and biryani from small restaurants and street stalls at prices that remind you this is a real Kenyan town, not a tourist enclave. A full local meal costs KSh 200–500.'),

  textBlock('For the full restaurant guide, visit /experiences/kilifi?sub=restaurants.'),

  // ── Nightlife ──
  textBlock('Kilifi Nightlife & Social Scene', 'h2'),

  textBlock('Here is the thing about Kilifi that surprises most visitors: the nightlife is better than Watamu\'s, but the daytime is quieter. Kilifi\'s social scene operates in bursts. On event nights — full moon parties, DJ sets at Distant Relatives, live music at local venues — the energy is electric and the crowd is a genuine mix of Kenyans, long-term expats, and passing travellers. These nights feel special because they emerge from a real community rather than a tourism machine.'),

  textBlock('But between events, Kilifi is peaceful. There is no strip of tourist bars. There is no nightly entertainment schedule. If you want something to do on a random Tuesday, you will probably end up at a local bar watching football, joining a sunset session at the creek, or cooking dinner with people you met that morning. This is the rhythm, and most people who love Kilifi love it precisely for this balance.'),

  textBlock('One of the best things about the social scene here is that you meet more Kenyans. Watamu can sometimes feel like an Italian colony with a Kenyan backdrop. Kilifi\'s community is more integrated — expats and locals genuinely socialise together, and you are far less likely to find yourself trapped in a tourist bubble.'),

  // ── Living in Kilifi ──
  textBlock('Living in Kilifi', 'h2'),

  textBlock('An increasing number of people are not just visiting Kilifi — they are moving here. The town has become a genuine community hub, often called the green heart of the Kenyan coast. Remote workers, creative professionals, wellness practitioners, and families with young children are choosing Kilifi over louder, more established coastal towns.'),

  textBlock('For families, the infrastructure is better than you might expect. Kivukoni School, a well-regarded British international school, offers education from early years through secondary level. The 3 Degrees South water sports centre runs children\'s sailing and water sports programmes. The creek provides a safe, natural playground that most children in the world can only dream of. The community is tight-knit and family-friendly — children grow up knowing their neighbours, playing on the beach, and learning to sail before they can ride a bicycle.'),

  textBlock('The cost of living is significantly lower than Nairobi or Mombasa. Rent for a two-bedroom house near the creek runs KSh 25,000–60,000 per month. A three-bedroom villa with a garden is KSh 50,000–100,000. Fresh produce is abundant and cheap at the local markets. The main trade-off is convenience — Kilifi does not have large shopping centres, international hospitals, or the infrastructure of a major city. Mombasa is 1.5 hours away for anything you cannot find locally.'),

  // ── Safety warning ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'Practical safety notes',
    text: 'Kilifi is generally safe, but use common sense. Do not walk alone on the beach after dark. Keep valuables out of sight. The road between Mombasa and Kilifi has a reputation for speeding matatus — if you are driving, stay alert. Malaria is present on the coast; take prophylactics and use mosquito repellent, especially around the creek at dusk. Tap water is not safe to drink — stick to bottled or filtered water.',
  },

  // ── Budget ──
  textBlock('How Much Does Kilifi Cost?', 'h2'),

  textBlock('Kilifi is more affordable than Watamu across almost every category. Here is a realistic breakdown for 2026.'),

  {
    _type: 'budgetTableBlock',
    _key: key(),
    columns: ['Category', 'Budget', 'Mid-range', 'Luxury'],
    rows: [
      { _key: key(), label: 'Accommodation (per night)', values: ['KSh 2,000–4,000', 'KSh 5,000–12,000', 'KSh 15,000–25,000'] },
      { _key: key(), label: 'Meals (per day)', values: ['KSh 500–1,000', 'KSh 1,500–3,000', 'KSh 4,000–8,000'] },
      { _key: key(), label: 'Transport (per day)', values: ['KSh 200–500', 'KSh 500–1,500', 'KSh 2,000–5,000'] },
      { _key: key(), label: 'Activities (per day)', values: ['KSh 500–1,500', 'KSh 2,000–5,000', 'KSh 5,000–15,000'] },
      { _key: key(), label: 'Drinks & nightlife', values: ['KSh 300–800', 'KSh 1,000–2,500', 'KSh 3,000–6,000'] },
    ],
  },

  textBlock('A backpacker staying at Distant Relatives, eating local food, and doing free community activities can spend as little as KSh 3,000–5,000 per day (roughly $25–40). A mid-range traveller in a guesthouse with restaurant meals and creek activities will spend KSh 8,000–18,000 per day ($65–145). Luxury villa guests splitting costs in a group can paradoxically spend less per person than mid-range travellers, while enjoying private pools and personal chefs.'),

  // ── The Honest Assessment ──
  textBlock('The Honest Assessment', 'h2'),

  textBlock('Kilifi is not for everyone, and that is exactly what makes it special. If you want a beach holiday with a menu of organised excursions, a strip of restaurants to choose from, and the safety net of tourist infrastructure, Watamu is a better choice. If you want a place that feels real — where you will meet the people who live there, where the creek replaces the pool, and where the best experiences come from saying yes to whatever is happening that evening — Kilifi will get under your skin.'),

  textBlock('The beaches are quieter than anywhere else on the north coast. There are no hawkers. Bofa Beach on a weekday morning can be completely empty — just you, the sand, and the Indian Ocean. The creek is genuinely one of the most beautiful natural features on the Kenyan coast, and the water sports available through 3 Degrees South would cost three times as much in a resort town.'),

  textBlock('You will meet more Kenyans here than in Watamu or Diani. The community is less of a tourist bubble and more of a real, functioning multicultural town. The expat community is creative and interesting — musicians, artists, photographers, yoga teachers, entrepreneurs — rather than the retiree-and-holiday crowd you find elsewhere on the coast.'),

  textBlock('The honest downsides: accommodation options are limited and book out fast in high season. There are fewer restaurants than Watamu. If you are a solo traveller or couple wanting a convenient, hassle-free beach break, the lack of mid-range hotels can be frustrating. The town infrastructure is basic — do not expect fancy supermarkets or reliable Wi-Fi everywhere. And getting to Kilifi from Nairobi is a full travel day.'),

  // ── Verdict Card ──
  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Kilifi verdict',
    title: 'Choose Kilifi if you want to experience the Kenyan coast as a local, not as a tourist.',
    pros: [
      'Kilifi Creek — one of the most beautiful spots on the Kenyan coast',
      'Genuine creative community of artists, musicians, and entrepreneurs',
      'Best nightlife and social events on the north coast',
      'More affordable than Watamu across every category',
      'Quiet, empty beaches with zero hawkers',
      'Excellent water sports at 3 Degrees South',
      'Meet more Kenyans — far less of a tourist bubble',
      'Kivukoni international school makes it viable for families',
    ],
    cons: [
      'Limited accommodation — few mid-range hotels',
      'Fewer restaurants than Watamu',
      'Basic town infrastructure — no big supermarkets',
      'Full travel day from Nairobi',
      'Can feel too quiet between events if you want constant stimulation',
    ],
  },

  // ── Who Is It For ──
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Perfect for...',
    items: [
      { _key: key(), icon: '💻', text: 'Digital nomads looking for a creative, affordable coastal base' },
      { _key: key(), icon: '🧘', text: 'Wellness seekers — yoga, breathwork, and movement by the creek' },
      { _key: key(), icon: '👨‍👩‍👧‍👦', text: 'Families with kids — safe creek, international school, community' },
      { _key: key(), icon: '🎨', text: 'Creative types — musicians, artists, writers seeking inspiration' },
      { _key: key(), icon: '🏄', text: 'Kitesurfers and water sports enthusiasts' },
      { _key: key(), icon: '🏡', text: 'Long-stayers who want to live on the coast, not just visit it' },
    ],
  },

  // ── Distance Chips ──
  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { icon: 'pin', text: '55 km north of Mombasa' },
      { icon: 'pin', text: '30 km south of Watamu' },
      { icon: 'clock', text: '1–1.5 hrs from Mombasa' },
      { icon: 'clock', text: '~7 hrs from Nairobi by road' },
    ],
  },
]

// ── Seed the post ──────────────────────────────────

async function seed() {
  console.log('Seeding Kilifi guide blog post...')

  await client.createOrReplace({
    _id: 'blog-complete-guide-kilifi-2026',
    _type: 'blogPost',
    title: 'The Complete Guide to Kilifi, Kenya 2026',
    slug: { _type: 'slug', current: 'complete-guide-kilifi-kenya-2026' },
    status: 'published',
    primaryCategory: 'destination_guide',
    subcategory: 'city_guide',
    location: 'kilifi',
    series: 'Kenya Destination Guides',
    postType: 'guide',
    focusKeyword: 'kilifi kenya travel guide 2026',
    seoTitle: 'Kilifi Kenya Guide 2026 — The Hidden Gem',
    seoDescription:
      'Kilifi is Kenya\'s best-kept secret. Creative expats, stunning creek, quieter beaches and real community. Your honest 2026 guide.',
    excerpt:
      'Kilifi is what happens when you take the beauty of the Kenyan coast and add a community of artists, wellness practitioners, and people who came for a week and never left.',
    readingTime: 13,
    publishedAt: '2026-03-20T08:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Beach', 'Coast', 'Kilifi'],
    keywords: ['kilifi', 'creek', 'expat', 'wellness', 'kenya', 'hidden gem'],
    body: kilifiGuideBody,
  })

  console.log('✅ Kilifi guide seeded')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
