import { defineType, defineField } from 'sanity'

const BLOG_TAGS = [
  'Safari', 'Beach', 'Nairobi', 'Budget Travel', 'Luxury',
  'Food & Culture', 'Adventure', 'Wildlife', 'Road Trip',
  'Coast', 'Mountains', 'Family Travel',
]

export default defineType({
  name: 'blogPost',
  title: 'Blog Post',
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
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Published', value: 'published' },
          { title: 'Archived', value: 'archived' },
        ],
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Shown in card previews and as meta description',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
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
      validation: (rule) =>
        rule.custom((value, context) => {
          const status = (context.document as { status?: string })?.status
          if (status === 'published' && !value) {
            return 'Cover image is required for published posts'
          }
          return true
        }),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Underline', value: 'underline' },
              { title: 'Code', value: 'code' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (rule: any) => rule.required(),
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (rule: any) => rule.required(),
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
            },
          ],
        },
        { type: 'quickFactsBlock' },
        { type: 'tipCardBlock' },
        { type: 'dayCardBlock' },
        { type: 'photoRowBlock' },
        { type: 'statRowBlock' },
        { type: 'budgetTableBlock' },
        { type: 'packingListBlock' },
        { type: 'pullQuoteBlock' },
        { type: 'inlineListingBlock' },
        { type: 'compareTableBlock' },
        { type: 'verdictCardBlock' },
        { type: 'whoIsItForBlock' },
        { type: 'destinationSectionBlock' },
        { type: 'distanceChipsBlock' },
        { type: 'deciderGridBlock' },
        { type: 'listingSliderBlock' },
        { type: 'eventSliderBlock' },
      ],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: BLOG_TAGS.map((t) => ({ title: t, value: t })),
      },
    }),
    defineField({
      name: 'relatedListings',
      title: 'Related listings (shown in sidebar)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'listing' }] }],
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: 'readingTime',
      title: 'Reading time (minutes)',
      type: 'number',
      description: 'Estimated reading time — calculate manually or auto-fill',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publish date',
      type: 'datetime',
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
      status: 'status',
      media: 'coverImage',
    },
    prepare({ title, status, media }) {
      return {
        title,
        subtitle: status,
        media,
      }
    },
  },
})
