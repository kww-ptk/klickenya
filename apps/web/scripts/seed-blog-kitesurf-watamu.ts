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
// Kitesurfing in Watamu 2026 — Complete Guide
// ══════════════════════════════════════════════════════

const body = [
  // ── 1. Quick Facts ──────────────────────────────────
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: `✦ Kitesurfing Watamu at a glance`,
    accentColor: 'teal',
    items: [
      { icon: `🌬️`, label: `Best wind`, value: `Jul–Aug peak (25–30 knots)` },
      { icon: `📊`, label: `Wind range`, value: `9–27 knots across seasons` },
      { icon: `🌊`, label: `Water temp`, value: `25–29°C year-round` },
      { icon: `📍`, label: `Spots`, value: `7+ distinct kite spots` },
      { icon: `🏫`, label: `Schools`, value: `5+ IKO-certified schools` },
      { icon: `📅`, label: `Season`, value: `Year-round (except Nov)` },
    ],
  },

  // ── 2. Stats Row ────────────────────────────────────
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { _key: key(), number: `7+`, label: `distinct kite spots from lagoons to reef breaks` },
      { _key: key(), number: `25°C+`, label: `water temperature — boardshorts all year` },
      { _key: key(), number: `300+`, label: `wind days per year across two monsoon seasons` },
    ],
  },

  // ── 3. Why Watamu is Kenya's Kitesurfing Capital ────
  textBlock(`Why Watamu is Kenya's Kitesurfing Capital`, 'h2'),

  textBlock(
    `Kitesurfing in Watamu, Kenya is unlike anywhere else on the East African coast. Two monsoon seasons — the kaskazi from the northeast and the kusi from the southeast — deliver reliable wind from December through September, with only November offering a true lull. That means roughly 300 wind days a year in a setting most kite destinations can only dream of: a UNESCO-listed marine park, turquoise water never dropping below 25°C, and seven distinct spots spread across just a few kilometres of coastline.`
  ),

  textBlock(
    `What makes Watamu special is variety. At low tide, the reef exposes vast lagoons of butter-flat water perfect for beginners and freestyle. At high tide, the outer breaks light up for wave riding. The growing community of resident kiters, five-plus schools, and an Italian-Kenyan hospitality scene that feeds you fresh seafood after every session — it all adds up to Kenya's undisputed kitesurfing capital.`
  ),

  // ── 4. Wind Chart Widget ────────────────────────────
  {
    _type: 'windChartBlock',
    _key: key(),
    placeholder: `Wind charts here`,
  },

  // ── 5. The Two Wind Seasons Explained ───────────────
  textBlock(`The Two Wind Seasons Explained`, 'h2'),

  textBlock(
    `Watamu's wind is governed by the Indian Ocean monsoons. Understanding the two seasons is the single most important factor in planning your kite trip.`
  ),

  textBlock(`Kaskazi — The Northeast Monsoon (December–March)`, 'h3'),

  textBlock(
    `The kaskazi blows from the northeast at a steady 20–25 knots, peaking in January and February. It creates the flattest water conditions of the year as it pushes offshore across the lagoons. Water is warm (28–29°C), skies are clear, and crowds are manageable. This is the season for beginners learning on glass-flat lagoons and freestylers looking for perfect pop conditions. A 9m kite is your daily driver; pack a 12m for lighter days.`
  ),

  textBlock(`Kusi — The Southeast Monsoon (June–September)`, 'h3'),

  textBlock(
    `The kusi arrives from the southeast with more power — 25–30 knots on peak days in July and August. It brings choppier conditions and proper waves at spots like Silversands. Water cools slightly to 25–26°C but you are still in boardshorts. This is the season for experienced riders, wave enthusiasts, and anyone who loves powered sessions. Your go-to kite drops to a 9m with a 7m for gusty afternoons.`
  ),

  textBlock(`Transition Months`, 'h3'),

  textBlock(
    `April–May and October are transition periods. Wind is lighter and less consistent (12–18 knots), but you can still score sessions — especially in the afternoons. November is the calmest month of the year and not recommended for a dedicated kite trip, though foil kiters can find enough breeze to ride.`
  ),

  // ── 6. Compare Table: Kaskazi vs Kusi ───────────────
  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: `Kaskazi (NE)`, color: 'teal' },
      { _key: key(), label: `Kusi (SE)`, color: 'slate' },
    ],
    rows: [
      { _key: key(), criterion: `Wind speed`, values: [`20–25 knots`, `25–30 knots`], winners: [false, true] },
      { _key: key(), criterion: `Direction`, values: [`Northeast`, `Southeast`], winners: [false, false] },
      { _key: key(), criterion: `Water conditions`, values: [`Flat lagoons`, `Choppy + waves`], winners: [true, false] },
      { _key: key(), criterion: `Best for`, values: [`Beginners & freestyle`, `Wave riding & advanced`], winners: [false, false] },
      { _key: key(), criterion: `Primary kite size`, values: [`9m (12m backup)`, `9m (7m backup)`], winners: [false, false] },
      { _key: key(), criterion: `Crowd level`, values: [`Moderate`, `Low`], winners: [false, true] },
    ],
  },

  // ── 7. Tip: Best time of day ────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: `⏰`,
    label: `Best time of day`,
    text: `Wind typically picks up around 11am and peaks in the afternoon. Morning sessions are rare — use that time for snorkelling or breakfast on the beach.`,
  },

  // ── 8. The 7 Best Kite Spots in Watamu ──────────────
  textBlock(`The 7 Best Kite Spots in Watamu`, 'h2'),

  textBlock(
    `Watamu packs more spot variety into a short stretch of coast than almost any kite destination in Africa. Tide state matters enormously — most flat-water spots only appear at low tide when the reef drains the lagoons.`
  ),

  textBlock(`Kite Beach`, 'h3'),

  textBlock(
    `The main hub. Works at all tides with a wide sandy launch area. Every kite school is either based here or runs shuttles. Consistent wind, rescue boat coverage, and a bar right on the sand. The default spot when you do not know where to go.`
  ),

  textBlock(`Jacaranda`, 'h3'),

  textBlock(
    `World-class flat water during neap tides when the lagoon drains to knee depth over a vast area. This is the spot that put Watamu on the international kite map. Butter-flat, warm, and wide enough for boosting massive airs without worrying about obstacles. The walk out can be long — reef shoes are essential.`
  ),

  textBlock(`Garoda Beach`, 'h3'),

  textBlock(
    `A low-tide lagoon paradise for beginners. Waist-deep water, sandy bottom in sections, and protected from swell by the outer reef. Several schools run beginner courses here. The beach itself is one of the most beautiful in Watamu.`
  ),

  textBlock(`Turtle Reef Sandbar`, 'h3'),

  textBlock(
    `A seasonal sandbar that appears during the kaskazi season (December–March). Perfect for freestyle with flat water, consistent wind, and a firm sand bottom to stand on between tricks. Gets crowded on peak days.`
  ),

  textBlock(`Plot 40 Sandbar`, 'h3'),

  textBlock(
    `An all-levels spot that reveals itself at low tide. Enough space for beginners to practise and enough flat water for intermediate riders to progress. Less crowded than Kite Beach.`
  ),

  textBlock(`Silversands`, 'h3'),

  textBlock(
    `The wave spot. Only works during kusi season at high tide when the southeast swell wraps around the reef. Proper wave riding with clean faces and offshore wind. Not for beginners — you need solid upwind skills and wave board experience. When it is on, it is world-class.`
  ),

  textBlock(`Mida Creek`, 'h3'),

  textBlock(
    `The hidden gem. A vast mangrove-lined creek south of Watamu that offers flat water and a stunning backdrop of birds and mangroves. The destination for downwinder routes during kusi season. You need a boat or a long walk to reach the launch — coordinate with a school.`
  ),

  // ── 9. Tip: Tides ──────────────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: `🌊`,
    label: `Tides are everything`,
    text: `Tides matter more than wind in Watamu. Most flat-water spots only work at low tide. Check tide tables before every session — your kite school will plan around them.`,
  },

  // ── 10. Kite Schools in Watamu ──────────────────────
  textBlock(`Kite Schools in Watamu`, 'h2'),

  textBlock(
    `Watamu has a strong roster of kite schools, all offering IKO-certified instruction, gear rental, and local knowledge. Here are the ones with the best reputations.`
  ),

  textBlock(`JC Kite School`, 'h3'),

  textBlock(
    `Run by Jacopo Cantini, a longtime Watamu resident and IKO-certified instructor. Based at Garoda Beach with direct access to the beginner lagoon. Known for patient, methodical teaching and small group sizes. Jacopo's local knowledge of tides and spots is hard to beat.`
  ),

  textBlock(`Tribe Watersports`, 'h3'),

  textBlock(
    `An award-winning operation with centres in both Watamu and Diani. Professional setup with a full quiver of rental gear, rescue boats, and structured lesson programmes. They run the best downwinder events on the coast.`
  ),

  textBlock(`Barefoot Kenya`, 'h3'),

  textBlock(
    `Run by Tom, a British expat with over 15 years of kite instruction on the Kenyan coast. Laid-back vibe, excellent for intermediate riders who want to progress rather than just learn basics. Good connections to the local kite community.`
  ),

  textBlock(`Kitemotion`, 'h3'),

  textBlock(
    `Italian-run school with solid equipment and a focus on safety. Popular with the Italian expat and tourist community. Offers SUP and surf lessons alongside kite courses.`
  ),

  textBlock(`Watamu Kiteboarding`, 'h3'),

  textBlock(
    `A locally rooted school with competitive pricing and friendly instructors. Good option for budget-conscious travellers who still want quality instruction and access to the best spots.`
  ),

  // ── 11. What Kite Gear to Bring ─────────────────────
  textBlock(`What Kite Gear to Bring`, 'h2'),

  textBlock(
    `If you are bringing your own gear, your quiver depends entirely on which season you visit.`
  ),

  textBlock(
    `For kaskazi season (December–March), a 9m kite is your primary workhorse with a 12m for lighter days and early/late sessions. For kusi season (June–September), the 9m is still your main kite but pack a 7m for the gusty afternoon peaks in July and August.`
  ),

  textBlock(
    `A twintip is all you need for 90% of conditions. If you are visiting during kusi and want to ride Silversands, bring a wave board — you will not regret it. A strapless surfboard works beautifully in the clean kusi swell.`
  ),

  textBlock(
    `Beyond kites: a comfortable harness, reef shoes for walking to spots, high-SPF sunscreen (the equatorial sun is brutal), and a rash vest. Most schools have full rental quivers if you prefer to travel light — expect to pay around $40–60 per day for a complete setup.`
  ),

  // ── 12. Tip: Reef Warning ──────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: `⚠️`,
    label: `Watch the reef`,
    text: `The reef is shallow at low tide. Wear reef shoes for walking to spots. Booties are not necessary while riding but helpful for shore access.`,
  },

  // ── 13. Watamu vs Diani ─────────────────────────────
  textBlock(`Watamu vs Diani — Which Kite Destination?`, 'h2'),

  textBlock(
    `Kenya has two main kite hubs on its coast: Watamu in the north and Diani Beach in the south. Both are excellent, but they suit different riders.`
  ),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: `Watamu`, color: 'teal' },
      { _key: key(), label: `Diani`, color: 'slate' },
    ],
    rows: [
      { _key: key(), criterion: `Wind season`, values: [`Dec–Mar + Jun–Sep`, `Dec–Mar + Jun–Sep`], winners: [false, false] },
      { _key: key(), criterion: `Spot variety`, values: [`7+ spots, lagoons + waves`, `3–4 spots, mainly reef`], winners: [true, false] },
      { _key: key(), criterion: `Crowd level`, values: [`Low–moderate`, `Moderate–busy`], winners: [true, false] },
      { _key: key(), criterion: `Vibe`, values: [`Village, Italian-Kenyan`, `Resort town, international`], winners: [false, false] },
      { _key: key(), criterion: `Wave riding`, values: [`Silversands (kusi)`, `Limited`], winners: [true, false] },
      { _key: key(), criterion: `Accommodation`, values: [`Boutique & budget`, `Full range, more luxury`], winners: [false, true] },
      { _key: key(), criterion: `Schools`, values: [`5+`, `3–4`], winners: [true, false] },
    ],
  },

  // ── 14. The Epic Downwinder Routes ──────────────────
  textBlock(`The Epic Downwinder Routes`, 'h2'),

  textBlock(
    `Downwinders are the ultimate Watamu kite experience — long runs along the coast with the wind at your back, ending with a cold Tusker and a boat ride home.`
  ),

  textBlock(
    `The signature route is the 25km Tribe Pro Center to Mida Creek run during kusi season. The southeast wind pushes you along the coast past reef breaks, sandbanks, and mangrove channels. Tribe runs this as an organised event with rescue boat support — highly recommended for your first time.`
  ),

  textBlock(
    `A shorter option is the 14km Kongo Mosque to Galu run, perfect for intermediate riders who want the downwinder experience without the full marathon distance. The 15km kite safari from Garoda to Jacaranda is another classic, passing through multiple lagoons and sandbar spots along the way.`
  ),

  textBlock(
    `All downwinders should be done with rescue boat support. The reef creates shallow sections that can catch you out if the wind drops, and currents near creek mouths are strong. Never attempt a downwinder alone.`
  ),

  // ── 15. Pull Quote ──────────────────────────────────
  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: `The first time you kite the Watamu lagoon at low tide with nobody else in sight, warm water, and the reef breaking in the distance — you understand why people come back every year.`,
    attribution: `Resident kiter, Watamu`,
    accentColor: 'teal',
  },

  // ── 16. Practical Info for Kite Travellers ──────────
  textBlock(`Practical Info for Kite Travellers`, 'h2'),

  textBlock(
    `The nearest airport is Malindi (MAL), a 20-minute drive from Watamu. Kenya Airways and Safarilink fly daily from Nairobi Wilson and Jomo Kenyatta. Alternatively, fly into Mombasa (MBA) and drive north — about 2 hours on the new highway or arrange a transfer through your hotel.`
  ),

  textBlock(
    `Kenya Airways allows kite bags as sports equipment — check their current policy before booking, as weight limits and fees change seasonally. Most riders pack kites in a golf bag to avoid the "kite surcharge" some airlines apply.`
  ),

  textBlock(
    `Accommodation ranges from $30 backpacker rooms to $200+ boutique hotels. Check our Watamu stays guide at /stays/watamu for curated options near the kite spots.`
  ),

  textBlock(
    `M-Pesa is the easiest way to pay for lessons, transfers, and local services. Set up your account before arrival or ask your school to help. Most schools also accept USD and EUR in cash.`
  ),

  textBlock(
    `Travel insurance is essential — make sure your policy explicitly covers kitesurfing. World Nomads and SafetyWing both offer plans that include water sports. Keep your IKO certification handy as some insurers require proof of competency.`
  ),

  // ── 17. Verdict Card ────────────────────────────────
  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: `Our verdict`,
    title: `Should You Kite in Watamu?`,
    pros: [
      `Two distinct monsoon seasons deliver 300+ wind days`,
      `7+ spots from flat lagoons to proper wave riding`,
      `Warm water year-round — no wetsuit needed`,
      `Uncrowded compared to European and Caribbean spots`,
      `Affordable lessons, food, and accommodation`,
      `Growing international kite community`,
    ],
    cons: [
      `November is essentially windless`,
      `Tides complicate session planning — flexibility required`,
      `Reef shoes are a must for shore access`,
      `No nightlife kite scene like Tarifa or Cabarete`,
    ],
  },

  // ── 18. Who Is It For ───────────────────────────────
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: `Who Should Kite in Watamu?`,
    items: [
      { _key: key(), icon: `🪁`, text: `Beginners — flat lagoons and quality IKO schools make learning easy` },
      { _key: key(), icon: `🤸`, text: `Freestylers — Jacaranda's flat water is world-class for tricks and airs` },
      { _key: key(), icon: `🏄`, text: `Wave riders — Silversands during kusi season offers clean wave faces` },
      { _key: key(), icon: `💑`, text: `Couples — one kites while the other snorkels, dives, or relaxes on the beach` },
      { _key: key(), icon: `💻`, text: `Digital nomads — kite in the afternoon, work in the morning with reliable WiFi` },
      { _key: key(), icon: `👨‍👩‍👧`, text: `Families — calm lagoons and a safe, welcoming village atmosphere` },
    ],
  },
]

// ══════════════════════════════════════════════════════
// Seed document
// ══════════════════════════════════════════════════════

async function main() {
  const doc = {
    _id: `blog-kitesurf-watamu-guide`,
    _type: `blogPost`,
    title: `Kitesurfing in Watamu 2026 — Wind, Spots, Schools & the Complete Guide`,
    slug: { _type: 'slug', current: `kitesurfing-watamu-guide` },
    status: `published`,
    primaryCategory: `beaches_coast`,
    subcategory: `guide`,
    location: `watamu`,
    series: `Watamu Complete Guide`,
    postType: `guide`,
    focusKeyword: `kitesurfing watamu kenya`,
    seoTitle: `Kitesurfing Watamu 2026 — Wind Seasons, Spots & Schools`,
    seoDescription: `Complete guide to kitesurfing in Watamu Kenya. Monthly wind data, best spots, kite schools, gear advice, and live forecast. Updated 2026.`,
    excerpt: `Watamu is Kenya's kitesurfing capital — two monsoon seasons, seven distinct spots, warm water year-round, and a lagoon that turns into a flat-water paradise at low tide. Here is everything you need to plan your kite trip.`,
    readingTime: 12,
    publishedAt: `2026-03-27T08:00:00Z`,
    author: { _type: 'reference', _ref: `0a5287ef-f74d-4893-a487-6b672cb63477` },
    tags: [`Kitesurfing`, `Watamu`, `Water Sports`],
    keywords: [`kitesurf`, `watamu`, `wind`, `kaskazi`, `kusi`, `lagoon`, `kenya coast`],
    body,
  }

  await client.createOrReplace(doc)
  console.log(`✅ Kitesurf guide seeded`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
