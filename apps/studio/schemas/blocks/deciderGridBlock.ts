import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'deciderGridBlock',
  title: 'Decider Grid',
  type: 'object',
  preview: {
    select: { cards: 'cards' },
    prepare({ cards }) {
      return { title: 'Decider Grid', subtitle: `${(cards?.length ?? 0)} cards` }
    },
  },
  fields: [
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'label', title: 'Label', type: 'string' }),
          defineField({
            name: 'color',
            title: 'Color',
            type: 'string',
            options: { list: ['teal', 'blue', 'purple'] },
          }),
          defineField({ name: 'title', title: 'Title', type: 'string' }),
          defineField({ name: 'items', title: 'Items', type: 'array', of: [{ type: 'string' }] }),
        ],
        preview: {
          select: { label: 'label', title: 'title' },
          prepare({ label, title }) {
            return { title: `${label || ''} — ${title || ''}` }
          },
        },
      }],
      validation: (rule) => rule.max(3),
    }),
  ],
})
