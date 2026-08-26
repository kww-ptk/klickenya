/**
 * Seed the four Kilifi beach listings, built to match the Garoda Beach template.
 *
 *   bofa-beach          Bofa Beach          (the long ocean beach north of the creek)
 *   red-house-beach     Red House Beach     (creek mouth cove, Mnarani side)
 *   mnarani-beach       Mnarani Beach       (inside the creek, south bank)
 *   kilifi-beach        Kilifi Beach        (north end of the same sand as Bofa)
 *
 * Each listing gets: quick facts, a photo row, rich sections (what it is like,
 * activities, getting there, where to eat), tip cards, a packing list, a
 * "perfect for" grid, a Google Maps link, highlights, gallery photos and SEO.
 *
 * Images are EXISTING Sanity assets that were visually checked and cross
 * referenced against the alt text used in the Kilifi journal guide, so nothing
 * is mislabelled. No new uploads, no stock photography.
 *
 * Deterministic _ids + createOrReplace, so re-running is safe and idempotent.
 *
 * Usage (run locally):
 *   cd apps/web
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-kilifi-beaches.ts --dry
 *   SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-kilifi-beaches.ts
 */

import { createClient } from 'next-sanity'

const DRY = process.argv.includes('--dry')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

/* ── Verified Sanity image assets ───────────────────────────────────
 * Every ref below was opened and looked at. The alt names in brackets are
 * the ones already used for the same asset in the Kilifi journal guide.  */
const IMG = {
  bofaAerial: 'image-ad29e174f51cf8d8a21c3eb2804a737121412b45-3840x2157-jpg',   // "Bofa Beach Kilifi"
  bofaAerial2: 'image-b7dbf6dca8fbe124029f9cb87174a0d95901fc0f-4000x2250-jpg',  // "Kilifi Bofa Beach Klickenya"
  bofaFromShore: 'image-2faf91929003800c689127e4a2dca2f82eb1d935-1200x900-jpg', // "Beautiful Bofa beach kilifi"
  bofaDecember: 'image-595d0f3ef0bf1ae35a6fae6951b3aa7ddd4fd0dd-3024x4032-jpg', // "Bofa Beach in December"
  kitesurfing: 'image-fb601ad1983f771727f296dfefcead8ba4f1d5cb-1500x1125-webp', // "Kitesurfing in Kilifi"
  saltysGroup: 'image-c420588a3b9d2e61163ccd3a4f393ed0d7ca3d30-2048x1365-jpg',
  saltysRider: 'image-12b7be5197f9aa8a8bbdb325c7d4caab5f4a3c54-2048x1365-jpg',
  mnaraniSunset: 'image-62b16adf778cdc58a6e2a5f1f5aa3d9a95054e97-800x534-webp', // "Mnarani and Plantations Kilifi"
  mnaraniClub: 'image-3274f1ac5c165af987519d9845ca20810aff025a-1410x700-jpg',
  mnaraniSailing: 'image-4fc5954c89f665e17219dc472d9166b2effaa366-850x498-jpg',
  creekDhowAerial: 'image-3fe0b067ca536c0891498ec198a3c9f0afc68f54-4000x2250-jpg', // "Kilifi Creek"
  creekDhowBeach: 'image-3c5352a28d27dd6e5907c5970a1ddec755f40e50-3024x4032-jpg',  // "dhow at sunset kilifi"
  creekAerial: 'image-e3637ad4176d9d41341e77f0ca157a28a645d51b-1080x810-jpg',      // "Kilifi Creek Klickenya"
  creekView: 'image-4246128698bdcaf15ad9fc3606fe4233e60d070a-1200x800-webp',       // "Where to stay in kilifi Kenya"
  bridgeSquare: 'image-1e88e156150d52d9d1cb75585f5e04a1d041cb4e-1080x1080-jpg',
  bridgeWide: 'image-60b1ce3885ebbef01718e516011c47281f8ad4fc-1039x641-jpg',       // "Kilifi Bridge"
  kilifiTown: 'image-c33c15e6854906bbeb710e4c6bd96039d4647d73-961x1200-jpg',       // "Kilifi Town"
}

/* ── Portable text helpers ─────────────────────────────────────────── */

let counter = 0
/** Deterministic keys, so a re-run produces byte identical documents. */
function key(prefix: string) {
  counter += 1
  return `${prefix}${counter}`
}

type Block = Record<string, any>

function tb(text: string, style: string = 'normal'): Block {
  return {
    _type: 'block',
    _key: key('b'),
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: key('s'), text, marks: [] }],
  }
}

/** Paragraph with inline links. Segments with an href become anchors. */
function tbLinked(segments: { text: string; href?: string }[]): Block {
  const markDefs: Block[] = []
  const children = segments.map((seg) => {
    if (!seg.href) return { _type: 'span', _key: key('s'), text: seg.text, marks: [] }
    const linkKey = key('l')
    markDefs.push({ _type: 'link', _key: linkKey, href: seg.href, blank: !seg.href.startsWith('/') })
    return { _type: 'span', _key: key('s'), text: seg.text, marks: [linkKey] }
  })
  return { _type: 'block', _key: key('b'), style: 'normal', markDefs, children }
}

function quickFacts(
  title: string,
  accentColor: 'amber' | 'purple' | 'teal',
  items: { icon: string; label: string; value: string }[],
): Block {
  return {
    _type: 'quickFactsBlock',
    _key: key('qf'),
    title,
    accentColor,
    items: items.map((i) => ({ _key: key('qfi'), icon: i.icon, label: i.label, value: i.value })),
  }
}

function tipCard(
  variant: 'tip' | 'warning' | 'teal' | 'purple',
  icon: string,
  label: string,
  text: string,
): Block {
  return { _type: 'tipCardBlock', _key: key('tc'), variant, icon, label, text }
}

function packingList(title: string, items: { icon: string; text: string }[]): Block {
  return {
    _type: 'packingListBlock',
    _key: key('pl'),
    title,
    items: items.map((i) => ({ _key: key('pli'), icon: i.icon, text: i.text })),
  }
}

function whoIsItFor(title: string, items: { icon: string; text: string }[]): Block {
  return {
    _type: 'whoIsItForBlock',
    _key: key('wf'),
    title,
    items: items.map((i) => ({ _key: key('wfi'), icon: i.icon, text: i.text })),
  }
}

function photoRow(
  layout: 'cols-2' | 'cols-3' | 'cols-3-rev' | 'hero-full',
  photos: { ref: string; alt: string; aspectRatio: 'wide' | 'tall' | 'square' | 'cinema' }[],
): Block {
  return {
    _type: 'photoRowBlock',
    _key: key('pr'),
    layout,
    photos: photos.map((p) => ({
      _type: 'image',
      _key: key('pri'),
      alt: p.alt,
      aspectRatio: p.aspectRatio,
      asset: { _type: 'reference', _ref: p.ref },
    })),
  }
}

function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** "📍 Open X in Google Maps" link line. */
function mapLink(label: string, query: string): Block {
  const linkKey = key('l')
  return {
    _type: 'block',
    _key: key('b'),
    style: 'normal',
    markDefs: [{ _type: 'link', _key: linkKey, href: mapsUrl(query), blank: true }],
    children: [
      { _type: 'span', _key: key('s'), text: '📍 ', marks: [] },
      { _type: 'span', _key: key('s'), text: `Open ${label} in Google Maps`, marks: [linkKey] },
    ],
  }
}

function gallery(photos: { ref: string; alt: string }[]) {
  return photos.map((p) => ({
    _type: 'image',
    _key: key('g'),
    alt: p.alt,
    asset: { _type: 'reference', _ref: p.ref },
  }))
}

/* ── Internal links (all verified against live Sanity) ─────────────── */
const L = {
  saltysBeachBar: '/experiences/kilifi/saltys-beach-bar-kilifi',
  saltysCreek: '/experiences/kilifi/saltys-on-the-creek-kilifi',
  tribalTable: '/experiences/kilifi/tribal-table',
  mnaraniClub: '/experiences/kilifi/mnarani-beach-club-kilifi',
  boatyard: '/experiences/kilifi/kilifi-boatyard',
  twistedFig: '/experiences/kilifi/the-twisted-fig',
  kilifiGuide: '/journal/complete-guide-kilifi-kenya-2026',
  kilifiFood: '/journal/best-restaurants-kilifi',
  bofaBeach: '/experiences/kilifi/bofa-beach',
  kilifiBeach: '/experiences/kilifi/kilifi-beach',
}

/* ── Listing definitions ───────────────────────────────────────────── */

interface ListingDef {
  id: string
  title: string
  slug: string
  address: string
  tags: string[]
  amenities: string[]
  highlights: { emoji: string; title: string; description: string }[]
  photos: { ref: string; alt: string }[]
  description: Block[]
  seoTitle: string
  seoDescription: string
}

const listings: ListingDef[] = [
  /* ═══════════════════════════ BOFA BEACH ═══════════════════════════ */
  {
    id: 'listing-bofa-beach-kilifi',
    title: 'Bofa Beach',
    slug: 'bofa-beach',
    address: 'Bofa Road, Kilifi',
    tags: ['beach', 'kilifi', 'white-sand', 'kite-surfing', 'swimming', 'free-entry', 'secluded', 'family', 'pet-friendly'],
    amenities: ['Parking', 'Pet Friendly', 'Sea View'],
    highlights: [
      { emoji: '🏖️', title: 'The Best Beach in Kilifi', description: 'Miles of soft white sand that is often completely empty' },
      { emoji: '🪁', title: 'Kitesurfing Hub', description: "Salty's and Tribal Kite School, two reliable wind seasons" },
      { emoji: '🆓', title: 'Free and Open', description: 'Public beach, no entrance fee and no hawkers' },
      { emoji: '🚶', title: 'Made for Walking', description: 'Walk north for an hour and pass almost nobody' },
      { emoji: '🌅', title: 'Sunrise Side', description: 'East facing, so the early morning is the magic hour' },
      { emoji: '🏡', title: 'Villa Territory', description: 'Beachfront rental houses sit right behind the sand' },
    ],
    photos: [
      { ref: IMG.bofaAerial, alt: 'Aerial view of the long white sand of Bofa Beach, Kilifi' },
      { ref: IMG.bofaAerial2, alt: 'Bofa Beach Kilifi seen from the air with palms and the reef offshore' },
      { ref: IMG.bofaFromShore, alt: 'Bofa Beach Kilifi seen from the shore with kite tents on the sand' },
      { ref: IMG.bofaDecember, alt: 'Clear shallow water and empty sand at Bofa Beach, Kilifi, in December' },
      { ref: IMG.kitesurfing, alt: 'Kitesurfer riding the shallows at Bofa Beach, Kilifi' },
      { ref: IMG.saltysGroup, alt: "Kitesurfing group on the sand at Salty's on Bofa Beach, Kilifi" },
    ],
    description: [
      quickFacts('✦ At a Glance', 'amber', [
        { icon: '📍', label: 'Location', value: 'Bofa Road, north of Kilifi town' },
        { icon: '💰', label: 'Entrance', value: 'Free, public beach' },
        { icon: '🏖️', label: 'Known For', value: 'Long white sand, often empty' },
        { icon: '🪁', label: 'Activities', value: 'Kitesurfing, swimming, walking' },
        { icon: '🅿️', label: 'Parking', value: "Free at Salty's, roadside elsewhere" },
        { icon: '🕐', label: 'Best Time', value: 'Early morning' },
      ]),

      tb('Bofa Beach', 'h2'),
      tb('Bofa is the best beach in Kilifi and, on an ordinary weekday morning, one of the emptiest beaches on the entire Kenyan coast. Miles of soft white sand, coconut palms behind the dune line, and water that runs from pale green in the shallows to deep blue out over the reef. There are no hawkers, no beach boys and no rows of sunbeds. Just sand.'),
      tb('The stretch runs north from the mouth of Kilifi Creek along Bofa Road, through a residential area where local families, expats and a growing number of beachfront rental houses share the same shoreline. Boutique hotels are starting to appear and a few restaurants and bars have opened along the beach road, but the beach itself has kept its quiet. For a lot of people who moved to Kilifi, that is the whole reason.'),

      photoRow('cols-2', [
        { ref: IMG.bofaDecember, alt: 'Clear green water over white sand at Bofa Beach, Kilifi', aspectRatio: 'tall' },
        { ref: IMG.saltysRider, alt: 'Kitesurfer landing on Bofa Beach in front of the palms, Kilifi', aspectRatio: 'tall' },
      ]),

      tb('What the beach is actually like', 'h3'),
      tb('The sand is soft, white and wide, and it keeps going. You can walk for an hour in either direction and pass a handful of people. At low tide the sea pulls back and leaves a firm flat apron that is perfect for walking, running and beach football. At high tide the water comes right up toward the vegetation in places, so if you want a proper swim, aim for the hours around high water.'),
      tb('There is a reef offshore that takes the power out of the swell, which keeps the water calm for most of the year. Seaweed does arrive during the Kusi months, but it is usually lighter here than on the fully exposed beaches further south. Shade is the one thing genuinely in short supply, so bring your own or plan around the middle of the day.'),

      tipCard('tip', '🕕', 'Go at six thirty', 'Bofa first thing in the morning is the whole point. The light is soft, the sand is cool, the tide is usually out and there is a good chance you will not see another person for the first twenty minutes. Bring a coffee, walk north, and turn around whenever you feel like it.'),

      tb('Kitesurfing at Bofa', 'h3'),
      tbLinked([
        { text: 'Bofa is a genuinely good kite spot and still a quiet one. ' },
        { text: "Salty's Kitesurf Village", href: L.saltysBeachBar },
        { text: ' is the original kite hub and the social centre of the beach, with lessons, equipment rental, storage and a beach bar right on the sand. Tribal Kite School opened more recently. Both teach complete beginners, and because the water is shallow and the beach is empty, there is plenty of room to make a mess of it without an audience.' },
      ]),
      tb('There are two wind seasons. The Kaskazi blows from the north between January and March and brings consistent wind with a calmer, prettier ocean. The Kusi blows from the south between July and September and is stronger and rougher, but still fine for all levels. Once either season starts the wind is very reliable.'),

      tb('Getting there', 'h3'),
      tb('Bofa Beach is about ten minutes north of Kilifi town along Bofa Road, and roughly an hour from Mombasa. There is no single entrance. Several public access paths run down to the sand between the houses, and the easiest to find are the tracks signposted toward Salty\'s and toward Bofa Beach Resort. Salty\'s has free parking on site. At the other access points you simply park on the roadside.'),
      tb('Tuk-tuks and boda bodas run everywhere in Kilifi and every driver knows Bofa. Agree the fare before you get in. If you are staying on the Mnarani side of the creek, allow twenty to twenty five minutes to cross the bridge and drive up the Bofa road.'),
      mapLink('Bofa Beach', 'Bofa Beach, Kilifi, Kenya'),

      tb('Where to eat and drink', 'h3'),
      tbLinked([
        { text: "Salty's Beach Bar", href: L.saltysBeachBar },
        { text: ' is the long established bar directly on the sand and it is where people gather at sunset. ' },
        { text: 'Tribal Table', href: L.tribalTable },
        { text: ' has opened on the Bofa road and is worth the short walk. Beyond those, this side is deliberately quiet, so for a bigger choice head into town or across the creek. Our ' },
        { text: 'guide to the best restaurants in Kilifi', href: L.kilifiFood },
        { text: ' covers the lot.' },
      ]),

      tipCard('warning', '⚠️', 'No lifeguards here', 'This is an unpatrolled public beach with no lifeguards and no flags. The water is calm most of the time, but the current picks up near the creek mouth at the southern end, particularly on a falling spring tide. Swim where other people are, keep children in the shallows, and stay well away from the mouth of the creek on a big tide.'),

      packingList('What to Bring', [
        { icon: '🧴', text: 'Reef safe sunscreen' },
        { icon: '💧', text: 'Water, there are no shops on the sand' },
        { icon: '🕶️', text: 'Hat and sunglasses, shade is scarce' },
        { icon: '💰', text: 'Cash for tuk-tuks and drinks' },
        { icon: '🩴', text: 'Sandals, the sand gets hot at midday' },
        { icon: '📵', text: 'Very little else, this is a beach for doing nothing' },
      ]),

      whoIsItFor('🎯 Perfect for...', [
        { icon: '🌅', text: 'Early risers who want the beach to themselves' },
        { icon: '🪁', text: 'Kitesurfers, from first lesson to advanced' },
        { icon: '🚶', text: 'Long walkers and morning runners' },
        { icon: '👨‍👩‍👧', text: 'Families, the water is calm and shallow' },
        { icon: '🏡', text: 'Long stays and remote workers' },
        { icon: '🎉', text: 'Less good if you want a busy beach with bars and watersports touts' },
      ]),

      tbLinked([
        { text: 'For everything else about the town, the creek and the neighbourhoods, read our ' },
        { text: 'complete guide to Kilifi', href: L.kilifiGuide },
        { text: '.' },
      ]),
    ],
    seoTitle: 'Bofa Beach Kilifi: White Sand, Kitesurfing and Empty Mornings',
    seoDescription: "Bofa Beach is the best beach in Kilifi: miles of empty white sand, free entry, kitesurfing with Salty's, and honest advice on tides, access and parking.",
  },

  /* ═════════════════════════ RED HOUSE BEACH ════════════════════════ */
  {
    id: 'listing-red-house-beach-kilifi',
    title: 'Red House Beach',
    slug: 'red-house-beach',
    address: 'Mnarani, south side of Kilifi Creek mouth, Kilifi',
    tags: ['beach', 'kilifi', 'mnarani', 'secluded', 'free-entry', 'white-sand'],
    amenities: ['Sea View'],
    highlights: [
      { emoji: '🤫', title: 'Kilifi’s Least Visited Beach', description: 'A small cove most visitors never find' },
      { emoji: '🌅', title: 'Sunrise Spot', description: 'East facing, over the mouth of the creek' },
      { emoji: '⛵', title: 'Dhows Passing Close', description: 'Boats run in and out of the creek metres from the sand' },
      { emoji: '🆓', title: 'Free and Ungated', description: 'No ticket, no gate, no facilities' },
      { emoji: '🪨', title: 'Rocky Cove Setting', description: 'Sand tucked between coral rock on both sides' },
      { emoji: '📷', title: 'A Photographer’s Beach', description: 'The creek mouth view is one of the best in Kilifi' },
    ],
    photos: [
      { ref: IMG.creekDhowBeach, alt: 'Dhow arriving at a small sandy cove at the mouth of Kilifi Creek' },
      { ref: IMG.creekAerial, alt: 'Aerial view of the mouth of Kilifi Creek where it meets the Indian Ocean' },
      { ref: IMG.creekDhowAerial, alt: 'Dhow sailing on Kilifi Creek below the wooded banks' },
      { ref: IMG.creekView, alt: 'Kilifi Creek seen from the Mnarani side' },
      { ref: IMG.bridgeSquare, alt: 'Kilifi bridge crossing the creek between town and Mnarani' },
    ],
    description: [
      quickFacts('✦ At a Glance', 'teal', [
        { icon: '📍', label: 'Location', value: 'Mnarani, south of the creek mouth' },
        { icon: '💰', label: 'Entrance', value: 'Free' },
        { icon: '🏖️', label: 'Known For', value: 'A hidden cove where creek meets ocean' },
        { icon: '🌅', label: 'Best For', value: 'Sunrise and quiet' },
        { icon: '🚗', label: 'Access', value: 'Dirt track, tuk-tuk is easiest' },
        { icon: '🚻', label: 'Facilities', value: 'None at all' },
      ]),

      tb('Red House Beach', 'h2'),
      tb('Red House Beach is the smallest and least visited public beach in Kilifi. It is a short apron of sand tucked between rocks on the southern side of the creek mouth, at the exact point where Kilifi Creek finally meets the Indian Ocean. It takes its name from the red house standing above it, which is also how everybody gives directions to it.'),
      tb('You do not come here for sunbeds and beach bars. There are none, and there is no sign that there ever will be. You come because it is quiet, because the view straight out of the creek mouth is one of the best in Kilifi, and because on most days you will have the whole thing to yourself.'),

      photoRow('cols-2', [
        { ref: IMG.creekDhowBeach, alt: 'Small sandy cove at the mouth of Kilifi Creek with fishing boats', aspectRatio: 'tall' },
        { ref: IMG.creekView, alt: 'The green banks of Kilifi Creek near Red House Beach', aspectRatio: 'tall' },
      ]),

      tb('What it is like', 'h3'),
      tb('The beach is genuinely small. At high tide there is not much sand left at all, and at low tide the coral shelf on either side is exposed and sharp. In between you get a clean crescent of sand with the open ocean on one side and the mouth of the creek on the other. Dhows and small fishing boats pass close by on their way in and out, which is most of the entertainment.'),
      tb('It faces roughly east, so this is a sunrise beach rather than a sunset one. Arrive early and you will watch the sun come up over the water while the boats head out. By the middle of the morning it is usually still empty.'),

      tipCard('warning', '⚠️', 'Respect the current', 'This is a creek mouth, and creek mouths move a lot of water. On a falling tide the current running out of Kilifi Creek past this beach is strong, and it does not look strong from the sand. Swim around slack high water, stay close in, and do not let children swim unsupervised here.'),

      tb('Getting there', 'h3'),
      tb('Red House sits on the Mnarani side, so from Kilifi town you cross the bridge and turn back toward the coast through Mnarani. The last stretch is a dirt track between residential plots, and it is far easier to arrive by tuk-tuk or boda boda than in a low car, especially after rain. There is no car park, no gate and no ticket office. Kilifi drivers know it simply as Red House.'),
      mapLink('Red House Beach', 'Red House Beach, Kilifi, Kenya'),

      tb('What else is nearby', 'h3'),
      tbLinked([
        { text: 'The Mnarani ruins, two mosques and a group of tombs on the clifftop overlooking the creek, are a few minutes away and worth an hour. ' },
        { text: 'Mnarani Beach Club', href: L.mnaraniClub },
        { text: ' and ' },
        { text: 'Kilifi Boatyard', href: L.boatyard },
        { text: ' are both on this side of the water for lunch or a drink, and the creek itself is where the sailing, kayaking and sunset dhow trips happen.' },
      ]),

      packingList('What to Bring', [
        { icon: '💧', text: 'Water and a snack, there is nothing here' },
        { icon: '👟', text: 'Shoes with grip for the rock and coral' },
        { icon: '🧴', text: 'Reef safe sunscreen' },
        { icon: '📷', text: 'A camera for sunrise' },
        { icon: '🩹', text: 'A plaster or two, the coral is sharp' },
        { icon: '🚮', text: 'A bag to carry your rubbish back out' },
      ]),

      whoIsItFor('🎯 Perfect for...', [
        { icon: '🌅', text: 'Sunrise watchers' },
        { icon: '🤫', text: 'Anyone who wants an empty beach' },
        { icon: '📷', text: 'Photographers' },
        { icon: '🚶', text: 'A short quiet stop rather than a full day' },
        { icon: '👨‍👩‍👧', text: 'Less suitable for small children, the current is real' },
        { icon: '🍹', text: 'Not for you if you want facilities of any kind' },
      ]),
    ],
    seoTitle: 'Red House Beach Kilifi: The Hidden Cove at the Creek Mouth',
    seoDescription: 'Red House Beach is the quietest public beach in Kilifi, a small cove where the creek meets the ocean. How to find it, when to swim, and what to expect.',
  },

  /* ═══════════════════════════ MNARANI BEACH ════════════════════════ */
  {
    id: 'listing-mnarani-beach-kilifi',
    title: 'Mnarani Beach',
    slug: 'mnarani-beach',
    address: 'Mnarani, south bank of Kilifi Creek, Kilifi',
    tags: ['beach', 'kilifi', 'mnarani', 'swimming', 'sunset', 'family', 'heritage', 'free-entry'],
    amenities: ['Parking', 'Sea View'],
    highlights: [
      { emoji: '⛵', title: 'Best Sailing Water in Kilifi', description: 'Flat sheltered creek, dinghies, catamarans and kayaks' },
      { emoji: '🌅', title: 'Sunset Dhow Trips', description: 'The classic Kilifi evening leaves from this stretch' },
      { emoji: '🏛️', title: 'Mnarani Ruins Above', description: 'Ancient mosques and tombs on the clifftop' },
      { emoji: '🌊', title: 'Calm and Warm', description: 'Sheltered from the swell, around 25°C most of the year' },
      { emoji: '👨‍👩‍👧', title: 'Good for Children', description: 'Gentle water and a safe place to learn on the water' },
      { emoji: '🌉', title: 'Kilifi Bridge Views', description: 'The creek, the cliffs and the bridge all in one frame' },
    ],
    photos: [
      { ref: IMG.mnaraniSunset, alt: 'Sunset over Kilifi Creek at Mnarani with boats moored off the beach' },
      { ref: IMG.mnaraniClub, alt: 'Mnarani Beach Club and its creek beach seen from the water, Kilifi' },
      { ref: IMG.mnaraniSailing, alt: 'Sailing dinghy on the flat water of Kilifi Creek at Mnarani' },
      { ref: IMG.creekDhowAerial, alt: 'Dhow sailing on Kilifi Creek near Mnarani' },
      { ref: IMG.bridgeWide, alt: 'Kilifi bridge over the creek seen from the air' },
      { ref: IMG.creekAerial, alt: 'Aerial view of Kilifi Creek with yachts moored off Mnarani' },
    ],
    description: [
      quickFacts('✦ At a Glance', 'purple', [
        { icon: '📍', label: 'Location', value: 'Mnarani, south bank of Kilifi Creek' },
        { icon: '💰', label: 'Entrance', value: 'Free, club beach is for guests' },
        { icon: '🌊', label: 'Water', value: 'Sheltered creek, calm and warm' },
        { icon: '⛵', label: 'Activities', value: 'Sailing, kayaking, dhow trips' },
        { icon: '🏛️', label: 'Nearby', value: 'Mnarani ruins on the cliff above' },
        { icon: '🕐', label: 'Best Time', value: 'Around high tide' },
      ]),

      tb('Mnarani Beach', 'h2'),
      tb('Mnarani Beach is not an ocean beach, and that is the point. It sits inside Kilifi Creek on the southern bank, a strip of sand below the cliffs where the water is flat, warm and completely sheltered from the swell. If Bofa is where you go to walk, Mnarani is where you go to get on the water.'),
      tb('This is the working, social side of the creek. Boats sit on their moorings just off the sand, dinghies come and go from the club, dhows drift past in the evening, and the whole scene is framed by the green cliffs of the north bank with the Kilifi bridge upstream.'),

      photoRow('cols-2', [
        { ref: IMG.mnaraniSunset, alt: 'Boats moored at sunset on Kilifi Creek at Mnarani', aspectRatio: 'wide' },
        { ref: IMG.bridgeWide, alt: 'Kilifi bridge crossing the creek above Mnarani', aspectRatio: 'wide' },
      ]),

      tb('On the water', 'h3'),
      tbLinked([
        { text: 'The creek is one of the best natural sailing and paddling grounds on the Kenyan coast. ' },
        { text: 'Mnarani Beach Club', href: L.mnaraniClub },
        { text: ' runs sailing dinghies, catamarans, windsurfing and kayaks from its beach, with proper courses if you want to learn rather than just mess about. ' },
        { text: 'Kilifi Boatyard', href: L.boatyard },
        { text: ' and the fishing club sit a little further up the creek. Sunset dhow trips leave from this stretch of water and are the single most photographed thing in Kilifi, deservedly.' },
      ]),
      tb('Water temperature sits around twenty five degrees for most of the year and the creek is protected on all sides, so conditions are far gentler than the open coast. That makes it a genuinely good place for children to learn to sail or paddle.'),

      tipCard('teal', '🌊', 'The tide matters more here', 'Inside the creek the tide changes everything. At low water large parts of the bank dry out into mud and rock and the swimming disappears entirely. Come on a rising or high tide and you get clear water right up to the sand. Check a Kilifi tide table before you commit an afternoon to it.'),

      tb('The ruins above the beach', 'h3'),
      tb('On the clifftop directly above sits the Mnarani National Monument, the remains of two mosques and a group of pillar tombs from the Swahili settlement that once controlled this creek, alongside a huge baobab and a deep well cut into the coral rag. There is a small entrance fee and the view down over the creek from the top is the best in Kilifi. Half an hour up there pairs perfectly with an afternoon on the water.'),

      tb('Getting there', 'h3'),
      tb('Mnarani is on the south side of Kilifi bridge. Coming from Mombasa you reach it just before you cross, and coming from Kilifi town you cross the bridge and turn right. It is five minutes from the town centre and about fifteen to twenty from Bofa. Tuk-tuks run across the bridge constantly and it is a cheap hop.'),
      mapLink('Mnarani Beach', 'Mnarani Beach, Kilifi, Kenya'),

      tb('Eating and drinking', 'h3'),
      tbLinked([
        { text: 'Mnarani Beach Club has the beach and the pools. ' },
        { text: 'Kilifi Boatyard', href: L.boatyard },
        { text: ' sits right on the water further along the creek and is a Kilifi institution. ' },
        { text: "Salty's on the Creek", href: L.saltysCreek },
        { text: ' and ' },
        { text: 'The Twisted Fig', href: L.twistedFig },
        { text: ' are the other options on this side. All of them are on Klickenya.' },
      ]),

      packingList('What to Bring', [
        { icon: '🩴', text: 'Sandals for the walk down to the water' },
        { icon: '🕶️', text: 'Sunglasses, the creek throws a lot of glare' },
        { icon: '🧴', text: 'Reef safe sunscreen' },
        { icon: '💧', text: 'Water' },
        { icon: '📷', text: 'A camera for the evening dhows' },
        { icon: '👟', text: 'Proper shoes if you are walking up to the ruins' },
      ]),

      whoIsItFor('🎯 Perfect for...', [
        { icon: '⛵', text: 'Sailors, paddlers and windsurfers' },
        { icon: '👨‍👩‍👧', text: 'Families with young children' },
        { icon: '🌅', text: 'Sunset dhow trips' },
        { icon: '🏛️', text: 'History and old Swahili ruins' },
        { icon: '🧘', text: 'Slow afternoons on flat water' },
        { icon: '🏄', text: 'Not for you if you came for surf and open ocean' },
      ]),
    ],
    seoTitle: 'Mnarani Beach Kilifi: Creek Sailing, Dhows and Ancient Ruins',
    seoDescription: 'Mnarani Beach sits inside Kilifi Creek: flat sheltered water for sailing and kayaking, sunset dhow trips, and the Mnarani ruins on the cliff above.',
  },

  /* ═══════════════════════════ KILIFI BEACH ═════════════════════════ */
  {
    id: 'listing-kilifi-beach',
    title: 'Kilifi Beach',
    slug: 'kilifi-beach',
    address: 'North end of Bofa Road, Kashero, Kilifi',
    tags: ['beach', 'kilifi', 'white-sand', 'secluded', 'free-entry', 'swimming'],
    amenities: ['Sea View'],
    highlights: [
      { emoji: '🏝️', title: 'The Empty End', description: 'The quietest section of the Kilifi shoreline' },
      { emoji: '🤍', title: 'Same White Sand', description: 'One continuous strip running north from the creek' },
      { emoji: '🆓', title: 'Free Public Access', description: 'Sandy tracks down to the beach between the plots' },
      { emoji: '🌅', title: 'Sunrise and Low Tide', description: 'Firm flat sand at first light, best hours of the day' },
      { emoji: '🚫', title: 'Nothing There', description: 'No bar, no shop, no shade, which is the appeal' },
      { emoji: '🐚', title: 'Beachcombing', description: 'Shells and driftwood that nobody has picked over' },
    ],
    photos: [
      { ref: IMG.bofaAerial2, alt: 'The long white sand of the Kilifi shoreline seen from the air' },
      { ref: IMG.bofaAerial, alt: 'Empty white sand and turquoise water on the Kilifi coast' },
      { ref: IMG.bofaDecember, alt: 'Clear shallow water off the Kilifi beach at low tide' },
      { ref: IMG.bofaFromShore, alt: 'Kilifi beach seen from the shore with palms and casuarina trees' },
      { ref: IMG.kilifiTown, alt: 'Aerial view of Kilifi town, the last stop for supplies before the beach' },
    ],
    description: [
      quickFacts('✦ At a Glance', 'amber', [
        { icon: '📍', label: 'Location', value: 'North end of Bofa Road, Kashero' },
        { icon: '💰', label: 'Entrance', value: 'Free' },
        { icon: '🏖️', label: 'Known For', value: 'The quiet far end of the beach' },
        { icon: '🚗', label: 'Access', value: '15 to 20 minutes north of town' },
        { icon: '🅿️', label: 'Parking', value: 'Roadside at the access tracks' },
        { icon: '🕐', label: 'Best Time', value: 'Sunrise and low tide' },
      ]),

      tb('Kilifi Beach', 'h2'),
      tb('Kilifi Beach is the name used for the northern end of the long sand strip that begins at the creek mouth and runs up past Bofa. It is the same beach, the same white sand and the same reef sitting offshore. What changes is the density. Up here the houses thin out, the access tracks get sandier, and the beach empties out almost entirely.'),
      tb('This end runs along the top of Bofa Road toward Kashero and Tezo, past Kilifi Bay. If Bofa already feels quiet to you, this is that same beach with even fewer footprints on it.'),

      photoRow('cols-2', [
        { ref: IMG.bofaDecember, alt: 'Clear water and empty sand at the north end of the Kilifi beach', aspectRatio: 'tall' },
        { ref: IMG.bofaFromShore, alt: 'Casuarina trees and white sand on the Kilifi shoreline', aspectRatio: 'tall' },
      ]),

      tb('What it is like', 'h3'),
      tb('Wide white sand, a reef far enough out to flatten the swell, and almost nobody. At low tide the sea drops back over a firm sand flat that you can walk for as long as your legs hold out. At high tide the beach narrows and the swimming is better. There is no shade beyond what the casuarinas throw at the top of the beach, and no lifeguard anywhere on this coast, so treat it as the wild beach it is.'),
      tb('Because so few people come up here, it is also the best of the Kilifi beaches for beachcombing. Shells, driftwood and the occasional float wash up and stay put.'),

      tipCard('tip', '🚗', 'Come prepared', 'There is nothing at this end. No bar, no shop, no shade and nobody selling water. Stock up in Kilifi town before you drive north, and either tell your tuk-tuk driver when to come back for you or take his number. Phone signal is fine but you will not find a taxi passing by.'),

      tb('Kilifi Beach or Bofa Beach?', 'h3'),
      tbLinked([
        { text: 'They are the same shoreline, which confuses a lot of visitors. ' },
        { text: 'Bofa', href: L.bofaBeach },
        { text: ' is the busier and better serviced middle section, with the kite schools, the beach bar and most of the rental houses. Kilifi Beach is the quiet northern end with nothing on it. If you want a kite lesson and a cold drink afterwards, go to Bofa. If you want to see nobody at all, keep driving north.' },
      ]),

      tb('Getting there', 'h3'),
      tb('Follow Bofa Road north out of Kilifi town and keep going past the turn offs for Salty\'s and Kilifi Bay. Access to the sand is by short sandy tracks running down between the plots. A tuk-tuk will manage it in dry weather, though the sand is soft in places and a boda boda is the more reliable option. Allow fifteen to twenty minutes from town, or about an hour and a quarter from Mombasa.'),
      mapLink('Kilifi Beach', 'Kilifi Beach, Bofa Road, Kilifi, Kenya'),

      packingList('What to Bring', [
        { icon: '💧', text: 'More water than you think you need' },
        { icon: '🥪', text: 'Food, there is nowhere to buy any' },
        { icon: '⛱️', text: 'An umbrella or shade, there is none' },
        { icon: '🧴', text: 'Reef safe sunscreen' },
        { icon: '💰', text: 'Cash for the tuk-tuk both ways' },
        { icon: '🐚', text: 'A bag for the shells you will pick up' },
      ]),

      whoIsItFor('🎯 Perfect for...', [
        { icon: '🤫', text: 'People who want a beach entirely to themselves' },
        { icon: '🚶', text: 'Very long walks' },
        { icon: '🌅', text: 'Sunrise, this coast faces east' },
        { icon: '🐚', text: 'Beachcombers' },
        { icon: '📷', text: 'Drone and landscape photography' },
        { icon: '🍹', text: 'Not for you if you want a beach bar and a sunbed' },
      ]),

      tbLinked([
        { text: 'For the wider picture of the town, the creek and where to stay, read our ' },
        { text: 'complete guide to Kilifi', href: L.kilifiGuide },
        { text: '.' },
      ]),
    ],
    seoTitle: 'Kilifi Beach: The Quiet North End of Kilifi’s White Sand',
    seoDescription: 'Kilifi Beach is the empty northern end of the Bofa shoreline. Free access, no facilities, and the quietest white sand on the Kilifi coast.',
  },
]

/* ── Main ──────────────────────────────────────────────────────────── */

async function main() {
  console.log(`🏖️  Seeding ${listings.length} Kilifi beach listings${DRY ? ' (DRY RUN)' : ''}\n`)

  for (const l of listings) {
    const doc = {
      _id: l.id,
      _type: 'listing',
      title: l.title,
      slug: { _type: 'slug', current: l.slug },
      type: 'experience',
      subcategory: 'beaches',
      status: 'published',
      city: 'Kilifi',
      county: 'Kilifi',
      address: l.address,
      hostName: 'KlicKenya',
      description: l.description,
      tags: l.tags,
      amenities: l.amenities,
      highlights: l.highlights.map((h) => ({
        _type: 'object',
        _key: key('h'),
        emoji: h.emoji,
        title: h.title,
        description: h.description,
      })),
      photos: gallery(l.photos),
      seoTitle: l.seoTitle,
      seoDescription: l.seoDescription,
      isVerified: false,
      verificationStatus: 'pending',
    }

    const blocks = l.description.length
    const words = JSON.stringify(l.description).split(/\s+/).length

    if (DRY) {
      console.log(`  ○ ${l.title.padEnd(18)} /experiences/kilifi/${l.slug}`)
      console.log(`      ${blocks} content blocks · ${l.photos.length} photos · ${l.highlights.length} highlights · ~${words} words`)
      continue
    }

    await client.createOrReplace(doc)
    console.log(`  ✅ ${l.title.padEnd(18)} https://www.klickenya.com/experiences/kilifi/${l.slug}`)
  }

  console.log(
    DRY
      ? '\nDry run complete. Re-run without --dry to publish.'
      : '\n✅ Done. The Sanity webhook revalidates each concrete URL automatically.',
  )
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
