import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
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
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }
}

function richText(children: Array<{ text: string; bold?: boolean; link?: string }>): any {
  const markDefs: any[] = []
  const spans = children.map((c) => {
    const marks: string[] = []
    if (c.bold) marks.push('strong')
    if (c.link) {
      const linkKey = key()
      markDefs.push({ _type: 'link', _key: linkKey, href: c.link, blank: false })
      marks.push(linkKey)
    }
    return { _type: 'span', _key: key(), text: c.text, marks }
  })
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs,
    children: spans,
  }
}

function placeholder(caption?: string): any {
  return {
    _type: 'photoRowBlock',
    _key: key(),
    layout: 'hero-full',
    photos: [{ alt: caption ?? 'Watamu Kenya', aspectRatio: 'wide' }],
    caption: caption ?? '',
  }
}

// ══════════════════════════════════════════════════════
// BEST TIME TO VISIT WATAMU, KENYA
// ══════════════════════════════════════════════════════

const body = [

  // ── Intro ──
  textBlock('People ask us this question more than almost any other. When is the best time to visit Watamu? And the honest answer is: it depends on what you are looking for. We have been to Watamu in every single month of the year, in the heat of January and the rains of May, in the kite winds of August and the quiet beauty of September. Every season has something to offer. But every season is also genuinely different. So here is the full picture, written by people who know it well.'),

  // ── Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Watamu seasons at a glance',
    accentColor: 'teal',
    items: [
      { icon: '☀️', label: 'Hot and dry', value: 'November to March: 30 to 34°C, calm seas, best snorkeling' },
      { icon: '🌬️', label: 'Cool and dry', value: 'July to October: 25 to 29°C, kite winds, fewer crowds' },
      { icon: '🌧️', label: 'Low season', value: 'April, May, June: long rains, many places closed' },
      { icon: '🪁', label: 'Kite season', value: 'July to September: 20 to 30 knots, world-class conditions' },
      { icon: '🐬', label: 'Dolphin and snorkel season', value: 'November to April: calm seas, best visibility' },
      { icon: '📅', label: 'Busiest months', value: 'January, February, July and August' },
    ],
  },

  // ── Tide Chart ──
  { _type: 'tideChartBlock', _key: key() },

  // ── The Two Seasons ──
  textBlock('The Two Main Seasons', 'h2'),

  richText([
    { text: 'Watamu essentially has two good seasons to visit and one period to avoid unless you know what you are getting into. The ' },
    { text: 'hot dry season runs from November through to March', bold: true },
    { text: '. The ' },
    { text: 'cooler dry season runs from July through to October', bold: true },
    { text: '. And the long rains from April through to early July are the low season when a significant number of restaurants and accommodations close their doors.' },
  ]),

  textBlock('Both good seasons are genuinely wonderful, just in different ways. The hot season gives you the most beautiful ocean: glassy, warm, clear water perfect for snorkeling, dolphin trips and long days on the beach. The cooler season brings the kite winds, slightly lower prices, and a pace that feels even more relaxed. We love both. The question is which one suits you.'),

  placeholder('Watamu beach across the two seasons'),

  // ── Low Season ──
  textBlock('The Low Season: April, May and Early June', 'h2'),

  richText([
    { text: 'Let us be straight with you about this because a lot of travel guides gloss over it. ' },
    { text: 'April, May and the first week or two of June are the genuine low season in Watamu', bold: true },
    { text: ', and it shows. This is when the long rains arrive and a significant number of businesses close. Many restaurants shut completely. Many hotels and villas close for maintenance and renovation. The beach is quieter because most visitors simply do not come.' },
  ]),

  textBlock('The reopening happens gradually from early July onwards. By mid-July, most of Watamu is back in business. If you are planning to travel in late June, be aware that some of your favourite restaurants may still be closed and you should check with your accommodation before booking. The first week of July is genuinely still transition time.'),

  richText([
    { text: 'That said, the low season has its appeal if you go in with the right expectations. The local Kenyan community is still there and very much alive. A handful of places stay open. ' },
    { text: 'Prices drop significantly.', bold: true },
    { text: ' The town takes on a different, slower character that some people actually love. It rains, but it rarely rains all day. Mornings can be clear and beautiful. If you are a photographer, the sky in May is extraordinary.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'If you are booking for late June',
    text: 'Late June is still transition time. Check directly with your hotel and any restaurant you plan to visit before you book. Most places reopen in the first or second week of July but this varies year to year. Do not assume everything will be open.',
  },

  placeholder('Watamu in the rainy season, lush and quiet'),

  // ── Nov to March ──
  textBlock('November to March: Hot, Dry and Beautiful', 'h2'),

  richText([
    { text: 'This is the season most people picture when they think of a Kenyan beach holiday. ' },
    { text: 'Temperatures at midday reach 33 to 35 degrees Celsius', bold: true },
    { text: '. The sky is blue, the air is warm, and the Indian Ocean in front of Watamu is calm, flat and so clear you can see the coral from the surface. This is the Kaskazi season, driven by the north-east trade winds that bring warm dry air down the coast.' },
  ]),

  richText([
    { text: 'This is the ' },
    { text: 'best time for snorkeling and diving', bold: true },
    { text: '. The sea is at its calmest and visibility in the marine park is outstanding. It is also the best time for dolphin excursions: the calm water makes for long, comfortable trips out to sea and Indo-Pacific bottlenose dolphins are regularly spotted January through March. Safari Blue trips and dhow excursions are at their best during this period.' },
  ]),

  textBlock('A personal favourite among the team is January and February. The ocean is at its most beautiful. The water is warm, the beaches are stunning, and there is a joyful energy in the town with visitors from Italy, Kenya, and across Europe filling the restaurants and bars.'),

  richText([
    { text: 'One thing to be aware of in November: it is the transition out of the short rains and into the hot season. ' },
    { text: 'November is the best month for completely calm seas and excellent snorkeling conditions', bold: true },
    { text: ', but there is no kite breeze and the heat without wind can be intense. If you are sensitive to heat, factor that in. By December the conditions are typically perfect.' },
  ]),

  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { number: '33 to 35°C', label: 'daytime temperatures November through March' },
      { number: '26 to 28°C', label: 'average water temperature, warm year-round' },
      { number: 'Jan to Mar', label: 'peak season for dolphin trips and Safari Blue excursions' },
    ],
  },

  placeholder('Clear blue water and white sand, January in Watamu'),

  // ── July to October ──
  textBlock('July to October: The Kite Season and the Sweet Spot', 'h2'),

  richText([
    { text: 'From July through to October, Watamu enters the Kusi season. The south-east trade winds arrive, temperatures drop to a comfortable 25 to 29 degrees Celsius during the day and around 22 to 24 degrees in the evenings, and the ocean becomes more lively with chop and small waves. ' },
    { text: 'This is Kenya\'s kitesurfing season', bold: true },
    { text: ' and Watamu is at the heart of it.' },
  ]),

  richText([
    { text: 'The Kusi winds blow consistently at 20 to 30 knots across July, August and September. The lagoon at Watamu is ideal for beginner and intermediate kiters: flat, shallow, and forgiving. Advanced riders head out to the open water. ' },
    { text: 'If you are a kiter or thinking about learning, this is your window.', bold: true },
    { text: ' Read our dedicated guide to ' },
    { text: 'kitesurfing in Watamu', bold: true, link: 'https://www.klickenya.com/journal/kitesurfing-watamu-guide' },
    { text: ' for everything you need to know about conditions, schools and where to stay.' },
  ]),

  textBlock('A personal favourite of the team is September. It is one of the most beautiful months in Watamu. The wind is still blowing, the sky is clear, the town is busy but not overwhelming, and that slightly cooler temperature makes walking around, eating outside and being on the beach feel genuinely comfortable rather than exhausting. If you are flexible on dates and want a balance of good weather, good kite conditions and a great atmosphere, September is hard to beat.'),

  richText([
    { text: 'During this season the sea is more active, which means dolphin excursions are still possible but conditions are rougher. ' },
    { text: 'July to September is also the season when humpback whales migrate through Watamu waters', bold: true },
    { text: ', which is extraordinary if you get a sighting. Some operators run responsible whale watching excursions during this period.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🌟',
    label: 'A local favourite: September in Watamu',
    text: 'September is genuinely one of the most enjoyable months to visit. Dry, beautiful, slightly cooler than the peak hot season, and with a kite wind that makes every afternoon on the beach feel alive. Fewer tourists than July and August, prices are slightly lower, and the town has a relaxed confident energy. If you can come in September, come in September.',
  },

  placeholder('Kitesurfers in the Watamu lagoon, July to September'),

  // ── Short Rains ──
  textBlock('October and November: The Short Rains and the Quiet Season', 'h2'),

  richText([
    { text: 'October and November sit in a transition period between the Kusi kite season and the hot dry season. There are short rains during this time, which means occasional afternoon showers and overcast skies. ' },
    { text: 'Tourist activity dips noticeably in October and November', bold: true },
    { text: ', and some businesses reduce their hours or take a short break before the high season picks up in December.' },
  ]),

  textBlock('However, and this is important: October and November are still genuinely lovely months to visit Watamu if you get the chance. The rains are unpredictable and short. It is never raining for days at a time. The sun comes out, the beaches clear, and you have a version of Watamu that feels almost entirely to yourself. Prices are lower than December and January. The sea in November, as mentioned above, is particularly calm and clear.'),

  richText([
    { text: 'For travellers who want to experience Watamu authentically without the peak season crowds and prices, ' },
    { text: 'November in particular is an underrated choice.', bold: true },
    { text: ' By mid-November the rains typically ease and the heat starts to build. You catch the tail end of the quiet season and the beginning of something much warmer.' },
  ]),

  placeholder('Watamu in November: quiet beaches and occasional sun showers'),

  // ── Seaweed ──
  textBlock('Seaweed: The Honest Truth', 'h2'),

  textBlock('We are going to be straight with you about seaweed because most travel guides pretend it does not exist. Watamu can get seaweed on the beach. When it arrives in large amounts it covers the sand and changes the character of the beach significantly. A white sand beach with seaweed is a very different place from a white sand beach without it.'),

  richText([
    { text: 'The frustrating reality is that seaweed is genuinely unpredictable. It changes every year. It tends to be more common during and after the rainy periods, and ' },
    { text: 'December through to March tends to have the least seaweed', bold: true },
    { text: ', with August to October also generally cleaner. But we cannot guarantee this. Nobody can. Some years December has seaweed. Some years September is perfectly clean. It changes with the currents and the wind direction.' },
  ]),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '🌿',
    label: 'What to do if your beach has seaweed',
    text: 'The seaweed does not always hit every beach at the same time. If your beach is covered, walk or take a tuk-tuk to another. Turtle Bay, Blue Lagoon and Garoda Beach can have very different conditions on the same day. It is worth exploring. Local beach staff usually know which beach is cleanest on any given day, so ask your hotel.',
  },

  placeholder('Watamu white sand beach, clean conditions'),

  // ── Busiest times ──
  textBlock('When Is Watamu Busiest?', 'h2'),

  richText([
    { text: 'The four busiest months in Watamu are ' },
    { text: 'January, February, July and August.', bold: true },
    { text: ' During these months accommodation fills up, the best villas and hotels book out weeks or months in advance, restaurants are busier and prices are at their highest. If you want to visit in these months, and they are genuinely wonderful months to visit, book early.' },
  ]),

  textBlock('If you prefer fewer crowds and lower prices, the sweet spots are March and April (before the rains get heavy), June and early July as things reopen, September and October, and November before the high season rush. These months are not empty. Watamu is never truly empty during its open season. But they are noticeably quieter and better value.'),

  // ── Month by Month ──
  textBlock('Month by Month: What to Expect', 'h2'),

  {
    _type: 'budgetTableBlock',
    _key: key(),
    columns: ['Month', 'Weather', 'Sea', 'Crowds', 'Notes'],
    rows: [
      { _key: key(), label: 'January', values: ['34°C, dry, sunny', 'Calm and clear', 'Very busy', 'Peak season, book ahead, best for dolphins'] },
      { _key: key(), label: 'February', values: ['34°C, dry, sunny', 'Calm and clear', 'Very busy', 'Peak season, beautiful ocean, great snorkeling'] },
      { _key: key(), label: 'March', values: ['33°C, mostly dry', 'Calm', 'Busy', 'Kaleidoscope Festival, shoulder of peak season'] },
      { _key: key(), label: 'April', values: ['31°C, rains begin', 'Quieter, some swell', 'Very quiet', 'Long rains start, many places close, prices drop'] },
      { _key: key(), label: 'May', values: ['29°C, rains', 'Rough at times', 'Almost empty', 'Deep low season, most businesses closed'] },
      { _key: key(), label: 'June', values: ['27°C, rains easing', 'Mixed', 'Very quiet', 'Reopening from mid June, kite winds arriving'] },
      { _key: key(), label: 'July', values: ['27°C, dry', 'Lively, some chop', 'Busy', 'Kite season peak, humpback whales, great energy'] },
      { _key: key(), label: 'August', values: ['27°C, dry', 'Lively', 'Very busy', 'Busiest kite month, excellent conditions'] },
      { _key: key(), label: 'September', values: ['28°C, dry', 'Lively', 'Moderate', 'Team favourite, kite winds, cooler, less crowded'] },
      { _key: key(), label: 'October', values: ['29°C, light rains', 'Calming', 'Quiet', 'Short rains, quieter but lovely, good value'] },
      { _key: key(), label: 'November', values: ['31°C, short rains', 'Calm and clear', 'Quiet', 'Sea at its calmest, great snorkeling, heating up'] },
      { _key: key(), label: 'December', values: ['33°C, dry', 'Calm', 'Busy', 'High season begins, Christmas very busy, book early'] },
    ],
  },

  // ── Wind Chart ──
  { _type: 'windChartBlock', _key: key() },

  // ── Who Is It For ──
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: 'Which month is right for you?',
    items: [
      { _key: key(), icon: '🤿', text: 'Best snorkeling and diving: November through February for the calmest, clearest water in the marine park' },
      { _key: key(), icon: '🐬', text: 'Dolphin trips and Safari Blue: November through March for the smoothest sea conditions and best visibility' },
      { _key: key(), icon: '🪁', text: 'Kitesurfing: July, August and September for the most consistent Kusi winds at 20 to 30 knots' },
      { _key: key(), icon: '🐋', text: 'Humpback whale watching: July through September as they migrate through Watamu waters' },
      { _key: key(), icon: '💰', text: 'Best value: March, October and November for good conditions with lower prices and fewer crowds' },
      { _key: key(), icon: '🎉', text: 'Busiest and most social: January, February, July and August for the most energy, events and nightlife' },
      { _key: key(), icon: '🌿', text: 'Cleanest beaches: December through March tends to have the least seaweed, though this varies year to year' },
      { _key: key(), icon: '👨‍👩‍👧‍👦', text: 'Families with young children: December through February for calm warm water, sunshine and the full Watamu experience' },
    ],
  },

  // ── CTA ──
  textBlock('Plan Your Visit', 'h2'),

  richText([
    { text: 'Whatever time of year you visit, Watamu rewards you. The water is warm year-round. The people are welcoming in every season. The food is excellent whether it is January or September. The most important thing is simply to go. ' },
    { text: 'Read our complete guide to Watamu', bold: true, link: 'https://www.klickenya.com/journal/complete-guide-watamu-kenya-2026' },
    { text: ' for everything you need to plan your trip, from accommodation and restaurants to transport and activities.' },
  ]),

  richText([
    { text: 'If you are a kiter, our dedicated ' },
    { text: 'kitesurfing in Watamu guide', bold: true, link: 'https://www.klickenya.com/journal/kitesurfing-watamu-guide' },
    { text: ' covers wind conditions, schools and the best spots in detail. To browse and book verified stays, visit ' },
    { text: 'klickenya.com/stays/watamu', bold: true, link: 'https://www.klickenya.com/stays/watamu' },
    { text: '.' },
  ]),

]

// ══════════════════════════════════════════════════════
// Seed
// ══════════════════════════════════════════════════════

async function seed() {
  console.log('Pushing best-time-to-visit-watamu blog post...')

  await client.createOrReplace({
    _id: 'blog-best-time-to-visit-watamu',
    _type: 'blogPost',
    title: 'Best Time to Visit Watamu, Kenya: A Local\'s Complete Season Guide',
    slug: { _type: 'slug', current: 'best-time-to-visit-watamu' },
    status: 'published',
    primaryCategory: 'destination_guide',
    subcategory: 'travel_tips',
    location: 'watamu',
    series: 'Kenya Destination Guides',
    postType: 'guide',
    focusKeyword: 'best time to visit Watamu Kenya',
    seoTitle: 'Best Time to Visit Watamu Kenya: Month by Month Season Guide',
    seoDescription: 'Written by locals who have been to Watamu in every month of the year. The honest guide to Watamu seasons, seaweed, kite winds, dolphin trips and when to avoid.',
    excerpt: 'Hot dry season, kite season, low season and everything in between. The honest, local guide to when to visit Watamu, written by people who have been there in every single month of the year.',
    readingTime: 9,
    publishedAt: '2026-04-07T09:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Watamu', 'Travel Tips', 'Seasons', 'Kenya', 'Beach'],
    body,
  })

  console.log('Done. Blog post pushed to Sanity.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
