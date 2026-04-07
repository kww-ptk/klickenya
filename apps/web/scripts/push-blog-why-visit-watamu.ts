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

function richText(children: Array<{ text: string; bold?: boolean; link?: string }>): any {
  const markDefs: any[] = []
  const spans = children.map((c) => {
    const marks: string[] = []
    if (c.bold) marks.push('strong')
    if (c.link) {
      const linkKey = key()
      markDefs.push({ _type: 'link', _key: linkKey, href: c.link, blank: false })
      marks.push(linkKey)
    }
    return { _type: 'span', _key: key(), text: c.text, marks }
  })
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs,
    children: spans,
  }
}

function placeholder(caption?: string): any {
  return {
    _type: 'photoRowBlock',
    _key: key(),
    layout: 'hero-full',
    photos: [{ alt: caption ?? 'Watamu Kenya', aspectRatio: 'wide' }],
    caption: caption ?? '',
  }
}

// ══════════════════════════════════════════════════════
// WHY YOU SHOULD VISIT WATAMU, KENYA
// ══════════════════════════════════════════════════════

const body = [

  // ── Intro ──
  textBlock('We have lived in Watamu. We have roots there. And every single time we bring someone to Watamu for the first time, we get the same reaction. They arrive, they look at the beach, they look at the water, and after about two days they stop asking what the plan is. They just settle in. That is what Watamu does to people, and it is very hard to explain in words. But we are going to try.'),

  richText([
    { text: 'This is not a list of tourist attractions. This is a genuine, honest, up-to-date account of ' },
    { text: 'why Watamu is one of the most special places in Africa', bold: true },
    { text: ', written by people who know it well. If you are wondering whether to visit Watamu on your Kenya trip, consider this your answer.' },
  ]),

  // ── Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Watamu at a glance',
    accentColor: 'teal',
    items: [
      { icon: '📍', label: 'Location', value: '120 km north of Mombasa, 25 km south of Malindi' },
      { icon: '✈️', label: 'Getting there', value: 'Fly to Malindi (45 min from Nairobi), 30 min taxi to Watamu' },
      { icon: '📅', label: 'Best time to visit', value: 'December to March and June to October' },
      { icon: '🌊', label: 'Known for', value: 'Marine park, sandbanks, Italian food, kitesurfing, turtles' },
      { icon: '🌴', label: 'Vibe', value: 'Easygoing, peaceful, genuinely beautiful' },
      { icon: '💰', label: 'Budget range', value: 'KSh 5,000 to 60,000 per day depending on how you travel' },
    ],
  },

  // ── The Beaches ──
  textBlock('The Beaches, Sandbanks and Lagoons', 'h2'),

  richText([
    { text: 'Let us start with the obvious. ' },
    { text: 'Watamu has some of the most beautiful beaches in the world.', bold: true },
    { text: ' That is not marketing language. The white sand is fine and soft, the water is a shade of turquoise that you will spend the entire trip trying to photograph correctly, and the coastline is shaped by small island formations and exposed sandbanks that appear and disappear with the tide.' },
  ]),

  textBlock('What makes Watamu beaches different from other beautiful beaches is the combination of features. You have the open beach with the big sky and the ocean. Then you have shallow crystal clear lagoons protected by the reef, where the water is so calm and warm that you could float for hours. Then you have the sandbanks that rise from the sea at low tide, completely untouched, surrounded by nothing but turquoise water in every direction.'),

  richText([
    { text: 'The sandbanks and lagoons are genuinely special. People who have been to the Maldives, to the Caribbean, to the Seychelles, they come to Watamu and say the same thing: ' },
    { text: 'this is as good as it gets.', bold: true },
    { text: ' And it is still relatively undiscovered by the global tourism market, which means you can have a sandbank entirely to yourself on a weekday morning.' },
  ]),

  placeholder('Watamu sandbanks at low tide'),

  // ── The Vibe ──
  textBlock('That Watamu Feeling', 'h2'),

  textBlock('There is a vibe in Watamu that is genuinely hard to put into words. It is easygoing and peaceful in a way that is not manufactured. Nobody is rushing. The tuk-tuks move at the pace of the town. The beach bars open when the owner feels like it. People smile and say hello.'),

  richText([
    { text: 'After a few days in Watamu, something shifts. The tension you brought with you from the city or from travel just dissolves. You stop looking at your phone. You start paying attention to where the tide is, whether the wind is picking up, what is on the menu. ' },
    { text: 'This is the real thing people come back for.', bold: true },
    { text: ' Not a specific restaurant or a specific beach, but a feeling that is almost impossible to find anywhere else.' },
  ]),

  textBlock('The local Kenyan community in Watamu are warm, friendly and welcoming. The Italian expat community has been there for decades. The mix of cultures, the history of the place, the pace of life, the weather, the water: it all combines into something that has to be experienced to be understood.'),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'You cannot visit Watamu and not pick up the vibe. It gets into you and stays there. People come for a week and start looking at villas to buy.',
    attribution: 'Written by the Klickenya team, locals and long-term residents of Watamu',
    accentColor: 'teal',
  },

  placeholder('Watamu beach, late afternoon light'),

  // ── Marine Park ──
  textBlock('Watamu Marine National Park', 'h2'),

  richText([
    { text: 'Established in 1968, ' },
    { text: 'Watamu Marine National Park is one of the oldest and most protected marine areas in Africa.', bold: true },
    { text: ' The reef system here is extraordinary. Hawksbill and green turtles nest on the beach every year. The coral gardens are home to hundreds of species of fish. Dolphins are spotted regularly, and during certain months whale sharks pass through the waters offshore.' },
  ]),

  textBlock('Snorkelling trips go out from the beach daily. You will see parrotfish, moray eels, lionfish, and sea turtles up close in water so clear it feels unreal. Glass bottom boats are available for anyone who does not want to get in the water. Diving is also well established here, with several reputable operators running PADI courses and guided dives.'),

  richText([
    { text: 'The marine park is not just a tourist attraction. It is a functioning conservation area and the local conservation work is some of the most active on the Kenya coast. ' },
    { text: 'Local Ocean Conservation', bold: true },
    { text: ' has been rescuing and rehabilitating sea turtles in Watamu for years and is one of the most respected marine conservation organisations in East Africa.' },
  ]),

  richText([
    { text: 'Read the full guide to ' },
    { text: 'Watamu Marine National Park', bold: true, link: 'https://www.klickenya.com/journal/watamu-marine-national-park' },
    { text: ' for everything you need to know before you go.' },
  ]),

  placeholder('Snorkelling in Watamu Marine National Park'),

  // ── Mida Creek ──
  textBlock('Mida Creek: One of the Most Peaceful Places on Earth', 'h2'),

  textBlock('Just south of Watamu town, Mida Creek is a vast tidal inlet surrounded by mangrove forest and open water. At high tide it fills and the whole area turns into a mirror reflecting the sky. At low tide the sandflats emerge and thousands of birds arrive to feed.'),

  richText([
    { text: 'Over 350 bird species have been recorded at Mida Creek. It is one of the most important bird sanctuaries on the East African coast. Even if you have never birdwatched in your life, sitting on the boardwalk at sunrise watching the flamingos and herons move through the still water is ' },
    { text: 'one of the most peaceful experiences you will ever have.', bold: true },
  ]),

  textBlock('Community canoe trips through the mangroves run from the beach. The money goes directly to local conservation and community projects. It is one of those experiences that feels genuinely meaningful, not just touristy. Go at high tide for the canoe trip, come back at low tide to walk the boardwalk. Both are extraordinary.'),

  placeholder('Mida Creek at sunrise, Watamu'),

  // ── Arabuko Sokoke + Tsavo ──
  textBlock('Elephants in the Forest and Safari Next Door', 'h2'),

  richText([
    { text: 'Ten minutes from Watamu town is the ' },
    { text: 'Arabuko Sokoke Forest', bold: true },
    { text: ', the largest remaining fragment of East African coastal forest. A small population of around 100 forest elephants lives here, and they come to the salt lick at the forest edge in the early evening. Watching elephants at sunset, 15 minutes from your beach villa, is the kind of thing that makes you realise how extraordinary the Kenya coast is.' },
  ]),

  textBlock('The forest is also exceptional for birdwatching. The Sokoke Scops Owl, the Amani Sunbird and the Clarke\'s Weaver are all globally threatened species found here and almost nowhere else on earth.'),

  richText([
    { text: 'Watamu\'s location also makes it the perfect base for combining coast with safari. ' },
    { text: 'Tsavo East National Park', bold: true },
    { text: ' is accessible from Watamu in around 3 to 4 hours by road. Tsavo East is one of the largest national parks in the world and home to massive elephant herds, lions, leopards, buffalo and cheetah. Many visitors spend 4 or 5 nights in Watamu and then head inland for 2 or 3 nights of safari before flying home from Mombasa. It is one of the best holiday combinations available anywhere on the continent.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🐘',
    label: 'The coast and safari combination',
    text: 'The most popular route is Nairobi, then Malindi or Watamu for 5 nights on the coast, then drive to Tsavo East for 2 nights on safari, then fly home from Mombasa. It works perfectly and gives you two completely different experiences in one trip. Very few beach destinations in the world put you this close to big five safari country.',
  },

  placeholder('Arabuko Sokoke forest elephants near Watamu'),

  // ── Food ──
  textBlock('The Best Food on the Kenya Coast', 'h2'),

  richText([
    { text: 'Watamu has, in our opinion, ' },
    { text: 'the best food of any coastal destination in Kenya.', bold: true },
    { text: ' That is a strong claim but it is based on years of eating up and down the coast. The Italian community that has called Watamu home for generations has elevated the food scene here to a level that genuinely surprises first-time visitors.' },
  ]),

  textBlock('You will find freshly made pasta, wood-fired pizza, handmade gelato, proper espresso and Aperol spritzes at sunset. You will also find exceptional Swahili seafood, fresh lobster and crab, Indian cuisine and fusion restaurants combining Kenyan ingredients with international techniques. The density of good restaurants for a town this size is remarkable.'),

  richText([
    { text: 'Cocktail bars have multiplied in recent years. ' },
    { text: 'Sunset drinks in Watamu', bold: true },
    { text: ' have become a ritual for visitors and residents alike. The cafes now serve proper filter coffee and flat whites, which sounds like a small thing but anyone who has spent time in coastal Kenya knows how rare that is.' },
  ]),

  textBlock('The local Kenyan restaurants in town serve some of the freshest fish you will ever eat at prices that will genuinely surprise you. A plate of grilled red snapper with rice and kachumbari at a local spot costs almost nothing. The range from KSh 400 local lunch to KSh 5,000 Italian dinner with wine is what makes Watamu work for every type of traveller.'),

  richText([
    { text: 'Browse all restaurants and experiences in Watamu at ' },
    { text: 'klickenya.com/experiences/watamu', bold: true, link: 'https://www.klickenya.com/experiences/watamu' },
    { text: '.' },
  ]),

  placeholder('Fresh seafood and sunset cocktails in Watamu'),

  // ── Villas ──
  textBlock('The Most Stunning Villas in Kenya', 'h2'),

  richText([
    { text: 'Watamu has the ' },
    { text: 'most beautiful villa rentals on the Kenya coast.', bold: true },
    { text: ' Full stop. Decades of Italian architectural influence, combined with a boom in boutique property development over the past 10 years, means the standard of private villas here is extraordinary.' },
  ]),

  textBlock('Groups of 4 to 10 people can rent a staffed villa with a private pool, chef, housekeeper and direct beach access for prices that work out cheaper per person than a decent hotel room. The villas are not generic beach houses. They are designed properties, often with serious gardens, outdoor dining areas, rooftop terraces and sunset views that will make your friends question every future holiday decision.'),

  richText([
    { text: 'This is how repeat visitors stay in Watamu. Almost everyone who comes back for a second or third trip rents a villa rather than going back to a hotel. ' },
    { text: 'Browse verified stays in Watamu', bold: true, link: 'https://www.klickenya.com/stays/watamu' },
    { text: ' and see for yourself.' },
  ]),

  placeholder('Private villa with pool in Watamu'),

  // ── Kitesurfing ──
  textBlock('Kenya\'s Kitesurfing Capital', 'h2'),

  richText([
    { text: 'Watamu is ' },
    { text: 'the best place to learn kitesurfing in Kenya', bold: true },
    { text: ' and one of the finest kite destinations in East Africa. The shallow protected lagoon at Garoda Beach is ideal for beginners: flat water, consistent wind, and a soft sand bottom that makes falling in relatively painless.' },
  ]),

  textBlock('The main kite season runs from June through October when the Kusi trade winds blow steadily at 15 to 25 knots almost every day. Several IKO-certified schools operate on the beach. Whether you are a complete beginner or an experienced rider looking for new conditions, Watamu delivers. The kite community here is welcoming, international and genuinely passionate about the sport.'),

  richText([
    { text: 'Read the full guide to ' },
    { text: 'kitesurfing in Watamu', bold: true, link: 'https://www.klickenya.com/journal/kitesurfing-watamu-guide' },
    { text: ' including the best schools, conditions and where to stay during kite season.' },
  ]),

  placeholder('Kitesurfing in the Watamu lagoon'),

  // ── Growing and Developing ──
  textBlock('A Place That Is Growing Fast', 'h2'),

  textBlock('Watamu is changing. New restaurants open every season. New boutique hotels and villas are being built. The road infrastructure has improved significantly. International investors are buying land and developing properties. The town is becoming more polished without losing its soul.'),

  richText([
    { text: 'For travellers, this means that each visit to Watamu brings something new. The core experience, the water, the marine park, the pace of life, ' },
    { text: 'stays consistent.', bold: true },
    { text: ' But the food scene, the nightlife, the accommodation options are all improving year on year. Getting here now, before it becomes fully discovered, is the smart move.' },
  ]),

  textBlock('Watamu already has more tourist infrastructure than any other coastal destination in Kenya. More accommodation options at more price points, more activities, more restaurant choices, better internet, better transport connections. It is the most practical place on the coast to holiday without having to think too hard about logistics.'),

  richText([
    { text: 'For a full breakdown of transport options and how to get around, see our ' },
    { text: 'Watamu transport guide', bold: true, link: 'https://www.klickenya.com/journal/watamu-transport-guide' },
    { text: '.' },
  ]),

  placeholder('Watamu coastline from above showing island formations'),

  // ── Who Is It For ──
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: 'Watamu is perfect for...',
    items: [
      { _key: key(), icon: '👨‍👩‍👧‍👦', text: 'Families: safe beaches, calm lagoons, turtle watching, marine park and kid-friendly restaurants everywhere' },
      { _key: key(), icon: '💑', text: 'Couples and honeymooners: romantic villas with pools, sunset dhow cruises and candlelit dinners by the ocean' },
      { _key: key(), icon: '🍝', text: 'Food lovers: the best restaurant density on the entire Kenya coast with real Italian, fresh seafood and great coffee' },
      { _key: key(), icon: '🪁', text: 'Kitesurfers: world-class lagoon conditions from June to October with proper schools and a great kite community' },
      { _key: key(), icon: '🐢', text: 'Nature lovers: turtles, dolphins, whale sharks, coral reef, coastal forest elephants and over 350 bird species at Mida Creek' },
      { _key: key(), icon: '🏡', text: 'Groups and friends: staffed private villas with pools at prices that beat hotels, perfect for 4 to 10 people' },
      { _key: key(), icon: '🌊', text: 'First-time Kenya visitors: the most complete, most visitor-friendly destination on the coast with everything in one place' },
    ],
  },

  // ── Stats ──
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '10 km²', label: 'of protected marine park, established 1968' },
      { number: '350+', label: 'bird species recorded at Mida Creek' },
      { number: '3 hrs', label: 'to Tsavo East National Park for a coast and safari combination' },
    ],
  },

  // ── Verdict ──
  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Our verdict',
    title: 'Watamu: Kenya\'s most special beach destination',
    pros: [
      'Some of the most beautiful beaches and sandbanks in the world',
      'World-class marine park with turtles, dolphins and coral reef',
      'Best food scene on the Kenya coast with genuine Italian influence',
      'The most beautiful villas in Kenya at exceptional value',
      'Kenya\'s best kitesurfing conditions June to October',
      'Elephants 10 minutes away in Arabuko Sokoke Forest',
      'Easy access to Tsavo East National Park for a coast and safari trip',
      'A unique, easygoing peaceful vibe that is genuinely hard to find anywhere else',
      'Warm, friendly local Kenyan community',
    ],
    cons: [
      'The most tourist-oriented town on the coast, which means more beach vendors',
      'Prices are slightly higher than Kilifi or Diani for comparable quality',
      'Gets very busy in December and January, book ahead',
    ],
  },

  // ── CTA ──
  textBlock('Ready to Plan Your Watamu Trip?', 'h2'),

  richText([
    { text: 'We have put together the most complete guide to Watamu available anywhere online. Beaches, accommodation, restaurants, activities, transport, costs, neighbourhoods and everything in between. All written by people who have lived there and know it well. ' },
    { text: 'Read the complete guide to Watamu, Kenya', bold: true, link: 'https://www.klickenya.com/journal/complete-guide-watamu-kenya-2026' },
    { text: '.' },
  ]),

  richText([
    { text: 'To browse and book verified accommodation in Watamu visit ' },
    { text: 'klickenya.com/stays/watamu', bold: true, link: 'https://www.klickenya.com/stays/watamu' },
    { text: '. To find the best restaurants, experiences and activities visit ' },
    { text: 'klickenya.com/experiences/watamu', bold: true, link: 'https://www.klickenya.com/experiences/watamu' },
    { text: '.' },
  ]),

]

// ══════════════════════════════════════════════════════
// Seed
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('Pushing why-visit-watamu blog post...')

  await client.createOrReplace({
    _id: 'blog-why-visit-watamu-kenya',
    _type: 'blogPost',
    title: 'Why You Should Visit Watamu: Kenya\'s Most Beautiful Beach Town',
    slug: { _type: 'slug', current: 'why-visit-watamu-kenya' },
    status: 'published',
    primaryCategory: 'destination_guide',
    subcategory: 'city_guide',
    location: 'watamu',
    series: 'Kenya Destination Guides',
    postType: 'guide',
    focusKeyword: 'why visit Watamu Kenya',
    seoTitle: 'Why You Should Visit Watamu Kenya: A Local\'s Honest Guide',
    seoDescription: 'Written by people who have lived in Watamu. The beaches, the vibe, the food, the marine park, the villas and everything else that makes Watamu one of the most special places in Africa.',
    excerpt: 'We have lived in Watamu and we have roots there. Here is our honest, personal, up-to-date account of why Watamu is one of the most special beach destinations in the world and why you should visit.',
    readingTime: 10,
    publishedAt: '2026-04-07T08:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Watamu', 'Beach', 'Coast', 'Kenya', 'Travel Guide'],
    body,
  })

  console.log('Done. Blog post pushed to Sanity.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
