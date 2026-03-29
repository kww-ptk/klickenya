import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'host',
  title: 'Host',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Full name or business name',
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
      name: 'photo',
      title: 'Profile photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 3,
      description: 'Short bio or description (shown publicly)',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      description: 'Not shown publicly — for internal use',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
      description: 'Not shown publicly — for internal use',
    }),
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
      name: 'planTier',
      title: 'Plan tier',
      type: 'string',
      options: {
        list: [
          { title: 'Basic', value: 'basic' },
          { title: 'Pro', value: 'pro' },
          { title: 'Agency', value: 'agency' },
          { title: 'Grow', value: 'grow' },
        ],
      },
      initialValue: 'basic',
    }),
    defineField({
      name: 'supabaseUserId',
      title: 'Supabase User ID',
      type: 'string',
      description: 'Links to auth.users.id — do not edit manually',
      readOnly: true,
    }),
    defineField({
      name: 'listings',
      title: 'Listings',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'listing' }] }],
      description: 'Listings owned by this host',
    }),
    defineField({
      name: 'verified',
      title: 'Verified',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'createdAt',
      title: 'Created at',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'email',
      media: 'photo',
    },
  },
})
