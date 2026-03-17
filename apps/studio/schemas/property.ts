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
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: "e.g. '3-Bedroom Apartment in Kilimani'",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
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
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      description: 'Price in KES',
      validation: (rule) => rule.required().min(0),
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
    }),
    defineField({
      name: 'bedrooms',
      title: 'Bedrooms',
      type: 'number',
    }),
    defineField({
      name: 'bathrooms',
      title: 'Bathrooms',
      type: 'number',
    }),
    defineField({
      name: 'sizeSqm',
      title: 'Floor area (sqm)',
      type: 'number',
    }),
    defineField({
      name: 'landSizeAcres',
      title: 'Land size (acres) — for land listings',
      type: 'number',
    }),
    defineField({
      name: 'yearBuilt',
      title: 'Year Built',
      type: 'number',
    }),
    defineField({
      name: 'neighbourhood',
      title: 'Neighbourhood',
      type: 'string',
      description: 'e.g. Kilimani, Westlands, Karen',
      validation: (rule) => rule.required(),
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
      name: 'lat',
      title: 'Latitude',
      type: 'number',
    }),
    defineField({
      name: 'lng',
      title: 'Longitude',
      type: 'number',
    }),
    defineField({
      name: 'features',
      title: 'Features',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: PROPERTY_FEATURES.map((f) => ({ title: f, value: f })),
      },
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
          if (status === 'available' && (!photos || photos.length === 0)) {
            return 'At least 1 photo is required for available properties'
          }
          return true
        }),
    }),
    defineField({
      name: 'isNewDevelopment',
      title: 'New development / off-plan',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'agent',
      title: 'Agent',
      type: 'reference',
      to: [{ type: 'agent' }],
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured',
      type: 'boolean',
      description: 'Show in featured properties section',
      initialValue: false,
    }),
    defineField({
      name: 'previousPrice',
      title: 'Previous Price',
      type: 'number',
      description: "Previous price — shows 'Reduced' badge if set",
    }),
    defineField({
      name: 'completionPercentage',
      title: 'Completion %',
      type: 'number',
      description: 'Completion % for new developments',
      validation: (rule) => rule.min(0).max(100),
      hidden: ({document}: {document: {isNewDevelopment?: boolean}}) => !document?.isNewDevelopment,
    }),
    defineField({
      name: 'developerName',
      title: 'Developer Name',
      type: 'string',
      description: 'Developer/builder name',
      hidden: ({document}: {document: {isNewDevelopment?: boolean}}) => !document?.isNewDevelopment,
    }),
    defineField({
      name: 'unitsAvailable',
      title: 'Units Available',
      type: 'number',
      description: 'Units still available',
      hidden: ({document}: {document: {isNewDevelopment?: boolean}}) => !document?.isNewDevelopment,
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
