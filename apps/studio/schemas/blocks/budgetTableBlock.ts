import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'budgetTableBlock',
  title: 'Budget Table',
  type: 'object',
  preview: {
    select: { rows: 'rows' },
    prepare({ rows }) {
      return { title: 'Budget Table', subtitle: `${(rows?.length ?? 0)} rows` }
    },
  },
  fields: [
    defineField({
      name: 'columns',
      title: 'Column Headers',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'label', title: 'Label', type: 'string' }),
          defineField({ name: 'values', title: 'Values', type: 'array', of: [{ type: 'string' }] }),
        ],
        preview: {
          select: { label: 'label' },
          prepare({ label }) { return { title: label } },
        },
      }],
    }),
    defineField({
      name: 'totalRow',
      title: 'Total Row',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Optional footer totals row',
    }),
  ],
})
