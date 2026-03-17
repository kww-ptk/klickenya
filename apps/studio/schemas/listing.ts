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
