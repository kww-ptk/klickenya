import { defineType } from 'sanity'

export default defineType({
  name: 'exchangeRateBlock',
  title: 'Live Exchange Rate Widget',
  type: 'object',
  preview: {
    prepare() {
      return { title: '💱 Live Exchange Rates' }
    },
  },
  fields: [
    {
      name: 'placeholder',
      title: 'Note',
      type: 'string',
      description: 'This block renders a live exchange rate widget with USD, EUR, GBP → KES conversion. No configuration needed.',
      readOnly: true,
      initialValue: 'Live exchange rates will be shown here',
    },
  ],
})
