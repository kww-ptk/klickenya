import { defineType, defineField } from 'sanity'

/**
 * Filterable List
 *
 * A grid of cards with filter chips above it. Readers press a chip and the grid
 * narrows to the items carrying that tag. Built for round up posts where the list
 * is long and people arrive with a specific need ("somewhere on the water",
 * "cheap local food").
 *
 * Item.tags must contain the `value` of a filter for that item to appear under it.
 */
export default defineType({
  name: 'filterableListBlock',
  title: 'Filterable List',
  type: 'object',
  preview: {
    select: { title: 'title', items: 'items', filters: 'filters' },
    prepare({ title, items, filters }) {
      return {
        title: title || 'Filterable List',
        subtitle: `${items?.length ?? 0} items · ${filters?.length ?? 0} filters`,
      }
    },
  },
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 2,
      description: 'Short line above the filter chips explaining what the filters do',
    }),
    defineField({
      name: 'allLabel',
      title: 'Label for the "show everything" chip',
      type: 'string',
      initialValue: 'All',
    }),
    defineField({
      name: 'filters',
      title: 'Filters',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'label', title: 'Label', type: 'string', validation: (rule) => rule.required() }),
          defineField({
            name: 'value',
            title: 'Value',
            type: 'string',
            description: 'Match this against the tags on each item. Lowercase, no spaces.',
            validation: (rule) => rule.required(),
          }),
          defineField({ name: 'icon', title: 'Icon Emoji', type: 'string' }),
          defineField({
            name: 'color',
            title: 'Color',
            type: 'string',
            options: { list: ['teal', 'blue', 'purple', 'amber', 'green'] },
            initialValue: 'teal',
          }),
        ],
        preview: {
          select: { icon: 'icon', label: 'label', value: 'value' },
          prepare({ icon, label, value }) {
            return { title: `${icon || ''} ${label || ''}`.trim(), subtitle: value }
          },
        },
      }],
      validation: (rule) => rule.max(6),
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required() }),
          defineField({
            name: 'tags',
            title: 'Tags',
            type: 'array',
            of: [{ type: 'string' }],
            description: 'Must match filter values for this item to show under that filter',
            options: { layout: 'tags' },
          }),
          defineField({ name: 'priceBand', title: 'Price Band', type: 'string', description: 'e.g. Budget, Mid range, High end' }),
          defineField({ name: 'blurb', title: 'Blurb', type: 'text', rows: 2 }),
          defineField({ name: 'href', title: 'Link', type: 'string', description: 'Internal path or full URL. Leave empty for no link.' }),
        ],
        preview: {
          select: { name: 'name', priceBand: 'priceBand', tags: 'tags' },
          prepare({ name, priceBand, tags }) {
            return { title: name, subtitle: [priceBand, (tags ?? []).join(', ')].filter(Boolean).join(' · ') }
          },
        },
      }],
    }),
  ],
})
