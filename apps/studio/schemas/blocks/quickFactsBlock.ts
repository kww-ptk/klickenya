import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'quickFactsBlock',
  title: 'Quick Facts',
  type: 'object',
  preview: {
    select: { title: 'title', items: 'items' },
    prepare({ title, items }) {
      return { title: title || 'Quick Facts', subtitle: `${(items?.length ?? 0)} items` }
    },
  },
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: '✦ Quick Facts',
    }),
    defineField({
      name: 'accentColor',
      title: 'Accent Color',
      type: 'string',
      options: { list: ['amber', 'purple', 'teal'] },
      initialValue: 'amber',
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'icon', title: 'Icon Emoji', type: 'string' }),
          defineField({ name: 'label', title: 'Label', type: 'string' }),
          defineField({ name: 'value', title: 'Value', type: 'string' }),
        ],
        preview: {
          select: { icon: 'icon', label: 'label', value: 'value' },
          prepare({ icon, label, value }) {
            return { title: `${icon || ''} ${label || ''}`.trim(), subtitle: value }
          },
        },
      }],
      validation: (rule) => rule.max(6),
    }),
  ],
})
