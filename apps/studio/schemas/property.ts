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

const PROPERTY_FEATURES = [
  'Pool', 'Gym', 'Guard/Security', 'Generator', 'Borehole',
  'Parking', 'Lift/Elevator', 'CCTV', 'Servant Quarters',
  'Garden', 'Rooftop', 'Sea View', 'City View', 'Gated Community',
]

export default defineType({
  name: 'property',
  title: 'Property',
  type: 'document',
  groups: [
    { name: 'details', title: 'Details', default: true },
    { name: 'notifications', title: 'Notifications' },
  ],
  fields: [
    defineField({
      name: 'partner',
      title: 'Partner (white-label owner)',
      description:
        "Leave empty for Klickenya house listings. Set to a partner to make this property belong to that partner's branded site.",
      type: 'reference',
      to: [{ type: 'partner' }],
      group: 'details',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: "e.g. '3-Bedroom Apartment in Kilimani'",
      validation: (rule) => rule.required(),
      group: 'details',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
      group: 'details',
    }),
    defineField({
      name: 'listingCategory',
      title: 'Listing Category',
      type: 'string',
      options: {
        list: [
          { title: 'For Sale', value: 'for-sale' },
          { title: 'For Rent', value: 'for-rent' },
          { title: 'Land', value: 'land' },
          { title: 'Commercial', value: 'commercial' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
      group: 'details',
    }),
    defineField({
      name: 'propertyType',
      title: 'Property Type',
      type: 'string',
      options: {
        list: [
          { title: 'Apartment', value: 'apartment' },
          { title: 'House', value: 'house' },
          { title: 'Villa', value: 'villa' },
          { title: 'Studio', value: 'studio' },
          { title: 'Townhouse', value: 'townhouse' },
          { title: 'Land', value: 'land' },
          { title: 'Commercial', value: 'commercial' },
        ],
      },
      group: 'details',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Available', value: 'available' },
          { title: 'Under Offer', value: 'under-offer' },
          { title: 'Sold', value: 'sold' },
          { title: 'Let', value: 'let' },
          { title: 'Draft', value: 'draft' },
        ],
      },
      initialValue: 'draft',
      group: 'details',
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      description: 'Price in KES',
      validation: (rule) => rule.required().min(0),
      group: 'details',
    }),
    defineField({
      name: 'priceType',
      title: 'Price Type',
      type: 'string',
      options: {
        list: [
          { title: 'Total Price', value: 'total' },
          { title: 'Per Month', value: 'per-month' },
        ],
      },
      initialValue: 'total',
      group: 'details',
    }),
    defineField({
      name: 'bedrooms',
      title: 'Bedrooms',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'bathrooms',
      title: 'Bathrooms',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'sizeSqm',
      title: 'Floor area (sqm)',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'landSizeAcres',
      title: 'Land size (acres) — for land listings',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'yearBuilt',
      title: 'Year Built',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'neighbourhood',
      title: 'Neighbourhood',
      type: 'string',
      description: 'e.g. Kilimani, Westlands, Karen',
      validation: (rule) => rule.required(),
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
      name: 'lat',
      title: 'Latitude',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'lng',
      title: 'Longitude',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'features',
      title: 'Features',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: PROPERTY_FEATURES.map((f) => ({ title: f, value: f })),
      },
      group: 'details',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }],
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
          if (status === 'available' && (!photos || photos.length === 0)) {
            return 'At least 1 photo is required for available properties'
          }
          return true
        }),
      group: 'details',
    }),
    defineField({
      name: 'isNewDevelopment',
      title: 'New development / off-plan',
      type: 'boolean',
      initialValue: false,
      group: 'details',
    }),
    defineField({
      name: 'agent',
      title: 'Agent',
      type: 'reference',
      to: [{ type: 'agent' }],
      group: 'details',
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured',
      type: 'boolean',
      description: 'Show in featured properties section',
      initialValue: false,
      group: 'details',
    }),
    defineField({
      name: 'previousPrice',
      title: 'Previous Price',
      type: 'number',
      description: "Previous price — shows 'Reduced' badge if set",
      group: 'details',
    }),
    defineField({
      name: 'completionPercentage',
      title: 'Completion %',
      type: 'number',
      description: 'Completion % for new developments',
      validation: (rule) => rule.min(0).max(100),
      hidden: ({document}: {document: {isNewDevelopment?: boolean}}) => !document?.isNewDevelopment,
      group: 'details',
    }),
    defineField({
      name: 'developerName',
      title: 'Developer Name',
      type: 'string',
      description: 'Developer/builder name',
      hidden: ({document}: {document: {isNewDevelopment?: boolean}}) => !document?.isNewDevelopment,
      group: 'details',
    }),
    defineField({
      name: 'unitsAvailable',
      title: 'Units Available',
      type: 'number',
      description: 'Units still available',
      hidden: ({document}: {document: {isNewDevelopment?: boolean}}) => !document?.isNewDevelopment,
      group: 'details',
    }),
    defineField({
      name: 'notificationEmail1',
      title: 'Notification email 1 (e.g. agent email)',
      type: 'string',
      description: 'Enquiries will also be sent here',
      validation: (rule) => rule.email(),
      group: 'notifications',
    }),
    defineField({
      name: 'notificationEmail2',
      title: 'Notification email 2 (e.g. agency admin)',
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
      neighbourhood: 'neighbourhood',
      city: 'city',
      media: 'photos.0',
    },
    prepare({ title, neighbourhood, city, media }) {
      return {
        title,
        subtitle: [neighbourhood, city].filter(Boolean).join(', '),
        media,
      }
    },
  },
})
