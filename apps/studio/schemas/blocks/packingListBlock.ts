import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'packingListBlock',
  title: 'Packing List',
  type: 'object',
  preview: {
    select: { title: 'title', items: 'items' },
    prepare({ title, items }) {
      return { title: title || 'Packing List', subtitle: `${(items?.length ?? 0)} items` }
    },
  },
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', initialValue: 'Packing List' }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'icon', title: 'Icon Emoji', type: 'string' }),
          defineField({ name: 'text', title: 'Text', type: 'string' }),
        ],
        preview: {
          select: { icon: 'icon', text: 'text' },
          prepare({ icon, text }) {
            return { title: `${icon || ''} ${text || ''}`.trim() }
          },
        },
      }],
    }),
  ],
})
