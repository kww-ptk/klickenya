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
  // ── 1. The Food Movement ──────────────────────────
  {
    title: 'The Food Movement',
    slug: 'the-food-movement-kilifi',
    address: 'Mnarani, Kilifi',
    hostName: 'Warren Wilson',
    cuisine: ['Kenyan', 'Mediterranean', 'Seafood'],
    priceRange: 'mid-range' as const,
    openingHours: 'Monday to Saturday, 8:00 AM to 4:00 PM. Closed Sundays.',
    tags: ['fusion', 'kilifi', 'tacos', 'brunch', 'organic', 'creative', 'farm'],
    amenities: ['Parking'],
    imgUrl: 'https://eatout.co.ke/wp-content/uploads/2025/10/unnamed-1-6.webp',
    highlights: [
      hl('🌮', 'Legendary Seafood Tacos', 'The one dish everyone tells you to order'),
      hl('🌿', 'Farm Setting', 'Open air shack surrounded by trees and greenery'),
      hl('👨‍🍳', 'Warren Wilson', 'Creative eccentric chef behind every dish'),
      hl('🍳', 'Brunch Done Right', 'Poached eggs and creative morning specials'),
      hl('🤝', 'Friendliest Team', 'Staff that genuinely make your day better'),
      hl('⭐', '4.6 Stars', 'Over 900 glowing reviews on Google'),
    ],
    description: [
      qf('✦ Restaurant Info', 'teal', [
        { icon: '📍', label: 'Location', value: 'Mnarani, Kilifi' },
        { icon: '🍽️', label: 'Cuisine', value: 'Kenyan, Mediterranean, Seafood Fusion' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '📞', label: 'Phone', value: '+254 711 284 347' },
        { icon: '⭐', label: 'Rating', value: '4.6 stars (900+ reviews)' },
        { icon: '🕐', label: 'Hours', value: 'Mon to Sat, 8 AM to 4 PM' },
      ]),
      t('The Food Movement', 'h2'),
      t("There is a simple shack in the middle of a farm in Mnarani, tucked under the shade of sprawling trees, and it serves some of the best food on the entire Kenya coast. The Food Movement is the creation of Warren Wilson, a creative and wonderfully eccentric chef who has built something truly special in Kilifi. The menu fuses Swahili coastal flavors with contemporary international dishes, and the result is food that surprises you with every bite."),
      t("The seafood tacos are legendary. Ask anyone in Kilifi where to eat and they will tell you about these tacos before anything else. Beyond the tacos, the menu changes regularly with creative specials that reflect whatever is fresh and inspiring that day. Poached eggs for brunch are beautifully done. The fusion approach means you might find Mediterranean influences next to traditional Kenyan flavors, and somehow it all works perfectly together."),
      t('The Vibe', 'h3'),
      t("What makes The Food Movement unforgettable is the whole experience. You are eating outdoors on a farm, surrounded by trees and birdsong, served by the friendliest team you will meet anywhere. It is relaxed, unpretentious, and genuinely joyful. Warren has created a place where the food is serious but the atmosphere never is. With over 900 reviews and a 4.6 star rating on Google, the reputation speaks for itself. This is not a restaurant that needs to try hard. It just is what it is, and what it is happens to be extraordinary."),
      tc('tip', '🌮', 'Must Order', 'The seafood tacos are the reason most people come here in the first place. Order them. Whatever the daily special is, order that too. Trust Warren and his team. They know what they are doing and the specials are always worth trying.'),
      tc('teal', '🕐', 'Plan Your Visit', 'The Food Movement closes at 4 PM and is closed on Sundays. Come for a late breakfast or early lunch to enjoy the full menu without rushing. The farm setting is at its most beautiful in the morning light.'),
      wf('Perfect For', [
        { emoji: '🌮', heading: 'Foodies', text: 'Creative fusion cuisine you will not find anywhere else' },
        { emoji: '🌿', heading: 'Nature Lovers', text: 'Farm setting under trees with birdsong and fresh air' },
        { emoji: '🍳', heading: 'Brunch Seekers', text: 'Poached eggs and creative morning specials' },
        { emoji: '📸', heading: 'Experience Hunters', text: 'A meal here is a story you will tell friends about' },
      ]),
    ],
    seoTitle: 'The Food Movement Kilifi — Seafood Tacos & Farm Dining',
    seoDescription: 'Eat at The Food Movement in Kilifi. Legendary seafood tacos, farm to table brunch, creative fusion by Warren Wilson. Open Mon to Sat.',
  },

  // ── 2. Saltys Beach Bar & Restaurant ─────────────
  {
    title: "Saltys Beach Bar & Restaurant",
    slug: 'saltys-beach-bar-kilifi',
    address: 'Bofa Beach, Kilifi',
    hostName: "Saltys Kitesurf Village",
    cuisine: ['Seafood', 'Mediterranean', 'Italian'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily for lunch and dinner.',
    tags: ['beach-bar', 'kilifi', 'kitesurfing', 'seafood', 'bofa-beach', 'sunset'],
    amenities: ['Parking', 'Sea View'],
    imgUrl: '',
    highlights: [
      hl('🏖️', 'Bofa Beach Location', 'Beachfront dining right on the sand'),
      hl('🪁', 'Kitesurfing On Site', 'Full kitesurf village with lessons and gear'),
      hl('🍹', 'Beach Bar Cocktails', 'Cold drinks with ocean views'),
      hl('🏡', 'Accommodation', 'Stay overnight at the kitesurf village'),
      hl('🌅', 'Sunday Beach Vibes', 'Relaxed weekend gatherings by the sea'),
      hl('🤝', 'Community Feel', 'Easygoing and welcoming to everyone'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: 'Bofa Beach, Kilifi' },
        { icon: '🍽️', label: 'Cuisine', value: 'Seafood, Mediterranean, Italian' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '🪁', label: 'Plus', value: 'Kitesurfing on site' },
        { icon: '🏡', label: 'Stay', value: 'Accommodation available' },
        { icon: '🕐', label: 'Hours', value: 'Daily, lunch and dinner' },
      ]),
      t("Saltys Beach Bar & Restaurant", 'h2'),
      t("Sitting right on Bofa Beach as part of Saltys Kitesurf Village, this beachfront bar and restaurant captures everything that makes Kilifi coast so appealing. The setting is serene and tranquil, with the Indian Ocean as your backdrop and a laid back atmosphere that invites you to stay longer than you planned. Whether you come for lunch, an afternoon drink, or a relaxed dinner, the vibe is consistently welcoming and unhurried."),
      t("The menu covers solid seafood, Mediterranean flavors, and Italian dishes that pair perfectly with a beach setting. Fresh catch from local waters features prominently, and the kitchen keeps things simple and satisfying. The bar serves cold cocktails and drinks that taste even better with sand between your toes and a sea breeze on your face. It is the kind of place where meals stretch into long afternoons and nobody minds."),
      t('More Than Just Dinner', 'h3'),
      t("What sets Saltys apart is the community feeling that surrounds it. The kitesurf village brings together travelers, kite enthusiasts, and locals who share a love for the ocean. Sunday beach sessions have become a highlight, with people gathering for food, drinks, and good company by the water. If you want to try kitesurfing, lessons and gear are available right on site. Accommodation is also offered for those who want to stay overnight and make it a full coastal experience."),
      tc('tip', '🪁', 'Try Kitesurfing', 'Bofa Beach is one of the best spots on the Kenya coast for kitesurfing. Even if you have never tried it, the team at Saltys offers lessons for beginners. Combine a surf session with a beachfront lunch for the ultimate Kilifi day.'),
      tc('teal', '🌅', 'Sunday Sessions', 'Sundays at Saltys have a special energy. The beach bar fills up with a relaxed crowd, the music is mellow, and the atmosphere feels like a celebration of coastal living. Plan to arrive before sunset for the best experience.'),
      wf('Perfect For', [
        { emoji: '🪁', heading: 'Kitesurfers', text: 'Eat, surf, and stay all in one spot' },
        { emoji: '🏖️', heading: 'Beach Lovers', text: 'Beachfront dining with ocean views and sand' },
        { emoji: '👥', heading: 'Social Travelers', text: 'Community vibe with a welcoming crowd' },
        { emoji: '🌅', heading: 'Sunset Chasers', text: 'Bofa Beach sunsets with a cocktail in hand' },
      ]),
    ],
    seoTitle: "Saltys Beach Bar Kilifi — Bofa Beach Dining",
    seoDescription: "Dine at Saltys on Bofa Beach, Kilifi. Beachfront seafood, cocktails, kitesurfing, and laid back coastal vibes.",
  },

  // ── 3. Saltys On The Creek ───────────────────────
  {
    title: "Saltys On The Creek",
    slug: 'saltys-on-the-creek-kilifi',
    address: 'Mnarani West Creek, Kilifi',
    hostName: "Saltys",
    cuisine: ['Seafood', 'Mediterranean'],
    priceRange: 'fine-dining' as const,
    openingHours: 'Check availability. Accessible only by boat.',
    tags: ['fine-dining', 'kilifi', 'floating', 'creek', 'cocktails', 'oysters', 'exclusive'],
    amenities: ['Sea View'],
    imgUrl: 'https://images.squarespace-cdn.com/content/v1/5cda706c7a1fbd52c62a5572/e4e458c5-bb02-4709-b0b2-18afb3ef1d58/DJI_0013.JPG',
    highlights: [
      hl('🚤', 'Boat Access Only', 'Arrive by boat for an exclusive experience'),
      hl('🦪', 'Creek Oysters', 'Fresh oysters pulled straight from Kilifi Creek'),
      hl('🍸', 'Signature Cocktails', 'Best known for cocktails and small bites'),
      hl('🌅', 'Sunset On The Water', 'Magnificent sunsets from a floating platform'),
      hl('⭐', 'Top 3 in Kilifi', 'Ranked #3 of 28 restaurants on TripAdvisor'),
      hl('👥', 'Max 50 Guests', 'Intimate and exclusive, never crowded'),
    ],
    description: [
      qf('✦ Restaurant Info', 'purple', [
        { icon: '📍', label: 'Location', value: 'Mnarani West Creek, Kilifi' },
        { icon: '🍽️', label: 'Cuisine', value: 'Seafood, Mediterranean, Japanese inspired' },
        { icon: '💰', label: 'Price Range', value: 'Fine Dining' },
        { icon: '🚤', label: 'Access', value: 'By boat only' },
        { icon: '👥', label: 'Capacity', value: 'Maximum 50 guests' },
        { icon: '⭐', label: 'TripAdvisor', value: '#3 of 28, 5.0 rating' },
      ]),
      t("Saltys On The Creek", 'h2'),
      t("This is one of the most unique dining experiences on the Kenya coast. Saltys On The Creek is a floating restaurant on Kilifi Creek, accessible only by boat. That detail alone sets the tone for everything that follows. You step off the boat onto a platform on the water, surrounded by the creek's calm mangrove lined beauty, and you immediately understand why this place has a perfect 5.0 rating and is ranked among the top three restaurants in all of Kilifi."),
      t("The menu is exclusively seafood and vegetarian, drawing inspiration from both Japanese and Mediterranean traditions. Creek oysters are the star of the show, pulled fresh from the waters around you. The smashed cucumber salad is excellent. Small bites and cocktails are what Saltys is best known for, and the drinks are crafted with as much care as the food. With a maximum of just 50 guests at any time, the atmosphere stays intimate, chilled, and effortlessly cool."),
      t('The Sunset Experience', 'h3'),
      t("Timing your visit for sunset is essential. Watching the sky transform over Kilifi Creek from a floating platform, cocktail in hand, oysters on the table, is the kind of experience that stays with you long after you leave. The whole setting feels like something out of a film. It is exclusive without being pretentious, sophisticated without being stuffy, and completely unlike anything else you will find on the coast. Check availability in advance because space is limited and this is no secret among those who know Kilifi."),
      tc('tip', '🦪', 'What to Order', 'Start with the creek oysters and a signature cocktail. Follow with the smashed cucumber salad and whatever seafood small bites are on the menu. This is a place for sharing plates and slow enjoyment rather than rushing through a three course meal.'),
      tc('teal', '🚤', 'Getting There', 'You can only reach Saltys On The Creek by boat. Check with them in advance about availability and boat arrangements. The journey across the creek is part of the experience, so sit back and enjoy the ride.'),
      wf('Perfect For', [
        { emoji: '💑', heading: 'Couples', text: 'Floating sunset dining that feels impossibly romantic' },
        { emoji: '🍸', heading: 'Cocktail Lovers', text: 'Expertly crafted drinks on the water' },
        { emoji: '✨', heading: 'Experience Seekers', text: 'Boat access, floating platform, creek oysters' },
        { emoji: '📸', heading: 'Photographers', text: 'Kilifi Creek sunsets from the water are spectacular' },
      ]),
    ],
    seoTitle: "Saltys On The Creek — Floating Dining Kilifi",
    seoDescription: "Experience Saltys On The Creek in Kilifi. Floating fine dining, creek oysters, cocktails, boat access only. Max 50 guests.",
  },

  // ── 4. Village Dishes ─────────────────────────────
  {
    title: 'Village Dishes',
    slug: 'village-dishes-kilifi',
    address: 'Bofa Road, Kilifi',
    hostName: 'Village Dishes',
    cuisine: ['Kenyan'],
    priceRange: 'budget' as const,
    openingHours: 'Daily for breakfast, lunch, and dinner.',
    tags: ['local', 'kilifi', 'kenyan', 'affordable', 'halal', 'breakfast', 'vegetables'],
    amenities: ['Parking'],
    imgUrl: '',
    highlights: [
      hl('🥬', 'Vegetable Variety', 'Wide selection of fresh vegetable dishes'),
      hl('💰', 'Affordable Prices', 'Generous portions that do not break the bank'),
      hl('🕌', 'Halal', 'All dishes prepared according to halal standards'),
      hl('🍳', 'All Day Dining', 'Breakfast, lunch, and dinner served daily'),
      hl('🧹', 'Very Clean', 'Consistently praised for cleanliness'),
      hl('⭐', '4.0 Stars', '356 reviews on Google'),
    ],
    description: [
      qf('✦ Restaurant Info', 'teal', [
        { icon: '📍', label: 'Location', value: 'Bofa Road, Kilifi' },
        { icon: '🍽️', label: 'Cuisine', value: 'Kenyan, African' },
        { icon: '💰', label: 'Price Range', value: 'Budget Friendly' },
        { icon: '🕌', label: 'Halal', value: 'Yes' },
        { icon: '⭐', label: 'Rating', value: '4.0 stars (356 reviews)' },
        { icon: '🏖️', label: 'Nearby', value: 'Few hundred meters from Bofa Beach' },
      ]),
      t('Village Dishes', 'h2'),
      t("If you want to eat the way locals eat in Kilifi, Village Dishes on Bofa Road is where you go. This is authentic Kenyan food at its best, served in generous portions at prices that feel almost too good to be true. The restaurant has a large seating area that is kept very clean, which reviewers consistently mention and appreciate. With over 350 Google reviews and a solid 4.0 star rating, this is a place that has earned its reputation through years of reliable, honest cooking."),
      t("The menu covers a wide variety of traditional Kenyan dishes with a particular strength in vegetable preparations. If you love greens, stews, and plant based African cuisine, you will find more options here than at most restaurants in the area. Everything is prepared halal, and the kitchen serves breakfast, lunch, and dinner daily. Whether you want a morning cup of chai with chapati or a full evening meal with rice and stewed vegetables, Village Dishes delivers without fuss or pretension."),
      t('The Real Kilifi', 'h3'),
      t("Village Dishes sits just a few hundred meters from Bofa Beach, making it an easy stop before or after time on the sand. This is the kind of restaurant that tourists often walk past but locals swear by. The food is filling, flavorful, and made with care. If you are visiting Kilifi and want to experience dining the way the community does, rather than sticking to tourist facing spots, a meal here will give you a genuine taste of everyday coastal Kenyan life."),
      tc('tip', '🥬', 'Go for the Vegetables', 'Village Dishes is particularly well known for its vegetable dishes. If you are not sure what to order, ask what greens are fresh today and let the kitchen guide you. The stewed vegetables with ugali or rice make a satisfying and affordable meal.'),
      wf('Perfect For', [
        { emoji: '💰', heading: 'Budget Travelers', text: 'Filling meals at genuinely affordable prices' },
        { emoji: '🌿', heading: 'Vegetable Lovers', text: 'Impressive variety of fresh vegetable dishes' },
        { emoji: '🌍', heading: 'Cultural Explorers', text: 'Experience real Kenyan food the local way' },
        { emoji: '🏖️', heading: 'Beach Goers', text: 'Quick walk from Bofa Beach for a proper meal' },
      ]),
    ],
    seoTitle: 'Village Dishes Kilifi — Authentic Kenyan Food',
    seoDescription: 'Eat at Village Dishes in Kilifi. Authentic Kenyan meals, fresh vegetables, halal, affordable. Near Bofa Beach.',
  },

  // ── 5. Apache Indian Cafe ─────────────────────────
  {
    title: 'Apache Indian Cafe',
    slug: 'apache-indian-cafe-kilifi',
    address: 'Kilifi Town Center, near Kilifi Market',
    hostName: 'Apache Indian',
    cuisine: ['Indian', 'Kenyan'],
    priceRange: 'budget' as const,
    openingHours: 'Daily for lunch and dinner.',
    tags: ['indian', 'kilifi', 'local', 'affordable', 'chapati', 'beans', 'coconut'],
    amenities: [],
    imgUrl: '',
    highlights: [
      hl('🥥', 'Coconut Beans', 'The recommended dish that keeps people coming back'),
      hl('🥬', 'Coconut Spinach', 'A must try that regulars rave about'),
      hl('🫓', 'Beans and Chapati', 'Classic combo done perfectly here'),
      hl('⚡', 'Quick Service', 'Fast and efficient even during busy hours'),
      hl('💰', 'Very Affordable', 'Great food without spending much'),
      hl('⭐', '3.9 Stars', '316 reviews on Google'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: 'Kilifi Town Center, near Kilifi Market' },
        { icon: '🍽️', label: 'Cuisine', value: 'Indian, Kenyan' },
        { icon: '💰', label: 'Price Range', value: 'Budget Friendly' },
        { icon: '⭐', label: 'Rating', value: '3.9 stars (316 reviews)' },
        { icon: '📍', label: 'Landmark', value: 'Near Kilifi Post Office' },
        { icon: '🕐', label: 'Hours', value: 'Daily, lunch and dinner' },
      ]),
      t('Apache Indian Cafe', 'h2'),
      t("Apache Indian Cafe sits right in the heart of Kilifi Town Center, near the market and Post Office, and serves the kind of food that locals eat day in and day out. The menu blends Indian and Kenyan flavors in dishes that are simple, satisfying, and incredibly affordable. With over 300 Google reviews, this is one of those neighborhood spots that has been feeding the community reliably for years and has built a loyal following through honest, consistent cooking."),
      t("The standout dishes here revolve around coconut. The coconut beans are the most recommended item on the menu and for good reason. They are rich, flavorful, and comforting in the way only a well made pot of beans can be. The coconut spinach is a must try that regulars specifically point out to newcomers. Pair either with fresh chapati and you have a meal that is both filling and memorable. The beans and chapati combination is a classic that Apache Indian executes with real skill."),
      t('Quick and Honest', 'h3'),
      t("One of the things people appreciate most about Apache Indian Cafe is the speed of service. The kitchen moves efficiently, which makes it a great option if you are exploring Kilifi Town and need a satisfying meal without a long wait. There are no pretensions here. It is straightforward, affordable food made well, served quickly, in the middle of town where local life happens around you. For travelers who want to eat beyond the tourist trail, this is exactly the kind of place worth seeking out."),
      tc('tip', '🥥', 'Top Recommendations', 'Start with the coconut beans and chapati. If you are hungry, add the coconut spinach on the side. These are the dishes that regulars recommend above everything else, and they represent some of the best value for money dining in Kilifi.'),
      wf('Perfect For', [
        { emoji: '💰', heading: 'Budget Diners', text: 'Incredible value for delicious, filling meals' },
        { emoji: '🌍', heading: 'Local Food Seekers', text: 'Authentic Indian and Kenyan flavors' },
        { emoji: '⚡', heading: 'Quick Meals', text: 'Fast service when you are short on time' },
        { emoji: '🚶', heading: 'Town Explorers', text: 'Central location near the market and Post Office' },
      ]),
    ],
    seoTitle: 'Apache Indian Cafe Kilifi — Indian & Kenyan Food',
    seoDescription: 'Try Apache Indian Cafe in Kilifi. Coconut beans, chapati, Indian and Kenyan dishes. Quick service, affordable prices.',
  },

  // ── 6. Fayaz Bakery Kilifi ────────────────────────
  {
    title: 'Fayaz Bakery Kilifi',
    slug: 'fayaz-bakery-kilifi',
    address: 'Kilifi Town',
    hostName: 'Fayaz Bakers Ltd',
    cuisine: ['Kenyan'],
    priceRange: 'budget' as const,
    openingHours: 'Daily from early morning.',
    tags: ['bakery', 'kilifi', 'samosas', 'kebabs', 'bread', 'affordable', 'family'],
    amenities: ['Parking'],
    imgUrl: '',
    highlights: [
      hl('🥟', 'Famous Samosas', 'The samosas that built a century old reputation'),
      hl('🍢', 'Great Kebabs', 'Perfectly spiced and always satisfying'),
      hl('🥧', 'Must Try Meat Pie', 'A local favorite you should not miss'),
      hl('🍞', 'Excellent Brown Bread', 'Fresh baked daily, consistently praised'),
      hl('🍨', 'Delicious Kulfi', 'Traditional frozen dessert done right'),
      hl('🏛️', '100+ Year Tradition', 'Family baking heritage from the Mombasa coast'),
    ],
    description: [
      qf('✦ Restaurant Info', 'teal', [
        { icon: '📍', label: 'Location', value: 'Kilifi Town' },
        { icon: '🍽️', label: 'Type', value: 'Bakery and Cafe' },
        { icon: '💰', label: 'Price Range', value: 'Budget Friendly' },
        { icon: '🏛️', label: 'Heritage', value: '100+ year family baking tradition' },
        { icon: '🏪', label: 'Chain', value: '8 branches across the coast' },
        { icon: '🕐', label: 'Hours', value: 'Daily from early morning' },
      ]),
      t('Fayaz Bakery Kilifi', 'h2'),
      t("Fayaz Bakery is one of those coastal institutions that has been feeding families for over a century. The Fayaz Bakers family tradition started on the Mombasa coast and has grown to eight branches across the region, with the Kilifi location being a firm favorite among locals and visitors alike. This is not just a bakery. It is a piece of Kenya's coastal food heritage, and everything that comes out of their ovens carries the weight of generations of baking knowledge."),
      t("The samosas are what Fayaz is most famous for, and they live up to every bit of their reputation. Crispy, perfectly filled, and deeply satisfying. The kebabs are excellent, well spiced and generously portioned. The meat pie is a must try that locals will specifically recommend. For something sweet, the kulfi is a traditional frozen treat that makes a perfect end to any meal. And then there is the bread. The brown bread in particular is consistently praised and many people visit Fayaz specifically for a fresh loaf."),
      t('The Kilifi Branch', 'h3'),
      t("The Kilifi branch has a nice garden area that makes it a pleasant spot to sit and eat rather than just grabbing takeaway. Prices are genuinely affordable, making it easy to try multiple items in one visit. Whether you stop by for a quick samosa in the morning, pick up fresh bread for the day, or sit down for kebabs and a meat pie, Fayaz delivers amazing food at prices that feel like a gift. For anyone visiting Kilifi, this is an essential stop that connects you to the flavors the coast has been enjoying for over a hundred years."),
      tc('tip', '🥟', 'The Essentials', 'Get the samosas, a meat pie, and some kebabs. If you have room, try the kulfi for dessert. Grab a loaf of the brown bread to take home. You will spend very little and eat very well.'),
      tc('teal', '🌿', 'Garden Seating', 'The Kilifi branch has a garden area where you can sit and enjoy your food in the shade. It is a much nicer experience than takeaway and worth the extra few minutes.'),
      wf('Perfect For', [
        { emoji: '💰', heading: 'Budget Eaters', text: 'Amazing food at prices that feel impossible' },
        { emoji: '🥟', heading: 'Snack Lovers', text: 'Samosas, kebabs, pies, and kulfi' },
        { emoji: '🍞', heading: 'Bread Fans', text: 'Some of the best fresh bread on the coast' },
        { emoji: '🏛️', heading: 'Food Heritage Seekers', text: 'A century of coastal baking tradition' },
      ]),
    ],
    seoTitle: 'Fayaz Bakery Kilifi — Samosas, Kebabs & Fresh Bread',
    seoDescription: 'Visit Fayaz Bakery in Kilifi. 100 year old bakery tradition, famous samosas, kebabs, meat pies, fresh bread.',
  },

  // ── 7. Indigo Vibe Cafe ───────────────────────────
  {
    title: 'Indigo Vibe Cafe',
    slug: 'indigo-vibe-cafe-kilifi',
    address: 'Kilifi Town',
    hostName: 'Indigo Vibe',
    cuisine: ['Mediterranean', 'Kenyan'],
    priceRange: 'mid-range' as const,
    openingHours: 'Tue to Thu & Sun: 9 AM to 8 PM. Fri & Sat: 9 AM to 10 PM. Closed Mondays.',
    tags: ['cafe', 'kilifi', 'coffee', 'brunch', 'bohemian', 'remote-work', 'sandwiches'],
    amenities: ['WiFi'],
    imgUrl: '',
    highlights: [
      hl('🥪', 'Best Sandwiches in Kilifi', 'Rave reviews for the sandwich menu'),
      hl('☕', 'Highland Coffee Beans', 'Freshly ground specialty coffee'),
      hl('🎨', 'Local Art', 'Walls adorned with work from local artists'),
      hl('💻', 'Remote Work Friendly', 'WiFi and comfortable seating for working'),
      hl('🛍️', 'Boutique Shops', 'On site shops and creative workshops'),
      hl('🌿', 'Bohemian Aesthetic', 'Rustic wood, cascading greenery, curated style'),
    ],
    description: [
      qf('✦ Restaurant Info', 'purple', [
        { icon: '📍', label: 'Location', value: 'Kilifi Town' },
        { icon: '🍽️', label: 'Cuisine', value: 'Mediterranean, Kenyan' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '📶', label: 'WiFi', value: 'Available' },
        { icon: '🕐', label: 'Hours', value: 'Tue to Sun (closed Mondays)' },
        { icon: '🍷', label: 'Drinks', value: 'Coffee, wine, and more' },
      ]),
      t('Indigo Vibe Cafe', 'h2'),
      t("Indigo Vibe Cafe is one of Kilifi hidden gems, a place where bohemian style meets the calm of the coast. Step inside and you are greeted by rustic wooden furniture, cascading greenery draping from every corner, and walls covered in work by local artists. The aesthetic is carefully curated without feeling forced. It is the kind of space that makes you want to sit down, order something, and stay for hours. For solo travelers, remote workers, and anyone who appreciates a beautiful setting, this place hits every note."),
      t("The sandwiches at Indigo Vibe are widely considered the best in Kilifi. Reviews consistently single them out, and once you try one you understand why. The coffee is equally impressive, made from freshly ground highland beans and prepared with genuine care. Breakfast is a curated affair that looks as good as it tastes. The menu also covers Mediterranean and Kenyan dishes, and wine is available for those who want to linger into the evening. On Fridays and Saturdays the cafe stays open until 10 PM."),
      t('A Creative Space', 'h3'),
      t("Beyond the food and coffee, Indigo Vibe functions as a creative hub. Boutique shops on site sell unique finds, and workshops are held regularly. The WiFi makes it a natural choice for digital nomads and remote workers who want a workspace with more character than a hotel lobby. The atmosphere is warm and welcoming, the kind of place where you nod at the person at the next table and end up in conversation. Closed on Mondays, so plan accordingly."),
      tc('tip', '🥪', 'The Sandwiches', 'Order whatever sandwich catches your eye. They are all excellent and they are the thing Indigo Vibe is most famous for. Pair one with a freshly ground coffee and you have the best lunch in Kilifi Town.'),
      tc('teal', '💻', 'Work From Kilifi', 'If you are a remote worker, Indigo Vibe is your Kilifi office. The WiFi works, the coffee is great, the seating is comfortable, and the atmosphere is inspiring without being distracting. Friday and Saturday evenings are more social.'),
      wf('Perfect For', [
        { emoji: '💻', heading: 'Remote Workers', text: 'WiFi, good coffee, and a beautiful workspace' },
        { emoji: '🎨', heading: 'Creative Souls', text: 'Local art, boutique shops, and bohemian style' },
        { emoji: '🥪', heading: 'Brunch Lovers', text: 'The best sandwiches and curated breakfast in town' },
        { emoji: '🚶', heading: 'Solo Travelers', text: 'Welcoming atmosphere where connections happen naturally' },
      ]),
    ],
    seoTitle: 'Indigo Vibe Cafe Kilifi — Coffee, Brunch & Bohemian',
    seoDescription: 'Discover Indigo Vibe Cafe in Kilifi. Best sandwiches, specialty coffee, bohemian atmosphere, local art and boutiques.',
  },

  // ── 8. Bahari Pizza & Coffee ──────────────────────
  {
    title: 'Bahari Pizza & Coffee',
    slug: 'bahari-pizza-coffee-kilifi',
    address: 'Kilifi Town',
    hostName: 'Bahari Pizza',
    cuisine: ['Italian'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily.',
    tags: ['pizza', 'kilifi', 'coffee', 'italian', 'casual', 'pastries'],
    amenities: ['WiFi', 'Parking'],
    imgUrl: '',
    highlights: [
      hl('🍕', 'Authentic Italian Pizza', 'Variety of toppings with quality ingredients'),
      hl('☕', 'Specialty Coffee', 'Espressos, cappuccinos, and more'),
      hl('🥐', 'Fresh Pastries', 'Selection of baked treats and snacks'),
      hl('🛋️', 'Cozy Atmosphere', 'Inviting space for relaxing or socializing'),
      hl('📶', 'WiFi Available', 'Stay connected while you eat'),
      hl('😊', 'Friendly Service', 'Staff that make you feel welcome'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: 'Kilifi Town' },
        { icon: '🍽️', label: 'Cuisine', value: 'Italian' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '📶', label: 'WiFi', value: 'Available' },
        { icon: '🅿️', label: 'Parking', value: 'Available' },
        { icon: '🌐', label: 'Website', value: 'baharipizzaandcoffee.com' },
      ]),
      t('Bahari Pizza & Coffee', 'h2'),
      t("Bahari Pizza & Coffee brings authentic Italian pizza to the heart of Kilifi Town, and does it with the kind of warmth and consistency that turns first time visitors into regulars. The pizza is the main attraction, made with quality ingredients and available with a variety of toppings that cater to every preference. Whether you like your pizza classic and simple or loaded with extras, the kitchen delivers a proper pie that satisfies the craving every time."),
      t("Beyond pizza, Bahari has built a strong reputation for its specialty coffee program. Espressos, cappuccinos, lattes, and other coffee drinks are all prepared with care. There is also a selection of fresh pastries and snacks that pair perfectly with an afternoon coffee break. The atmosphere inside is cozy and inviting, the kind of space that works equally well for a casual catch up with friends, a quiet solo coffee, or a family dinner."),
      t('Your Kilifi Pizza Spot', 'h3'),
      t("What makes Bahari work is the combination of quality food, friendly service, and a comfortable setting. WiFi and parking are both available, which makes it practical for longer visits. The staff are genuinely welcoming and remember their regulars. It is the type of neighborhood spot that every town needs, where the food is reliably good, the coffee is always fresh, and you always feel at home. For pizza and coffee in Kilifi, Bahari is the easy choice."),
      tc('tip', '🍕', 'Pizza and Coffee Combo', 'Bahari works great at any time of day. Stop by for a morning espresso and pastry, come for pizza at lunch, or make it your casual dinner spot. The pizza and coffee combination is what they do best.'),
      wf('Perfect For', [
        { emoji: '🍕', heading: 'Pizza Lovers', text: 'Authentic Italian pizza with quality toppings' },
        { emoji: '☕', heading: 'Coffee Drinkers', text: 'Specialty espresso and cappuccino' },
        { emoji: '👨‍👩‍👧', heading: 'Families', text: 'Casual, welcoming, and something for everyone' },
        { emoji: '💻', heading: 'Casual Workers', text: 'WiFi, parking, and a comfortable space to sit' },
      ]),
    ],
    seoTitle: 'Bahari Pizza & Coffee Kilifi — Italian Pizza & Espresso',
    seoDescription: 'Eat at Bahari Pizza in Kilifi. Authentic Italian pizza, specialty coffee, pastries. Cozy atmosphere, friendly service.',
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
