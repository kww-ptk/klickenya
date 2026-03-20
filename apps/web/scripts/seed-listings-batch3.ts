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
  // 1. ROCK & SEA — UNIQUE STAY
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Rock & Sea Bubble Eco Lodge',
    slug: { _type: 'slug', current: 'rock-and-sea-watamu' },
    type: 'stay',
    subcategory: 'unique_stay',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Mida Creek Marine Reserve, Watamu Beach Road, Watamu',
    price: 28000,
    priceUnit: 'night',
    description: [
      textBlock('Rock & Sea Bubble Eco Lodge — Watamu', 'h2'),
      textBlock('Sleep inside a transparent bubble dome perched 40 meters above sea level on a coral cliff, overlooking both the Indian Ocean and Mida Creek. Rock & Sea is not just accommodation — it is one of the most extraordinary places to wake up in East Africa. The lodge sits within the Watamu Marine National Reserve, surrounded by ancient baobab trees, mangrove forests, and the sounds of over 200 bird species.'),
      textBlock('The Bubble Experience', 'h3'),
      textBlock('Each dome is a transparent cocoon designed to dissolve the boundary between you and the wild. The Baobab Bubble Lodge features a king-size bed positioned to face the sunrise over Mida Creek, with a 300-year-old baobab tree as your neighbour. The outdoor shower — literally "into the wild" — lets you wash under the sky with nothing but forest around you. At night, the transparent walls turn your room into a private planetarium. No light pollution, no walls, just stars.'),
      textBlock('Dining & Facilities', 'h3'),
      textBlock('The panoramic restaurant sits on the edge of the coral cliff, serving Italian, international, and fusion cuisine with ingredients sourced from local fishermen and organic farms. A saltwater infinity pool with jacuzzi overlooks the creek — swim at sunset and watch dhows glide below. The pool-side eco bar serves handcrafted cocktails as the sky turns amber. In-room massage treatments are available with ocean views.'),
      textBlock('Activities from the Lodge', 'h3'),
      textBlock('Kayak through the mangrove channels at high tide. Join a sunset dhow cruise departing from the creek below. Snorkel the marine park (equipment provided). Take a guided bird-watching walk — Mida Creek is home to flamingos, kingfishers, and fish eagles. The lodge also arranges day safaris to Tsavo East National Park, under 2 hours away.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Half-board rates from KES 28,000 per person per night (breakfast and dinner included). Full-board available at KES 32,000. Children under 2 stay free; ages 2–12 at 50%. Airport transfers from Malindi (25 min, KES 4,950) or Mombasa (2 hrs, KES 12,100). Located 7.5 km from Watamu town centre. WhatsApp: +254 798 196967. Best visibility for marine life: January–March and July–October.'),
    ],
    tags: ['bubble-lodge', 'watamu', 'eco', 'luxury', 'unique', 'mida-creek', 'romantic', 'pool', 'cliff'],
    amenities: ['WiFi', 'Pool', 'Restaurant', 'Bar', 'Sea View', 'Air Conditioning'],
    highlights: [
      highlight('🫧', 'Transparent Bubble Domes', 'Sleep under the stars in a see-through cocoon'),
      highlight('🏔️', '40m Coral Cliff', 'Perched above the ocean with panoramic views'),
      highlight('🌳', '300-Year-Old Baobab', 'Ancient tree next to your private dome'),
      highlight('🏊', 'Infinity Pool & Jacuzzi', 'Saltwater pool overlooking Mida Creek'),
      highlight('🚿', 'Outdoor Wild Shower', 'Shower surrounded by nothing but forest'),
      highlight('🦩', '200+ Bird Species', 'Flamingos, kingfishers, and fish eagles'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Rock & Sea Bubble Eco Lodge Watamu — Sleep in a Transparent Dome',
    seoDescription: 'Stay in a transparent bubble dome on a coral cliff in Watamu. Infinity pool, outdoor shower, Mida Creek views. From KES 28,000/night.',
    bookingType: 'contact_form',
  },

  // ═══════════════════════════════════════════════════════
  // 2. NON SOLO GELATO — RESTAURANT
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Non Solo Gelato by Anna',
    slug: { _type: 'slug', current: 'non-solo-gelato-watamu' },
    type: 'restaurant',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Blue Moon Shopping Centre, Turtle Bay Road, Watamu',
    description: [
      textBlock('Non Solo Gelato by Anna — Watamu', 'h2'),
      textBlock('Widely considered the best gelato in Kenya — and that is not an exaggeration. Anna, an Italian artisan gelataia, produces small-batch gelato daily using traditional methods and locally sourced ingredients. The name means "Not Just Gelato," and true to its word, this family-run gem doubles as an Italian deli and café. Rated 4.7 on TripAdvisor with nearly 200 reviews, it is one of the highest-rated food spots on the entire Kenyan coast.'),
      textBlock('The Gelato', 'h3'),
      textBlock('Flavours rotate daily, made fresh each morning. Regulars swear by the Stracciatella, After Eight (dark chocolate and mint), and the Dubai Chocolate. The fruit sorbets — especially strawberry and passion fruit — are intensely flavoured and dairy-free. Each scoop costs around KES 700 for two generous portions. The gelato case is small but curated; everything in it is exceptional.'),
      textBlock('Beyond Gelato', 'h3'),
      textBlock('The "Non Solo" part is real. The deli counter stocks imported Italian cold cuts (prosciutto, mortadella), cheeses (pecorino, parmigiano), wines, and prosecco — hard to find anywhere else on the coast. Fresh croissants and Cannoli Siciliani are baked daily. Proper Italian espresso with oat, soy, and almond milk options. Surprisingly, they also carry a curated line of health products: protein powders, probiotics, and collagen supplements.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Open daily 7 AM – 11 PM. Located at Blue Moon Shopping Centre on Turtle Bay Road — look for the gelato sign. Indoor and outdoor seating available. M-Pesa and cash accepted. A must-stop after any beach day. Phone: +254 792 107849.'),
    ],
    tags: ['gelato', 'watamu', 'italian', 'deli', 'coffee', 'dessert', 'best-gelato', 'family-owned'],
    amenities: ['Parking'],
    highlights: [
      highlight('🍦', 'Best Gelato in Kenya', 'Handmade daily with traditional Italian methods'),
      highlight('🔄', 'Daily Rotating Flavours', 'Fresh batch every morning — never the same twice'),
      highlight('🇮🇹', 'Italian Deli Counter', 'Imported cold cuts, cheeses, wines, prosecco'),
      highlight('🥐', 'Fresh Pastries', 'Cannoli Siciliani and croissants baked daily'),
      highlight('⭐', '4.7 TripAdvisor Rating', 'Nearly 200 reviews — one of the coast\'s highest'),
      highlight('🕐', 'Open Until 11 PM', 'Late-night gelato runs fully supported'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Non Solo Gelato Watamu — Best Gelato in Kenya',
    seoDescription: 'Handmade Italian gelato, deli, and café in Watamu. Daily rotating flavours, imported Italian products. Open 7 AM – 11 PM. Rated 4.7/5.',
    bookingType: 'contact_form',
    cuisine: ['Italian', 'Mediterranean'],
    priceRange: 'mid-range',
    openingHours: 'Daily 7:00 AM – 11:00 PM',
  },

  // ═══════════════════════════════════════════════════════
  // 3. PALM GARDEN SPA — WELLNESS SERVICE
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Palm Garden Spa & Relax',
    slug: { _type: 'slug', current: 'palm-garden-spa-watamu' },
    type: 'service',
    subcategory: 'wellness_service',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Turtle Bay Road, Watamu (950m from Garoda Beach)',
    price: 3500,
    priceUnit: 'session',
    description: [
      textBlock('Palm Garden Spa & Relax — Watamu', 'h2'),
      textBlock('A wellness sanctuary tucked inside Watamu\'s most serene boutique hotel. The Palm Garden Spa sits within a lush tropical garden powered entirely by 120 solar panels — making this one of the genuinely eco-conscious wellness experiences on the coast. The adults-only policy (no under 12s) means the silence is real, the relaxation is deep, and the only sounds are birdsong and rustling palms.'),
      textBlock('Treatments & Services', 'h3'),
      textBlock('Full-body rejuvenating massages using locally sourced coconut and essential oils. Personalized facials tailored to your skin type — particularly good after sun exposure. Deep-tissue and relaxation massage options. Body scrubs and wraps using natural ingredients. Manicures and pedicures in the private treatment room. Ask for Eunice — the resident masseuse consistently praised in reviews as having "magic hands."'),
      textBlock('The Spa Facilities', 'h3'),
      textBlock('A private spa pool separate from the main hotel pool — exclusively for spa guests. Relaxing lounge area with day beds and tropical garden views. Rain shower facilities. The treatment room is private and beautifully appointed with natural materials. After your treatment, guests are welcome to unwind at Mannis Restaurant & Cocktail Bar next door with a glass of prosecco.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Open daily 8 AM – 9 PM. Advanced booking strongly recommended — call or WhatsApp +254 703 845 153. Located on Turtle Bay Road, 950 meters from Garoda Beach. Walk-ins accepted subject to availability but bookings get priority. Treatments start from approximately KES 3,500. Couples treatments available. The hotel is adults-only, creating a genuinely peaceful environment.'),
    ],
    tags: ['spa', 'watamu', 'wellness', 'massage', 'eco', 'solar-powered', 'adults-only', 'relaxation'],
    amenities: ['Parking', 'Pool'],
    highlights: [
      highlight('💆', 'Expert Treatments', 'Massages, facials, body wraps with natural oils'),
      highlight('☀️', '100% Solar Powered', '120 panels — genuinely eco-conscious wellness'),
      highlight('🏊', 'Private Spa Pool', 'Exclusive pool for spa guests only'),
      highlight('🔇', 'Adults Only', 'No under 12s — real silence and relaxation'),
      highlight('🌴', 'Garden Setting', 'Treatments surrounded by tropical palms'),
      highlight('🍹', 'Mannis Bar Next Door', 'Post-spa prosecco at the cocktail bar'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Palm Garden Spa Watamu — Solar-Powered Wellness Retreat',
    seoDescription: 'Spa treatments in a solar-powered tropical garden in Watamu. Massages, facials, private pool. Adults-only. Book: +254 703 845 153.',
    bookingType: 'contact_form',
  },

  // ═══════════════════════════════════════════════════════
  // 4. NICE TO SEE YOU — WELLNESS SERVICE
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Nice to See You Hair & Beauty',
    slug: { _type: 'slug', current: 'nice-to-see-you-watamu' },
    type: 'service',
    subcategory: 'wellness_service',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Jacaranda Road, Watamu',
    description: [
      textBlock('Nice to See You Hair & Beauty — Watamu', 'h2'),
      textBlock('The go-to salon in Watamu for anyone who needs quality grooming without the Nairobi price tag. Whether you\'re a visitor who needs a fresh cut before a beach party, an expat maintaining their look, or someone who wants their nails done properly — Nice to See You delivers professional results in a welcoming, no-fuss environment on Watamu\'s main Jacaranda Road.'),
      textBlock('Services', 'h3'),
      textBlock('Professional haircuts and styling for women and men. Blow-dries, colouring, and treatments for all hair types. The Executive Barber section handles men\'s cuts, beard trims, and hot-towel shaves. Full nail salon with gel manicures, pedicures, and nail art. Waxing and beauty treatments available. Children\'s cuts welcome — they\'re patient with little ones.'),
      textBlock('Why It Matters', 'h3'),
      textBlock('Finding a reliable salon is one of those unglamorous but essential things when you\'re living on or visiting the coast. Nice to See You fills a real gap in Watamu — professional-grade equipment, trained stylists, and consistent results. No need to drive to Malindi or Kilifi for a proper haircut. Popular with the Italian expat community and increasingly with Kenyan visitors.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Open Monday – Saturday, 9 AM – 7 PM. Closed Sundays. Walk-ins welcome but booking ahead is recommended for weekends and holidays. Located on Jacaranda Road — the main road through Watamu. M-Pesa and cash accepted. Phone: +254 796 444888. Email: nicetoseeyou_watamu@hotmail.com.'),
    ],
    tags: ['salon', 'watamu', 'hair', 'beauty', 'nails', 'barber', 'grooming'],
    amenities: [],
    highlights: [
      highlight('💇', 'Hair Styling', 'Cuts, colour, and treatments for all hair types'),
      highlight('💅', 'Nail Salon', 'Gel manicures, pedicures, and nail art'),
      highlight('🪒', 'Executive Barber', 'Men\'s cuts, beard trims, hot-towel shaves'),
      highlight('👶', 'Kids Welcome', 'Patient with children\'s haircuts'),
      highlight('📍', 'Main Road Location', 'Easy to find on Jacaranda Road'),
      highlight('📱', 'M-Pesa Accepted', 'Mobile money and cash payments'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Nice to See You Hair & Beauty Watamu — Salon & Barber',
    seoDescription: 'Hair salon, barber, and nail bar in Watamu. Professional cuts, styling, grooming. Mon–Sat 9–7. Book: +254 796 444888.',
    bookingType: 'contact_form',
  },

  // ═══════════════════════════════════════════════════════
  // 5. THE ISLA CAFÉ — RESTAURANT
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'The Isla Café',
    slug: { _type: 'slug', current: 'isla-cafe-watamu' },
    type: 'restaurant',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu, Kilifi County',
    description: [
      textBlock('The Isla Café — Watamu', 'h2'),
      textBlock('A new-wave café bringing specialty coffee culture, French-style pastries, and artisan gelato to Watamu. Isla is the kind of place that didn\'t exist on the Kenyan coast five years ago — a thoughtfully curated space where the espresso is properly dialled in, the croissants are flaky, and the vibe is effortlessly cool. Already gaining a loyal following among Watamu\'s growing creative community.'),
      textBlock('What to Order', 'h3'),
      textBlock('Start with the Italian coffee — properly extracted, not over-roasted, with milk alternatives available. The French pastry selection includes croissants, pain au chocolat, and seasonal specials. The brunch menu covers both sweet and savoury, making it a genuine morning-to-afternoon destination. The artisanal gelato is a newer addition and gives Non Solo Gelato some friendly competition.'),
      textBlock('The Vibe', 'h3'),
      textBlock('Instagram-worthy but not try-hard. A mix of remote workers, expats, visiting creatives, and anyone who takes their morning coffee seriously. The kind of café where you can spend an hour with a laptop and nobody minds. Clean, bright interior with a relaxed coastal aesthetic.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Open daily 7 AM – 8 PM. Delivery available — call 0751 300451. Follow @isla_cafewatamu on Instagram for daily specials and new menu items. M-Pesa and cash accepted. A newer addition to Watamu\'s food scene, so expect the menu to evolve.'),
    ],
    tags: ['cafe', 'watamu', 'coffee', 'pastries', 'brunch', 'gelato', 'remote-work', 'instagram'],
    amenities: ['WiFi'],
    highlights: [
      highlight('☕', 'Specialty Coffee', 'Properly extracted Italian espresso'),
      highlight('🥐', 'French Pastries', 'Croissants, pain au chocolat, and seasonal bakes'),
      highlight('🍦', 'Artisan Gelato', 'Handmade gelato and sorbets'),
      highlight('💻', 'Remote Work Friendly', 'Wi-Fi and a work-friendly atmosphere'),
      highlight('🛵', 'Delivery Available', 'Order to your accommodation'),
      highlight('🕐', 'Open 7 AM – 8 PM', 'Morning coffee to evening dessert'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'The Isla Café Watamu — Specialty Coffee, Pastries & Gelato',
    seoDescription: 'Specialty coffee, French pastries, brunch, and artisan gelato in Watamu. Open daily 7 AM – 8 PM. Delivery available.',
    bookingType: 'contact_form',
    cuisine: ['Italian', 'Mediterranean'],
    priceRange: 'mid-range',
    openingHours: 'Daily 7:00 AM – 8:00 PM',
  },

  // ═══════════════════════════════════════════════════════
  // 6. NON SOLO PANE (Naturalmente Pane) — RESTAURANT
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Non Solo Pane',
    slug: { _type: 'slug', current: 'non-solo-pane-watamu' },
    type: 'restaurant',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Jacaranda Road, Watamu',
    description: [
      textBlock('Non Solo Pane — Watamu', 'h2'),
      textBlock('The bakery that proves Watamu\'s Italian DNA runs deep. Non Solo Pane ("Not Just Bread") is a proper Italian bakery and café on Jacaranda Road that has quietly become one of the most-loved food spots in town. Rated 4.6 on Google with nearly 200 reviews, it punches well above its weight — baking fresh bread from 6:30 AM and serving food that crosses Italian, Indian, African, and Mediterranean traditions without blinking.'),
      textBlock('The Bread & Pastries', 'h3'),
      textBlock('Fresh-baked bread every morning: crusty Italian loaves, soft brown bread, and milk rolls that sell out by noon. Croissants that are genuinely flaky. The Cannoli Siciliani and homemade tiramisu are dangerously good. They also do custom cakes for birthdays, anniversaries, and celebrations — order 48 hours ahead.'),
      textBlock('The Food', 'h3'),
      textBlock('This is where it gets interesting. The menu reads like a cultural crossroads: cannelloni and pasta sit alongside masala chai and chapati. The signature Gioias sandwich (ask for it — locals know) is legendary. Classic burgers, chicken sandwiches, and fresh fruit bowls with yogurt for lighter appetites. The portions are generous and the prices are fair — reviewers note they "expected items to be more expensive."'),
      textBlock('Practical Info', 'h3'),
      textBlock('Open Tuesday – Saturday 6:30 AM – 6:00 PM, Sunday 6:30 AM – 2:00 PM. Closed Mondays. Located on Jacaranda Road with free parking. Reservations accepted. Full bar with wine and beer. Indoor and outdoor seating. Phone: +254 710 319603. Follow @naturalmentepanewatamu on Instagram.'),
    ],
    tags: ['bakery', 'watamu', 'italian', 'bread', 'pastries', 'brunch', 'masala-chai', 'family'],
    amenities: ['Parking'],
    highlights: [
      highlight('🍞', 'Fresh Daily Bread', 'Italian loaves, brown bread, and milk rolls from 6:30 AM'),
      highlight('🥇', 'The Gioias Sandwich', 'The legendary signature dish — ask for it by name'),
      highlight('🌍', 'Cultural Crossroads', 'Italian + Indian + African + Mediterranean menu'),
      highlight('🍰', 'Custom Cakes', 'Birthday and celebration cakes — order 48hrs ahead'),
      highlight('🍵', 'Masala Chai', 'Proper chai alongside Italian espresso'),
      highlight('⭐', '4.6 Google Rating', 'Nearly 200 reviews — consistently excellent'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Non Solo Pane Watamu — Italian Bakery, Café & Cultural Kitchen',
    seoDescription: 'Fresh-baked bread, pastries, and a cross-cultural menu in Watamu. Italian bakery with Indian and African flavours. Open from 6:30 AM.',
    bookingType: 'contact_form',
    cuisine: ['Italian', 'Indian', 'Kenyan', 'Mediterranean'],
    priceRange: 'budget',
    openingHours: 'Tue–Sat 6:30 AM – 6 PM, Sun 6:30 AM – 2 PM. Closed Monday.',
  },

  // ═══════════════════════════════════════════════════════
  // 7. AQUA VENTURES — OUTDOOR EXPERIENCE
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Aqua Ventures Diving',
    slug: { _type: 'slug', current: 'aqua-ventures-watamu' },
    type: 'experience',
    subcategory: 'outdoor',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Ocean Sports Hotel, Turtle Bay Road, Watamu',
    price: 15400,
    priceUnit: 'session',
    description: [
      textBlock('Aqua Ventures — PADI 5-Star Dive Centre, Watamu', 'h2'),
      textBlock('Kenya\'s longest-running owner-operated dive centre — and it shows. Steve and Helen Curtis have been running Aqua Ventures since 1990 from their base at Ocean Sports Hotel, and in 35 years they have built something remarkable: a perfect 5.0 Google rating after 81 reviews. That doesn\'t happen by accident. Whether you\'ve never put your face underwater or you\'re a certified divemaster, this is the place to dive in Kenya.'),
      textBlock('What They Offer', 'h3'),
      textBlock('PADI Discover Scuba Diving (1 day, 1 dive, $154) — perfect for first-timers who want to try it without committing to a full course. PADI Open Water Certification (5 days, 4 dives, $714) — the global standard diving license. PADI Advanced Open Water (3 days, 5 dives, $566) — for certified divers who want to go deeper. Double dive trips for certified divers ($125 including park fees). Night dives and wreck dives available with small surcharges.'),
      textBlock('What You\'ll See', 'h3'),
      textBlock('Watamu Marine National Park is one of the oldest marine protected areas in Africa. Green and hawksbill sea turtles are almost guaranteed. Giant moray eels, reef octopus, nudibranchs (sea slugs with psychedelic colours), lionfish, and vast coral gardens. Between September and March, whale sharks occasionally pass through. Visibility is best January–March and July–October.'),
      textBlock('Why This Dive Centre', 'h3'),
      textBlock('The guides — especially Arnold, mentioned by name in dozens of reviews — have an almost supernatural ability to find hidden marine life. Equipment is meticulously maintained and modern. They have a gift for calming nervous beginners, making families feel safe, and keeping experienced divers challenged. All prices include boat transport, equipment, and PADI materials. KWS marine park fee: $17/day.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Open daily 7:30 AM – 5 PM. Located at Ocean Sports Hotel on Turtle Bay Road. Book at least 24 hours ahead for courses. Walk-ins possible for double dives if space allows. Phone: +254 703 628102. Email: ask-us@diveinkenya.com. Website: diveinkenya.com.'),
    ],
    tags: ['diving', 'watamu', 'padi', 'snorkeling', 'marine-park', 'turtles', 'outdoor', 'family-friendly'],
    amenities: ['Parking', 'Sea View'],
    highlights: [
      highlight('⭐', 'Perfect 5.0 Rating', '81 Google reviews — flawless reputation since 1990'),
      highlight('🐢', 'Sea Turtles Guaranteed', 'Green and hawksbill turtles on almost every dive'),
      highlight('🏅', 'PADI 5-Star Centre', 'Kenya\'s longest-running dive operation'),
      highlight('🫧', 'Beginner Friendly', 'Discover Scuba course — no experience needed'),
      highlight('🌊', 'Marine National Park', 'Diving in one of Africa\'s oldest protected reefs'),
      highlight('🦈', 'Whale Shark Season', 'Occasional sightings September – March'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Aqua Ventures Watamu — PADI Diving & Snorkeling in the Marine Park',
    seoDescription: 'Dive in Watamu Marine Park with Kenya\'s top-rated dive centre. PADI courses, sea turtles, coral reefs. Perfect 5.0 rating. Since 1990.',
    bookingType: 'contact_form',
  },

  // ═══════════════════════════════════════════════════════
  // 8. CRAB SHACK DABASO — RESTAURANT / CULTURAL
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Crab Shack Dabaso',
    slug: { _type: 'slug', current: 'crab-shack-dabaso-watamu' },
    type: 'restaurant',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Mida Creek, Dabaso Village, Watamu',
    description: [
      textBlock('Crab Shack Dabaso — Watamu', 'h2'),
      textBlock('The most memorable meal you\'ll eat in Watamu isn\'t in a restaurant — it\'s at the end of a 200-meter boardwalk through a mangrove forest, in a wooden shack balanced at the edge of Mida Creek. The Crab Shack was built by the Dabaso Creek Conservation Group, and every shilling you spend funds mangrove conservation and education for the local fishing community. Ranked #4 out of 70 restaurants in Watamu on TripAdvisor, with 483 reviews. Listed on The World\'s 50 Best Discovery.'),
      textBlock('The Journey There', 'h3'),
      textBlock('Getting to the Crab Shack is half the experience. You park at Dabaso village and walk a 200-meter elevated boardwalk through dense mangrove forest. At low tide, the mud flats below are alive with crabs, wading birds, and the occasional monitor lizard. At high tide, the water laps beneath your feet. Either way, by the time you reach the wooden deck at the end, you\'ve already had an adventure.'),
      textBlock('The Food', 'h3'),
      textBlock('Fresh crab, fish, and prawns pulled from the creek that morning. The crab samosas are legendary — flaky, perfectly spiced, and worth the trip alone. Grilled fish served whole with lime and chili. Seafood pasta for those who want something more familiar. Portions are generous. Cold beers, wine, and cocktails available. Average spend: around $10 per person — arguably the best value dining experience in Watamu.'),
      textBlock('Practical Info', 'h3'),
      textBlock('You MUST book 24 hours in advance — this is not optional, they prepare fresh for each booking. The ride from Watamu centre takes about 20 minutes. Best visited at sunset when the creek turns gold. Accessible by car, TukTuk, or motorbike. Follow @crabshackdabaso on Instagram. Community-run — your meal directly supports conservation.'),
    ],
    tags: ['seafood', 'watamu', 'crab', 'mangroves', 'eco', 'conservation', 'mida-creek', 'sunset', 'community'],
    amenities: ['Parking', 'Sea View'],
    highlights: [
      highlight('🦀', 'Legendary Crab Samosas', 'The dish that put this place on the map'),
      highlight('🌿', '200m Mangrove Boardwalk', 'The journey to the restaurant is an experience'),
      highlight('🌍', 'World\'s 50 Best Discovery', 'Internationally recognized sustainable dining'),
      highlight('💚', 'Conservation-Funded', 'Every meal supports mangrove protection'),
      highlight('💰', '~$10 Per Person', 'Fresh seafood in a stunning setting — incredible value'),
      highlight('📅', 'Book 24 Hours Ahead', 'They prepare fresh for each reservation'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Crab Shack Dabaso — Seafood at the Edge of Mida Creek, Watamu',
    seoDescription: 'Fresh crab, fish, and prawns at a conservation-funded shack on Mida Creek. 200m mangrove boardwalk. Book 24hrs ahead. ~$10/person.',
    bookingType: 'contact_form',
    cuisine: ['Seafood', 'Kenyan', 'Swahili'],
    priceRange: 'budget',
    openingHours: 'By reservation only — book 24 hours ahead.',
  },

  // ═══════════════════════════════════════════════════════
  // 9. LOCAL OCEAN CONSERVATION — EXPERIENCE / FAMILY
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Local Ocean Conservation (Turtle Rescue)',
    slug: { _type: 'slug', current: 'local-ocean-conservation-watamu' },
    type: 'experience',
    subcategory: 'family',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Turtle Bay Road, Watamu',
    price: 1000,
    priceUnit: 'person',
    description: [
      textBlock('Local Ocean Conservation — Watamu Turtle Rescue Centre', 'h2'),
      textBlock('Kenya\'s only sea turtle rehabilitation centre, and one of the most emotionally powerful experiences you can have in Watamu. Since 1997, Local Ocean Conservation has been rescuing, rehabilitating, and releasing injured sea turtles — working hand-in-hand with local fishermen who are paid to release turtles accidentally caught in their nets instead of keeping them. It\'s conservation that actually works, and you can see it up close.'),
      textBlock('What You\'ll Experience', 'h3'),
      textBlock('A guided tour (approximately 1 hour) through the rehabilitation facility. You\'ll see hawksbill and green sea turtles in various stages of recovery — some with injuries from fishing nets, others recovering from boat strikes or plastic ingestion. The guides explain each turtle\'s story, the rehabilitation process, and the broader challenges of marine conservation. There\'s also a mangrove nursery on-site where seedlings are grown for replanting along the coast.'),
      textBlock('The Turtle Release', 'h3'),
      textBlock('If your timing is right, you may be able to participate in releasing a fully recovered turtle back into the Indian Ocean. Reviewers describe this as one of the most moving experiences of their trip. Releases happen when turtles are medically cleared — they can\'t be scheduled, which makes witnessing one all the more special. Follow their social media for release announcements.'),
      textBlock('The Beautiful Irony', 'h3'),
      textBlock('If you visit and the rehabilitation tanks are empty, that\'s actually the best possible sign — it means every turtle has been successfully treated and released. An empty tank is a conservation victory. The staff will happily explain this, and the education centre and mangrove nursery are worth visiting regardless.'),
      textBlock('Practical Info', 'h3'),
      textBlock('Open Monday – Friday 8 AM – 5 PM, Saturday 9 AM – 12 PM. Closed Sundays. Suggested donation: KES 1,000 ($7.76). Located on Turtle Bay Road. Excellent for families — children are fascinated by the turtles, and the educational component is outstanding. Phone: +254 703 705342. Website: localocean.co.'),
    ],
    tags: ['turtles', 'watamu', 'conservation', 'family', 'wildlife', 'education', 'marine', 'eco'],
    amenities: ['Parking'],
    highlights: [
      highlight('🐢', 'Sea Turtle Rehabilitation', 'Kenya\'s only turtle rescue centre since 1997'),
      highlight('🥹', 'Turtle Release Experience', 'Witness a recovered turtle return to the ocean'),
      highlight('🎓', 'Educational Tours', '1-hour guided tours with turtle stories'),
      highlight('🌱', 'Mangrove Nursery', 'Seedlings grown on-site for coastal replanting'),
      highlight('👨‍👩‍👧', 'Perfect for Families', 'Kids love it — engaging and educational'),
      highlight('🤝', 'Fishermen Partnership', 'Paying fishermen to release bycatch turtles'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Local Ocean Conservation Watamu — Sea Turtle Rescue & Release',
    seoDescription: 'Visit Kenya\'s only turtle rehabilitation centre in Watamu. Guided tours, possible turtle release, mangrove nursery. KES 1,000 entry.',
    bookingType: 'contact_form',
  },

  // ═══════════════════════════════════════════════════════
  // 10. WATAMU MARINE NATIONAL PARK — EXPERIENCE / OUTDOOR
  // ═══════════════════════════════════════════════════════
  {
    _type: 'listing',
    title: 'Watamu Marine National Park',
    slug: { _type: 'slug', current: 'watamu-marine-national-park' },
    type: 'experience',
    subcategory: 'outdoor',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu Marine National Park, Watamu',
    price: 1700,
    priceUnit: 'person',
    description: [
      textBlock('Watamu Marine National Park', 'h2'),
      textBlock('Established in 1968, Watamu Marine National Park is one of the oldest marine protected areas in Africa and a UNESCO Biosphere Reserve. Spanning 10 km² of coral reefs, seagrass beds, and crystalline waters, this is the jewel that makes Watamu more than just a beach town. Whether you snorkel, dive, or take a glass-bottom boat, the underwater world here rivals destinations ten times more famous.'),
      textBlock('What You\'ll See', 'h3'),
      textBlock('Over 600 species of fish, 110 species of coral, and some of the healthiest reef systems in the Western Indian Ocean. Green and hawksbill sea turtles are common — you\'re almost guaranteed to swim alongside one. Dolphins are frequently spotted, especially in the morning. Giant groupers, moray eels, octopus, lionfish, and clouds of butterfly fish fill the coral gardens. Between September and March, whale sharks occasionally pass through the deeper waters.'),
      textBlock('How to Visit', 'h3'),
      textBlock('Glass-bottom boat tours depart from Watamu Beach and offer a dry-feet option for non-swimmers — the coral is close enough to the surface to see clearly through the glass. Snorkeling trips include equipment and a guide who knows where the turtles hang out. Scuba diving through operators like Aqua Ventures gives you deeper access to walls, caves, and the outer reef. Most tours are half-day (3–4 hours).'),
      textBlock('Practical Info', 'h3'),
      textBlock('KWS entry fees: KES 1,700 for non-residents ($13), KES 300 for residents, KES 100 for Kenyan children. Fees are per day and usually included in boat/dive operator prices — confirm before booking. The park is open daily from 6 AM to 6 PM. Best snorkeling is at low tide when corals are closest to the surface. Best diving visibility: January–March and July–October. Bring reef-safe sunscreen — chemical sunscreens damage coral.'),
    ],
    tags: ['marine-park', 'watamu', 'snorkeling', 'diving', 'coral-reef', 'turtles', 'dolphins', 'unesco', 'nature'],
    amenities: ['Sea View'],
    highlights: [
      highlight('🏛️', 'UNESCO Biosphere Reserve', 'Protected since 1968 — one of Africa\'s oldest'),
      highlight('🐢', 'Swim with Sea Turtles', 'Green and hawksbill turtles on almost every visit'),
      highlight('🐠', '600+ Fish Species', 'One of the richest marine ecosystems in East Africa'),
      highlight('🚤', 'Glass-Bottom Boats', 'See the reef without getting wet'),
      highlight('🐬', 'Dolphin Sightings', 'Frequently spotted on morning trips'),
      highlight('🪸', '110 Coral Species', 'Healthy, vibrant reef systems'),
    ],
    hostName: 'KlicKenya',
    photos: [],
    seoTitle: 'Watamu Marine National Park — Snorkeling, Diving & Sea Turtles',
    seoDescription: 'Explore Watamu Marine National Park. UNESCO Biosphere Reserve with sea turtles, dolphins, 600+ fish species. Snorkeling, diving, glass-bottom boats.',
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
      const sub = listing.subcategory || '—'
      console.log(`    ✅ Created: ${result._id} (${listing.type} / ${sub})`)
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
