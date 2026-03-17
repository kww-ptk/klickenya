import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'destination',
  title: 'Destination',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          validation: (rule: any) => rule.required(),
        },
      ],
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: "One-line sell e.g. 'Where the wild things roam'",
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'highlights',
      title: 'Key highlights',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'icon', title: 'Icon (emoji)', type: 'string' },
            { name: 'text', title: 'Text', type: 'string' },
          ],
          preview: {
            select: { icon: 'icon', title: 'text' },
            prepare({ icon, title }: { icon?: string; title?: string }) {
              return { title: `${icon ?? ''} ${title ?? ''}`.trim() }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'county',
      title: 'County',
      type: 'string',
    }),
    defineField({
      name: 'relatedListings',
      title: 'Related Listings',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'listing' }] }],
      validation: (rule) => rule.max(6),
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      media: 'heroImage',
    },
  },
})
