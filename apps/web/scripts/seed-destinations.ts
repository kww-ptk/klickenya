import { createClient } from 'next-sanity'

const client = createClient({
  projectId: 'b9zd8u9f',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

function key() { return Math.random().toString(36).slice(2, 12) }

function text(t: string, style = 'normal'): any {
  return { _type: 'block', _key: key(), style, children: [{ _type: 'span', _key: key(), text: t, marks: [] }] }
}

async function uploadImage(url: string, filename: string, alt: string): Promise<any> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const asset = await client.assets.upload('image', buf, { filename })
    return { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, alt }
  } catch (e) {
    console.warn(`  ⚠ Image failed: ${filename}`, e)
    return null
  }
}

// Listing IDs from Sanity
const L = {
  ocean: '2riX1AdO9O53izfAmrIeLx',
  love: '2riX1AdO9O53izfAmrIeVx',
  jacaranda: '2riX1AdO9O53izfAmrInwx',
  sammy: '2riX1AdO9O53izfAmrIoJS',
  bay: 'OTOIQY89AHB7SUiuiBVdzV',
  mida: 'U1j2mvjVVumuzihYzAQorf',
  marafa: '2riX1AdO9O53izfAmrIp9x',
  gede: 'OTOIQY89AHB7SUiuiBVuhd',
  short: '2riX1AdO9O53izfAmrIrIS',
  garoda: '2riX1AdO9O53izfAmrIrcS',
  sunset: '8004da69-d432-47a1-beb8-968a6fb19b88',
}

function ref(id: string) { return { _type: 'reference', _ref: id, _key: key() } }

interface Dest {
  name: string; slug: string; tagline: string; county: string;
  description: any[]; highlights: { icon: string; text: string }[];
  relatedListings: string[]; seoTitle: string; seoDescription: string;
  imageUrl: string; imageFilename: string; imageAlt: string;
}

const destinations: Dest[] = [
  {
    name: 'Watamu',
    slug: 'watamu',
    tagline: 'Where the reef meets the wild',
    county: 'Kilifi',
    description: [
      text('Watamu is a small coastal town on Kenya\'s north coast that punches well above its weight. Sitting between the Indian Ocean and Mida Creek, this marine protected area draws travelers who want beautiful beaches without the crowds of Diani or the chaos of Mombasa. The town runs on a slow rhythm. Mornings start with fishermen heading out through the reef, afternoons unfold on some of East Africa\'s best sand, and evenings bring spectacular sunsets over the creek.'),
      text('The beaches here are genuinely world class. Garoda, Jacaranda, and Ocean Breezes each have their own character, from kitesurfing hubs to secluded palm lined shores. Beyond the sand, Watamu offers dhow cruises through mangrove lined Mida Creek, ancient ruins at Gede, and the surreal canyon at Marafa. It is one of those rare places where you can fill a week without running out of things to do, or simply do nothing at all.'),
      text('The food scene has grown quietly impressive. Italian expats have brought wood fired pizza and handmade pasta to the beachfront, while local kitchens serve some of the best Swahili seafood on the coast. Watamu is still small enough that you will recognize faces by your third day, and that is part of its charm.'),
    ],
    highlights: [
      { icon: '🏖️', text: 'Some of East Africa\'s most beautiful beaches' },
      { icon: '🤿', text: 'Marine national park with coral reefs and sea turtles' },
      { icon: '⛵', text: 'Sunset dhow cruises on Mida Creek' },
      { icon: '🏛️', text: 'Ancient Gede Ruins and Marafa canyon day trips' },
      { icon: '🍕', text: 'Unexpectedly great Italian and Swahili food scene' },
      { icon: '🪁', text: 'World class kitesurfing at Jacaranda and Garoda' },
    ],
    relatedListings: [L.garoda, L.jacaranda, L.sammy, L.mida, L.gede, L.ocean],
    seoTitle: 'Watamu Kenya — Beaches, Marine Park & Things to Do',
    seoDescription: 'Discover Watamu on Kenya\'s coast. World class beaches, marine park, dhow cruises, kitesurfing, and the best seafood.',
    imageUrl: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=1600&q=80',
    imageFilename: 'watamu-beach.jpg',
    imageAlt: 'Turquoise waters and white sand beach in Watamu, Kenya',
  },
  {
    name: 'Kilifi',
    slug: 'kilifi',
    tagline: 'The creative coast',
    county: 'Kilifi',
    description: [
      text('Kilifi sits on the banks of a wide tidal creek about an hour south of Watamu and has quietly become one of the most interesting towns on the Kenya coast. Where Watamu is about beaches and nature, Kilifi is about community and creativity. A mix of Kenyan entrepreneurs, international artists, and digital nomads have settled here, creating a scene that feels genuinely unique in East Africa.'),
      text('The town wraps around Kilifi Creek, a deep blue waterway that opens into the Indian Ocean. Bofa Beach on the south bank is a long golden stretch that rarely gets crowded. The creek itself is perfect for stand up paddleboarding, kayaking, and swimming. On the north bank, the town center has a growing number of cafes, restaurants, and small businesses that reflect the creative energy of the people who live here.'),
      text('Kilifi is also home to some of the best events on the Kenya coast. Music festivals, yoga retreats, and community gatherings happen throughout the year, drawing visitors from Nairobi and beyond. If Watamu is where you go for a beach holiday, Kilifi is where you go to feel something different.'),
    ],
    highlights: [
      { icon: '🎨', text: 'Thriving creative and entrepreneurial community' },
      { icon: '🏖️', text: 'Bofa Beach — long, golden, and rarely crowded' },
      { icon: '🛶', text: 'Kilifi Creek for paddleboarding and kayaking' },
      { icon: '🎶', text: 'Music festivals and cultural events year round' },
      { icon: '☕', text: 'Growing cafe and restaurant scene' },
      { icon: '🧘', text: 'Yoga retreats and wellness spaces' },
    ],
    relatedListings: [L.sunset],
    seoTitle: 'Kilifi Kenya — Creative Coast, Beaches & Events',
    seoDescription: 'Explore Kilifi on Kenya\'s coast. Creative community, Bofa Beach, Kilifi Creek, music festivals, and great food.',
    imageUrl: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1600&q=80',
    imageFilename: 'kilifi-creek.jpg',
    imageAlt: 'Kilifi Creek with boats and palm trees on Kenya coast',
  },
  {
    name: 'Diani Beach',
    slug: 'diani',
    tagline: 'Kenya\'s most famous beach',
    county: 'Kwale',
    description: [
      text('Diani Beach needs little introduction. Consistently ranked among Africa\'s best beaches, this long stretch of white sand on Kenya\'s south coast has been drawing visitors for decades. The beach itself is stunning, with powder fine sand, warm turquoise water, and a coral reef that creates calm swimming conditions most of the year. Palm trees and casuarina pines provide natural shade along much of the shore.'),
      text('What sets Diani apart from quieter coastal towns is the infrastructure. There are resorts and boutique hotels for every budget, restaurants ranging from beachside grills to fine dining, and a well developed network of tour operators offering everything from skydiving to whale shark excursions. The nightlife is the liveliest on the Kenya coast.'),
      text('South of Diani, the Shimba Hills National Reserve offers day trips to see elephants, sable antelope, and the beautiful Sheldrick Falls. The Kongo Mosque ruins and Kaya Kinondo sacred forest add cultural depth to what might otherwise be a pure beach destination. Diani works equally well for families, couples, and groups looking for a mix of relaxation and activity.'),
    ],
    highlights: [
      { icon: '🏖️', text: 'Award winning white sand beach stretching 10 km' },
      { icon: '🤿', text: 'Coral reef with excellent snorkeling and diving' },
      { icon: '🪂', text: 'Skydiving, jet skiing, and watersports' },
      { icon: '🐘', text: 'Shimba Hills elephant reserve nearby' },
      { icon: '🌙', text: 'Best nightlife on the Kenya coast' },
      { icon: '🏨', text: 'Hotels and resorts for every budget' },
    ],
    relatedListings: [],
    seoTitle: 'Diani Beach Kenya — Africa\'s Best Beach & Guide',
    seoDescription: 'Visit Diani Beach, Kenya\'s most famous beach. White sand, coral reef, watersports, resorts, and Shimba Hills nearby.',
    imageUrl: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=1600&q=80',
    imageFilename: 'diani-beach.jpg',
    imageAlt: 'White sand beach with palm trees at Diani Beach, Kenya',
  },
  {
    name: 'Nairobi',
    slug: 'nairobi',
    tagline: 'The city that never stops surprising',
    county: 'Nairobi',
    description: [
      text('Nairobi is not a city you pass through. It is a city that gets under your skin. Kenya\'s capital is loud, fast, creative, and full of contradictions. Giraffes wander in a sanctuary fifteen minutes from downtown skyscrapers. World class restaurants sit beside street food stalls serving the best nyama choma you have ever tasted. The art scene is exploding, the tech sector is booming, and the energy is infectious.'),
      text('For visitors, Nairobi offers a surprising amount. The Nairobi National Park is the only wildlife park in the world inside a major city, where you can see lions and rhinos with the skyline in the background. The David Sheldrick Wildlife Trust lets you watch orphaned baby elephants being bottle fed. Karen Blixen\'s museum and the Kazuri Beads factory add cultural depth.'),
      text('The food scene has evolved rapidly. From Ethiopian restaurants in Eastleigh to Japanese omakase in Westlands, Nairobi\'s dining reflects its cosmopolitan population. The Maasai Market (rotating locations, check the schedule) is the best place in Kenya to buy handmade crafts. If you are flying into Kenya, give Nairobi at least two days. You will not regret it.'),
    ],
    highlights: [
      { icon: '🦁', text: 'Only city in the world with a national park' },
      { icon: '🐘', text: 'David Sheldrick elephant orphanage' },
      { icon: '🍽️', text: 'World class food scene from street to fine dining' },
      { icon: '🎨', text: 'Thriving art galleries and creative spaces' },
      { icon: '🛍️', text: 'Maasai Market for handmade crafts' },
      { icon: '💻', text: 'Silicon Savannah tech hub' },
    ],
    relatedListings: [],
    seoTitle: 'Nairobi Kenya — City Guide, Wildlife & Things to Do',
    seoDescription: 'Explore Nairobi, Kenya\'s capital. National park, elephant orphanage, food scene, art galleries, and Maasai Market.',
    imageUrl: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=1600&q=80',
    imageFilename: 'nairobi-skyline.jpg',
    imageAlt: 'Nairobi city skyline with Nairobi National Park in foreground',
  },
  {
    name: 'Lamu',
    slug: 'lamu',
    tagline: 'A living piece of Swahili history',
    county: 'Lamu',
    description: [
      text('Lamu Old Town is a UNESCO World Heritage Site and the oldest continuously inhabited Swahili settlement in East Africa. Walking through its narrow coral stone alleyways feels like stepping back several centuries. There are no cars on the island. Transport happens by foot, donkey, or dhow. The call to prayer echoes from centuries old mosques, and the architecture tells the story of centuries of trade between Africa, Arabia, India, and Europe.'),
      text('The pace of life here is genuinely different from anywhere else in Kenya. Mornings start slowly. Afternoons are for resting. Evenings come alive on the waterfront where fishermen sell the day\'s catch and families gather along the seawall. The island has a handful of beautiful boutique hotels converted from historic Swahili houses, with rooftop terraces looking out over the Indian Ocean.'),
      text('Beyond the Old Town, Shela Beach is a twelve kilometer stretch of near empty white sand that regularly appears on lists of the world\'s most beautiful beaches. Dhow trips to the surrounding islands and mangrove channels fill lazy days. Lamu is not for everyone. There is no nightlife, limited WiFi, and the heat can be intense. But for those who connect with it, Lamu is unforgettable.'),
    ],
    highlights: [
      { icon: '🏛️', text: 'UNESCO World Heritage Swahili Old Town' },
      { icon: '⛵', text: 'Traditional dhow sailing between islands' },
      { icon: '🏖️', text: 'Shela Beach — 12 km of near empty sand' },
      { icon: '🫏', text: 'Car free island, travel by foot or donkey' },
      { icon: '🕌', text: 'Centuries old mosques and Swahili architecture' },
      { icon: '🍽️', text: 'Authentic Swahili cuisine with coastal spices' },
    ],
    relatedListings: [],
    seoTitle: 'Lamu Kenya — UNESCO Old Town, Beaches & Dhow Trips',
    seoDescription: 'Visit Lamu, Kenya\'s UNESCO Swahili town. Car free island, Shela Beach, dhow trips, and centuries of living history.',
    imageUrl: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=1600&q=80',
    imageFilename: 'lamu-old-town.jpg',
    imageAlt: 'Traditional dhow boats along the Lamu waterfront at sunset',
  },
  {
    name: 'Maasai Mara',
    slug: 'maasai-mara',
    tagline: 'Where the Great Migration comes alive',
    county: 'Narok',
    description: [
      text('The Maasai Mara is East Africa\'s most celebrated wildlife destination, and it earns that reputation every single day. This vast savannah stretching to the Serengeti in Tanzania is home to extraordinary concentrations of predators and prey year round, not just during the famous wildebeest migration. Lions, leopards, cheetahs, elephants, and hippos are regular sightings on a typical game drive.'),
      text('The Great Migration, when over two million wildebeest and zebra cross from the Serengeti into the Mara between July and October, is one of the greatest wildlife spectacles on Earth. The river crossings, where herds plunge into crocodile filled waters, are dramatic and unforgettable. But the Mara is outstanding in every month. The resident wildlife does not migrate, and the big cats are arguably easier to find outside peak season.'),
      text('Accommodation ranges from luxury tented camps with gourmet dining and spa treatments to budget friendly campsites inside the conservancies. The surrounding private conservancies offer night drives, walking safaris, and cultural visits to Maasai communities that the national reserve does not allow. A three night stay gives you a solid introduction, but you could spend a week and still see something new every day.'),
    ],
    highlights: [
      { icon: '🦁', text: 'Highest density of big cats in Africa' },
      { icon: '🐃', text: 'Great Migration from July to October' },
      { icon: '🌅', text: 'Hot air balloon safaris at sunrise' },
      { icon: '🏕️', text: 'Luxury tented camps to budget camping' },
      { icon: '👤', text: 'Maasai cultural experiences in conservancies' },
      { icon: '🚙', text: 'Year round wildlife, not just migration season' },
    ],
    relatedListings: [],
    seoTitle: 'Maasai Mara Kenya — Safari, Migration & Wildlife',
    seoDescription: 'Experience the Maasai Mara. Big five safaris, Great Migration, balloon rides, luxury camps, and Maasai culture.',
    imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80',
    imageFilename: 'maasai-mara-safari.jpg',
    imageAlt: 'Wildebeest on the Maasai Mara savannah at golden hour',
  },
  {
    name: 'Amboseli',
    slug: 'amboseli',
    tagline: 'Elephants against Kilimanjaro',
    county: 'Kajiado',
    description: [
      text('Amboseli National Park delivers one of the most iconic views in all of Africa. Herds of elephants moving across the dusty plains with the snow capped peak of Mount Kilimanjaro rising behind them. It is the image that sells Kenya to the world, and in person it is even more powerful. The park is relatively small and flat, which makes wildlife spotting easy and almost guaranteed.'),
      text('Amboseli is known above all for its elephants. The park has some of the best studied and most approachable elephant herds in Africa, with matriarchs that researchers have tracked for decades. Getting close to these gentle giants in a vehicle with Kilimanjaro in the background is a wildlife photography dream. Beyond elephants, the park supports lions, cheetahs, zebras, wildebeest, and over 400 bird species.'),
      text('A two night stay is enough to experience Amboseli\'s highlights. The park is about four hours from Nairobi by road, making it an excellent first or last safari stop. Accommodation ranges from lodges inside the park to community owned conservancies on the borders where walking safaris and night drives are possible.'),
    ],
    highlights: [
      { icon: '🐘', text: 'Famous elephant herds with Kilimanjaro backdrop' },
      { icon: '🏔️', text: 'Africa\'s best views of Mount Kilimanjaro' },
      { icon: '📷', text: 'Arguably the best wildlife photography in Kenya' },
      { icon: '🦅', text: 'Over 400 bird species' },
      { icon: '🚗', text: 'Only 4 hours from Nairobi by road' },
      { icon: '🏕️', text: 'Lodges and community conservancy camps' },
    ],
    relatedListings: [],
    seoTitle: 'Amboseli Kenya — Elephants, Kilimanjaro & Safari',
    seoDescription: 'Visit Amboseli National Park. Iconic elephants against Kilimanjaro, big cats, bird watching, 4 hours from Nairobi.',
    imageUrl: 'https://images.unsplash.com/photo-1535338454528-1b5c8bb8b59a?w=1600&q=80',
    imageFilename: 'amboseli-elephants.jpg',
    imageAlt: 'Elephants walking across Amboseli plains with Mount Kilimanjaro',
  },
  {
    name: 'Malindi',
    slug: 'malindi',
    tagline: 'Italy meets the Indian Ocean',
    county: 'Kilifi',
    description: [
      text('Malindi sits about thirty minutes north of Watamu and has a character all its own. A significant Italian expat community has shaped the town over decades, creating a coastal destination where you can eat authentic gelato, browse Italian fashion boutiques, and order an espresso that would pass in Milan, all within view of the Indian Ocean. It is a fascinating cultural blend that works surprisingly well.'),
      text('The town has genuine historical depth. Vasco da Gama visited in 1498, and the pillar he erected still stands on the seafront. The Old Town area has a Portuguese era church and Swahili architecture dating back centuries. The Malindi Marine National Park was Kenya\'s first marine protected area and remains excellent for snorkeling and glass bottom boat trips.'),
      text('Malindi is larger and more developed than Watamu, with proper banks, hospitals, and supermarkets. For travelers who want coast life with more amenities, it is a solid base. The Watamu Road connects the two towns, so you can easily enjoy both during a single trip.'),
    ],
    highlights: [
      { icon: '🇮🇹', text: 'Strong Italian influence, from food to fashion' },
      { icon: '🤿', text: 'Kenya\'s first marine national park' },
      { icon: '🏛️', text: 'Vasco da Gama pillar and historic Old Town' },
      { icon: '🍦', text: 'Authentic gelato and espresso by the ocean' },
      { icon: '🏥', text: 'Full amenities: banks, hospitals, shopping' },
      { icon: '🚗', text: '30 minutes from Watamu, easy to combine' },
    ],
    relatedListings: [],
    seoTitle: 'Malindi Kenya — Italian Coast, Marine Park & History',
    seoDescription: 'Explore Malindi on Kenya\'s coast. Italian influence, marine national park, Vasco da Gama history, and coastal living.',
    imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1600&q=80',
    imageFilename: 'malindi-coast.jpg',
    imageAlt: 'Malindi waterfront with traditional fishing boats',
  },
  {
    name: 'Nanyuki',
    slug: 'nanyuki',
    tagline: 'Gateway to Mount Kenya',
    county: 'Laikipia',
    description: [
      text('Nanyuki sits at 2,000 meters on the northwest slopes of Mount Kenya and serves as the gateway to one of East Africa\'s most exciting wildlife regions. The town itself is a growing hub with good restaurants, craft breweries, and a relaxed highland atmosphere that feels very different from the coast or Nairobi. The air is cool and fresh, the scenery is green and dramatic, and the equator line runs right through town.'),
      text('The real draw is the surrounding Laikipia Plateau, home to some of Kenya\'s most innovative wildlife conservancies. Places like Ol Pejeta, Lewa, and Borana combine world class wildlife viewing with community led conservation. This is where you can track the last two northern white rhinos on earth, see wild dogs, and experience safari in a landscape that feels vast and uncrowded. The conservancy model here is a genuine success story.'),
      text('Nanyuki also works as a base for climbing Mount Kenya. Africa\'s second highest peak has multiple routes for different fitness levels, from technical climbing on the Batian and Nelion peaks to the scenic Point Lenana trek that most visitors attempt. The town has all the outfitters and guides you need.'),
    ],
    highlights: [
      { icon: '🏔️', text: 'Gateway to Mount Kenya climbing and trekking' },
      { icon: '🦏', text: 'Ol Pejeta — last two northern white rhinos' },
      { icon: '🌿', text: 'Laikipia Plateau wildlife conservancies' },
      { icon: '🍺', text: 'Craft breweries and highland dining' },
      { icon: '🌡️', text: 'Cool highland climate, equator line in town' },
      { icon: '🐕‍🦺', text: 'Wild dogs, leopards, and uncrowded safaris' },
    ],
    relatedListings: [],
    seoTitle: 'Nanyuki Kenya — Mount Kenya, Laikipia & Safaris',
    seoDescription: 'Discover Nanyuki, gateway to Mount Kenya. Laikipia conservancies, Ol Pejeta rhinos, highland dining, equator town.',
    imageUrl: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=1600&q=80',
    imageFilename: 'nanyuki-mount-kenya.jpg',
    imageAlt: 'Mount Kenya rising above green highlands near Nanyuki',
  },
  {
    name: 'Vipingo',
    slug: 'vipingo',
    tagline: 'The quiet side of the coast',
    county: 'Kilifi',
    description: [
      text('Vipingo is the stretch of coast between Mombasa and Kilifi that most tourists drive through without stopping. That is starting to change. This quiet residential area has some of the most beautiful and least crowded beaches on the Kenya coast, along with a growing number of villas and guesthouses that offer a more private, relaxed alternative to the bigger beach towns.'),
      text('Vipingo Ridge, home to an 18 hole golf course and luxury residential estate, has brought attention and investment to the area. But beyond the gates, the coastline remains beautifully undeveloped. Long stretches of sand backed by casuarina pines, small fishing villages, and the kind of peaceful atmosphere that Diani and Watamu had twenty years ago.'),
      text('The location is practical too. Mombasa and its international airport are about forty five minutes south. Kilifi and Watamu are an hour north. Vipingo works well as a quiet base from which to explore the entire coast, or as a destination in itself for anyone who values space and silence over scene.'),
    ],
    highlights: [
      { icon: '🏖️', text: 'Uncrowded beaches with natural beauty' },
      { icon: '⛳', text: 'Vipingo Ridge golf course and residences' },
      { icon: '🤫', text: 'Quiet, peaceful alternative to busy beach towns' },
      { icon: '📍', text: 'Central location between Mombasa and Kilifi' },
      { icon: '🏡', text: 'Growing villa and guesthouse accommodation' },
      { icon: '🐟', text: 'Small fishing villages and authentic coast life' },
    ],
    relatedListings: [],
    seoTitle: 'Vipingo Kenya — Quiet Beaches & Coastal Living',
    seoDescription: 'Discover Vipingo on Kenya\'s coast. Quiet beaches, golf at Vipingo Ridge, between Mombasa and Kilifi.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80',
    imageFilename: 'vipingo-beach.jpg',
    imageAlt: 'Quiet white sand beach with palm trees at Vipingo, Kenya',
  },
]

async function main() {
  console.log(`🌍 Seeding ${destinations.length} destinations to Sanity...\n`)

  for (const d of destinations) {
    console.log(`  → ${d.name}...`)

    // Upload hero image
    const heroImage = await uploadImage(d.imageUrl, d.imageFilename, d.imageAlt)

    const doc: any = {
      _type: 'destination',
      name: d.name,
      slug: { _type: 'slug', current: d.slug },
      tagline: d.tagline,
      county: d.county,
      description: d.description,
      highlights: d.highlights.map(h => ({ _key: key(), icon: h.icon, text: h.text })),
      relatedListings: d.relatedListings.map(id => ref(id)),
      seoTitle: d.seoTitle,
      seoDescription: d.seoDescription,
    }

    if (heroImage) doc.heroImage = heroImage

    const result = await client.create(doc)
    console.log(`    ✅ ${result._id}`)
  }

  console.log(`\n✅ Done — ${destinations.length} destinations created!`)
}

main().catch(err => { console.error('❌ Failed:', err); process.exit(1) })
