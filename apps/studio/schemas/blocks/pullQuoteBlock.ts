import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'pullQuoteBlock',
  title: 'Pull Quote',
  type: 'object',
  preview: {
    select: { text: 'text' },
    prepare({ text }) {
      return { title: (text ?? '').slice(0, 60) || 'Pull Quote' }
    },
  },
  fields: [
    defineField({ name: 'text', title: 'Quote Text', type: 'text', rows: 3, validation: (rule) => rule.required() }),
    defineField({ name: 'attribution', title: 'Attribution', type: 'string' }),
    defineField({
      name: 'accentColor',
      title: 'Accent Color',
      type: 'string',
      options: { list: ['amber', 'purple', 'teal', 'blue'] },
      initialValue: 'amber',
    }),
  ],
})
