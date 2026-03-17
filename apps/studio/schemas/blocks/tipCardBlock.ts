import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'tipCardBlock',
  title: 'Tip Card',
  type: 'object',
  preview: {
    select: { variant: 'variant', text: 'text' },
    prepare({ variant, text }) {
      return { title: `${variant ?? 'tip'} — ${(text ?? '').slice(0, 50)}` }
    },
  },
  fields: [
    defineField({
      name: 'variant',
      title: 'Variant',
      type: 'string',
      options: { list: ['tip', 'warning', 'teal', 'purple'] },
      initialValue: 'tip',
    }),
    defineField({ name: 'icon', title: 'Icon Emoji', type: 'string', initialValue: '💡' }),
    defineField({ name: 'label', title: 'Label', type: 'string' }),
    defineField({ name: 'text', title: 'Text', type: 'text', rows: 3 }),
  ],
})
