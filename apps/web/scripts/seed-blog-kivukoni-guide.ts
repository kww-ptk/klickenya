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
// Kivukoni School Kilifi  --  Everything Parents Need to Know in 2026
// ══════════════════════════════════════════════════════

const kivukoniGuideBody = [
  // ── Quick Facts ──
  {
    _type: 'quickFactsBlock',
    _key: key(),
    title: '✦ Kivukoni at a glance',
    accentColor: 'teal',
    items: [
      { icon: '👶', label: 'Ages', value: '2 to 16 (Playgroup  -  Year 11)' },
      { icon: '📚', label: 'Curriculum', value: 'British (Edexcel), iGCSEs' },
      { icon: '💰', label: 'Fees from', value: 'KSh 98,000 / year (Playgroup)' },
      { icon: '👨‍🎓', label: 'Students', value: '~280' },
      { icon: '📍', label: 'Location', value: 'Kilifi Plantation, Takaungu Creek' },
      { icon: '🏫', label: 'Founded', value: '2011' },
    ],
  },

  // ── Stat Row ──
  {
    _type: 'statRowBlock',
    _key: key(),
    stats: [
      { _key: key(), number: '280', label: 'students on campus' },
      { _key: key(), number: '60', label: 'teaching staff' },
      { _key: key(), number: '2011', label: 'year founded' },
    ],
  },

  // ── What is Kivukoni School? ──
  textBlock(`What is Kivukoni School?`, 'h2'),

  textBlock(`Kivukoni School in Kilifi, Kenya is a non-profit international school set on Kilifi Plantation alongside Takaungu Creek, about 3 kilometres off the Mombasa - Kilifi highway. Founded on 1 November 2011 with just 36 children, it has grown into a community of roughly 280 students aged 2 to 16, taught by 60 staff. The school follows the British curriculum through to iGCSE level and is accredited by Edexcel (Pearson). Its tagline  --  "Where children love to learn"  --  is not just marketing. Parents we have spoken to say it genuinely describes the atmosphere.`),

  textBlock(`What sets Kivukoni apart from virtually every other international school in East Africa is its commitment to sustainability. The campus is completely off-grid  --  100 per cent solar powered, with its own water source and reed-bed waste-water treatment. It is a certified Eco-School under the Federation for Environmental Education, and the natural environment is woven into daily learning rather than treated as a backdrop. If you are a family considering the Kenyan coast and you care about education that is rooted in community and environmental responsibility, Kivukoni should be at the top of your list.`),

  // ── Curriculum ──
  textBlock(`The Curriculum  --  British System, Kenyan Soul`, 'h2'),

  textBlock(`Kivukoni delivers the British National Curriculum from Early Years Foundation Stage through to Key Stage 4. Students in Years 10 and 11 sit Edexcel iGCSEs  --  internationally recognised qualifications that open doors to sixth-form colleges, A-level programmes, and IB schools worldwide. The school added an Art and Design GCSE pod in September 2024, expanding creative subject options.`),

  textBlock(`Class sizes are capped at 24 students, which is significantly smaller than most Nairobi international schools where 28 - 30 per class is common. In practice, many year groups at Kivukoni run well below that cap. The result is that teachers know every child by name, learning difficulties get spotted early, and quiet kids do not get lost.`),

  textBlock(`One thing that genuinely differentiates Kivukoni is its partnership with ThoughtBox Education. Every week, students participate in structured wellbeing sessions that cover emotional literacy, mindfulness, and social skills. This is not an optional extra or a one-off assembly  --  it is embedded in the timetable. In 2026, when children's mental health is a growing concern for parents everywhere, having wellbeing built into the school week is a real selling point.`),

  textBlock(`Compared to other options on the coast, Kivukoni occupies a unique position. It is more affordable than the big-name Nairobi international schools, more academically rigorous than many coastal alternatives, and more values-driven than almost any school we have encountered in Kenya. The trade-off is that it only goes to Year 11  --  there are no A-levels or IB on site, which means families need a plan for post-16 education.`),

  // ── Admissions tip ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'tip',
    icon: '💡',
    label: 'Admissions insider tip',
    text: 'Kivukoni is not as oversubscribed as Nairobi international schools, but popular year groups (especially FS2 and Year 1) do fill up. Contact admin@kivukoni.co.ke or ask for Ms Saida in the admissions office. If you apply a term in advance, you should be fine. Mid-year entries are usually possible too  --  the school is flexible about start dates.',
  },

  // ── The Charity Programme ──
  textBlock(`The Kivukoni Trust -- What Makes This School Truly Special`, 'h2'),

  textBlock(`What elevates Kivukoni from a good school to something genuinely remarkable is the Kivukoni Educational Trust. Established in 2021 as a UK-registered charity, the Trust funds bursaries that give children from low-income families in the Kilifi community access to the same education as everyone else. This is not a token gesture or a single scholarship -- it is a structured, ongoing programme that is central to the school's identity.`),

  textBlock(`The bursary scheme has been part of Kivukoni since its founding. The school was built with the explicit intention of serving the whole Kilifi community, not just expat families who can afford private education. In practice, this means your child sits next to kids from very different backgrounds -- Kenyan, European, American, from farming families and from diplomatic ones. The diversity is real, not curated, and parents consistently say it is one of the most valuable things about the school.`),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'Kivukoni is the rare school where a diplomat\'s child and a local fisherman\'s child learn side by side -- and both families feel equally welcome.',
    attribution: 'Kilifi parent',
    accentColor: 'teal',
  },

  textBlock(`The Trust also funds broader community projects focused on nature conservation, environmental science, and sustainable development in the Kilifi area. If you are looking for a school that walks the talk on social responsibility rather than just printing it in a prospectus, Kivukoni is it.`),

  // ── The Vibe ──
  textBlock(`The Vibe -- Open, Active, Social`, 'h2'),

  textBlock(`Kivukoni is not a stuffy institution with rigid uniforms and silent corridors. The vibe is open, relaxed, and genuinely social. Kids are outdoors constantly -- learning under trees, swimming, exploring the creek. The atmosphere is more like a tight-knit village school than a traditional British academy, and that is entirely by design.`),

  textBlock(`But the social life extends well beyond the school gates. Kivukoni is a community hub for families in Kilifi. Parents meet at school events, weekend gatherings at the creek, sports days, and the regular cultural celebrations that bring the whole school together. If you are new to Kilifi, enrolling your child at Kivukoni is the fastest way to build a genuine social network -- for both you and your kids.`),

  textBlock(`The sports and activities programme is active and growing. Swimming is part of the regular timetable. The school runs football, athletics, and outdoor education throughout the week. Nearby, 3 Degrees South offers sailing, kayaking, waterskiing, and diving for families who want more structured water sports -- many Kivukoni parents use it as an extension of after-school life. Art has a growing presence, especially since the GCSE Art and Design pod opened in 2024.`),

  textBlock(`What you will not find is the hyper-competitive extracurricular circuit of Nairobi schools -- no Model UN, no orchestras, no inter-school rugby leagues. But if you value a childhood spent outdoors, in nature, building real friendships across cultures and backgrounds, Kivukoni delivers something that no amount of after-school clubs can replicate.`),

  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'teal',
    icon: '🏊',
    label: 'Activities beyond the classroom',
    text: '3 Degrees South water sports centre is a 15-minute drive and offers sailing, kayaking, SUP, waterskiing, and scuba diving for all ages. Many Kivukoni families make it a regular after-school or weekend activity. The Kilifi Creek itself is a natural playground -- calm, warm, and safe for supervised water sports.',
  },

  // ── Campus ──
  textBlock(`The Campus -- Africa's Most Sustainable School?`, 'h2'),

  textBlock(`Kivukoni sits within Kilifi Plantation, a lush coastal property alongside Takaungu Creek. The campus is expansive  --  open-plan classrooms blending into outdoor learning spaces, shaded by mature trees. Children move between indoor and outdoor environments throughout the day, and nature is not something they study from a textbook  --  it is literally the classroom.`),

  textBlock(`The sustainability credentials are not greenwashing. Kivukoni is completely off-grid. All electricity comes from solar panels. The school has its own water source and uses reed-bed filtration for waste-water treatment. It holds official Eco-School certification from the Foundation for Environmental Education  --  an international standard that requires genuine, measurable environmental practice, not just a recycling bin in the corridor.`),

  {
    _type: 'pullQuoteBlock',
    _key: key(),
    text: 'The children learn surrounded by creek water, birdlife, and open sky. It is the opposite of a concrete compound. You can hear it in how they talk about school  --  they actually want to be there.',
    attribution: 'Parent, Kivukoni community',
    accentColor: 'teal',
  },

  textBlock(`The school opened a cloud-based ICT lab to ensure students are not behind on technology despite the off-grid setting, and the Art and Design GCSE pod launched in September 2024 added a dedicated creative space. Swimming is included in the regular timetable, not charged as an extra.`),

  // ── What Makes Kivukoni Different ──
  textBlock(`What Makes Kivukoni Different`, 'h2'),

  textBlock(`It helps to see Kivukoni in context. Here is how it compares on the criteria that matter most to parents.`),

  {
    _type: 'compareTableBlock',
    _key: key(),
    columns: [
      { _key: key(), label: 'Kivukoni', color: 'teal' },
      { _key: key(), label: 'Typical Intl School (Nairobi)', color: 'slate' },
      { _key: key(), label: 'Kenyan National School', color: 'slate' },
    ],
    rows: [
      {
        _key: key(),
        criterion: 'Class size',
        values: ['Max 24', '28 - 30', '40 - 50+'],
        winners: [true, false, false],
      },
      {
        _key: key(),
        criterion: 'Curriculum',
        values: ['British / iGCSE', 'British, IB, or American', 'CBC (8-4-4 replacement)'],
        winners: [false, true, false],
      },
      {
        _key: key(),
        criterion: 'Environment',
        values: ['Off-grid eco campus', 'Urban compound', 'Varies widely'],
        winners: [true, false, false],
      },
      {
        _key: key(),
        criterion: 'Community diversity',
        values: ['Intentionally diverse', 'Mostly expat / high-income', 'Local community'],
        winners: [true, false, false],
      },
    ],
  },

  // ── Community ──
  textBlock(`The Kilifi Community`, 'h2'),

  textBlock(`One reason families choose Kivukoni is that they have already fallen in love with Kilifi itself. The town has a growing community of expat families  --  many of them creative professionals, remote workers, and small-business owners who relocated from Nairobi, Europe, or further afield. Kilifi is safer, slower, and significantly cheaper than Nairobi. Children grow up outdoors, ride bikes to friends' houses, and know their neighbours. For parents who left big cities specifically to give their children a different kind of childhood, Kilifi delivers.`),

  textBlock(`Kivukoni reflects this community. The student body is intentionally diverse  --  a wide range of nationalities and economic backgrounds. The school operates an active bursary scheme funded in part by the Kivukoni Educational Trust, a UK-registered charity established in 2021 that raises funds specifically to make places available to low-income families from the Kilifi area. This is not a gated expat bubble. It is a school that takes community seriously.`),

  textBlock(`If you are considering Kilifi more broadly  --  where to stay, what to do, what daily life actually looks like  --  we wrote a detailed guide that covers everything: /journal/complete-guide-kilifi-kenya-2026.`),

  // ── Activities ──
  textBlock(`Activities and After School`, 'h2'),

  textBlock(`Kivukoni is not a school with twenty after-school clubs and a rugby first XV. It is smaller and more informal than that. Swimming is part of the regular timetable, and outdoor education  --  nature walks, creek-side learning, environmental projects  --  is integrated throughout the week rather than packaged as an extracurricular.`),

  textBlock(`Outside school, Kilifi offers plenty for active families. 3 Degrees South, just a short drive away, runs sailing, kayaking, and stand-up paddleboarding programmes that many Kivukoni families use. The creek is a natural playground for water sports, and the coast in general means surfing, snorkelling, and beach time are part of daily life rather than weekend treats.`),

  textBlock(`Art has a growing presence at the school, especially since the GCSE Art and Design pod opened in 2024. For families who want a broader range of structured extracurriculars  --  competitive sports leagues, orchestra, Model UN  --  Nairobi schools will offer more. But if you value a childhood that is spent outdoors and in nature rather than shuttled between after-school activities, Kivukoni's approach makes sense. Explore more of what Kilifi offers families at /experiences/kilifi.`),

  // ── Warning tip ──
  {
    _type: 'tipCardBlock',
    _key: key(),
    variant: 'warning',
    icon: '⚠️',
    label: 'Things to consider',
    text: 'Kivukoni only goes to Year 11 (age 16). There are no A-levels or IB on site, so you will need a plan for post-16 education  --  whether that is boarding school in the UK or elsewhere, an online sixth form, or relocating to Nairobi. The school is also 3 km off the main highway with no boarding option, so you need to live locally. Kilifi is roughly 8 hours from Nairobi by road (or SGR train plus transfer), which is worth factoring in if you have regular commitments in the capital.',
  },

  // ── How to Apply ──
  textBlock(`How to Apply`, 'h2'),

  textBlock(`The admissions process at Kivukoni is straightforward and far less stressful than what you may be used to from Nairobi or international schools elsewhere. Contact the school directly at admin@kivukoni.co.ke  --  ask for Ms Saida, who handles admissions. You will be invited to visit the campus, meet the head teacher, and sit your child for an informal assessment. There is no entrance exam in the traditional sense for younger year groups.`),

  textBlock(`The one-time admission fee is KSh 15,000, and you will pay a refundable caution deposit of KSh 40,000. If you are applying for mid-year entry, the school is generally accommodating  --  they understand that families relocating to the coast do not always arrive in September. We would recommend reaching out at least one term before your planned start date to secure a place, especially for FS2 and lower primary which tend to be the most popular year groups.`),

  // ── Living in Kilifi ──
  textBlock(`Living in Kilifi as a Family`, 'h2'),

  textBlock(`Kilifi is one of the best places in Kenya to raise children. That is a big claim, but parents who have made the move tend to agree. The pace of life is slower, the cost of living is a fraction of Nairobi, and the community is tight-knit without being insular. Children walk barefoot, play in the creek, know the security guard by name, and come home covered in mud. It is the kind of childhood that many parents dream of but assume is impossible.`),

  textBlock(`Practically, Kilifi has everything a family needs  --  supermarkets, a hospital, pharmacies, good restaurants, and reliable internet for remote work. What it does not have is the traffic, pollution, and security concerns that come with Nairobi. Housing ranges from simple Swahili-style homes to beautiful villas overlooking the creek, with rents starting from around KSh 40,000 per month for a decent family house. If you are exploring accommodation options, check /stays/kilifi for our curated picks.`),

  // ── Verdict Card ──
  {
    _type: 'verdictCardBlock',
    _key: key(),
    variant: 'teal',
    label: 'Our verdict',
    title: 'Kivukoni International School',
    pros: [
      'Certified eco-school  --  genuinely off-grid and sustainable',
      'Small class sizes with max 24 students',
      'Fees include everything: books, lunch, snacks, swimming',
      'Diverse, inclusive community with active bursary programme',
      'Beautiful natural setting on Takaungu Creek',
      'ThoughtBox wellbeing programme embedded in timetable',
      'Non-profit model  --  fees go to education, not shareholders',
    ],
    cons: [
      'No A-levels or IB  --  school ends at Year 11 (age 16)',
      'Remote location  --  8 hours from Nairobi, 3 km off main highway',
      'Fewer structured extracurriculars than big Nairobi schools',
      'No boarding option  --  you need to live in the Kilifi area',
    ],
  },

  // ── Who Is It For ──
  {
    _type: 'whoIsItForBlock',
    _key: key(),
    title: '🎯 Perfect for...',
    items: [
      { _key: key(), icon: '🌍', text: 'Expat families relocating to the Kenyan coast who want a quality British education without Nairobi prices' },
      { _key: key(), icon: '🌱', text: 'Eco-conscious parents who want sustainability to be part of their children\'s daily learning environment' },
      { _key: key(), icon: '🏖️', text: 'Families moving from Nairobi to the coast for a slower pace of life and outdoor childhood' },
      { _key: key(), icon: '💻', text: 'Digital nomad families spending a year or more on the Kenyan coast who need a proper school' },
      { _key: key(), icon: '👨‍👩‍👧‍👦', text: 'Long-stay visitors with children aged 2 - 16 who want more than ad-hoc tutoring' },
    ],
  },

  // ── Distance Chips ──
  {
    _type: 'distanceChipsBlock',
    _key: key(),
    chips: [
      { _key: key(), icon: 'pin', label: 'Kilifi town', value: '3 km' },
      { _key: key(), icon: 'clock', label: 'Mombasa', value: '1.5 hrs' },
      { _key: key(), icon: 'clock', label: 'Watamu', value: '30 min' },
      { _key: key(), icon: 'clock', label: 'Nairobi', value: '~8 hrs (SGR + transfer)' },
    ],
  },
]

// ══════════════════════════════════════════════════════
// Seed
// ══════════════════════════════════════════════════════

async function main() {
  await client.createOrReplace({
    _id: 'blog-kivukoni-school-kilifi-guide',
    _type: 'blogPost',
    title: 'Kivukoni School Kilifi  --  Everything Parents Need to Know in 2026',
    slug: { _type: 'slug', current: 'kivukoni-school-kilifi-guide' },
    status: 'published',
    primaryCategory: 'living_in_kenya',
    subcategory: 'guide',
    location: 'kilifi',
    series: 'Living in Kenya',
    postType: 'guide',
    focusKeyword: 'kivukoni school kilifi kenya',
    seoTitle: 'Kivukoni School Kilifi 2026  --  Fees, Curriculum & Guide',
    seoDescription:
      'Kivukoni International School in Kilifi: British curriculum, iGCSEs, off-grid eco campus. The honest parent\'s guide for 2026.',
    excerpt:
      'Kivukoni International School sits on Kilifi Plantation beside Takaungu Creek -- an off-grid, solar-powered campus where 280 kids from 2 to 16 learn the British curriculum surrounded by nature. Here is what parents need to know.',
    readingTime: 10,
    publishedAt: '2026-03-22T08:00:00Z',
    author: {
      _type: 'reference',
      _ref: '0a5287ef-f74d-4893-a487-6b672cb63477',
    },
    tags: ['Education', 'Kilifi', 'Family'],
    keywords: [
      'kivukoni',
      'school',
      'kilifi',
      'british curriculum',
      'igcse',
      'eco school',
      'international school',
      'kenya',
    ],
    body: kivukoniGuideBody,
  })

  console.log('✅ Kivukoni guide seeded')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
