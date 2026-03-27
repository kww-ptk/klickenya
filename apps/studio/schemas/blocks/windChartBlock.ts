import { defineType } from 'sanity'

export default defineType({
  name: 'windChartBlock',
  title: 'Wind Chart Widget',
  type: 'object',
  preview: {
    prepare() {
      return { title: '🪁 Wind Chart — Watamu' }
    },
  },
  fields: [
    {
      name: 'placeholder',
      title: 'Note',
      type: 'string',
      description: 'Renders live wind forecast + monthly wind chart for Watamu. No configuration needed.',
      readOnly: true,
      initialValue: 'Wind charts will be shown here',
    },
  ],
})
