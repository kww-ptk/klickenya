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
  return { _type: 'block', _key: key(), style, children: [{ _type: 'span', _key: key(), text, marks: [] }] }
}

function quickFacts(title: string, color: string, items: { icon: string; label: string; value: string }[]): any {
  return {
    _type: 'quickFactsBlock', _key: key(), title, accentColor: color,
    items: items.map(i => ({ _key: key(), icon: i.icon, label: i.label, value: i.value })),
  }
}

function tipCard(variant: string, icon: string, label: string, text: string): any {
  return { _type: 'tipCardBlock', _key: key(), variant, icon, label, text }
}

function packingList(title: string, items: { icon: string; text: string }[]): any {
  return {
    _type: 'packingListBlock', _key: key(), title,
    items: items.map(i => ({ _key: key(), icon: i.icon, text: i.text })),
  }
}

function whoIsItFor(title: string, items: { emoji: string; heading: string; text: string }[]): any {
  return {
    _type: 'whoIsItForBlock', _key: key(), title,
    items: items.map(i => ({ _key: key(), emoji: i.emoji, heading: i.heading, text: i.text })),
  }
}

// ─── LISTING DESCRIPTIONS ────────────────────────────────

const listingContent: Record<string, any[]> = {

  'ocean-breezes-beach': [
    quickFacts('✦ At a Glance', 'amber', [
      { icon: '📍', label: 'Location', value: 'Jacaranda Road, Watamu' },
      { icon: '💰', label: 'Entrance', value: 'Free' },
      { icon: '🕐', label: 'Best Time', value: 'Low tide, 2 hrs before/after' },
      { icon: '🚗', label: 'Getting There', value: 'TukTuk or motorbike' },
      { icon: '🐕', label: 'Pets', value: 'Welcome' },
      { icon: '🌅', label: 'Sunset', value: 'Spectacular views' },
    ]),

    textBlock('Ocean Breezes Beach', 'h2'),
    textBlock('Tucked along Jacaranda Road in the heart of Watamu, Ocean Breezes Beach is one of those places that makes you slow down the moment your feet hit the sand. The shoreline stretches out gently, lined with natural palm trees that frame the beach bars scattered along the coast. It feels local, relaxed, and genuinely beautiful without trying too hard.'),
    textBlock('The sand here is soft with occasional coral patches, and during low tide the beach transforms completely. Sandbars emerge from the shallow waters, creating natural walkways that lead you further into the ocean. You can wade through ankle deep water for hundreds of meters, spotting starfish and small tropical fish darting around the coral.'),

    textBlock('What to Do', 'h3'),
    textBlock('Most visitors come here to decompress. Lay out on a sunbed at one of the beach bars, swim in the calm waters, or take a walk along the sandbars when the tide pulls back. Snorkeling is surprisingly good for a beach this accessible. Multicolored fish and starfish are visible without even needing to go deep. If you are feeling more adventurous, the local operators can arrange boat trips for fishing or leisure cruises along the coast.'),

    tipCard('tip', '🌊', 'Tide Tip', 'Check the tide schedule before visiting. The beach completely changes character between high and low tide. Low tide reveals sandbars perfect for walking, while high tide is better for swimming. Aim for about two hours before or after the lowest point.'),

    textBlock('Where to Eat and Drink', 'h3'),
    textBlock('MareMare is the standout beach bar here. They have comfortable sunbeds, cold drinks, and fresh madafu (coconut water) served straight from the shell. The kitchen puts out good seafood and Swahili dishes at honest prices. Several other smaller bars dot the beachfront, each with their own character. You can spend an entire day moving between them.'),

    packingList('What to Bring', [
      { icon: '🧴', text: 'Reef safe sunscreen' },
      { icon: '👟', text: 'Water shoes for coral patches' },
      { icon: '🤿', text: 'Snorkel mask if you have one' },
      { icon: '💧', text: 'Water bottle' },
      { icon: '📱', text: 'Waterproof phone pouch' },
      { icon: '🧢', text: 'Sun hat or cap' },
    ]),

    textBlock('Getting There', 'h3'),
    textBlock('The beach is about three minutes from Paparemo and well signposted from Watamu town center. Parking is limited so a TukTuk or motorbike is the easiest option. Most drivers know the spot by name. If you are staying at one of the nearby hotels, you can likely walk.'),

    whoIsItFor('Who Will Love This Beach', [
      { emoji: '👨‍👩‍👧', heading: 'Families', text: 'Calm shallow waters, safe for kids at low tide' },
      { emoji: '📸', heading: 'Photographers', text: 'Golden hour on the sandbars is unreal' },
      { emoji: '🧘', heading: 'Relaxation Seekers', text: 'Quiet beach with great bar service' },
      { emoji: '🐕', heading: 'Dog Owners', text: 'One of the few pet friendly beaches in Watamu' },
    ]),
  ],

  'love-island-beach': [
    quickFacts('✦ At a Glance', 'amber', [
      { icon: '📍', label: 'Location', value: 'Watamu Center' },
      { icon: '💰', label: 'Entrance', value: 'Free' },
      { icon: '🕐', label: 'Best Time', value: 'Low tide for the island' },
      { icon: '💖', label: 'Famous For', value: 'Heart shaped island' },
      { icon: '🐕', label: 'Pets', value: 'Welcome' },
      { icon: '🎣', label: 'Culture', value: 'Active fishing beach' },
    ]),

    textBlock('Love Island Beach', 'h2'),
    textBlock('Love Island Beach is where Watamu feels most alive. This is not a resort beach or a quiet escape. It is a working fishing beach where local life plays out against a backdrop of white sand and turquoise water. Every morning fishermen push their boats out through the surf, and every afternoon the catch comes in. It is vibrant, colorful, and full of character.'),
    textBlock('The headline attraction is a small heart shaped island that becomes accessible by foot during low tide. It has become one of the most photographed spots in Watamu, and for good reason. Walking out to it feels like stepping into another world, surrounded by shallow crystal clear water on all sides.'),

    tipCard('tip', '💖', 'The Heart Island', 'The heart shaped island is only accessible during low tide. Plan your visit around the tide schedule and arrive about an hour before the lowest point. You will have roughly two hours to explore before the water starts rising again.'),

    textBlock('Things to Do', 'h3'),
    textBlock('Beyond the island walk, the beach is great for swimming, sunbathing, and people watching. Beach games are a constant here, with locals playing football on the sand most afternoons. Small gift stalls line the edge of the beach where you can pick up handmade souvenirs. When the fishing boats return in the late afternoon, the whole beach comes alive as the catch is sorted and sold right on the sand.'),

    textBlock('Where to Eat', 'h3'),
    textBlock('Three excellent restaurants sit directly on the beach. Willy Beach is the local favorite, serving fresh seafood and coconut water. Tamu Beach Restaurant does upscale Italian with ocean views. Visiwa Beach Bar covers Mediterranean and Italian dishes in a beautiful oceanfront setting. All three are within walking distance of each other.'),

    whoIsItFor('Who Will Love This Beach', [
      { emoji: '📸', heading: 'Instagrammers', text: 'The heart island is an incredible photo opportunity' },
      { emoji: '🌍', heading: 'Culture Lovers', text: 'A real working beach with authentic local life' },
      { emoji: '🍽️', heading: 'Foodies', text: 'Three quality restaurants steps from the sand' },
      { emoji: '🌅', heading: 'Sunset Chasers', text: 'Some of the best sunsets on the Kenya coast' },
    ]),
  ],

  'jacaranda-beach': [
    quickFacts('✦ At a Glance', 'amber', [
      { icon: '📍', label: 'Location', value: '20 min drive from Watamu' },
      { icon: '💰', label: 'Entrance', value: 'Free' },
      { icon: '🪁', label: 'Activities', value: 'Kitesurfing, boat trips' },
      { icon: '🕐', label: 'Best Time', value: 'Low tide for sandbars' },
      { icon: '🐕', label: 'Pets', value: 'Welcome' },
      { icon: '🚗', label: 'Road', value: 'Improving but still bumpy' },
    ]),

    textBlock('Jacaranda Beach', 'h2'),
    textBlock('If there is one beach you absolutely cannot miss when visiting Watamu, it is Jacaranda. About twenty minutes south of town, this wild stretch of coast has the kind of beauty that stops you mid sentence. The beach is long, wide, and almost cinematic in its scale. At low tide, sandbars emerge and extend far into the Indian Ocean, creating this surreal landscape of shallow pools and exposed sand that goes on and on.'),
    textBlock('The environment here feels wilder than the town beaches. Palm trees and natural vegetation line the shore, and the beach bars that dot the coast have been built to work with the landscape rather than against it. It is the kind of place where you show up for an hour and leave six hours later.'),

    textBlock('Kitesurfing', 'h3'),
    textBlock('Jacaranda has become one of the top kitesurfing spots on the Kenya coast. The consistent winds and vast flat water areas at low tide make it ideal for beginners and experienced riders alike. Several schools operate here with equipment rental and lessons. Even if you have never tried it, this is a great place to start because the shallow water means you can stand up if you fall.'),

    tipCard('teal', '🪁', 'Kite Season', 'The best wind for kitesurfing is typically from June through March, with the strongest conditions during the Kaskazi (northeast monsoon) from December to March. Ask at the beach bars about current conditions before booking a session.'),

    textBlock('Beach Bars Worth Your Time', 'h3'),
    textBlock('Safina Beach Bar has a vibrant atmosphere with excellent coastal dishes. Luwa Beach Bar is the luxury option with twin jacuzzis, ocean view suites, and a diverse menu that goes well beyond typical beach food. African Footprint is where the locals go for fresh seafood and African inspired cooking in a relaxed setting.'),

    packingList('What to Bring', [
      { icon: '👟', text: 'Sturdy shoes for the access road' },
      { icon: '🧴', text: 'Reef safe sunscreen' },
      { icon: '🐚', text: 'A bag for shell collecting' },
      { icon: '💧', text: 'Plenty of water' },
      { icon: '📷', text: 'Camera for the sandbars' },
      { icon: '🪁', text: 'Ask about kite lessons on arrival' },
    ]),

    tipCard('warning', '🛣️', 'About the Road', 'The access road to Jacaranda is improving every year but can still be dusty and bumpy in places. A TukTuk or motorbike handles it fine. If driving, go slow and enjoy the scenery. It is part of the adventure.'),
  ],

  'captain-sammy-dhow': [
    quickFacts('✦ Cruise Details', 'purple', [
      { icon: '⛵', label: 'Vessel', value: 'Traditional Swahili dhow' },
      { icon: '🕐', label: 'Departure', value: '4:30 PM from Lichthaus' },
      { icon: '⏱️', label: 'Duration', value: '2.5 hours' },
      { icon: '💰', label: 'Price', value: '18,000 KES (up to 6 guests)' },
      { icon: '👥', label: 'Capacity', value: 'Maximum 12 guests' },
      { icon: '🍽️', label: 'Food Add On', value: '4,000 KES per person' },
    ]),

    textBlock('Captain Sammy Dhow Sunset Cruise', 'h2'),
    textBlock('If you do one thing in Watamu beyond the beach, make it a sunset dhow cruise with Captain Sammy. Sailing across Mida Creek on a traditional Swahili dhow as the sun drops into the horizon is the kind of experience that stays with you long after you leave Kenya. The crew is experienced, the vibes are perfect, and the setting is genuinely spectacular.'),
    textBlock('The dhow departs from Lichthaus at 4:30 in the afternoon and returns around 7 PM. For two and a half hours you drift across the calm waters of Mida Creek, surrounded by mangroves and wildlife. There is a swimming stop in the crystal clear water, music from the onboard speaker, and drinks flowing from the cooler. It is celebratory without being over the top.'),

    textBlock('What Is Included', 'h3'),
    textBlock('The base price of 18,000 KES covers the boat for up to six guests, with capacity for twelve. Onboard you get towels, a fully equipped kitchen, cutlery and glasses, a BBQ grill station, a cooler with ice, and a speaker. If you want the full experience, add the food and drinks package at 4,000 KES per person, which includes a freshly prepared meal and cocktails on the water.'),

    tipCard('tip', '📞', 'How to Book', 'You need to book at least 24 hours in advance with a down payment. The easiest way is through WhatsApp at +254769827110 or through Instagram at @captain_sammy_boat. Pick up and drop off is at Lichthaus Bar in Watamu.'),

    tipCard('warning', '🎫', 'Marine Park Tickets', 'KWS marine park tickets are not included in the cruise price. These cost 130 KES for Kenyan residents or $17 for non residents. The crew will arrange these for you at the departure point.'),

    whoIsItFor('Perfect For', [
      { emoji: '💑', heading: 'Couples', text: 'Sunset on the water is genuinely romantic' },
      { emoji: '🎉', heading: 'Celebrations', text: 'Birthdays, anniversaries, or just because' },
      { emoji: '👨‍👩‍👧', heading: 'Families', text: 'Safe calm waters, kids love the swimming stop' },
      { emoji: '📸', heading: 'Photographers', text: 'Golden hour on Mida Creek is extraordinary' },
    ]),
  ],

  'watamu-bay-beach': [
    quickFacts('✦ At a Glance', 'amber', [
      { icon: '📍', label: 'Location', value: 'Watamu Centre' },
      { icon: '💰', label: 'Entrance', value: 'Free' },
      { icon: '⚽', label: 'Vibes', value: 'Local beach, sunset football' },
      { icon: '🎶', label: 'Music', value: 'Friday nights at Sunset Lab' },
      { icon: '🐕', label: 'Pets', value: 'Welcome on leash' },
      { icon: '🅿️', label: 'Parking', value: 'Limited, on main road' },
    ]),

    textBlock('Watamu Bay Beach', 'h2'),
    textBlock('Also known locally as Mapango Beach or Acquarius Beach, Watamu Bay is the town beach in every sense. This is where Watamu gathers. In the late afternoon, you will find football matches happening on the sand with twenty or thirty players, fishermen sorting the day catch, and families strolling along the waterline as the sun starts to drop. It is not manicured or curated. It is real.'),
    textBlock('The beach stretches along the central waterfront of Watamu, easily accessible from multiple points in town. The sand is wide and open, the water is calm most of the year, and the atmosphere shifts throughout the day from quiet mornings to buzzing evenings.'),

    textBlock('Where to Eat', 'h3'),
    textBlock('Sunset Beach Lab is the anchor of this stretch. They serve proper Italian pizza from a wood fired oven and host live music events on Friday nights that draw a mixed crowd of locals and visitors. KOKOMO Beach next door does Lebanese fusion right on the sand, which is something you do not expect to find in a small Kenyan coastal town but it works perfectly. Several smaller bars fill in the gaps between them.'),

    tipCard('teal', '🎶', 'Friday Night Music', 'Sunset Beach Lab hosts live music sessions most Friday evenings. The crowd is a great mix of Watamu locals, expats, and visitors. No cover charge. Just show up, grab a drink, and enjoy the music with your feet in the sand.'),

    tipCard('tip', '🌊', 'Seaweed Season', 'During the winter months some seaweed can wash up on the beach. It is a natural seasonal pattern and usually clears within a few days. The beach bars keep their areas clean regardless.'),

    whoIsItFor('Who Will Love This Beach', [
      { emoji: '🌍', heading: 'Culture Seekers', text: 'This is where you experience real Watamu life' },
      { emoji: '🍕', heading: 'Foodies', text: 'Italian pizza and Lebanese fusion on the beach' },
      { emoji: '🎶', heading: 'Music Lovers', text: 'Live music Friday nights at Sunset Lab' },
      { emoji: '⚽', heading: 'Active Travelers', text: 'Jump into a beach football game at sunset' },
    ]),
  ],

  'mida-creek': [
    quickFacts('✦ At a Glance', 'teal', [
      { icon: '📍', label: 'Location', value: 'Dabaso, 15 min from Watamu' },
      { icon: '🌊', label: 'Size', value: '32 km² tidal inlet' },
      { icon: '🏞️', label: 'Part Of', value: 'Watamu Marine National Park' },
      { icon: '🌿', label: 'Ecosystem', value: 'Mangrove forest' },
      { icon: '🐢', label: 'Wildlife', value: 'Sea turtles, birds, crabs' },
      { icon: '🌅', label: 'Best Time', value: 'Sunset for dhow cruises' },
    ]),

    textBlock('Mida Creek', 'h2'),
    textBlock('Mida Creek is one of those natural wonders that makes you understand why the Kenya coast is special. This massive tidal inlet stretches 32 square kilometers inland from the ocean, winding between dense mangrove forests and opening up into wide, shallow expanses of water that change completely with the tides. At high water it is a deep blue waterway perfect for sailing. At low tide it becomes a vast exposed seabed where you can walk and observe marine life.'),
    textBlock('The creek is part of the Watamu Marine National Park and Reserve, which means it is protected and remarkably pristine. Juvenile green and hawksbill sea turtles feed in the seagrass beds, hundreds of bird species use the mangroves for nesting, and the entire ecosystem hums with life. It is about fifteen minutes from Watamu town center but feels like a completely different world.'),

    textBlock('Activities on the Creek', 'h3'),
    textBlock('The most popular experience is a sunset dhow cruise. Traditional sailing vessels take you through the waterways as the sky turns orange and pink, which is genuinely one of the most beautiful things you can do on the Kenya coast. Beyond sailing, stand up paddleboarding (SUP) tours take you through narrow mangrove channels, and kayaking lets you explore at your own pace. At high tide you can join a floating tour, and at low tide the elevated boardwalk through the mangrove forest gives you a bird eye view of the ecosystem.'),

    tipCard('tip', '🌊', 'Tide Planning', 'The creek changes dramatically between high and low tide, with up to three meters of difference. Dhow cruises and floating tours need high tide. Walking and boardwalk exploration work best at low tide. Check the tide schedule and plan accordingly.'),

    packingList('What to Bring', [
      { icon: '🧴', text: 'Reef safe sunscreen' },
      { icon: '🦟', text: 'Insect repellent for the mangroves' },
      { icon: '👟', text: 'Water shoes or sandals with grip' },
      { icon: '📷', text: 'Camera with good zoom for birds' },
      { icon: '💧', text: 'Water bottle' },
      { icon: '🧥', text: 'Light layer for the dhow cruise evening breeze' },
    ]),

    textBlock('Access Points', 'h3'),
    textBlock('You can enter the creek from several spots. Lichthaus and Temple Point are the most popular, about fifteen minutes from Watamu center. Captain Andy port is another option for boat tours. For something different, take the scenic road to The Crab Shack, a twenty minute ride that gives you a completely different perspective on the creek. Most tour operators offer hotel pickup.'),

    whoIsItFor('Perfect For', [
      { emoji: '🌿', heading: 'Nature Lovers', text: 'A protected ecosystem with incredible biodiversity' },
      { emoji: '🦅', heading: 'Bird Watchers', text: 'Hundreds of species nesting in the mangroves' },
      { emoji: '🛶', heading: 'Adventure Seekers', text: 'Kayak, SUP, or sail through the waterways' },
      { emoji: '📸', heading: 'Photographers', text: 'Sunset on the creek is world class' },
    ]),
  ],

  'marafa-hells-kitchen': [
    quickFacts('✦ At a Glance', 'amber', [
      { icon: '📍', label: 'Location', value: 'Marafa, 45 min from Watamu' },
      { icon: '🏜️', label: 'Type', value: 'Sandstone canyon' },
      { icon: '🕐', label: 'Best Time', value: 'Early morning or sunset' },
      { icon: '🧭', label: 'Tours', value: '30 min or 1 hour guided' },
      { icon: '👟', label: 'Terrain', value: 'Rocky, sturdy shoes needed' },
      { icon: '💧', label: 'Essential', value: 'Bring plenty of water' },
    ]),

    textBlock("Marafa Hell's Kitchen", 'h2'),
    textBlock("About forty five minutes inland from Watamu, the landscape shifts completely. The coastal palms and white sand give way to a dramatic sandstone canyon that looks like it belongs on another continent entirely. Marafa, locally known as Hell's Kitchen, is a geological formation of vibrant red, orange, and white rock towers that have been sculpted by wind and rain over thousands of years. Standing on the rim looking down into it feels genuinely otherworldly."),
    textBlock('The canyon changes color throughout the day as the light shifts. In the morning the stone glows warm orange. At midday the whites and reds become almost blinding. And at sunset the entire formation seems to catch fire, with deep purples and golds mixing across the rock face. This is when most visitors come, and for good reason.'),

    textBlock('Guided Tours', 'h3'),
    textBlock('Local guides offer two options. The shorter thirty minute tour takes you along the canyon rim with the best viewpoints and a summary of the geology. The full one hour experience goes deeper, covering the geological history of the formation, the local Giriama mythology surrounding it, and some of the more hidden viewpoints. Both are worth it, but if you have the time the longer tour is genuinely fascinating.'),

    tipCard('tip', '📖', 'The Local Legend', 'According to Giriama mythology, a wealthy man lived here who was so consumed by his riches that he and his entire household were swallowed by the earth. The canyon is said to be all that remains. The guides tell the story beautifully.'),

    tipCard('warning', '☀️', 'Beat the Heat', 'There is no shade in the canyon. Visit in the early morning or late afternoon to avoid the midday sun. Bring at least a liter of water per person and wear a hat. The rocky terrain requires sturdy closed toe shoes.'),

    textBlock('Combining with Gede Ruins', 'h3'),
    textBlock('Most visitors combine Marafa with Gede Ruins on a single day trip from Watamu. The two sites are in roughly the same direction and together give you a full day of history, geology, and culture. Tour operators in Watamu offer combined packages, or you can arrange a TukTuk or motorbike for the day.'),

    whoIsItFor('Perfect For', [
      { emoji: '📸', heading: 'Photographers', text: 'Sunset light on the canyon is extraordinary' },
      { emoji: '🌍', heading: 'Day Trippers', text: 'Combine with Gede Ruins for a full day' },
      { emoji: '📖', heading: 'History Buffs', text: 'Rich geological and cultural storytelling' },
      { emoji: '🥾', heading: 'Light Hikers', text: 'Easy terrain with big visual rewards' },
    ]),
  ],

  'gede-ruins': [
    quickFacts('✦ At a Glance', 'purple', [
      { icon: '📍', label: 'Location', value: '7 km from Watamu' },
      { icon: '🏛️', label: 'Period', value: '11th to 17th century' },
      { icon: '🕐', label: 'Tours', value: 'Hourly, 9 AM to 4 PM' },
      { icon: '🚗', label: 'Getting There', value: '20 min by TukTuk' },
      { icon: '🐒', label: 'Wildlife', value: 'Resident monkey colony' },
      { icon: '🏫', label: 'Facilities', value: 'Museum, picnic areas' },
    ]),

    textBlock('Gede Ruins', 'h2'),
    textBlock('Hidden in the coastal forest about seven kilometers from Watamu lies one of the most fascinating archaeological sites on the East African coast. The Gede Ruins are the remains of a Swahili trading town that thrived between the 11th and 17th centuries, then was mysteriously abandoned. Walking through the crumbling stone walls of the palace, mosques, and houses, you get a powerful sense of a civilization that was sophisticated, cosmopolitan, and connected to trade routes stretching from China to Europe.'),
    textBlock('The site is remarkably well preserved considering its age. The Great Mosque still has walls standing several meters high. The palace complex gives you a clear sense of the layout and scale of the building. And scattered throughout are the remains of private houses, some with still intact doorframes and washing areas. The forest has grown around and through the ruins in a way that is hauntingly beautiful.'),

    textBlock('What to See', 'h3'),
    textBlock('The guided tours run every hour from 9 AM to 4 PM and are well worth the small fee. The guides are knowledgeable and passionate, bringing the history to life with stories of trade, daily life, and the theories behind the town abandonment. The on site museum displays artifacts found during excavations including Chinese porcelain, glass beads, and iron tools that illustrate just how connected this town was to the wider world.'),

    tipCard('teal', '🐒', 'The Monkeys', 'A colony of Sykes monkeys lives in the trees around the ruins. They are accustomed to visitors and will come close if you have food. The guides usually have bananas available for feeding. It is a highlight for kids and makes for great photos.'),

    textBlock('Getting There', 'h3'),
    textBlock('The ruins are on the Mombasa to Malindi highway (B8), about a twenty minute ride from Watamu by TukTuk or motorbike. Most hotels can arrange transport, and tour operators offer packages that combine Gede with Marafa. If you are driving, there is parking on site. The entrance is clearly signposted from the main road.'),

    packingList('What to Bring', [
      { icon: '💧', text: 'Water bottle' },
      { icon: '🧴', text: 'Sunscreen for open areas' },
      { icon: '🦟', text: 'Insect repellent for the forest' },
      { icon: '📷', text: 'Camera for ruins and monkeys' },
      { icon: '👟', text: 'Comfortable walking shoes' },
      { icon: '🍌', text: 'Bananas for the monkeys (or buy on site)' },
    ]),
  ],

  'short-beach': [
    quickFacts('✦ At a Glance', 'teal', [
      { icon: '📍', label: 'Location', value: 'Next to Garoda Beach' },
      { icon: '💰', label: 'Entrance', value: 'Free' },
      { icon: '🏝️', label: 'Vibe', value: 'Wild and secluded' },
      { icon: '🚗', label: 'Transport', value: 'Motorbike 350 KES' },
      { icon: '⚠️', label: 'Facilities', value: 'None, bring everything' },
      { icon: '🚶', label: 'Walk to Garoda', value: '15 to 20 min at low tide' },
    ]),

    textBlock('Short Beach', 'h2'),
    textBlock('If Watamu town beaches feel too busy, Short Beach is the antidote. This is a genuinely wild and undeveloped stretch of coast tucked next to Garoda Beach, about fifteen minutes from the center of town. There are no beach bars, no sunbed rentals, no tour operators. Just sand, ocean, and silence. It is the kind of place where you might be the only person on the entire beach.'),
    textBlock('The beach earns its name from being shorter than its neighbors, but what it lacks in length it makes up for in character. At low tide a beautiful sandbank emerges from the water, creating a natural swimming area with calm, clear water. The sand is clean and fine with small coral patches near the waterline.'),

    tipCard('warning', '⚠️', 'Come Prepared', 'There are zero facilities at Short Beach. No shade, no food, no water, no toilets. Bring everything you need including sun protection, water, snacks, and something for shade. This is pure nature with no infrastructure.'),

    textBlock('The Walk to Garoda', 'h3'),
    textBlock('One of the nicest things you can do from Short Beach is walk along the shore to Garoda Beach at low tide. It takes about fifteen to twenty minutes along the waterline and the scenery is stunning the entire way. Once at Garoda you can grab lunch at Kobe Restaurant, rent a sunbed, and then walk back when you are ready. It makes for a perfect half day outing.'),

    textBlock('Getting There', 'h3'),
    textBlock('The easiest way to reach Short Beach is by motorbike (about 350 KES from Watamu center) or TukTuk (around 500 KES). The path leads past Lichthaus and Temple Point toward the entrance to Mida Creek. Nearby restaurants at Lichthaus are the closest option for food and drinks before or after your beach time.'),

    whoIsItFor('Perfect For', [
      { emoji: '🧘', heading: 'Solitude Seekers', text: 'Often completely empty, true peace and quiet' },
      { emoji: '🚶', heading: 'Beach Walkers', text: 'Beautiful coastal walk to Garoda at low tide' },
      { emoji: '📸', heading: 'Photographers', text: 'Raw untouched coastline at its finest' },
      { emoji: '🏊', heading: 'Swimmers', text: 'Calm natural pool at the sandbank during low tide' },
    ]),
  ],

  'garoda-beach': [
    quickFacts('✦ At a Glance', 'amber', [
      { icon: '📍', label: 'Location', value: 'Watamu, near Kobe Resort' },
      { icon: '💰', label: 'Entrance', value: 'Free' },
      { icon: '🏖️', label: 'Known For', value: 'Best beach in Watamu' },
      { icon: '🪁', label: 'Activities', value: 'Kitesurfing lessons' },
      { icon: '🐕', label: 'Pets', value: 'After 6 PM' },
      { icon: '🅿️', label: 'Parking', value: 'At Kobe Resort' },
    ]),

    textBlock('Garoda Beach', 'h2'),
    textBlock('Ask anyone who has spent time in Watamu which beach is the best and most will say Garoda without hesitation. This stretch of coast has everything. Pristine white sand that squeaks under your feet, turquoise water so clear you can see the bottom from twenty meters out, and a distinctive sandbar that forms during low tide and creates what looks like a private island in the middle of the ocean. It is spectacular.'),
    textBlock('The beach is well set up without being overdeveloped. Local vendors rent shade tents and sunbeds at reasonable prices. The sand is mostly clean and the water is calm enough for swimming year round. At low tide the exposed sandbar becomes a natural gathering point where visitors wade out across the shallow water to stand in what feels like the middle of the sea.'),

    textBlock('Kitesurfing at Garoda', 'h3'),
    textBlock('JC Kiteschool operates right on the beach with Duotone equipment rental and professional instruction for all levels. The flat shallow water at low tide makes Garoda one of the safest places to learn kitesurfing on the coast. Even complete beginners can get up and riding within a session or two. The school also runs sessions at nearby Jacaranda Beach when conditions suit.'),

    tipCard('tip', '🌊', 'Tide Timing', 'The tidal pattern at Garoda shifts by approximately one hour each day. Aim to arrive about two hours before low tide for the best experience. This gives you time to settle in before the sandbar appears, and you can watch the whole transformation happen in front of you.'),

    textBlock('Getting There', 'h3'),
    textBlock('Follow the signs toward Kobe Resort through Watamu town. The last hundred meters is a sandy path lined with local artisan vendors selling beautiful handmade African crafts, jewelry, and souvenirs. Parking is available at Kobe Resort. The walk through the vendor market is part of the experience and a great opportunity to pick up unique gifts.'),

    packingList('What to Bring', [
      { icon: '🧴', text: 'Reef safe sunscreen' },
      { icon: '👟', text: 'Water shoes for wading to the sandbar' },
      { icon: '💰', text: 'Cash for sunbed and shade tent rental' },
      { icon: '📷', text: 'Waterproof camera or phone pouch' },
      { icon: '🪁', text: 'Kitesurfing spirit (lessons available)' },
      { icon: '🛍️', text: 'Extra cash for the artisan market' },
    ]),

    whoIsItFor('Who Will Love This Beach', [
      { emoji: '👨‍👩‍👧', heading: 'Families', text: 'Calm water, shade available, safe for kids' },
      { emoji: '🪁', heading: 'Kite Enthusiasts', text: 'Top school with great conditions' },
      { emoji: '💑', heading: 'Couples', text: 'Walk out to the sandbar at sunset' },
      { emoji: '🛍️', heading: 'Shoppers', text: 'Beautiful artisan market on the access path' },
    ]),
  ],
}

// ─── MAIN ────────────────────────────────────────────────

async function main() {
  console.log('📝 Updating listing descriptions with rich blocks...\n')

  for (const [slug, content] of Object.entries(listingContent)) {
    console.log(`  → ${slug}...`)
    const docs = await client.fetch(`*[_type == "listing" && slug.current == $slug]{ _id }`, { slug })
    if (!docs.length) {
      console.log(`    ⚠ Not found, skipping`)
      continue
    }
    await client.patch(docs[0]._id).set({ description: content }).commit()
    console.log(`    ✅ Updated`)
  }

  console.log('\n✅ All listings updated with rich content!')
}

main().catch(err => { console.error('❌ Failed:', err); process.exit(1) })
