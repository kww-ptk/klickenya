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

// ── POST: Kenya National Parks Guide ──────────────────

const postBody = [
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Kenya parks — at a glance',
    accentColor: 'teal',
    items: [
      { icon: '🦁', label: 'Total parks', value: '54 parks & reserves' },
      { icon: '📅', label: 'Migration window', value: 'July–October (Mara)' },
      { icon: '💰', label: 'Entry fees', value: '$26–$200 per day' },
      { icon: '✈️', label: 'Best base city', value: 'Nairobi for all parks' },
      { icon: '🌧️', label: 'Avoid', value: 'Apr–Jun (long rains)' },
      { icon: '🦏', label: 'Rhinos', value: 'Ol Pejeta — all 3 species' },
    ],
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '54+', label: 'parks, reserves & conservancies' },
      { number: '1.5M', label: 'wildebeest in the Great Migration' },
      { number: '600+', label: 'bird species in Amboseli alone' },
    ],
  },

  textBlock('The thing nobody tells you', 'h2'),

  richTextBlock([
    { text: 'The Maasai Mara is genuinely extraordinary. It is also, during peak season, home to more tourist vehicles per lion than anywhere on earth. We\'ve seen game drives where 40 Land Cruisers formed a ring around a single cheetah. That is not the Kenya you came for.' },
  ]),

  richTextBlock([
    { text: 'The good news: Kenya\'s other parks are ' },
    { text: 'spectacular, far less crowded, and in several cases better', bold: true },
    { text: ' for specific experiences. Amboseli has better elephant sightings than the Mara. Samburu has animals you literally cannot see anywhere else in Kenya. Ol Pejeta is the single best-managed reserve in East Africa. Hell\'s Gate has no vehicles at all — you walk or cycle.' },
  ]),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'The moment you see a lion pride in the golden grass — you understand, on a cellular level, why humans came from this place.',
    attribution: '— Common sentiment among first-time Mara visitors',
    accentColor: 'teal',
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🧠',
    label: 'The rule that changes everything',
    text: 'If you have 7+ days, combine two parks. The classic Mara + Amboseli circuit gives you the migration drama AND the Kilimanjaro elephant photographs. Samburu + Ol Pejeta is perfect for the true wildlife enthusiast who wants rare species and rhino conservation in the same trip.',
  },

  textBlock('The parks, honestly reviewed', 'h2'),

  // ── Maasai Mara ──
  textBlock('01 — Maasai Mara National Reserve', 'h3'),
  richTextBlock([
    { text: 'The Mara\'s reputation is earned. ' },
    { text: '1.5 million wildebeest', bold: true },
    { text: ' crossing the Mara River between July and October is one of the few things on earth that actually lives up to the hype. The Big Five are present year-round. Predator sightings — lions, leopards, cheetahs — are the best in Kenya.' },
  ]),
  richTextBlock([
    { text: 'The honest downside: ' },
    { text: 'peak season crowds are real', bold: true },
    { text: '. The park entrance fee of $200 per person per day is the highest in Kenya. Budget travellers can\'t access many camps. And if you visit outside July–October, the Mara is still good — but so are several cheaper alternatives.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '✓',
    label: 'Go here if',
    text: 'You have budget, visiting July–October, or it\'s your first Kenya safari and you want the guaranteed Big Five experience. Book a conservancy camp over the main reserve to avoid vehicle congestion.',
  },

  // ── Amboseli ──
  textBlock('02 — Amboseli National Park', 'h3'),
  richTextBlock([
    { text: 'Here is a surprising fact: ' },
    { text: 'Amboseli has better elephant sightings than the Maasai Mara', bold: true },
    { text: '. The park is home to one of Africa\'s best-studied elephant populations — large, relaxed herds that have been observed by researchers for 50 years and are entirely unbothered by vehicles. And behind them, on a clear morning, rises Mount Kilimanjaro.' },
  ]),
  richTextBlock([
    { text: 'The park is small and can be done in 2 days. It has ' },
    { text: 'over 600 bird species', bold: true },
    { text: '. Mornings are best — by 10am the dust and heat can obscure the mountain.' },
  ]),

  // ── Ol Pejeta ──
  textBlock('03 — Ol Pejeta Conservancy', 'h3'),
  richTextBlock([
    { text: 'This is the park that surprises most visitors. ' },
    { text: 'Ol Pejeta is the single best-managed wildlife reserve in East Africa', bold: true },
    { text: ' — not just by conservation metrics, but by the quality of the experience.' },
  ]),
  richTextBlock([
    { text: 'The headline fact: ' },
    { text: 'Ol Pejeta is the only place on earth where you can see all three species of African rhino', bold: true },
    { text: ' — black, white, and the last two northern white rhinos in existence.' },
  ]),

  // ── Samburu ──
  textBlock('04 — Samburu National Reserve', 'h3'),
  richTextBlock([
    { text: 'Samburu is Kenya\'s best-kept secret. Located in the semi-arid north, it\'s home to the ' },
    { text: '"Samburu Five"', bold: true },
    { text: ' — five species found nowhere else in Kenya: the Grevy\'s zebra, the reticulated giraffe, the Somali ostrich, the gerenuk, and the Beisa oryx.' },
  ]),
  textBlock('Leopard sightings at Samburu are among the best in Kenya. The dry, dramatic landscape looks completely different from the Mara\'s rolling green grasslands. Far fewer tourist vehicles — genuinely wild feeling.'),

  // ── Lake Nakuru ──
  textBlock('05 — Lake Nakuru National Park', 'h3'),
  richTextBlock([
    { text: 'Lake Nakuru\'s signature image — ' },
    { text: 'a million lesser flamingos turning an entire alkaline lake pink', bold: true },
    { text: ' — is one of the most dramatic wildlife spectacles in Africa. Beyond the flamingos, Nakuru is one of Kenya\'s most important rhino sanctuaries.' },
  ]),

  // ── Hell's Gate ──
  textBlock('06 — Hell\'s Gate National Park', 'h3'),
  richTextBlock([
    { text: 'Hell\'s Gate is unlike any other park in Kenya. There are ' },
    { text: 'no vehicles on game drives — you walk or cycle', bold: true },
    { text: ' through the gorge among zebras, giraffes, baboons, and buffalo. The dramatic volcanic landscape inspired Lion King\'s Pride Rock. ' },
    { text: 'Cheapest major park in Kenya at $26/day', bold: true },
    { text: '.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'The Tsavo surprise',
    text: 'Tsavo East and West combined are Kenya\'s largest park at 22,000 km² — larger than Wales. Most tourists overlook it entirely. The red elephants, Mzima Springs, and the Shetani Lava Fields are extraordinary. It\'s en route between Nairobi and the coast — make it a stopover rather than a separate trip.',
  },

  textBlock('Which park is right for you?', 'h2'),

  {
    _type: 'deciderGridBlock',
    _key: key(),
    cards: [
      {
        _key: key(),
        label: 'First-time visitor',
        color: 'teal',
        title: 'Maasai Mara + Amboseli',
        items: ['Guaranteed Big Five', 'The migration if Jul–Oct', 'Kilimanjaro backdrop', 'Best elephant herds'],
      },
      {
        _key: key(),
        label: 'Wildlife enthusiast',
        color: 'blue',
        title: 'Samburu + Ol Pejeta',
        items: ['Rare Samburu Five species', 'All three rhino species', 'Far fewer vehicles', 'Conservation immersion'],
      },
      {
        _key: key(),
        label: 'Budget traveller',
        color: 'purple',
        title: "Hell's Gate + Lake Nakuru",
        items: ["$26 entry — Kenya's cheapest", 'Cycle among wildlife', 'Flamingo spectacle', 'Day trips from Nairobi'],
      },
    ],
  },

  textBlock('Suggested trip options', 'h2'),

  textBlock('The Nairobi Escape (3 days)', 'h3'),
  richTextBlock([
    { text: "Hell's Gate → Lake Naivasha → Lake Nakuru. " },
    { text: 'All done from Nairobi without flying.', bold: true },
    { text: ' Cycle among giraffes, boat with hippos at sunrise, watch flamingos turn a lake pink. Under $300 total for park fees.' },
  ]),

  textBlock('The Classic (5 days)', 'h3'),
  richTextBlock([
    { text: 'Maasai Mara (3 nights) → Amboseli (2 nights). ' },
    { text: 'The most complete Kenya safari.', bold: true },
    { text: ' Migration drama in the Mara, then Kilimanjaro elephant photographs in Amboseli. This is the trip that turns people into lifelong Kenya visitors.' },
  ]),

  textBlock('The North Circuit (6 days)', 'h3'),
  richTextBlock([
    { text: 'Samburu (3 nights) → Ol Pejeta (2 nights) → Nairobi NP (half day). ' },
    { text: "Kenya's most underrated route.", bold: true },
    { text: " Samburu's rare species, Ol Pejeta's rhinos and conservation story, then end with lions against the Nairobi skyline." },
  ]),

  textBlock('The Grand Tour (8 days)', 'h3'),
  richTextBlock([
    { text: 'Samburu → Ol Pejeta → Maasai Mara → Amboseli. The full Kenya experience. North to south, rare to iconic. ' },
    { text: 'This is the trip you tell people about for the rest of your life.', bold: true },
  ]),

  textBlock('Safari packing checklist', 'h2'),

  {
    _type: 'packingListBlock',
    _key: key(),
    items: [
      { _key: key(), icon: '🎒', text: 'Neutral clothing (khaki, olive, beige)' },
      { _key: key(), icon: '🔭', text: 'Binoculars (essential — 8x42 or 10x42)' },
      { _key: key(), icon: '📸', text: 'Camera with long lens (200mm minimum)' },
      { _key: key(), icon: '🧴', text: 'Sunscreen SPF 50+' },
      { _key: key(), icon: '🦟', text: 'DEET mosquito repellent' },
      { _key: key(), icon: '💊', text: 'Malaria prophylaxis (start before travel)' },
      { _key: key(), icon: '🥾', text: 'Comfortable walking shoes' },
      { _key: key(), icon: '🧣', text: 'Light fleece (cold mornings in the Mara)' },
      { _key: key(), icon: '💧', text: 'Reusable water bottle' },
      { _key: key(), icon: '🎩', text: 'Wide-brim hat (shade in open vehicles)' },
      { _key: key(), icon: '📱', text: 'Offline maps (iOverlander or Maps.me)' },
      { _key: key(), icon: '💵', text: 'Cash in KES (many camps, cash only)' },
    ],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '📅',
    label: 'When to book — the honest timeline',
    text: "For the Maasai Mara during migration (July–October), book conservancy camps 4–6 months in advance. They sell out. For Amboseli, Samburu, and Nakuru year-round, 6–8 weeks is usually sufficient. The north circuit (Samburu + Ol Pejeta) has availability even on shorter notice because most tourists don't know about it yet.",
  },
]

async function push() {
  console.log('Pushing: Kenya National Parks Guide...')

  await client.createOrReplace({
    _id: 'blog-kenya-national-parks-guide',
    _type: 'blogPost',
    title: 'Which Kenya National Park Should You Visit? The Honest 2026 Guide',
    slug: { _type: 'slug', current: 'kenya-national-parks-guide' },
    status: 'published',
    excerpt: "54 parks. One trip. We break down Kenya's best national parks by traveller type, budget, and what nobody else tells you.",
    tags: ['Safari', 'Wildlife', 'Adventure', 'Budget Travel'],
    readingTime: 14,
    publishedAt: '2026-03-15T08:00:00Z',
    seoTitle: 'Which Kenya National Park Should You Visit? (2026 Guide)',
    seoDescription: "54 parks. One trip. We break down Kenya's best national parks by traveller type, budget, and what nobody else tells you — so you choose right the first time.",
    body: postBody,
  })

  console.log('✓ Done: kenya-national-parks-guide')
}

push().catch((err) => {
  console.error('Push failed:', err)
  process.exit(1)
})
