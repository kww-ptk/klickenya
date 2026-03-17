import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'photoRowBlock',
  title: 'Photo Row',
  type: 'object',
  preview: {
    select: { layout: 'layout', photos: 'photos' },
    prepare({ layout, photos }) {
      return { title: `Photo Row (${layout ?? 'cols-2'})`, subtitle: `${(photos?.length ?? 0)} photos` }
    },
  },
  fields: [
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: { list: ['cols-2', 'cols-3', 'cols-3-rev', 'hero-full'] },
      initialValue: 'cols-2',
    }),
    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      of: [{
        type: 'image',
        options: { hotspot: true },
        fields: [
          { name: 'alt', title: 'Alt Text', type: 'string', validation: (rule: any) => rule.required() },
          { name: 'aspectRatio', title: 'Aspect Ratio', type: 'string', options: { list: ['wide', 'tall', 'square', 'cinema'] }, initialValue: 'wide' },
        ],
      }],
    }),
    defineField({ name: 'caption', title: 'Caption', type: 'string' }),
  ],
})
