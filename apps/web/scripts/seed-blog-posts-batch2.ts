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

// ══════════════════════════════════════════════════════
// POST 1: Kenya National Parks Guide
// ══════════════════════════════════════════════════════

const nationalParksBody = [
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

  // ── Hell\'s Gate ──
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

// ══════════════════════════════════════════════════════
// POST 2: Watamu Transport Guide
// ══════════════════════════════════════════════════════

const watamuTransportBody = [
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Quick Facts: Getting to Watamu',
    accentColor: 'teal',
    items: [
      { icon: '✈️', label: 'Nearest airport', value: 'Malindi (30 min)' },
      { icon: '🚕', label: 'From Mombasa', value: '2.5 hrs · KSh 7–9k' },
      { icon: '🚌', label: 'From Nairobi', value: 'Train + taxi' },
      { icon: '🛺', label: 'Around town', value: 'KSh 300–600' },
      { icon: '🚶', label: 'Walkable', value: 'Yes, main areas' },
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
    { text: ', the closest at just 30 minutes away, or ' },
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
    label: 'Malindi vs Mombasa: which airport to use',
    text: "If you're coming from Nairobi, always fly into Malindi. The 45-minute flight and short taxi to Watamu is far better than landing at Mombasa and adding 2.5 hours of road travel. Only use Mombasa if you want time in the city first.",
  },

  textBlock('Getting to Watamu by Road', 'h2'),

  textBlock('The coast road between Mombasa and Malindi is one of Kenya\'s most scenic drives, palm-lined, ocean-glimpsed, and unhurried. From Mombasa it\'s 2.5 hours. From Nairobi, take the SGR Madaraka Express train to Mombasa (4.5 hours, comfortable, affordable) then a taxi or matatu north to Watamu.'),

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
  textBlock('Fastest and cheapest for short solo hops. Available at every junction and beach entrance. Great for daytime errands. Generally tuk-tuks are a little more expensive than motorcycles.'),

  textBlock('Walking (Free)', 'h3'),
  textBlock('The beach road and main town are very walkable. Best way to discover restaurants and shops you\'d miss from a tuk-tuk. Stick to lit areas at night.'),

  textBlock('Scooter rental (KSh 1,500–2,500/day)', 'h3'),
  textBlock('Best for stays of 5+ days. Lets you reach Arabuko Forest, Gedi Ruins, and Mida Creek independently. Requires a licence.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🛺',
    label: 'Tuk-tuk fare guide: Watamu 2026',
    text: 'Town centre → Sunset Lab: KSh 300–400. Town centre → Garoda Beach: KSh 500–600. Town centre → Jacaranda Beach: KSh 400–500. Night fares (after 10pm): add KSh 100–200. Always agree the fare before you get in.',
  },

  textBlock('Practical Tips', 'h2'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '🌙',
    label: 'Night safety on motorbikes',
    text: 'Avoid motorbikes on unlit roads after dark. The roads between beaches can be poorly lit and difficult to navigate. Stick to tuk-tuks after sunset, slightly more expensive but far safer for night journeys back to your accommodation.',
  },

  textBlock('At night be a little more cautious. Once you have a boda boda or tuk-tuk driver that you like and trust, take their number and call them to pick you up from places. This makes getting around much easier and safer.'),

  textBlock('Everyone speaks English and many speak Italian too. Do not be afraid to ask or communicate clearly with drivers. Kenyans are incredible and friendly people, and tourism brings a lot of opportunity. As tourists, many visitors are unaware of local prices and can be at risk of being overcharged. Some general rules: a tuk-tuk or motorbike ride anywhere within Watamu should never cost more than 600 KSh. The maximum distance of around 9 or 10 km should never exceed 600 KSh, and that is on the high end. Shorter distances are usually more in the range of 150 to 350 KSh.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💵',
    label: 'Always carry cash',
    text: "Card readers are unreliable in Watamu. Many don't work at all in smaller establishments. Always carry Kenyan shillings for tuk-tuks, motorbikes, market purchases, and smaller restaurants. There is an ATM in Watamu town centre but keep a buffer.",
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

// ══════════════════════════════════════════════════════
// POST 3: Watamu Nightlife Guide
// ══════════════════════════════════════════════════════

const watamuNightlifeBody = [
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Quick Facts — Watamu Nightlife',
    accentColor: 'amber',
    items: [
      { icon: '🌙', label: 'Best nights', value: 'Friday + Saturday' },
      { icon: '📅', label: 'Peak season', value: 'Jul–Aug · Dec–Jan' },
      { icon: '💰', label: 'Budget', value: 'KSh 2,000–8,000' },
      { icon: '🛺', label: 'Transport', value: 'Tuk-tuk or boda' },
      { icon: '🎪', label: 'Big event', value: 'Kaleidoscope (March)' },
      { icon: '👟', label: 'Dress code', value: 'Beach casual' },
    ],
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '5+', label: 'venues worth your night' },
      { number: '1×', label: 'year — Kaleidoscope Festival' },
      { number: 'KSh 300', label: 'average tuk-tuk fare' },
    ],
  },

  textBlock('The Watamu Nightlife Scene', 'h2'),

  textBlock("Watamu's nightlife is small, genuine, and growing fast. Unlike Diani or Mombasa it hasn't been over-commercialised — you still get a real mix of expats, tourists, and locals sharing the same beach bars without the cliques. The scene is most alive on Friday and Saturday nights, and during peak season there is something happening almost every night of the week."),

  textBlock("Don't come expecting rooftop clubs or VIP tables. Come expecting to meet interesting people, dance on sand, watch the sun dissolve into the Indian Ocean, and end up somewhere unexpected at midnight. That is the Watamu way."),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '📅',
    label: 'Best months for nightlife',
    text: 'The scene peaks in July–August and December–January. April–June is long rains season — many venues close or run reduced hours. October–November and February–March are quieter but the main weekly events still run.',
  },

  textBlock('Sunset Lab — Friday Nights', 'h2'),

  richTextBlock([
    { text: "Sunset Lab sits at the very end of Watamu's main beach road — follow the road until it runs out and you'll find it. " },
    { text: 'Friday nights are the main event', bold: true },
    { text: ': exceptional DJs spinning a mix of international hits and Afrobeat, often with live saxophone or drums. The food is proper — some of the best pizza on the coast. The seating is bohemian — low cushions, candles, the sound of the ocean.' },
  ]),

  textBlock("The crowd is international and friendly. You'll hear Italian, French, English, and Swahili all at the same table. Sunsets here are genuinely spectacular. Arrive by 6pm to secure a good spot. After 8pm finding a table becomes a project."),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌅',
    label: 'Pro tip — arrive before sunset',
    text: 'Get there by 6pm to secure good seating and catch the sunset from the beachside cushions. Booking is strongly recommended during July–August — walk-ins are often turned away at the gate on busy Fridays.',
  },

  textBlock('Paparemo Beach Party — Saturday Nights', 'h2'),

  textBlock('Paparemo is a Saturday night institution. Located on Watamu Beach on the main road towards Jacaranda, it draws a genuinely mixed crowd of locals and tourists dancing together on sand until the early hours. Music ranges from African to Italian mainstream.'),

  richTextBlock([
    { text: 'This is the most affordable option on the Watamu nightlife circuit. ' },
    { text: 'Pro tip: leave your shoes behind the DJ booth', bold: true },
    { text: ' if you want to dance properly. The sand is the dance floor and flip flops get in the way.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'A word of caution',
    text: "Like any beach party anywhere in the world, keep an eye on your belongings. Don't leave your phone or wallet unattended on the sand. Always take a tuk-tuk back to your accommodation rather than walking unlit roads after dark.",
  },

  textBlock('Lichthaus — For the Sunset Crowd', 'h2'),

  richTextBlock([
    { text: "Lichthaus is near Garoda Beach at the end of Watamu Road — bohemian to its core. Cushions on the floor, small tables, nets to relax in over the creek. " },
    { text: 'Not really a party venue', bold: true },
    { text: ', but exceptional for sundowners and for starting your evening.' },
  ]),

  textBlock("Bring your swimsuit — a sunset swim in the creek before the drinks is a Watamu tradition. Half the people you meet at Lichthaus will still be your friends by the end of the week."),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: "Half the people you meet at Lichthaus will still be your friends by the end of the week. That's the Watamu effect.",
    attribution: '— Regular visitor, Watamu',
    accentColor: 'amber',
  },

  textBlock('Car Wash — The Local Bar', 'h2'),

  textBlock('A genuinely local spot open every night. African dance music, karaoke once a week, and a DJ who will play your requests. Very affordable at KSh 200–400 for a beer. A different energy from the expat bars: louder, more local, more unpredictable.'),

  textBlock('Kaleidoscope Festival — The Annual Highlight', 'h2'),

  richTextBlock([
    { text: 'Kaleidoscope is in a different category entirely. Held annually at ' },
    { text: 'Temple Point Resort', bold: true },
    { text: ' — usually in March — it transforms the creek into a full festival weekend: international DJs, elaborate art installations, food trucks, tattoo artists, craft markets, and legendary dhow parties on the water.' },
  ]),

  textBlock('Organised by a collective of young creatives, the production quality is remarkable. Lighting rigs over the water, themed zones, performances that continue until sunrise. Genuinely unlike any other event on the Kenya coast.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'purple',
    icon: '🎪',
    label: 'Book Kaleidoscope tickets early',
    text: 'Tickets go on sale 6–8 weeks before the festival. Dhow party slots sell out within days — sometimes hours. Follow Kaleidoscope Festival Kenya on Instagram for announcements. Budget KSh 8,000–15,000 for the full weekend.',
  },

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: 'Full', label: 'weekend of programming' },
      { number: 'International', label: 'DJ lineup each year' },
      { number: 'March', label: 'usual festival month' },
    ],
  },

  textBlock('Getting Around at Night', 'h2'),

  richTextBlock([
    { text: 'Tuk-tuks and motorbikes run late into the night and are the standard way to move between venues. Always ' },
    { text: 'agree on the fare before you get in', bold: true },
    { text: " — KSh 300–600 depending on distance. Don't walk alone on unlit roads after dark." },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🛺',
    label: 'Night transport price guide',
    text: 'Motorbike (boda boda): KSh 100–300 for short hops. Tuk-tuk between venues: KSh 300–600. Night surcharge after 10pm: add KSh 100–200. Most drivers know Sunset Lab, Paparemo, and Lichthaus by name. Always carry cash.',
  },
]

// ══════════════════════════════════════════════════════
// Seed all 3 posts
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('Seeding 3 new blog posts...\n')

  await client.createOrReplace({
    _id: 'blog-kenya-national-parks-guide',
    _type: 'blogPost',
    title: 'Which Kenya National Park Should You Visit? The Honest 2026 Guide',
    slug: { _type: 'slug', current: 'kenya-national-parks-guide' },
    status: 'published',
    excerpt:
      "54 parks. One trip. We break down Kenya's best national parks by traveller type, budget, and what nobody else tells you.",
    tags: ['Safari', 'Wildlife', 'Adventure', 'Budget Travel'],
    readingTime: 14,
    publishedAt: '2026-03-15T08:00:00Z',
    seoTitle: 'Which Kenya National Park Should You Visit? (2026 Guide)',
    seoDescription:
      "54 parks. One trip. We break down Kenya's best national parks by traveller type, budget, and what nobody else tells you — so you choose right the first time.",
    body: nationalParksBody,
  })
  console.log('✓ Post 1: kenya-national-parks-guide')

  await client.createOrReplace({
    _id: 'blog-watamu-transport-guide',
    _type: 'blogPost',
    title: 'How to Get to and Around Watamu 2026: Flights, Taxis & Tuk-Tuks (With Prices)',
    slug: { _type: 'slug', current: 'watamu-transport-guide' },
    status: 'published',
    excerpt:
      'Complete transport guide for Watamu Kenya. Flights to Malindi, taxis from Mombasa, tuk-tuks, motorbikes and walking — with real 2026 KES prices.',
    tags: ['Coast', 'Budget Travel', 'Road Trip'],
    readingTime: 8,
    publishedAt: '2026-03-12T08:00:00Z',
    seoTitle: 'How to Get to Watamu Kenya 2026 — Flights, Taxis & Prices',
    seoDescription:
      'Complete transport guide for Watamu Kenya. Flights to Malindi, taxis from Mombasa, tuk-tuks, motorbikes and walking with real 2026 prices.',
    body: watamuTransportBody,
  })
  console.log('✓ Post 2: watamu-transport-guide')

  await client.createOrReplace({
    _id: 'blog-watamu-nightlife-guide',
    _type: 'blogPost',
    title: 'Watamu Nightlife 2026: The Honest Guide to Bars, Beach Parties & Late Nights',
    slug: { _type: 'slug', current: 'watamu-nightlife-guide' },
    status: 'published',
    excerpt:
      'The real guide to Watamu nightlife — Sunset Lab Fridays, Paparemo Beach Parties, Lichthaus sunsets, Kaleidoscope Festival and more.',
    tags: ['Coast', 'Food & Culture', 'Beach'],
    readingTime: 7,
    publishedAt: '2026-03-13T08:00:00Z',
    seoTitle: 'Watamu Nightlife 2026 — Bars, Beach Parties & Late Nights',
    seoDescription:
      'The real guide to Watamu nightlife. Sunset Lab Fridays, Paparemo Beach Parties, Lichthaus sunsets, Kaleidoscope Festival and more.',
    body: watamuNightlifeBody,
  })
  console.log('✓ Post 3: watamu-nightlife-guide')

  console.log('\nDone! All 3 blog posts seeded successfully.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
