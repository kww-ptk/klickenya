import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Page',
      type: 'string',
      description: 'Which page this content is for.',
      options: {
        list: [
          { title: 'About', value: 'about' },
          { title: 'Contact', value: 'contact' },
          { title: 'How It Works', value: 'how-it-works' },
          { title: 'Privacy Policy', value: 'privacy' },
          { title: 'Terms & Conditions', value: 'terms' },
          { title: 'FAQs', value: 'faqs' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroTitle',
      title: 'Hero headline',
      type: 'string',
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero subtext',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', title: 'Alt Text', type: 'string' },
            { name: 'caption', title: 'Caption', type: 'string' },
          ],
        },
      ],
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
      title: 'title',
      subtitle: 'slug',
    },
  },
})
