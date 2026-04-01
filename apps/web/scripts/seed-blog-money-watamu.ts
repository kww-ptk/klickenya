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

function linkTextBlock(beforeText: string, linkText: string, href: string, afterText: string): any {
  const markKey = key()
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [{ _type: 'link', _key: markKey, href }],
    children: [
      { _type: 'span', _key: key(), text: beforeText, marks: [] },
      { _type: 'span', _key: key(), text: linkText, marks: [markKey] },
      { _type: 'span', _key: key(), text: afterText, marks: [] },
    ],
  }
}

// ══════════════════════════════════════════════════════
// Money, ATMs & Currency Exchange in Watamu 2026
// ══════════════════════════════════════════════════════

const body = [
  // ── 1. Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: `✦ Money in Watamu at a glance`,
    accentColor: 'amber',
    items: [
      { icon: '💰', label: 'Currency', value: `Kenya Shilling (KSh)` },
      { icon: '🏧', label: 'ATMs', value: `3 in Watamu town` },
      { icon: '📱', label: 'M-Pesa', value: `Accepted everywhere, the best payment option` },
      { icon: '💳', label: 'Cards', value: `Some hotels and restaurants, often with charges` },
      { icon: '🏦', label: 'Exchange', value: `USD and EUR accepted at banks` },
      { icon: '💵', label: 'USD rate', value: `~KSh 129 (fluctuates)` },
    ],
  },

  // ── 2. Stats Row ──
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { _key: key(), number: '3', label: `ATMs in Watamu town` },
      { _key: key(), number: '~129', label: `KSh per USD (2026)` },
      { _key: key(), number: '24/7', label: `M-Pesa availability` },
    ],
  },

  // ── 3. The Money Situation ──
  textBlock(`The Money Situation in Watamu: What You Need to Know`, 'h2'),

  textBlock(
    `Understanding money exchange, ATMs, and how to pay for things in Watamu, Kenya is one of the most practical things you can sort out before your trip. Watamu is a small beach village on the north coast, not a city, not a resort complex. It has the essentials, but the infrastructure is more limited compared to Mombasa or Nairobi.`
  ),

  textBlock(
    `There are three ATMs in town. Most local shops, restaurants, and services operate on a cash only basis, so you need Kenya Shillings in your pocket. The bigger hotels and upmarket restaurants accept Visa and Mastercard, but that covers maybe 20% of the places you will actually spend money. Card payments are getting more common but often come with extra charges, sometimes conversion fees and occasionally minimum spend requirements.`
  ),

  textBlock(
    `The norm for paying in establishments is KSh. USD and EUR are accepted in banks for exchange, but you will not generally be paying in foreign currency at restaurants or shops.`
  ),

  textBlock(
    `The real game changer is M-Pesa, Kenya's mobile money system. It is accepted everywhere, from tuk tuk drivers to beach bars to the local grocery shop. M-Pesa is by far the best payment option in Watamu. If you set it up on arrival (more on that below), you will rarely be stuck without a way to pay.`
  ),

  textBlock(
    `The bottom line: come prepared. Bring some USD or EUR to exchange at a bank, withdraw cash early, and get M-Pesa set up. Do not assume you can just tap your card everywhere like you would in Europe.`
  ),

  // ── 4. ATMs in Watamu ──
  textBlock(`ATMs in Watamu: Where to Find Them`, 'h2'),

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
    `I&M Bank ATM is the third option. It is less consistent, sometimes offline, but it works as a backup.`
  ),

  textBlock(
    `All three ATMs accept international Visa and Mastercard. The typical withdrawal limit is KSh 40,000 per transaction, and your bank will charge a foreign transaction fee of roughly KSh 350 to 500 per withdrawal on top of whatever your home bank charges. Plan your withdrawals to minimize fees: take out larger amounts less frequently rather than small amounts every day.`
  ),

  textBlock(
    `If you are flying into Mombasa, consider withdrawing cash at the airport where there are more ATMs. The same goes for Malindi, which is only 20 minutes from Watamu and has a wider selection of banks and ATMs.`
  ),

  // ── 5. Currency Exchange ──
  textBlock(`Currency Exchange in Watamu`, 'h2'),

  textBlock(
    `If you need to exchange foreign currency, USD and EUR are accepted at banks for exchange. GBP can also be exchanged but is less commonly held. You have a few options in Watamu, but the rates and convenience vary significantly.`
  ),

  textBlock(
    `Banks offer the best exchange rates, but their hours are limited. Most branches operate Monday to Friday, 9am to 3pm, and are closed on weekends. If you arrive on a Saturday, you are out of luck until Monday.`
  ),

  textBlock(
    `Forex bureaus in Watamu town offer decent rates, but they vary between operators. Always check at least two before committing, and count your money carefully before leaving.`
  ),

  textBlock(
    `Hotels will exchange money for you, but at terrible rates. Expect a 10 to 15% markup compared to the bank rate. Only use this as a last resort.`
  ),

  textBlock(
    `Ascot Casino in Watamu also exchanges currency. Bring your passport as they require ID for the transaction.`
  ),

  textBlock(
    `Street changers exist along the beach road and in the market area. Avoid them completely. Common tricks include short changing with sleight of hand, passing counterfeit notes, and quoting attractive rates that include hidden commissions you only discover after the swap. There is no upside to street exchange, only risk.`
  ),

  textBlock(
    `The best strategy for most visitors: exchange a small amount of USD or EUR at a bank when you arrive, then rely on ATM withdrawals and M-Pesa for the rest of your trip.`
  ),

  // ── Exchange Options Comparison ──
  {
    _type: 'budgetTableBlock',
    _key: key(),
    columns: ['Method', 'Rate quality', 'Hours', 'Hassle'],
    rows: [
      { _key: key(), label: 'Bank', values: ['Best', 'Mon to Fri 9am to 3pm', 'Low'] },
      { _key: key(), label: 'Forex bureau', values: ['Good', 'Mon to Sat daytime', 'Low to Medium'] },
      { _key: key(), label: 'Hotel', values: ['Poor (10 to 15% markup)', 'Anytime', 'Very low'] },
      { _key: key(), label: 'Airport', values: ['Good', 'Flight arrivals', 'Low'] },
      { _key: key(), label: 'Casino', values: ['Decent', 'Evenings', 'Medium'] },
    ],
    totalRow: [],
  },

  // ── USD Tip ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💡',
    label: `Bring clean, new USD bills`,
    text: `The single best tip: bring USD in clean, post 2013 notes. Kenya is strict about older or damaged US dollar bills. Notes with small tears, pen marks, or pre 2013 serial numbers will be refused everywhere, banks, forex bureaus, and hotels alike.`,
  },

  // ── M-Pesa Section ──
  textBlock(`M-Pesa: The Best Way to Pay in Watamu`, 'h2'),

  textBlock(
    `M-Pesa is Kenya's mobile money system, and it has fundamentally changed how people pay for things in this country. It is accepted everywhere. It is genuinely the best choice for paying in Watamu, and once you have set up your account connected to a Kenyan SIM card, you can directly load money from your bank onto it using apps like Remitly or Revolut.`
  ),

  textBlock(`How to set up M-Pesa:`, 'h3'),

  textBlock(
    `First, buy a Safaricom SIM card. You can get one at the Safaricom shop in Watamu Mall or at Blue Moon Mall, so you do not only have to set it up at the airport. You will need your passport for registration. Ask the agent to activate M-Pesa on the line.`
  ),

  textBlock(`How to pay with M-Pesa:`, 'h3'),

  textBlock(
    `There are three main options when paying with M-Pesa. The first is "Send Money," which you use to send money directly to someone's phone number. This is how you pay tuk tuk and motorbike (boda boda) drivers. The second is "Lipa na M-Pesa" which has two branches: Paybill and Till Number. Most restaurants and shops will display their Paybill or Till number at the counter. If you are confused, just ask. People are almost always happy to show you how to do it. A great and useful app is the M-Pesa app which you can download and it makes everything easier.`
  ),

  textBlock(`Getting money onto your M-Pesa:`, 'h3'),

  textBlock(
    `There are two ways to load money onto your M-Pesa account. You can either deposit cash at any Safaricom agent (the green kiosks are on practically every corner), or you can use the Remitly app or Revolut if you have a Revolut account to send directly to your M-Pesa account from your bank.`
  ),

  textBlock(`Buying airtime and data:`, 'h3'),

  textBlock(
    `You can also use M-Pesa to buy airtime for your phone number and to buy data bundles. Dialling *144# shows your airtime balance. Dialling *544# allows you to buy megabytes with options to buy using airtime or M-Pesa. Locals will often be happy to help if you need advice, or you can ask in the Safaricom shop.`
  ),

  textBlock(
    `Because M-Pesa is used so widely, many Kenyans do not carry cash anymore. This means it is quite rare that tuk tuk and motorbike drivers have change for larger notes like KSh 1,000. Keep this in mind and try to always have small money on you.`
  ),

  // ── M-Pesa Tip ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '📱',
    label: `M-Pesa is your best friend in Watamu`,
    text: `Get a Safaricom SIM card (available at Watamu Mall or Blue Moon Mall, not just the airport), register with your passport, and load KSh 5,000 to 10,000 on M-Pesa immediately. You will use it more than cash. Download the M-Pesa app to make payments even easier.`,
  },

  // ── If It Sounds Complicated ──
  textBlock(
    `If all of this sounds too complicated, just stick to cash. That is the simplest way and it is cheaper than paying with card. But again, be mindful that many people do not have change, so carry smaller notes. A good tip is to go to a petrol station and kindly ask if you can exchange larger notes (within reason, maybe maximum of about KSh 3,000) and they will give it to you in small notes back, for example hundreds, two hundreds, and five hundreds. Petrol stations always have plenty of small change.`
  ),

  // ── Using Cards ──
  textBlock(`Using Cards in Watamu`, 'h2'),

  textBlock(
    `Visa and Mastercard are accepted at most upmarket hotels, larger restaurants, and dive centres in Watamu. Card payments are getting more common, but they often come with charges. Expect conversion rate fees, sometimes extra surcharges, and occasionally minimum spend requirements.`
  ),

  textBlock(
    `American Express is accepted almost nowhere in Watamu. Leave it at home.`
  ),

  textBlock(
    `Even at places that accept cards, always carry cash as a backup. Card machines rely on mobile data connections, and they go offline more often than you might expect. If the network is down, you are paying in cash whether you planned to or not.`
  ),

  textBlock(
    `Some restaurants and shops add a 2 to 3% surcharge for card payments to cover their processing fees. This is common and generally non negotiable. Contactless and NFC payments (Apple Pay, Google Pay) are growing in Kenya but are not yet universal in Watamu.`
  ),

  // ── How Much Cash ──
  textBlock(`How Much Cash to Carry`, 'h2'),

  textBlock(
    `How much you need per day depends on your travel style, but here are realistic ranges for Watamu in 2026.`
  ),

  textBlock(
    `Budget travellers staying in guesthouses and eating at local spots should plan for KSh 3,000 to 5,000 per day. This covers basic accommodation, meals at local restaurants, tuk tuk rides, and a drink or two.`
  ),

  textBlock(
    `Mid range visitors at decent hotels and eating at the Italian or seafood restaurants will spend KSh 8,000 to 15,000 per day. This gives you a comfortable experience with some activities included.`
  ),

  textBlock(
    `Luxury travellers at boutique hotels and upmarket dining can expect KSh 20,000 or more per day, especially if you are adding water sports, diving, or private excursions.`
  ),

  textBlock(
    `Whatever your budget, always keep small denomination notes on you. KSh 50, 100, and 200 notes are essential for tuk tuks, tips, and small purchases. Drivers and small vendors often cannot break a KSh 1,000 note. Remember the petrol station tip for getting smaller notes.`
  ),

  textBlock(
    `For tipping, KSh 200 to 500 is standard at restaurants for good service. For porters, housekeeping, and other service staff, KSh 100 to 200 is appreciated. Tipping is not mandatory in Kenya, but it is appreciated and makes a real difference to local workers.`
  ),

  // ── Safety Tips ──
  textBlock(`Safety Tips for Money in Watamu`, 'h2'),

  textBlock(
    `Watamu is generally a safe town, but basic money safety habits go a long way. Use ATMs during daylight hours and in visible locations. All three Watamu ATMs are on or near the main road, so this is straightforward.`
  ),

  textBlock(
    `Do not flash large amounts of cash in public. This applies everywhere in the world, but especially in a beach town where tourists are an obvious target for opportunistic theft.`
  ),

  textBlock(
    `Hotel safes are generally reliable in Watamu. Use them. Keep the bulk of your cash and your backup card in the safe, and carry only what you need for the day.`
  ),

  textBlock(
    `Split your money across locations. Some cash in your wallet, some in your hotel safe, and maybe a small emergency stash in your luggage. If you lose your wallet, you are not stranded.`
  ),

  // ── Scam Warning ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '🚫',
    label: `Avoid street money changers`,
    text: `Never exchange money with people on the street or beach. Common scams include short changing with sleight of hand, offering fake notes, or quoting rates that sound good but include hidden commissions. Always use banks, licensed forex bureaus, or ATMs.`,
  },

  // ── Verdict Card ──
  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'amber',
    label: `The bottom line`,
    title: `Money in Watamu: Our Honest Summary`,
    pros: [
      `M-Pesa works everywhere and is the best payment option`,
      `ATMs accept international cards`,
      `Costs are very reasonable compared to tourist hotspots`,
      `Setting up M-Pesa is straightforward with a Safaricom SIM`,
      `Remitly and Revolut make loading M-Pesa from your bank easy`,
    ],
    cons: [
      `Card acceptance is limited outside hotels and often has charges`,
      `Exchange rates in town are not great outside of banks`,
      `Small change can be hard to get (use the petrol station tip)`,
      `Banks have limited hours for currency exchange`,
    ],
  },

  // ── Explore Watamu ──
  linkTextBlock(
    `Planning your trip to Watamu? Check our `,
    `curated stays in Watamu`,
    `/stays/watamu`,
    ` for accommodation options near the beach.`
  ),
]

// ══════════════════════════════════════════════════════
// Seed
// ══════════════════════════════════════════════════════

async function main() {
  await client.createOrReplace({
    _id: 'blog-money-exchange-atm-watamu-guide',
    _type: 'blogPost',
    title: `Money, ATMs & Currency Exchange in Watamu 2026: The Practical Guide`,
    slug: { _type: 'slug', current: 'money-exchange-atm-watamu-guide' },
    status: 'published',
    primaryCategory: 'travel_tips',
    subcategory: 'money_banking',
    location: 'watamu',
    series: `Watamu Complete Guide`,
    postType: 'guide',
    focusKeyword: `money exchange ATM watamu kenya`,
    seoTitle: `Money & ATMs in Watamu 2026: M-Pesa, Exchange & Tips`,
    seoDescription: `Where to exchange money in Watamu, which ATMs work, how to set up M-Pesa, and the best way to pay. Updated for 2026.`,
    excerpt: `Watamu is a small beach town, not a city. ATMs exist, M-Pesa is everywhere and is the best payment option. Here is everything you need to know about managing your money in Watamu, including a full guide to setting up and using M-Pesa.`,
    readingTime: 9,
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
      'safaricom',
      'remitly',
    ],
    body,
  })

  console.log(`✅ Money exchange guide seeded`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
