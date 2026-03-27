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

// ══════════════════════════════════════════════════════
// Money, ATMs & Currency Exchange in Watamu 2026
// ══════════════════════════════════════════════════════

const body = [
  // ── 1. Quick Facts ──────────────────────────────────
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: `✦ Money in Watamu at a glance`,
    accentColor: 'amber',
    items: [
      { icon: '💰', label: 'Currency', value: `Kenya Shilling (KSh)` },
      { icon: '🏧', label: 'ATMs', value: `3 in Watamu town` },
      { icon: '📱', label: 'M-Pesa', value: `Accepted almost everywhere` },
      { icon: '💳', label: 'Cards', value: `Major hotels and restaurants accept cards` },
      { icon: '🏦', label: 'Best exchange', value: `Banks in Malindi (20 min away)` },
      { icon: '💵', label: 'USD rate', value: `~KSh 129 (fluctuates)` },
    ],
  },

  // ── 2. Stats Row ────────────────────────────────────
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { _key: key(), number: '3', label: `ATMs in Watamu town` },
      { _key: key(), number: '~129', label: `KSh per USD (2026)` },
      { _key: key(), number: '24/7', label: `M-Pesa availability` },
    ],
  },

  // ── 3. The Money Situation ──────────────────────────
  textBlock(`The Money Situation in Watamu — What You Need to Know`, 'h2'),

  textBlock(
    `Understanding money exchange, ATMs, and how to pay for things in Watamu Kenya is one of the most practical things you can sort out before your trip. Watamu is a small beach village on the north coast — not a city, not a resort complex. It has the essentials, but the infrastructure is limited compared to Mombasa or Nairobi.`
  ),

  textBlock(
    `There are three ATMs in town, but they can and do run out of cash on busy weekends and during peak holiday seasons. Most local shops, restaurants, and services operate on a cash-only basis — so you need Kenya Shillings in your pocket. The bigger hotels and upmarket restaurants accept Visa and Mastercard, but that covers maybe 20% of the places you will actually spend money.`
  ),

  textBlock(
    `The real game changer is M-Pesa, Kenya's mobile money system. It is accepted almost everywhere — from tuk-tuk drivers to beach bars to the local grocery shop. If you set up M-Pesa on arrival (more on that below), you will rarely be stuck without a way to pay.`
  ),

  textBlock(
    `The bottom line: come prepared. Bring some USD or EUR to exchange, withdraw cash early, and get M-Pesa set up at the airport. Do not assume you can just tap your card everywhere like you would in Europe.`
  ),

  // ── 4. ATMs in Watamu ───────────────────────────────
  textBlock(`ATMs in Watamu — Where to Find Them`, 'h2'),

  textBlock(
    `There are three ATMs in Watamu as of 2026, all located along or near the main road. Here is what you need to know about each one.`
  ),

  textBlock(
    `KCB Bank ATM sits on the main road and is the most reliable option. It accepts both Visa and Mastercard international cards and generally has cash available. This is your first choice.`
  ),

  textBlock(
    `Equity Bank ATM is near the market area. It works well and also accepts international cards. If the KCB machine is down or has a queue, head here.`
  ),

  textBlock(
    `I&M Bank ATM is the third option. It is less consistent — sometimes offline, sometimes out of cash — but it works as a backup.`
  ),

  textBlock(
    `All three ATMs accept international Visa and Mastercard. The typical withdrawal limit is KSh 40,000 per transaction, and your bank will charge a foreign transaction fee of roughly KSh 350–500 per withdrawal on top of whatever your home bank charges. Plan your withdrawals to minimize fees — take out larger amounts less frequently rather than small amounts every day.`
  ),

  textBlock(
    `If you are flying into Mombasa, consider withdrawing cash at the airport where there are more ATMs and less risk of machines running dry. The same goes for Malindi — it is only 20 minutes from Watamu and has a wider selection of banks and ATMs.`
  ),

  // ── 5. ATM Warning ──────────────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: `ATM cash shortages`,
    text: `ATMs in Watamu can run out of cash on weekends and holidays, especially during peak season (Dec–Jan, Jul–Aug). Always withdraw enough for 2–3 days and never rely on a single ATM. If all Watamu ATMs are dry, Malindi is 20 minutes by tuk-tuk.`,
  },

  // ── 6. Currency Exchange ────────────────────────────
  textBlock(`Currency Exchange in Watamu`, 'h2'),

  textBlock(
    `If you need to exchange foreign currency — USD, EUR, or GBP — you have a few options in Watamu, but the rates and convenience vary significantly.`
  ),

  textBlock(
    `Banks offer the best exchange rates, but their hours are limited. Most branches operate Monday to Friday, 9am to 3pm, and are closed on weekends. If you arrive on a Saturday, you are out of luck until Monday.`
  ),

  textBlock(
    `Forex bureaus in Watamu town offer decent rates, but they vary between operators. Always check at least two before committing, and count your money carefully before leaving.`
  ),

  textBlock(
    `Hotels will exchange money for you, but at terrible rates — expect a 10–15% markup compared to the bank rate. Only use this as a last resort.`
  ),

  textBlock(
    `Ascot Casino in Watamu also exchanges currency. Bring your passport as they require ID for the transaction.`
  ),

  textBlock(
    `Street changers exist along the beach road and in the market area. Avoid them completely. Common tricks include short-changing with sleight of hand, passing counterfeit notes, and quoting attractive rates that include hidden commissions you only discover after the swap. There is no upside to street exchange — only risk.`
  ),

  textBlock(
    `The best strategy for most visitors: exchange a small amount of USD or EUR at Mombasa or Malindi airport when you arrive, then rely on ATM withdrawals and M-Pesa for the rest of your trip.`
  ),

  // ── 7. Exchange Options Comparison ──────────────────
  {
    _type: 'budgetTableBlock',
    _key: key(),
    columns: ['Method', 'Rate quality', 'Hours', 'Hassle'],
    rows: [
      { _key: key(), label: 'Bank', values: ['Best', 'Mon–Fri 9am–3pm', 'Low'] },
      { _key: key(), label: 'Forex bureau', values: ['Good', 'Mon–Sat daytime', 'Low–Medium'] },
      { _key: key(), label: 'Hotel', values: ['Poor (10–15% markup)', 'Anytime', 'Very low'] },
      { _key: key(), label: 'Airport', values: ['Good', 'Flight arrivals', 'Low'] },
      { _key: key(), label: 'Casino', values: ['Decent', 'Evenings', 'Medium'] },
    ],
    totalRow: [],
  },

  // ── 8. USD Tip ──────────────────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💡',
    label: `Bring clean, new USD bills`,
    text: `The single best tip: bring USD in clean, post-2013 notes. Kenya is strict about older or damaged US dollar bills. Notes with small tears, pen marks, or pre-2013 serial numbers will be refused everywhere — banks, forex bureaus, and hotels alike.`,
  },

  // ── 9. M-Pesa ───────────────────────────────────────
  textBlock(`M-Pesa — The Game Changer`, 'h2'),

  textBlock(
    `M-Pesa is Kenya's mobile money system, and it has fundamentally changed how people pay for things in this country. It works on any phone — you do not need a smartphone. A basic feature phone with a SIM card is enough.`
  ),

  textBlock(
    `As a tourist, here is how to get started: buy a Safaricom SIM card at Mombasa airport (you will need your passport for registration). Ask the agent to activate M-Pesa on the line and load some money onto it right there. KSh 5,000–10,000 is a good starting amount.`
  ),

  textBlock(
    `Once set up, you can pay at most shops, restaurants, and even tuk-tuk drivers using M-Pesa. Look for the green Safaricom signs or ask "Do you take M-Pesa?" — the answer is almost always yes. Restaurants will have Paybill or Till numbers displayed at the counter, and paying is as simple as entering the number and amount on your phone.`
  ),

  textBlock(
    `You can reload M-Pesa at any agent — look for the green Safaricom kiosks, which are on practically every corner in Watamu. You can also send money to other M-Pesa users, pay utility bills, and even receive money from Kenyan friends or business contacts.`
  ),

  textBlock(
    `Some places even give small discounts for M-Pesa payments because it saves them the hassle of handling cash and making change. It is genuinely the most convenient way to pay in Watamu.`
  ),

  // ── 10. M-Pesa Tip ─────────────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '📱',
    label: `Set up M-Pesa at the airport`,
    text: `Get a Safaricom SIM card at Mombasa airport (bring your passport). Load KSh 5,000–10,000 on M-Pesa immediately. You will use it more than cash. Most tuk-tuk drivers, small shops, and beach vendors prefer M-Pesa over cash.`,
  },

  // ── 11. Using Cards ─────────────────────────────────
  textBlock(`Using Cards in Watamu`, 'h2'),

  textBlock(
    `Visa and Mastercard are accepted at most upmarket hotels, larger restaurants, and dive centres in Watamu. If the establishment caters to international tourists and has air conditioning, there is a reasonable chance they take cards.`
  ),

  textBlock(
    `American Express is accepted almost nowhere in Watamu. Leave it at home — it will not help you here.`
  ),

  textBlock(
    `Even at places that accept cards, always carry cash as a backup. Card machines rely on mobile data connections, and they go offline more often than you might expect. If the WiFi is down or there is a network issue, you are paying in cash whether you planned to or not.`
  ),

  textBlock(
    `Some restaurants and shops add a 2–3% surcharge for card payments to cover their processing fees. This is common and generally non-negotiable. Contactless and NFC payments (Apple Pay, Google Pay) are growing in Kenya but are not yet universal in Watamu — do not count on tap-to-pay.`
  ),

  // ── 12. How Much Cash ───────────────────────────────
  textBlock(`How Much Cash to Carry`, 'h2'),

  textBlock(
    `How much you need per day depends on your travel style, but here are realistic ranges for Watamu in 2026.`
  ),

  textBlock(
    `Budget travellers staying in guesthouses and eating at local spots should plan for KSh 3,000–5,000 per day. This covers basic accommodation, meals at local restaurants, tuk-tuk rides, and a drink or two.`
  ),

  textBlock(
    `Mid-range visitors at decent hotels and eating at the Italian or seafood restaurants will spend KSh 8,000–15,000 per day. This gives you a comfortable experience with some activities included.`
  ),

  textBlock(
    `Luxury travellers at boutique hotels and upmarket dining can expect KSh 20,000 or more per day, especially if you are adding water sports, diving, or private excursions.`
  ),

  textBlock(
    `Whatever your budget, always keep small denomination notes on you — KSh 50, 100, and 200 notes are essential for tuk-tuks, tips, and small purchases. Drivers and small vendors often cannot break a KSh 1,000 note.`
  ),

  textBlock(
    `For tipping, KSh 200–500 is standard at restaurants for good service. For porters, housekeeping, and other service staff, KSh 100–200 is appreciated. Tipping is not mandatory in Kenya, but it is appreciated and makes a real difference to local workers.`
  ),

  // ── 13. Safety Tips ─────────────────────────────────
  textBlock(`Safety Tips for Money in Watamu`, 'h2'),

  textBlock(
    `Watamu is generally a safe town, but basic money safety habits go a long way. Use ATMs during daylight hours and in visible locations — all three Watamu ATMs are on or near the main road, so this is straightforward.`
  ),

  textBlock(
    `Do not flash large amounts of cash in public. This applies everywhere in the world, but especially in a beach town where tourists are an obvious target for opportunistic theft.`
  ),

  textBlock(
    `Hotel safes are generally reliable in Watamu. Use them. Keep the bulk of your cash and your backup card in the safe, and carry only what you need for the day in your wallet or money belt.`
  ),

  textBlock(
    `Split your money across locations — some cash in your wallet, some in your hotel safe, and maybe a small emergency stash in your luggage. If you lose your wallet, you are not stranded.`
  ),

  textBlock(
    `If your card is lost or stolen, report it to your bank immediately. The nearest police station is in Watamu town centre, and you will need a police report for insurance claims. Keep a photo of your passport, bank card numbers, and your bank's emergency phone number saved in your phone — it saves a huge amount of stress if something goes wrong.`
  ),

  // ── 14. Scam Warning ────────────────────────────────
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '🚫',
    label: `Avoid street money changers`,
    text: `Never exchange money with people on the street or beach. Common scams include short-changing with sleight of hand, offering fake notes, or quoting rates that sound good but include hidden commissions. Always use banks, licensed forex bureaus, or ATMs.`,
  },

  // ── 15. Verdict Card ────────────────────────────────
  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'amber',
    label: `The bottom line`,
    title: `Money in Watamu — Our Honest Summary`,
    pros: [
      `M-Pesa works everywhere and is easy to set up`,
      `ATMs accept international cards`,
      `Costs are very reasonable compared to tourist hotspots`,
      `USD widely accepted at hotels in emergencies`,
    ],
    cons: [
      `ATMs can run dry on weekends`,
      `Card acceptance is limited outside hotels`,
      `Exchange rates in town are not great`,
      `Small change can be hard to get`,
    ],
  },
]

// ══════════════════════════════════════════════════════
// Seed
// ══════════════════════════════════════════════════════

async function main() {
  await client.createOrReplace({
    _id: 'blog-money-exchange-atm-watamu-guide',
    _type: 'post',
    title: `Money, ATMs & Currency Exchange in Watamu 2026 — The Practical Guide`,
    slug: { _type: 'slug', current: 'money-exchange-atm-watamu-guide' },
    status: 'published',
    primaryCategory: 'travel_tips',
    subcategory: 'money_banking',
    location: 'watamu',
    series: `Watamu Complete Guide`,
    postType: 'guide',
    focusKeyword: `money exchange ATM watamu kenya`,
    seoTitle: `Money & ATMs in Watamu 2026 — Exchange, M-Pesa & Tips`,
    seoDescription: `Where to exchange money in Watamu, which ATMs work, M-Pesa tips, and how to avoid getting ripped off. Updated for 2026.`,
    excerpt: `Watamu is a small beach town — not a city. ATMs exist but can run dry. Exchange rates vary wildly. M-Pesa is everywhere. Here is everything you need to know about managing your money in Watamu.`,
    readingTime: 8,
    publishedAt: '2026-03-27T08:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Travel Tips', 'Watamu', 'Money'],
    keywords: [
      'money',
      'atm',
      'currency exchange',
      'watamu',
      'mpesa',
      'forex',
      'kenya shilling',
    ],
    body,
  })

  console.log(`✅ Money exchange guide seeded`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
