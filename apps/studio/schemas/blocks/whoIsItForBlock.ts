import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'whoIsItForBlock',
  title: 'Who Is It For',
  type: 'object',
  preview: {
    select: { title: 'title', items: 'items' },
    prepare({ title, items }) {
      return { title: title || 'Who Is It For', subtitle: `${(items?.length ?? 0)} items` }
    },
  },
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', initialValue: '🎯 Perfect for...' }),
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
      validation: (rule) => rule.max(8),
    }),
  ],
})
