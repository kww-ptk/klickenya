import { defineType, defineField } from 'sanity'

/* ── Constants ──────────────────────────────────────── */

const KENYAN_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet',
  'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga',
  'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana', 'Uasin Gishu',
  'Vihiga', 'Wajir', 'West Pokot',
]

const AMENITIES = [
  'WiFi', 'Parking', 'Pool', 'Air Conditioning', 'Kitchen',
  'Gym', 'Security', 'Generator', 'Borehole', 'Garden',
  'Pet Friendly', 'Wheelchair Accessible', 'Sea View', 'Mountain View',
]

const TAG_SUGGESTIONS = [
  // Stays
  'beachfront', 'pool', 'garden', 'gated', 'family', 'pet-friendly', 'en-suite',
  'breakfast-included', 'city-centre', 'rooftop', 'spa', 'restaurant', 'adults-only',
  'design', 'all-inclusive', 'game-drive', 'tented', 'eco', 'full-board', 'dorm',
  'co-working', 'long-stay', 'treehouse', 'houseboat', 'glamping', 'container', 'off-grid',
  // Experiences
  'walking', 'night-drive', 'birding', 'boat-safari', 'fly-in', 'hiking', 'climbing',
  'surfing', 'diving', 'kayaking', 'cycling', 'zip-line', 'fine-dining', 'street-food',
  'tasting-menu', 'vegan', 'halal', 'community', 'craft', 'music', 'dance', 'heritage',
  'language', 'yoga', 'meditation', 'retreat', 'fitness', 'holistic', 'kids', 'educational',
  'animal-encounter', 'interactive', 'indoor',
  // Beaches
  'snorkelling', 'swimming', 'white-sand', 'marine-park', 'kite-surfing', 'sunset',
  'secluded', 'reef',
  // Events
  'nightlife', 'pool-party', '18+', 'bottle-service', 'outdoor', 'multi-day', 'camping',
  'all-ages', 'food-stalls', 'gallery', 'theatre', 'comedy', 'film', 'poetry', 'exhibition',
  'marathon', 'tournament', 'conference', 'meetup', 'workshop', 'pitch', 'startup',
  'corporate', 'holiday-camp', 'free', 'pop-up', 'charity', 'religious', 'seasonal',
  // Services
  'car', '4WD', 'motorbike', 'boat', 'camping-gear', 'dive-gear', 'venue', 'airport',
  'private-driver', 'group', 'safari-transfer', 'intercity', 'nyama-choma', 'swahili',
  'vegetarian', 'meal-prep', 'catering', 'massage', 'facial', 'manicure', 'barber',
  'yoga-instructor', 'delivery', 'organic', 'wholesale', 'fresh-produce', 'prescription',
  'OTC', 'cosmetics', 'vitamins', 'plumber', 'electrician', 'carpenter', 'painter', 'tiler',
  'welder', 'web-design', 'social-media', 'branding', 'IT-support', 'videography',
  'hardware', 'printing', 'fuel', 'laundry', 'courier',
  // Real Estate
  'house', 'apartment', 'bungalow', 'mansion', 'studio', 'townhouse', 'beach-plot',
  'agricultural', 'commercial-plot', 'residential', '1-acre', 'title-deed', 'office',
  'retail', 'warehouse', 'showroom', 'industrial', 'off-plan', 'gated-community',
  'serviced', 'smart-home', 'payment-plan',
]

/* ── Hidden helpers ─────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HiddenCtx = { document?: Record<string, any> }

const isRestaurant = ({ document }: HiddenCtx) =>
  document?.subcategory === 'restaurants'

const isNotRestaurant = ({ document }: HiddenCtx) =>
  document?.subcategory !== 'restaurants'

const isExperience = ({ document }: HiddenCtx) =>
  document?.type === 'experience' && document?.subcategory !== 'restaurants'

const isEvent = ({ document }: HiddenCtx) =>
  document?.type === 'event'

const isService = ({ document }: HiddenCtx) =>
  document?.type === 'service'

/* ── Schema ─────────────────────────────────────────── */

export default defineType({
  name: 'listing',
  title: 'Listing',
  type: 'document',
  groups: [
    { name: 'general', title: 'General', default: true },
    { name: 'media', title: 'Media' },
    { name: 'rooms', title: '🛏️ Rooms' },
    { name: 'restaurant', title: '🍽️ Restaurant' },
    { name: 'experience', title: '🧭 Experience' },
    { name: 'event', title: '🎫 Event' },
    { name: 'service', title: '🔧 Service' },
    { name: 'seo', title: 'SEO' },
    { name: 'verification', title: '✅ Verification' },
    { name: 'notifications', title: 'Notifications' },
  ],
  fields: [
    /* ═══════════════════════════════════════════════════
       GENERAL GROUP
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: "Clear, searchable title e.g. 'Maasai Mara Full-Day Game Drive'",
      validation: (rule) => rule.required(),
      group: 'general',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Auto-generated from title. Used in the URL.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
      group: 'general',
    }),
    defineField({
      name: 'type',
      title: 'Listing Type',
      type: 'string',
      options: {
        list: [
          { title: 'Stay', value: 'stay' },
          { title: 'Experience', value: 'experience' },
          { title: 'Event', value: 'event' },
          { title: 'Rental', value: 'rental' },
          { title: 'Service', value: 'service' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
      group: 'general',
    }),
    defineField({
      name: 'subcategory',
      title: 'Subcategory',
      type: 'string',
      description: 'Narrows what kind of listing this is within the category',
      options: {
        list: [
          // Stays
          { title: 'Villa', value: 'villa' },
          { title: 'Private Room', value: 'private_room' },
          { title: 'Boutique Hotel', value: 'boutique_hotel' },
          { title: 'Lodge / Camp', value: 'lodge_camp' },
          { title: 'Hostel', value: 'hostel' },
          { title: 'Unique Stay', value: 'unique_stay' },
          // Experiences
          { title: 'Safari', value: 'safari' },
          { title: 'Outdoor', value: 'outdoor' },
          { title: 'Beaches', value: 'beaches' },
          { title: 'Restaurants', value: 'restaurants' },
          { title: 'Cultural', value: 'cultural' },
          { title: 'Wellness', value: 'wellness' },
          { title: 'Family', value: 'family' },
          // Events
          { title: 'Parties', value: 'parties' },
          { title: 'Festival', value: 'festival' },
          { title: 'Art & Culture', value: 'art_culture' },
          { title: 'Wellness & Sport', value: 'wellness_sport' },
          { title: 'Networking', value: 'networking' },
          { title: 'Kids', value: 'kids' },
          { title: 'Other', value: 'other' },
          // Services
          { title: 'Rentals', value: 'rentals' },
          { title: 'Transfers', value: 'transfers' },
          { title: 'Private Chef', value: 'private_chef' },
          { title: 'Wellness', value: 'wellness_service' },
          { title: 'Supermarkets', value: 'supermarkets' },
          { title: 'Pharmacy', value: 'pharmacy' },
          { title: 'Fundis', value: 'fundis' },
          { title: 'IT & Marketing', value: 'it_marketing' },
          { title: 'Utility Shops', value: 'utility_shops' },
          // Real Estate
          { title: 'For Sale', value: 'for_sale' },
          { title: 'Land & Plots', value: 'land_plots' },
          { title: 'Commercial', value: 'commercial' },
          { title: 'New Developments', value: 'new_developments' },
        ],
      },
      validation: (rule) => rule.required().warning('Please select a subcategory'),
      group: 'general',
    }),
    defineField({
      name: 'rentingType',
      title: 'Renting type',
      type: 'string',
      description:
        'Entire place: guests book the whole property.\nBy room: guests choose a specific room.\nBoth: a toggle appears on the listing page.',
      options: {
        list: [
          { title: 'Entire place only', value: 'entire_place' },
          { title: 'By room only', value: 'by_room' },
          { title: 'Both — guests can choose', value: 'both' },
        ],
        layout: 'radio',
      },
      initialValue: 'entire_place',
      hidden: ({ document }: HiddenCtx) => document?.type !== 'stay',
      group: 'general',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Published', value: 'published' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      group: 'general',
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      validation: (rule) => rule.required(),
      group: 'general',
    }),
    defineField({
      name: 'county',
      title: 'County',
      type: 'string',
      options: {
        list: KENYAN_COUNTIES.map((c) => ({ title: c, value: c })),
      },
      group: 'general',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 2,
      group: 'general',
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      description: 'Price in KES. When renting type is "Both", this is the entire-property price — room prices are set per room in the Rooms tab.',
      validation: (rule) => rule.min(0),
      hidden: ({ document }: HiddenCtx) => document?.rentingType === 'by_room',
      group: 'general',
    }),
    defineField({
      name: 'priceUnit',
      title: 'Price per',
      type: 'string',
      options: {
        list: [
          { title: 'Per Night', value: 'night' },
          { title: 'Per Person', value: 'person' },
          { title: 'Per Day', value: 'day' },
          { title: 'Per Session', value: 'session' },
          { title: 'Per Ticket', value: 'ticket' },
        ],
      },
      group: 'general',
    }),
    defineField({
      name: 'bookingType',
      title: 'Booking method',
      type: 'string',
      options: {
        list: [
          { title: 'Contact Form', value: 'contact_form' },
          { title: 'Instant Book', value: 'instant' },
          { title: 'Request to Book', value: 'request' },
        ],
      },
      initialValue: 'contact_form',
      group: 'general',
    }),
    defineField({
      name: 'maxGuests',
      title: 'Maximum guests',
      type: 'number',
      validation: (rule) => rule.min(1),
      group: 'general',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'quickFactsBlock' },
        { type: 'tipCardBlock' },
        { type: 'packingListBlock' },
        { type: 'budgetTableBlock' },
        { type: 'whoIsItForBlock' },
        { type: 'pullQuoteBlock' },
        { type: 'photoRowBlock' },
        { type: 'statRowBlock' },
      ],
      group: 'general',
    }),
    defineField({
      name: 'amenities',
      title: 'Amenities',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: AMENITIES.map((a) => ({ title: a, value: a })),
      },
      group: 'general',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Select from suggestions or type custom tags for search and filtering',
      options: {
        list: TAG_SUGGESTIONS.map((t) => ({ title: t, value: t })),
      },
      group: 'general',
    }),
    defineField({
      name: 'host',
      title: 'Host',
      type: 'reference',
      to: [{ type: 'host' }],
      description: 'The host who owns this listing',
      group: 'general',
    }),
    defineField({
      name: 'hostName',
      title: 'Host name (deprecated)',
      type: 'string',
      description: 'Legacy field — use Host reference instead',
      hidden: true,
      group: 'general',
    }),
    defineField({
      name: 'highlights',
      title: 'Highlights',
      type: 'array',
      description: 'Up to 6 key features shown on the listing page',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'emoji', title: 'Emoji', type: 'string', validation: (rule: any) => rule.required() },
            { name: 'title', title: 'Title', type: 'string', validation: (rule: any) => rule.required() },
            { name: 'description', title: 'Description', type: 'string', validation: (rule: any) => rule.required() },
          ],
          preview: {
            select: { title: 'title', subtitle: 'description', media: 'emoji' },
            prepare({ title, subtitle, media }: { title?: string; subtitle?: string; media?: string }) {
              return { title: `${media ?? ''} ${title ?? ''}`, subtitle }
            },
          },
        },
      ],
      validation: (rule) => rule.max(6),
      group: 'general',
    }),

    /* ═══════════════════════════════════════════════════
       MEDIA GROUP
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (rule: any) => rule.required(),
            },
          ],
        },
      ],
      validation: (rule) =>
        rule.custom((photos, context) => {
          const status = (context.document as { status?: string })?.status
          if (status === 'published' && (!photos || photos.length === 0)) {
            return 'At least 1 photo is required for published listings'
          }
          return true
        }),
      group: 'media',
    }),

    /* ═══════════════════════════════════════════════════
       🛏️ ROOMS GROUP
       Shown when type === "stay" AND rentingType is
       "by_room" or "both"
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'rooms',
      title: 'Rooms',
      type: 'array',
      description: 'Add individual rooms guests can book',
      hidden: ({ document }: HiddenCtx) =>
        !(document?.type === 'stay' && (document?.rentingType === 'by_room' || document?.rentingType === 'both')),
      group: 'rooms',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'roomName', title: 'Room Name', type: 'string', validation: (rule: any) => rule.required() },
            { name: 'roomDescription', title: 'Description', type: 'text', rows: 3 },
            {
              name: 'photos',
              title: 'Photos',
              type: 'array',
              of: [{ type: 'image', options: { hotspot: true } }],
              validation: (rule: any) => rule.max(8),
            },
            { name: 'pricePerNight', title: 'Price per night', type: 'number', description: 'KSh', validation: (rule: any) => rule.required().min(0) },
            { name: 'capacity', title: 'Capacity (guests)', type: 'number', validation: (rule: any) => rule.required().min(1) },
            {
              name: 'bedType',
              title: 'Bed Type',
              type: 'string',
              options: {
                list: [
                  { title: 'King', value: 'King' },
                  { title: 'Queen', value: 'Queen' },
                  { title: 'Twin', value: 'Twin' },
                  { title: 'Double', value: 'Double' },
                  { title: 'Single', value: 'Single' },
                  { title: 'Bunk beds', value: 'Bunk beds' },
                ],
              },
            },
            { name: 'roomSizeSqm', title: 'Room size (sqm)', type: 'number' },
            {
              name: 'roomAmenities',
              title: 'Room Amenities',
              type: 'array',
              of: [{ type: 'string' }],
              options: {
                list: [
                  { title: 'AC', value: 'AC' },
                  { title: 'Fan', value: 'Fan' },
                  { title: 'Sea view', value: 'Sea view' },
                  { title: 'Garden view', value: 'Garden view' },
                  { title: 'Pool view', value: 'Pool view' },
                  { title: 'Balcony', value: 'Balcony' },
                  { title: 'Terrace', value: 'Terrace' },
                  { title: 'Mini bar', value: 'Mini bar' },
                  { title: 'In-room safe', value: 'In-room safe' },
                  { title: 'Bathtub', value: 'Bathtub' },
                  { title: 'Shower only', value: 'Shower only' },
                  { title: 'Smart TV', value: 'Smart TV' },
                  { title: 'Work desk', value: 'Work desk' },
                  { title: 'Kitchenette', value: 'Kitchenette' },
                ],
              },
            },
            { name: 'isAvailable', title: 'Available', type: 'boolean', initialValue: true },
            { name: 'quantity', title: 'Quantity', type: 'number', initialValue: 1, description: 'How many of this room type' },
          ],
          preview: {
            select: { title: 'roomName', bedType: 'bedType', price: 'pricePerNight', capacity: 'capacity' },
            prepare({ title, bedType, price, capacity }: { title?: string; bedType?: string; price?: number; capacity?: number }) {
              return {
                title: title ?? 'Untitled Room',
                subtitle: [bedType, price ? `KSh ${price.toLocaleString()}/night` : null, capacity ? `${capacity} guests` : null].filter(Boolean).join(' · '),
              }
            },
          },
        },
      ],
    }),

    /* ═══════════════════════════════════════════════════
       🍽️ RESTAURANT GROUP
       Shown when subcategory === "restaurants"
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'cuisine',
      title: 'Cuisine',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Kenyan', value: 'Kenyan' },
          { title: 'Swahili', value: 'Swahili' },
          { title: 'Indian', value: 'Indian' },
          { title: 'Chinese', value: 'Chinese' },
          { title: 'Italian', value: 'Italian' },
          { title: 'Mediterranean', value: 'Mediterranean' },
          { title: 'BBQ', value: 'BBQ' },
          { title: 'Seafood', value: 'Seafood' },
          { title: 'Vegetarian', value: 'Vegetarian' },
          { title: 'Fast Food', value: 'Fast Food' },
          { title: 'Japanese', value: 'Japanese' },
          { title: 'French', value: 'French' },
          { title: 'Fusion', value: 'Fusion' },
          { title: 'Vegan', value: 'Vegan' },
        ],
      },
      hidden: isNotRestaurant,
      group: 'restaurant',
    }),
    defineField({
      name: 'priceRange',
      title: 'Price Range',
      type: 'string',
      options: {
        list: [
          { title: '$ Budget', value: 'budget' },
          { title: '$$ Mid-Range', value: 'mid-range' },
          { title: '$$$ Fine Dining', value: 'fine-dining' },
        ],
      },
      hidden: isNotRestaurant,
      group: 'restaurant',
    }),
    defineField({
      name: 'openingHours',
      title: 'Opening Hours',
      type: 'text',
      rows: 3,
      description: 'e.g. "Daily 8:00 AM – 10:30 PM" or "Mon–Sat 11 AM – 9 PM. Closed Sundays."',
      hidden: isNotRestaurant,
      group: 'restaurant',
    }),
    defineField({
      name: 'atmosphere',
      title: 'Atmosphere',
      type: 'string',
      options: {
        list: [
          { title: 'Casual', value: 'casual' },
          { title: 'Romantic', value: 'romantic' },
          { title: 'Family-Friendly', value: 'family' },
          { title: 'Lively / Vibrant', value: 'lively' },
          { title: 'Fine Dining', value: 'fine-dining' },
          { title: 'Beachfront', value: 'beachfront' },
          { title: 'Rooftop', value: 'rooftop' },
          { title: 'Garden', value: 'garden' },
        ],
      },
      hidden: isNotRestaurant,
      group: 'restaurant',
    }),
    defineField({
      name: 'menu',
      title: 'Featured Menu Items',
      type: 'array',
      description: 'Highlight up to 10 signature dishes',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Dish Name', type: 'string', validation: (rule: any) => rule.required() },
            { name: 'description', title: 'Description', type: 'string' },
            { name: 'price', title: 'Price (KES)', type: 'number' },
          ],
          preview: {
            select: { title: 'name', subtitle: 'description', price: 'price' },
            prepare({ title, subtitle, price }: { title?: string; subtitle?: string; price?: number }) {
              return {
                title: title ?? 'Untitled',
                subtitle: price ? `KSh ${price} — ${subtitle ?? ''}` : subtitle ?? '',
              }
            },
          },
        },
      ],
      validation: (rule) => rule.max(10),
      hidden: isNotRestaurant,
      group: 'restaurant',
    }),
    defineField({
      name: 'reservationRequired',
      title: 'Reservation Required',
      type: 'boolean',
      initialValue: false,
      hidden: isNotRestaurant,
      group: 'restaurant',
    }),

    /* ═══════════════════════════════════════════════════
       🧭 EXPERIENCE GROUP
       Shown when type === "experience" AND NOT restaurant
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      description: 'How long the experience takes',
      options: {
        list: [
          { title: '1 hour', value: '1-hour' },
          { title: '2 hours', value: '2-hours' },
          { title: '3 hours', value: '3-hours' },
          { title: 'Half day (4–5 hrs)', value: 'half-day' },
          { title: 'Full day (6–8 hrs)', value: 'full-day' },
          { title: 'Multi-day', value: 'multi-day' },
        ],
      },
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),
    defineField({
      name: 'maxGroupSize',
      title: 'Max Group Size',
      type: 'number',
      description: 'Maximum participants per session',
      validation: (rule) => rule.min(1),
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),
    defineField({
      name: 'difficulty',
      title: 'Difficulty',
      type: 'string',
      options: {
        list: [
          { title: 'Easy — suitable for everyone', value: 'easy' },
          { title: 'Moderate — basic fitness required', value: 'moderate' },
          { title: 'Advanced — experience required', value: 'advanced' },
        ],
        layout: 'radio',
      },
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),
    defineField({
      name: 'minAge',
      title: 'Minimum Age',
      type: 'number',
      description: 'Minimum age for participants (leave blank if none)',
      validation: (rule) => rule.min(0),
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),
    defineField({
      name: 'languages',
      title: 'Languages',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Languages the guide/host speaks',
      options: {
        list: [
          { title: 'English', value: 'English' },
          { title: 'Swahili', value: 'Swahili' },
          { title: 'Italian', value: 'Italian' },
          { title: 'French', value: 'French' },
          { title: 'German', value: 'German' },
          { title: 'Spanish', value: 'Spanish' },
        ],
      },
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),
    defineField({
      name: 'included',
      title: "What's Included",
      type: 'array',
      of: [{ type: 'string' }],
      description: 'e.g. "Lunch", "Park entrance fees", "Transport from hotel"',
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),
    defineField({
      name: 'notIncluded',
      title: 'Not Included',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'e.g. "Tips", "Travel insurance", "Personal expenses"',
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),
    defineField({
      name: 'guideInfo',
      title: 'Guide / Host Info',
      type: 'text',
      rows: 3,
      description: 'Brief bio or credentials of the guide or host',
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),
    defineField({
      name: 'meetingPoint',
      title: 'Meeting Point',
      type: 'string',
      description: 'Where participants should meet (e.g. "Watamu Marine Park gate")',
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),
    defineField({
      name: 'whatToBring',
      title: 'What to Bring',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'e.g. "Sunscreen", "Comfortable shoes", "Snorkel gear (optional)"',
      hidden: ({ document }: HiddenCtx) => !isExperience({ document }),
      group: 'experience',
    }),

    /* ═══════════════════════════════════════════════════
       🎫 EVENT GROUP
       Shown when type === "event"
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'eventDate',
      title: 'Event Start Date & Time',
      type: 'datetime',
      description: 'When the event starts (leave blank for recurring events)',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'eventEndDate',
      title: 'Event End Date & Time',
      type: 'datetime',
      description: 'When the event ends (optional)',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'string',
      description: 'Name of the venue (e.g. "Papa Remo Beach Club")',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'performers',
      title: 'Performers / Lineup',
      type: 'array',
      description: 'Add performers, DJs, speakers, or schedule items',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Name', type: 'string', validation: (rule: any) => rule.required() },
            { name: 'role', title: 'Role', type: 'string', description: 'e.g. "DJ", "Live Band", "Speaker"' },
            { name: 'image', title: 'Photo', type: 'image', options: { hotspot: true } },
            { name: 'bio', title: 'Bio', type: 'text', rows: 3 },
          ],
          preview: {
            select: { title: 'name', subtitle: 'role', media: 'image' },
            prepare({ title, subtitle, media }: { title?: string; subtitle?: string; media?: unknown }) {
              return {
                title: title ?? 'TBA',
                subtitle: subtitle ?? '',
                media,
              }
            },
          },
        },
      ],
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'ticketTypes',
      title: 'Ticket Types',
      type: 'array',
      description: 'Different ticket tiers (e.g. General, VIP, Early Bird)',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Ticket Name', type: 'string', validation: (rule: any) => rule.required() },
            { name: 'price', title: 'Price (KES)', type: 'number', validation: (rule: any) => rule.required().min(0) },
            { name: 'description', title: 'Description', type: 'string' },
            { name: 'available', title: 'Available', type: 'number', description: 'Number of tickets available' },
            { name: 'isSoldOut', title: 'Sold Out', type: 'boolean', initialValue: false },
          ],
          preview: {
            select: { title: 'name', price: 'price', subtitle: 'description', isSoldOut: 'isSoldOut' },
            prepare({ title, price, subtitle, isSoldOut }: { title?: string; price?: number; subtitle?: string; isSoldOut?: boolean }) {
              return {
                title: `${isSoldOut ? '🚫 ' : ''}${title ?? 'Ticket'} — KSh ${(price ?? 0).toLocaleString()}`,
                subtitle: subtitle ?? '',
              }
            },
          },
        },
      ],
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'ageRestriction',
      title: 'Age Restriction',
      type: 'string',
      options: {
        list: [
          { title: 'All Ages', value: 'all-ages' },
          { title: '18+', value: '18+' },
          { title: '21+', value: '21+' },
        ],
      },
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'dresscode',
      title: 'Dress Code',
      type: 'string',
      description: 'e.g. "Smart casual", "Beach wear", "All white"',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'venueAddress',
      title: 'Venue Address',
      type: 'string',
      description: 'Full address of the venue',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'doorsOpen',
      title: 'Doors Open',
      type: 'string',
      description: 'e.g. "18:00"',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'organizer',
      title: 'Organizer Name',
      type: 'string',
      description: 'Display name of the event organizer',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'organizerSlug',
      title: 'Organizer Slug',
      type: 'string',
      description: 'Host profile slug — links to /hosts/[slug]',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'isFree',
      title: 'Free Event',
      type: 'boolean',
      initialValue: false,
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'priceFrom',
      title: 'Price From (KES)',
      type: 'number',
      description: 'Lowest ticket price — shown on cards and mobile bar',
      validation: (rule) => rule.min(0),
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'totalCapacity',
      title: 'Total Capacity',
      type: 'number',
      validation: (rule) => rule.min(0),
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'ticketLink',
      title: 'External Ticket Link',
      type: 'url',
      description: 'Fallback link to buy tickets externally (e.g. Eventbrite)',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'isRecurring',
      title: 'Recurring Event',
      type: 'boolean',
      initialValue: false,
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'recurrenceRule',
      title: 'Recurrence Rule',
      type: 'string',
      description: 'e.g. "Every Friday", "First Saturday of each month"',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured Event',
      type: 'boolean',
      description: 'Show in featured sections on the events landing page',
      initialValue: false,
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'hostId',
      title: 'Host User ID (Supabase)',
      type: 'string',
      description: 'Supabase user ID of the host who created this event',
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),
    defineField({
      name: 'createdByHost',
      title: 'Created by Host',
      type: 'boolean',
      initialValue: false,
      hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
      group: 'event',
    }),

    /* ═══════════════════════════════════════════════════
       🔧 SERVICE GROUP
       Shown when type === "service"
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'serviceArea',
      title: 'Service Area',
      type: 'string',
      description: 'Where this service operates (e.g. "Watamu & Kilifi", "Nationwide")',
      hidden: ({ document }: HiddenCtx) => !isService({ document }),
      group: 'service',
    }),
    defineField({
      name: 'responseTime',
      title: 'Typical Response Time',
      type: 'string',
      options: {
        list: [
          { title: 'Within 1 hour', value: 'within-1-hour' },
          { title: 'Same day', value: 'same-day' },
          { title: 'Within 24 hours', value: 'within-24-hours' },
          { title: 'Within 48 hours', value: 'within-48-hours' },
        ],
      },
      hidden: ({ document }: HiddenCtx) => !isService({ document }),
      group: 'service',
    }),
    defineField({
      name: 'pricingTable',
      title: 'Pricing Table',
      type: 'array',
      description: 'List services with their prices',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'service', title: 'Service', type: 'string', validation: (rule: any) => rule.required() },
            { name: 'price', title: 'Price (KES)', type: 'number', validation: (rule: any) => rule.required().min(0) },
            { name: 'unit', title: 'Per', type: 'string', description: 'e.g. "session", "hour", "item"' },
          ],
          preview: {
            select: { title: 'service', price: 'price', unit: 'unit' },
            prepare({ title, price, unit }: { title?: string; price?: number; unit?: string }) {
              return {
                title: title ?? 'Service',
                subtitle: `KSh ${(price ?? 0).toLocaleString()}${unit ? ` / ${unit}` : ''}`,
              }
            },
          },
        },
      ],
      hidden: ({ document }: HiddenCtx) => !isService({ document }),
      group: 'service',
    }),
    defineField({
      name: 'providerInfo',
      title: 'Provider Info',
      type: 'text',
      rows: 4,
      description: 'Background info, qualifications, or certifications of the service provider',
      hidden: ({ document }: HiddenCtx) => !isService({ document }),
      group: 'service',
    }),
    defineField({
      name: 'serviceTypes',
      title: 'Service Types',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Types of services offered (e.g. "Haircut", "Colour", "Braids")',
      hidden: ({ document }: HiddenCtx) => !isService({ document }),
      group: 'service',
    }),

    /* ═══════════════════════════════════════════════════
       SEO GROUP
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'seoTitle',
      title: 'SEO title (overrides default)',
      type: 'string',
      validation: (rule) => rule.max(60),
      group: 'seo',
    }),
    defineField({
      name: 'seoDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160),
      group: 'seo',
    }),

    /* ═══════════════════════════════════════════════════
       ✅ VERIFICATION GROUP
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'isVerified',
      title: 'Verified listing',
      type: 'boolean',
      description: 'Check once you have confirmed this is a real, legitimate listing',
      initialValue: false,
      group: 'verification',
    }),
    defineField({
      name: 'verificationStatus',
      title: 'Verification status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending — not yet reviewed', value: 'pending' },
          { title: 'Claimed — owner has been in touch', value: 'claimed' },
          { title: 'Verified — reviewed and approved', value: 'verified' },
        ],
      },
      initialValue: 'pending',
      group: 'verification',
    }),

    /* ═══════════════════════════════════════════════════
       NOTIFICATIONS GROUP
       ═══════════════════════════════════════════════════ */
    defineField({
      name: 'notificationEmail1',
      title: 'Notification email 1 (e.g. host email)',
      type: 'string',
      description: 'Enquiries for this listing will also be sent here',
      validation: (rule) => rule.email(),
      group: 'notifications',
    }),
    defineField({
      name: 'notificationEmail2',
      title: 'Notification email 2 (e.g. co-host or manager)',
      type: 'string',
      description: 'A second address to copy on all enquiries',
      validation: (rule) => rule.email(),
      group: 'notifications',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'city',
      media: 'photos.0',
    },
  },
})
