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
  // ── 1. Visiwa ──────────────────────────────────────
  {
    title: 'Visiwa Beach Resort & Restaurant',
    slug: 'visiwa-beach-resort',
    address: 'Love Island Beach, Watamu',
    hostName: 'Visiwa Watamu',
    cuisine: ['Italian', 'Seafood', 'Mediterranean'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily for lunch and dinner. Kitchen closes around 10 PM.',
    tags: ['italian', 'watamu', 'seafood', 'beach-resort', 'organic', 'pizza', 'romantic'],
    amenities: ['WiFi', 'Parking', 'Pool', 'Sea View', 'Garden'],
    imgUrl: 'https://klickenya.com/wp-content/uploads/2025/11/Visiwa_watamu_klickenya-520x397.jpg',
    highlights: [
      hl('🍝', 'Chef Diego Tosi', 'Italian chef using organic garden ingredients'),
      hl('🌿', 'Organic Garden', 'Vegetables and herbs grown on property'),
      hl('🍕', 'Wood Fired Pizza', 'Authentic Neapolitan style pizza'),
      hl('🏖️', 'Beachfront Dining', 'Tables directly on Love Island Beach'),
      hl('🏊', 'Pool & Resort', 'Beautiful rooms and pool available'),
      hl('🐟', 'Fresh Seafood', 'Daily catch prepared Italian style'),
    ],
    description: [
      qf('✦ Restaurant Info', 'teal', [
        { icon: '📍', label: 'Location', value: 'Love Island Beach, Watamu' },
        { icon: '🍽️', label: 'Cuisine', value: 'Italian, Seafood, Mediterranean' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '👨‍🍳', label: 'Chef', value: 'Diego Tosi' },
        { icon: '📸', label: 'Instagram', value: '@visiwabeachresort' },
        { icon: '🌐', label: 'Website', value: 'visiwawatamu.com' },
      ]),
      t('Visiwa Beach Resort & Restaurant', 'h2'),
      t("Set right on Love Island Beach with the Indian Ocean as your dining backdrop, Visiwa has quietly become one of the most reliable restaurants in Watamu. The kitchen is led by Italian chef Diego Tosi, who brings a philosophy of simplicity and quality that shows in every dish. What makes Visiwa different is the organic garden on the property. Vegetables, herbs, and salad greens are grown steps from the kitchen and make it into your plate the same day they are picked."),
      t("The menu covers classic Italian territory with real skill. The pastas are all excellent, particularly anything with fresh seafood. The pizza comes from a proper wood fired oven and stands up well against the competition in town. Truffle dishes appear as specials and are worth ordering when available. The carpaccio is consistently praised, and the seafood selection changes based on whatever the local fishermen bring in that morning."),
      t('The Setting', 'h3'),
      t("Visiwa occupies a beautiful stretch of Love Island Beach. Dining happens with your feet practically in the sand, looking out over the water. The resort behind the restaurant has a pool and comfortable rooms, making it easy to turn lunch into an entire afternoon. The atmosphere is relaxed and welcoming without being too casual. It hits that sweet spot between beach bar and proper restaurant that Watamu does so well."),
      tc('tip', '🍽️', 'What to Order', 'Regulars swear by the seafood pasta, the truffle specials when available, and the carpaccio. The pizza is also a safe bet. Many guests who stay at the resort end up eating most of their meals here because the quality is consistently high.'),
      wf('Perfect For', [
        { emoji: '💑', heading: 'Couples', text: 'Romantic beachfront dining with Italian cuisine' },
        { emoji: '👨‍👩‍👧', heading: 'Families', text: 'Pool, beach, and a menu that works for everyone' },
        { emoji: '🌿', heading: 'Health Conscious', text: 'Organic garden to table ingredients' },
        { emoji: '🏖️', heading: 'Beach Day Diners', text: 'Turn lunch into an afternoon with sunbeds and pool' },
      ]),
    ],
    seoTitle: 'Visiwa Restaurant Watamu — Italian Beachfront Dining',
    seoDescription: 'Dine at Visiwa on Love Island Beach, Watamu. Italian chef, organic garden, wood fired pizza, fresh seafood, and ocean views.',
  },

  // ── 2. Ocean Sports ────────────────────────────────
  {
    title: 'Ocean Sports Restaurant',
    slug: 'ocean-sports-restaurant',
    address: 'Ocean Sports Resort, Watamu Bay',
    hostName: 'Ocean Sports Resort',
    cuisine: ['Seafood', 'Italian', 'Mediterranean'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily for breakfast, lunch, and dinner. Bar open until late.',
    tags: ['seafood', 'watamu', 'french-chef', 'pizza', 'beachfront', 'watersports', 'family'],
    amenities: ['WiFi', 'Parking', 'Pool', 'Sea View'],
    imgUrl: '',
    highlights: [
      hl('👨‍🍳', 'French Chef Florian', 'Sustainable seafood and organic produce'),
      hl('🍕', 'Wood Fire Pizza', 'Among the best and most affordable in Watamu'),
      hl('🦪', 'Fresh Sashimi & Oysters', 'Daily catch from local fishermen'),
      hl('🏄', 'Watersports Hub', 'Kitesurfing, diving, and sailing on site'),
      hl('🥐', 'Homemade Bakery', 'Fresh croissants and bread daily'),
      hl('🌅', 'Deck Dining', 'Open air deck with stunning ocean views'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: 'Watamu Bay, Ocean Sports Resort' },
        { icon: '🍽️', label: 'Style', value: 'French influenced, fresh seafood' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range (great value)' },
        { icon: '👨‍🍳', label: 'Chef', value: 'Florian (French)' },
        { icon: '🌐', label: 'Website', value: 'oceansports.net' },
        { icon: '🏄', label: 'Plus', value: 'Watersports center on site' },
      ]),
      t('Ocean Sports Restaurant', 'h2'),
      t("Ocean Sports has been a Watamu institution for years, and the restaurant is a big part of why people keep coming back. Set on an open air deck overlooking Watamu Bay, this is the kind of place where you can eat fresh sashimi at lunch, watch kitesurfers from your table, and return for wood fired pizza at dinner. The kitchen is run by French chef Florian, who brings a refined approach to local ingredients without overcomplicating things."),
      t("The menu leans heavily on sustainable seafood and locally grown organic produce. The sashimi and oysters are outstanding when available, sourced directly from local fishermen. The pizza, baked in a proper wood fired oven, is consistently rated among the best in Watamu and comes at prices that feel surprisingly fair. Homemade bread and croissants appear at breakfast, and the ice cream is made in house. The attention to freshness runs through everything."),
      t('More Than a Restaurant', 'h3'),
      t("What makes Ocean Sports special is the full package. The resort is also one of the top watersports centers on the Kenya coast, offering kitesurfing, diving, snorkeling, and sailing. You can spend the morning on the water, have lunch on the deck, and spend the afternoon by the pool. The atmosphere is active and social without being loud. Families, couples, and solo travelers all feel at home here."),
      tc('tip', '🍕', 'Best Value in Watamu', 'Ocean Sports pizza is frequently described as better and cheaper than many Italian restaurants in town. The seafood pizza in particular gets singled out. For a beachfront dining experience at these prices, it is hard to beat.'),
      wf('Perfect For', [
        { emoji: '🏄', heading: 'Active Travelers', text: 'Eat well between kitesurfing, diving, and sailing sessions' },
        { emoji: '👨‍👩‍👧', heading: 'Families', text: 'Pool, beach, watersports, and kid friendly food' },
        { emoji: '🍕', heading: 'Budget Foodies', text: 'Excellent food at surprisingly fair prices' },
        { emoji: '🌅', heading: 'Sundowner Fans', text: 'The deck at golden hour is spectacular' },
      ]),
    ],
    seoTitle: 'Ocean Sports Restaurant Watamu — Seafood, Pizza & Watersports',
    seoDescription: 'Eat at Ocean Sports in Watamu. French chef, fresh seafood, wood fired pizza, ocean deck, and watersports center.',
  },

  // ── 3. Tamu Restaurant ─────────────────────────────
  {
    title: 'Tamu Beach Bar & Restaurant',
    slug: 'tamu-beach-bar-restaurant',
    address: 'Kanani Road, Crystal Bay, Watamu Beach',
    hostName: 'Tamu Restaurant',
    cuisine: ['Italian', 'Seafood', 'Mediterranean'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily for lunch and dinner. Beach bar from morning.',
    tags: ['italian', 'watamu', 'seafood', 'cocktails', 'elegant', 'beach-dining', 'wine'],
    amenities: ['WiFi', 'Parking', 'Sea View'],
    imgUrl: '',
    highlights: [
      hl('🏖️', 'Crystal Bay Location', 'Stunning views from private beach area'),
      hl('🍷', 'Wine Selection', 'More extensive than most on the coast'),
      hl('🐙', 'Octopus Salad', 'Signature dish locals rave about'),
      hl('🍕', 'Exceptional Pizza', 'Wood fired with quality ingredients'),
      hl('🛋️', 'Beach Loungers', 'Sunbeds available for day guests'),
      hl('✨', 'Elegant Atmosphere', 'One of the most refined settings in Watamu'),
    ],
    description: [
      qf('✦ Restaurant Info', 'purple', [
        { icon: '📍', label: 'Location', value: 'Crystal Bay, Watamu Beach' },
        { icon: '🍽️', label: 'Cuisine', value: 'Italian, Oriental, International' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '📸', label: 'Instagram', value: '@tamurestaurant' },
        { icon: '🌐', label: 'Website', value: 'tamurestaurant.com' },
        { icon: '🛋️', label: 'Beach', value: 'Private beach with loungers' },
      ]),
      t('Tamu Beach Bar & Restaurant', 'h2'),
      t("Tamu sits in one of the most beautiful positions in Watamu. The restaurant overlooks Crystal Bay on Watamu Beach, with an organized private beach area complete with sun loungers and shade. It is one of the more elegant dining experiences in town, combining Italian cooking with oriental inspired flavors and an international approach that keeps the menu interesting and surprising."),
      t("The food is consistently good across the board, but certain dishes have developed a real following. The octopus salad is legendary among regulars. The eggplant parmigiana is excellent. Pizzas come from a wood fired oven with quality ingredients, and the pasta selection covers all the Italian classics done properly. What sets Tamu apart from other Italian restaurants in Watamu is the wine list, which is more extensive and more carefully curated than most places on the coast."),
      t('The Beach Experience', 'h3'),
      t("Beyond dinner, Tamu works beautifully as a full day destination. Arrive in the morning, claim a lounger on the private beach, order drinks from the bar, and work your way toward lunch. The setting is upscale without being stuffy. Service is attentive and prices are reasonable for the quality and location. The cocktail bar holds its own as an evening destination, particularly during golden hour when Crystal Bay puts on its best show."),
      tc('tip', '🍷', 'Wine Lovers Take Note', 'Tamu has one of the best wine selections on the Kenya coast. Ask the staff for recommendations. They know the list well and can match bottles to your meal. The wine selection alone is worth the visit for anyone who cares about what they drink with dinner.'),
      wf('Perfect For', [
        { emoji: '💑', heading: 'Couples', text: 'Elegant beachfront dining with great wine' },
        { emoji: '🍷', heading: 'Wine Enthusiasts', text: 'Best curated wine list on the coast' },
        { emoji: '🏖️', heading: 'Beach Day Guests', text: 'Private beach with loungers and full service' },
        { emoji: '🎂', heading: 'Special Dinners', text: 'Refined enough for occasions, relaxed enough for Tuesday' },
      ]),
    ],
    seoTitle: 'Tamu Restaurant Watamu — Italian Beach Dining & Wine',
    seoDescription: 'Dine at Tamu on Crystal Bay, Watamu. Elegant Italian food, octopus salad, great wine list, private beach with loungers.',
  },

  // ── 4. Kobe Restaurant ─────────────────────────────
  {
    title: 'Kobe Suite Resort Restaurant',
    slug: 'kobe-suite-resort-restaurant',
    address: 'Garoda Beach, Watamu',
    hostName: 'Kobe Suite Resort',
    cuisine: ['Italian', 'Seafood', 'Mediterranean'],
    priceRange: 'fine-dining' as const,
    openingHours: 'Daily for breakfast, lunch, and dinner. Bar until late.',
    tags: ['fine-dining', 'watamu', 'italian', 'seafood', 'garoda', 'romantic', 'luxury'],
    amenities: ['WiFi', 'Parking', 'Pool', 'Sea View'],
    imgUrl: '',
    highlights: [
      hl('🏖️', 'Garoda Beach Location', 'Feet in the sand dining on Watamu best beach'),
      hl('🐙', 'Fresh Octopus', 'Signature dish, firm local favorite'),
      hl('🌙', 'Lantern Lit Evenings', 'Beautiful atmosphere after dark'),
      hl('🍽️', 'All Day Dining', 'Breakfast through dinner, open to non guests'),
      hl('🏨', 'Luxury Resort', '23 ocean view suites available'),
      hl('🐟', 'Daily Catch', 'Mediterranean seafood from local fishermen'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: 'Garoda Beach, Watamu' },
        { icon: '🍽️', label: 'Cuisine', value: 'Italian, Mediterranean, Seafood' },
        { icon: '💰', label: 'Price Range', value: 'Fine Dining' },
        { icon: '🌐', label: 'Website', value: 'kobesuiteresort.com' },
        { icon: '🏨', label: 'Resort', value: '23 ocean view suites' },
        { icon: '🍳', label: 'Meals', value: 'Breakfast, lunch, and dinner' },
      ]),
      t('Kobe Suite Resort Restaurant', 'h2'),
      t("Kobe sits right on Garoda Beach, which most people consider the best beach in Watamu, and the restaurant takes full advantage of the location. Dining happens with your feet in the sand, looking out over turquoise water and the famous sandbar that appears at low tide. At night, lanterns hang overhead and the sound of the ocean creates an atmosphere that feels genuinely magical."),
      t("The kitchen serves Italian and Mediterranean cuisine built around whatever the local fishermen bring in each morning. The octopus is the signature dish and a firm favorite among returning guests. Fish preparations are simple and well executed, letting the quality of the ingredients do the work. The menu also covers Mediterranean classics like carpaccio, pasta dishes, and well prepared meat options for those who want a break from seafood."),
      t('Open to Everyone', 'h3'),
      t("While Kobe is a luxury resort with 23 ocean view suites, the restaurants are fully open to non guests. Both Kobe Beach Restaurant on the sand and La Terrazza with elevated views serve the full menu for breakfast, lunch, and dinner. The resort regularly scores above 9 out of 10 on review platforms, with the dining experience consistently highlighted as a standout. Prices reflect the luxury setting but the quality and location justify every shilling."),
      tc('tip', '🌅', 'Dinner Timing', 'Book a dinner table at Kobe Beach Restaurant for about an hour before sunset. You get to watch the sky change color over Garoda Beach while eating, and the lanterns come on as darkness falls. It is one of the most atmospheric dining experiences on the Kenya coast.'),
      wf('Perfect For', [
        { emoji: '💑', heading: 'Couples', text: 'Lantern lit dinner on the best beach in Watamu' },
        { emoji: '✨', heading: 'Luxury Seekers', text: 'Five star resort quality with feet in the sand' },
        { emoji: '🐙', heading: 'Seafood Lovers', text: 'Daily catch prepared with Italian finesse' },
        { emoji: '📸', heading: 'Sunset Diners', text: 'Garoda Beach at golden hour is spectacular' },
      ]),
    ],
    seoTitle: 'Kobe Restaurant Watamu — Garoda Beach Fine Dining',
    seoDescription: 'Dine at Kobe on Garoda Beach, Watamu. Luxury beachfront restaurant, fresh octopus, Italian seafood, lantern lit evenings.',
  },

  // ── 5. Papa Remo Beach ─────────────────────────────
  {
    title: 'Papa Remo Beach',
    slug: 'papa-remo-beach',
    address: 'Jacaranda Road, Watamu',
    hostName: 'Papa Remo',
    cuisine: ['Italian', 'Seafood', 'Mediterranean'],
    priceRange: 'mid-range' as const,
    openingHours: 'Daily for lunch and dinner. Saturday night events until late.',
    tags: ['italian', 'watamu', 'beach-club', 'saturday-nights', 'nightlife', 'pizza', 'seafood'],
    amenities: ['WiFi', 'Parking', 'Sea View'],
    imgUrl: '',
    highlights: [
      hl('💃', 'Saturday Beach Parties', 'Watamu legendary barefoot disco'),
      hl('🍕', 'Italian Chef', 'Top Italian chef running the kitchen'),
      hl('🏖️', 'Jacaranda Beach', 'Stunning beach club with sunbeds'),
      hl('🦐', 'Seafood Platters', 'Generous portions of perfectly cooked seafood'),
      hl('🍹', 'Central Bar', 'Great cocktails in a beautifully designed space'),
      hl('⭐', '98% Recommended', '595+ positive reviews'),
    ],
    description: [
      qf('✦ Restaurant Info', 'amber', [
        { icon: '📍', label: 'Location', value: 'Jacaranda Road, Watamu' },
        { icon: '🍽️', label: 'Cuisine', value: 'Italian, Seafood, Mediterranean' },
        { icon: '💰', label: 'Price Range', value: 'Mid Range' },
        { icon: '📞', label: 'Phone', value: '+254 707 010 527' },
        { icon: '📸', label: 'Instagram', value: '@paparemobeach' },
        { icon: '🌐', label: 'Website', value: 'paparemobeach.com' },
      ]),
      t('Papa Remo Beach', 'h2'),
      t("Papa Remo is one of those places that defines what makes Watamu special. Set on Jacaranda Beach with views over coral islands and golden sandbars, the beach club combines serious Italian cooking with one of the most beautiful settings on the Kenya coast. The restaurant is spacious and beautifully designed, with comfortable lounge areas, a central bar that anchors the whole space, and an atmosphere that shifts effortlessly from relaxed daytime beach club to vibrant evening destination."),
      t("The kitchen is run by a top Italian chef who takes both the food and the ingredients seriously. The seafood platter is generous and well executed, with perfectly cooked octopus and well seasoned fish. Pizzas and pastas are reliable and satisfying. The menu is not trying to reinvent anything. It just delivers classic Italian beach dining at a high level, which is exactly what most people want when they are on holiday."),
      t('Saturday Night Beach Parties', 'h3'),
      t("If Sunset Lab owns Friday nights in Watamu, Papa Remo owns Saturday. The weekly barefoot beach disco has become a cult event on the Kenya coast, drawing locals, expats, and visitors for dancing under the stars on the sand. It is the kind of night that feels spontaneous even though it happens every week. Music, cocktails, bare feet, ocean breeze, and a crowd that is there to have a genuinely good time. Reservations for dinner are strongly recommended on Saturday evenings."),
      tc('tip', '📞', 'Book Ahead', 'Papa Remo gets busy, especially on Saturday nights and during high season. Call +254 707 010 527 to reserve a table. For the Saturday party, arrive for dinner around 7:30 PM and let the evening unfold naturally into music and dancing.'),
      tc('teal', '🏖️', 'Beach Day', 'Papa Remo works brilliantly as a full day beach destination. Arrive late morning, grab sunbeds and an umbrella on the beach, order lunch, swim, and stay through sunset. The lounge areas are comfortable enough to spend hours in.'),
      wf('Perfect For', [
        { emoji: '💃', heading: 'Night Owls', text: 'Saturday barefoot disco is legendary in Watamu' },
        { emoji: '🍽️', heading: 'Italian Food Lovers', text: 'Proper Italian chef with great seafood' },
        { emoji: '🏖️', heading: 'Beach Clubbers', text: 'Sunbeds, cocktails, and Jacaranda Beach views' },
        { emoji: '👥', heading: 'Groups', text: 'Spacious, social, and great for celebrations' },
      ]),
    ],
    seoTitle: 'Papa Remo Beach Watamu — Italian Beach Club & Saturday Nights',
    seoDescription: 'Eat at Papa Remo on Jacaranda Beach. Italian chef, seafood, beach club, and legendary Saturday night barefoot disco.',
  },
]

async function main() {
  console.log(`🍽️ Seeding ${restaurants.length} restaurants...\n`)

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
      city: 'Watamu',
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

  console.log(`\n✅ Done — ${restaurants.length} restaurants created!`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
