import { defineType, defineField } from 'sanity'

const SPECIALISATIONS = [
  'Residential', 'Commercial', 'Land', 'Luxury',
  'Student Accommodation', 'Off-plan / New Developments',
]

export default defineType({
  name: 'agent',
  title: 'Agent',
  type: 'document',
  fields: [
    defineField({
      name: 'displayName',
      title: 'Display Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'displayName', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
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
      name: 'agencyName',
      title: 'Agency Name',
      type: 'string',
    }),
    defineField({
      name: 'licenceNumber',
      title: 'EARB licence number',
      type: 'string',
      description: 'Estate Agents Registration Board of Kenya',
    }),
    defineField({
      name: 'isVerified',
      title: 'Verified agent (admin confirms licence)',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
    }),
    defineField({
      name: 'specialisations',
      title: 'Specialisations',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: SPECIALISATIONS.map((s) => ({ title: s, value: s })),
      },
    }),
    defineField({
      name: 'serviceAreas',
      title: 'Service Areas',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Neighbourhoods or counties this agent covers',
    }),
    defineField({
      name: 'subscriptionTier',
      title: 'Subscription Tier',
      type: 'string',
      options: {
        list: [
          { title: 'Free', value: 'free' },
          { title: 'Basic', value: 'basic' },
          { title: 'Pro', value: 'pro' },
          { title: 'Agency', value: 'agency' },
        ],
      },
      initialValue: 'free',
    }),
  ],
  preview: {
    select: {
      title: 'displayName',
      subtitle: 'agencyName',
      media: 'photo',
    },
  },
})
