import { defineType, defineField } from 'sanity'

const HIGHLIGHTS = [
  'Good schools nearby', 'Public transport', 'Shopping centres',
  'Hospitals', 'Parks & green spaces', 'Restaurant scene',
  'Nightlife', 'Quiet & residential', 'Expat-friendly', 'Family-friendly',
]

export default defineType({
  name: 'neighbourhood',
  title: 'Neighbourhood',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'e.g. Kilimani',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
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
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'avgPriceForSale',
      title: 'Avg. sale price (KES)',
      type: 'number',
      description: 'Average property sale price in this neighbourhood',
    }),
    defineField({
      name: 'avgPriceForRent',
      title: 'Avg. monthly rent (KES)',
      type: 'number',
    }),
    defineField({
      name: 'avgPriceSqm',
      title: 'Avg. price per sqm (KES)',
      type: 'number',
    }),
    defineField({
      name: 'avgRentalYield',
      title: 'Avg. rental yield (%)',
      type: 'number',
    }),
    defineField({
      name: 'highlights',
      title: 'Highlights',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: HIGHLIGHTS.map((h) => ({ title: h, value: h })),
      },
    }),
    defineField({
      name: 'commuteInfo',
      title: 'Commute & transport info',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'relatedProperties',
      title: 'Related Properties',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'property' }] }],
      validation: (rule) => rule.max(6),
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'city',
    },
  },
})
