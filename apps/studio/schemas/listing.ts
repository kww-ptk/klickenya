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

export default defineType({
  name: 'listing',
  title: 'Listing',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: "Clear, searchable title e.g. 'Maasai Mara Full-Day Game Drive'",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Auto-generated from title. Used in the URL.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
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
          { title: 'Restaurant', value: 'restaurant' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
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
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'county',
      title: 'County',
      type: 'string',
      options: {
        list: KENYAN_COUNTIES.map((c) => ({ title: c, value: c })),
      },
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      description: 'Price in KES',
      validation: (rule) => rule.min(0),
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
    }),
    defineField({
      name: 'maxGuests',
      title: 'Maximum guests',
      type: 'number',
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }],
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
    }),
    defineField({
      name: 'amenities',
      title: 'Amenities',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: AMENITIES.map((a) => ({ title: a, value: a })),
      },
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      description: "Keywords for search e.g. 'luxury', 'family-friendly', 'beachfront'",
    }),
    defineField({
      name: 'hostName',
      title: 'Host name',
      type: 'string',
      description: 'Name of the person or business hosting this listing',
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
      hidden: ({document}: {document: {type?: string}}) => document?.type !== 'restaurant',
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
      hidden: ({document}: {document: {type?: string}}) => document?.type !== 'restaurant',
    }),
    defineField({
      name: 'openingHours',
      title: 'Opening Hours',
      type: 'text',
      rows: 3,
      hidden: ({document}: {document: {type?: string}}) => document?.type !== 'restaurant',
    }),
    defineField({
      name: 'reservationRequired',
      title: 'Reservation Required',
      type: 'boolean',
      initialValue: false,
      hidden: ({document}: {document: {type?: string}}) => document?.type !== 'restaurant',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title (overrides default)',
      type: 'string',
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160),
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
