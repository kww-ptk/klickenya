/**
 * Seed script — 15 Watamu restaurant listings.
 *
 * Run locally (this environment cannot reach api.sanity.io):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/add-watamu-restaurants.ts
 *
 * Then attach images with:
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/upload-watamu-images.ts
 *
 * Data was researched from official sites, TripAdvisor, Google reviews and travel
 * blogs (July 2026). Restaurants that could NOT be independently verified are seeded
 * as status:'draft' so they never appear on the marketplace until confirmed — see the
 * `status` field and the ⚠️ note on each. Verified venues are seeded as 'published'.
 *
 * Follows the same pattern as add-diani-restaurants.ts.
 */
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

type Restaurant = {
  title: string
  slug: string
  status: 'published' | 'draft'
  city: string
  county: string
  address: string
  price?: number
  priceUnit?: string
  priceRange: 'budget' | 'mid-range' | 'fine-dining'
  cuisine: string[]
  openingHours: string
  atmosphere?: string
  reservationRequired: boolean
  tags: string[]
  highlights: any[]
  description: any[]
  seoTitle: string
  seoDescription: string
}

const RESTAURANTS: Restaurant[] = [
  // ─────────────────────────────────────────────────────────────── Pilipan
  {
    title: 'Pilipan Restaurant',
    slug: 'pilipan-restaurant-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Turtle Bay Road, Watamu (overlooking Prawn Lake and the Mida Creek mangroves)',
    price: 2500,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Indian', 'Seafood', 'Fusion'],
    openingHours: 'Open daily for lunch, sunset cocktails and dinner (reported closed Mondays — confirm directly)',
    atmosphere: 'romantic',
    reservationRequired: false,
    tags: [
      'watamu', 'pilipan', 'seafood', 'indian', 'fusion', 'cocktails',
      'sunset', 'creekside', 'mida-creek', 'open-air', 'curry', 'mangrove-views',
    ],
    highlights: [
      highlight('🌅', 'Mida Creek Sunset', 'Open-air deck overlooking Prawn Lake and the mangroves, prized for magnificent Watamu sunsets'),
      highlight('🍛', 'Indian Curries', 'A menu built around authentic Indian curries and fresh naan with an Asian-fusion twist'),
      highlight('🍤', 'Fresh Seafood', 'Calamari, prawns and daily seafood feature heavily, with plenty for vegetarians too'),
      highlight('🍸', 'Signature Cocktails', 'Well known for its cocktails — passion-and-ginger mojitos and creative house drinks'),
      highlight('🥟', 'Standout Samosas', 'Coriander-and-feta samosas and sticky spare ribs are repeat crowd-pleasers'),
      highlight('🌿', 'Open-Air Setting', 'A relaxed, thatched open-air space right at the water’s edge'),
    ],
    description: [
      textBlock('Pilipan Restaurant — Watamu', 'h2'),
      textBlock("Tucked at the edge of a Mida Creek tributary on Turtle Bay Road, Pilipan is the kind of place Watamu regulars send you to when they want you to remember the trip. It's an open-air restaurant that looks out over Prawn Lake and the mangroves beyond, and it's built around a genuinely interesting kitchen — Indian curries and Asian-fusion plates rather than the usual coastal standards. The vibe is unhurried and a little romantic, especially as the light drops. If you time your visit for sunset, you'll understand why it has such a loyal following."),
      textBlock('The Menu', 'h3'),
      textBlock('The heart of the menu is Indian: fragrant curries paired with fresh, warm naan, alongside a good showing of seafood like calamari and prawns. Expect creative touches too — coriander-and-feta samosas and sticky spare ribs turn up again and again in reviews as favourites, and there are solid vegetarian options. Pilipan is also known for its cocktails, from passion-and-ginger mojitos to house creations, so it works just as well for a sundowner as for a full dinner.'),
      textBlock('The Setting', 'h3'),
      textBlock('This is an open-air, thatched space right on the water, with tables angled toward the creek and the mangroves. As the sun goes down it delivers the kind of golden-hour view Watamu is famous for, which makes it a natural choice for a relaxed, romantic evening. It feels tucked-away and peaceful rather than busy — more hidden gem than beachfront bustle.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Pilipan is a moderately priced spot, so it’s a treat without being a splurge. It takes bookings and offers takeaway, and reservations generally aren’t required, but calling ahead is wise around sunset. Hours vary between sources and the restaurant is reported to close on Mondays, so confirm directly before you go. Payment is typically cash, card and M-Pesa; dress is casual and the open-air setting suits couples and families alike.'),
    ],
    seoTitle: 'Pilipan Restaurant Watamu — Curries & Creek Sunsets',
    seoDescription: 'Open-air Indian and seafood dining at Pilipan Restaurant, Watamu — famous curries, cocktails and sunset views over Prawn Lake and the Mida Creek mangroves.',
  },

  // ────────────────────────────────────────────────────────── Prawn's Lake
  {
    title: "Prawn's Lake",
    slug: 'prawns-lake-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Turtle Bay Garoda Road, Watamu (beside the prawn ponds / Mida Creek mangroves)',
    price: 1000,
    priceUnit: 'person',
    priceRange: 'budget',
    cuisine: ['Seafood', 'Swahili'],
    openingHours: 'Reported daily 8:00 AM – 10:00 PM (confirm directly — small community operation)',
    atmosphere: 'garden',
    reservationRequired: false,
    tags: [
      'watamu', 'prawns-lake', 'seafood', 'mida-creek', 'mangroves', 'conservation',
      'samosas', 'prawns', 'sunset', 'rustic', 'budget-friendly', 'nature',
    ],
    highlights: [
      highlight('🥟', 'Legendary Samosas', 'The fresh prawn samosas are the signature dish — repeatedly called some of the best reviewers have had'),
      highlight('🦐', 'Fresh Seafood', 'Prawns, calamari, fried kingfish, octopus and lobster at friendly prices'),
      highlight('🌿', 'Mangrove Walk', 'You reach the restaurant on a boardwalk through the mangroves — the arrival is part of the experience'),
      highlight('🌅', 'Lakeside Views', 'Serene views over the prawn ponds make it a peaceful spot for a slow lunch or sunset'),
      highlight('💚', 'Conservation Setting', 'A community conservation project, so your meal supports the local mangrove initiative'),
      highlight('💰', 'Great Value', 'Generous portions at genuinely affordable prices earn steady praise'),
    ],
    description: [
      textBlock("Prawn's Lake — Watamu", 'h2'),
      textBlock("Part restaurant, part community project, Prawn's Lake is one of Watamu's most distinctive places to eat. Set beside the prawn ponds off Turtle Bay Garoda Road and reached on a boardwalk through the mangroves, it pairs a genuinely serene natural setting with fresh, unfussy seafood. It's rustic and low-key rather than polished — and that's exactly the appeal. Because it's run as a conservation initiative, a meal here also supports the local mangrove ecosystem."),
      textBlock('The Menu', 'h3'),
      textBlock('Seafood is the whole point, and it’s done simply and well: fresh prawns, calamari, fried kingfish, octopus and lobster. The dish everyone comes back for is the prawn samosas, which reviewers routinely single out as the best they’ve had. Portions are generous and prices are refreshingly low, though grilled and vegetable options are limited — a few visitors wish for more salads and healthier sides.'),
      textBlock('The Setting', 'h3'),
      textBlock('You arrive by walking out through the mangroves, which sets the tone before you even sit down. The restaurant looks over the prawn ponds and the creek, giving a calm, green, away-from-it-all feel that’s a world apart from the beach bars. It’s a lovely spot for an unhurried lunch or to catch the light toward sunset, with an easygoing, nature-first atmosphere.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Prawn’s Lake is budget-friendly and known for value, so it suits families and travellers watching their spend. It’s reported to open daily from around 8:00 AM to 10:00 PM — worth confirming directly, as it’s a small community operation. Reservations generally aren’t needed; dress is casual, and comfortable shoes help for the mangrove walk in. Bring cash to be safe.'),
    ],
    seoTitle: "Prawn's Lake Watamu — Seafood by the Mangroves",
    seoDescription: "Prawn's Lake, Watamu — famous prawn samosas and fresh, affordable seafood in a serene mangrove and prawn-pond setting off Turtle Bay Road.",
  },

  // ─────────────────────────────────────────────────────────────── Makuti
  {
    title: 'Makuti Ristorante Pizzeria',
    slug: 'makuti-ristorante-pizzeria-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu Beach Road, Watamu 80202 (on the main street)',
    price: 2000,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Italian', 'Mediterranean', 'Seafood'],
    openingHours: 'Reported daily 8:00 AM – 3:00 PM and 6:00 PM – 9:00 PM (confirm directly)',
    atmosphere: 'casual',
    reservationRequired: false,
    tags: [
      'watamu', 'makuti', 'italian', 'pizza', 'pasta', 'seafood',
      'mediterranean', 'casual', 'main-street', 'lobster', 'wifi', 'family-friendly',
    ],
    highlights: [
      highlight('🍕', 'Wood-Fired Pizza', 'A genuine pizzeria turning out pizza and pasta alongside coastal seafood'),
      highlight('🦞', 'Coastal Seafood', 'Lobster, clams and fresh fish sit next to the Italian classics on the menu'),
      highlight('🇮🇹', 'Italian–African Mix', 'Italian, European and African dishes, freshly and expertly prepared under one roof'),
      highlight('💸', 'Good Value', 'Reviewers repeatedly highlight fresh food and very fair prices'),
      highlight('🏠', 'Two-Floor Setting', 'An understated two-storey spot with friendly, helpful staff'),
      highlight('📶', 'Handy Extras', 'Free Wi-Fi and takeaway make it an easy, relaxed stop on the main street'),
    ],
    description: [
      textBlock('Makuti Ristorante Pizzeria — Watamu', 'h2'),
      textBlock("Right on Watamu Beach Road, the town's main street, Makuti is the reliable, unpretentious neighbourhood pizzeria every good beach town needs. It blends Italian cooking with African and European touches, so you can order a proper wood-oven pizza or a plate of fresh coastal seafood in the same sitting. The mood is casual and easygoing across its two floors, with staff regulars describe as genuinely friendly and helpful. It's the kind of place you come back to more than once in a stay."),
      textBlock('The Menu', 'h3'),
      textBlock('At its core this is a pizzeria — pizza and pasta done freshly and well — but the kitchen ranges wider, with Italian, European and African dishes and a strong seafood showing that includes lobster, clams and fresh fish. Portions and quality draw steady praise, and the meat dishes in particular get called out by reviewers. It’s straightforward, satisfying food rather than fine dining, which is exactly why locals rate it.'),
      textBlock('The Vibe', 'h3'),
      textBlock('Makuti is understated and welcoming, spread over two floors just off the main drag rather than perched on the sand. It’s relaxed and family-friendly, an easy spot for a casual lunch or an unfussy dinner. Free Wi-Fi and a helpful team make it comfortable to linger.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Makuti sits in the moderate price band and is repeatedly praised for good value. It’s reported to open daily for lunch (roughly 8:00 AM–3:00 PM) and dinner (about 6:00 PM–9:00 PM) — confirm directly, as coastal hours shift with the season. Reservations generally aren’t required; dress is casual and it’s fine for kids. Payment options include cash, Visa, Mastercard and M-Pesa, and takeaway is available.'),
    ],
    seoTitle: 'Makuti Ristorante Pizzeria — Watamu Beach Road',
    seoDescription: 'Makuti Ristorante Pizzeria, Watamu — casual Italian pizza, pasta and fresh coastal seafood on the main street, praised for friendly service and great value.',
  },

  // ────────────────────────────────────────────────────────────── Tortuga
  {
    title: 'Tortuga Beach Bar',
    slug: 'tortuga-beach-bar-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Garoda Beach, Watamu (within the Watamu Marine Park beach area)',
    price: 2000,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Seafood', 'Fusion'],
    openingHours: 'Hours vary — check Instagram (@tortuga_bar_garodawatamu) or call ahead',
    atmosphere: 'beachfront',
    reservationRequired: false,
    tags: [
      'beachfront', 'watamu', 'garoda-beach', 'beach-bar', 'cocktails', 'sunset',
      'colorful', 'drinks', 'live-music', 'parties', 'seafood', 'kenya-coast',
    ],
    highlights: [
      highlight('🎨', 'Colourful Beach Bar', 'A vibrant, colour-drenched beach bar where everything bursts with colour'),
      highlight('🏖️', 'Garoda Beach Setting', 'Sits directly on Garoda Beach, among the finest stretches of sand in Watamu'),
      highlight('🍹', 'Cocktails & Drinks', 'Known first and foremost as a spot for cocktails and drinks near the sand'),
      highlight('🌅', 'Sunset Vibes', 'A laid-back beach-bar mood built around sundowners and easy coastal evenings'),
      highlight('🎶', 'Parties & Music', 'Hosts parties and events, giving it a livelier, social edge after dark'),
    ],
    description: [
      textBlock('Tortuga Beach Bar — Watamu', 'h2'),
      textBlock("Tortuga is a colourful, easygoing beach bar set right on Garoda Beach, one of the most beautiful stretches of sand in Watamu. It's all about the barefoot beach-bar life: bright colours, cold drinks and the sea a few steps away. It has built its reputation largely on social media, where it comes across as a fun, sociable spot for a daytime drink or a sundowner. If you're after a relaxed, unpretentious place to pause on the beach, this is that kind of address. (Note: this is the Watamu beach bar, not the Tortuga rum bar in Nairobi.)"),
      textBlock('The Vibe', 'h3'),
      textBlock('The draw here is atmosphere over formality. Tortuga plays up a vivid, playful look — its own posts describe a place where everything bursts with colour — and pairs it with cocktails, drinks and the occasional party or live-music night. It reads as a spot to sink into a chair, order a round and watch the day drift by, rather than a sit-down fine-dining room. Expect a lively, informal crowd, especially as the afternoon turns to evening.'),
      textBlock('The Setting', 'h3'),
      textBlock('Location is Tortuga’s biggest asset. It sits on Garoda Beach within the Watamu Marine Park, a shoreline regularly singled out among the best in the region, so the ocean views and easy beach access come as standard. It’s the sort of place you can wander to straight off the sand for a cold drink and a break from the sun. The mood is casual and beach-first throughout.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Because Tortuga’s presence is mainly on Instagram (@tortuga_bar_garodawatamu and @tortugabeachh), some practical details are best confirmed directly before you go. Opening hours, the full food menu and pricing aren’t reliably published online, so check their Instagram or call ahead — especially if you’re planning around an event or party night. No reservation is generally needed for a casual beach-bar visit. Dress is relaxed and beach-appropriate.'),
    ],
    seoTitle: 'Tortuga Beach Bar — Garoda Beach, Watamu',
    seoDescription: "A colourful, laid-back beach bar on Watamu's Garoda Beach — cocktails, drinks, sunset vibes and parties right by the ocean.",
  },

  // ──────────────────────────────────────────── Theo's Pizza  ⚠️ UNVERIFIED
  {
    title: "Theo's Pizza",
    slug: 'theos-pizza-watamu',
    status: 'draft', // ⚠️ No restaurant of this name could be found in Watamu. Confirm exact name/handle before publishing.
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Watamu (address to be confirmed)',
    priceRange: 'mid-range',
    cuisine: ['Italian'],
    openingHours: 'To be confirmed',
    atmosphere: 'casual',
    reservationRequired: false,
    tags: ['pizza', 'watamu', 'italian', 'pizzeria', 'casual', 'unconfirmed'],
    highlights: [
      highlight('🍕', 'Pizzeria', 'An Italian pizzeria in Watamu — details to be confirmed with the owner'),
    ],
    description: [
      textBlock("Theo's Pizza — Watamu", 'h2'),
      textBlock("This listing is a placeholder held as a draft. We were unable to independently verify a restaurant named “Theo's Pizza” in Watamu across TripAdvisor, Google, EatOut and Watamu restaurant directories. Before publishing, please confirm the exact business name and spelling, its location in Watamu, opening hours, menu and contact details — then this profile can be completed and moved to published."),
    ],
    seoTitle: "Theo's Pizza — Watamu",
    seoDescription: 'Italian pizzeria in Watamu — listing pending verification of the venue’s name and details.',
  },

  // ────────────────────────────────────────────────────────────── Kokomo
  {
    title: 'Kokomo Beach Bar & Restaurant',
    slug: 'kokomo-beach-bar-restaurant-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Mapambo Bay, Watamu Beach, Kilifi County',
    price: 3000,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Mediterranean', 'Seafood', 'BBQ'],
    openingHours: 'Daily 12:00 PM – 12:00 AM (noon to midnight)',
    atmosphere: 'beachfront',
    reservationRequired: false,
    tags: [
      'beachfront', 'watamu', 'mediterranean', 'seafood', 'cocktails', 'sunset',
      'mezze', 'lebanese', 'mapambo-bay', 'ocean-view', 'grilled-meats', 'family',
    ],
    highlights: [
      highlight('🍢', 'Lebanese Mezze', 'Mezze spreads with tabbouleh, fattoush and octopus provençale that reviewers single out'),
      highlight('🍔', 'Gourmet Burgers', 'A three-cut prime beef burger with caramelised onions and house sauce'),
      highlight('🌅', 'Sunset Bay Views', 'Tables, booths and hanging seats set right over the sand of Mapambo Bay'),
      highlight('🦐', 'Fresh Seafood', 'Daily-caught fish and seafood platters prepared Mediterranean-style'),
      highlight('🍹', 'Cocktails & Wine', 'A well-stocked bar with signature cocktails, local beers and a curated wine list'),
      highlight('🪑', 'Beach Day Beds', 'Loungers and day beds facing the ocean for a relaxed all-afternoon stay'),
    ],
    description: [
      textBlock('Kokomo Beach Bar & Restaurant — Watamu', 'h2'),
      textBlock("Tucked into the curve of Mapambo Bay, Kokomo is where Watamu's turquoise water meets the flavours of the Mediterranean. It has quietly become one of the coast's most talked-about beach tables, blending Lebanese, Greek, Spanish, French and Italian influences into a menu that feels both relaxed and considered. The vibe is barefoot-elegant: you can drop in for a long lunch straight off the sand or settle in for a candlelit dinner as the sun goes down. Whether you come for the food or just a cocktail on a day bed, the ocean is always the main event."),
      textBlock('The Menu', 'h3'),
      textBlock('The kitchen leans into bold Mediterranean flavours — expect generous mezze spreads with tabbouleh, fattoush and standout dishes like octopus provençale, alongside expertly grilled meats, fresh local seafood and handmade pastas. The gourmet burgers have their own following, built on prime beef, caramelised onions and a house sauce, and there are vegetarian options and tempting tarts and cheesecakes to finish. Behind the bar you’ll find signature cocktails, local beers and a curated wine list.'),
      textBlock('The Setting', 'h3'),
      textBlock('This is beachfront dining in the truest sense. Tables, booths and even hanging seats are arranged right over the sand, with day beds facing the water and the sound of the waves as your soundtrack. It’s a laid-back, breezy space that works equally well for families, couples and groups, and it really comes alive at sunset when the light turns Mapambo Bay gold. Come early to claim a spot near the water and stay through to the stars.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Kokomo is open daily from noon until midnight, so it suits both a lazy lunch and a late dinner. Pricing sits in the comfortable mid-range for Watamu, with the gourmet burger around KES 2,400. Reservations aren’t essential but are worth making on busy weekends, and it’s a good idea to ask about the day’s specials. Dress is casual beach-smart, and the setting is family-friendly.'),
    ],
    seoTitle: 'Kokomo Beach Bar & Restaurant — Watamu, Kenya',
    seoDescription: "Mediterranean beachfront dining on Watamu's Mapambo Bay — Lebanese mezze, fresh seafood, gourmet burgers and sunset cocktails. Open daily noon–midnight.",
  },

  // ──────────────────────────────────────────────────── African Footprint
  {
    title: 'African Footprint',
    slug: 'african-footprint-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Jacaranda Beach, Watamu (northern Watamu / Jacaranda area)',
    price: 2500,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Italian', 'Seafood', 'Mediterranean'],
    openingHours: 'Open daily as a beach club into the evening (confirm current hours directly)',
    atmosphere: 'beachfront',
    reservationRequired: false,
    tags: [
      'beachfront', 'watamu', 'jacaranda-beach', 'italian', 'seafood', 'aperitivo',
      'sunbeds', 'beach-bar', 'focaccia', 'sunset', 'cocktails', 'family',
    ],
    highlights: [
      highlight('🏖️', 'Beach Club Setting', 'Hanging sun beds, well-spaced loungers and a bamboo bar with swing-seat stools on Jacaranda Beach'),
      highlight('🍕', 'Ligurian Focaccia', 'Reviewers single out the fresh Ligurian focaccia as a standout Italian touch'),
      highlight('🍷', 'Aperitivo & Wine', 'Known for excellent aperitifs and good wine enjoyed by the water'),
      highlight('🐟', 'Fresh Seafood', 'Freshly prepared seafood and coastal dishes served on the shore'),
      highlight('🌍', 'Italian-Kenyan Soul', 'Run by an Italian owner and her Kenyan husband — European quality with African warmth'),
      highlight('🌅', 'Terrace Views', 'An upstairs dining terrace overlooking the beach'),
    ],
    description: [
      textBlock('African Footprint — Watamu', 'h2'),
      textBlock('African Footprint is a beach bar and restaurant set right on the sand of Jacaranda Beach, one of the quieter, more scenic stretches of Watamu’s coastline. It was created by an Italian owner and her Kenyan husband, and that pairing defines the whole experience: European quality and attention to detail woven together with genuine African warmth. Reviewers repeatedly call it a place that makes you feel immediately at home, describing it as "a real jewel made of love, care and authenticity." It’s the kind of spot where a lazy beach day slides naturally into sundowners without you ever wanting to leave.'),
      textBlock('The Menu', 'h3'),
      textBlock('The kitchen leans Italian-Mediterranean with a strong coastal accent. The star that guests mention again and again is the fresh Ligurian focaccia, served alongside excellent aperitifs and a well-chosen wine list. You’ll also find freshly prepared seafood and coastal dishes brought to you a few steps from the water. It’s food built for grazing and lingering over a drink rather than a heavy formal meal, and it pairs beautifully with the relaxed beach-club rhythm.'),
      textBlock('The Setting', 'h3'),
      textBlock('This is barefoot beach-club living. There’s a bamboo bar with swings for stools, hanging and well-spaced sun beds that guests praise as comfortable and always clean, and an upstairs terrace looking out over the beach. The mood is unhurried and warm, equally suited to couples wanting a romantic drink at golden hour or families settling in for the day. The Jacaranda location gives it space and a laid-back feel that busier central Watamu beaches don’t always have.'),
      textBlock('Good to Know', 'h3'),
      textBlock('African Footprint works as both a daytime beach club and a place to eat and drink, so it’s easy to make a whole afternoon and evening of it. Specific opening hours weren’t verifiable, so budget as mid-range and confirm current hours directly before a special trip. No reservation is generally needed for the beach and bar, though it’s worth calling ahead for larger groups. Dress is casual beachwear, and the calm, spacious setting is family-friendly.'),
    ],
    seoTitle: 'African Footprint — Beach Bar & Restaurant, Watamu',
    seoDescription: "Italian-Kenyan beach club on Watamu's Jacaranda Beach: Ligurian focaccia, aperitivo, fresh seafood and hanging sun beds by the sea.",
  },

  // ────────────────────────────────────────────────────────── Swahili Cafe
  {
    title: 'Swahili Cafe',
    slug: 'swahili-cafe-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Gede–Watamu Road, Timboni village, Watamu',
    price: 800,
    priceUnit: 'person',
    priceRange: 'budget',
    cuisine: ['Swahili', 'Seafood', 'Kenyan'],
    openingHours: 'Reported Tuesday–Sunday (confirm directly; +254 716 343248)',
    atmosphere: 'casual',
    reservationRequired: false,
    tags: [
      'swahili', 'watamu', 'timboni', 'local-food', 'seafood', 'budget',
      'authentic', 'pilau', 'biryani', 'family', 'kenyan', 'coastal-cuisine',
    ],
    highlights: [
      highlight('🍛', 'Authentic Swahili', 'Pilau, biryani and coconut-rich coastal dishes made the traditional way'),
      highlight('🐟', 'Fresh Coast Seafood', 'Deep-fried whole fish, kingfish and calamari that reviewers call absolutely fresh'),
      highlight('💰', 'Great Value', 'Guests repeatedly note eating well and spending very little'),
      highlight('🫖', 'Swahili Tea', 'Spiced Swahili tea to finish a home-style meal'),
      highlight('🏠', 'Home-Cooked Feel', 'An unpretentious, home-like kitchen popular with both locals and visitors'),
      highlight('🌱', 'Veg Options', 'Coconut beans, sukuma, kachumbari and veggie samosas for meat-free diners'),
    ],
    description: [
      textBlock('Swahili Cafe — Watamu', 'h2'),
      textBlock("Swahili Cafe is the place Watamu locals and in-the-know visitors point you to when you want the real thing: honest, home-style Swahili cooking with no frills and no markup. Tucked along the Gede–Watamu Road in Timboni village, it's deliberately simple — reviewers are upfront that looks aren't the draw here — but the kitchen turns out some of the freshest, most authentic coastal food in town. It's a warm, unpretentious spot that treats a plate of pilau with the same care a fancier restaurant reserves for a tasting menu. Come hungry and leave full, having spent very little."),
      textBlock('The Menu', 'h3'),
      textBlock('The menu is a tour of Swahili coastal classics: fragrant pilau and biryani, coconut beans, sukuma and kachumbari, goat soup and stews, and seafood that guests describe as absolutely fresh — deep-fried whole fish, kingfish and calamari among the favourites. Vegetarians are well looked after with samosas and coconut-based dishes, and a cup of spiced Swahili tea is the traditional way to round things off. Portions are generous and the flavours are the genuine article rather than a toned-down tourist version.'),
      textBlock('The Vibe', 'h3'),
      textBlock('This is casual, everyday dining at its most authentic — a modest, friendly local kitchen rather than a polished restaurant. The crowd is a mix of Watamu residents and travellers looking for something real, and the service earns steady praise for being welcoming and attentive. If you want atmosphere by way of great food, full tables and a genuine slice of Watamu life, this delivers it.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Swahili Cafe is firmly budget-friendly — one of the cheapest good meals you’ll find in Watamu — and a reliable pick for families. It’s reachable on +254 716 343248; opening days are reported as roughly Tuesday–Sunday but weren’t independently confirmed, so call ahead if timing matters. Dress is completely casual. Carry cash and confirm current hours and card acceptance on arrival.'),
    ],
    seoTitle: 'Swahili Cafe — Authentic Swahili Food in Watamu',
    seoDescription: 'Local Timboni favourite in Watamu for authentic, budget Swahili food: pilau, biryani, fresh fish, calamari and spiced Swahili tea.',
  },

  // ─────────────────────────────────────────────────────────────── Napul'è
  // SKIPPED — already exists on Klickenya as "Napul'è Restaurant"
  // (slug: napul-restaurant, published, Watamu). Not re-created here to avoid a duplicate.

  // ──────────────────────────────────────────────────────────── Lichthaus
  {
    title: 'Lichthaus',
    slug: 'lichthaus-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Mida Creek, Watamu (creek side, associated with Temple Point)',
    price: 2500,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Mediterranean', 'Seafood', 'BBQ'],
    openingHours: 'Reported daily 12:00 PM – 10:00 PM (confirm seasonally)',
    atmosphere: 'beachfront',
    reservationRequired: true,
    tags: [
      'mida-creek', 'watamu', 'sunset', 'cocktails', 'beachfront', 'bbq',
      'seafood', 'mediterranean', 'boho', 'over-water', 'grill', 'sundowners',
    ],
    highlights: [
      highlight('🌅', 'Mida Creek Sunset', 'Famous for sweeping sunset views over the shimmering waters of Mida Creek'),
      highlight('🕸️', 'Nets Over Water', 'Signature suspended rope nets let you lounge and dine floating above the water'),
      highlight('🍹', 'Sundowner Cocktails', 'Well-crafted tropical cocktails and mojitos that draw a lively evening crowd'),
      highlight('🔥', 'Coal-Grilled BBQ', 'Daily fresh BBQ with skewers and grilled fish cooked over coals'),
      highlight('🎶', 'Boho Afro-House Vibe', 'Relaxed cushion seating, Afro-house music and an unconventional, social atmosphere'),
    ],
    description: [
      textBlock('Lichthaus — Watamu', 'h2'),
      textBlock("Perched over the tidal waters of Mida Creek, Lichthaus is one of Watamu's most talked-about sundowner spots — a barefoot, boho bar-and-grill where the main event is the sky. As the light drops, the creek turns molten gold and the whole place seems to float above the water. It's casual and unpolished by design: cushions on the ground, Afro-house drifting over the crowd, and a young, social energy that builds as the sun sinks. This is where you come to watch one of the coast's great sunsets with a cocktail in hand."),
      textBlock('The Menu', 'h3'),
      textBlock('The kitchen keeps things simple and Mediterranean-leaning: fresh skewers and fish grilled over coals, mezze-style plates with salad, feta, hummus and lentils, and hearty grilled meats. Drinks are the strong suit — tropical cocktails and mojitos are a signature, made to be sipped slowly as the light fades. The food menu is deliberately short, so treat it as good grazing to accompany the setting rather than a sprawling à la carte experience.'),
      textBlock('The Setting', 'h3'),
      textBlock('The signature feature is the cluster of rope nets suspended above the creek, where you can lie back over the water with a drink. Seating is relaxed and low-slung, the mood is unhurried, and the creek-side position makes it a magnet at golden hour. It does get busy — expect a crowd and a buzzy, slightly hectic atmosphere at peak sunset time — which is part of the appeal but also the main trade-off.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Open daily, typically from around midday until late evening. To secure the prime over-water net seating you’ll usually need to reserve ahead, and deposits may apply — ask when you book. There’s often an entry/cover arrangement that’s redeemable at the bar. Come for sundowners and drinks first and foremost; prices sit at the higher end for Watamu, service can be leisurely, and it’s more of a scene than a quiet dinner. Confirm current hours, booking terms and prices directly before visiting.'),
    ],
    seoTitle: 'Lichthaus Watamu — Sunset Bar Over Mida Creek',
    seoDescription: 'Lichthaus in Watamu is a boho beachfront bar over Mida Creek famed for suspended nets, sunset views, cocktails and fresh coal-grilled BBQ.',
  },

  // ──────────────────────────────────────────────── 7 Vizi  ⚠️ THIN DATA
  {
    title: '7 Vizi',
    slug: 'sette-vizi-watamu',
    status: 'draft', // ⚠️ Confirmed to exist near Jacaranda but almost no operational detail online. Verify before publishing.
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Jacaranda area, Watamu (near Jacaranda Beach Resort)',
    priceRange: 'mid-range',
    cuisine: ['Italian'],
    openingHours: 'To be confirmed',
    atmosphere: 'casual',
    reservationRequired: false,
    tags: [
      '7-vizi', 'sette-vizi', 'italian', 'watamu', 'jacaranda', 'cafe',
      'casual', 'aperitivo', 'coffee', 'cocktails', 'kilifi', 'unconfirmed',
    ],
    highlights: [
      highlight('☕', 'Casual Café Stop', 'A café-style spot within easy walking distance of Jacaranda Beach Resort'),
      highlight('🇮🇹', 'Italian Roots', '"Sette Vizi" (Seven Vices) reflects Watamu’s strong Italian-expat dining culture'),
      highlight('📍', 'Jacaranda Location', 'Conveniently placed near the Jacaranda Road accommodation cluster'),
    ],
    description: [
      textBlock('7 Vizi — Watamu', 'h2'),
      textBlock('7 Vizi — "Sette Vizi," Italian for "the seven vices" — is a small Italian-flavoured spot in Watamu’s Jacaranda area, a short stroll from Jacaranda Beach Resort. Its playful name fits right into Watamu’s lively Italian-expat food scene, where cafés, delis and pizzerias run by Italian owners are part of the town’s character.'),
      textBlock('Note', 'h3'),
      textBlock('This listing is held as a draft. The venue is confirmed to exist in Watamu but has almost no operational detail online (and should not be confused with the same-name "7 Vizi" in Cagliari, Italy). Before publishing, confirm the exact format (café, bar or restaurant), menu, opening hours, prices and contact details directly.'),
    ],
    seoTitle: '7 Vizi Watamu — Italian Café Near Jacaranda',
    seoDescription: "7 Vizi (Sette Vizi) is a casual Italian-style spot in Watamu's Jacaranda area, a short walk from Jacaranda Beach Resort. Details best confirmed locally.",
  },

  // ───────────────────────────────────────────────────────── La Rosticceria
  {
    title: 'La Rosticceria',
    slug: 'la-rosticceria-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Jacaranda Road, Watamu',
    price: 1200,
    priceUnit: 'person',
    priceRange: 'budget',
    cuisine: ['Italian', 'Fast Food', 'Fusion'],
    openingHours: 'Reported daily approx. 7:30 AM – 10:00 PM (breakfast, lunch and dinner — confirm directly)',
    atmosphere: 'casual',
    reservationRequired: false,
    tags: [
      'italian', 'watamu', 'jacaranda-road', 'deli', 'casual', 'affordable',
      'family-friendly', 'cocktails', 'breakfast', 'lunch', 'dinner', 'live-music',
    ],
    highlights: [
      highlight('🧀', 'Fried Mozzarella', 'A standout starter reviewers repeatedly single out as a must-try'),
      highlight('🍫', 'Nutellamisu', 'Their playful Nutella-tiramisù twist is a signature dessert'),
      highlight('👨‍🍳', 'Owner-Run Kitchen', 'Tommy runs the kitchen while Marco mixes the cocktails — a hands-on, personal feel'),
      highlight('💸', 'Great Value', 'A rare genuinely affordable Italian spot in a pricey coastal town'),
      highlight('🎶', 'Relaxed & Family-Friendly', 'Good music, parking and a welcoming vibe suited to families and remote workers alike'),
    ],
    description: [
      textBlock('La Rosticceria — Watamu', 'h2'),
      textBlock("La Rosticceria is a friendly, owner-run Italian deli-restaurant on Watamu's Jacaranda Road, and one of the better-value Italian spots in a town where Italian food is everywhere but rarely cheap. It's a relaxed, unpretentious place run by Tommy and Marco — Tommy in the kitchen, Marco on the cocktails — where regulars come for anything from a morning coffee to a full dinner. Warm service and a genuinely varied menu have earned it a small but glowing following."),
      textBlock('The Menu', 'h3'),
      textBlock('The kitchen spans casual Italian comfort food with a few crowd-pleasing twists. Reviewers rave about the fried mozzarella to start and the "nutellamisu" — a Nutella-laced tiramisù — to finish. Alongside the Italian staples you’ll find approachable options like cheeseburgers and chicken with fries, plus cocktails mixed by Marco. It’s the kind of menu with something for everyone, which is exactly why families and groups keep coming back.'),
      textBlock('The Vibe', 'h3'),
      textBlock('This is a casual, easygoing spot rather than a special-occasion restaurant. Expect good music, a welcoming atmosphere, parking, and staff who are quick and polite. It works equally well as a laid-back lunch, a coffee-and-work stop, or a relaxed dinner with cocktails. The mood is friendly and low-key — you’re being looked after by the owners themselves.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Open daily and serving breakfast, lunch and dinner (roughly from early morning until around 10 PM — confirm current hours). No reservations needed; just walk in. Prices are budget-friendly by Watamu standards, making it a reliable everyday choice rather than a splurge. It’s family-friendly with parking available, and casual dress is perfectly fine.'),
    ],
    seoTitle: 'La Rosticceria Watamu — Affordable Italian Deli',
    seoDescription: 'La Rosticceria on Jacaranda Road, Watamu is a friendly owner-run Italian deli-restaurant loved for great value, fried mozzarella and nutellamisu.',
  },

  // ───────────────────────────────────────── Non Solo Padel  ⚠️ MAY BE CLOSED
  {
    title: 'Non Solo Padel Kenya',
    slug: 'non-solo-padel-watamu',
    status: 'draft', // ⚠️ Google-aggregated data flags this "permanently closed". Confirm it is trading (+254 798 686420) before publishing.
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Kanani Road, Watamu, Kilifi County',
    price: 2000,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Italian'],
    openingHours: 'Reported daily 8:00 AM – 11:00 PM (unconfirmed — verify the venue is open)',
    atmosphere: 'family',
    reservationRequired: false,
    tags: [
      'padel', 'watamu', 'italian', 'pizza', 'pasta', 'gelato',
      'sports-club', 'family-friendly', 'garden', 'cocktails', 'kilifi', 'unconfirmed',
    ],
    highlights: [
      highlight('🎾', 'Three Padel Courts', "Kenya's first purpose-built padel club, with three courts for players of every level"),
      highlight('🍕', 'Italian Pizzeria', 'Wood-fired-style pizza and fresh pasta (guanciale carbonara is a reviewer favourite)'),
      highlight('🍨', 'Non Solo Gelato', 'An in-house ice-cream parlour serving artisanal gelato'),
      highlight('🧒', 'Family-Friendly', 'A children’s play area and relaxed garden setting for the whole family'),
      highlight('🍹', 'Bar & Cocktails', 'Full bar service with juices, protein shakes, Italian wines and cocktails'),
    ],
    description: [
      textBlock('Non Solo Padel Kenya — Watamu', 'h2'),
      textBlock('Non Solo Padel — "Not Only Padel" — brought Kenya its first purpose-built padel club, and it is exactly as the name promises: far more than a place to play. Set just back from the coast in Watamu, this is a sports club, Italian restaurant, pizzeria, bar and gelateria rolled into one easygoing garden venue. You come for a fast-paced game on one of the three courts and stay for a plate of pasta and a scoop of gelato in the shade.'),
      textBlock('The Menu', 'h3'),
      textBlock('The kitchen leans proudly Italian. Expect fresh pasta — the carbonara, made with genuine guanciale, earns particular praise — alongside pizza, meat dishes, fresh juices and protein shakes for the post-match crowd. There is a full bar with Italian wines and cocktails, and the venue’s own Non Solo Gelato parlour rounds things off with artisanal ice cream. On the sport side, three padel courts cater to all levels; court bookings are handled directly by the club.'),
      textBlock('The Setting', 'h3'),
      textBlock('This is a garden sports club rather than a beachfront spot, and that is part of its charm: shaded relaxation areas, a children’s play zone and a laid-back social buzz between the courts. It is built for lingering — a place where a match rolls naturally into lunch, drinks and dessert.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Please note: some online listings show this venue as possibly permanently closed, so this listing is held as a draft — call ahead on +254 798 686420 to confirm it is open before publishing or visiting. When trading, it is family-friendly and casual; reservations for the restaurant aren’t usually required, but it’s worth booking a padel court ahead. Confirm current court and menu rates directly.'),
    ],
    seoTitle: 'Non Solo Padel Kenya — Padel & Italian Dining in Watamu',
    seoDescription: "Kenya's first padel club in Watamu: three courts plus authentic Italian pizza, pasta, gelato and a full bar in a relaxed, family-friendly garden setting.",
  },

  // ──────────────────────────────────────────────────────── The Rock and Sea
  {
    title: 'The Rock and Sea',
    slug: 'the-rock-and-sea-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Coral cliff above Mida Creek, near Uyombo/Matzangoni village, Watamu',
    price: 3500,
    priceUnit: 'person',
    priceRange: 'fine-dining',
    cuisine: ['Italian', 'Seafood', 'Fusion'],
    openingHours: 'Reported daily 8:00 AM – 10:00 PM (confirm; reservation needed for the boat transfer)',
    atmosphere: 'romantic',
    reservationRequired: true,
    tags: [
      'watamu', 'panoramic', 'seafood', 'italian', 'fusion', 'sunset',
      'eco-lodge', 'romantic', 'mida-creek', 'fine-dining', 'coral-cliff', 'honeymoon',
    ],
    highlights: [
      highlight('🌅', 'Nearly 360° Views', 'Perched on coral rock ~40 m up, with panoramas from ocean sunrises to savannah sunsets'),
      highlight('🦞', 'Fresh Seafood', 'Grilled lobster, ceviche and prawn tagliatelle built around the daily Indian Ocean catch'),
      highlight('🍝', 'Handmade Pasta', 'House-made pasta and Italian classics with a creative fusion twist'),
      highlight('🌿', 'Eco-Luxury Lodge', 'Part of a "barefoot luxury" ecolodge with sea-view suites, spa and honeymoon packages'),
      highlight('🚤', 'Arrive by Boat', 'Optional boat transfer from Lichthaus / Temple Point turns dinner into a mini creek adventure'),
      highlight('🥗', 'Vegan & Kids Options', 'Dedicated vegetarian, vegan and children’s menus alongside the seafood'),
    ],
    description: [
      textBlock('The Rock and Sea — Watamu', 'h2'),
      textBlock('The Rock and Sea is one of Watamu’s most dramatic dining settings — a panoramic restaurant built on a coral outcrop rising roughly 40 metres above the water, where the view sweeps almost the full 360 degrees. From your table you can watch the sun rise over the Indian Ocean and set over the savannah, with the shifting colours of Mida Creek and its mangrove forest in between. It is the restaurant of an intimate eco-luxury lodge that styles itself around "barefoot luxury," and the mood is unmistakably romantic: quiet, elevated and a little bit magical.'),
      textBlock('The Menu', 'h3'),
      textBlock('The kitchen marries Italian craft with the day’s catch. Seafood is the star — think grilled lobster, ceviche and prawn tagliatelle — alongside handmade pasta and fusion dishes built from local and imported ingredients. Vegetarian, vegan and children’s options round out the menu, and there is a generous drinks list of cocktails and wine to carry you through a sundowner and into dinner. Sunset cocktails on the rock are something of a signature.'),
      textBlock('The Setting', 'h3'),
      textBlock('This is a clifftop sanctuary rather than a busy beach bar — secluded, green and panoramic, with the ocean on one side and the creek and mangroves on the other. The lodge layers in sea-view suites, a spa and honeymoon packages, so a meal here can easily stretch into a whole slow afternoon or a romantic overnight stay. Getting there is part of the experience: drive in through Matzangoni village with free parking, or book a boat transfer across from the Watamu side.'),
      textBlock('Good to Know', 'h3'),
      textBlock('Reservations are recommended and are effectively required if you want a boat transfer — book ahead by phone (+254 799 670 253) or through the website. Hours are reported as daily 8:00 AM to 10:00 PM, but confirm when you book. This sits at the upper end of the price range, so come for a special occasion rather than a quick bite. It is romantic and adult-leaning but does cater to families with a kids’ menu; smart-casual dress suits the setting. Payment options include cash, Visa, Mastercard and M-Pesa.'),
    ],
    seoTitle: 'The Rock and Sea Watamu — Panoramic Clifftop Dining',
    seoDescription: 'Fine-dining seafood and Italian fusion on a coral cliff above Mida Creek, Watamu — near-360° ocean and sunset views at an eco-luxury lodge.',
  },

  // ─────────────────────────────────────────────────────────── The Musafir
  {
    title: 'The Musafir',
    slug: 'the-musafir-watamu',
    status: 'published',
    city: 'Watamu',
    county: 'Kilifi',
    address: 'Moored on Mida Creek, Watamu (boat transfer from Lichthaus / Temple Point)',
    price: 4000,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Seafood', 'Fusion'],
    openingHours: 'Thursday–Monday, 4:30 PM – 10:00 PM (kitchen closes 9:00 PM; closed Tue & Wed)',
    atmosphere: 'romantic',
    reservationRequired: true,
    tags: [
      'dhow', 'watamu', 'mida-creek', 'floating-bar', 'sundowner', 'sunset',
      'cocktails', 'seafood', 'romantic', 'boat-transfer', 'slow-dining', 'kenya',
    ],
    highlights: [
      highlight('⛵', 'Floating Dhow', 'Dinner and drinks aboard a traditional dhow set on the calm waters of Mida Creek'),
      highlight('🌇', 'Golden-Hour Sundowners', 'Built for slow, easy evenings — cocktails and sunset over the creek before dinner'),
      highlight('🍽️', 'Slow Dining', 'An unhurried "no rush" experience of good food and great drinks on the water'),
      highlight('🚤', 'Complimentary Transfer', 'Free boat transfers from Lichthaus (park fees covered when you dine), last one at 8:00 PM'),
      highlight('🤝', 'Temple Point & Lichthaus', 'A joint venture from two of Watamu’s best-known creek-side names'),
      highlight('🌙', 'Under the Stars', 'Evenings run into the night on the water beneath the East African sky'),
    ],
    description: [
      textBlock('The Musafir — Watamu', 'h2'),
      textBlock('The Musafir is one of Watamu’s newest and most atmospheric dining ideas: a traditional dhow reborn as a floating bar and restaurant, moored on the still waters of Mida Creek. Brought to you jointly by Temple Point and its floating bar Lichthaus, it is designed around a single, simple pleasure — slowing right down. You arrive by boat, settle in as the light turns golden, and let the evening unfold with drinks, food and no reason to hurry. It is the kind of place that turns a meal into a memory.'),
      textBlock('The Menu', 'h3'),
      textBlock('The Musafir is built for easy evenings of "good food, great drinks and no rush." Expect a sundowner-into-dinner rhythm — cocktails as the sun drops, followed by a coastal dinner served on the water. The kitchen runs on an evening schedule (last orders at 8:45 PM), and lunch service has been announced as coming soon. Dining works on a minimum spend of around KES 4,000 per person, which is fully consumable against food and drinks.'),
      textBlock('The Experience', 'h3'),
      textBlock('This is dining as an experience rather than a fixed address — a hand-crafted dhow floating on Mida Creek, framed by mangroves and open sky, best at golden hour and into the starlit night. The mood is romantic and calm, a world away from a busy restaurant floor. Getting there is part of the appeal: a short, complimentary boat transfer from Lichthaus glides you out to the dhow and back.'),
      textBlock('Good to Know', 'h3'),
      textBlock('The Musafir is open Thursday to Monday, roughly 4:30 PM to 10:00 PM, and closed Tuesdays and Wednesdays — confirm current days before you go. Reservations are essential and are made by messaging @themusafir_watamu directly; this also lets you arrange your transfer (the last one leaves Lichthaus at 8:00 PM, and park fees for the round-trip are covered when you dine or drink). Budget the KES 4,000 minimum spend per person. The setting suits couples and relaxed groups; dress is coastal-casual.'),
    ],
    seoTitle: 'The Musafir Watamu — Floating Dhow Dining on Mida Creek',
    seoDescription: 'A traditional dhow turned floating bar and restaurant on Mida Creek, Watamu. Sunset cocktails and slow dinners on the water, by Temple Point & Lichthaus.',
  },
]

async function main() {
  console.log(`🍽️  Adding ${RESTAURANTS.length} Watamu restaurants\n`)

  let created = 0
  let skipped = 0
  const drafts: string[] = []

  for (const r of RESTAURANTS) {
    console.log(`  Creating: ${r.title} (${r.status})...`)

    const existing = await client.fetch(
      `*[_type == "listing" && slug.current == $slug][0]._id`,
      { slug: r.slug }
    )
    if (existing) {
      console.log(`    ⏭️  Already exists (${existing}), skipping`)
      skipped++
      continue
    }

    const doc: any = {
      _type: 'listing',
      title: r.title,
      slug: { _type: 'slug', current: r.slug },
      type: 'experience',
      subcategory: 'restaurants',
      status: r.status,
      verificationStatus: 'pending',
      city: r.city,
      county: r.county,
      address: r.address,
      priceRange: r.priceRange,
      cuisine: r.cuisine,
      openingHours: r.openingHours,
      reservationRequired: r.reservationRequired,
      hostName: 'Klickenya',
      tags: r.tags,
      highlights: r.highlights,
      description: r.description,
      seoTitle: r.seoTitle,
      seoDescription: r.seoDescription,
    }
    if (typeof r.price === 'number') doc.price = r.price
    if (r.priceUnit) doc.priceUnit = r.priceUnit
    if (r.atmosphere) doc.atmosphere = r.atmosphere

    await client.create(doc)
    console.log(`    ✅ Created`)
    created++
    if (r.status === 'draft') drafts.push(r.title)
  }

  console.log(`\n✅ Done — created ${created}, skipped ${skipped}.`)
  if (drafts.length) {
    console.log(`\n⚠️  Held as DRAFT (verify before publishing): ${drafts.join(', ')}`)
  }
  console.log(`\n📸 Next: run scripts/upload-watamu-images.ts to attach photos.`)
  console.log(`   (Published listings require at least one photo to appear correctly.)`)
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
