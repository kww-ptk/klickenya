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
          defineField({ name: 'label', title: 'Label', type: 'string' }),
          defineField({ name: 'value', title: 'Value', type: 'string' }),
        ],
        preview: {
          select: { icon: 'icon', label: 'label', value: 'value' },
          prepare({ icon, label, value }) {
            return { title: `${icon === 'clock' ? '🕐' : '📍'} ${label || ''}: ${value || ''}` }
          },
        },
      }],
    }),
  ],
})
