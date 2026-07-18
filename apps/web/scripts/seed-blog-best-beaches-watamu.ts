/**
 * Seed the "Best Beaches in Watamu 2026" blog post.
 *
 * Run locally (needs the Sanity WRITE token):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-best-beaches-watamu.ts
 *
 * Idempotent: createOrReplace with a fixed _id. Route: /journal/best-beaches-watamu-kenya
 *
 * Content rewritten from the supplied brief + competitor analysis + fact-checking:
 *  - no dashes in prose; avoids the word "refined"; every link is a real working URL
 *  - real photos from the brief are uploaded as Sanity assets and embedded inline
 *  - embeds the real Watamu beach experience listings; links guides, stays and eats
 *  - built to outrank: snippet intro, at-a-glance table, tide + seaweed tables, FAQ
 *
 * Image asset ids below were uploaded by the one-off step that read the brief's photos.
 */
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

const AUTHOR_ID = '0a5287ef-f74d-4893-a487-6b672cb63477'
const POST_ID = 'blog-best-beaches-watamu'

// Uploaded photos from the brief (asset ids in Sanity production).
const IMG = {
  jacaranda: 'image-3b36e7a5813e6774acf15a02e87d18f53e0306df-1600x900-jpg',
  resortIslands: 'image-fd4dfc5b4ac6491fac00880d9ce0474a92c59ae2-1600x1200-jpg',
  islandsSunbather: 'image-388287aa82ea73b503b49c58c6c408f2af857be2-1200x630-jpg',
  islandSandbank: 'image-ef124935817c9d1f35c40ada01458ab69469b77a-2048x1448-png',
  sandbankPeople: 'image-39c8a99293c499a8ecb825d361805ebe7c1b1ceb-2048x1448-png',
  rockyCove: 'image-1e97b86a57b560d1b4371a4e2a46fe8205e6b33f-2048x1448-png',
  kitesurf: 'image-f9814d92c190bc992c1ba9acd6c7e9ec28f78ea3-799x999-jpg',
  quietVillas: 'image-df91f448c04d207421d92a0df711e7869b5d847c-2048x1152-jpg',
  clearWater: 'image-63df462742ea2467334998275abf0b7eb9a2d785-2048x1536-jpg',
  rippledSandbank: 'image-19800a511040d84523e95a9e050c48c6f8f8bf75-1900x1425-jpg',
  sunsetGroup: 'image-6e98d0c671541a9dcfdff8acf4c4fb7adaa61fa3-2048x1536-jpg',
  sunbedsIslands: 'image-579d77b9a9bbc12122a2410de833c2e4860fb8de-2048x1536-jpg',
}

// Beach experience listing ids (for embedded cards / CTAs).
const LISTING = {
  jacaranda: '2riX1AdO9O53izfAmrInwx',
  shortBeach: '2riX1AdO9O53izfAmrIrIS',
  oceanBreezes: '2riX1AdO9O53izfAmrIeLx',
  garoda: '2riX1AdO9O53izfAmrIrcS',
  loveIsland: '2riX1AdO9O53izfAmrIeVx',
  watamuBay: 'OTOIQY89AHB7SUiuiBVdzV',
  sevenIslandsResort: 'nm8JEDxpi0X74uOLT1ANme',
}

function key() {
  return Math.random().toString(36).slice(2, 12)
}
function block(text: string, style = 'normal'): any {
  return { _type: 'block', _key: key(), style, markDefs: [], children: [{ _type: 'span', _key: key(), text, marks: [] }] }
}
function rich(parts: Array<{ text: string; bold?: boolean; link?: string }>): any {
  const markDefs: any[] = []
  const children = parts.map((p) => {
    const marks: string[] = []
    if (p.bold) marks.push('strong')
    if (p.link) { const k = key(); markDefs.push({ _type: 'link', _key: k, href: p.link }); marks.push(k) }
    return { _type: 'span', _key: key(), text: p.text, marks }
  })
  return { _type: 'block', _key: key(), style: 'normal', markDefs, children }
}
function bullets(items: string[]): any[] {
  return items.map((t) => ({ _type: 'block', _key: key(), style: 'normal', listItem: 'bullet', level: 1, markDefs: [], children: [{ _type: 'span', _key: key(), text: t, marks: [] }] }))
}
function img(assetId: string, alt: string, caption?: string): any {
  return { _type: 'image', _key: key(), alt, ...(caption ? { caption } : {}), asset: { _type: 'reference', _ref: assetId } }
}
function quickFacts(items: Array<{ icon: string; label: string; value: string }>, accentColor = 'teal', title?: string): any {
  return { _type: 'quickFactsBlock', _key: key(), ...(title ? { title } : {}), accentColor, items: items.map((i) => ({ _type: 'object', _key: key(), ...i })) }
}
function tip(text: string, label = 'Klickenya local tip', variant = 'teal', icon = '📍'): any {
  return { _type: 'tipCardBlock', _key: key(), variant, icon, label, text }
}
function listingCard(refId: string, label?: string): any {
  return { _type: 'inlineListingBlock', _key: key(), ...(label ? { label } : {}), listing: { _type: 'reference', _ref: refId } }
}
function budgetTable(columns: string[], rows: Array<{ label: string; values: string[] }>): any {
  return { _type: 'budgetTableBlock', _key: key(), columns, rows: rows.map((r) => ({ _type: 'object', _key: key(), label: r.label, values: r.values })) }
}
function pullQuote(text: string, accentColor = 'teal'): any {
  return { _type: 'pullQuoteBlock', _key: key(), text, accentColor }
}

const body: any[] = [
  // ── Snippet-bait intro ───────────────────────────────────
  block('Looking for the best beaches in Watamu, Kenya? The short answer: Garoda Beach for seaweed free sandbanks and kitesurfing, Jacaranda Bay for its Maldives like low tide pools, Short Beach for the only ocean sunset in town, Papa Remo and the Seven Islands for scenery, and Watamu Bay for the social scene. The secret to all of them is timing your visit with the tide.'),
  block("Watamu is famous for turquoise water, white sand and coral reefs, but beyond the postcard spots there are beaches that only locals really know. From hidden sandbanks to secret sunset coves and quiet residential stretches, this is our honest 2026 guide to the coastal gems that make Watamu special, with the tide timing, seaweed seasons and access tips most guides leave out."),
  img(IMG.rippledSandbank, 'Rippled white sand banks at low tide on a Watamu beach, Kenya', 'Low tide in Watamu reveals rippled sandbanks that stretch toward the reef'),

  // ── At a glance ──────────────────────────────────────────
  block('Watamu Beaches at a Glance', 'h2'),
  block('Every Watamu beach has its moment. Here is the quick version, so you can match the beach to your day.'),
  budgetTable(
    ['Beach', 'Best for', 'Seaweed season', 'Sunset over water'],
    [
      { label: 'Garoda', values: ['Sandbanks, snorkeling, kitesurfing', 'Stays cleanest', 'No'] },
      { label: 'Jacaranda Bay', values: ['Sandbank walks, photos, kite flat water', 'Can pick up seaweed', 'No'] },
      { label: 'Short Beach', values: ['Sunset, quiet, seashells', 'Sheltered creek mouth', 'Yes'] },
      { label: 'Turtle Bay to Garoda', values: ['Long walks, peace, nature', 'Gets seaweed', 'No'] },
      { label: 'Ocean Breeze', values: ['Local vibe, lounging', 'Some seaweed', 'No'] },
      { label: 'Papa Remo and Seven Islands', values: ['Scenery, sunbeds, nightlife', 'Some seaweed', 'No'] },
      { label: 'Watamu Bay', values: ['Social scene, food and drinks, families', 'Raked in season', 'No'] },
    ],
  ),

  // ── 1. Jacaranda Bay ─────────────────────────────────────
  block('1. Jacaranda Bay: the Maldives of Kenya', 'h2'),
  img(IMG.jacaranda, 'Jacaranda Bay Watamu aerial view of turquoise reef and white sand beach'),
  quickFacts([
    { icon: '🏖️', label: 'Best for', value: 'Sandbank walks, photography, kitesurfing' },
    { icon: '🚗', label: 'Access', value: 'Public path behind Jacaranda Beach Resort' },
    { icon: '🌊', label: 'Tide', value: 'Low tide, ideally between 10am and 3pm' },
    { icon: '✨', label: 'Vibe', value: 'Wild, Maldives like, quiet' },
  ]),
  block('Jacaranda Bay is the beach that makes people gasp. Locals and in the know travellers call it the Maldives of Kenya, and at the right tide you understand why. Time it with a low or medium tide and the sea pulls back to reveal bright turquoise shallows, multiple exposed sandbanks and pure white sand stretching far out toward the reef. You can walk what feels like forever with warm, clear water around your ankles.'),
  rich([
    { text: 'Jacaranda is one long ribbon of sand, roughly 10 kilometres of it, running north along the coast toward Malindi. Plenty of visitors skip it, and they are missing out. It is also a quietly world class kitesurfing spot: its wide, flat lagoons, known to kiters as Sardinia 2, offer some of the best flat water conditions on the coast in both the Kaskazi and Kusi wind seasons. If you want the full rundown, read our ' },
    { text: 'kitesurfing in Watamu guide', link: '/journal/kitesurfing-watamu-guide' },
    { text: '. One honest note: like the other north facing beaches, Jacaranda can collect seaweed during the Kusi months of June to October.' },
  ]),
  tip('Aim for a low tide that falls between 10am and 3pm for the best light and the biggest sandbanks. The public entrance is behind Jacaranda Beach Resort. Bring reef shoes for the walk out.'),
  listingCard(LISTING.jacaranda, 'Explore Jacaranda Beach on Klickenya'),

  // ── 2. Short Beach ───────────────────────────────────────
  block("2. Short Beach (Secret Beach): Watamu's only sunset beach", 'h2'),
  img(IMG.sunsetGroup, 'Friends watching the sunset over the water at Short Beach, Watamu, at the mouth of Mida Creek'),
  quickFacts([
    { icon: '🌅', label: 'Best for', value: 'Sunset, quiet, seashells' },
    { icon: '🗺️', label: 'Access', value: 'Hidden sand track near Temple Point' },
    { icon: '🌊', label: 'Tide', value: 'Low tide, and watch the currents' },
    { icon: '✨', label: 'Vibe', value: 'Wild, local, golden hour' },
  ], 'amber'),
  rich([
    { text: 'They do not call it Secret Beach for nothing. Short Beach hides at the southern end of Watamu, where Mida Creek meets the Indian Ocean, next to Temple Point and the ' },
    { text: 'Lichthaus', link: '/experiences/watamu/lichthaus-watamu' },
    { text: ' bar. The result is a wild, barely touched landscape with panoramic views across the creek mouth. The buildings around it are low and discreet, so it keeps that unspoiled feel, and you will often find residents swimming and relaxing here rather than tour groups. This is where you feel the real Watamu, away from the resorts.' },
  ]),
  block("Here is the local secret that makes Short Beach special: because Watamu's main coast faces east, almost none of its beaches see the sun set over the water. Short Beach does. Locals say that if you arrive and head right, up the steps, you reach a smaller cove that is perfectly angled for golden hour, the one spot in Watamu where you can watch the sun drop into the sea. Bring your own drinks and snacks and settle in. One safety note: the current at the creek mouth is strong as the tide pushes in and out, so treat this as a sunset and shallow paddling beach rather than a place for a long swim, and stick to the shallows."),
  tip('Come for sunset, not for a big swim. The creek mouth current is real. The access road is an unpaved, easy to miss sand track, so use a map or ask a local. It is worth every bump.', 'Klickenya local tip', 'warning', '⚠️'),
  listingCard(LISTING.shortBeach, 'See Short Beach on Klickenya'),

  // ── 3. Turtle Bay to Garoda stretch ──────────────────────
  block('3. Turtle Bay south end: the secret stretch to Garoda', 'h2'),
  img(IMG.quietVillas, 'Quiet white sand beach lined with villas and palms between Turtle Bay and Garoda, Watamu'),
  quickFacts([
    { icon: '🚶', label: 'Best for', value: 'Long walks, peace, nature' },
    { icon: '🚗', label: 'Access', value: 'Public path by Turtle Bay Hotel, then walk south' },
    { icon: '🌊', label: 'Tide', value: 'Walk at low tide, swim at high tide' },
    { icon: '✨', label: 'Vibe', value: 'Residential, serene, timeless' },
  ]),
  block('Past the busy part of Turtle Bay lies a long, unnamed shoreline that connects Turtle Bay to Garoda, and it is one of the most underrated stretches in Watamu. It is wide, soft and blissfully quiet even in peak season, perfect for long walks, yoga or simply doing nothing. The land behind it is mostly private homes and coastal bush rather than resorts, framed by coconut palms and old trees. No bars, no loud music, just sea breeze and a glimpse of how Watamu looked decades ago.'),
  rich([
    { text: 'A local reality check on the tides here, because it is the opposite of what some guides claim. At low tide the sea pulls right back over reef and sandbanks, so this stretch is for walking, not swimming, you would be out on exposed coral. Save your swim for high tide, when the water comes back in over the sand. At low water you can walk all the way from Turtle Bay south to Garoda in about fifteen minutes, which is a lovely way to arrive. While you are around Turtle Bay, it is also the home of the local ' },
    { text: 'turtle conservation and rescue work', link: '/experiences/watamu/local-ocean-conservation-watamu' },
    { text: ' that gives the bay its name.' },
  ]),
  tip('Bring water, a camera and reef shoes, and not much else. Walk this stretch at low tide, and save your swim for high tide when the water returns over the sand.'),

  // ── 4. Ocean Breeze Beach ────────────────────────────────
  block('4. Ocean Breeze Beach: local vibes and ocean views', 'h2'),
  img(IMG.sunbedsIslands, 'Sunbeds under a shade sail at Ocean Breeze Beach, Watamu, with rocky islets offshore'),
  quickFacts([
    { icon: '💙', label: 'Best for', value: 'Local vibe, lounging, ocean views' },
    { icon: '🚗', label: 'Access', value: 'Via Fortamu road' },
    { icon: '🌊', label: 'Tide', value: 'Best at low tide' },
    { icon: '✨', label: 'Vibe', value: 'Local, relaxed, authentic' },
  ], 'amber'),
  block('Just past Papa Remo, Ocean Breeze Beach, known to some locals as Mary Beach, is where natural beauty meets an easy local vibe. It offers one of the last open coastline views before the cliffs begin, so you get tranquillity without going too far off the map. It has all the beauty of Watamu’s headline beaches but feels genuinely local and lived in, which is exactly why residents love it. You reach it via Fortamu road.'),
  block("A couple of tips passed along by regulars, so take them as insider knowledge rather than gospel: at very low tide you can reportedly walk out toward a small island just offshore and climb up for a panoramic view, a little adventure most visitors never find. And there are a few beloved local restaurants near this stretch, Kibo among the names people mention, doing fresh seafood and grilled dishes. Order early, because everything is cooked fresh and can take time. There are sunbeds to hire, so it is a fine place to settle in for the day with a drink, a book and good company."),
  tip('Order your food early, everything is fresh and cooked to order. Reach it via Fortamu road, and ask a local about the low tide walk out to the little island.'),
  listingCard(LISTING.oceanBreezes, 'See Ocean Breezes Beach on Klickenya'),

  // ── 5. Garoda Beach ──────────────────────────────────────
  block('5. Garoda Beach: sandbanks, snorkeling and kitesurfing', 'h2'),
  img(IMG.kitesurf, 'Colourful kitesurfing kites over the turquoise shallows and sandbank at Garoda Beach, Watamu'),
  quickFacts([
    { icon: '🌊', label: 'Best for', value: 'Sandbanks, snorkeling, kitesurfing' },
    { icon: '🚗', label: 'Access', value: 'Off Turtle Bay Road, through Garoda Resort' },
    { icon: '⏱️', label: 'Tide', value: 'Sandbanks appear at low tide' },
    { icon: '✨', label: 'Vibe', value: 'Scenic with bursts of kite energy' },
  ]),
  block('If you only have time for one beach in Watamu, and especially if you are visiting in seaweed season, make it Garoda. It is one of the most photogenic beaches on the coast, with white sand, turquoise water and a sandbank that emerges at low tide. On the lowest spring tides a second sandbank appears, creating a surreal layered seascape made for walking and drone photography. Its real superpower, though, is that Garoda stays the cleanest of all Watamu’s beaches during the Kusi season, when the others get hit by seaweed. Locals will tell you it is close to seaweed free year round.'),
  block('Garoda is a popular launch point for snorkeling tours out to the reef, but the boats tend to come and go, leaving you with a peaceful slice of paradise. It is also one of Watamu’s best kitesurfing beaches, especially in the windy months, so whether you are riding or just watching the colourful kites dance over the water, there is a lovely energy here. Access is off Turtle Bay Road through Garoda Resort, and you head down and walk out onto the sandbank once the tide drops.'),
  tip('Garoda is your seaweed season insurance. When Turtle Bay and the town beach are weedy from June to October, Garoda’s cove usually stays clean. Walk out onto the sandbank at low tide.'),
  listingCard(LISTING.garoda, 'Explore Garoda Beach on Klickenya'),

  // ── 6. Papa Remo and Seven Islands ───────────────────────
  block('6. Papa Remo Beach and the Seven Islands', 'h2'),
  img(IMG.islandSandbank, 'The Seven Islands coral islets and a sandbank off Papa Remo Beach, Watamu, at low tide'),
  quickFacts([
    { icon: '🏝️', label: 'Best for', value: 'Scenery, sunbeds, sunsets, nightlife' },
    { icon: '🚗', label: 'Access', value: 'Jacaranda Road, north of Watamu Bay' },
    { icon: '🌊', label: 'Tide', value: 'Low tide to walk toward the islets' },
    { icon: '✨', label: 'Vibe', value: 'Cinematic and social' },
  ], 'amber'),
  block("Not exactly hidden, but far too beautiful to leave off any Watamu beach list. Papa Remo Beach, also known as Love Bay, sits along one of the most scenic stretches of the coast, framed by the Seven Islands, a cluster of small coral islets rising out of the sea. The largest is known locally as Isola dell'Amore, or Love Island. At low tide the sandbars emerge and you can walk partway out toward them, which feels like your own private expedition."),
  rich([
    { text: 'This is a beach for sunbathing, cocktails and that full tropical holiday feeling, with sunbeds, beach bars and cinematic views. It is also one of Watamu’s social hubs: ' },
    { text: 'Papa Remo', link: '/experiences/watamu/papa-remo-beach' },
    { text: ' is well known for its beach restaurant and its Saturday night parties. In the December to March high season expect more visitors and a few beach operators offering boat trips, while the quieter months turn it into a peaceful retreat. Stay for golden hour, when the light on the islands is pure magic.' },
  ]),
  tip('Low tide is the moment here, that is when the sandbars link up and you can walk out toward Love Island. Stay for sunset, and if it is a Saturday, the party tends to find you.'),
  listingCard(LISTING.loveIsland, 'See Love Island and the Seven Islands on Klickenya'),

  // ── 7. Watamu Bay ────────────────────────────────────────
  block('7. Watamu Bay Beach: the social one', 'h2'),
  img(IMG.clearWater, 'Clear turquoise water and white sand at Watamu Bay Beach near the town centre, Kenya'),
  quickFacts([
    { icon: '🍹', label: 'Best for', value: 'Social scene, food and drinks, families' },
    { icon: '🛺', label: 'Access', value: 'Central, by the town, a short tuk-tuk ride' },
    { icon: '🌊', label: 'Tide', value: 'Family friendly shallows' },
    { icon: '✨', label: 'Vibe', value: 'Lively and local' },
  ]),
  rich([
    { text: 'If you are after a more social scene, Watamu Bay Beach near the town centre is the one. Sometimes called Mapango, this is the lively hub where restaurants, bars and local shops sit right on the sand, a happy mix of local life and holiday energy. ' },
    { text: 'Kokomo', link: '/experiences/watamu/kokomo-beach-bar-restaurant-watamu' },
    { text: ' and other beach spots are all here. Whether you want a casual swim, a beachside lunch or to actually meet people, Watamu Bay delivers that classic coastal Kenya beach day. It suits families, groups and solo travellers alike, and it is the easiest beach to reach.' },
  ]),
  tip('This is your easy, sociable beach day. Come for lunch and a swim, then stay for sundowners at one of the beach bars.'),
  listingCard(LISTING.watamuBay, 'See Watamu Bay Beach on Klickenya'),

  // ── Tides ────────────────────────────────────────────────
  block('Timing the tides: when the sandbanks appear', 'h2'),
  img(IMG.sandbankPeople, 'People walking on an exposed sandbank at low tide in Watamu, Kenya'),
  block('Here is the single most useful thing to understand about Watamu: everything runs on the tide. The sandbanks, the island walks and the flat water for kitesurfing all appear at low tide. Swimming, on the other hand, is a high tide activity, because low tide often exposes reef and coral. Watamu has two high tides and two low tides a day, with a big swing of around three and a half to four metres on spring tides, which is why the same beach can look like a different place morning and afternoon.'),
  rich([
    { text: 'The practical rule: aim to be on the beach around one to two hours either side of low tide for sandbank walks and island hopping, and always check the day’s chart before you head out. Malindi is the nearest official tide station, but its timings drift a little from Watamu, so use a Watamu specific chart where you can, such as ' },
    { text: 'Windfinder Watamu tides', link: 'https://www.windfinder.com/tide/watamu' },
    { text: ' or ' },
    { text: 'tides4fishing Watamu', link: 'https://www.tides4fishing.com/ke/kenya/watamu' },
    { text: '.' },
  ]),
  tip('Do not try to swim at low tide on most Watamu beaches, you will be walking on exposed coral. Bring reef shoes, and save the swim for high tide.', 'Safety tip', 'warning', '⚠️'),

  // ── Seaweed season ───────────────────────────────────────
  block('The seaweed season, honestly', 'h2'),
  block('Watamu’s beaches are beautiful year round, but most guides gloss over the seasons, so here is the honest version. Two monsoon winds shape the coast, and they change the water completely.'),
  budgetTable(
    ['Season', 'Months', 'What to expect', 'Where to go'],
    [
      { label: 'Kaskazi (dry, high season)', values: ['December to March', 'Calm, clear water, least seaweed, sunshine', 'Every beach is at its best'] },
      { label: 'Long rains', values: ['April to June', 'Wetter, occasional storms, water can cloud up', 'Garoda and the quieter beaches'] },
      { label: 'Kusi (southeast monsoon)', values: ['June to October', 'Rougher seas, cooler, more seaweed (worst August to September)', 'Garoda stays cleanest'] },
    ],
  ),
  rich([
    { text: 'The short version: come between December and March for the clearest water, and if you visit during the Kusi months, head to Garoda, which stays close to seaweed free while the exposed beaches collect sargassum. Seaweed levels shift year to year with the weather, so it is always worth checking local updates before you travel. For the full breakdown, see our ' },
    { text: 'best time to visit Watamu guide', link: '/journal/best-time-to-visit-watamu' },
    { text: '.' },
  ]),

  // ── Kitesurf / snorkel / sunset ──────────────────────────
  block('Best beaches for kitesurfing, snorkeling and sunsets', 'h2'),
  rich([
    { text: 'For kitesurfing, Garoda and Jacaranda are the headline spots, flat, shallow and reliable when the wind is up. The wind seasons, schools and gear are all covered in our ' },
    { text: 'kitesurfing in Watamu guide', link: '/journal/kitesurfing-watamu-guide' },
    { text: '.' },
  ]),
  rich([
    { text: 'For snorkeling, you are on the edge of one of Kenya’s oldest marine parks, with a spectacular reef just offshore. One thing many visitors miss: the moment you put on a mask you legally count as snorkeling, which needs a Kenya Wildlife Service ticket, even if you are just off the beach. Non resident tickets are about 25 US dollars for adults and 15 for children, East African citizens pay 500 shillings, and under fives are free. It is cashless, paid through the eCitizen portal, and you buy at the KWS hut beside Turtle Bay and Ocean Sports. Bring reef safe sunscreen. You can book reef trips through ' },
    { text: 'the Watamu Marine National Park experience', link: '/experiences/watamu/watamu-marine-national-park' },
    { text: ' or a licensed operator like ' },
    { text: 'Aqua Ventures diving', link: '/experiences/watamu/aqua-ventures-watamu' },
    { text: '.' },
  ]),
  rich([
    { text: 'For sunset, remember Watamu’s coast faces east, so the trick is to head to the creek mouth. Short Beach and ' },
    { text: 'Mida Creek', link: '/experiences/watamu/mida-creek' },
    { text: ' are where you get that golden hour over the water. Our ' },
    { text: 'Watamu sunset spots guide', link: '/journal/watamu-sunset-spots-guide' },
    { text: ' has the full list.' },
  ]),

  // ── Getting there ────────────────────────────────────────
  block('How to get to each beach', 'h2'),
  rich([
    { text: 'Getting around Watamu is easy and cheap. Tuk-tuks and boda-bodas (motorbike taxis) are the normal way to reach Papa Remo, Jacaranda and Garoda, and you should agree the fare before you set off. Roads to the northern beaches can be rough sand tracks, so a boda is often easier than a car. Bring cash for tuk-tuks and food, but remember the marine park is card and eCitizen only. Our ' },
    { text: 'Watamu transport guide', link: '/journal/watamu-transport-guide' },
    { text: ' has current fares and routes.' },
  ]),
  tip('Watch out for friendly but persistent beach operators selling boat trips and carvings on the main beaches. Agree a price up front, and book snorkeling or boat trips through your hotel or a licensed operator rather than on the sand.'),

  // ── Where to stay and eat ────────────────────────────────
  block('Where to stay and eat near the beaches', 'h2'),
  img(IMG.resortIslands, 'Beachfront resort loungers and palms facing the islands at Watamu, Kenya'),
  rich([
    { text: 'Want to wake up near the sand? Browse all our ' },
    { text: 'Watamu stays', link: '/stays/watamu' },
    { text: ', from beachfront villas to boutique hotels. If the Seven Islands are calling, ' },
    { text: '7 Islands Resort', link: '/stays/watamu/7-islands-resort' },
    { text: ' sits right by them. ' },
    { text: 'Palm Garden', link: '/stays/watamu/palm-garden-boutique-hotel-watamu' },
    { text: ' and ' },
    { text: 'Zuri', link: '/stays/watamu/zuri-boutique-hotel-watamu' },
    { text: ' are lovely boutique bases near the town beaches, and ' },
    { text: 'Rock and Sea Bubble Eco Lodge', link: '/stays/watamu/rock-and-sea-watamu' },
    { text: ' is a one of a kind creekside stay.' },
  ]),
  rich([
    { text: 'For food, almost every beach here has a kitchen attached: Papa Remo and Kobe on the sand, Kokomo and the town bars at Watamu Bay, and plenty more. We rounded up the whole scene in our ' },
    { text: 'best restaurants in Watamu guide', link: '/journal/best-restaurants-watamu-kenya' },
    { text: '.' },
  ]),
  listingCard(LISTING.sevenIslandsResort, 'Stay by the Seven Islands: 7 Islands Resort'),

  // ── FAQ ──────────────────────────────────────────────────
  block('Watamu beaches: your questions answered', 'h2'),
  block('Which is the best beach in Watamu?', 'h3'),
  block('For most people it is Garoda, because it has sandbanks at low tide, good snorkeling and kitesurfing, and it stays cleanest during seaweed season. Jacaranda Bay is the most jaw dropping for photos and low tide pools, and Short Beach wins for sunset. The best beach really depends on the tide and the season on the day you visit.'),
  block('Is there seaweed on Watamu beaches, and when?', 'h3'),
  block('Yes, during the Kusi monsoon from about June to October, with August and September usually the worst on the exposed beaches. From December to March the water is at its clearest. Garoda stays close to seaweed free year round, so it is the safe choice in the weedy months.'),
  block('What is the best beach for kitesurfing in Watamu?', 'h3'),
  block('Garoda and Jacaranda Bay. Both offer flat, shallow water over the sandbanks at low tide, which is ideal for freestyle and for learning. The wind blows reliably in both the Kaskazi and Kusi seasons.'),
  block('Which Watamu beaches have sandbanks at low tide?', 'h3'),
  block('Jacaranda Bay and Garoda are the star sandbank beaches, and the Seven Islands off Papa Remo reveal sandbars you can walk toward at low tide. Time your visit to within one to two hours of low tide to see them at their best.'),
  block('Do you need a permit to snorkel in Watamu?', 'h3'),
  block('Yes. Watamu is a marine national park, and simply wearing a mask counts as snorkeling, which needs a Kenya Wildlife Service ticket. Non resident tickets are around 25 US dollars for adults and 15 for children, East African citizens pay 500 shillings, and under fives are free. Payment is cashless through the eCitizen portal, and you buy at the KWS hut by Turtle Bay and Ocean Sports.'),
  block('What is the best time of day to visit Watamu beaches?', 'h3'),
  block('Plan around the tide, not the clock. Aim for one to two hours either side of low tide for sandbank walks and island hopping, and go at high tide if you mainly want to swim. Always check a Watamu tide chart before you set out.'),
  block('Which Watamu beach is best for sunset?', 'h3'),
  block('Short Beach, at the mouth of Mida Creek. Because Watamu’s main coast faces east, most beaches have no ocean sunset, but the creek mouth beaches do. Mida Creek itself is the other classic sundowner spot.'),
  block('How do you get to the Watamu beaches?', 'h3'),
  block('Tuk-tuks and boda-bodas (motorbike taxis) are the usual way to reach Papa Remo, Jacaranda and Garoda. Agree the fare first, carry cash, and expect rough sand tracks on the way to the northern beaches.'),

  // ── Final ────────────────────────────────────────────────
  pullQuote('Watamu is not one beach, it is a dozen moods: turquoise sandbanks, secret sunset coves, quiet residential stretches and lively beach bars, all within a few kilometres. Time it with the tide and it is one of the most beautiful coastlines in the world.', 'teal'),
  rich([
    { text: 'Ready to go? Plan your trip on Klickenya. Browse ' },
    { text: 'Watamu stays', link: '/stays/watamu' },
    { text: ', find ' },
    { text: 'things to do in Watamu', link: '/experiences/watamu' },
    { text: ', and read our ' },
    { text: 'complete guide to Watamu', link: '/journal/complete-guide-watamu-kenya-2026' },
    { text: ' before you pack.' },
  ]),
]

async function main() {
  console.log('🏖️  Seeding blog post: Best Beaches in Watamu 2026\n')

  const doc = {
    _id: POST_ID,
    _type: 'blogPost',
    title: 'Best Beaches in Watamu, Kenya: Hidden Gems Only Locals Know (2026)',
    slug: { _type: 'slug', current: 'best-beaches-watamu-kenya' },
    status: 'published',
    author: { _type: 'reference', _ref: AUTHOR_ID },
    primaryCategory: 'beaches_coast',
    postType: 'listicle',
    location: 'watamu',
    series: 'Watamu Beaches and Coast',
    focusKeyword: 'best beaches in watamu',
    seoTitle: 'Best Beaches in Watamu, Kenya: Local Hidden Gems (2026)',
    seoDescription:
      "The best beaches in Watamu, Kenya, from Garoda's seaweed free sandbanks to secret sunset coves. A local's 2026 guide with tide timing, seaweed seasons and how to get to each.",
    excerpt:
      'A local 2026 guide to the best beaches in Watamu, Kenya: hidden sandbanks, secret sunset coves and quiet stretches, plus the tide timing, seaweed seasons and access tips most guides leave out.',
    readingTime: 12,
    publishedAt: '2026-07-17T09:00:00Z',
    keywords: [
      'best beaches in watamu',
      'watamu beaches',
      'hidden beaches watamu',
      'garoda beach watamu',
      'jacaranda beach watamu',
      'watamu sandbank low tide',
      'watamu seaweed season',
      'short beach watamu sunset',
      'papa remo seven islands',
      'watamu snorkeling marine park',
      'kitesurfing watamu',
    ],
    tags: ['Watamu', 'Beaches', 'Coast', 'Kenya', 'Travel Guide', 'Snorkeling', 'Kitesurfing'],
    relatedListings: [
      { _type: 'reference', _key: key(), _ref: LISTING.garoda },
      { _type: 'reference', _key: key(), _ref: LISTING.jacaranda },
      { _type: 'reference', _key: key(), _ref: LISTING.shortBeach },
    ],
    coverImage: {
      _type: 'image',
      alt: 'Turquoise sandbanks at low tide on a Watamu beach, Kenya',
      asset: { _type: 'reference', _ref: IMG.rippledSandbank },
    },
    body,
  }

  await client.createOrReplace(doc)
  console.log('✅ Published: /journal/best-beaches-watamu-kenya')
  console.log('   (Allow up to 60s for the site revalidate to reflect it.)')
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
