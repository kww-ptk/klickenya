import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'inlineListingBlock',
  title: 'Inline Listing',
  type: 'object',
  preview: {
    select: { title: 'label' },
    prepare({ title }) {
      return { title: title || 'Inline Listing' }
    },
  },
  fields: [
    defineField({
      name: 'listing',
      title: 'Listing',
      type: 'reference',
      to: [{ type: 'listing' }],
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'label', title: 'Label Override', type: 'string' }),
  ],
})
