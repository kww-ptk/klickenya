import { createClient } from 'next-sanity'

const client = createClient({
  projectId: 'b9zd8u9f', dataset: 'production', apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!, useCdn: false,
})

function k() { return Math.random().toString(36).slice(2, 12) }
function t(s: string, style = 'normal'): any {
  return { _type: 'block', _key: k(), style, children: [{ _type: 'span', _key: k(), text: s, marks: [] }] }
}
function qf(title: string, color: string, items: any[]): any {
  return { _type: 'quickFactsBlock', _key: k(), title, accentColor: color, items: items.map(i => ({ _key: k(), ...i })) }
}
function tc(v: string, icon: string, label: string, text: string): any {
  return { _type: 'tipCardBlock', _key: k(), variant: v, icon, label, text }
}
function wf(title: string, items: any[]): any {
  return { _type: 'whoIsItForBlock', _key: k(), title, items: items.map(i => ({ _key: k(), ...i })) }
}
function hl(emoji: string, title: string, description: string) {
  return { _key: k(), emoji, title, description }
}

async function uploadImg(url: string, name: string): Promise<any> {
  try {
    const r = await fetch(url); if (!r.ok) throw new Error(`${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    const a = await client.assets.upload('image', buf, { filename: name })
    return { _type: 'image', _key: k(), asset: { _type: 'reference', _ref: a._id }, alt: name.replace(/[-_]/g, ' ').replace(/\.\w+$/, '') }
  } catch { console.warn(`  ⚠ img fail: ${name}`); return null }
}

const restaurants = [
  // ── 1. Kilifi Boatyard ──────────────────────────────
  {
    title: 'Kilifi Boatyard',
    slug: 'kilifi-boatyard',
    address: 'South Side, Kilifi Creek, Kilifi',
    hostName: 'Kilifi Boatyard',
    cuisine: ['Seafood', 'African', 'International'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily for lunch and dinner. Check blackboard for daily specials.',
    tags: ['seafood', 'kilifi', 'creekside', 'crab', 'oysters', 'local-favorite', 'boatyard', 'prawns'],
    amenities: ['Parking', 'Sea View', 'Outdoor Seating'],
    imgUrl: '',
    highlights: [
      hl('🦀', 'Crab Samosas', 'Legendary appetizer that keeps people coming back'),
      hl('🦐', 'Piri Piri Prawns', 'Perfectly spiced and grilled to order'),
      hl('🦪', 'Free Saturday Oysters', 'Fresh oysters on the house every Saturday'),
      hl('📋', 'Blackboard Specials', 'Daily changing menu based on the catch'),
      hl('⛵', 'Working Boatyard', 'Authentic waterfront atmosphere among the boats'),
      hl('🚣', 'Dinghy Service', 'Arrive by boat and dock right at the restaurant'),
    ],
    description: [
      qf('✦ Restaurant Info', 'teal', [
        { icon: '📍', label: 'Location', value: 'South side of Kilifi Creek' },
        { icon: '🍽️', label: 'Cuisine', value: 'Seafood, African, International' },
        { icon: '💰', label: 'Price Range', value: '$7 to $16 per main' },
        { icon: '🦪', label: 'Special', value: 'Free oysters on Saturdays' },
        { icon: '🚣', label: 'Access', value: 'Road or dinghy service' },
        { icon: '⭐', label: 'Known For', value: 'Crab samosas, piri piri prawns' },
      ]),
      t('Kilifi Boatyard', 'h2'),
      t("Kilifi Boatyard is one of those places that locals will tell you about with a knowing smile. Tucked away on the south side of Kilifi Creek inside an actual working boatyard, this restaurant has zero pretension and some of the best seafood on the Kenya coast. The setting is unusual and completely charming. You eat surrounded by boats in various stages of repair, with the creek stretching out in front of you and a breeze that makes everything feel right."),
      t("The crab samosas here are famous for good reason. Crispy, packed with real crab meat, and gone before you know it. The piri piri prawns are another standout, perfectly spiced and generous in portion. Fresh oysters appear regularly, and on Saturdays they are served free of charge, which alone is worth planning your week around. The menu changes daily based on what comes in from the fishermen, written up on a blackboard that you check when you arrive. Mains typically run between seven and sixteen dollars, making this one of the best value seafood meals in the area."),
      tc('tip', '🦪', 'Saturday Oyster Day', 'Show up on Saturday afternoon and you will get fresh oysters on the house. Pair them with a cold Tusker and the crab samosas. It is one of the best free deals on the entire Kenya coast and locals have been taking advantage of it for years.'),
      tc('teal', '🚣', 'Arrive by Boat', 'If you are staying anywhere on Kilifi Creek, ask about the dinghy service. Arriving by water is half the experience and adds to the boatyard atmosphere.'),
      wf('Perfect For', [
        { emoji: '🦀', heading: 'Seafood Lovers', text: 'Some of the freshest, best value seafood in Kilifi' },
        { emoji: '🍺', heading: 'Casual Diners', text: 'No dress code, no fuss, just great food by the water' },
        { emoji: '⛵', heading: 'Sailing Community', text: 'The meeting point for Kilifi boating crowd' },
        { emoji: '🦪', heading: 'Saturday Visitors', text: 'Free oysters make it the best weekend lunch spot' },
      ]),
    ],
    seoTitle: 'Kilifi Boatyard — Creekside Seafood & Free Oysters',
    seoDescription: 'Eat at Kilifi Boatyard on the creek. Famous crab samosas, piri piri prawns, free Saturday oysters, and a working boatyard atmosphere.',
  },

  // ── 2. Nautilus Restaurant ──────────────────────────
  {
    title: 'Nautilus Restaurant',
    slug: 'nautilus-restaurant-kilifi',
    address: 'Kilifi Creek Estuary, Kilifi',
    hostName: 'Nautilus Kilifi',
    cuisine: ['Italian', 'Seafood'],
    priceRange: 'fine-dining' as const,
    openingHours: 'Currently temporarily closed. Moving to a new location on Kilifi Creek.',
    tags: ['fine-dining', 'kilifi', 'italian', 'seafood', 'oysters', 'romantic', 'stilts', 'creek'],
    amenities: ['Sea View', 'Outdoor Seating'],
    imgUrl: '',
    highlights: [
      hl('🏠', 'Built on Stilts', 'Stunning restaurant hovering over the creek estuary'),
      hl('🦪', 'Famous Oysters', 'Raw or baked, among the best on the coast'),
      hl('🦐', 'Grilled Prawns', 'Perfectly prepared with Italian technique'),
      hl('🌿', 'Thatched Straw Hut', 'Dining under a large traditional straw roof'),
      hl('✨', 'Impeccable Service', 'Fine dining experience in an unexpected setting'),
      hl('📍', 'New Location Coming', 'Relocating to a new spot on Kilifi Creek'),
    ],
    description: [
      qf('✦ Restaurant Info', 'purple', [
        { icon: '📍', label: 'Location', value: 'Kilifi Creek Estuary (relocating)' },
        { icon: '🍽️', label: 'Cuisine', value: 'Italian, Seafood' },
        { icon: '💰', label: 'Price Range', value: 'Fine Dining' },
        { icon: '⚠️', label: 'Status', value: 'Temporarily closed, moving to new location' },
        { icon: '⭐', label: 'Known For', value: 'Oysters, grilled prawns' },
        { icon: '🏠', label: 'Setting', value: 'Restaurant on stilts over the creek' },
      ]),
      t('Nautilus Restaurant', 'h2'),
      t("Nautilus is one of those restaurants that people in Kilifi talk about with genuine reverence. Built on stilts over the Kilifi Creek estuary, sheltered under a large straw hut, this Italian seafood restaurant created an experience that was completely unique on the Kenya coast. The setting alone was extraordinary. You sat suspended above the water, surrounded by the sounds of the creek, watching boats drift past while eating some of the finest food in the region."),
      t("The oysters at Nautilus became legendary. Whether you ordered them raw or baked, they were consistently outstanding and a must order for every table. The grilled prawns were equally praised, prepared with Italian finesse and served with the kind of attention to detail you rarely find in coastal Kenya. The service matched the food, polished and professional without a hint of stuffiness. Everything about Nautilus felt considered and intentional."),
      t("Please note that Nautilus is currently temporarily closed as they prepare to move to a new location on Kilifi Creek. The restaurant is expected to reopen, and when it does, it will almost certainly be worth the wait. Keep an eye out for announcements about the new venue."),
      tc('tip', '📢', 'Currently Relocating', 'Nautilus is temporarily closed while moving to a new spot on Kilifi Creek. Follow local Kilifi social media groups for updates on the reopening. When it does come back, book early because demand will be high.'),
      wf('Perfect For', [
        { emoji: '💑', heading: 'Couples', text: 'One of the most romantic settings on the Kenya coast' },
        { emoji: '🦪', heading: 'Oyster Lovers', text: 'Raw or baked, Nautilus oysters were the gold standard' },
        { emoji: '✨', heading: 'Special Occasions', text: 'Fine dining in an unforgettable waterfront setting' },
        { emoji: '🍝', heading: 'Italian Food Fans', text: 'Authentic Italian technique with Kenyan coastal ingredients' },
      ]),
    ],
    seoTitle: 'Nautilus Restaurant Kilifi — Italian Fine Dining on Stilts',
    seoDescription: 'Nautilus in Kilifi Creek offers Italian fine dining on stilts. Famous oysters, grilled prawns, and an unforgettable setting. Currently relocating.',
  },

  // ── 3. Distant Relatives Ecolodge ───────────────────
  {
    title: 'Distant Relatives Ecolodge & Restaurant',
    slug: 'distant-relatives-ecolodge-kilifi',
    address: 'Kilifi Creek, 1.9 miles outside Kilifi Town',
    hostName: 'Distant Relatives',
    cuisine: ['International', 'African', 'Vegetarian'],
    priceRange: 'budget' as const,
    openingHours: 'Daily for lunch and dinner. Friday pizza nights are not to be missed.',
    tags: ['budget', 'kilifi', 'backpackers', 'eco-lodge', 'pizza-night', 'vegetarian', 'community', 'creek'],
    amenities: ['WiFi', 'Parking', 'Outdoor Seating', 'Garden'],
    imgUrl: '',
    highlights: [
      hl('🍕', 'Friday Pizza Night', 'Legendary weekly event that draws all of Kilifi'),
      hl('🌿', 'Community Forest', 'Set in a beautiful natural forest on the creek'),
      hl('🥗', 'Great Veggie Menu', 'One of the best vegetarian selections in the area'),
      hl('🌍', 'Backpacker Hub', 'Meeting point for travelers and Kilifi creatives'),
      hl('🏕️', 'Eco Lodge', 'Affordable accommodation in a stunning setting'),
      hl('🌊', 'Kilifi Creek Access', 'Swim and kayak right from the property'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: '1.9 miles outside Kilifi Town, on Kilifi Creek' },
        { icon: '🍽️', label: 'Cuisine', value: 'International, African, Vegetarian' },
        { icon: '💰', label: 'Price Range', value: 'Budget to Mid Range' },
        { icon: '🍕', label: 'Must Do', value: 'Friday pizza night' },
        { icon: '🌿', label: 'Setting', value: 'Community forest on the creek' },
        { icon: '🏕️', label: 'Also', value: 'Backpackers lodge with dorms and rooms' },
      ]),
      t('Distant Relatives Ecolodge & Restaurant', 'h2'),
      t("Distant Relatives is more than a restaurant. It is the beating heart of Kilifi's creative and traveler community. Set in a community forest about 1.9 miles outside of Kilifi Town, right on the banks of Kilifi Creek, this eco lodge and backpackers has become a landmark for anyone passing through the area. The restaurant is open to everyone, not just guests, and the food is consistently good, affordable, and made with genuine care."),
      t("The menu covers a wide range of international and African dishes, with a particularly strong vegetarian selection that puts most coastal restaurants to shame. Everything is fresh and made from scratch. But the real magic happens on Friday nights. The weekly pizza night at Distant Relatives has become legendary in Kilifi. The whole community shows up. Travelers, locals, artists, musicians, and surfers all gather in the forest setting to eat wood fired pizza, share stories, and enjoy what feels like a very natural and organic kind of social event. If you are in Kilifi on a Friday, there is really no other option."),
      tc('tip', '🍕', 'Friday Pizza Night', 'Arrive at Distant Relatives by early evening on Friday. The pizza is wood fired and excellent, the vibe is social and welcoming, and the forest setting makes the whole thing feel special. It is the one weekly event in Kilifi that absolutely everyone recommends.'),
      tc('teal', '🌊', 'Stay and Swim', 'Even if you are not staying overnight, the creek access at Distant Relatives is fantastic. Have lunch, take a swim, explore the forest trails, and you will understand why so many travelers end up staying longer than planned.'),
      wf('Perfect For', [
        { emoji: '🎒', heading: 'Backpackers', text: 'Affordable food and accommodation in a stunning setting' },
        { emoji: '🥗', heading: 'Vegetarians', text: 'One of the best veggie menus on the coast' },
        { emoji: '🍕', heading: 'Friday Night Crowd', text: 'The pizza night is a must do Kilifi experience' },
        { emoji: '🌍', heading: 'Community Seekers', text: 'Meet travelers, creatives, and locals in one place' },
      ]),
    ],
    seoTitle: 'Distant Relatives Kilifi — Ecolodge & Friday Pizza',
    seoDescription: 'Eat at Distant Relatives on Kilifi Creek. Legendary Friday pizza nights, great veggie menu, forest setting, and backpacker community vibes.',
  },

  // ── 4. The Twisted Fig ──────────────────────────────
  {
    title: 'The Twisted Fig',
    slug: 'the-twisted-fig-kilifi',
    address: 'Beneath The Baobabs, Takaungu Creek, Kilifi',
    hostName: 'The Twisted Fig',
    cuisine: ['Seafood', 'International', 'Vegetarian'],
    priceRange: 'mid-range' as const,
    openingHours: 'Dinner service, Sunday brunches, and special event nights. Check schedule.',
    tags: ['kilifi', 'seafood', 'baobab', 'live-music', 'starlit', 'brunch', 'romantic', 'locally-sourced'],
    amenities: ['Parking', 'Outdoor Seating', 'Garden', 'Live Music'],
    imgUrl: '',
    highlights: [
      hl('🌳', 'Ancient Baobab Tree', 'Dining beneath a magnificent centuries old baobab'),
      hl('🌟', 'Starlit Dinners', 'Al fresco evening dining under the night sky'),
      hl('🎵', 'Live Music & BBQs', 'Blues BBQ nights and live performances'),
      hl('🥦', 'Vegetarian Friendly', 'Thoughtful plant based options alongside seafood'),
      hl('🌅', 'Sunday Brunch', 'Beloved weekend brunch with creek views'),
      hl('🐟', 'Locally Sourced', 'Seafood from the creek and meat from up country'),
    ],
    description: [
      qf('✦ Restaurant Info', 'purple', [
        { icon: '📍', label: 'Location', value: 'Beneath The Baobabs, Takaungu Creek' },
        { icon: '🍽️', label: 'Cuisine', value: 'Seafood, International, Vegetarian' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '🎵', label: 'Events', value: 'Blues BBQs, live music nights' },
        { icon: '🌅', label: 'Brunch', value: 'Sunday brunch is a local favorite' },
        { icon: '🌳', label: 'Setting', value: 'Al fresco under ancient Baobab tree' },
      ]),
      t('The Twisted Fig', 'h2'),
      t("There are very few restaurants in Kenya where the setting alone would be worth the trip, and The Twisted Fig is one of them. Located at the Beneath The Baobabs festival grounds on Takaungu Creek, dining here happens al fresco under an ancient baobab tree that has been standing for centuries. At night, the canopy above you becomes a frame for the stars, and the whole experience takes on a quality that feels almost otherworldly. It is the kind of place that stays with you long after you leave."),
      t("The food more than holds its own against the setting. The kitchen works with locally sourced ingredients, pulling seafood from the creek and sourcing meat from up country farms. The menu changes regularly and always includes thoughtful vegetarian options alongside the seafood and grilled meats. Sunday brunch has become a beloved ritual for Kilifi locals, and the blues BBQ nights combine live music with smoky grilled food in a way that feels uniquely Kilifi. Everything about The Twisted Fig is intentional, creative, and genuinely enjoyable."),
      tc('tip', '🎵', 'Check the Schedule', 'The Twisted Fig does not operate like a regular restaurant with fixed daily hours. Check their social media for upcoming dinners, Sunday brunches, and blues BBQ events. The special event nights are always worth prioritizing.'),
      wf('Perfect For', [
        { emoji: '💑', heading: 'Couples', text: 'Starlit dinner under a baobab is unforgettable' },
        { emoji: '🎵', heading: 'Music Lovers', text: 'Blues BBQ nights with live performances' },
        { emoji: '🌅', heading: 'Brunch Fans', text: 'Sunday brunch by Takaungu Creek' },
        { emoji: '🥦', heading: 'Vegetarians', text: 'Thoughtful plant based options on every menu' },
      ]),
    ],
    seoTitle: 'The Twisted Fig Kilifi — Dining Under a Baobab Tree',
    seoDescription: 'Dine at The Twisted Fig beneath an ancient baobab in Kilifi. Starlit dinners, Sunday brunch, blues BBQs, and locally sourced seafood.',
  },

  // ── 5. Bofa Beach Resort (Kaya Restaurant) ──────────
  {
    title: 'Bofa Beach Resort (Kaya Restaurant)',
    slug: 'bofa-beach-resort-kaya-restaurant',
    address: 'Bofa Beach, Kilifi',
    hostName: 'Bofa Beach Resort',
    cuisine: ['African', 'International', 'Steaks'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily for breakfast, lunch, and dinner.',
    tags: ['kilifi', 'steaks', 'beach', 'pool', 'african-cuisine', 'family', 'bofa-beach', 'burgers'],
    amenities: ['WiFi', 'Parking', 'Pool', 'Sea View', 'Outdoor Seating'],
    imgUrl: '',
    highlights: [
      hl('🥩', 'Famous Pepper Steak', 'The one dish everyone agrees is outstanding'),
      hl('🏖️', 'Bofa Beach Location', 'Steps from one of Kilifi best beaches'),
      hl('🏊', 'Poolside Dining', 'Al fresco tables next to the swimming pool'),
      hl('🌳', 'Neem Tree Shade', 'Dining under a beautiful old Neem tree'),
      hl('🍔', 'Burgers & Pasta', 'Solid comfort food alongside African dishes'),
      hl('🌍', 'Local Ingredients', 'African cuisine prepared from locally sourced produce'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: 'Bofa Beach, Kilifi' },
        { icon: '🍽️', label: 'Cuisine', value: 'African, International, Steaks' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '🥩', label: 'Must Try', value: 'Pepper steak' },
        { icon: '🏊', label: 'Facilities', value: 'Pool, beach access' },
        { icon: '🌳', label: 'Setting', value: 'Al fresco under old Neem tree' },
      ]),
      t('Bofa Beach Resort (Kaya Restaurant)', 'h2'),
      t("Bofa Beach Resort sits right on the edge of Bofa Beach, one of the most beautiful stretches of sand in Kilifi. The Kaya Restaurant is the resort's main dining spot, set al fresco next to the swimming pool under the shade of an old Neem tree. It is a relaxed and pleasant setting where you can eat well without any fuss. The menu covers a mix of African cuisine, steaks, pasta, fish, and burgers, all prepared from locally sourced ingredients."),
      t("Reviews for Bofa Beach Resort are mixed across the board, but there is one thing that almost everyone agrees on: the pepper steak is outstanding. It has become the signature dish and the reason many locals make the trip specifically to this restaurant. Beyond the steak, the fish dishes are generally reliable, and the African cuisine options offer a taste of local cooking that you will not find at the more tourist oriented spots. The poolside setting and beach proximity make it a comfortable place to spend a few hours, especially with kids in tow."),
      tc('tip', '🥩', 'Order the Pepper Steak', 'Even if steak is not usually your first choice at a beach restaurant, make an exception here. The pepper steak at Kaya Restaurant is genuinely excellent and is the one dish that gets consistently high marks from everyone who visits.'),
      tc('teal', '🏖️', 'Beach and Pool Day', 'Combine lunch at Kaya with a morning on Bofa Beach and an afternoon by the pool. It is a solid family day out in Kilifi with food, swimming, and sand all in one location.'),
      wf('Perfect For', [
        { emoji: '🥩', heading: 'Steak Lovers', text: 'The pepper steak alone justifies the visit' },
        { emoji: '👨‍👩‍👧', heading: 'Families', text: 'Pool, beach, and a kid friendly menu' },
        { emoji: '🌍', heading: 'Local Food Fans', text: 'African dishes with local ingredients' },
        { emoji: '🏖️', heading: 'Beach Goers', text: 'Steps from Bofa Beach with pool access' },
      ]),
    ],
    seoTitle: 'Bofa Beach Resort Kilifi — Steaks, Pool & Beach',
    seoDescription: 'Eat at Kaya Restaurant in Bofa Beach Resort, Kilifi. Famous pepper steak, poolside dining, African cuisine, and Bofa Beach access.',
  },

  // ── 6. Vegan Basket ─────────────────────────────────
  {
    title: 'Vegan Basket',
    slug: 'vegan-basket-kilifi',
    address: 'Kilifi Town Centre, near Bofa Beach',
    hostName: 'Vegan Basket Kilifi',
    cuisine: ['Vegan', 'Kenyan', 'Plant-Based'],
    priceRange: 'budget' as const,
    openingHours: 'Daily for lunch and dinner. Takeaway and delivery available.',
    tags: ['vegan', 'kilifi', 'budget', 'plant-based', 'kenyan', 'delivery', 'healthy', 'local-favorite'],
    amenities: ['Takeaway', 'Delivery'],
    imgUrl: '',
    highlights: [
      hl('🌱', 'Fully Plant Based', 'Everything on the menu is 100% vegan'),
      hl('🇰🇪', 'Kenyan Favorites Veganized', 'Local dishes reimagined without any animal products'),
      hl('🍔', 'Vegan Burgers', 'Surprisingly good plant based burgers and chips'),
      hl('💰', 'Super Affordable', 'Some of the cheapest meals in Kilifi'),
      hl('⭐', 'Highly Rated', 'Consistently top reviews from locals and visitors'),
      hl('🛵', 'Delivery Available', 'Order for delivery or takeaway around Kilifi'),
    ],
    description: [
      qf('✦ Restaurant Info', 'teal', [
        { icon: '📍', label: 'Location', value: 'Kilifi Town, a few hundred meters from Bofa Beach' },
        { icon: '🍽️', label: 'Cuisine', value: 'Vegan, Kenyan, Plant Based' },
        { icon: '💰', label: 'Price Range', value: 'Budget' },
        { icon: '🌱', label: 'Diet', value: '100% vegan' },
        { icon: '🛵', label: 'Services', value: 'Dine in, takeaway, delivery' },
        { icon: '⭐', label: 'Reviews', value: 'Highly rated by locals and visitors' },
      ]),
      t('Vegan Basket', 'h2'),
      t("Vegan Basket is proof that plant based food in Kenya does not have to mean boring salads or imported health food. Located in the heart of Kilifi, just a few hundred meters from Bofa Beach, this small restaurant has earned a devoted following by doing something simple but clever: taking beloved Kenyan dishes and making them entirely vegan without losing any of the flavor. The result is food that feels familiar and comforting but happens to contain zero animal products."),
      t("The menu covers everything from veganized Kenyan favorites to plant based burgers and chips. Portions are generous, prices are low, and the quality is consistently high. What makes Vegan Basket special is the enthusiasm and care behind every dish. This is not a restaurant that treats vegan food as a limitation. It treats it as a creative challenge, and the results speak for themselves. Whether you are a committed vegan, a curious flexitarian, or just someone looking for a cheap and delicious lunch in Kilifi, this place delivers. Literally, because they offer delivery and takeaway alongside dine in service."),
      tc('tip', '🌱', 'Not Just for Vegans', 'Even if you eat meat every day, give Vegan Basket a try. The food is so well prepared that many non vegan regulars eat here several times a week simply because it is delicious, affordable, and makes you feel good.'),
      wf('Perfect For', [
        { emoji: '🌱', heading: 'Vegans', text: 'Finally a fully vegan restaurant on the Kenya coast' },
        { emoji: '💰', heading: 'Budget Travelers', text: 'Some of the cheapest good meals in Kilifi' },
        { emoji: '🇰🇪', heading: 'Kenyan Food Fans', text: 'Local favorites made entirely plant based' },
        { emoji: '🏃', heading: 'Health Conscious', text: 'Clean, plant based food that tastes amazing' },
      ]),
    ],
    seoTitle: 'Vegan Basket Kilifi — Plant Based Kenyan Food',
    seoDescription: 'Eat at Vegan Basket in Kilifi Town. Fully vegan Kenyan food, plant based burgers, budget prices, delivery available. Highly rated.',
  },

  // ── 7. Wild Living Cafe ─────────────────────────────
  {
    title: 'Wild Living Cafe',
    slug: 'wild-living-cafe-kilifi',
    address: '1km after Kilifi Bridge, Mombasa direction, Kilifi',
    hostName: 'Wild Living Cafe',
    cuisine: ['Cafe', 'African', 'International'],
    priceRange: 'budget' as const,
    openingHours: 'Daily for breakfast, lunch, and early dinner.',
    tags: ['cafe', 'kilifi', 'budget', 'pastries', 'breakfast', 'lunch', 'coffee', 'quick-meal'],
    amenities: ['WiFi', 'Parking', 'Outdoor Seating'],
    imgUrl: '',
    highlights: [
      hl('🥐', 'Best Pastries in Kilifi', 'Fresh baked goods that locals drive across town for'),
      hl('☕', 'Great Coffee', 'Properly made coffee in a town that needed it'),
      hl('🍽️', 'Quick Lunches', 'Fast, affordable, and consistently tasty'),
      hl('🌍', 'African Food', 'Local dishes alongside international cafe fare'),
      hl('🍺', 'Pub Vibes', 'Relaxed atmosphere that works morning through evening'),
      hl('📍', 'Easy to Find', 'Right after Kilifi Bridge heading toward Mombasa'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: '1km past Kilifi Bridge, Mombasa direction' },
        { icon: '🍽️', label: 'Style', value: 'Cafe, African food, pub vibes' },
        { icon: '💰', label: 'Price Range', value: 'Budget to Mid Range' },
        { icon: '🥐', label: 'Known For', value: 'Best pastries in Kilifi' },
        { icon: '☕', label: 'Coffee', value: 'Great coffee, properly made' },
        { icon: '⏰', label: 'Best For', value: 'Breakfast and quick lunches' },
      ]),
      t('Wild Living Cafe', 'h2'),
      t("Wild Living Cafe is the kind of spot that fills a gap you did not realize existed until you found it. Located about one kilometer after Kilifi Bridge heading in the Mombasa direction, this cafe has quickly become a go to for anyone who wants great pastries, solid coffee, and a quick but satisfying lunch without a long wait. The atmosphere blends cafe, African food spot, and pub vibes into something that works surprisingly well at any time of day."),
      t("The pastries are the star here and widely considered the best in Kilifi. Fresh, well made, and the sort of thing you will find yourself craving the next day. The coffee is properly prepared, which sounds like a low bar but matters in a town where good coffee can be surprisingly hard to find. For lunch, the menu covers African dishes and international cafe fare, all served quickly and at prices that will not make you think twice. It is not a fine dining destination. It is the kind of reliable everyday cafe that every town needs and Kilifi is lucky to have."),
      tc('tip', '🥐', 'Breakfast Stop', 'If you are driving through Kilifi on the Mombasa highway, Wild Living makes for the perfect breakfast or coffee stop. Pull over, grab pastries and a proper coffee, and you will be back on the road in under 30 minutes feeling much better about the journey.'),
      wf('Perfect For', [
        { emoji: '🥐', heading: 'Pastry Lovers', text: 'The best baked goods in Kilifi, no contest' },
        { emoji: '☕', heading: 'Coffee Drinkers', text: 'Proper coffee that is worth stopping for' },
        { emoji: '🚗', heading: 'Road Trippers', text: 'Perfect stop when driving through on the Mombasa highway' },
        { emoji: '💰', heading: 'Budget Diners', text: 'Affordable lunches and snacks all day' },
      ]),
    ],
    seoTitle: 'Wild Living Cafe Kilifi — Pastries, Coffee & Lunch',
    seoDescription: 'Visit Wild Living Cafe in Kilifi. Best pastries in town, great coffee, quick affordable lunches. Located 1km past Kilifi Bridge.',
  },

  // ── 8. Mnarani Beach Club ───────────────────────────
  {
    title: 'Mnarani Beach Club',
    slug: 'mnarani-beach-club-kilifi',
    address: 'North Side, Kilifi Creek, Kilifi',
    hostName: 'Mnarani Beach Club',
    cuisine: ['African', 'British', 'Indian', 'Italian'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily for breakfast, lunch, and dinner.',
    tags: ['kilifi', 'resort', 'family', 'watersports', 'diving', 'multi-cuisine', 'creek', 'beach-club'],
    amenities: ['WiFi', 'Parking', 'Pool', 'Sea View', 'Garden', 'Outdoor Seating'],
    imgUrl: '',
    highlights: [
      hl('🌍', 'Multi Cuisine Menu', 'African, British, Indian, and Italian all done well'),
      hl('🤿', 'Watersports Center', 'Diving, sailing, snorkeling, and kayaking on site'),
      hl('👨‍👩‍👧', 'Family Friendly', 'Pool, beach, activities, and a menu for every age'),
      hl('🏖️', 'Creek Location', 'Beautiful setting on the north side of Kilifi Creek'),
      hl('🏊', 'Pool and Beach', 'Full resort facilities open to restaurant guests'),
      hl('⛵', 'Sailing & Kayaks', 'Explore Kilifi Creek from the watersports center'),
    ],
    description: [
      qf('✦ Restaurant Info', 'teal', [
        { icon: '📍', label: 'Location', value: 'North side of Kilifi Creek' },
        { icon: '🍽️', label: 'Cuisine', value: 'African, British, Indian, Italian' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '🤿', label: 'Activities', value: 'Diving, sailing, kayaking, snorkeling' },
        { icon: '👨‍👩‍👧', label: 'Family', value: 'Very family friendly with kids activities' },
        { icon: '🏊', label: 'Facilities', value: 'Pool, beach, watersports center' },
      ]),
      t('Mnarani Beach Club', 'h2'),
      t("Mnarani Beach Club is a full resort experience on the north side of Kilifi Creek, and the restaurant is at the center of it all. The menu here is unusually broad for a resort, covering African, British, Indian, and Italian cuisines with surprising competence across all four. Whether you want a proper curry, a well made pasta, a grilled fish with African spices, or a classic British Sunday roast, the kitchen handles it confidently."),
      t("What makes Mnarani stand out as a restaurant destination, even if you are not staying at the resort, is everything that surrounds the meal. The setting on Kilifi Creek is beautiful and the facilities are extensive. There is a swimming pool, beach access, and a full watersports center where you can go diving, sailing, snorkeling, or kayaking. For families, this combination of good food and endless activities makes Mnarani one of the best options in Kilifi. Kids can swim and explore while parents enjoy a leisurely lunch, and everyone leaves happy."),
      tc('tip', '👨‍👩‍👧', 'Best Family Day Out', 'Mnarani works brilliantly as a full day family outing. Arrive mid morning, let the kids try kayaking or snorkeling, have lunch by the pool, and spend the afternoon swimming. The multi cuisine menu means even the pickiest eaters will find something they love.'),
      wf('Perfect For', [
        { emoji: '👨‍👩‍👧', heading: 'Families', text: 'The best combination of food, pool, beach, and activities in Kilifi' },
        { emoji: '🤿', heading: 'Water Sports Fans', text: 'Dive, sail, kayak, or snorkel right from the resort' },
        { emoji: '🌍', heading: 'Varied Palates', text: 'Four cuisines means everyone finds something they want' },
        { emoji: '🏖️', heading: 'Day Visitors', text: 'Full resort access makes lunch a proper experience' },
      ]),
    ],
    seoTitle: 'Mnarani Beach Club Kilifi — Resort Dining & Watersports',
    seoDescription: 'Eat at Mnarani Beach Club on Kilifi Creek. Multi cuisine restaurant, watersports center, pool, family friendly. African, Indian, Italian food.',
  },

  // ── 9. The Moorings ─────────────────────────────────
  {
    title: 'The Moorings',
    slug: 'the-moorings-kilifi',
    address: 'Mtwapa / Kilifi Area, Kenya Coast',
    hostName: 'The Moorings',
    cuisine: ['Seafood', 'Continental', 'Italian'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily for lunch and dinner.',
    tags: ['kilifi', 'seafood', 'floating-restaurant', 'lobster', 'crab', 'pizza', 'pasta', 'historic', 'continental'],
    amenities: ['Parking', 'Sea View', 'Outdoor Seating'],
    imgUrl: '',
    highlights: [
      hl('🚢', 'Floating Restaurant', 'Built on a buoyant platform since 1994'),
      hl('🦞', 'Lobster & Crab', 'Fresh shellfish straight from the ocean'),
      hl('📅', '30+ Years History', 'A Kenya coast institution since the mid 1990s'),
      hl('🍕', 'Pizza & Pasta', 'Continental menu beyond just seafood'),
      hl('🦐', 'Prawns', 'Consistently excellent and generously served'),
      hl('💰', 'Fair Prices', 'KSh 1,000 to 4,000 for mains'),
    ],
    description: [
      qf('✦ Restaurant Info', 'purple', [
        { icon: '📍', label: 'Location', value: 'Mtwapa / Kilifi area' },
        { icon: '🍽️', label: 'Cuisine', value: 'Seafood, Continental, Italian' },
        { icon: '💰', label: 'Price Range', value: 'KSh 1,000 to 4,000 per main' },
        { icon: '🚢', label: 'Unique', value: 'Floating restaurant on buoyant platform' },
        { icon: '📅', label: 'Established', value: '1994' },
        { icon: '⭐', label: 'Known For', value: 'Lobster, crab, prawns' },
      ]),
      t('The Moorings', 'h2'),
      t("The Moorings is one of the most unique dining experiences on the entire Kenya coast. Built in 1994 on a buoyant platform that literally floats on the water, this restaurant has been serving fresh seafood and continental cuisine for over 30 years. The concept is simple but executed brilliantly. You step off dry land onto a floating deck, and for the duration of your meal, you are gently bobbing on the water surrounded by ocean views. It is the kind of place that immediately puts a smile on your face."),
      t("The menu is built around seafood, and the kitchen does not disappoint. Lobster, crab, and prawns are the headliners, all pulled fresh from the ocean and prepared with skill and respect for the ingredients. But The Moorings is not a one trick restaurant. The continental menu includes excellent pizza, pasta, and other dishes that ensure everyone at the table is happy. Prices range from roughly KSh 1,000 to 4,000 for mains, which feels very fair considering the quality and the novelty of the floating setting. After three decades, The Moorings has earned its place as a genuine Kenya coast institution."),
      tc('tip', '🦞', 'Go for the Seafood', 'You are on a floating restaurant. This is not the time to order chicken. Go for the lobster, the crab, or a big plate of prawns. The seafood is the reason this place has survived and thrived for more than 30 years.'),
      wf('Perfect For', [
        { emoji: '🦞', heading: 'Seafood Enthusiasts', text: 'Lobster, crab, and prawns in the most unique setting' },
        { emoji: '📸', heading: 'Unique Experiences', text: 'Floating on the ocean while you eat is unforgettable' },
        { emoji: '👥', heading: 'Groups', text: 'Great for celebrations and memorable group meals' },
        { emoji: '🍕', heading: 'Mixed Groups', text: 'Continental menu means non seafood eaters are covered too' },
      ]),
    ],
    seoTitle: 'The Moorings — Famous Floating Restaurant Kenya Coast',
    seoDescription: 'Dine at The Moorings floating restaurant near Kilifi. Fresh lobster, crab, prawns, pizza. Built on water since 1994. A Kenya coast institution.',
  },

  // ── 10. De Coffee Kilifi ────────────────────────────
  {
    title: 'De Coffee Kilifi',
    slug: 'de-coffee-kilifi',
    address: 'Kilifi Town Centre, Kilifi',
    hostName: 'De Coffee Kilifi',
    cuisine: ['Cafe', 'Breakfast', 'Light Meals'],
    priceRange: 'budget' as const,
    openingHours: 'Daily from morning. Great for breakfast and coffee through the day.',
    tags: ['cafe', 'kilifi', 'coffee', 'budget', 'breakfast', 'creative-community', 'light-meals', 'local'],
    amenities: ['WiFi', 'Outdoor Seating'],
    imgUrl: '',
    highlights: [
      hl('☕', 'Great Coffee', 'The best cup in Kilifi Town'),
      hl('🍳', 'Breakfast Spot', 'Solid morning meals to start the day right'),
      hl('🎨', 'Creative Hub', 'Meeting point for Kilifi artistic community'),
      hl('💰', 'Budget Friendly', 'Affordable prices for quality coffee and food'),
      hl('🥪', 'Light Meals', 'Perfect for a quick bite between activities'),
      hl('🤝', 'Community Space', 'Where locals come to connect and work'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: 'Kilifi Town Centre' },
        { icon: '🍽️', label: 'Style', value: 'Coffee shop, breakfast, light meals' },
        { icon: '💰', label: 'Price Range', value: 'Budget' },
        { icon: '☕', label: 'Known For', value: 'Best coffee in Kilifi' },
        { icon: '🎨', label: 'Vibe', value: 'Creative community meeting point' },
        { icon: '⏰', label: 'Best For', value: 'Breakfast and morning coffee' },
      ]),
      t('De Coffee Kilifi', 'h2'),
      t("De Coffee has become the unofficial living room of Kilifi's creative community. This small coffee shop in the center of town serves what many people consider the best coffee in Kilifi, alongside light meals and breakfast options that are simple, well made, and very affordable. The atmosphere is warm and social. On any given morning you will find local artists, writers, digital nomads, and entrepreneurs sharing tables and ideas over properly brewed cups."),
      t("The food menu is straightforward but reliable. Breakfast options are solid and satisfying, and the light meals throughout the day hit the spot without slowing you down. This is not a place to come for a three course dinner. It is the place to come when you want a genuinely good cup of coffee, something quick to eat, and the chance to plug into the energy of Kilifi's community. For travelers, De Coffee is also a great starting point for exploring the town. The staff know Kilifi inside out and are always happy to point you in the right direction."),
      tc('tip', '☕', 'Morning Ritual', 'Start your Kilifi day at De Coffee. The morning crowd is friendly and welcoming, the coffee is excellent, and by the time you finish breakfast you will probably have a handful of local recommendations for the rest of your day.'),
      wf('Perfect For', [
        { emoji: '☕', heading: 'Coffee Lovers', text: 'The best cup of coffee in Kilifi Town' },
        { emoji: '💻', heading: 'Digital Nomads', text: 'WiFi, coffee, and a creative atmosphere to work in' },
        { emoji: '🎨', heading: 'Creatives', text: 'The place to meet Kilifi artistic and entrepreneurial community' },
        { emoji: '🎒', heading: 'Travelers', text: 'Great starting point with local tips and affordable food' },
      ]),
    ],
    seoTitle: 'De Coffee Kilifi — Coffee Shop & Creative Hub',
    seoDescription: 'Visit De Coffee in Kilifi Town. Best coffee in Kilifi, light meals, breakfast, and the meeting point for the local creative community.',
  },
]

async function main() {
  console.log(`🍽️ Seeding ${restaurants.length} Kilifi restaurants...\n`)

  for (const r of restaurants) {
    console.log(`  → ${r.title}...`)

    const photos: any[] = []
    if (r.imgUrl) {
      const img = await uploadImg(r.imgUrl, `${r.slug}.jpg`)
      if (img) photos.push(img)
    }

    const doc: any = {
      _type: 'listing',
      title: r.title,
      slug: { _type: 'slug', current: r.slug },
      type: 'restaurant',
      status: 'published',
      city: 'Kilifi',
      county: 'Kilifi',
      address: r.address,
      hostName: r.hostName,
      bookingType: 'contact_form',
      cuisine: r.cuisine,
      priceRange: r.priceRange,
      openingHours: r.openingHours,
      reservationRequired: false,
      tags: r.tags,
      amenities: r.amenities,
      photos,
      highlights: r.highlights,
      description: r.description,
      seoTitle: r.seoTitle,
      seoDescription: r.seoDescription,
    }

    const result = await client.create(doc)
    console.log(`    ✅ ${result._id}`)
  }

  console.log(`\n✅ Done — ${restaurants.length} Kilifi restaurants created!`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
