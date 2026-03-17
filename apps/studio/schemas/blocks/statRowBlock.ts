import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'statRowBlock',
  title: 'Stat Row',
  type: 'object',
  preview: {
    select: { stats: 'stats' },
    prepare({ stats }) {
      const nums = (stats ?? []).map((s: any) => s.number).join(' · ')
      return { title: `Stats: ${nums || '(empty)'}` }
    },
  },
  fields: [
    defineField({
      name: 'stats',
      title: 'Stats',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'number', title: 'Number', type: 'string' }),
          defineField({ name: 'label', title: 'Label', type: 'string' }),
        ],
        preview: {
          select: { number: 'number', label: 'label' },
          prepare({ number, label }) {
            return { title: number, subtitle: label }
          },
        },
      }],
      validation: (rule) => rule.max(3),
    }),
  ],
})
