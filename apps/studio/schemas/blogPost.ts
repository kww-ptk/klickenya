import { defineType, defineField } from 'sanity'

/* ── Subcategory options per primary category ─── */
const SUBCATEGORIES: Record<string, { title: string; value: string }[]> = {
  destination_guide: [
    { title: 'City Guide', value: 'city_guide' },
    { title: 'Neighbourhood Guide', value: 'neighbourhood_guide' },
    { title: 'Getting There', value: 'getting_there' },
    { title: 'Getting Around', value: 'getting_around' },
    { title: 'Practical Info', value: 'practical_info' },
    { title: 'Seasonal Guide', value: 'seasonal_guide' },
  ],
  travel_tips: [
    { title: 'Money & Banking', value: 'money_banking' },
    { title: 'Visa & Entry', value: 'visa_entry' },
    { title: 'Health & Safety', value: 'health_safety' },
    { title: 'Budget Tips', value: 'budget_tips' },
    { title: 'Communications', value: 'communications' },
    { title: 'Luxury Tips', value: 'luxury_tips' },
  ],
  food_restaurants: [
    { title: 'Best-of List', value: 'best_of_list' },
    { title: 'Restaurant Review', value: 'restaurant_review' },
    { title: 'Food Guide', value: 'food_guide' },
    { title: 'Cuisine Guide', value: 'cuisine_guide' },
  ],
  where_to_stay: [
    { title: 'Area Guide', value: 'area_guide' },
    { title: 'Best-of List', value: 'best_of_list' },
    { title: 'Hotel Review', value: 'hotel_review' },
    { title: 'Villa Guide', value: 'villa_guide' },
    { title: 'Budget Stays', value: 'budget_stays' },
    { title: 'Luxury Stays', value: 'luxury_stays' },
  ],
}

const DEFAULT_SUBCATEGORIES = [
  { title: 'Guide', value: 'guide' },
  { title: 'Review', value: 'review' },
  { title: 'Best-of List', value: 'best_of_list' },
  { title: 'Tips', value: 'tips' },
]

export default defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  groups: [
    { name: 'content', title: '✍️ Content', default: true },
    { name: 'strategy', title: '📊 Content Strategy' },
    { name: 'seo', title: '🔍 SEO' },
  ],
  fields: [
    /* ── Content group ─────────────────────────── */
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'content',
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
      group: 'content',
      description: 'Shown in card previews and as meta description',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      group: 'content',
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
      group: 'content',
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
      name: 'relatedListings',
      title: 'Related listings (shown in sidebar)',
      type: 'array',
      group: 'content',
      of: [{ type: 'reference', to: [{ type: 'listing' }] }],
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: 'readingTime',
      title: 'Reading time (minutes)',
      type: 'number',
      group: 'content',
      description: 'Estimated reading time — calculate manually or auto-fill',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publish date',
      type: 'datetime',
      group: 'content',
    }),

    /* ── Content Strategy group ────────────────── */
    defineField({
      name: 'primaryCategory',
      title: 'Primary Category',
      type: 'string',
      group: 'strategy',
      validation: (rule) => rule.required(),
      options: {
        list: [
          { title: '🗺️ Destination Guide', value: 'destination_guide' },
          { title: '🍽️ Food & Restaurants', value: 'food_restaurants' },
          { title: '🏠 Where to Stay', value: 'where_to_stay' },
          { title: '🦁 Safari & Wildlife', value: 'safari_wildlife' },
          { title: '🌊 Beaches & Coast', value: 'beaches_coast' },
          { title: '💡 Travel Tips', value: 'travel_tips' },
          { title: '🎉 Events & Nightlife', value: 'events_nightlife' },
          { title: '🏢 Living in Kenya', value: 'living_in_kenya' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'subcategory',
      title: 'Subcategory',
      type: 'string',
      group: 'strategy',
      options: {
        list: ({ document }: any) => {
          const cat = document?.primaryCategory as string | undefined
          return SUBCATEGORIES[cat ?? ''] ?? DEFAULT_SUBCATEGORIES
        },
      },
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      group: 'strategy',
      options: {
        list: [
          { title: 'Watamu', value: 'watamu' },
          { title: 'Kilifi', value: 'kilifi' },
          { title: 'Diani', value: 'diani' },
          { title: 'Nairobi', value: 'nairobi' },
          { title: 'Lamu', value: 'lamu' },
          { title: 'Mombasa', value: 'mombasa' },
          { title: 'Malindi', value: 'malindi' },
          { title: 'Maasai Mara', value: 'maasai_mara' },
          { title: 'Amboseli', value: 'amboseli' },
          { title: 'Kenya (General)', value: 'kenya_general' },
        ],
      },
    }),
    defineField({
      name: 'postType',
      title: 'Post Type',
      type: 'string',
      group: 'strategy',
      validation: (rule) => rule.required(),
      initialValue: 'guide',
      options: {
        list: [
          { title: '📖 Guide (evergreen)', value: 'guide' },
          { title: '📋 Listicle (Best X in Y)', value: 'listicle' },
          { title: '⭐ Review', value: 'review' },
          { title: '📰 News & Updates', value: 'news' },
          { title: '💡 Tips & Advice', value: 'tips' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'series',
      title: 'Series',
      type: 'string',
      group: 'strategy',
      description:
        'Group related posts together. Posts in the same series link to each other. e.g. "Watamu Complete Guide" or "Kenya Practical Tips"',
    }),
    defineField({
      name: 'keywords',
      title: 'Keywords',
      type: 'array',
      group: 'strategy',
      of: [{ type: 'string' }],
      description:
        'Additional keywords for filtering e.g. budget, luxury, family, halal, romantic',
      options: { layout: 'tags' },
    }),
    // Keep legacy tags field for backward compat
    defineField({
      name: 'tags',
      title: 'Tags (legacy)',
      type: 'array',
      group: 'strategy',
      of: [{ type: 'string' }],
      hidden: true,
    }),

    /* ── SEO group ─────────────────────────────── */
    defineField({
      name: 'focusKeyword',
      title: 'Focus Keyword',
      type: 'string',
      group: 'seo',
      description:
        'The main keyword this post targets e.g. "best restaurants watamu 2026"',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      group: 'seo',
      description: 'Overrides the main title in search results (max 60 chars)',
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'Overrides the excerpt in search results (max 160 chars)',
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      category: 'primaryCategory',
      location: 'location',
      media: 'coverImage',
    },
    prepare({ title, status, category, location, media }) {
      const parts = [status];
      if (category) parts.push(category.replace(/_/g, ' '));
      if (location) parts.push(location);
      return {
        title,
        subtitle: parts.filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
