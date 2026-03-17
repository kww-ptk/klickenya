import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'destinationSectionBlock',
  title: 'Destination Section',
  type: 'object',
  preview: {
    select: { number: 'number', title: 'title' },
    prepare({ number, title }) {
      return { title: `${String(number ?? 0).padStart(2, '0')} — ${title ?? ''}` }
    },
  },
  fields: [
    defineField({ name: 'number', title: 'Number', type: 'number' }),
    defineField({ name: 'pill', title: 'Pill Text', type: 'string' }),
    defineField({
      name: 'pillColor',
      title: 'Pill Color',
      type: 'string',
      options: { list: ['teal', 'blue', 'purple'] },
      initialValue: 'teal',
    }),
    defineField({ name: 'title', title: 'Title', type: 'string' }),
  ],
})
