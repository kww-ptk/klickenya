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

const RESTAURANTS = [
  {
    title: "Ali Barbour's Cave Restaurant",
    slug: 'ali-barbours-cave-restaurant-diani',
    city: 'Diani Beach',
    county: 'Kwale',
    address: 'Diani Beach Road, Diani Beach, Kwale County',
    price: 5000,
    priceUnit: 'person',
    priceRange: 'fine-dining',
    cuisine: ['Seafood', 'Mediterranean'],
    openingHours: 'Daily from 5:30 PM (dinner only)',
    reservationRequired: true,
    tags: [
      'fine-dining', 'diani', 'cave', 'seafood', 'romantic', 'wine',
      'unique', 'candlelit', 'stargazing', 'landmark', 'couples', 'special-occasion',
    ],
    highlights: [
      highlight('🕳️', 'Ancient Coral Cave', 'Dine inside a 180,000-year-old natural cave'),
      highlight('⭐', 'Open-Sky Stargazing', 'Cave mouth opens to the night sky above your table'),
      highlight('🕯️', 'Candlelit Ambiance', 'Romantic underground dining by flickering candles'),
      highlight('🦞', 'Fresh Seafood', 'Daily catch and premium steaks on the à la carte menu'),
      highlight('🍷', 'Extensive Wine List', 'Curated selection of international wines'),
      highlight('🚗', 'Hotel Transfers', 'Complimentary courtesy transfers from Diani hotels'),
    ],
    description: [
      textBlock("Ali Barbour's Cave Restaurant — Diani Beach", 'h2'),
      textBlock("One of Kenya's most extraordinary dining experiences and arguably the most unique restaurant on the entire East African coast. Ali Barbour's is set inside a natural coral cave estimated to be 120,000–180,000 years old — diners descend about 10 metres underground into a candlelit wonderland where stalactites frame tables and the cave mouth opens to reveal the stars above. Named as a playful twist on 'Ali Baba' by founders George and Jackie Barbour in the 1980s, this is the kind of place you visit once and remember forever."),
      textBlock('The Menu', 'h3'),
      textBlock("The à la carte menu focuses on the freshest seafood — think grilled lobster, pan-seared prawns, and catch of the day prepared with French and Mediterranean influences. Steaks and traditional coastal dishes round out the offering. The wine list is one of the most comprehensive on the Kenyan coast, with bottles sourced from South Africa, France, and Italy. Finish with a classic crème brûlée or passion fruit cheesecake."),
      textBlock('The Experience', 'h3'),
      textBlock("Arrive just before sunset and enjoy a cocktail in the garden bar upstairs before descending into the cave for dinner. The temperature inside stays naturally cool. Candles flicker on every surface, casting dancing shadows on the ancient coral walls. As night falls, look up through the cave's natural skylight to watch the stars appear one by one. It's equal parts dinner and theatre."),
      textBlock('Good to Know', 'h3'),
      textBlock("Reservations are essential — this is Diani's most popular restaurant. Dress code is smart casual (no shorts, flip-flops, or hats). Children 6 and under are not permitted. Courtesy transfers from most Diani Beach hotels are provided. Dinner only — doors open at 5:30 PM. Budget KES 5,000–8,000 per person excluding drinks. A must for special occasions, anniversaries, and anyone who wants to eat dinner inside a cave under the stars."),
    ],
  },
  {
    title: 'Nomad Beach Bar & Restaurant',
    slug: 'nomad-beach-bar-restaurant-diani',
    city: 'Diani Beach',
    county: 'Kwale',
    address: 'The Sands at Nomad, Diani Beach Road',
    price: 2500,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Seafood', 'Swahili', 'Italian'],
    openingHours: 'Daily 8:00 AM – 10:30 PM (last food orders 9:00 PM)',
    reservationRequired: true,
    tags: [
      'beachfront', 'diani', 'sushi', 'organic', 'farm-to-table', 'cocktails',
      'seafood', 'sunset', 'family', 'brunch', 'pizza', 'sundowner',
    ],
    highlights: [
      highlight('🏖️', 'Beachfront Dining', 'Tables set directly on white sand facing the ocean'),
      highlight('🌿', 'Farm-to-Fork', 'Produce from their own organic farm'),
      highlight('🍣', 'Fresh Sushi Bar', 'Locally caught fish prepared as sashimi and rolls'),
      highlight('🍕', 'Wood-Fired Pizza', 'Thin-crust pizzas from their outdoor oven'),
      highlight('🍨', 'Homemade Gelato', 'Made fresh daily with tropical flavours'),
      highlight('🌅', 'Sundowner Cocktails', 'The Indian Ocean turns gold from your table'),
    ],
    description: [
      textBlock('Nomad Beach Bar & Restaurant — Diani Beach', 'h2'),
      textBlock("If Diani had a living room, it would be Nomad. Set directly on the white sand with the Indian Ocean lapping at your feet, Nomad is the kind of place where a quick lunch turns into an all-day affair. Part of The Sands at Nomad complex, the restaurant has perfected the art of beachfront dining — relaxed enough for sandy toes, refined enough for a proper evening out. Their farm-to-fork philosophy isn't just marketing: they grow their own produce on an organic farm that supplies the kitchen daily."),
      textBlock('The Menu', 'h3'),
      textBlock("The menu covers serious ground: freshly prepared sushi using locally caught fish, wood-fired pizzas, Swahili-inspired seafood curries, grilled lobster, and daily specials that follow whatever the fishermen bring in that morning. The sushi is a standout — arguably the best on Kenya's south coast. For breakfast, the shakshuka and avocado toast are worth waking up for. Don't skip the homemade gelato: passion fruit, coconut, and mango flavours made fresh daily."),
      textBlock('The Vibe', 'h3'),
      textBlock("By day, it's sun-bleached wood, ocean breezes, and barefoot families. As the sun drops, fairy lights come on, the cocktail menu takes centre stage, and the playlist shifts to something more soulful. The bar makes some of Diani's best cocktails — the espresso martini and Diani Mule are local favourites. On weekends, expect a buzzy crowd of residents, expats, and visitors mixing over sundowners."),
      textBlock('Good to Know', 'h3'),
      textBlock("Open daily from 8 AM to 10:30 PM (last food orders at 9 PM). Reservations are recommended, especially for Friday and Saturday dinner. Kids' menu available. They also host occasional live music and beach events. Wi-Fi available. Budget around KES 2,000–4,000 per person for a full meal with drinks."),
    ],
  },
  {
    title: 'Sails Beach Bar & Restaurant',
    slug: 'sails-beach-bar-restaurant-diani',
    city: 'Diani Beach',
    county: 'Kwale',
    address: 'Almanara Luxury Villas, Diani Beach Road',
    price: 3000,
    priceUnit: 'person',
    priceRange: 'fine-dining',
    cuisine: ['Seafood', 'Mediterranean'],
    openingHours: 'Wednesday – Monday, 10:00 AM – 9:00 PM. Closed Tuesdays.',
    reservationRequired: true,
    tags: [
      'fine-dining', 'diani', 'beachfront', 'seafood', 'architecture', 'cocktails',
      'romantic', 'organic', 'landmark', 'instagram', 'sunset', 'couples',
    ],
    highlights: [
      highlight('⛵', 'Iconic Architecture', 'Dhow-sail-inspired steel and canvas design'),
      highlight('🦀', 'Signature Ginger Crab', 'Fresh crab with ginger — their most famous dish'),
      highlight('🏖️', 'Beachfront on White Sand', 'Open-air dining on Diani\'s pristine beach'),
      highlight('👨‍🍳', 'Chef-Driven Menu', 'Led by Chef Anthony Huth with daily-fresh seafood'),
      highlight('🌿', 'Organic Farm', 'Herbs and produce from their own coastal garden'),
      highlight('⭐', 'TripAdvisor 4.6/5', 'Consistently top-rated in Diani Beach'),
    ],
    description: [
      textBlock('Sails Beach Bar & Restaurant — Diani Beach', 'h2'),
      textBlock("You see the white canvas sails long before you arrive — billowing above the treeline like a ship run aground on the beach. Sails is Diani's architectural landmark restaurant: a striking open-air pavilion of steel beams and sail-cloth canopies, set directly on the white sand at Almanara Luxury Villas. The design alone would make it worth visiting, but the food — led by Chef Anthony Huth — matches the ambition of the setting."),
      textBlock('The Menu', 'h3'),
      textBlock("Seafood is the star. The daily catch arrives each morning from local fishermen in traditional dhows — it doesn't get fresher than this. The Tuna Carpaccio is paper-thin and dressed with citrus and capers. The Crispy Calamari is perfectly golden without being heavy. But the signature dish is the Ginger Crab: whole crab slow-cooked in a fragrant ginger sauce that locals drive from Mombasa to eat. The Seafood Platter for two is a showstopper — lobster, prawns, calamari, and catch of the day arranged over crushed ice. The kitchen also grows its own herbs in a coastal organic garden."),
      textBlock('The Setting', 'h3'),
      textBlock("The open-air design means ocean breezes flow through constantly. Tables range from beachside loungers for casual cocktails to formal dining settings under the main canopy. At sunset, the white sails catch the golden light and the whole structure glows — it's one of Diani's most photographed spots. The cocktail bar turns out excellent drinks, and the wine list is carefully selected."),
      textBlock('Good to Know', 'h3'),
      textBlock("Open Wednesday to Monday, 10 AM to 9 PM. Closed Tuesdays. Reservations required — especially for weekend dinners and the seafood platter. The restaurant is also available for private events and beach weddings. Budget KES 2,500–5,000 per person. Smart casual dress code. Located inside Almanara Luxury Villas but open to the public."),
    ],
  },
  {
    title: "Leonardo's Restaurant",
    slug: 'leonardos-restaurant-diani',
    city: 'Diani Beach',
    county: 'Kwale',
    address: "Colliers Centre, Diani Beach Road, Ukunda",
    price: 1500,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Italian'],
    openingHours: 'Daily 8:00 AM – 11:30 PM',
    reservationRequired: false,
    tags: [
      'italian', 'diani', 'pizza', 'pasta', 'gelato', 'wood-fired',
      'family', 'breakfast', 'affordable', 'casual', 'homemade', 'expat-favourite',
    ],
    highlights: [
      highlight('🍕', 'Wood-Fired Pizza', 'Crispy thin-crust from an authentic wood-burning oven'),
      highlight('🍝', 'Fresh Pasta Daily', 'Handmade pasta with rotating Tuscan specials'),
      highlight('🍦', 'Legendary Gelato', 'Homemade Italian gelato that draws repeat visitors'),
      highlight('🍳', 'All-Day Breakfast', 'Breakfast pizzas with eggs, prosciutto, and rocket'),
      highlight('👨‍👩‍👧‍👦', 'Family Friendly', 'Relaxed atmosphere, kids welcome, outdoor seating'),
      highlight('⏰', 'Open Late', 'Kitchen runs until 11:30 PM — rare for Diani'),
    ],
    description: [
      textBlock("Leonardo's Restaurant — Diani Beach", 'h2'),
      textBlock("Ask any long-term Diani resident where to get the best Italian food on the south coast, and Leonardo's comes up every time. Tucked into the Colliers Centre on Diani Beach Road, it doesn't have an ocean view or a flashy setting — but what it does have is the most honest, satisfying Italian food between Mombasa and the Tanzanian border. It's the kind of place where you pop in for a pizza and end up staying for dessert, then come back the next morning for breakfast."),
      textBlock('The Menu', 'h3'),
      textBlock("Wood-fired pizzas are the main event — thin-crust, perfectly charred, loaded with quality toppings. The Margherita alone would stand up in Naples. But the daily specials are where the kitchen really shows off: rigatoni with crispy bacon and wilted spinach in a cream reduction, beef fillet in gorgonzola sauce, or fresh seafood linguine with garlic and white wine. The breakfast pizza — topped with eggs, prosciutto, and peppery rocket — has become a Diani institution. Everything is made in-house, including the bread."),
      textBlock('The Gelato', 'h3'),
      textBlock("Leonardo's gelato is legendary. Made fresh daily, the flavours rotate but you can always count on stracciatella, pistachio, and tropical options like passion fruit and mango. It's the best ice cream on the Kenyan coast — creamy, not too sweet, and made with real ingredients. Locals buy it by the litre to take home. The affogato (espresso poured over gelato) is the perfect end to any meal."),
      textBlock('Good to Know', 'h3'),
      textBlock("Open daily from 8 AM to 11:30 PM — one of the longest kitchen hours in Diani. No reservations needed for lunch, but they're recommended for dinner on weekends. Outdoor terrace seating available. Family-friendly with a relaxed dress code. Budget KES 1,000–2,500 per person. Cash and M-Pesa accepted. If you're staying in Diani for more than a day, you'll eat here more than once."),
    ],
  },
  {
    title: 'The Salty Squid Beach Bar & Restaurant',
    slug: 'the-salty-squid-diani',
    city: 'Diani Beach',
    county: 'Kwale',
    address: 'Kenyaways Kite Village, Diani Beach Road',
    price: 2000,
    priceUnit: 'person',
    priceRange: 'mid-range',
    cuisine: ['Seafood', 'Mediterranean', 'Vegetarian'],
    openingHours: 'Breakfast 7:30 AM – 11:00 AM; Lunch & Dinner 11:00 AM – 10:00 PM',
    reservationRequired: true,
    tags: [
      'beachfront', 'diani', 'seafood', 'cocktails', 'gin', 'vegan',
      'kitesurfing', 'sundowner', 'stylish', 'brunch', 'gluten-free', 'casual',
    ],
    highlights: [
      highlight('🏖️', 'White Sand Beachfront', 'Tables on the sand with direct ocean views'),
      highlight('🍸', 'Largest Gin Collection', 'Biggest gin selection on Kenya\'s entire coast'),
      highlight('🥗', 'Vegan & GF Options', 'Strong plant-based and gluten-free menu'),
      highlight('🪁', 'Kite Village Location', 'Heart of Diani\'s kitesurfing scene'),
      highlight('🦑', 'Fresh Seafood', 'Daily catch with European coastal preparation'),
      highlight('🌅', 'Sundowner Spot', 'Golden hour cocktails right on the beach'),
    ],
    description: [
      textBlock('The Salty Squid Beach Bar & Restaurant — Diani Beach', 'h2'),
      textBlock("The Salty Squid has carved out its own niche on Diani's beach dining scene: stylish without being pretentious, excellent food without the fine-dining price tag, and genuinely one of the best bars on the Kenyan coast. Located inside Kenyaways Kite Village — the hub of Diani's kitesurfing community — the restaurant sits directly on white sand with uninterrupted views of the Indian Ocean. Whether you're coming off the water after a kite session or dressing up for a sunset dinner, it fits."),
      textBlock('The Menu', 'h3'),
      textBlock("Modern European cooking with strong Kenyan coastal influences. The seafood is the highlight — fresh calamari, grilled prawns, catch of the day, and their signature squid dishes. But what sets Salty Squid apart is the range: the vegan and vegetarian options are genuinely creative (not an afterthought), and there's a solid gluten-free selection. The brunch menu is excellent — think açaí bowls, eggs Benedict, and fresh juice. The kitchen uses local ingredients wherever possible."),
      textBlock('The Bar', 'h3'),
      textBlock("This is where The Salty Squid really shines. They hold the largest gin collection on Kenya's coast — dozens of bottles from around the world, served with premium tonics and creative garnishes. The cocktail list is inventive and well-executed, and the bartenders know their craft. The Salty Squid Spritz and the Diani G&T (with local botanicals) are standouts. An international wine selection rounds out the drinks menu."),
      textBlock('Good to Know', 'h3'),
      textBlock("Breakfast from 7:30 AM, lunch and dinner until 10 PM (last food orders 9 PM, bar closes 9:30 PM). Reservations recommended — especially for Saturday sunset. The kite village setting means the crowd is active and international — kitesurfers, digital nomads, young families, and seasoned travellers mixing at the bar. Budget KES 1,500–3,500 per person with drinks. Professional, friendly service. One of the best all-round dining experiences in Diani."),
    ],
  },
]

async function main() {
  console.log('🍽️ Adding 5 Diani restaurants\n')

  for (const r of RESTAURANTS) {
    console.log(`  Creating: ${r.title}...`)

    // Check for existing
    const existing = await client.fetch(
      `*[_type == "listing" && slug.current == $slug][0]._id`,
      { slug: r.slug }
    )
    if (existing) {
      console.log(`    ⏭️ Already exists (${existing}), skipping`)
      continue
    }

    const doc: any = {
      _type: 'listing',
      title: r.title,
      slug: { _type: 'slug', current: r.slug },
      type: 'experience',
      subcategory: 'restaurants',
      status: 'published',
      city: r.city,
      county: r.county,
      address: r.address,
      price: r.price,
      priceUnit: r.priceUnit,
      priceRange: r.priceRange,
      cuisine: r.cuisine,
      openingHours: r.openingHours,
      reservationRequired: r.reservationRequired,
      hostName: 'Klickenya',
      tags: r.tags,
      highlights: r.highlights,
      description: r.description,
      photos: [
        {
          _type: 'image',
          _key: Math.random().toString(36).slice(2, 12),
          alt: r.title,
          asset: {
            _type: 'reference',
            _ref: 'image-placeholder',
          },
        },
      ],
    }

    // Remove placeholder photos — we'll upload real ones separately
    delete doc.photos

    await client.create(doc)
    console.log(`    ✅ Created`)
  }

  console.log('\n✅ All 5 Diani restaurants added!')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
