import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'distanceChipsBlock',
  title: 'Distance Chips',
  type: 'object',
  preview: {
    select: { chips: 'chips' },
    prepare({ chips }) {
      return { title: 'Distance Info', subtitle: `${(chips?.length ?? 0)} chips` }
    },
  },
  fields: [
    defineField({
      name: 'chips',
      title: 'Chips',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({
            name: 'icon',
            title: 'Icon',
            type: 'string',
            options: { list: ['pin', 'clock'] },
            initialValue: 'pin',
          }),
          defineField({ name: 'text', title: 'Text', type: 'string' }),
        ],
        preview: {
          select: { icon: 'icon', text: 'text' },
          prepare({ icon, text }) {
            return { title: `${icon === 'clock' ? '🕐' : '📍'} ${text || ''}` }
          },
        },
      }],
    }),
  ],
})
