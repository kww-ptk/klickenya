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
// Kitesurfing in Watamu 2026: Complete Guide
// ══════════════════════════════════════════════════════

const body = [
  // ── 1. Quick Facts ──────────────────────────────────
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: `✦ Kitesurfing Watamu at a glance`,
    accentColor: 'teal',
    items: [
      { icon: `🌬️`, label: `Best wind`, value: `July to September peak (25 to 30 knots)` },
      { icon: `📊`, label: `Wind range`, value: `9 to 27 knots across seasons` },
      { icon: `🌊`, label: `Water temp`, value: `25 to 29°C year-round` },
      { icon: `📍`, label: `Spots`, value: `7+ distinct kite spots` },
      { icon: `🏫`, label: `Schools`, value: `5+ IKO-certified schools` },
      { icon: `📅`, label: `Season`, value: `Two monsoon seasons (Jan to Mar and Jul to Sep)` },
    ],
  },

  // ── 2. Stats Row ────────────────────────────────────
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { _key: key(), number: `7+`, label: `distinct kite spots from lagoons to reef breaks` },
      { _key: key(), number: `25°C+`, label: `water temperature so boardshorts all year` },
      { _key: key(), number: `2`, label: `incredible monsoon seasons delivering months of world-class wind` },
    ],
  },

  // ── 3. Kenya's Ultimate Kitesurfing Destination ─────
  textBlock(`Kenya's Ultimate Kitesurfing Destination`, 'h2'),

  textBlock(
    `Watamu is Kenya's kitesurfing capital and honestly one of the most incredible kite destinations in the world. Everything you could ever want is right here: white sand beaches, crystal clear water, sunny days, amazing restaurants nearby, stunning accommodation options, and a warm, welcoming kite community. It is truly the perfect learning spot and just as incredible for experienced riders.`
  ),

  textBlock(
    `What makes Watamu special is variety. At low tide, the reef exposes vast lagoons of butter-flat water perfect for beginners and freestyle. At high tide, the outer breaks light up for wave riding, and even at high tide it is still very safe and enjoyable for beginner riders. The growing community of resident kiters, five-plus schools, and a vibrant Italian-Kenyan scene that feeds you fresh seafood after every session means there is nowhere quite like this on the whole East African coast.`
  ),

  textBlock(
    `Unlike other world-class kite spots, Watamu is still a bit of a hidden gem and a well-kept secret. It does not have the fame of Zanzibar but the beauty is absolutely matched and in many ways surpassed. The water is never too busy, the beaches are stunning and varied, and the ocean is teeming with life. You can do incredible downwinder trips through tropical waters more beautiful than you ever thought possible, palms swaying, exploring the coast by kite in a way that feels completely unspoiled.`
  ),

  textBlock(
    `The people here are truly the most friendly, the instructors and kite community are warm and welcoming, and the whole place has an energy that keeps kiters coming back year after year. From kiters to fellow kiters: trust us, you need to experience Watamu for yourself. It is a special place for everyone but it is especially special if you love to kite.`
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
    `Watamu's wind is governed by the Indian Ocean monsoons. There are two fantastic kite seasons per year and two periods of little to no wind in between. Understanding the seasons is the most important factor in planning your kite trip.`
  ),

  textBlock(`Kusi Season: July, August and September`, 'h3'),

  textBlock(
    `The Kusi is the southeast monsoon and brings the stronger, more powerful winds of the two seasons. July, August and September are the most reliable months, with consistent winds of 25 to 30 knots. In recent years the Kusi has occasionally started early, sometimes blowing powerfully from the end of May or beginning of June, but this early period comes with some rain and is not as reliable. Every year is different, so if you want to maximise your chances of great wind, stick to July, August and September. The sea is a bit more lively during the Kusi season with some chop and waves, making it particularly exciting for riders who enjoy surfboard style riding. It is still excellent for all levels, especially at low tide on the lagoons.`
  ),

  textBlock(`Kaskazi Season: January, February and March`, 'h3'),

  textBlock(
    `The Kaskazi is the northeast monsoon and brings steady, warm winds of 20 to 25 knots. For many years this season would begin in December, but in the past four years it has not really kicked in until the beginning of January. The recommendation is to count on wind from January and not December to avoid disappointment. January, February and March are the most reliable months, with hot sunny days, pristine flat water lagoons, and perfect conditions for all levels of rider. The hottest months of the year run from October through March, and January to March is incredibly popular with kiters for good reason.`
  ),

  textBlock(`The No-Wind Months: April, May, October and November`, 'h3'),

  textBlock(
    `The reason there is no wind in these months is that the monsoon is changing direction, transitioning between the two seasons. When the wind switches direction it passes through a calm phase with little to no wind. April is typically very still, with May also being a quiet month. October and November are similarly calm and windless. These no-wind periods also tend to coincide with rainy times: April, May and sometimes into June are the long rains, though storms pass quickly and you never get many rainy days in a row. November brings the short rains, though sometimes these do not arrive at all. If you are a foil kiter you may find enough breeze to ride, but for everyone else these months are better used for exploring everything else Watamu has to offer.`
  ),

  textBlock(`Shifting Weather Patterns`, 'h3'),

  textBlock(
    `It is important to note that overall weather patterns in Kenya have been shifting and becoming more unpredictable in recent years. In 2024 the Kusi season was extraordinary: it began blowing very powerfully in May and continued all the way until the middle of October, an exceptional season for kiters. As mentioned, the Kaskazi used to kick in during December but has been arriving later and later. There is some unpredictability to it all and you might get lucky with extra windy weeks on both sides of the season boundaries. The key takeaway is: for reliable, steady wind days focus on July, August and September for Kusi and January, February and March for Kaskazi. Everything else is a bonus.`
  ),

  textBlock(`A Personal Favourite: September`, 'h3'),

  textBlock(
    `A personal favourite month for the Klickenya team is September. The wind is great, the weather is beautiful, it is not the busiest time for tourists, the ocean is gorgeous and it is not as hot as other times of the year. January, February and March are also incredible with hot, sunny days and pristine flat water riding. You really cannot go wrong with either season.`
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
      { _key: key(), criterion: `Months`, values: [`January, February, March`, `July, August, September`], winners: [false, false] },
      { _key: key(), criterion: `Wind speed`, values: [`20 to 25 knots`, `25 to 30 knots`], winners: [false, true] },
      { _key: key(), criterion: `Direction`, values: [`Northeast`, `Southeast`], winners: [false, false] },
      { _key: key(), criterion: `Water conditions`, values: [`Flat lagoons, glassy`, `More lively, some chop and waves`], winners: [true, false] },
      { _key: key(), criterion: `Best for`, values: [`All levels, especially flat water freestyle`, `All levels, great for surfboard riding`], winners: [false, false] },
      { _key: key(), criterion: `Primary kite size`, values: [`9m (12m backup)`, `9m (7m backup)`], winners: [false, false] },
      { _key: key(), criterion: `Crowd level`, values: [`Moderate`, `Low to moderate`], winners: [false, true] },
    ],
  },

  // ── 7. Tip: Best time of day ────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: `⏰`,
    label: `Best time of day`,
    text: `Wind typically picks up around 11am and peaks in the afternoon. Morning sessions are rare so use that time for snorkelling or breakfast on the beach.`,
  },

  // ── 8. The Best Kite Spots in Watamu ────────────────
  textBlock(`The Best Kite Spots in Watamu`, 'h2'),

  textBlock(
    `Watamu packs more spot variety into a short stretch of coast than almost any kite destination in Africa. Tide state matters enormously and most flat-water spots only appear at low tide when the reef drains the lagoons. In Kenya the tides change a lot and there is a big difference between high and low tide, so always keep this in mind and be careful when riding at low tide as you may fall on the coral. Reef shoes are essential for shore access.`
  ),

  textBlock(`Kite Beach`, 'h3'),

  textBlock(
    `The main hub. Works at all tides with a wide sandy launch area. Every kite school is either based here or runs shuttles. Consistent wind, rescue boat coverage, and a bar right on the sand. The default spot when you are just arriving and figuring out where to go.`
  ),

  textBlock(`Garoda Beach`, 'h3'),

  textBlock(
    `One of the most beautiful beaches in Watamu and home to a stunning sandbank that is absolutely jaw-dropping. A low-tide lagoon paradise particularly good for beginners, with waist-deep water, sandy sections, and protection from swell by the outer reef. Several schools run beginner courses here. The sandbank at Garoda is truly something special and one of the highlights of kitesurfing in Watamu.`
  ),

  textBlock(`Jacaranda`, 'h3'),

  textBlock(
    `World-class flat water during neap tides when the lagoon drains to knee depth over a vast area. This is one of the spots that put Watamu on the international kite map. Butter-flat, warm, and wide enough for boosting airs without worrying about obstacles. Jacaranda has multiple sandbanks you can explore on day trips, each more beautiful than the last. The walk out can be long so reef shoes are essential.`
  ),

  textBlock(`Turtle Reef Sandbar`, 'h3'),

  textBlock(
    `A seasonal sandbar that appears during the Kaskazi season (January to March). Perfect for freestyle with flat water, consistent wind, and a firm sand bottom to stand on between tricks. Gets popular on peak days but still rarely crowded by international standards.`
  ),

  textBlock(`Plot 40 Sandbar`, 'h3'),

  textBlock(
    `An all-levels spot that reveals itself at low tide. Enough space for beginners to practise and enough flat water for intermediate riders to progress. Less crowded than Kite Beach and a great option when the main spots are busy.`
  ),

  textBlock(`Mida Creek`, 'h3'),

  textBlock(
    `The hidden gem of Watamu kitesurfing. A vast mangrove-lined creek that offers flat water and a breathtaking backdrop of birds and mangroves. The destination for downwinder routes during Kusi season. You need a boat or a long walk to reach the launch so coordinate with a school in advance.`
  ),

  textBlock(`Che Chale`, 'h3'),

  textBlock(
    `A little further up the coast, Che Chale is a stunning destination with sand dunes and landscapes that look like they belong in a dream. A great option for a day trip from Watamu and a reminder that the beauty here really does not end. The kite conditions are excellent and the scenery makes every session feel like an adventure.`
  ),

  // ── 9. Tip: Tides ──────────────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: `🌊`,
    label: `Tides are everything`,
    text: `Tides matter more than almost anything in Watamu. Most flat-water spots only work at low tide. In Kenya the difference between high and low tide is very significant, so always check tide tables before every session and be careful at low tide because falling on the coral can hurt. Your kite school will help you plan around the tides.`,
  },

  // ── 10. Kite Schools in Watamu ──────────────────────
  textBlock(`Kite Schools in Watamu`, 'h2'),

  textBlock(
    `Watamu has a strong roster of kite schools, all offering IKO-certified instruction, gear rental, and deep local knowledge. Here are the ones with the best reputations.`
  ),

  textBlock(`JC Kite School`, 'h3'),

  textBlock(
    `Run by Jacopo Cantini, a longtime Watamu resident and IKO-certified instructor. Based at Garoda Beach with direct access to the beginner lagoon. Known for patient, methodical teaching and small group sizes. Jacopo's local knowledge of tides and spots is hard to beat.`
  ),

  textBlock(`Tribe Watersports`, 'h3'),

  textBlock(
    `An award-winning operation with centres in both Watamu and Diani. Professional setup with a full collection of rental gear, rescue boats, and structured lesson programmes. They run some of the best downwinder events on the coast.`
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

  textBlock(`Tribal Kite School`, 'h3'),

  textBlock(
    `Located at Zuri, a property of the Tribal Sand Luxury beachfront collection. This is the more upscale option for riders who want a premium, comfortable experience with a personal touch. Brand new equipment, attentive service, and a beautiful beachfront setting make Tribal Kite School the perfect choice if you are looking for something a little more refined.`
  ),

  // ── 11. What Kite Gear to Bring ─────────────────────
  textBlock(`What Kite Gear to Bring`, 'h2'),

  textBlock(
    `If you are bringing your own gear, your setup depends entirely on which season you visit.`
  ),

  textBlock(
    `For Kaskazi season (January to March), a 9m kite is your primary workhorse with a 12m for lighter days and early or late sessions. For Kusi season (July to September), the 9m is still your main kite but pack a 7m for the gusty afternoon peaks in July and August.`
  ),

  textBlock(
    `A twintip covers 90% of conditions beautifully. If you are visiting during Kusi and want to experience some wave riding, a surfboard or wave board is a wonderful addition to your kit. A strapless surfboard works beautifully in the livelier Kusi swell.`
  ),

  textBlock(
    `Beyond kites: a comfortable harness, reef shoes for walking to spots, high SPF sunscreen (the equatorial sun is intense), and a rash vest. Most schools have full rental setups if you prefer to travel light so expect to pay around $40 to $60 per day for a complete setup.`
  ),

  // ── 12. Tip: Reef Warning ──────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: `⚠️`,
    label: `Watch the reef`,
    text: `The reef is shallow at low tide. Wear reef shoes for walking to spots and be careful when falling as the coral can be sharp. Booties are not essential while riding but very helpful for shore access.`,
  },

  // ── 13. Watamu vs Diani ─────────────────────────────
  textBlock(`Watamu vs Diani: Which Kite Destination?`, 'h2'),

  textBlock(
    `Kenya has two main kite hubs on its coast: Watamu in the north and Diani Beach in the south. Both are genuinely excellent and the kite conditions are very similar, but they have a different vibe and energy that will appeal to different people.`
  ),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: `Watamu`, color: 'teal' },
      { _key: key(), label: `Diani`, color: 'slate' },
    ],
    rows: [
      { _key: key(), criterion: `Wind season`, values: [`Jan to Mar and Jul to Sep`, `Jan to Mar and Jul to Sep`], winners: [false, false] },
      { _key: key(), criterion: `Kite spots`, values: [`7+ spots, sandbanks, lagoons and creek`, `4+ spots, beaches and lagoons`], winners: [true, false] },
      { _key: key(), criterion: `Crowd level`, values: [`Moderate to quiet`, `Moderate to quiet`], winners: [false, false] },
      { _key: key(), criterion: `Vibe`, values: [`Laid back, community village with boutique hotels`, `Lively resort town, international crowd`], winners: [false, false] },
      { _key: key(), criterion: `Wave riding`, values: [`Yes, possible`, `Yes, possible`], winners: [false, false] },
      { _key: key(), criterion: `Accommodation`, values: [`Full range from budget to boutique`, `Full range from budget to luxury`], winners: [false, false] },
      { _key: key(), criterion: `Sandbanks`, values: [`Incredible, world-class`, `Limited`], winners: [true, false] },
      { _key: key(), criterion: `Marine park`, values: [`Yes, UNESCO listed`, `No`], winners: [true, false] },
      { _key: key(), criterion: `Nearby wildlife`, values: [`Arabuko Sokoke Forest, elephants, turtles`, `Shimba Hills`], winners: [true, false] },
      { _key: key(), criterion: `Schools`, values: [`5+`, `4+`], winners: [true, false] },
    ],
  },

  textBlock(
    `The kite conditions in both Watamu and Diani are excellent and very similar. Both have the same wind seasons, good schools, and beautiful beaches. The difference is in the details. Watamu has more going on: the stunning Mida Creek, more upmarket restaurants, cocktail bars, newer accommodation options, and a stronger kite community. Most importantly, Watamu has the sandbanks, and those sandbanks are truly difficult to compete with anywhere in the world. Crystal clear turquoise water, white sand, nobody else around, and the wind filling your kite. Watamu also sits within a UNESCO Marine Park which Diani does not have, and the Arabuko Sokoke Forest nearby means you can kite all day and watch elephants at sunset. There is simply nowhere else like it.`
  ),

  textBlock(
    `That said, Diani is also a gorgeous spot and Kenya is so beautiful in general. If you have enough time, try to experience both locations. And do not forget Kilifi, which also has plenty of beauty and some wonderful kite options of its own. Kenya will spoil you.`
  ),

  // ── 14. The Epic Downwinder Routes ──────────────────
  textBlock(`The Epic Downwinder Routes`, 'h2'),

  textBlock(
    `Downwinders are the ultimate Watamu kite experience: long runs along the coast with the wind at your back, ending with a cold Tusker and a boat ride home.`
  ),

  textBlock(
    `The signature route is the 25km Tribe Pro Center to Mida Creek run during Kusi season. The southeast wind pushes you along the coast past reef breaks, sandbanks, and mangrove channels. Tribe runs this as an organised event with rescue boat support and it is highly recommended for your first time.`
  ),

  textBlock(
    `The 15km kite safari from Garoda to Jacaranda is another classic route, passing through multiple lagoons and sandbar spots along the way. The tropical waters are more beautiful than you even imagined possible, with palms swaying and the Kenyan coast stretching out ahead of you.`
  ),

  textBlock(
    `All downwinders should be done with rescue boat support. The reef creates shallow sections that can catch you out if the wind drops, and currents near creek mouths can be strong. Never attempt a downwinder alone.`
  ),

  // ── 15. Pull Quote ──────────────────────────────────
  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: `The first time you kite the Watamu lagoon at low tide with nobody else in sight, warm water, and the reef breaking in the distance, you understand why people come back every year.`,
    attribution: `Resident kiter, Watamu`,
    accentColor: 'teal',
  },

  // ── 16. Kitesurfing in a Marine Park ────────────────
  textBlock(`Kitesurfing in a Marine Park`, 'h2'),

  textBlock(
    `Watamu sits within a UNESCO-listed marine park and this makes for some of the most unique kitesurfing in the world. While you ride, you will see sea turtles gliding beneath you and reef sharks cruising through the crystal clear water. Do not worry, they are not dangerous at all and seeing them while you kite is an experience you will never forget. The marine park protection means the ocean here is exceptionally healthy and beautiful, and the visibility in the water is breathtaking.`
  ),

  // ── 17. Beyond the Kite ─────────────────────────────
  textBlock(`Beyond the Kite: Food, Sunsets and Elephants`, 'h2'),

  textBlock(
    `Most incredible kite destinations are very remote and that is part of the appeal. But Watamu is different: you can kite all day and then enjoy nice restaurants, great accommodation, meet wonderful people, go out and enjoy the nightlife, and connect with local Kenyans who are among the friendliest people you will ever meet.`
  ),

  textBlock(
    `Watamu has a delicious food scene and a growing cocktail bar culture. After a session on the water, watching the sun set over the Indian Ocean with a fresh coconut or a well-made cocktail in hand is one of life's great pleasures. The restaurants here range from simple local spots serving fresh fish to more refined dining experiences. You will eat incredibly well.`
  ),

  textBlock(
    `And then there is the Arabuko Sokoke Forest, right on the doorstep of Watamu. One of the largest remaining coastal forests in East Africa, it is home to elephants, rare birds, and incredible biodiversity. You can genuinely kite all morning, have lunch on the beach, and then head into the forest to watch elephants at sunset. There is nowhere else in the world where this is possible. This is what makes Watamu truly extraordinary.`
  ),

  // ── 18. Practical Info for Kite Travellers ──────────
  textBlock(`Practical Info for Kite Travellers`, 'h2'),

  textBlock(
    `The nearest airport is Malindi (MAL), a 20-minute drive from Watamu. Kenya Airways and Safarilink fly daily from Nairobi Wilson and Jomo Kenyatta. Alternatively, fly into Mombasa (MBA) and drive north, about 2 hours on the new highway, or arrange a transfer through your hotel.`
  ),

  textBlock(
    `Kenya Airways allows kite bags as sports equipment. Check their current policy before booking as weight limits and fees change seasonally. Most riders pack kites in a golf bag to avoid the surcharge some airlines apply.`
  ),

  textBlock(
    `Accommodation ranges from $30 backpacker rooms to $200+ boutique hotels. Check our Watamu stays guide at /stays/watamu for curated options near the kite spots.`
  ),

  textBlock(
    `M-Pesa is the easiest way to pay for lessons, transfers, and local services. Set up your account before arrival or ask your school to help. Most schools also accept USD and EUR in cash.`
  ),

  textBlock(
    `Travel insurance is essential. Make sure your policy explicitly covers kitesurfing. World Nomads and SafetyWing both offer plans that include water sports. Keep your IKO certification handy as some insurers require proof of competency.`
  ),

  // ── 19. Verdict Card ────────────────────────────────
  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: `Our verdict`,
    title: `Should You Kite in Watamu?`,
    pros: [
      `Two distinct monsoon seasons with months of reliable, world-class wind`,
      `7+ spots from flat lagoons and stunning sandbanks to reef breaks`,
      `Warm water year-round, no wetsuit needed`,
      `Still a hidden gem: uncrowded and unspoiled compared to Zanzibar and other famous spots`,
      `Marine park with turtles and sharks right where you ride`,
      `Arabuko Sokoke Forest with elephants, five minutes away`,
      `Vibrant food scene, cocktail bars, and a genuine local community`,
      `Affordable lessons, food, and accommodation`,
      `The friendliest instructors and kite community you will find anywhere`,
    ],
    cons: [
      `October and November are essentially windless`,
      `April and May are also very still (monsoon transition months)`,
      `Tides complicate session planning but your school handles this`,
      `Reef shoes are a must for shore access`,
    ],
  },

  // ── 20. Who Is It For ───────────────────────────────
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: `Who Should Kite in Watamu?`,
    items: [
      { _key: key(), icon: `🪁`, text: `Beginners: flat lagoons, gentle conditions at low tide, and brilliant IKO schools make learning here a dream` },
      { _key: key(), icon: `🤸`, text: `Freestylers: Jacaranda's world-class flat water is made for tricks and airs` },
      { _key: key(), icon: `🏄`, text: `Wave riders: the livelier Kusi season swell is perfect for surfboard riding` },
      { _key: key(), icon: `💑`, text: `Couples: one kites while the other snorkels, dives, or relaxes on the beach` },
      { _key: key(), icon: `💻`, text: `Digital nomads: kite in the afternoon, work in the morning with reliable WiFi` },
      { _key: key(), icon: `👨‍👩‍👧`, text: `Families: calm lagoons, a safe village atmosphere, and the forest and marine park to explore` },
      { _key: key(), icon: `🌍`, text: `Adventurers: downwinder trips, turtles while you ride, elephants at sunset. This is kitesurfing like nowhere else on earth` },
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
    title: `Kitesurfing in Watamu 2026: Wind, Spots, Schools and the Complete Guide`,
    slug: { _type: 'slug', current: `kitesurfing-watamu-guide` },
    status: `published`,
    primaryCategory: `beaches_coast`,
    subcategory: `guide`,
    location: `watamu`,
    series: `Watamu Complete Guide`,
    postType: `guide`,
    focusKeyword: `kitesurfing watamu kenya`,
    seoTitle: `Kitesurfing Watamu 2026: Wind Seasons, Spots and Schools`,
    seoDescription: `Complete guide to kitesurfing in Watamu Kenya. Monthly wind data, best spots, kite schools, gear advice, and live forecast. Updated 2026.`,
    excerpt: `Watamu is Kenya's kitesurfing capital and one of the world's most incredible kite destinations. Two monsoon seasons, stunning sandbanks, warm water year-round, a UNESCO marine park with turtles, and a community that will make you feel at home. Here is everything you need to plan your kite trip.`,
    readingTime: 15,
    publishedAt: `2026-03-27T08:00:00Z`,
    author: { _type: 'reference', _ref: `0a5287ef-f74d-4893-a487-6b672cb63477` },
    tags: [`Kitesurfing`, `Watamu`, `Water Sports`],
    keywords: [`kitesurf`, `watamu`, `wind`, `kaskazi`, `kusi`, `lagoon`, `kenya coast`],
    body,
  }

  // Delete any existing draft so Studio shows the published version
  await client.delete(`drafts.${doc._id}`).catch(() => {})
  // Replace the published version
  await client.createOrReplace(doc)
  console.log(`✅ Kitesurf guide seeded (draft cleared, published version updated)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
