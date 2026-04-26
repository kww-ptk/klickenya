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

function tb(text: string, style = 'normal'): any {
  return {
    _type: 'block',
    _key: key(),
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }
}

function rt(children: Array<{ text: string; bold?: boolean; link?: string }>): any {
  const markDefs: any[] = []
  const spans = children.map((c) => {
    const marks: string[] = []
    if (c.bold) marks.push('strong')
    if (c.link) {
      const k = key()
      markDefs.push({ _type: 'link', _key: k, href: c.link, blank: false })
      marks.push(k)
    }
    return { _type: 'span', _key: key(), text: c.text, marks }
  })
  return { _type: 'block', _key: key(), style: 'normal', markDefs, children: spans }
}

function img(caption = ''): any {
  return {
    _type: 'photoRowBlock',
    _key: key(),
    layout: 'hero-full',
    photos: [{ alt: caption || 'Kilifi', aspectRatio: 'wide' }],
    caption,
  }
}

function tip(text: string, label: string, variant = 'tip'): any {
  return { _type: 'tipCardBlock', _key: key(), variant, icon: '💡', label, text }
}

const body: any[] = [

  // ── QUICK FACTS ──────────────────────────────────────
  {
    _type: 'quickFactsBlock', _key: key(),
    title: '✦ Kilifi at a glance',
    accentColor: 'teal',
    items: [
      { icon: '📍', label: 'Location', value: '55 km north of Mombasa, Kenya Coast' },
      { icon: '🌡️', label: 'Climate', value: '26 to 34°C year-round, warm and tropical' },
      { icon: '💰', label: 'Budget range', value: 'KSh 2,000 to 25,000 per night' },
      { icon: '🕐', label: 'From Mombasa', value: '1.5 hrs north via Kilifi Bridge' },
      { icon: '🌊', label: 'Star features', value: 'Kilifi Creek and Bofa Beach' },
      { icon: '👥', label: 'Known for', value: 'Creative community, wellness, international school, kitesurfing' },
    ],
  },

  {
    _type: 'statRowBlock', _key: key(),
    stats: [
      { _key: key(), number: '55 km', label: 'north of Mombasa' },
      { _key: key(), number: '45 min', label: 'south of Watamu' },
      { _key: key(), number: '3 hrs', label: 'from Diani Beach' },
    ],
  },

  // ── INTRODUCTION ─────────────────────────────────────
  tb('Why People Love Kilifi', 'h2'),

  tb('This guide is written by people who have lived in Kilifi and still have roots here. Everything you are about to read is personal, up to date and accurate. This is everything you need to know about Kilifi in one place, real tips from people who know it well.'),

  tb('If Watamu is the beach holiday, Kilifi is the life decision.'),

  tb('Kilifi is what happens when you take the natural beauty of the Kenyan coast and add a community of artists, wellness practitioners, musicians, and people who came for a week and simply never left. Unlike Watamu to the north or Diani to the south, Kilifi has not been shaped by mass tourism. It has been shaped by the people who chose to live here.'),

  tb('The town sits on the banks of Kilifi Creek, a vast tidal inlet that stretches inland like a lake. The creek is the soul of the place: calm, sheltered, impossibly beautiful. Around it, a community of Kenyan families, creative expats, yoga teachers, and small-business owners have built something genuinely special. There is even a recording studio in the baobab trees. Baobab Studio attracts international artists who come to lay down tracks in one of the most extraordinary natural settings on the continent. There are weekly community yoga sessions, great parties with a wonderful music scene, friendly people and a genuine wellness focus woven into daily life.'),

  tb('Kilifi is the capital of Kilifi County with government offices and the infrastructure of a real functioning town. It is a hidden gem that will surprise you. It is peaceful in general and more of a place where people are living life and building businesses rather than a destination that relies entirely on tourism. Less touristy than Diani or Watamu, it has a beautiful and subtle energy that is genuinely special and should be experienced, especially if you have a little more time to spend or want a quieter, more authentic holiday on the Kenyan coast.'),

  tb('It is also a great place to holiday with plenty of activities and is very family and children friendly. The vibe is laid back and relaxed, and sometimes it takes a little time to discover all the things that are happening because events are often organised through word of mouth and community groups. Dhow rides on Kilifi Creek are special, and Bofa Beach is stunning and often quiet, with many mornings where you will have the whole beach to yourself on an early morning walk.'),

  tb('It does get busy though! Around New Year, the Kilifi New Year Festival brings in huge numbers of visitors, incredible parties and some of the best music on the East African coast. There is also the Kilifi Wellness Festival, which happens twice a year. Although Kilifi is peaceful day to day, it also has some great parties and an awesome music scene that will genuinely surprise you if you catch it at the right moment.'),

  tb('There are fewer restaurant and cafe options than Watamu or Diani, but they are slowly increasing and the ones that exist are lovely. Around Christmas and New Year, Kilifi transforms completely. Your experience here will heavily depend on the time of year you visit. Some periods are much quieter and more private, others are buzzing and social. Kilifi has fewer hotel options than other coastal towns but some stunning rental property options that represent exceptional value.'),

  img('Add a photo of Kilifi Creek here'),

  // ── HOW TO GET TO KILIFI ─────────────────────────────
  tb('How to Get to Kilifi', 'h2'),

  tb('By air', 'h3'),
  tb('Fly from Nairobi with Safarilink, Kenya Airways or Jambojet to one of three airports: Mombasa (Moi International), Malindi or Vipingo. From Mombasa the drive to Kilifi takes 1.5 to 2 hours and a taxi costs around KSh 6,000 to 8,000. From Malindi it is 1 hour and a similar price. From Vipingo it is just 30 minutes and around KSh 3,000, making it the closest and most convenient option when available.'),

  tip('Uber operates in Mombasa and you can use it to reach Kilifi from the airport, which makes the journey simple and avoids price negotiations. However there is no Uber in Kilifi or Watamu, so for your return journey to the airport you will need to arrange a taxi in advance. Your accommodation can usually help with this.', 'Uber tip for Mombasa arrivals'),

  tb('By train from Nairobi', 'h3'),
  tb('The SGR train from Nairobi to Mombasa is comfortable and popular. There are two services: the express and the intercounty, which stops at various stations along the route including Voi. Tickets cost KSh 1,000 to 4,500 depending on class, and in practice the difference between first class and economy is minimal so economy is good value. There is no luggage limit, which is a real plus. Arrive at the terminus well in advance as there are multiple security checks, especially at Nairobi Terminus. From Mombasa arrange a taxi north to Kilifi for the final leg. The intercounty service is particularly useful if you are combining Tsavo safari with a coast trip: board at Voi and arrive in Mombasa, then drive to Kilifi.'),

  tb('By road from Nairobi', 'h3'),
  tb('Driving from Nairobi to Kilifi takes 8 to 9 hours. Many people turn this into a road trip, stopping for safari at Amboseli or Tsavo along the way. Car rental in Kenya is possible but takes more organising than in other countries. Use only trusted and reviewed companies. Be careful on Kenyan roads as traffic rules are not consistently applied. Our team is working to partner with reliable car rental providers and very soon you will be able to book directly through this website. Trusted taxi transfers will also be bookable through the same feature.'),

  tb('By matatu or public bus', 'h3'),
  tb('Matatus are local public minibuses that run regularly between Mombasa and Kilifi and are the cheapest option. Taking a matatu is definitely the most adventurous choice as a first-time visitor but can be a memorable experience. Take care of your belongings. Almost everyone in Kenya speaks English so if you are confused just ask someone nearby. Public buses from Nairobi operate through companies such as Mash, Tahmeed and Coast Bus and are booked directly at the station. These are not recommended for tourists due to road safety concerns, particularly at night.'),

  {
    _type: 'distanceChipsBlock', _key: key(),
    chips: [
      { icon: 'clock', text: '45 min from Watamu' },
      { icon: 'clock', text: '1 hr from Malindi' },
      { icon: 'clock', text: '30 min from Vipingo Airport' },
      { icon: 'clock', text: '1.5 to 2 hrs from Mombasa' },
      { icon: 'clock', text: '3 hrs from Diani' },
    ],
  },

  tip('Always agree the price with any taxi, boda boda or matatu driver before you get in, not after. And always ask your accommodation to help arrange transfers if you can. They often have trusted drivers they work with regularly.', 'Two essential travel tips'),

  img('Add a photo of Kilifi Bridge or the road to Kilifi here'),

  // ── BEST TIME TO VISIT ───────────────────────────────
  tb('Best Time to Visit Kilifi', 'h2'),

  tb('Your experience in Kilifi is shaped both by the climate and by the tourist calendar. Some periods are very quiet and private, others are lively and social. Knowing the difference will help you choose the right time for what you want.'),

  tb('The seasons', 'h3'),
  tb('April, May and June are the long rains. October and November bring shorter, less reliable rains. Outside those windows it is hot and dry. November through March is very hot and dry, with midday temperatures reaching 34 to 35 degrees Celsius. July through October is a little cooler and drier, with temperatures around 27 to 29 degrees during the day and as low as 24 degrees on cooler evenings. Even during the rainy periods, it rarely rains for many days in a row. The sun comes out between showers and you can still have a great time.'),

  tb('The sea is calmer and cleaner from November through April, and a little rougher and windier from June through September. Both seasons are beautiful in their own way. A personal favourite among our local team is September: dry, stunning, and slightly cooler than the peak season without being cold. December, January and February are wonderful for the ocean. November and early December offer the calmest conditions for snorkelling and diving, though it is also the hottest period without much breeze.'),

  tb('Seaweed', 'h3'),
  tb('Be aware that seaweed can appear on the beaches and is difficult to predict. It changes every year and often comes more during rainy periods. A beach covered in seaweed is a very different experience from one with clean white sand. If one beach has seaweed, explore others nearby because it tends to accumulate differently depending on currents. December through March usually sees the least seaweed, and August through October is also generally cleaner, but we cannot guarantee conditions and this fluctuates year to year.'),

  tb('The busiest period', 'h3'),
  tb('December and January are when Kilifi transforms. The Kilifi New Year Festival is one of the most celebrated music and arts events in East Africa, drawing huge crowds, international DJs and a genuinely electric atmosphere. It is the most exciting time to visit for sure. If you want a peaceful and private holiday, avoid this window. The quietest months are the rainy ones, but because Kilifi is a lived-in town it stays open and active throughout the year. Local businesses keep going and local life carries on regardless of the tourist season.'),

  tb('For kitesurfers', 'h3'),
  tb('There are two wind seasons in Kilifi. The Kaskazi blows from the north between January and March and brings consistent wind with a calmer, more beautiful ocean. The Kusi blows from the south between July and September and is a little stronger and rougher but still great for all levels. Once either season starts the wind is very consistent. This year the Kusi started unusually early in April, though that is not the norm. Kilifi is a fantastic kite spot and Bofa Beach is a hidden gem for kitesurfing. You can learn with Salty\'s Kite Surfing School, the central hub of Bofa Beach life, or with the newer Tribal Kite School which has recently opened.'),

  img('Add a seasonal or beach photo of Kilifi here'),

  // ── NEIGHBOURHOODS ───────────────────────────────────
  tb('Areas of Kilifi Explained', 'h2'),

  tb('Kilifi is more spread out than it looks on a map. The different areas have distinct personalities and where you stay shapes your experience significantly.'),

  {
    _type: 'compareTableBlock', _key: key(),
    columns: [
      { _key: key(), label: 'Area', color: 'teal' },
      { _key: key(), label: 'Vibe', color: 'blue' },
      { _key: key(), label: 'Best for', color: 'teal' },
      { _key: key(), label: 'Highlight', color: 'purple' },
    ],
    rows: [
      { _key: key(), criterion: 'Kilifi Town', values: ['Busy, authentic Kenyan town life', 'Local food, transport, markets', 'Banks, Naivas supermarket, matatu stand'], winners: [] },
      { _key: key(), criterion: 'Bofa Beach', values: ['Quiet, residential, coconut palms', 'Beach lovers, families, rental properties', 'Long white beach, kite school, Salty\'s'], winners: [1] },
      { _key: key(), criterion: 'Mnarani and the Plantation', values: ['Expat community, creative, wellness-focused', 'Long stays, creatives, families with kids', 'Kivukoni School, Food Movement, baobab trees'], winners: [] },
      { _key: key(), criterion: 'Mnarani Town', values: ['Busy, local, chaotic in a good way', 'Getting a feel for real local life', 'South side of the creek, local energy'], winners: [] },
      { _key: key(), criterion: 'Takaungu', values: ['Off the beaten path, strong Swahili culture', 'Explorers, photographers, culture seekers', 'Ancient village, beautiful creek, authenticity'], winners: [] },
    ],
  },

  tb('Kilifi Town', 'h3'),
  tb('The commercial centre of Kilifi. This is where you will find the main supermarket, banks, the market, the police station and the matatu stand. It is busy and authentically Kenyan with the energy of a functioning coastal town. Not a beach area, but essential for supplies and a great place to eat cheap, delicious local food.'),

  tb('Bofa Beach', 'h3'),
  tb('The best beach in Kilifi. Long, white, quiet and beautiful, Bofa is a residential area with a mix of local families and expats. There are a few restaurants and bars opening up along the beach road, boutique hotels are beginning to emerge, and there are stunning beachfront rental properties available for groups and families. Salty\'s Kite Surfing Village is the social hub of Bofa Beach and the only established beach bar, though new spots including Tribal Table restaurant and Somewhere Cafe are coming very soon.'),

  tb('Mnarani and the Plantation', 'h3'),
  tb('The south side of the creek is where much of the expat community has settled. The Plantation is a large and beautiful farm that used to grow sisal and raise cattle. It is now developing into a residential community, selling land for people to build their own homes. It has grown into a wonderful hub where weekly fitness and yoga classes take place, workshops produce local art and crafts, the Food Movement restaurant serves great food, and the Kivukoni international school provides education for resident families. The Green Heart of Kenya housing project is also developing here. The farm itself is stunning, with old baobab trees creating a magical landscape. Mnarani Club hotel sits on the creek here and now has padel courts and a gym. Mnarani town itself, just at the south end of the bridge, is a small and lively local spot where many Kilifi residents live.'),

  tb('Takaungu', 'h3'),
  tb('A lesser-known creek about 15 kilometres south of Kilifi town. The south side has an ancient Swahili village with a strong historical atmosphere. The north side borders the Plantation farm. Takaungu has a deep Swahili cultural influence and is well worth a visit or a day trip for anyone interested in the authentic history of the Kenyan coast.'),

  img('Add a neighbourhood or map photo of Kilifi here'),

  // ── HOW TO GET AROUND ────────────────────────────────
  tb('How to Get Around Kilifi', 'h2'),

  tb('Kilifi is quite spread out. From one end of Bofa Beach to the Plantation on the south side of the creek can be a 20 to 25 minute drive, so getting around efficiently matters. The main options are tuk-tuks, boda bodas (motorbike taxis) and rented cars or motorbikes.'),

  tb('There are plenty of friendly boda boda and tuk-tuk drivers who will be eager to take you wherever you want to go. If you are in the town centre you can also walk along the main street, and if you enjoy long beach walks, Bofa is a wonderful way to explore on foot.'),

  tb('Price guide and tips', 'h3'),
  tb('Always agree the price before getting in, not after. Carry small change or small denomination notes because Mpesa mobile banking is widely used and many drivers do not carry change. If you only have large notes, ask at a petrol station to get change. Alternatively set up an Mpesa account with a local SIM card. A tuk-tuk or boda boda ride anywhere within Kilifi should never cost more than KSh 600 maximum, even for the longest journey within the area of around 9 to 10 kilometres. Shorter trips typically cost KSh 150 to 350. If a short distance is quoted above KSh 500, bargain. Tuk-tuks are generally a little more expensive than motorbikes. Do not be afraid to negotiate. Bargaining is a completely normal part of Kenyan culture and drivers will not be offended. It is expected and respected.'),

  tb('At night', 'h3'),
  tb('Be a little more cautious at night as in any town. Once you find a boda boda or tuk-tuk driver you like and trust, take their number and call them directly to pick you up from venues in the evening. Overall Kilifi is a very safe place and Kenyans are incredible and friendly people. Do not be afraid to communicate clearly or ask for directions. Almost everyone speaks English.'),

  tip('Tourism brings a lot of opportunity to Kilifi and as a visitor you may sometimes be quoted tourist prices. Use the price guide above as your reference point and bargain confidently but politely. It is normal here and part of the experience.', 'On prices and bargaining'),

  // ── WHERE TO SHOP ────────────────────────────────────
  tb('Where to Shop in Kilifi', 'h2'),

  tb('Kilifi town has one main large supermarket, Naivas, which stocks most essentials. For fresh fruit and vegetables the local market in town is excellent and great value, with produce that is far fresher than anything from a supermarket shelf. There are also two smaller convenience supermarkets called Express Shop: one at the start of the Bofa road and one on the south side of the creek bridge at the petrol station. These are handy for top-ups if you are staying in Bofa or Mnarani without wanting to drive into town.'),

  img('Add a photo of Kilifi town or Bofa Beach road here'),

  // ── WHERE TO STAY ────────────────────────────────────
  tb('Where to Stay in Kilifi', 'h2'),

  tb('This is where Kilifi shows its one genuine limitation compared to Watamu: there is significantly less accommodation. But the options that do exist have real character, and in some categories Kilifi actually excels.'),

  tb('Hotels in Kilifi include Mnarani Club, Maya Koba, Salty\'s, Distant Relatives, Kilifi Bay and Silver Palms. Options are limited but each has its own character and loyal following. New properties are also coming: Arcadia is one to watch, and there are excellent options appearing on Airbnb that will soon be listed directly on this site for easy and trusted booking.'),

  tb('For backpackers and solo travellers, Distant Relatives Ecolodge is the standout choice: a lively, well-run spot on the creek with dorm beds from around KSh 2,000 and private rooms from KSh 5,000. It is also one of the social hubs of Kilifi, hosting regular events, live music and communal dinners.'),

  tb('For groups and families, Kilifi genuinely excels with beautiful private villa and rental property options along the creek and near Bofa Beach. These often come with private pools, staff and direct water access, and split between a large group they represent outstanding value. Many stunning properties will be listed directly on this website very soon so you can book with confidence.'),

  tip('Your accommodation can often help arrange taxis, transfers, day trips and activity bookings. Always ask them first before trying to organise things independently. The good guesthouses and villas in Kilifi know the community well.', 'Ask your host'),

  img('Add a photo of accommodation or Kilifi creek views here'),

  // ── WHAT TO DO ───────────────────────────────────────
  tb('What to Do in Kilifi', 'h2'),

  tb('Kilifi has more to do than first appearances suggest. The activity scene is built around the creek, the beach and the community, and it rewards those who take the time to settle in and discover it.'),

  tb('Watersports at 3 Degrees South', 'h3'),
  tb('3 Degrees South is the watersports centre on Kilifi Creek and one of the best facilities of its kind on the Kenyan coast. Here you can learn to sail, kayak, waterski, wakeboard or scuba dive. They offer courses for beginners as well as rental and support for more experienced participants. The creek provides an ideal sheltered environment for learning without the unpredictability of the open ocean.'),

  tb('Sunset dhow cruise', 'h3'),
  tb('A sunset dhow cruise on Kilifi Creek is one of the most memorable experiences in Kenya. As the sun drops behind the baobabs and the water turns gold, the pace of life slows to something close to perfect. This is not to be missed.'),

  tb('Learn to kitesurf', 'h3'),
  tb('Salty\'s Kite Surfing Village on Bofa Beach is the original kite hub in Kilifi and a central social spot as well as a kite school. The newer Tribal Kite School has also recently opened. Kilifi offers fantastic conditions for all levels, with flat water on the creek for beginners and open ocean options for more advanced riders.'),

  tb('Yoga, wellness and movement', 'h3'),
  tb('Kilifi has a genuine and growing wellness scene. Weekly community yoga classes happen across the area, often in beautiful outdoor settings. There are also breathwork sessions, ice baths, ecstatic dance events, fitness classes, massages and spa treatments available through various practitioners who have made Kilifi their home. None of this feels performative or expensive. It is woven naturally into community life.'),

  tb('Events, music and community gatherings', 'h3'),
  tb('Kilifi thrives on community events. The Kilifi New Year Festival between Christmas and New Year is one of the most celebrated music and arts festivals in East Africa. The Kilifi Wellness Festival happens twice a year. Beyond those, there are regular markets, sundowner sessions, live music nights, art exhibitions and pop-up dinners throughout the year. Check for upcoming events and book experiences directly on this website very soon.'),

  tb('Other activities', 'h3'),
  tb('Bofa Beach on a quiet weekday morning is one of the most peaceful places on the Kenyan coast, often completely empty. Enjoy it. Fishing trips, sunset drinks on the creek, exploring Takaungu\'s ancient village, and simply cycling or walking the beach road are all part of what makes Kilifi special. It is quieter overall than Watamu or Diani, and that is exactly the point.'),

  img('Add a photo of 3 Degrees South or Bofa Beach activities here'),

  // ── WHERE TO EAT ─────────────────────────────────────
  tb('Where to Eat in Kilifi', 'h2'),

  tb('Kilifi does not have the most restaurant options but what it has is genuinely great. The food scene is growing and the restaurants that exist tend to be creative, community-driven and really good.'),

  tb('Food Movement in the Plantation is a wonderful spot for healthy, thoughtful food in a beautiful farm setting. Salty\'s has three different locations across Kilifi, all serving great food in relaxed settings. Kilifi Boatyard is a classic and has been a local favourite for years. The Twisted Fig is the elevated option: yummy, more high-end and worth it for a special dinner.'),

  tb('Kilifi town itself has excellent and very affordable local food. Bahari, Village Dishes, Apache Indian and Fayaz Bakery all deserve an honourable mention and are great for an authentic and cheap meal. Vegan Basket is a great option for plant-based eating. Distant Relatives serves good food too in a social atmosphere. Indigo Vibe is a newer cafe with great coffees and sandwiches.'),

  tb('Two new spots are opening very soon on Bofa Beach: Tribal Table restaurant and Somewhere Cafe. Keep an eye out for both as they will add real variety to the Bofa Beach food scene. Hopefully the food scene in Kilifi continues to develop as the community grows.'),

  img('Add a photo of one of Kilifi\'s restaurants or food scene here'),

  // ── NIGHTLIFE ────────────────────────────────────────
  tb('Kilifi Nightlife and Social Scene', 'h2'),

  tb('Here is the thing about Kilifi that surprises most visitors: the nightlife is better than Watamu\'s, but the daytime is quieter. Kilifi\'s social scene operates in bursts. On event nights, whether it is a full moon party, a DJ set at Distant Relatives, live music at a local venue or a pop-up dinner on the creek, the energy is electric and the crowd is a genuine mix of Kenyans, long-term expats and passing travellers. These nights feel special because they emerge from a real community rather than a tourism machine.'),

  tb('But between events, Kilifi is peaceful. There is no strip of tourist bars. There is no nightly entertainment schedule. If you want something to do on a random Tuesday, you will probably end up at a local bar watching football, joining a sunset session at the creek, or cooking dinner with people you met that morning. This is the rhythm, and most people who love Kilifi love it precisely because of this balance.'),

  tb('One of the best things about the social scene here is that you meet more Kenyans. Watamu can sometimes feel like an Italian colony with a Kenyan backdrop. Kilifi\'s community is more integrated. Expats and locals genuinely socialise together, and you are far less likely to find yourself trapped in a tourist bubble.'),

  img('Add a photo of Kilifi nightlife or creek social scene here'),

  // ── LIVING IN KILIFI ─────────────────────────────────
  tb('Living in Kilifi', 'h2'),

  tb('An increasing number of people are not just visiting Kilifi. They are moving here. The town has become a genuine community hub for remote workers, creative professionals, wellness practitioners, and families with young children who are choosing Kilifi over louder and more established coastal towns.'),

  tb('For families, the infrastructure is better than you might expect. Kivukoni School is a well-regarded British international school offering education from early years through secondary level.'),

  rt([
    { text: 'Read our full guide to Kivukoni School here', link: 'https://www.klickenya.com/journal/kivukoni-school-kilifi-guide' },
    { text: '. The 3 Degrees South water sports centre runs children\'s sailing and watersports programmes. The creek provides a safe, natural playground that most children in the world can only dream of. The community is tight-knit and family-friendly: children grow up knowing their neighbours, playing on the beach, and learning to sail before they can ride a bicycle.' },
  ]),

  tb('The cost of living is significantly lower than Nairobi or Mombasa. Rent for a two-bedroom house near the creek runs KSh 35,000 to 60,000 per month. A three-bedroom villa with a garden is KSh 70,000 to 100,000 per month. Fresh produce is abundant and cheap at the local markets. The main trade-off is convenience. Kilifi does not have large shopping centres, international hospitals, or the full infrastructure of a major city. Mombasa is 1.5 hours away for anything you cannot find locally.'),

  {
    _type: 'tipCardBlock', _key: key(), variant: 'warning', icon: '⚠️',
    label: 'Practical safety notes',
    text: 'Kilifi is generally safe but use common sense. Avoid walking alone on the beach after dark. Keep valuables out of sight. Malaria is present on the coast: take prophylactics and use repellent, especially around the creek at dusk. Tap water is not safe to drink. Stick to bottled or filtered water.',
  },

  img('Add a photo of Kilifi community life or the creek from a residential viewpoint here'),

  // ── COST OF LIVING ───────────────────────────────────
  tb('How Much Does Kilifi Cost?', 'h2'),

  tb('Kilifi is more affordable than Watamu across almost every category. Here is a realistic breakdown for 2026.'),

  {
    _type: 'budgetTableBlock', _key: key(),
    columns: ['Category', 'Budget', 'Mid-range', 'Luxury'],
    rows: [
      { _key: key(), label: 'Accommodation (per night)', values: ['KSh 2,000 to 4,000', 'KSh 5,000 to 12,000', 'KSh 15,000 to 25,000'] },
      { _key: key(), label: 'Meals (per day)', values: ['KSh 500 to 1,000', 'KSh 1,500 to 3,000', 'KSh 4,000 to 8,000'] },
      { _key: key(), label: 'Transport (per day)', values: ['KSh 200 to 500', 'KSh 500 to 1,500', 'KSh 2,000 to 5,000'] },
      { _key: key(), label: 'Activities (per day)', values: ['KSh 500 to 1,500', 'KSh 2,000 to 5,000', 'KSh 5,000 to 15,000'] },
      { _key: key(), label: 'Drinks and nightlife', values: ['KSh 300 to 800', 'KSh 1,000 to 2,500', 'KSh 3,000 to 6,000'] },
    ],
  },

  tb('A backpacker staying at Distant Relatives, eating local food and joining free community activities can spend as little as KSh 3,000 to 5,000 per day. A mid-range traveller with a guesthouse, restaurant meals and creek activities will spend KSh 8,000 to 18,000 per day. Groups renting a private villa and splitting costs can paradoxically spend less per person than mid-range travellers, while enjoying private pools and personal chefs.'),

  // ── DEVELOPMENT AND INVESTMENT ───────────────────────
  tb('Development and Investment Growth in Kilifi', 'h2'),

  tb('Kilifi is growing fast and the pace of development is accelerating. Houses, apartments, boutique guesthouses and residential plots are being built across the area and new projects are launching regularly. Land prices have risen significantly over the past five years and continue to climb as more people discover the area and its potential.'),

  tb('The Plantation on the south side of the creek is a clear example of this growth. A large farm that once grew sisal and raised cattle has transformed into a developing residential community, selling plots and attracting investors and families who want to build their own homes in a beautiful, community-driven setting. Bofa Beach is also seeing new development, with boutique hotels, restaurants and rental properties beginning to emerge alongside established names.'),

  tb('Infrastructure is improving alongside private investment. The road network, utilities and community facilities are all gradually upgrading to meet the needs of a growing population. International attention on Kilifi is increasing and investors from Nairobi, Europe and beyond are starting to take serious notice.'),

  tb('Kilifi is not just a place to visit anymore. It is a place to invest in. Compared to Mombasa or Diani, land and property here still offers significantly better value while delivering the lifestyle, community and natural beauty that makes the investment worthwhile. The trajectory is clear and those who move early tend to benefit the most. If you are considering buying land or property on the Kenyan coast, Kilifi deserves serious consideration.'),

  // ── HONEST ASSESSMENT ────────────────────────────────
  tb('The Honest Assessment', 'h2'),

  tb('Kilifi is not for everyone, and that is exactly what makes it special. If you want a beach holiday with a menu of organised excursions, a strip of restaurants to choose from, and the safety net of tourist infrastructure, Watamu is a better choice. If you want a place that feels real: where you will meet the people who live there, where the creek replaces the pool, and where the best experiences come from saying yes to whatever is happening that evening, Kilifi will get under your skin.'),

  tb('The beaches are quieter than anywhere else on the north coast. There are no hawkers. Bofa Beach on a weekday morning can be completely empty: just you, the sand and the Indian Ocean. The creek is genuinely one of the most beautiful natural features on the Kenyan coast, and the water sports available through 3 Degrees South would cost three times as much in a resort town.'),

  tb('You will meet more Kenyans here than in Watamu or Diani. The community is less of a tourist bubble and more of a real, functioning multicultural town. The expat community is creative and interesting: musicians, artists, photographers, yoga teachers, entrepreneurs, rather than the retiree and holiday crowd you find elsewhere on the coast.'),

  tb('The honest downsides: accommodation options are limited and book out fast in high season. There are fewer restaurants than Watamu. If you are a solo traveller or couple wanting a convenient, hassle-free beach break, the lack of mid-range hotels can be frustrating. The town infrastructure is basic. And getting to Kilifi from Nairobi is a full travel day.'),

  {
    _type: 'verdictCardBlock', _key: key(),
    variant: 'teal',
    label: 'Kilifi verdict',
    title: 'Choose Kilifi if you want to experience the Kenyan coast as a local, not as a tourist.',
    pros: [
      'Kilifi Creek: one of the most beautiful spots on the Kenyan coast',
      'Genuine creative community of artists, musicians and entrepreneurs',
      'Best nightlife and social events on the north coast',
      'More affordable than Watamu across every category',
      'Quiet, empty beaches with zero hawkers',
      'Excellent water sports at 3 Degrees South',
      'Meet more Kenyans and experience far less of a tourist bubble',
      'Kivukoni international school makes it viable for families long-term',
      'Bofa Beach: stunning and often deserted',
    ],
    cons: [
      'Limited accommodation with few mid-range hotel options',
      'Fewer restaurants than Watamu or Diani',
      'Basic town infrastructure without big supermarkets',
      'Full travel day from Nairobi',
      'Can feel very quiet between events if you need constant stimulation',
    ],
  },

  {
    _type: 'whoIsItForBlock', _key: key(),
    title: '🎯 Perfect for...',
    items: [
      { _key: key(), icon: '💻', text: 'Digital nomads looking for a creative and affordable coastal base' },
      { _key: key(), icon: '🧘', text: 'Wellness seekers drawn to yoga, breathwork and movement by the creek' },
      { _key: key(), icon: '👨‍👩‍👧‍👦', text: 'Families with children: safe creek, international school, friendly community' },
      { _key: key(), icon: '🎨', text: 'Creative types: musicians, artists and writers seeking real inspiration' },
      { _key: key(), icon: '🏄', text: 'Kitesurfers and watersports enthusiasts of all levels' },
      { _key: key(), icon: '🏡', text: 'Long-stayers who want to live on the coast, not just visit it' },
    ],
  },

  // ── SWAHILI PHRASES ──────────────────────────────────
  tb('A Few Swahili Phrases for Kilifi', 'h2'),

  tb('Kenyans genuinely appreciate any effort you make with Swahili. Even a few words will get you smiles, better prices and a warmer welcome. Here are the most useful phrases for getting around Kilifi.'),

  {
    _type: 'tipCardBlock', _key: key(), variant: 'tip', icon: '🗣️',
    label: 'Essential Swahili for Kilifi',
    text: 'Jambo or Mambo: Hello (Jambo is used with strangers, Mambo is the younger and more casual greeting). Poa: Cool or great, the response to Mambo. Habari yako: How are you? Nzuri: Good or fine. Asante: Thank you. Asante sana: Thank you very much. Tafadhali: Please. Hapana: No. Ndio: Yes. Kwaheri: Goodbye. Siku njema: Have a good day. Karibu: Welcome or you are welcome. Pole: Sorry or take it easy, also used to express sympathy. Ni ngapi or Bei gani: How much does it cost? Nataka kulipa: I want to pay. Maji: Water. Chakula ni wapi: Where is the food?',
  },

  tb('A note on greetings: in Kenya it is considered polite to greet people properly before asking for anything. Start with Jambo or Habari, exchange a few words, and then make your request. This small effort is noticed and genuinely appreciated in Kenyan culture.'),

  // ── UNIQUE THINGS ABOUT KILIFI ───────────────────────
  tb('Unique Things About Kilifi', 'h2'),

  tb('Every place has things that make it genuinely one of a kind. Here is what sets Kilifi apart from everywhere else on the Kenyan coast and, honestly, from most places in East Africa.'),

  tb('Baobab Studio is one of the most extraordinary recording facilities in the world. It sits among ancient baobab trees and international artists come specifically to record here. You will not find that in Diani.'),

  tb('The creek is unlike anything else on the north coast. A vast, calm tidal inlet that transforms with the tide, creates sandbanks in the middle of what was deep water an hour before, and provides a sheltered environment for watersports, dhow rides, sunsets and swimming that the exposed ocean simply cannot offer.'),

  tb('The community integration here is real. In most Kenyan coastal towns, expats and locals live parallel lives that occasionally overlap. In Kilifi they genuinely socialise together, collaborate on businesses and create events that both groups attend. It is subtle but you feel it immediately.'),

  tb('Kilifi New Year Festival is one of East Africa\'s most celebrated music events and it happens right here on the creek. The combination of world-class DJs, a stunning natural setting and a genuine community atmosphere makes it unlike any festival you will find elsewhere in the region.'),

  tb('Bofa Beach on an ordinary Tuesday morning is often completely empty. Not quieter than other beaches. Empty. Miles of white sand and the Indian Ocean entirely to yourself. That is increasingly rare in 2026 on any coastline.'),

  tb('The padel courts at Mnarani Club, the kite school at Salty\'s, the watersports centre at 3 Degrees South, the wellness classes in the Plantation, and the recording studio in the baobabs: Kilifi packs an extraordinary range of activities and facilities into what appears on the surface to be a quiet coastal town.'),

  // ── FAQ ──────────────────────────────────────────────
  tb('Frequently Asked Questions About Kilifi', 'h2'),

  tb('Is Kilifi safe?', 'h3'),
  tb('Yes. Kilifi is generally safe. Use common sense: avoid walking alone on the beach after dark, keep valuables out of sight, and be aware of traffic on the roads. The local community is welcoming and the established expat presence means there is always a network of people to connect with.'),

  tb('How do I get from Mombasa airport to Kilifi?', 'h3'),
  tb('Take a taxi or use Uber, which operates in Mombasa. The drive takes 1.5 to 2 hours and costs around KSh 6,000 to 8,000 by taxi. Uber will be cheaper and easier to arrange. Your accommodation can often recommend or arrange a trusted driver.'),

  tb('Can I use a credit card in Kilifi?', 'h3'),
  tb('Some hotels and restaurants accept cards, but cash and Mpesa are the main payment methods. Carry Kenyan Shillings in small denominations for boda bodas, markets and smaller restaurants.'),

  tb('What is the best time to visit Kilifi?', 'h3'),
  tb('September is a local favourite: dry, beautiful and a little cooler than peak season. December through February offers the best ocean conditions for swimming and snorkelling. Avoid April through June unless you enjoy the quiet, green atmosphere of the rainy season. December and January are the most exciting and social time of year.'),

  tb('Is there reliable Wi-Fi in Kilifi?', 'h3'),
  tb('Connections have improved significantly. Most guesthouses, cafes and co-working spots have reliable Wi-Fi. Safaricom is the strongest mobile network on the coast and a local SIM card with data is cheap and recommended.'),

  tb('Can I learn to kitesurf in Kilifi?', 'h3'),
  tb('Yes. Salty\'s Kite Surfing Village on Bofa Beach and the newer Tribal Kite School both offer lessons for beginners. The creek and Bofa Beach both provide good conditions for learning and progression.'),

  tb('Is Kilifi good for families?', 'h3'),
  tb('Very. Kivukoni School provides international education from early years to secondary level. The creek is a safe swimming environment without ocean currents. The community is genuinely family-friendly and children thrive here.'),

  tb('How far is Kilifi from Watamu?', 'h3'),
  tb('About 45 minutes by road, making day trips between the two very easy.'),

  tb('What currency should I use?', 'h3'),
  tb('Kenyan Shillings. You can exchange money at the banks in Kilifi town or at Naivas supermarket. USD and euros are accepted at some hotels and villas but you will get a better rate exchanging to KSh first.'),

  tb('Is there anything happening in the quieter months?', 'h3'),
  tb('Yes. Because Kilifi is a functioning town rather than a pure tourist destination, local life continues year-round. Yoga classes, creek activities and local restaurants all operate outside peak season. Events thin out but something is usually on. Ask your accommodation or look for local community groups when you arrive.'),
]

// ── SEED FUNCTION ────────────────────────────────────

async function seed() {
  console.log('Seeding Kilifi guide blog post...')

  try {
    await client.delete('drafts.blog-complete-guide-kilifi-2026')
    console.log('Deleted existing draft')
  } catch {
    // no draft existed
  }

  await client.createOrReplace({
    _id: 'blog-complete-guide-kilifi-2026',
    _type: 'blogPost',
    title: 'The Complete Guide to Kilifi, Kenya 2026',
    slug: { _type: 'slug', current: 'complete-guide-kilifi-kenya-2026' },
    status: 'published',
    primaryCategory: 'destination_guide',
    subcategory: 'city_guide',
    location: 'kilifi',
    series: 'Kenya Destination Guides',
    postType: 'guide',
    focusKeyword: 'kilifi kenya travel guide 2026',
    seoTitle: 'The Complete Guide to Kilifi Kenya 2026',
    seoDescription: 'Everything you need to know about Kilifi, Kenya. Written by locals with roots here. Creek, beach, nightlife, where to stay, eat, and live.',
    excerpt: 'Kilifi is Kenya\'s best-kept secret: a vast tidal creek, a creative community, stunning Bofa Beach, and the kind of quiet that ambitious people move to when they are done performing. This is our complete local guide.',
    readingTime: 18,
    publishedAt: '2026-03-20T08:00:00Z',
    author: { _type: 'reference', _ref: '0a5287ef-f74d-4893-a487-6b672cb63477' },
    tags: ['Beach', 'Coast', 'Kilifi'],
    keywords: ['kilifi', 'creek', 'bofa beach', 'expat', 'wellness', 'kenya coast', 'hidden gem', 'kilifi new year'],
    body,
  })

  console.log('Done! Kilifi guide updated.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
