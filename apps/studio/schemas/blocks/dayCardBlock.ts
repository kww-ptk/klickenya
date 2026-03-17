import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'dayCardBlock',
  title: 'Day Card',
  type: 'object',
  preview: {
    select: { dayNumber: 'dayNumber', title: 'title' },
    prepare({ dayNumber, title }) {
      return { title: `Day ${dayNumber ?? '?'} — ${title ?? ''}` }
    },
  },
  fields: [
    defineField({ name: 'dayNumber', title: 'Day Number', type: 'number', validation: (rule) => rule.required() }),
    defineField({ name: 'location', title: 'Location', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'meta', title: 'Meta (e.g. drive time)', type: 'string' }),
    defineField({
      name: 'timeline',
      title: 'Timeline',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'time', title: 'Time', type: 'string' }),
          defineField({ name: 'title', title: 'Title', type: 'string' }),
          defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
          defineField({ name: 'badge', title: 'Badge (optional)', type: 'string' }),
        ],
        preview: {
          select: { time: 'time', title: 'title' },
          prepare({ time, title }) {
            return { title: `${time || ''} ${title || ''}`.trim() }
          },
        },
      }],
    }),
    defineField({
      name: 'costs',
      title: 'Cost Pills',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
})
