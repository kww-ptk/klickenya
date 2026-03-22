import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'eventSliderBlock',
  title: 'Event Slider',
  type: 'object',
  preview: {
    select: { title: 'heading' },
    prepare({ title }) {
      return { title: title || '🎟 Event Slider' }
    },
  },
  fields: [
    defineField({
      name: 'heading',
      title: 'Section heading',
      type: 'string',
      initialValue: 'Upcoming events',
    }),
    defineField({
      name: 'events',
      title: 'Events (leave empty to auto-fetch by city)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'listing' }] }],
      description: 'Pick specific events, or leave empty and set a city to auto-show events in that city.',
    }),
    defineField({
      name: 'filterCity',
      title: 'Auto-filter by city',
      type: 'string',
      description: 'If no events are selected above, show all events in this city.',
    }),
    defineField({
      name: 'ctaText',
      title: 'CTA button text',
      type: 'string',
      initialValue: 'See all events →',
    }),
    defineField({
      name: 'ctaLink',
      title: 'CTA link',
      type: 'string',
      initialValue: '/events',
    }),
  ],
})
