import { defineType, defineField, defineArrayMember } from 'sanity'

export default defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero', default: true },
    { name: 'sections', title: 'Sections' },
    { name: 'statsBar', title: 'Stats Bar' },
    { name: 'host', title: 'Host Section' },
    { name: 'testimonials', title: 'Testimonials' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ── Hero ──────────────────────────────────────
    defineField({
      name: 'heroEyebrow',
      title: 'Eyebrow Text',
      type: 'string',
      initialValue: 'Discover Kenya',
      group: 'hero',
    }),
    defineField({
      name: 'heroTitle',
      title: 'Hero Title',
      type: 'string',
      description: 'Main heading before the highlighted word',
      initialValue: 'Discover the best of',
      group: 'hero',
    }),
    defineField({
      name: 'heroHighlight',
      title: 'Hero Highlight Word',
      type: 'string',
      description: 'The amber-colored word that follows the title',
      initialValue: 'Kenya',
      group: 'hero',
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero Subtitle',
      type: 'text',
      rows: 3,
      initialValue:
        'Book unique stays, experiences, events, restaurants, and services across all 47 counties — all in one place.',
      group: 'hero',
    }),
    defineField({
      name: 'heroStats',
      title: 'Hero Stats',
      type: 'array',
      group: 'hero',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'value', title: 'Value', type: 'string' },
            { name: 'label', title: 'Label', type: 'string' },
          ],
          preview: {
            select: { title: 'value', subtitle: 'label' },
          },
        }),
      ],
    }),
    defineField({
      name: 'heroImages',
      title: 'Hero Mosaic Images',
      type: 'array',
      description: 'Up to 6 images for the hero background mosaic',
      group: 'hero',
      of: [
        defineArrayMember({
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
      ],
      validation: (rule) => rule.max(6),
    }),

    // ── Sections ──────────────────────────────────
    defineField({
      name: 'featuredTitle',
      title: 'Featured Section Title',
      type: 'string',
      initialValue: 'Featured stays & experiences',
      group: 'sections',
    }),
    defineField({
      name: 'featuredSubtitle',
      title: 'Featured Section Subtitle',
      type: 'string',
      initialValue: 'Hand-picked places and activities across Kenya',
      group: 'sections',
    }),
    defineField({
      name: 'eventsTitle',
      title: 'Events Section Title',
      type: 'string',
      initialValue: 'Upcoming events',
      group: 'sections',
    }),
    defineField({
      name: 'eventsSubtitle',
      title: 'Events Section Subtitle',
      type: 'string',
      initialValue:
        'Live music, food festivals, cultural celebrations and more',
      group: 'sections',
    }),
    defineField({
      name: 'destinationsTitle',
      title: 'Destinations Section Title',
      type: 'string',
      initialValue: 'Explore destinations',
      group: 'sections',
    }),
    defineField({
      name: 'destinationsSubtitle',
      title: 'Destinations Section Subtitle',
      type: 'string',
      initialValue:
        "From coast to highlands, discover Kenya's most loved places",
      group: 'sections',
    }),
    defineField({
      name: 'howItWorksTitle',
      title: 'How It Works Title',
      type: 'string',
      initialValue: 'How it works',
      group: 'sections',
    }),
    defineField({
      name: 'howItWorksSubtitle',
      title: 'How It Works Subtitle',
      type: 'string',
      initialValue: 'Book anything in Kenya in just a few simple steps',
      group: 'sections',
    }),
    defineField({
      name: 'howItWorksSteps',
      title: 'How It Works Steps',
      type: 'array',
      group: 'sections',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'title', title: 'Title', type: 'string' },
            { name: 'description', title: 'Description', type: 'text', rows: 3 },
          ],
          preview: {
            select: { title: 'title', subtitle: 'description' },
          },
        }),
      ],
    }),

    // ── Stats Bar ─────────────────────────────────
    defineField({
      name: 'statsBar',
      title: 'Stats Bar',
      type: 'array',
      description: 'Amber stats bar shown between sections',
      group: 'statsBar',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'value', title: 'Value', type: 'string' },
            { name: 'label', title: 'Label', type: 'string' },
          ],
          preview: {
            select: { title: 'value', subtitle: 'label' },
          },
        }),
      ],
    }),

    // ── Host Section ──────────────────────────────
    defineField({
      name: 'hostEyebrow',
      title: 'Host Eyebrow',
      type: 'string',
      initialValue: 'For hosts',
      group: 'host',
    }),
    defineField({
      name: 'hostTitle',
      title: 'Host Title',
      type: 'string',
      description: 'Main heading before the highlighted word',
      initialValue: 'Earn more as a',
      group: 'host',
    }),
    defineField({
      name: 'hostHighlight',
      title: 'Host Highlight Word',
      type: 'string',
      description: 'The amber-colored word',
      initialValue: 'host',
      group: 'host',
    }),
    defineField({
      name: 'hostDescription',
      title: 'Host Description',
      type: 'text',
      rows: 4,
      initialValue:
        'List your stay, experience, or service on Klickenya and reach thousands of travellers exploring Kenya. No hidden fees, instant payouts, and a dedicated support team.',
      group: 'host',
    }),
    defineField({
      name: 'hostCtaPrimary',
      title: 'Primary CTA Text',
      type: 'string',
      initialValue: 'Start hosting',
      group: 'host',
    }),
    defineField({
      name: 'hostCtaPrimaryLink',
      title: 'Primary CTA Link',
      type: 'string',
      initialValue: '/list',
      group: 'host',
    }),
    defineField({
      name: 'hostCtaSecondary',
      title: 'Secondary CTA Text',
      type: 'string',
      initialValue: 'Learn more',
      group: 'host',
    }),
    defineField({
      name: 'hostCtaSecondaryLink',
      title: 'Secondary CTA Link',
      type: 'string',
      initialValue: '/hosting',
      group: 'host',
    }),

    // ── Testimonials ──────────────────────────────
    defineField({
      name: 'testimonialsTitle',
      title: 'Testimonials Title',
      type: 'string',
      initialValue: 'What our guests say',
      group: 'testimonials',
    }),
    defineField({
      name: 'testimonialsSubtitle',
      title: 'Testimonials Subtitle',
      type: 'string',
      initialValue: 'Real stories from travellers across Kenya',
      group: 'testimonials',
    }),
    defineField({
      name: 'testimonials',
      title: 'Testimonials',
      type: 'array',
      group: 'testimonials',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'quote', title: 'Quote', type: 'text', rows: 4 },
            { name: 'name', title: 'Name', type: 'string' },
            { name: 'meta', title: 'Meta', type: 'string' },
            { name: 'initials', title: 'Initials', type: 'string' },
          ],
          preview: {
            select: { title: 'name', subtitle: 'meta' },
          },
        }),
      ],
    }),

    // ── SEO ───────────────────────────────────────
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      description: 'Override the default page title for SEO',
      group: 'seo',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'Override the default meta description for SEO',
      group: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Home Page' }
    },
  },
})
