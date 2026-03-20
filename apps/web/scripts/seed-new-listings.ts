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

function highlight(emoji: string, title: string, description: string) {
  return { _type: 'object', _key: key(), emoji, title, description }
}

const listings: any[] = [
  // ═══════════════════════════════════════════════════════
  // SERVICES — SUPERMARKETS
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'New Carrefour Supermarket',
    slug: { _type: 'slug', current: 'new-carrefour-supermarket-watamu' },
    type: 'service',
    subcategory: 'supermarkets',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu Main Road, Watamu',
    description: [
      textBlock('New Carrefour Supermarket — Watamu', 'h2'),
      textBlock('The go-to supermarket in Watamu for everyday essentials, fresh produce, and imported goods. New Carrefour is one of the largest and most well-stocked stores in town, serving both locals and visitors with a wide range of products at competitive prices.'),
      textBlock('What You\'ll Find', 'h3'),
      textBlock('Fresh fruits, vegetables, and dairy products sourced locally. A full range of household goods, cleaning supplies, toiletries, and personal care items. Imported snacks, wines, cheeses, and specialty items that are hard to find elsewhere on the coast. Cold beverages, water, and soft drinks always available.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Open daily from early morning to late evening. Located on the main Watamu road, easily accessible by TukTuk or motorbike. M-Pesa and cash accepted. Stock up here before heading to your accommodation — especially useful for self-catering stays and villas.'),
    ],
    tags: ['supermarket', 'watamu', 'groceries', 'essentials', 'fresh-produce', 'imported-goods'],
    amenities: ['Parking'],
    highlights: [
      highlight('🛒', 'Well-Stocked', 'Wide range of local and imported goods'),
      highlight('🥬', 'Fresh Produce', 'Daily fresh fruits, vegetables, and dairy'),
      highlight('🍷', 'Imported Items', 'Wines, cheeses, and specialty products'),
      highlight('💳', 'M-Pesa Accepted', 'Pay by mobile money or cash'),
      highlight('🕐', 'Long Hours', 'Open early morning to late evening daily'),
      highlight('📍', 'Central Location', 'On the main Watamu road'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'New Carrefour Supermarket Watamu — Groceries & Essentials',
    seoDescription: 'Shop at New Carrefour Supermarket in Watamu. Fresh produce, imported goods, household essentials. M-Pesa accepted. Open daily.',
    bookingType: 'contact_form',
  },
  {
    _type: 'listing',
    title: 'Halashymia Supermarket',
    slug: { _type: 'slug', current: 'halashymia-supermarket-watamu' },
    type: 'service',
    subcategory: 'supermarkets',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu Town Centre, Watamu',
    description: [
      textBlock('Halashymia Supermarket — Watamu', 'h2'),
      textBlock('A well-known local supermarket in the heart of Watamu town. Halashymia has been serving the community for years and is a trusted spot for daily shopping. Known for its competitive prices and friendly service, it\'s a favourite among long-term residents and returning visitors.'),
      textBlock('What You\'ll Find', 'h3'),
      textBlock('Basic groceries, fresh bread, rice, flour, cooking oils, and spices. Cold drinks, water, and snacks. Household cleaning products, toiletries, and personal care items. A selection of local and imported packaged foods. Phone credit top-ups and basic hardware items also available.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Located in Watamu town centre, within walking distance of the main junction. Open daily. M-Pesa and cash accepted. A convenient stop for quick errands — pick up what you need without the hassle of travelling to Malindi or Kilifi.'),
    ],
    tags: ['supermarket', 'watamu', 'groceries', 'essentials', 'local-shop', 'affordable'],
    amenities: [],
    highlights: [
      highlight('🛒', 'Daily Essentials', 'Groceries, bread, spices, and household items'),
      highlight('💰', 'Affordable Prices', 'Competitive pricing for everyday goods'),
      highlight('📍', 'Town Centre', 'Walking distance from Watamu main junction'),
      highlight('📱', 'M-Pesa Accepted', 'Mobile money and cash payments'),
      highlight('🕐', 'Open Daily', 'Convenient opening hours'),
      highlight('🤝', 'Local Favourite', 'Trusted by residents and regular visitors'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Halashymia Supermarket Watamu — Affordable Groceries & Essentials',
    seoDescription: 'Shop at Halashymia Supermarket in Watamu town centre. Affordable groceries, daily essentials, and household items. M-Pesa accepted.',
    bookingType: 'contact_form',
  },
  {
    _type: 'listing',
    title: 'Nivas Supermarket',
    slug: { _type: 'slug', current: 'nivas-supermarket-kilifi' },
    type: 'service',
    subcategory: 'supermarkets',
    status: 'published',
    city: 'Kilifi',
    county: 'Kilifi',
    address: 'Kilifi Town Centre, Kilifi',
    description: [
      textBlock('Nivas Supermarket — Kilifi', 'h2'),
      textBlock('The largest and most comprehensive supermarket in Kilifi town. Nivas is a household name across Kenya\'s coast and offers everything from fresh produce and meats to electronics and clothing. If you need to do a big shop on the coast, this is the place.'),
      textBlock('What You\'ll Find', 'h3'),
      textBlock('Full grocery section with fresh fruits, vegetables, meats, and dairy. A bakery with fresh bread and pastries daily. Household goods, kitchenware, electronics, and appliances. A clothing and textiles section. Baby products, toiletries, and pharmacy essentials. Imported goods, wines, and specialty items.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Located in Kilifi town centre with ample parking. Open daily from 8 AM to 9 PM. Accepts M-Pesa, Visa, and cash. If you\'re staying in Watamu or along the coast, Nivas is worth the 30-minute drive for a full stock-up — especially for villa or Airbnb stays.'),
    ],
    tags: ['supermarket', 'kilifi', 'groceries', 'essentials', 'fresh-produce', 'one-stop-shop'],
    amenities: ['Parking'],
    highlights: [
      highlight('🏬', 'Largest in Kilifi', 'Most comprehensive supermarket in the area'),
      highlight('🥩', 'Fresh Meats & Bakery', 'Daily fresh bread, pastries, and butchery'),
      highlight('🛍️', 'One-Stop Shop', 'Groceries, electronics, clothing, and more'),
      highlight('💳', 'Cards Accepted', 'M-Pesa, Visa, and cash payments'),
      highlight('🅿️', 'Ample Parking', 'Large parking area in town centre'),
      highlight('🕐', 'Open 8 AM – 9 PM', 'Convenient daily hours'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Nivas Supermarket Kilifi — Largest Supermarket on the Coast',
    seoDescription: 'Shop at Nivas Supermarket in Kilifi. Fresh produce, bakery, electronics, clothing. Cards and M-Pesa accepted. Open daily 8 AM – 9 PM.',
    bookingType: 'contact_form',
  },

  // ═══════════════════════════════════════════════════════
  // STAYS — BOUTIQUE HOTELS
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Zuri Boutique Hotel',
    slug: { _type: 'slug', current: 'zuri-boutique-hotel-watamu' },
    type: 'stay',
    subcategory: 'boutique_hotel',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu, Kilifi County',
    price: 15000,
    priceUnit: 'night',
    description: [
      textBlock('Zuri Boutique Hotel — Watamu', 'h2'),
      textBlock('A stylish boutique hotel in Watamu offering a blend of modern comfort and coastal charm. Zuri (meaning "beautiful" in Swahili) delivers an intimate, design-forward stay with personalized service — perfect for couples, solo travellers, and creatives seeking a refined coastal escape.'),
      textBlock('Rooms & Amenities', 'h3'),
      textBlock('Beautifully designed rooms with en-suite bathrooms, air conditioning, and high-quality linens. Each room features curated decor with local art and natural materials. Complimentary Wi-Fi throughout the property. Communal lounge and terrace areas for relaxation. Daily housekeeping included.'),
      textBlock('Location & Getting Around', 'h3'),
      textBlock('Situated in a quiet area of Watamu, within easy reach of the main beaches and restaurants. The hotel can arrange airport transfers from Malindi (approx. 20 minutes) and local transport. Walking distance to beach bars and dining options. Ideal as a base for exploring Watamu\'s beaches, Mida Creek, and the marine park.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Check-in from 2 PM, check-out by 11 AM. Breakfast included in the rate. The hotel can arrange excursions including kitesurfing lessons, dhow cruises, snorkeling trips, and visits to Gede Ruins. Dietary requirements accommodated with advance notice.'),
    ],
    tags: ['boutique', 'watamu', 'hotel', 'design', 'couples', 'wifi', 'breakfast-included'],
    amenities: ['WiFi', 'Air Conditioning', 'Parking', 'Sea View', 'Restaurant'],
    highlights: [
      highlight('🏨', 'Boutique Design', 'Curated rooms with local art and natural materials'),
      highlight('🍳', 'Breakfast Included', 'Daily breakfast with local and international options'),
      highlight('📶', 'Free Wi-Fi', 'Reliable internet throughout the property'),
      highlight('❄️', 'Air Conditioning', 'Climate-controlled rooms for your comfort'),
      highlight('🧳', 'Transfer Service', 'Airport pickup from Malindi arranged'),
      highlight('🤿', 'Excursions', 'Kitesurfing, snorkeling, and dhow cruises bookable'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Zuri Boutique Hotel Watamu — Stylish Coastal Stay',
    seoDescription: 'Stay at Zuri Boutique Hotel in Watamu. Design-forward rooms, breakfast included, free Wi-Fi. Perfect for couples and solo travellers.',
    bookingType: 'contact_form',
  },
  {
    _type: 'listing',
    title: 'Palm Garden Boutique Hotel',
    slug: { _type: 'slug', current: 'palm-garden-boutique-hotel-watamu' },
    type: 'stay',
    subcategory: 'boutique_hotel',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu, Kilifi County',
    price: 18000,
    priceUnit: 'night',
    description: [
      textBlock('Palm Garden Boutique Hotel — Watamu', 'h2'),
      textBlock('An elegant boutique hotel nestled among tropical gardens in Watamu. Palm Garden combines Italian-inspired hospitality with Kenyan coastal warmth, offering a tranquil retreat just minutes from the beach. Home to the acclaimed Mannis Restaurant & Cocktail Bar.'),
      textBlock('Rooms & Amenities', 'h3'),
      textBlock('Spacious rooms and suites surrounded by lush tropical gardens. Each room features en-suite bathroom, air conditioning, mosquito nets, and a private balcony or terrace. Swimming pool set among palm trees and tropical plants. Complimentary Wi-Fi, daily housekeeping, and 24-hour reception.'),
      textBlock('Dining', 'h3'),
      textBlock('Mannis Restaurant & Cocktail Bar is the hotel\'s signature dining venue, serving refined Italian and Mediterranean cuisine with fresh local seafood. Breakfast is included in the room rate and served in the garden terrace. The cocktail bar offers handcrafted drinks and an extensive wine list.'),
      textBlock('Location & Getting Around', 'h3'),
      textBlock('Located in a peaceful residential area of Watamu, a short walk or TukTuk ride from the main beaches. The hotel arranges Malindi airport transfers and local excursions. Perfectly positioned for exploring Garoda Beach, Jacaranda Beach, and Mida Creek.'),
    ],
    tags: ['boutique', 'watamu', 'hotel', 'pool', 'garden', 'italian', 'romantic', 'breakfast-included'],
    amenities: ['WiFi', 'Air Conditioning', 'Parking', 'Pool', 'Restaurant', 'Bar'],
    highlights: [
      highlight('🌴', 'Tropical Gardens', 'Lush palm gardens surrounding the property'),
      highlight('🏊', 'Swimming Pool', 'Pool set among palm trees and tropical plants'),
      highlight('🍽️', 'Mannis Restaurant', 'Award-worthy Italian dining on-site'),
      highlight('🍹', 'Cocktail Bar', 'Handcrafted cocktails and wine list'),
      highlight('🍳', 'Breakfast Included', 'Daily breakfast on the garden terrace'),
      highlight('🛏️', 'Private Terraces', 'Each room with balcony or terrace'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Palm Garden Boutique Hotel Watamu — Tropical Garden Retreat',
    seoDescription: 'Stay at Palm Garden Boutique Hotel in Watamu. Pool, tropical gardens, Mannis Restaurant, breakfast included. A refined coastal retreat.',
    bookingType: 'contact_form',
  },
  {
    _type: 'listing',
    title: 'Maya Kobe Boutique Hotel',
    slug: { _type: 'slug', current: 'maya-kobe-boutique-hotel-kilifi' },
    type: 'stay',
    subcategory: 'boutique_hotel',
    status: 'published',
    city: 'Kilifi',
    county: 'Kilifi',
    address: 'Kilifi, Kilifi County',
    price: 12000,
    priceUnit: 'night',
    description: [
      textBlock('Maya Kobe Boutique Hotel — Kilifi', 'h2'),
      textBlock('A contemporary boutique hotel in Kilifi that blends modern design with the laid-back coastal lifestyle. Maya Kobe offers a stylish yet affordable stay for travellers who want comfort without compromise. Ideal for digital nomads, couples, and anyone exploring the Kilifi coast.'),
      textBlock('Rooms & Amenities', 'h3'),
      textBlock('Modern rooms with clean lines, quality furnishings, and en-suite bathrooms. Air conditioning and ceiling fans in all rooms. Complimentary high-speed Wi-Fi — great for remote work. Communal workspace and lounge area. Daily housekeeping and fresh towels.'),
      textBlock('Location & Surroundings', 'h3'),
      textBlock('Kilifi is a creative hub on Kenya\'s coast, known for its bohemian atmosphere, excellent restaurants, and the stunning Kilifi Creek. The hotel is well-positioned for exploring Bofa Beach, the creek, and Kilifi\'s vibrant food scene. A 30-minute drive from Watamu and 1 hour from Mombasa.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Check-in from 2 PM, check-out by 11 AM. Breakfast available at an additional cost. The hotel can arrange day trips to Watamu, Malindi, and local cultural sites. Kilifi is also a gateway to the Arabuko-Sokoke Forest, the largest coastal forest in East Africa.'),
    ],
    tags: ['boutique', 'kilifi', 'hotel', 'modern', 'wifi', 'digital-nomad', 'affordable'],
    amenities: ['WiFi', 'Air Conditioning', 'Parking'],
    highlights: [
      highlight('🏨', 'Modern Design', 'Contemporary rooms with quality furnishings'),
      highlight('💻', 'Remote Work Ready', 'High-speed Wi-Fi and workspace area'),
      highlight('❄️', 'Air Conditioning', 'Climate-controlled rooms'),
      highlight('💰', 'Great Value', 'Boutique quality at affordable rates'),
      highlight('📍', 'Kilifi Location', 'Gateway to creek, beaches, and food scene'),
      highlight('🚗', 'Day Trips', 'Easy access to Watamu, Malindi, and forests'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Maya Kobe Boutique Hotel Kilifi — Modern Coastal Stay',
    seoDescription: 'Stay at Maya Kobe Boutique Hotel in Kilifi. Modern rooms, high-speed Wi-Fi, great value. Ideal for digital nomads and couples.',
    bookingType: 'contact_form',
  },

  // ═══════════════════════════════════════════════════════
  // STAYS — UNIQUE STAYS
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Treehouse Watamu',
    slug: { _type: 'slug', current: 'treehouse-watamu' },
    type: 'stay',
    subcategory: 'unique_stay',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu, Kilifi County',
    price: 8000,
    priceUnit: 'night',
    description: [
      textBlock('Treehouse Watamu', 'h2'),
      textBlock('Sleep among the treetops in this unique elevated stay in Watamu. The Treehouse offers an unforgettable experience — waking up to birdsong, ocean breezes through the canopy, and a sense of adventure that no standard hotel room can match. A bucket-list stay on Kenya\'s coast.'),
      textBlock('The Space', 'h3'),
      textBlock('An elevated wooden structure built within and around living trees, designed to immerse you in nature while maintaining comfort. Features a comfortable bed with quality linens and mosquito nets, open-air bathroom with a view, and a private deck for stargazing and morning coffee. Solar-powered lighting and charging points for devices.'),
      textBlock('The Experience', 'h3'),
      textBlock('Fall asleep to the sounds of the forest and ocean. Watch colobus monkeys, birds, and butterflies from your private deck. The treehouse is surrounded by tropical vegetation, offering complete privacy while being close to Watamu\'s beaches and restaurants.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Best suited for couples and adventurous solo travellers. Not recommended for young children or those with mobility issues due to the elevated access. Bring a torch for nighttime navigation. The host provides a welcome pack with water, fruit, and snacks. Beach towels and basic toiletries included.'),
    ],
    tags: ['treehouse', 'watamu', 'unique', 'nature', 'romantic', 'adventure', 'eco'],
    amenities: ['Sea View', 'Pet Friendly'],
    highlights: [
      highlight('🌳', 'Sleep in the Trees', 'Elevated wooden treehouse among the canopy'),
      highlight('🐒', 'Wildlife', 'Monkeys, birds, and butterflies from your deck'),
      highlight('🌟', 'Stargazing', 'Private deck with unobstructed sky views'),
      highlight('🔋', 'Solar Powered', 'Eco-friendly with charging points'),
      highlight('🧺', 'Welcome Pack', 'Water, fruit, snacks, and beach towels'),
      highlight('🏖️', 'Near the Beach', 'Short distance to Watamu\'s best beaches'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Treehouse Watamu — Unique Stay Among the Treetops',
    seoDescription: 'Stay in a treehouse in Watamu. Unique elevated stay, wildlife, stargazing, and ocean breezes. A bucket-list experience on Kenya\'s coast.',
    bookingType: 'contact_form',
  },
  {
    _type: 'listing',
    title: 'Horsebay Watamu',
    slug: { _type: 'slug', current: 'horsebay-watamu' },
    type: 'stay',
    subcategory: 'unique_stay',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu, Kilifi County',
    price: 12000,
    priceUnit: 'night',
    description: [
      textBlock('Horsebay Watamu', 'h2'),
      textBlock('A one-of-a-kind coastal retreat in Watamu that combines unique architecture with the charm of beachside living. Horsebay offers an experience-driven stay where the accommodation itself becomes part of the adventure — think characterful design, open-air living, and direct access to the natural beauty of the Kenya coast.'),
      textBlock('The Space', 'h3'),
      textBlock('Creatively designed accommodation with unique architectural features that set it apart from standard hotels. Open-plan living areas that flow between indoor and outdoor spaces. Comfortable bedding with mosquito nets, en-suite facilities, and thoughtful touches throughout. A communal area for guests to connect over meals and stories.'),
      textBlock('What Makes It Special', 'h3'),
      textBlock('Horsebay is not just a place to sleep — it\'s a place to experience. The property is designed to immerse you in the coastal environment while offering genuine comfort. Morning yoga sessions, beach access, and a community of like-minded travellers make this more than just accommodation.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Suitable for couples, solo adventurers, and small groups. The host provides local tips and can arrange excursions to nearby attractions including kitesurfing, dhow cruises, and snorkeling. Breakfast can be arranged. Located within easy reach of Watamu\'s restaurants and beaches.'),
    ],
    tags: ['unique-stay', 'watamu', 'design', 'beachside', 'community', 'yoga', 'creative'],
    amenities: ['Sea View', 'WiFi'],
    highlights: [
      highlight('🏡', 'Unique Design', 'Characterful architecture unlike any hotel'),
      highlight('🧘', 'Morning Yoga', 'Optional yoga sessions for guests'),
      highlight('🏖️', 'Beach Access', 'Direct access to the coast'),
      highlight('🤝', 'Community Vibe', 'Meet like-minded travellers'),
      highlight('🗺️', 'Local Excursions', 'Kitesurfing, snorkeling, dhow cruises arranged'),
      highlight('🌅', 'Open-Air Living', 'Indoor-outdoor spaces with ocean breezes'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Horsebay Watamu — Unique Coastal Stay with Character',
    seoDescription: 'Stay at Horsebay in Watamu. Unique design, beach access, yoga, and community vibes. A one-of-a-kind coastal experience.',
    bookingType: 'contact_form',
  },

  // ═══════════════════════════════════════════════════════
  // SERVICES — WELLNESS (GYM)
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Gim & Tonic',
    slug: { _type: 'slug', current: 'gim-and-tonic-watamu' },
    type: 'service',
    subcategory: 'wellness_service',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu, Kilifi County',
    price: 500,
    priceUnit: 'session',
    description: [
      textBlock('Gim & Tonic — Watamu', 'h2'),
      textBlock('The gym in Watamu for anyone who wants to stay fit while on the coast. Gim & Tonic offers a well-equipped workout space with a fun, social atmosphere — because staying active shouldn\'t stop just because you\'re on holiday. Popular with both residents and visitors.'),
      textBlock('Facilities & Equipment', 'h3'),
      textBlock('Free weights including dumbbells and barbells. Weight machines for all major muscle groups. Cardio equipment including treadmills and stationary bikes. Functional training area with kettlebells, resistance bands, and TRX. Outdoor workout space for stretching and bodyweight exercises. Changing rooms and shower facilities.'),
      textBlock('Membership & Pricing', 'h3'),
      textBlock('Flexible options to suit your stay: day passes, weekly passes, and monthly memberships available. No long-term commitment required — perfect for travellers and short-term visitors. Group sessions and personal training can be arranged on request.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Open daily with morning and evening sessions. Bring your own water bottle and towel. The gym has a relaxed, welcoming atmosphere — all fitness levels welcome. Great way to meet other active people in Watamu. Ask about sunset workout sessions.'),
    ],
    tags: ['gym', 'watamu', 'fitness', 'wellness', 'workout', 'day-pass', 'social'],
    amenities: ['Parking'],
    highlights: [
      highlight('💪', 'Full Equipment', 'Free weights, machines, cardio, and functional'),
      highlight('🎫', 'Day Passes', 'No commitment — perfect for travellers'),
      highlight('🌅', 'Outdoor Area', 'Workout space with coastal vibes'),
      highlight('🚿', 'Changing Rooms', 'Showers and changing facilities'),
      highlight('👥', 'Social Atmosphere', 'Meet active locals and travellers'),
      highlight('🏋️', 'Personal Training', 'One-on-one sessions available on request'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Gim & Tonic Watamu — Gym & Fitness in Watamu',
    seoDescription: 'Work out at Gim & Tonic in Watamu. Full gym equipment, day passes, outdoor area, and personal training. All fitness levels welcome.',
    bookingType: 'contact_form',
  },

  // ═══════════════════════════════════════════════════════
  // EVENTS — PARTIES
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Papa Remo Beach Party',
    slug: { _type: 'slug', current: 'papa-remo-beach-party-watamu' },
    type: 'event',
    subcategory: 'parties',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Papa Remo Beach, Watamu',
    description: [
      textBlock('Papa Remo Beach Party — Every Saturday', 'h2'),
      textBlock('Watamu\'s signature Saturday night out. Every week, Papa Remo Beach transforms into the coast\'s hottest party venue with DJs, dancing on the sand, cocktails, and an electric atmosphere that brings together locals, expats, and travellers. If you\'re in Watamu on a Saturday, this is where you need to be.'),
      textBlock('What to Expect', 'h3'),
      textBlock('Live DJ sets spinning Afrobeats, amapiano, reggaeton, and international hits. Dance floor right on the beach under the stars. Full bar with cocktails, beers, wines, and fresh juices. Italian and seafood kitchen serving pizza, pasta, and grilled fish. Table reservations available for groups.'),
      textBlock('The Vibe', 'h3'),
      textBlock('The party kicks off from sunset and goes late. Early evening is relaxed with dinner and cocktails, building energy as the DJ takes over. A mix of beach-casual and dressed-up — come as you are. The crowd is diverse and friendly, making it easy to meet new people.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Every Saturday night. No cover charge — just show up. Arrive by 8–9 PM for the best atmosphere. Accessible by TukTuk from anywhere in Watamu (100–300 KES). M-Pesa and cash accepted at the bar. Book a table in advance for groups of 4+ via WhatsApp.'),
    ],
    tags: ['party', 'watamu', 'saturday', 'nightlife', 'dj', 'beach-party', 'dancing', 'weekly'],
    amenities: ['Parking', 'Sea View'],
    highlights: [
      highlight('🎧', 'Live DJs', 'Afrobeats, amapiano, reggaeton, and more'),
      highlight('🏖️', 'Beach Dance Floor', 'Dance on the sand under the stars'),
      highlight('🍕', 'Food & Drinks', 'Italian kitchen and full cocktail bar'),
      highlight('📅', 'Every Saturday', 'Weekly recurring event — never miss out'),
      highlight('🆓', 'No Cover Charge', 'Free entry — just show up'),
      highlight('🌍', 'Mixed Crowd', 'Locals, expats, and travellers together'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Papa Remo Beach Party — Every Saturday in Watamu',
    seoDescription: 'Join the Papa Remo Beach Party every Saturday in Watamu. DJs, beach dancing, cocktails, and Italian food. No cover charge.',
    bookingType: 'contact_form',
  },
  {
    _type: 'listing',
    title: 'Friday Lab',
    slug: { _type: 'slug', current: 'friday-lab-watamu' },
    type: 'event',
    subcategory: 'parties',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Sunset Beach Lab, Watamu Bay, Watamu',
    description: [
      textBlock('Friday Lab — Every Friday at Sunset Lab', 'h2'),
      textBlock('Watamu\'s favourite Friday night event. Friday Lab at Sunset Beach Lab is the perfect way to kick off the weekend — live music, cold drinks, wood-fired pizza, and the best sunset views in town. A more relaxed, community-focused vibe compared to Saturday\'s beach parties, but no less fun.'),
      textBlock('What to Expect', 'h3'),
      textBlock('Live music performances featuring local and visiting artists. Genres range from acoustic sets and reggae to Afro-soul and jazz. Sunset Lab\'s wood-fired pizzas are the star of the menu, alongside salads, snacks, and fresh juices. Full bar with craft cocktails, cold beers, and wines.'),
      textBlock('The Vibe', 'h3'),
      textBlock('Arrive for sunset (around 6 PM) and grab a spot on the sand. The first hour is golden-hour drinks and pizza, followed by live music as the evening unfolds. Families with kids welcome in the early evening. The crowd thins around 8–9 PM as the party shifts to a more intimate, music-focused atmosphere.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Every Friday evening from sunset. Located at Sunset Beach Lab on Watamu Bay (Mapango Beach). No cover charge. M-Pesa and cash accepted. Walk-ins welcome but arrive early for the best tables. Accessible from Watamu centre on foot or by TukTuk (100 KES).'),
    ],
    tags: ['event', 'watamu', 'friday', 'live-music', 'sunset', 'pizza', 'weekly', 'community'],
    amenities: ['Parking', 'Sea View', 'Pet Friendly'],
    highlights: [
      highlight('🎵', 'Live Music', 'Local and visiting artists every Friday'),
      highlight('🌅', 'Sunset Views', 'Best sunset spot in Watamu'),
      highlight('🍕', 'Wood-Fired Pizza', 'Sunset Lab\'s famous pizzas'),
      highlight('📅', 'Every Friday', 'Weekly event to start the weekend'),
      highlight('👨‍👩‍👧', 'Family Friendly', 'Kids welcome in the early evening'),
      highlight('🆓', 'No Cover Charge', 'Free entry for everyone'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Friday Lab Watamu — Live Music & Pizza Every Friday',
    seoDescription: 'Join Friday Lab at Sunset Beach Lab every Friday in Watamu. Live music, wood-fired pizza, sunset views, and good vibes. Free entry.',
    bookingType: 'contact_form',
  },
]

async function main() {
  console.log(`🌴 Seeding ${listings.length} new listings to Sanity...\n`)

  for (const listing of listings) {
    const title = listing.title
    console.log(`  → ${title}...`)

    try {
      const result = await client.create(listing)
      console.log(`    ✅ Created: ${result._id} (${listing.type} / ${listing.subcategory})`)
    } catch (err) {
      console.error(`    ❌ Failed: ${err}`)
    }
  }

  console.log(`\n✅ Done — ${listings.length} listings seeded!`)
}

main().catch((err) => {
  console.error('❌ Script failed:', err)
  process.exit(1)
})
