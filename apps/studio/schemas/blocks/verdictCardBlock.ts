import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'verdictCardBlock',
  title: 'Verdict Card',
  type: 'object',
  preview: {
    select: { label: 'label', title: 'title' },
    prepare({ label, title }) {
      return { title: `${label || 'Verdict'} — ${(title ?? '').slice(0, 40)}` }
    },
  },
  fields: [
    defineField({
      name: 'variant',
      title: 'Variant',
      type: 'string',
      options: { list: ['teal', 'blue', 'purple', 'amber'] },
      initialValue: 'teal',
    }),
    defineField({ name: 'label', title: 'Label', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({
      name: 'pros',
      title: 'Pros',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'cons',
      title: 'Cons',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
})
