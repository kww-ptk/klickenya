import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'compareTableBlock',
  title: 'Comparison Table',
  type: 'object',
  preview: {
    select: { columns: 'columns', rows: 'rows' },
    prepare({ columns, rows }) {
      return { title: 'Comparison Table', subtitle: `${(columns?.length ?? 0)} cols × ${(rows?.length ?? 0)} rows` }
    },
  },
  fields: [
    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'label', title: 'Label', type: 'string' }),
          defineField({
            name: 'color',
            title: 'Color',
            type: 'string',
            options: { list: ['teal', 'blue', 'purple', 'slate', 'amber'] },
          }),
        ],
        preview: {
          select: { label: 'label' },
          prepare({ label }) { return { title: label } },
        },
      }],
    }),
    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'criterion', title: 'Criterion', type: 'string' }),
          defineField({ name: 'values', title: 'Values', type: 'array', of: [{ type: 'string' }] }),
          defineField({ name: 'winners', title: 'Winner columns', type: 'array', of: [{ type: 'boolean' }] }),
        ],
        preview: {
          select: { criterion: 'criterion' },
          prepare({ criterion }) { return { title: criterion } },
        },
      }],
    }),
  ],
})
