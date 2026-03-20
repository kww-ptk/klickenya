import { defineType, defineField } from 'sanity'

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

export default defineType({
  name: 'listing',
  title: 'Listing',
  type: 'document',
  groups: [
    { name: 'details', title: 'Details', default: true },
    { name: 'notifications', title: 'Notifications' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: "Clear, searchable title e.g. 'Maasai Mara Full-Day Game Drive'",
      validation: (rule) => rule.required(),
      group: 'details',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Auto-generated from title. Used in the URL.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
      group: 'details',
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
      group: 'details',
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
      group: 'details',
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
      group: 'details',
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      validation: (rule) => rule.required(),
      group: 'details',
    }),
    defineField({
      name: 'county',
      title: 'County',
      type: 'string',
      options: {
        list: KENYAN_COUNTIES.map((c) => ({ title: c, value: c })),
      },
      group: 'details',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 2,
      group: 'details',
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      description: 'Price in KES',
      validation: (rule) => rule.min(0),
      group: 'details',
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
      group: 'details',
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
      group: 'details',
    }),
    defineField({
      name: 'maxGuests',
      title: 'Maximum guests',
      type: 'number',
      validation: (rule) => rule.min(1),
      group: 'details',
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
      group: 'details',
    }),
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
      group: 'details',
    }),
    defineField({
      name: 'amenities',
      title: 'Amenities',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: AMENITIES.map((a) => ({ title: a, value: a })),
      },
      group: 'details',
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
      group: 'details',
    }),
    defineField({
      name: 'hostName',
      title: 'Host name',
      type: 'string',
      description: 'Name of the person or business hosting this listing',
      group: 'details',
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
      group: 'details',
    }),
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
        ],
      },
      hidden: ({document}: {document: {type?: string; subcategory?: string}}) => document?.type !== 'restaurant' && document?.subcategory !== 'restaurants',
      group: 'details',
    }),
    defineField({
      name: 'priceRange',
      title: 'Price Range',
      type: 'string',
      options: {
        list: [
          { title: 'Budget', value: 'budget' },
          { title: 'Mid-Range', value: 'mid-range' },
          { title: 'Fine Dining', value: 'fine-dining' },
        ],
      },
      hidden: ({document}: {document: {type?: string; subcategory?: string}}) => document?.type !== 'restaurant' && document?.subcategory !== 'restaurants',
      group: 'details',
    }),
    defineField({
      name: 'openingHours',
      title: 'Opening Hours',
      type: 'text',
      rows: 3,
      hidden: ({document}: {document: {type?: string; subcategory?: string}}) => document?.type !== 'restaurant' && document?.subcategory !== 'restaurants',
      group: 'details',
    }),
    defineField({
      name: 'reservationRequired',
      title: 'Reservation Required',
      type: 'boolean',
      initialValue: false,
      hidden: ({document}: {document: {type?: string; subcategory?: string}}) => document?.type !== 'restaurant' && document?.subcategory !== 'restaurants',
      group: 'details',
    }),
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
    defineField({
      name: 'seoTitle',
      title: 'SEO title (overrides default)',
      type: 'string',
      validation: (rule) => rule.max(60),
      group: 'details',
    }),
    defineField({
      name: 'seoDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160),
      group: 'details',
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
