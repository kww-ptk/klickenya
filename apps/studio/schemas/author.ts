import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'author',
  title: 'Author',
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
    }),
    defineField({
      name: 'avatar',
      title: 'Avatar',
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
        },
      ],
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g. Editor, Contributor',
    }),
    // Social links (profileBase alignment)
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
    }),
    defineField({
      name: 'instagram',
      title: 'Instagram',
      type: 'string',
      description: '@handle or full URL',
    }),
    defineField({
      name: 'facebook',
      title: 'Facebook',
      type: 'string',
      description: 'Page name or full URL',
    }),
    defineField({
      name: 'twitter',
      title: 'Twitter / X',
      type: 'string',
      description: '@handle or full URL',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      media: 'avatar',
    },
  },
})
