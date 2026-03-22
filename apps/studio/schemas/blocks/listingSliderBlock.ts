import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'listingSliderBlock',
  title: 'Listing Slider',
  type: 'object',
  preview: {
    select: { title: 'heading' },
    prepare({ title }) {
      return { title: title || '📋 Listing Slider' }
    },
  },
  fields: [
    defineField({
      name: 'heading',
      title: 'Section heading',
      type: 'string',
      initialValue: 'Featured stays',
    }),
    defineField({
      name: 'listings',
      title: 'Listings',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'listing' }] }],
      validation: (rule) => rule.min(1).max(12),
    }),
  ],
})
