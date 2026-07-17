/**
 * Seed the "17 Best Restaurants in Watamu 2026" blog post.
 *
 * Run locally (needs the Sanity WRITE token):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-best-restaurants-watamu.ts
 *
 * Idempotent: uses createOrReplace with a fixed _id, so re-running updates in place.
 * Route once published: /journal/best-restaurants-watamu-kenya
 *
 * Writing rules followed (from the source brief): no dashes in prose, the word
 * "refined" is avoided, every link is a real working URL (listing pages and journal
 * posts that exist), and each of the 17 places embeds its real listing card where one
 * exists (14 of 17) so the card photo becomes the section image; the remaining three
 * get a gradient placeholder.
 */
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

const AUTHOR_ID = '0a5287ef-f74d-4893-a487-6b672cb63477' // existing "KlicKenya" author
const POST_ID = 'blog-best-restaurants-watamu'

function key() {
  return Math.random().toString(36).slice(2, 12)
}

function block(text: string, style = 'normal'): any {
  return {
    _type: 'block',
    _key: key(),
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }
}

// Rich paragraph supporting bold + links. Pass an array of { text, bold?, link? }.
function rich(parts: Array<{ text: string; bold?: boolean; link?: string }>): any {
  const markDefs: any[] = []
  const children = parts.map((p) => {
    const marks: string[] = []
    if (p.bold) marks.push('strong')
    if (p.link) {
      const k = key()
      markDefs.push({ _type: 'link', _key: k, href: p.link })
      marks.push(k)
    }
    return { _type: 'span', _key: key(), text: p.text, marks }
  })
  return { _type: 'block', _key: key(), style: 'normal', markDefs, children }
}

function bullets(items: string[]): any[] {
  return items.map((t) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text: t, marks: [] }],
  }))
}

function quickFacts(items: Array<{ icon: string; label: string; value: string }>, accentColor = 'teal', title?: string): any {
  return {
    _type: 'quickFactsBlock',
    _key: key(),
    ...(title ? { title } : {}),
    accentColor,
    items: items.map((i) => ({ _type: 'object', _key: key(), ...i })),
  }
}

function tip(text: string, label = 'Klickenya tip', variant = 'teal', icon = '📍'): any {
  return { _type: 'tipCardBlock', _key: key(), variant, icon, label, text }
}

function listingCard(refId: string, label?: string): any {
  return {
    _type: 'inlineListingBlock',
    _key: key(),
    ...(label ? { label } : {}),
    listing: { _type: 'reference', _ref: refId },
  }
}

function placeholder(caption?: string): any {
  return {
    _type: 'photoRowBlock',
    _key: key(),
    layout: 'hero-full',
    photos: [{ _type: 'image', _key: key(), alt: caption ?? 'Watamu, Kenya', aspectRatio: 'wide' }],
    ...(caption ? { caption } : {}),
  }
}

function whoIsItFor(title: string, items: Array<{ icon: string; text: string }>): any {
  return {
    _type: 'whoIsItForBlock',
    _key: key(),
    title,
    items: items.map((i) => ({ _type: 'object', _key: key(), ...i })),
  }
}

function budgetTable(columns: string[], rows: Array<{ label: string; values: string[] }>): any {
  return {
    _type: 'budgetTableBlock',
    _key: key(),
    columns,
    rows: rows.map((r) => ({ _type: 'object', _key: key(), label: r.label, values: r.values })),
  }
}

function pullQuote(text: string, accentColor = 'teal', attribution?: string): any {
  return { _type: 'pullQuoteBlock', _key: key(), text, accentColor, ...(attribution ? { attribution } : {}) }
}

type Restaurant = {
  n: number
  name: string
  listingId: string | null
  facts: { cuisine: string; price: string; vibe: string; location: string }
  paras: any[] // pre-built blocks
  order: string[]
  tipText: string
}

const RESTAURANTS: Restaurant[] = [
  {
    n: 1,
    name: 'Mannis at Palm Garden',
    listingId: '2riX1AdO9O53izfAmrTWVS',
    facts: { cuisine: 'Fine dining, Italian, seafood', price: 'Higher end', vibe: 'Romantic and elegant', location: 'Palm Garden Boutique Hotel' },
    paras: [
      block("Mannis is one of Watamu's strongest choices when you want dinner to feel like an occasion. Set inside the pretty Palm Garden Boutique Hotel, it offers an elegant side of the coast, with tropical gardens, intimate seating, soft lighting and an atmosphere that really comes alive after dark."),
      block('This is not a place for a rushed meal. Mannis rewards taking your time: a cocktail before dinner, a bottle of wine with the table, a carefully prepared main, and maybe a cigar afterwards if that is your kind of evening. The wine and liquor selection is a genuine part of the experience, which makes it a favourite for anyone who loves a good drink alongside good food. The cooking leans Italian, with fresh seafood, premium cuts, house made pasta, risottos, carpaccio, grilled fish and lobster when it is available. It stays elegant without ever feeling stiff.'),
    ],
    order: ['House made pasta', 'Truffle risotto', 'Fresh seafood', 'Carpaccio', 'Grilled octopus', 'Premium meat cuts', 'Cocktails and wine'],
    tipText: 'Go in the evening. Start with a cocktail, take your time over dinner, and enjoy the garden once it is lit up after dark.',
  },
  {
    n: 2,
    name: 'Kobe Suite Resort Restaurant',
    listingId: 'U1j2mvjVVumuzihYzAnijQ',
    facts: { cuisine: 'International, coastal', price: 'Mid to high', vibe: 'Calm and elegant', location: 'Garoda, Watamu' },
    paras: [
      block('Kobe Suite Resort Restaurant is a lovely choice when you want a calmer, more polished meal. Set inside Kobe Suite Resort on the Garoda side of Watamu, it has a quiet atmosphere, attentive service and a coastal setting that feels elegant and considered.'),
      block('The food is international with a coastal influence, so it suits travellers who want quality and comfort in a relaxed resort setting. It is especially good for couples, hotel guests, long lunches and quiet dinners away from the busier beach bar scene. Kobe is not trying to be the loudest place in town, and that is exactly its strength.'),
    ],
    order: ['Fresh seafood', 'International mains', 'Light lunch dishes', 'Desserts', 'Wine or cocktails'],
    tipText: 'Choose Kobe when you want quiet, quality and a peaceful coastal setting.',
  },
  {
    n: 3,
    name: 'Sunset Lab',
    listingId: '8004da69-d432-47a1-beb8-968a6fb19b88',
    facts: { cuisine: 'Italian, pizza', price: 'Mid to high', vibe: 'Trendy and beachy', location: 'Watamu beachfront' },
    paras: [
      block('Sunset Lab has built a reputation for some of the best pizza in Watamu. It is stylish, social and beachy, and it works just as well for sundowners and music as it does for dinner with friends.'),
      rich([
        { text: 'The pizza is the reason people talk about it: a crisp base, generous toppings and proper wood fired flavour, exactly the food that makes sense after a day in the sun. It is not the cheapest pizza in town, but it is one of the most enjoyable. The beach club energy is a big part of the appeal, so come for pizza and stay for drinks and the easy buzz of ' },
        { text: 'Watamu at night', link: '/journal/watamu-nightlife-guide' },
        { text: '.' },
      ]),
    ],
    order: ['Wood fired pizza', 'Seafood pizza', 'Burrata and Italian starters', 'Cocktails', 'Anything good for sharing'],
    tipText: 'Go for sunset and stay into the evening. It gets better as the atmosphere builds.',
  },
  {
    n: 4,
    name: 'Papa Remo Beach',
    listingId: 'U1j2mvjVVumuzihYzAnj2a',
    facts: { cuisine: 'Italian, Mediterranean, seafood', price: 'Mid to high', vibe: 'Beachfront and social', location: 'On the beach, Watamu' },
    paras: [
      block("Papa Remo is one of Watamu's classic beachfront restaurants. Set right on the sand, it gives you exactly what people picture when they imagine a beach lunch here: ocean breeze, white sand, palms, sunbeds, cocktails and a view that does half the work before the food even arrives."),
      block('The menu leans Italian and Mediterranean, with pasta, seafood, pizzas, salads and grilled dishes. It works for lunch, sundowners, dinner, date nights and beach days that turn into long afternoons. It is also very social, drawing both visitors and locals, so the mood can be relaxed, romantic or lively depending on the day.'),
    ],
    order: ['Grilled seafood', 'Fresh pasta', 'Pizza', 'Mediterranean salads', 'Aperol spritz', 'Cocktails'],
    tipText: 'Book ahead in busy periods, especially for a beachfront table or a weekend evening.',
  },
  {
    n: 5,
    name: 'Pilipan Restaurant',
    listingId: 'p46JrFJh0r829BEcOH9ATJ',
    facts: { cuisine: 'International, Indian, seafood', price: 'Mid', vibe: 'Creek views and cocktails', location: 'Mida Creek side, Watamu' },
    paras: [
      block("Pilipan is one of those Watamu spots that shines when you want cocktails, creek views and an easygoing evening. Set near the Mida Creek side of town, it has a relaxed atmosphere and a mixed international menu, which makes a nice change from the Italian heavy options elsewhere."),
      block('The cocktails are a big part of the appeal. Come for a drink, stay for the view, and order from a menu that runs from seafood and Indian flavours to easy international mains. That variety also makes it a strong choice for groups, since there is something for most tastes.'),
    ],
    order: ['Cocktails', 'Curries', 'Seafood', 'Salads', 'International mains', 'Ice cream or dessert'],
    tipText: 'Go for cocktails first, then decide whether to stay on for dinner. It is a great sundowner option.',
  },
  {
    n: 6,
    name: 'Ocean Sports',
    listingId: 'U1j2mvjVVumuzihYzAniGg',
    facts: { cuisine: 'Seafood, sushi, pizza, pub classics', price: 'Mid', vibe: 'Classic Watamu, family friendly', location: 'Beachfront, Watamu' },
    paras: [
      block('Ocean Sports is a true Watamu classic. One of the oldest and best loved spots in town, it has been part of local life for decades and still feels like a place you can always count on.'),
      block("The setting is a big part of the charm: breezy ocean views, spacious seating, cold drinks and a beachfront mood that suits families, groups, locals and long lunches that drift into sundowners. The menu is more varied than many of the Italian focused places, so you can order sushi, fresh fish, seafood, pub classics, salads and their famous rectangle pizzas. Ocean Sports also has deep roots in Watamu's sport fishing culture, and some of the staff have worked here for decades."),
    ],
    order: ['Sushi', 'Fresh fish', 'Seafood', 'Rectangle pizza', 'Fish and chips', 'Ice cold drinks'],
    tipText: 'Go for lunch, sushi, fresh fish or a casual drink by the ocean. It is hard to go wrong here.',
  },
  {
    n: 7,
    name: 'Swahili Café and Seafood Café',
    listingId: '699VaYbJEdO6JdJU59YS9c',
    facts: { cuisine: 'Kenyan, Swahili, local', price: 'Budget', vibe: 'Authentic and simple', location: 'Timboni, Watamu' },
    paras: [
      block('If you want real local food in Watamu, do not skip Swahili Café or Seafood Café. These are not polished beachfront restaurants, and that is exactly the point. They are simple, affordable and full of flavour.'),
      block('This is where you go for Kenyan home style cooking: beef stew, chapati, ugali, coconut rice, samaki wa kupaka, beans, pilau and proper Swahili coastal flavours. It is food you should try at least once, especially if you want to understand the local side of Watamu beyond the beach bars and Italian kitchens.'),
    ],
    order: ['Beef stew', 'Chapati', 'Ugali', 'Coconut rice', 'Samaki wa kupaka', 'Pilau', 'Local fish'],
    tipText: 'Go for lunch. Local spots are usually best earlier in the day, when the food is fresh and the place is busy.',
  },
  {
    n: 8,
    name: 'Kokomo',
    listingId: '4hnJIDJZ69IFLrlyxWLluF',
    facts: { cuisine: 'Lebanese, Mediterranean', price: 'Mid', vibe: 'Colourful and laid back', location: 'Mapambo Bay, Watamu' },
    paras: [
      block('Kokomo is a great choice when you want a change from the usual Italian and seafood menus. It brings Lebanese and Mediterranean flavours to Watamu, with fresh, colourful dishes that are made for sharing.'),
      block('Expect hummus, tabbouleh, grilled meats, mezze plates, salads, dips and cocktails in a relaxed beach setting. It works especially well for groups, because the food is easy to share and it gives you a break from heavier beach meals.'),
    ],
    order: ['Hummus', 'Tabbouleh', 'Grilled meats', 'Mezze plates', 'Fresh salads', 'Cocktails'],
    tipText: 'Go with a group and order several plates to share. Mezze is best when the table is full.',
  },
  {
    n: 9,
    name: 'The Cave Watamu',
    listingId: 'tQCrbgePRAC9whbqJi8AW1',
    facts: { cuisine: 'Seafood, coastal, cocktails', price: 'Mid to high', vibe: 'New, atmospheric, dinner focused', location: 'Watamu' },
    paras: [
      block('The Cave is one of the newest restaurants in Watamu, and it became popular almost immediately. It brings something different to the local scene: a dramatic cave inspired setting, warm lighting, seafood, cocktails and a dinner atmosphere that feels more designed than most casual coastal spots.'),
      block('This is a good choice when you want more than just a meal. The setting makes it feel like a proper evening out, whether that is a date night, a birthday dinner or cocktails with friends. Expect coastal plates, seafood, starters, mains, wine and cocktails in a memorable space.'),
    ],
    order: ['Seafood', 'Starters to share', 'Cocktails', 'Wine', 'Coastal mains'],
    tipText: 'Book ahead, especially for dinner. This is one of the newer places everyone is trying right now.',
  },
  {
    n: 10,
    name: 'Tamu Beach Bar and Restaurant',
    listingId: '2riX1AdO9O53izfAmrVDhx',
    facts: { cuisine: 'Seafood, Italian, beach bar', price: 'Mid to high', vibe: 'Beachfront and relaxed', location: 'Beachfront, Watamu' },
    paras: [
      block('Tamu is a pretty beachfront spot for slow lunches, seafood, cocktails and long beach days. It has that easy Watamu feeling: ocean views, sea breeze, relaxed seating and a menu that works whether you want something light or a full meal by the water.'),
      block('It is a great choice when you want to spend the day near the beach without overthinking it. Come for lunch, stay for drinks, order seafood, share a pizza, or settle in for a relaxed afternoon with the sound of the ocean behind you. The mixed menu of seafood, pizzas, salads, coastal plates and beach bar favourites keeps most groups happy.'),
    ],
    order: ['Fresh seafood', 'Pizza', 'Salads', 'Cocktails', 'Grilled dishes'],
    tipText: 'Tamu is best in the daytime. Go when you want a proper beach lunch with a view, not a quick bite.',
  },
  {
    n: 11,
    name: 'Crab Shack Dabaso',
    listingId: '76y5EjmeLusgbergeavVGU',
    facts: { cuisine: 'Seafood, coastal, local', price: 'Mid', vibe: 'Mangroves, sunset, community run', location: 'Mida Creek, Dabaso' },
    paras: [
      block('Crab Shack Dabaso is one of the most special food experiences in Watamu, because it is about far more than the meal. Set among the mangroves of Mida Creek, this community run restaurant supports local conservation while serving some of the freshest seafood in the area.'),
      block('The journey is part of the fun. You walk out along a wooden boardwalk through the mangroves before reaching a rustic creekside restaurant with wide views across the water. Come in the late afternoon and you get the full magic: birdlife in the mangroves, the creek glowing at sunset, and the kind of quiet natural beauty that makes Watamu feel unique. The food is exactly right for the setting: fresh crab, prawns, grilled fish, seafood platters and their famous crab samosas. You can even add a short local canoe ride through the creek.'),
    ],
    order: ['Crab samosas', 'Seafood platter', 'Fresh crab', 'Grilled prawns', 'Fresh fish', 'Cold drinks'],
    tipText: 'Go in the late afternoon. Take a small canoe ride through the mangroves, then stay for seafood and sunset.',
  },
  {
    n: 12,
    name: 'Kibo Restaurant',
    listingId: null,
    facts: { cuisine: 'Seafood, coastal grill', price: 'Mid', vibe: 'Casual and beachfront', location: 'Beachfront, Watamu' },
    paras: [
      block('Kibo is a great choice when you want seafood, beach views and a slow coastal lunch. It has a casual, easygoing feel, the kind of place where you can sit back, order early and enjoy the beach while your food is prepared.'),
      block('The standout dishes are coastal classics: coconut octopus, grilled prawns, seafood platters and fresh fish. It is not trying to be polished. The appeal is the mix of fresh seafood, a beach setting and a relaxed Watamu pace.'),
    ],
    order: ['Coconut octopus', 'Seafood platter', 'Grilled prawns', 'Fresh fish', 'Coconut rice'],
    tipText: 'Order early and do not rush. This is a place for a slow lunch, not a quick bite.',
  },
  {
    n: 13,
    name: 'Visiwa Restaurant',
    listingId: '2riX1AdO9O53izfAmrVDXx',
    facts: { cuisine: 'Italian, fusion, seafood', price: 'Mid to high', vibe: 'Beach holiday and scenic', location: 'Beachfront, Watamu' },
    paras: [
      block('Visiwa is a lovely beachfront restaurant with a relaxed holiday feel. It is a good option when you want to spend the day by the sea, eat with an ocean view and keep things simple.'),
      block('The menu covers Italian and fusion dishes, seafood, pastas and casual coastal plates. The setting is the main draw: open, sunny and beach facing, perfect for a long lunch between swims.'),
    ],
    order: ['Fresh pasta', 'Seafood', 'Fusion plates', 'Grilled fish', 'Light lunch dishes'],
    tipText: 'Go during the day. This is a lunch and beach kind of place.',
  },
  {
    n: 14,
    name: 'Prawns Lake',
    listingId: 'iJgiUhONiBHOkL1EYKzdpk',
    facts: { cuisine: 'Seafood, coastal', price: 'Budget to mid', vibe: 'Peaceful and creekside', location: 'Mida Creek mangroves, Watamu' },
    paras: [
      block("Prawns Lake is one of Watamu's quieter and more atmospheric spots. Set on a boardwalk among the mangroves, above the water, it has a completely different feel from the beachfront restaurants."),
      block('This is a place for peace, sunset, creek views and simple seafood. It is not fancy, but it is beautiful in a very natural way. Come for grilled prawns, fish, a cold drink, or simply the view. There is also the option to kayak, which turns a meal into a proper little outing.'),
    ],
    order: ['Grilled prawns', 'Fish fillet', 'Coconut rice', 'Cold drinks', 'Simple seafood plates'],
    tipText: 'Go for a late lunch or early dinner. It closes early, so do not leave it too late.',
  },
  {
    n: 15,
    name: 'LichtHaus',
    listingId: '4hnJIDJZ69IFLrlyxWLmYd',
    facts: { cuisine: 'BBQ, light bites, drinks', price: 'Mid to high', vibe: 'Bohemian, creekside, sunset', location: 'Mida Creek, Temple Point' },
    paras: [
      block('LichtHaus is less a traditional restaurant and more a Watamu sunset ritual. Set over Mida Creek at Temple Point, it is known for its floating nets, craft cocktails, BBQ, music and one of the most recognisable sunset views in the whole town.'),
      rich([
        { text: 'This is the place you go when the setting matters as much as the food. The mood is relaxed, bohemian and social, with people arriving for golden hour, cocktails, photos on the nets and long afternoons that roll into evening drinks. The food is casual, but the view is the main event. For more ideas on where to catch the light, see our ' },
        { text: 'Watamu sunset spots guide', link: '/journal/watamu-sunset-spots-guide' },
        { text: '.' },
      ]),
    ],
    order: ['Cocktails', 'BBQ plates', 'Light bites', 'Cold drinks', 'Sunset snacks'],
    tipText: 'Reserve for sunset. The nets are the main experience, and they fill up quickly in busy periods.',
  },
  {
    n: 16,
    name: "Theo's Pizza",
    listingId: null,
    facts: { cuisine: 'Pizza, Italian deli, takeaway', price: 'Budget to mid', vibe: 'Casual and quick', location: 'Watamu' },
    paras: [
      block("Theo's Pizza is perfect when you do not want a full restaurant meal but still want something good. It is a casual slice and takeaway spot, ideal for a quick bite, a beach day snack or an easy dinner."),
      block("Not every meal in Watamu needs to be a long seafood lunch or a candlelit dinner. Sometimes you just want a slice of pizza, something salty and no fuss. Theo's is exactly that."),
    ],
    order: ['Pizza by the slice', 'Takeaway pizza', 'Fried bites', 'Cold drinks'],
    tipText: "Add Theo's to your list for takeaway or a quick casual bite rather than a full sit down dinner.",
  },
  {
    n: 17,
    name: 'Uncle Sammy Roadside BBQ',
    listingId: null,
    facts: { cuisine: 'Kenyan BBQ, street food', price: 'Budget', vibe: 'Street style and smoky', location: 'Roadside, Watamu' },
    paras: [
      block("Keep an eye out for Uncle Sammy's BBQ stand, and for the other roadside BBQ chicken spots around Watamu. You will usually smell them before you see them."),
      block('This is not a polished restaurant experience, and it is not meant to be. It is smoky grilled chicken, chapati, chips, kachumbari and that simple roadside flavour that often turns out to be one of the most memorable meals of the trip. For a cheap, filling, casual local meal, this is the food to try.'),
    ],
    order: ['Grilled chicken', 'Chapati', 'Chips', 'Kachumbari', 'BBQ sauce'],
    tipText: 'Best for a quick casual dinner or a late snack. Bring cash or M-Pesa.',
  },
]

function restaurantBlocks(r: Restaurant): any[] {
  const out: any[] = []
  out.push(block(`${r.n}. ${r.name}`, 'h2'))
  out.push(
    quickFacts(
      [
        { icon: '🍴', label: 'Cuisine', value: r.facts.cuisine },
        { icon: '💰', label: 'Price', value: r.facts.price },
        { icon: '✨', label: 'Vibe', value: r.facts.vibe },
        { icon: '📍', label: 'Location', value: r.facts.location },
      ],
      r.n % 2 === 0 ? 'amber' : 'teal',
    ),
  )
  out.push(...r.paras)
  out.push(block('What to order', 'h3'))
  out.push(...bullets(r.order))
  // Real listing card (its photo becomes the section image) or a gradient placeholder.
  if (r.listingId) {
    out.push(listingCard(r.listingId, `See ${r.name} on Klickenya`))
  } else {
    out.push(placeholder(`${r.name}, Watamu`))
  }
  out.push(tip(r.tipText))
  return out
}

const body: any[] = [
  // ── Intro ────────────────────────────────────────────────
  rich([
    { text: "Watamu is not just a tropical paradise of white sand and coral fringed marine parks. It is also one of Kenya's most exciting food destinations. For such a small town the scene is surprisingly strong: fresh seafood straight from the Indian Ocean, proper Italian restaurants, relaxed beach bars, Swahili cafés, creekside sunset spots, sushi, pizza, gelato, cocktails and smoky roadside BBQ, with some genuinely beautiful places to sit and eat by the water. If you are still deciding on the trip itself, here is " },
    { text: 'why Watamu is worth visiting', link: '/journal/why-visit-watamu-kenya' },
    { text: '.' },
  ]),
  block('We know the local scene well, and after countless meals, long conversations and very full afternoons testing menus, we have put together our honest list of the 17 best restaurants in Watamu for 2026. These picks cover every budget and every mood, from casual street eats to elegant dinners. If you are hungry in Watamu, this is the guide to trust.'),
  rich([
    { text: 'This is not a generic list of every restaurant in town. It is our honest guide to the places we would actually recommend when someone asks where they should eat in Watamu. Some are elegant and romantic, some are simple and local, some are best for seafood, some for sunset, and some are where you go when you just want a cold drink, a pizza slice or a proper plate of Kenyan food. If you are planning the wider trip, our ' },
    { text: 'complete guide to Watamu', link: '/journal/complete-guide-watamu-kenya-2026' },
    { text: ' covers everything else.' },
  ]),
  quickFacts(
    [
      { icon: '🍕', label: 'Best pizza', value: 'Sunset Lab' },
      { icon: '✨', label: 'Best elegant dinner', value: 'Mannis at Palm Garden' },
      { icon: '🏖️', label: 'Best beachfront', value: 'Papa Remo' },
      { icon: '🦀', label: 'Best seafood', value: 'Crab Shack Dabaso' },
      { icon: '🍛', label: 'Best Kenyan food', value: 'Swahili Café' },
    ],
    'amber',
    'Watamu dining at a glance',
  ),
  placeholder('The best places to eat in Watamu, from beachfront tables to creekside sunsets'),

  // ── The 17 restaurants ───────────────────────────────────
  ...RESTAURANTS.flatMap(restaurantBlocks),

  // ── Which restaurant is right for you ────────────────────
  block('Which Watamu restaurant is right for you?', 'h2'),
  whoIsItFor('Find your Watamu table', [
    { icon: '💍', text: 'A special dinner: Mannis at Palm Garden or Kobe Suite Resort' },
    { icon: '🏖️', text: 'Beachfront lunch: Papa Remo, Tamu, Kibo, Visiwa or Ocean Sports' },
    { icon: '🦐', text: 'Seafood: Crab Shack Dabaso, Kibo, Ocean Sports, Prawns Lake, Papa Remo or Tamu' },
    { icon: '🌅', text: 'Sunset: LichtHaus, Crab Shack, Prawns Lake, Pilipan or Sunset Lab' },
    { icon: '🍹', text: 'Cocktails: Pilipan, Mannis, The Cave, LichtHaus or Papa Remo' },
    { icon: '🍕', text: "Pizza: Sunset Lab, the rectangle pizza at Ocean Sports, or Theo's for a quick slice" },
    { icon: '🍛', text: 'Local Kenyan food: Swahili Café, Seafood Café or roadside BBQ' },
    { icon: '👨‍👩‍👧', text: 'Family friendly: Ocean Sports, Papa Remo, Tamu, Kibo or Kobe' },
    { icon: '🌶️', text: 'Something different: Kokomo for Lebanese, The Cave for a new dinner, or Crab Shack for mangroves and community' },
  ]),
  placeholder('Watamu has a table for every mood, budget and time of day'),

  // ── Budget ───────────────────────────────────────────────
  block('What to budget for eating out in Watamu', 'h2'),
  rich([
    { text: 'Watamu has food for every budget, but prices vary a lot depending on where you go. For a quick sense of cash, cards and M-Pesa on the coast, see our ' },
    { text: 'Watamu money and ATM guide', link: '/journal/money-exchange-atm-watamu-guide' },
    { text: '.' },
  ]),
  budgetTable(
    ['Budget level', 'Per person', 'Where to eat'],
    [
      { label: 'Budget', values: ['KSh 300 to 1,000', "Swahili Café, Seafood Café, Uncle Sammy BBQ, Theo's Pizza"] },
      { label: 'Mid range', values: ['KSh 1,500 to 3,500', 'Ocean Sports, Kibo, Tamu, Prawns Lake, Pilipan, Kokomo, Visiwa'] },
      { label: 'Higher end', values: ['KSh 4,000 to 8,000 and up', 'Mannis, Kobe, Papa Remo, The Cave, LichtHaus with drinks'] },
    ],
  ),

  // ── Final verdict ────────────────────────────────────────
  block('Final verdict: where should you eat in Watamu?', 'h2'),
  block('If you are visiting Watamu, do not eat in only one kind of place. The best way to experience the food scene is to mix it up.'),
  block("Have an elegant evening at Mannis. Book a calm resort dinner at Kobe. Eat pizza and soak up the atmosphere at Sunset Lab. Spend a classic beach afternoon at Papa Remo. Go for cocktails at Pilipan. Have sushi or fresh fish at Ocean Sports. Try local food at Swahili Café. Visit Kokomo for Lebanese flavours. Book The Cave for a newer, atmospheric dinner. Spend a relaxed beach day at Tamu. Go to Crab Shack Dabaso for seafood, mangroves and sunset. Then, depending on your mood, add Kibo, Visiwa, Prawns Lake, LichtHaus, Theo's Pizza or a proper roadside BBQ."),
  pullQuote('It is seafood, Italian food, Swahili cooking, beach bars, cocktails, creek views and casual roadside meals, all in one small coastal town. For a place this relaxed, Watamu eats very, very well.', 'teal'),
  rich([
    { text: 'Ready to plan your meals? Browse and book Watamu spots on ' },
    { text: 'Klickenya', link: '/experiences/watamu' },
    { text: ', and time your evening with our ' },
    { text: 'Watamu sunset spots guide', link: '/journal/watamu-sunset-spots-guide' },
    { text: '.' },
  ]),
]

// Simple SVG gradient cover so the post can publish (status published needs a coverImage).
const COVER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0e7490"/>
      <stop offset="0.55" stop-color="#0891b2"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="80" y="300" font-family="Georgia, serif" font-size="66" font-weight="700" fill="#ffffff">17 Best Restaurants</text>
  <text x="80" y="372" font-family="Georgia, serif" font-size="66" font-weight="700" fill="#ffffff">in Watamu</text>
  <text x="82" y="440" font-family="Arial, sans-serif" font-size="30" fill="#ecfeff">Seafood, Italian, Swahili food, pizza and sunset spots, 2026</text>
</svg>`

async function main() {
  console.log('📝 Seeding blog post: 17 Best Restaurants in Watamu 2026\n')

  console.log('  Uploading cover image...')
  const coverAsset = await client.assets.upload('image', Buffer.from(COVER_SVG), {
    filename: 'best-restaurants-watamu-cover.svg',
    contentType: 'image/svg+xml',
  })
  console.log(`    ✅ ${coverAsset._id}`)

  const doc = {
    _id: POST_ID,
    _type: 'blogPost',
    title: '17 Best Restaurants in Watamu (2026): Seafood, Italian, Swahili Food, Pizza and Sunset Spots',
    slug: { _type: 'slug', current: 'best-restaurants-watamu-kenya' },
    status: 'published',
    author: { _type: 'reference', _ref: AUTHOR_ID },
    primaryCategory: 'food_restaurants',
    postType: 'listicle',
    location: 'watamu',
    series: 'Watamu Food and Drink',
    focusKeyword: 'best restaurants in watamu',
    seoTitle: '17 Best Restaurants in Watamu 2026: Seafood, Italian & Pizza',
    seoDescription:
      'The honest local guide to the best restaurants in Watamu: seafood, Italian food, Swahili dishes, pizza, cafés, cocktails, beach bars and sunset spots.',
    excerpt:
      'The honest local guide to the best restaurants in Watamu for 2026: fresh seafood, proper Italian, Swahili home cooking, wood fired pizza, beach bars, creekside sunset spots and roadside BBQ, across every budget.',
    readingTime: 15,
    publishedAt: '2026-07-17T08:00:00Z',
    keywords: [
      'best restaurants in watamu',
      'watamu restaurants',
      'where to eat in watamu',
      'watamu seafood',
      'watamu italian restaurants',
      'watamu sunset restaurants',
      'swahili food watamu',
      'watamu pizza',
      'watamu beach bars',
    ],
    tags: ['Watamu', 'Restaurants', 'Food', 'Coast', 'Kenya', 'Seafood', 'Italian'],
    relatedListings: [
      { _type: 'reference', _key: key(), _ref: '76y5EjmeLusgbergeavVGU' }, // Crab Shack Dabaso
      { _type: 'reference', _key: key(), _ref: '4hnJIDJZ69IFLrlyxWLmYd' }, // Lichthaus
      { _type: 'reference', _key: key(), _ref: '2riX1AdO9O53izfAmrTWVS' }, // Mannis
    ],
    coverImage: {
      _type: 'image',
      alt: 'The best restaurants in Watamu, Kenya, 2026',
      asset: { _type: 'reference', _ref: coverAsset._id },
    },
    body,
  }

  await client.createOrReplace(doc)
  console.log('\n✅ Published: /journal/best-restaurants-watamu-kenya')
  console.log('   (Allow up to 60s for the site revalidate to reflect it.)')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
