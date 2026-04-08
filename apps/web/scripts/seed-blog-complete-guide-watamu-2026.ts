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

function textBlock(text: string, style = 'normal'): any {
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
      const k = key()
      markDefs.push({ _type: 'link', _key: k, href: c.link })
      marks.push(k)
    }
    return { _type: 'span', _key: key(), text: c.text, marks }
  })
  return { _type: 'block', _key: key(), style: 'normal', markDefs, children: spans }
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
// THE COMPLETE GUIDE TO WATAMU, KENYA 2026
// ══════════════════════════════════════════════════════

const body: any[] = [

  // ── Quick Facts ──────────────────────────────────────
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Watamu at a glance',
    accentColor: 'teal',
    items: [
      { icon: '📍', label: 'Location', value: '108 km north of Mombasa, 25 km south of Malindi' },
      { icon: '✈️', label: 'Nearest airport', value: 'Malindi (30 min drive)' },
      { icon: '📅', label: 'Best time', value: 'Dec to Mar and Jul to Oct' },
      { icon: '🌊', label: 'Known for', value: 'Marine park, sandbanks, Italian food, kitesurfing' },
      { icon: '🌴', label: 'Vibe', value: 'Laid-back, easygoing, genuinely beautiful' },
      { icon: '💰', label: 'Budget range', value: 'KSh 5,000 to 60,000 per day' },
    ],
  },

  // ═══════════════════════════════════════════════════
  // SECTION 1: INTRODUCTION
  // ═══════════════════════════════════════════════════
  textBlock('Why People Love Watamu', 'h2'),

  textBlock('We have lived in Watamu. We still have roots there. This guide is everything we know about it, written honestly and personally so that you arrive prepared and leave wanting to come back. It covers every single thing you could possibly need to know about Watamu in one place: beaches, food, seasons, transport, money, history, nightlife, where to stay, what to do and much more. Real tips from locals, not a marketing brochure.'),

  richText([
    { text: 'Watamu is ' },
    { text: 'the most popular tourist destination on the Kenya coast', bold: true },
    { text: ', and for very good reason. It has some of the most beautiful beaches in the world: white sand, crystal clear tropical water, multiple island formations rising from the sea, and sandbanks that emerge at low tide to create scenery that genuinely stops people in their tracks. The lagoons are extraordinary. The marine park is world class. And there is a peacefulness here that is very hard to find anywhere else.' },
  ]),

  textBlock('There is a vibe in Watamu that is almost impossible to explain in words. Easygoing, relaxed, genuinely unhurried. You cannot visit and not absorb it. By day three most people have stopped checking their phones and started checking the tides instead. That shift is the real Watamu experience and it is the thing people miss most when they leave.'),

  richText([
    { text: 'Beyond the beaches, there is a huge amount going on. ' },
    { text: 'Stunning Mida Creek', bold: true },
    { text: ', a world-class marine park for snorkelling and diving, a rich Swahili history, the Arabuko Sokoke Forest where you can watch elephants at sunset 15 minutes from the beach, and easy access to Tsavo East National Park for a coast and safari combination that very few destinations in the world can match.' },
  ]),

  richText([
    { text: 'The food is probably the best on the entire Kenyan coast. The Italian community that has called Watamu home for over 60 years has built a restaurant scene that is genuinely extraordinary for a village of this size. Cocktail bars, excellent cafes, fresh seafood, handmade gelato. And the villas here are the most beautiful in Kenya: private staffed properties with pools and ocean views that groups of friends and families return to year after year.' },
  ]),

  textBlock('Of all the coastal destinations in Kenya, Watamu has the most developed tourist infrastructure. More accommodation options at more price points, more activities, better restaurants, easier logistics. It is the most practical place on the coast to have a great holiday without having to think too hard about the details. And the local Kenyan community here are warm, friendly and genuinely welcoming, which makes the whole experience even better.'),

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '10 km²', label: 'marine national park, established 1968, one of Africa\'s oldest' },
      { number: '108 km', label: 'north of Mombasa along the coast road' },
      { number: '350+', label: 'bird species recorded at Mida Creek alone' },
    ],
  },

  placeholder('Watamu beach, white sand and crystal clear water'),

  // ═══════════════════════════════════════════════════
  // SECTION 2: HOW TO GET TO WATAMU
  // ═══════════════════════════════════════════════════
  textBlock('How to Get to Watamu', 'h2'),

  textBlock('Watamu sits 108 km north of Mombasa and 25 km south of Malindi on Kenya\'s north coast. There is no airport in Watamu itself. The nearest is Malindi Airport, a 30-minute taxi ride away. This is the airport to aim for.'),

  textBlock('By air from Nairobi', 'h3'),

  richText([
    { text: 'If your international flight arrives in Nairobi, the best connection is a domestic flight to ' },
    { text: 'Malindi Airport', bold: true },
    { text: '. Multiple airlines fly this route daily including Kenya Airways, Jambojet, AirKenya and Fly 540. The flight takes 45 minutes. Fares start from around KSh 4,000 one way booked in advance and rise to KSh 12,000 or more during peak season.' },
  ]),

  richText([
    { text: 'You can also fly Nairobi to Mombasa, but be aware that the drive from Mombasa to Watamu takes almost 3 hours by taxi. Flying to Malindi is almost always the better choice. The price difference between the two routes is usually small and you save half a day of travel.' },
  ]),

  textBlock('By train and road from Nairobi', 'h3'),

  richText([
    { text: 'The ' },
    { text: 'SGR Madaraka Express', bold: true },
    { text: ' runs from Nairobi Terminus to Mombasa Terminus in around 4.5 hours. Economy class costs KSh 1,000 and first class KSh 3,000. From Mombasa you then take a taxi or matatu north to Watamu. A direct taxi from Mombasa to Watamu costs KSh 7,000 to 9,000. A matatu to Malindi costs KSh 250 to 350 and then a tuk-tuk to Watamu costs KSh 100 to 200.' },
  ]),

  textBlock('By road from Mombasa', 'h3'),

  textBlock('The coast road from Mombasa to Watamu is tarmac the whole way and passes through Kilifi, which is worth a stop. Expect the drive to take 2.5 to 3 hours depending on traffic at the Likoni Ferry. A private taxi costs KSh 7,000 to 9,000.'),

  textBlock('Car rental', 'h3'),

  textBlock('Renting a car in Kenya is possible but less straightforward than in many other countries. It requires more organising and it is important that you use a trusted company with verified reviews. You must also be aware that road conditions and driving standards vary significantly, and traffic rules are not always followed. Our team is currently working to find the best car rental services for visitors to the coast and very soon you will be able to book reliable car rental directly through this website in the services section.'),

  textBlock('Matatus', 'h3'),

  textBlock('Taking a matatu (public minibus) is the most adventurous option and can be an experience in itself, but take care of yourself and your belongings. Almost everyone in Kenya speaks English so if you are confused, just ask. Always agree the price before you travel, not after.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '✈️',
    label: 'Fly to Malindi, not Mombasa',
    text: 'If your international connection goes through Nairobi, always take the domestic connection to Malindi rather than Mombasa. The flight time is the same but from Malindi you are 30 minutes from Watamu. From Mombasa you are almost 3 hours away. The price difference is usually under KSh 2,000.',
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🏨',
    label: 'Ask your accommodation about transfers',
    text: 'Many hotels, villas and guesthouses in Watamu can arrange or recommend airport transfers. If you have booked a place to stay, ask them before you arrive. It is often the easiest option and they will know the most reliable local drivers.',
  },

  richText([
    { text: 'For a full breakdown of all transport options to and around Watamu, read our dedicated guide: ' },
    { text: 'Getting to and around Watamu', bold: true, link: 'https://www.klickenya.com/journal/watamu-transport-guide' },
    { text: '.' },
  ]),

  placeholder('The road into Watamu from Malindi'),

  // ═══════════════════════════════════════════════════
  // SECTION 3: BEST TIME TO VISIT
  // ═══════════════════════════════════════════════════
  textBlock('Best Time to Visit Watamu', 'h2'),

  richText([
    { text: 'The honest answer is that Watamu is beautiful all year round. But the seasons are very different from each other and understanding them will help you plan the right trip for what you want. The one period to be aware of is ' },
    { text: 'April, May and June', bold: true },
    { text: ', which is the long rains season and effectively the low season. Many restaurants and accommodations close during this period and most visitors do not travel at this time. Watamu reopens again from the beginning of July, so make sure to keep this in mind when booking.' },
  ]),

  textBlock('November to March: Hot, Dry and Beautiful', 'h3'),

  richText([
    { text: 'This is the most popular time to visit. It is hot and dry with temperatures reaching ' },
    { text: '34 to 35 degrees Celsius', bold: true },
    { text: ' in the middle of the day. The sea is calm and clear, which makes this the best time for snorkelling, diving and dolphin excursions on Safari Blue trips. December, January and February in particular are stunning months when the ocean is at its most beautiful. The water is like glass.' },
  ]),

  textBlock('July to October: Kite Season and the Sweet Spot', 'h3'),

  richText([
    { text: 'The second main season is cooler and drier. Daytime temperatures sit around ' },
    { text: '27 to 29 degrees Celsius', bold: true },
    { text: ', and evening temperatures can drop to around 24 degrees, which is the coldest Watamu ever gets. The Kusi trade winds blow strongly and consistently during July, August and September, making this the best kitesurfing season. September is a personal favourite: dry, beautiful and a little cooler than the hot season.' },
  ]),

  richText([
    { text: 'There is a slight lull in tourist business in October and November with some short rains, but this is still a lovely time to visit with fewer crowds and lower prices. If you want the very calmest conditions for snorkelling, November is excellent, but be aware it is very hot without the sea breeze.' },
  ]),

  richText([
    { text: 'For kitesurfers, read our full guide to wind and kite seasons: ' },
    { text: 'Kitesurfing in Watamu', bold: true, link: 'https://www.klickenya.com/journal/kitesurfing-watamu-guide' },
    { text: '.' },
  ]),

  textBlock('Busiest months: January, February, July and August', 'h3'),

  textBlock('These four months see the most visitors. Accommodation books up fast, especially the best villas which can be reserved months in advance. If you prefer a quieter experience with lower prices, come outside of these months. You will not be sacrificing on weather or beauty.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '🌿',
    label: 'A note on seaweed',
    text: 'Seaweed on the beach is one of those things that is very difficult to predict. The beach with seaweed and the beach without it are very different experiences. It tends to be more common during rainy periods, but it fluctuates every year. December to March usually has the least. August to October can also be good. If you arrive and one beach has seaweed, explore the others because it does not always accumulate evenly across the bays. We cannot guarantee a seaweed-free visit but we can tell you it is manageable.',
  },

  richText([
    { text: 'For a full breakdown of every month including temperatures, sea conditions, dolphin season and what is open, read our complete: ' },
    { text: 'Best time to visit Watamu guide', bold: true, link: 'https://www.klickenya.com/journal/best-time-to-visit-watamu' },
    { text: '.' },
  ]),

  placeholder('Watamu in the dry season, calm blue water'),

  // ═══════════════════════════════════════════════════
  // SECTION 4: AREAS OF WATAMU
  // ═══════════════════════════════════════════════════
  textBlock('Areas of Watamu Explained', 'h2'),

  textBlock('Watamu stretches along one straight road of about 9 km from end to end. You can drive the whole length in around 20 minutes. There are four main areas along this road, each with its own character, its own beaches and its own feel. All of them are beautiful and all are worth exploring. A local tip: find the accommodation that suits you best and use tuk-tuks to explore all the areas because if you only stay in one and never venture to the others you are genuinely missing out.'),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: 'Watamu Centre', color: 'teal' },
      { _key: key(), label: 'Turtle Bay and Garoda', color: 'blue' },
      { _key: key(), label: 'Seven Islands', color: 'amber' },
      { _key: key(), label: 'Jacaranda', color: 'purple' },
    ],
    rows: [
      {
        _key: key(),
        criterion: 'Vibe',
        values: ['Lively, busy, convenient', 'Wild, lush, peaceful', 'Growing fast, resort feel', 'Remote, beautiful, isolated'],
        winners: [],
      },
      {
        _key: key(),
        criterion: 'Beach',
        values: ['Central bay, beach bars and sunbeds', 'Long white sand stretch and sandbank', 'Three bays, reef at low tide', 'Endless sandbanks, turquoise water'],
        winners: [1, 3],
      },
      {
        _key: key(),
        criterion: 'Shopping',
        values: ['Carrefour at Rubis nearby', 'Blue Moon Mall at Garoda', 'Watamu Mall', 'Nothing close'],
        winners: [0],
      },
      {
        _key: key(),
        criterion: 'Best for',
        values: ['First timers, foodies, convenience', 'Couples, kitesurfers, nature lovers', 'Families, resort lovers, snorkellers', 'A few quiet nights, day trips'],
        winners: [],
      },
    ],
  },

  textBlock('Watamu Centre (Village)', 'h3'),

  textBlock('This is where it all happens. The village has trinket and souvenir shops, fruit stalls along the street, ATMs, banks, petrol stations and the Carrefour supermarket. The beach here is the main central bay: the most lively with beach bars, sunbeds, restaurants and resorts all alongside each other. It is the most convenient base if you want everything close by. It is also where you are most likely to be approached by vendors selling things; a firm and polite no is always enough.'),

  textBlock('Turtle Bay and Garoda', 'h3'),

  textBlock('Heading right when you face the ocean from the centre, you first reach Turtle Bay, a sheltered bay with excellent snorkelling and the famous turtle-shaped rock. Then comes Garoda, where most of the kite schools operate. This area has a stunning sandbank that appears at low tide, some of the best restaurants in Watamu, and a long beautiful stretch of white sandy beach all the way down to Mida Creek. It is lush and green, more residential and more wild. Further down this road you find Short Beach and the famous Lichthaus for sunset. This is also where you access Mida Creek for dhow trips, kayaking and paddleboarding. The Blue Moon Mall is here for shopping. Further from town, so you need a tuk-tuk or motorbike, but it is worth it.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🦐',
    label: 'Prawn Lake at Garoda',
    text: 'At Garoda there is a small tidal salt flat called Prawn Lake. You can have a meal or a sunset cocktail overlooking it at Prawns Lake restaurant or at Pilipan, both of which sit right on the water on stilts. It is a genuinely lovely and very local thing to do.',
  },

  textBlock('Seven Islands', 'h3'),

  textBlock('Heading left when you face the ocean from the centre, you reach the Seven Islands area, named for the seven remarkable island formations visible from the shore. The reef gets exposed at low tide and you can walk out and explore it. There are several resorts here and the area is growing faster than anywhere else in Watamu right now, with new developments going up regularly. The Watamu Mall is here for shopping, as are the Non Solo padel courts. The Snake Farm is also in this area.'),

  textBlock('Jacaranda', 'h3'),

  textBlock('Technically not Watamu, Jacaranda sits around 15 km north of the centre. It has beach bars, restaurants, kite schools and accommodation. The sandbanks here are exceptional and at the right tide the water is stunning. Timing the tides matters a lot here for the best experience. It is dry and open, with less greenery than the Garoda side. If you base yourself here you will need a car as it is a 20 to 30 minute drive into town. Better as a day trip or for a couple of quiet nights rather than a full stay for most visitors.'),

  textBlock('Bonus areas: Timboni and Gede', 'h3'),

  textBlock('Timboni is the bustling town towards the end of the road between Gede and Watamu centre. This is where many Kenyan residents actually live. It has hardware shops, vegetable markets, clothes sellers, carpenters, pots and pans, and a few excellent local eating spots including the famous Swahili Cafe. Come here for the real Kenya experience and try second-hand clothes shopping, which in Kenya is called mitumba. Clothes come in large batches from overseas, often in good condition and very cheap. Gede is the village on the main Mombasa to Malindi highway where you turn off toward Watamu, and is also close to the famous Gede Ruins.'),

  richText([
    { text: 'For a detailed guide to every area including where to eat and stay in each one: ' },
    { text: 'Watamu areas and neighbourhood guide', bold: true, link: 'https://www.klickenya.com/journal/watamu-areas-neighbourhood-guide' },
    { text: '.' },
  ]),

  placeholder('Aerial view of Watamu coast showing the different bays and island formations'),

  // ═══════════════════════════════════════════════════
  // SECTION 5: HOW TO GET AROUND
  // ═══════════════════════════════════════════════════
  textBlock('How to Get Around Watamu', 'h2'),

  textBlock('Getting around Watamu is easy once you know the options. You have three main choices: tuk-tuk, boda boda (motorcycle taxi) or rental car. If you are staying in the centre you can also walk along the road or do long beach walks to explore. Walking the beach is one of the best ways to see Watamu anyway.'),

  textBlock('Tuk-tuks and boda bodas', 'h3'),

  richText([
    { text: 'There are plenty of friendly tuk-tuk and boda boda drivers who will be happy to take you wherever you need to go. ' },
    { text: 'Always agree the price before you travel, not after.', bold: true },
    { text: ' A tuk-tuk or boda boda ride anywhere within Watamu should never cost more than KSh 600, and that is already the high end for the full 9 km length of the road. Shorter rides are usually KSh 150 to 350. Tuk-tuks are generally slightly more expensive than motorcycles. If a short ride is quoted at more than KSh 500, bargain. Do not be shy about this, it is completely normal in Kenya and nobody will be offended.' },
  ]),

  textBlock('Carry small notes and change where possible, as many drivers use M-Pesa and may not have change for large notes. If you only have large notes, petrol stations are a good place to ask for smaller denominations. Once you find a driver you like and trust, take their number so you can call them when you need a pick-up.'),

  textBlock('At night, be a little more cautious. Use a tuk-tuk rather than walking unlit roads after dark and stick to drivers you know.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🛺',
    label: 'Price guide for tuk-tuks',
    text: 'Short rides within one area: KSh 150 to 300. Full length of Watamu road (9 km): KSh 400 to 600 maximum. Anything above these is worth negotiating. Kenyans are friendly and bargaining is normal, so do not hesitate to politely offer a lower price.',
  },

  richText([
    { text: 'For a full guide to getting around including car rental options and M-Pesa for transport payments: ' },
    { text: 'Watamu transport guide', bold: true, link: 'https://www.klickenya.com/journal/watamu-transport-guide' },
    { text: '.' },
  ]),

  placeholder('Tuk-tuks on the Watamu road'),

  // ═══════════════════════════════════════════════════
  // SECTION 6: MONEY, SIM AND PRACTICAL INFO
  // ═══════════════════════════════════════════════════
  textBlock('Money, SIM Cards and Practical Information', 'h2'),

  richText([
    { text: 'Sorting out money and a SIM card before or shortly after you arrive makes everything much easier. The currency is the ' },
    { text: 'Kenya Shilling (KSh)', bold: true },
    { text: '. Most local restaurants, shops and transport run on cash. Larger hotels and upmarket restaurants accept Visa and Mastercard but often with extra charges. Do not assume you can tap your card everywhere.' },
  ]),

  textBlock('ATMs', 'h3'),

  textBlock('There are three ATMs in Watamu town: KCB Bank (most reliable, accepts Visa and Mastercard), Equity Bank (near the market, also reliable) and I&M Bank (less consistent, use as backup). All accept international cards. Withdrawal limits are around KSh 40,000 per transaction. Your bank will charge a foreign transaction fee of roughly KSh 350 to 500 per withdrawal, so withdraw larger amounts less frequently to reduce fees. If you are flying through Mombasa or Malindi, withdrawing there gives you more ATM options.'),

  textBlock('Currency exchange', 'h3'),

  textBlock('USD and EUR exchange best at banks (Monday to Friday, 9am to 3pm). Forex bureaus in town offer decent rates but check at least two. Hotels exchange money but at poor rates, around 10 to 15% markup. Avoid street changers entirely. Bring clean USD notes from 2013 onwards: older or damaged notes are refused everywhere.'),

  textBlock('M-Pesa', 'h3'),

  richText([
    { text: 'M-Pesa is Kenya\'s mobile money system and it is ' },
    { text: 'accepted everywhere in Watamu', bold: true },
    { text: ': restaurants, tuk-tuks, shops, beach bars. It is genuinely the best way to pay. To use it, get a Safaricom SIM card (available at Watamu Mall or Blue Moon Mall, passport required) and ask the agent to activate M-Pesa. You can then load money via cash at any Safaricom agent kiosk, or transfer directly from your bank using Remitly or Revolut. The M-Pesa app makes everything easier.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💡',
    label: 'Bring clean, new USD bills',
    text: 'Kenya is strict about US dollar notes. Bring clean, post-2013 bills only. Notes with tears, pen marks or pre-2013 serial numbers will be refused at banks, forex bureaus and hotels. EUR is also widely accepted.',
  },

  richText([
    { text: 'For everything you need to know about money in Watamu in detail: ' },
    { text: 'Money, ATMs and currency exchange in Watamu', bold: true, link: 'https://www.klickenya.com/journal/money-exchange-atm-watamu-guide' },
    { text: '.' },
  ]),

  placeholder('Watamu town centre with shops and market stalls'),

  // ═══════════════════════════════════════════════════
  // SECTION 7: MALLS AND WHERE TO SHOP
  // ═══════════════════════════════════════════════════
  textBlock('Malls and Where to Shop', 'h2'),

  textBlock('Watamu has three main shopping options and a number of smaller street shops and markets. Here is where to go for what.'),

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '3', label: 'main malls in Watamu with supermarkets, banks and Safaricom shops' },
      { number: '3', label: 'petrol stations in Watamu centre' },
      { number: '3', label: 'ATMs in Watamu town' },
    ],
  },

  textBlock('Carrefour at Rubis', 'h3'),
  textBlock('The biggest and most central option. You can find almost everything here: food, drinks, household supplies, toiletries, electronics, clothing and more. This is the go-to for a full shop and the most convenient for anyone staying in or near the centre.'),

  textBlock('Watamu Mall', 'h3'),
  textBlock('Located in the Seven Islands area. Has a supermarket, restaurant, cafe, bank and a Safaricom shop for SIM cards and data bundles. A good all-in-one stop if you are staying on that side of Watamu.'),

  textBlock('Blue Moon Mall', 'h3'),
  textBlock('Located in the Garoda area. The supermarket here is called Blue Marmalade. It is on the more expensive side but stocks some harder-to-find items and quality products. The mall also has a restaurant, bank and Safaricom shop.'),

  textBlock('Street shops and fruit stalls', 'h3'),
  richText([
    { text: 'Small bandas and street stalls along the main road sell fresh fruit, vegetables, spices and local produce. Prices should be negotiated. As a rough guide: a mango should cost no more than KSh 80 to 100 (KSh 120 at most for a very large one), a pineapple around KSh 150 to 200, a large watermelon KSh 200. All prices in KSh.' },
  ]),

  textBlock('Timboni for everything else', 'h3'),
  textBlock('If you are looking for clothes, hardware, furniture, cooking equipment or anything practical, head to Timboni village at the beginning of the road from Watamu centre toward Gede. It is chaotic and brilliant and very much the real Kenya. The mitumba second-hand clothes market here is excellent if you have patience to dig through.'),

  placeholder('Local fruit stalls on the Watamu road'),

  // ═══════════════════════════════════════════════════
  // SECTION 8: WHERE TO STAY
  // ═══════════════════════════════════════════════════
  textBlock('Where to Stay in Watamu', 'h2'),

  richText([
    { text: 'Watamu has the ' },
    { text: 'widest range of accommodation on the Kenya coast', bold: true },
    { text: ', from all-inclusive resorts to budget guesthouses to some of the most beautiful private villas in Africa. Whatever your budget and travel style, something exists here.' },
  ]),

  textBlock('Large resorts and all-inclusives', 'h3'),
  textBlock('Turtle Bay Beach Club, Barracuda Inn, Medina Palms and Seven Islands Resort are among the established resort options. Hemingways Watamu on Garoda Beach is one of the most refined properties on the entire coast. These are good for families and those who want everything organised in one place.'),

  textBlock('Boutique hotels', 'h3'),
  textBlock('The boutique hotel scene has grown significantly in recent years, particularly in the Garoda and Seven Islands areas. Many are Italian-owned and the design quality is exceptional. Expect pool, garden, and personal service at a more intimate scale than the big resorts.'),

  textBlock('Private villas', 'h3'),
  richText([
    { text: 'This is where Watamu truly stands out. The private villa scene here is the best in Kenya: staffed properties with pools, chefs, housekeepers and beach access, rented as a whole unit for groups of 4 to 12 people. The designs are genuinely beautiful and the value, especially for groups splitting the cost, is extraordinary. This is how most repeat visitors stay in Watamu. ' },
    { text: 'Browse verified stays in Watamu', bold: true, link: 'https://www.klickenya.com/stays/watamu' },
    { text: '.' },
  ]),

  textBlock('Some properties will genuinely blow you away: incredible ocean views, tropical gardens, private pools and relaxed comfortable spaces to spend your days. The harder challenge is choosing one.'),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🏡',
    label: 'Book villas well in advance in peak season',
    text: 'The best private villas in Watamu book up months in advance for December, January, July and August. If you are travelling during these months and want a villa, start looking at least 3 to 4 months ahead. A full dedicated accommodation guide for Watamu is coming soon.',
  },

  placeholder('Private pool villa in Watamu with ocean views'),

  // ═══════════════════════════════════════════════════
  // SECTION 9: WHAT TO DO
  // ═══════════════════════════════════════════════════
  textBlock('What to Do in Watamu', 'h2'),

  textBlock('There is so much to do in Watamu that it deserves its own full blog post, which is coming very soon. For now, here is everything on offer, with a note on each. There are options for absolutely everybody here.'),

  richText([
    { text: 'Relax on the beach: ', bold: true },
    { text: 'Some of the most beautiful beaches in the world. Do long beach walks, soak up the sunshine, walk along sandbanks and spot turtles and small reef sharks from the shore. Do not worry, they are not dangerous. Walk through rock pools at low tide and enjoy the extraordinary marine scenery at your feet.' },
  ]),

  richText([
    { text: 'Snorkelling in the marine park: ', bold: true },
    { text: 'Take a day boat trip, snorkel over the coral gardens and see sea turtles, colourful reef fish and if you are lucky, dolphins. The Coral Gardens, Turtle Bay and Larder are among the best spots in the park. Glass-bottom boats are also available for non-swimmers.' },
  ]),

  richText([
    { text: 'Seafood barbecue on a sandbank: ', bold: true },
    { text: 'One of the most memorable things you can do in Watamu. Fresh fish grilled on a sandbank in the middle of the ocean, surrounded by nothing but turquoise water. Arrange through your accommodation or a local boat operator.' },
  ]),

  richText([
    { text: 'Kayaking and paddleboarding on Mida Creek: ', bold: true },
    { text: 'The mangrove forest at Mida Creek is something truly special. Trips are arranged by operators including Tribal Sand, Treehouse and Temple Point. Be aware of currents and always go at a time recommended by your guide, as the tides make certain windows much safer and more beautiful than others.' },
  ]),

  richText([
    { text: 'Dhow ride on Mida Creek: ', bold: true },
    { text: 'Traditional wooden sailing boat on the creek. Peaceful, photogenic and genuinely memorable. One of those experiences that stays with you long after the trip.' },
  ]),

  richText([
    { text: 'Diving: ', bold: true },
    { text: 'Several established dive operators work in Watamu. Sites include the Mida Wreck, Barracuda Reef, Dolphin Point and Whale Island. Best visibility is December to March.' },
  ]),

  richText([
    { text: 'Deep sea fishing: ', bold: true },
    { text: 'Some of the best fishing on the East African coast, particularly during the calm season between December and April. Blue marlin, sailfish, yellowfin tuna and mahi mahi are all in these waters.' },
  ]),

  richText([
    { text: 'Kitesurfing: ', bold: true },
    { text: 'Watamu is Kenya\'s kite capital and one of the best kite destinations in East Africa. The lagoon at Garoda is ideal for beginners: flat water, consistent wind, soft sand. The main season is July to September. Several IKO-certified schools operate here. This is Zanzibar before the tourist takeover: the water is extraordinary, the community is great, and you can kite all day then enjoy a proper restaurant dinner in the evening. The downwinder trips along the coast are unlike anything else. ' },
    { text: 'Full kitesurfing guide', bold: true, link: 'https://www.klickenya.com/journal/kitesurfing-watamu-guide' },
    { text: '.' },
  ]),

  richText([
    { text: 'Sunset watching: ', bold: true },
    { text: 'Plenty of beautiful spots: Lichthaus on the creek, the Crab Shack, Short Beach, Prawn Lake, Pilipan and Sunset Lab all offer different vibes, good cocktails and food. ' },
    { text: 'Watamu sunset spots guide', bold: true, link: 'https://www.klickenya.com/journal/watamu-sunset-spots-guide' },
    { text: '.' },
  ]),

  richText([
    { text: 'Elephants at sunset in Arabuko Sokoke: ', bold: true },
    { text: 'Around 200 forest elephants live in the Arabuko Sokoke Forest, 10 minutes from Watamu centre. They come to the salt lick in the early evening. Arrange a trusted tuk-tuk or boda boda, agree the price before you go, and they will take you there. One of the most extraordinary experiences you can have in Kenya.' },
  ]),

  richText([
    { text: 'Gede Ruins: ', bold: true },
    { text: 'A UNESCO World Heritage Site just 10 km from Watamu, the Gede Ruins are the remains of a 12th century Swahili city. Open daily 7:30am to 6pm, entry KSh 1,000 for non-residents.' },
  ]),

  richText([
    { text: 'Bird watching in Arabuko Sokoke: ', bold: true },
    { text: 'Over 230 bird species recorded including the Sokoke Scops Owl and Clarke\'s Weaver, both globally threatened. Also home to the golden-rumped elephant shrew, endemic to this forest. There is a beautiful viewpoint overlooking both the forest and the ocean.' },
  ]),

  richText([
    { text: 'Hell\'s Kitchen at Marafa: ', bold: true },
    { text: 'About 45 km from Watamu, the Marafa Depression is a dramatic landscape of eroded sandstone gorges in layers of white, pink, orange and crimson. Known locally as Nyari, meaning the place broken by itself. Visit in the early morning or after 2:30pm to avoid peak heat. Entry KSh 1,000 for non-residents.' },
  ]),

  richText([
    { text: 'Golf at Crystal Bay: ', bold: true },
    { text: 'A small golf course right on the seafront. A genuinely unique spot to play a round.' },
  ]),

  richText([
    { text: 'Spa and wellness: ', bold: true },
    { text: 'Plenty of excellent spa options in Watamu. Yoga and wellness classes, gym access at Gym and Tonic at Lichthaus and Fit Like Vic. Two padel courts at Non Solo and Ocean Sports. You will soon be able to browse and book all of these directly through this website.' },
  ]),

  richText([
    { text: 'Safari to Tsavo East: ', bold: true },
    { text: 'One of the largest national parks in the world is around 3 to 4 hours from Watamu. Big elephants, lions, leopards, buffalo and cheetah. Many visitors do 4 to 5 nights in Watamu and then 2 nights on safari before flying home from Mombasa. One of the best holiday combinations available anywhere.' },
  ]),

  richText([
    { text: 'You will very soon be able to discover and directly book activities, services and experiences in Watamu through this website. Browse what is available now at ' },
    { text: 'klickenya.com/experiences/watamu', bold: true, link: 'https://www.klickenya.com/experiences/watamu' },
    { text: '.' },
  ]),

  placeholder('Snorkelling in Watamu Marine National Park'),

  // ═══════════════════════════════════════════════════
  // SECTION 10: WHERE TO EAT
  // ═══════════════════════════════════════════════════
  textBlock('Where to Eat in Watamu', 'h2'),

  richText([
    { text: 'Watamu has, in our opinion, ' },
    { text: 'the best food on the entire Kenya coast.', bold: true },
    { text: ' The density of good restaurants for a village of this size is remarkable. Italian restaurants with proper wood-fired pizza and handmade pasta, fresh seafood caught that morning, Lebanese food, poke bowls, incredible salads, local Swahili cuisine, Kenyan breakfast spots, cafes with real espresso and flat whites, gelato, and cocktail bars with ocean views. Wherever you go, the food will be good.' },
  ]),

  textBlock('The Italian influence means that pasta and pizza here are not tourist approximations. They are made by Italians, with Italian techniques. The seafood is extraordinary: crab, lobster, prawns, tuna, red snapper, kingfish, all landed locally and served the same day. Many of the best restaurants sit right on the beach with the ocean in front of you as you eat.'),

  textBlock('Do not forget the local Kenyan food either. Chapati, ugali, spinach stews, coconut fish curries and local seafood dishes are delicious and much cheaper than the international restaurants. The Swahili Cafe in Timboni is a local favourite.'),

  richText([
    { text: 'And the tropical fruit: please do not leave without buying some from the street stalls. ' },
    { text: 'Kenyan mangoes are genuinely some of the best in the world.', bold: true },
    { text: ' Addictive, sweet and nothing like what you get at home. Pineapple, watermelon, passion fruit, papaya, avocado and fresh coconuts are all available and incredible. They are the best beach snack on a hot day. Buy in large quantities.' },
  ]),

  textBlock('If you are staying in self-catering accommodation, the fresh produce available in Watamu is excellent. The markets and street stalls have everything you need to cook extraordinary meals.'),

  textBlock('A full and detailed where-to-eat guide for Watamu with specific restaurant recommendations is coming soon.'),

  placeholder('Fresh seafood and wood-fired pizza in Watamu'),

  // ═══════════════════════════════════════════════════
  // SECTION 11: NIGHTLIFE
  // ═══════════════════════════════════════════════════
  textBlock('Nightlife in Watamu', 'h2'),

  textBlock('Watamu\'s nightlife is small, genuine and growing fast. Unlike Diani or Mombasa it has not been over-commercialised. You still get a real mix of expats, tourists and locals sharing the same beach bars without the cliques. The scene is most alive on Friday and Saturday nights, and during peak season there is something happening almost every night.'),

  textBlock('Do not come expecting rooftop clubs or VIP tables. Come expecting to meet interesting people, dance on sand, watch the sun dissolve into the Indian Ocean and end up somewhere unexpected at midnight. That is the Watamu way.'),

  richText([
    { text: 'Sunset Lab on Friday nights', bold: true },
    { text: ' is the anchor of the Watamu scene. Located at the very end of the beach road, it has exceptional DJs often accompanied by live saxophone or drums, some of the best pizza on the coast and bohemian cushion seating with ocean views. Arrive before 6pm to get a good spot. During July and August it fills completely after 8pm.' },
  ]),

  richText([
    { text: 'Paparemo on Saturday nights', bold: true },
    { text: ' is a beach dancing institution. Afrobeats and amapiano on sand, mixed crowd of locals and tourists, free entry, no cover. The most affordable and social night out in Watamu.' },
  ]),

  richText([
    { text: 'Lichthaus', bold: true },
    { text: ' near Garoda is the perfect sundowner spot: cushions over the creek, sunset swims, a relaxed pace. Not a party venue, more of a beautiful way to start an evening.' },
  ]),

  richText([
    { text: 'Car Wash', bold: true },
    { text: ' is the genuinely local bar, open every night. African dance music, karaoke, very affordable and a real Kenyan atmosphere.' },
  ]),

  textBlock('There are two main festivals per year. The Kaleidoscope Festival, usually in March at Temple Point Resort, draws international DJs, has art installations, food trucks and legendary dhow parties. Tickets sell fast. The nightlife scene is growing steadily with more standalone events appearing throughout the year. Keep an eye on the events page for Watamu on this website where you can discover and book events directly.'),

  richText([
    { text: 'For the full Watamu nightlife guide with venue details, tips and the festival calendar: ' },
    { text: 'Watamu nightlife guide', bold: true, link: 'https://www.klickenya.com/journal/watamu-nightlife-guide' },
    { text: '.' },
  ]),

  placeholder('Sunset Lab Friday night, Watamu'),

  // ═══════════════════════════════════════════════════
  // SECTION 12: HISTORY
  // ═══════════════════════════════════════════════════
  textBlock('The History of Watamu', 'h2'),

  richText([
    { text: 'Watamu\'s name comes from the Swahili words ' },
    { text: '"watu tamu"', bold: true },
    { text: ', meaning sweet people, a reference to the warmth of the local community. It is a name the town has always lived up to.' },
  ]),

  textBlock('The Kenya coast has been a crossroads of the Indian Ocean world for over a thousand years. Arab traders arrived from the 7th century onward, establishing trading relationships with the local Giriama and Bajuni peoples. Swahili city-states grew along this coastline, prospering as intermediaries in a vast network of trade connecting Arabia, Persia, India, Southeast Asia and China with the African interior. The Swahili civilisation that emerged from this exchange was sophisticated, cosmopolitan and deeply rooted in the sea.'),

  richText([
    { text: 'The most remarkable physical evidence of this history sits just 10 km from Watamu: the ' },
    { text: 'Gede Ruins', bold: true },
    { text: ', a UNESCO World Heritage Site since 2024. Gede was a major Swahili city built from the 12th century, reaching its peak between the 14th and 16th centuries. At its height it was one of the most important trading cities on the East African coast. Chinese porcelain, Venetian beads, Indian coins and Persian ceramics have all been found here, evidence of just how far-reaching the connections of this small coastal city were. The city was gradually abandoned in the early 17th century following Portuguese disruption of the coastal trade networks and raids from the interior. Walking through the stone ruins of the palace and mosques today, surrounded by the forest that has slowly reclaimed the city, is genuinely haunting and beautiful.' },
  ]),

  textBlock('The Portuguese arrived on the Kenya coast in 1498, disrupting the Swahili trading world and ultimately contributing to its decline. The Omani Arabs then seized control of the coast in 1698, and British colonial influence arrived in the 19th century. Through all of this, the fishing communities around what is now Watamu continued their quiet life on the shore.'),

  textBlock('Watamu itself was, until relatively recently, a tiny, peaceful fishing village. The British colonial government began developing the beachfront in the 1950s, carving out plots for lease to settlers and international visitors. The Marine National Park was established in 1968, one of Africa\'s first protected marine areas, bringing early conservation-minded visitors to the area.'),

  richText([
    { text: 'The transformation of Watamu\'s character came in the 1960s when approximately 120 Italians arrived to build and operate the ' },
    { text: 'Luigi Broglio Space Centre', bold: true },
    { text: ', an Italian satellite launch facility established near Malindi. Many of these Italians never went home. They discovered a coastline of extraordinary beauty, warm water, abundant seafood and a pace of life that was simply too good to leave. Word spread back to Italy, friends and family came to visit, and over the following decades a permanent Italian community took root. Today Italians make up around 70 percent of annual visitors, children in Watamu learn Italian at primary school, and most of the hotels and restaurants along the coast are Italian-owned. It is one of the most unlikely and fascinating stories of cultural transplantation anywhere in Africa.' },
  ]),

  textBlock('Watamu has been growing slowly and steadily ever since. Some of the established hotels and private homes along the coast have been there for 60 years. The past 10 to 15 years have seen a significant acceleration in development and tourism, but the soul of the place remains intact. The beach is still beautiful, the people are still warm, and the ocean is still the centre of everything.'),

  placeholder('The Gede Ruins near Watamu, Kenya'),

  // ═══════════════════════════════════════════════════
  // SECTION 13: DEVELOPMENT AND INVESTMENT
  // ═══════════════════════════════════════════════════
  textBlock('Development and Investment Growth in Watamu', 'h2'),

  richText([
    { text: 'Watamu is growing faster than at any point in its history. The past five years in particular have seen a wave of new development: boutique hotels, luxury villa complexes, new restaurants, expanded shopping options, padel courts, gyms and wellness centres. The town that was once a quiet insider secret for Italian families is becoming an increasingly attractive destination for international investment.' },
  ]),

  textBlock('The Seven Islands area is currently the fastest growing part of Watamu, with new resort and villa developments going up steadily. New malls and supermarkets have expanded the retail options available to both visitors and residents. Infrastructure has improved: the roads are better, connectivity is stronger, and the range of services available locally has expanded significantly.'),

  richText([
    { text: 'Foreign investors, particularly from Europe, are buying land and developing properties along the coast. The combination of ' },
    { text: 'stunning natural environment, strong tourism demand, relatively affordable land prices', bold: true },
    { text: ' compared to other Indian Ocean destinations and Kenya\'s improving business environment is attracting serious interest. Watamu is increasingly spoken about as a destination with significant potential for property investment.' },
  ]),

  textBlock('At the same time, the core character of Watamu is being preserved. The Marine National Park protects the coastline. The community remains tight-knit. The pace of life, the food scene and the natural beauty that make Watamu special are all intact. The growth is making it more polished, not less authentic.'),

  textBlock('The opportunity to get here before it is fully discovered by the global travel market still exists, but it is narrowing. Every year brings more visitors, more options and more international awareness of what this stretch of coast has to offer.'),

  placeholder('New developments along the Watamu coastline'),

  // ═══════════════════════════════════════════════════
  // SECTION 14: SWAHILI PHRASES
  // ═══════════════════════════════════════════════════
  textBlock('A Few Useful Swahili Phrases', 'h2'),

  textBlock('Swahili (Kiswahili) is the national language of Kenya and is widely spoken throughout the coast. Knowing even a few words will make locals genuinely happy and will make your trip better. Kenyans appreciate the effort enormously.'),

  {
    _type: 'budgetTableBlock',
    _key: key(),
    columns: ['Swahili', 'Pronunciation', 'Meaning'],
    rows: [
      { _key: key(), label: 'Jambo', values: ['JAM-bo', 'Hello (to a stranger)'] },
      { _key: key(), label: 'Habari yako?', values: ['ha-BAR-ee YA-ko', 'How are you? (What is your news?)'] },
      { _key: key(), label: 'Nzuri', values: ['n-ZOO-ree', 'Good / Fine'] },
      { _key: key(), label: 'Asante', values: ['a-SAN-teh', 'Thank you'] },
      { _key: key(), label: 'Asante sana', values: ['a-SAN-teh SA-na', 'Thank you very much'] },
      { _key: key(), label: 'Tafadhali', values: ['ta-fad-HA-lee', 'Please'] },
      { _key: key(), label: 'Hapana', values: ['ha-PA-na', 'No'] },
      { _key: key(), label: 'Ndio', values: ['n-DEE-o', 'Yes'] },
      { _key: key(), label: 'Bei gani? / Ni ngapi?', values: ['BEY GA-nee / nee n-GA-pee', 'How much does it cost?'] },
      { _key: key(), label: 'Nataka kulipa', values: ['na-TA-ka ku-LEE-pa', 'I want to pay'] },
      { _key: key(), label: 'Pole', values: ['PO-leh', 'Sorry / Excuse me'] },
      { _key: key(), label: 'Pole pole', values: ['PO-leh PO-leh', 'Slowly / Take it easy'] },
      { _key: key(), label: 'Kwaheri', values: ['kwa-HEH-ree', 'Goodbye'] },
      { _key: key(), label: 'Siku njema', values: ['SEE-ku n-JEH-ma', 'Have a good day'] },
      { _key: key(), label: 'Karibu', values: ['ka-REE-bu', 'Welcome / You are welcome'] },
      { _key: key(), label: 'Hakuna matata', values: ['ha-KU-na ma-TA-ta', 'No problem / No worries'] },
    ],
    totalRow: [],
  },

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🗣️',
    label: 'Pole pole',
    text: '"Pole pole" (slowly slowly) is more than just a phrase in Watamu. It is a philosophy. Do not rush. The best things in Watamu happen when you slow down.',
  },

  // ═══════════════════════════════════════════════════
  // SECTION 15: UNIQUE THINGS ABOUT WATAMU
  // ═══════════════════════════════════════════════════
  textBlock('Unique Things About Watamu', 'h2'),

  richText([
    { text: 'Beach and elephants on the same day: ', bold: true },
    { text: 'Watamu is one of very few places in the world where you can spend the morning snorkelling over coral reef, eat lunch on the beach, and watch wild elephants at sunset. Arabuko Sokoke Forest is 10 minutes from the beach and around 200 forest elephants live there. This combination does not exist almost anywhere else.' },
  ]),

  richText([
    { text: 'A kite spot with everything: ', bold: true },
    { text: 'Most world-class kitesurfing destinations are remote and isolated. Watamu is the exception. You can kite all day in perfect lagoon conditions and then walk to a good Italian restaurant, go to a beach party in the evening and stay somewhere beautiful. It is Zanzibar before the tourist boom, with better food.' },
  ]),

  richText([
    { text: 'Italian space scientists who never went home: ', bold: true },
    { text: 'The reason Watamu has the best food on the Kenya coast is one of the most unlikely stories in African tourism. Italian rocket scientists arrived in the 1960s to launch satellites and stayed forever. Their community shaped the entire character of the town.' },
  ]),

  richText([
    { text: 'A UNESCO World Heritage Site next door: ', bold: true },
    { text: 'The Gede Ruins, 10 km away, are one of the most remarkable archaeological sites in East Africa. A medieval Swahili city abandoned in the 17th century, now being slowly reclaimed by forest. Almost nobody knows it exists.' },
  ]),

  richText([
    { text: 'The vibe: ', bold: true },
    { text: 'There is something about Watamu that is genuinely hard to quantify. An easygoing, peaceful, unhurried energy that you absorb simply by being there. People who come for five days stay for ten. People who come for a holiday start looking at villas to buy. It gets into you.' },
  ]),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'There is a moment in Watamu, usually around the third day, when you stop checking your phone and start checking the tides. That is when the place gets you.',
    attribution: 'Written by the Klickenya team, locals and long-term residents of Watamu',
    accentColor: 'teal',
  },

  // ═══════════════════════════════════════════════════
  // SECTION 16: FAQ
  // ═══════════════════════════════════════════════════
  textBlock('Frequently Asked Questions About Watamu', 'h2'),

  textBlock('Is Watamu safe?', 'h3'),
  textBlock('Yes. Watamu is one of the safest beach destinations in Kenya. The tourism police have a visible presence and the community is welcoming to visitors. Standard precautions apply: do not walk alone on unlit beaches after dark, keep valuables out of sight and use a tuk-tuk for night journeys. Violent crime targeting tourists is very rare.'),

  textBlock('How many days do I need in Watamu?', 'h3'),
  textBlock('Most visitors enjoy 5 to 7 days. This gives you enough time to explore all the different areas, do a marine park trip, visit Mida Creek, see the elephants and still have proper beach days. If you are combining with a Tsavo East safari, add 2 to 3 days for that.'),

  textBlock('Do I need a visa for Kenya?', 'h3'),
  textBlock('Most nationalities require a visa to enter Kenya. Kenya introduced an Electronic Travel Authorisation (ETA) system in 2023. Apply online before you travel at the official Kenya ETA portal. The fee is USD 30. Check requirements for your specific nationality as rules change.'),

  textBlock('What language do people speak in Watamu?', 'h3'),
  textBlock('Swahili and English are both official languages of Kenya and almost everyone speaks English. Along the coast Italian is also widely spoken due to the large Italian community. You will have no language difficulties in Watamu.'),

  textBlock('What currency should I bring?', 'h3'),
  textBlock('Kenya Shillings (KSh) are the currency. Bring USD or EUR to exchange on arrival. USD is the most widely accepted foreign currency. Bring clean, post-2013 USD notes only. Older or damaged notes will be refused. There are three ATMs in Watamu town.'),

  textBlock('Can I drink the tap water?', 'h3'),
  textBlock('Do not drink tap water in Watamu. Use bottled water, which is widely available and very cheap. Most accommodation provides it. You can brush your teeth with tap water.'),

  textBlock('When does Watamu close?', 'h3'),
  textBlock('Many restaurants and accommodations close during April, May and June (the long rains season). Watamu effectively reopens from the beginning of July. If you are travelling during these months, check in advance that your specific accommodation and preferred restaurants will be open.'),

  textBlock('Is Watamu good for families?', 'h3'),
  textBlock('Excellent for families. The calm lagoons are safe for children, the marine park is fascinating for all ages, the turtle watching is magical for kids, and the range of family-friendly accommodation is wide. The local community is friendly and welcoming toward children.'),

  textBlock('Is there good Wi-Fi and mobile data in Watamu?', 'h3'),
  textBlock('Safaricom 4G coverage is good across Watamu. A data bundle from a local SIM is the most reliable option: 5GB costs around KSh 500. Hotel Wi-Fi varies significantly. For remote work, a local SIM with a good data plan is more reliable than depending on hotel broadband.'),

  textBlock('How do I get from Nairobi to Watamu?', 'h3'),
  richText([
    { text: 'The best option is a domestic flight from Nairobi to Malindi Airport (45 minutes) followed by a 30-minute taxi to Watamu. Fly to Malindi, not Mombasa. See our full ' },
    { text: 'transport guide for Watamu', bold: true, link: 'https://www.klickenya.com/journal/watamu-transport-guide' },
    { text: ' for all options.' },
  ]),

  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Our verdict',
    title: 'Watamu: Kenya\'s most complete and beautiful beach destination',
    pros: [
      'World-class marine park with turtles, dolphins and extraordinary coral',
      'Some of the most beautiful beaches and sandbanks in the world',
      'Best food scene on the Kenya coast with genuine Italian influence',
      'The most beautiful private villas in Kenya at great value',
      'Kenya\'s best kitesurfing conditions June to October',
      'Elephants 10 minutes from the beach in Arabuko Sokoke Forest',
      'Easy access to Tsavo East National Park for coast and safari',
      'Warm, friendly local community and a genuinely special vibe',
      'Most developed tourist infrastructure of all Kenya coast destinations',
    ],
    cons: [
      'Most tourist-oriented town on the coast, more beach vendors than quieter alternatives',
      'Prices slightly higher than Kilifi or Diani for comparable quality',
      'Many places close April to June, book carefully around this period',
      'Best villas and hotels book up far in advance during December to January',
    ],
  },
]

// ══════════════════════════════════════════════════════
// SEED
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('Seeding complete guide to Watamu 2026...')

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
    focusKeyword: 'complete guide watamu kenya 2026',
    seoTitle: 'The Complete Guide to Watamu, Kenya 2026 — Everything You Need',
    seoDescription: 'Written by locals with roots in Watamu. The only guide you need: beaches, food, where to stay, what to do, seasons, transport, money, history and much more.',
    excerpt: 'Everything you could possibly need to know about Watamu in one place. Written by people who have lived there and still have roots there. Real, personal, accurate and up to date.',
    readingTime: 22,
    publishedAt: '2026-04-08T08:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Watamu', 'Beach', 'Coast', 'Kenya', 'Travel Guide', 'Complete Guide'],
    body,
  })

  console.log('Done. Complete guide to Watamu seeded.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

