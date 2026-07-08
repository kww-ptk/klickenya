import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'partner',
  title: 'Partner (White-Label)',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'theme', title: 'Theme' },
    { name: 'modules', title: 'Modules' },
    { name: 'content', title: 'Content' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Partner name',
      type: 'string',
      validation: (rule) => rule.required(),
      group: 'identity',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
      group: 'identity',
    }),
    defineField({
      name: 'domains',
      title: 'Domains',
      description:
        'All hostnames that resolve to this partner (storefront + admin). No protocol, no trailing slash. e.g. "sunsetrentals.com", "admin.sunsetrentals.com".',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'identity',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'identity',
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      group: 'identity',
    }),
    defineField({
      name: 'poweredByKlickenya',
      title: 'Show "Powered by Klickenya" badge',
      type: 'boolean',
      initialValue: true,
      group: 'identity',
    }),

    // Theme tokens — map onto CSS variables in apps/web/app/globals.css
    defineField({
      name: 'colorPrimary',
      title: 'Primary color (maps to --color-amber)',
      type: 'string',
      description: 'Hex, e.g. #E8A020',
      group: 'theme',
    }),
    defineField({
      name: 'colorAccent',
      title: 'Accent color (maps to --color-purple)',
      type: 'string',
      description: 'Hex, e.g. #6B2D8B',
      group: 'theme',
    }),
    defineField({
      name: 'colorDark',
      title: 'Dark / text color (maps to --color-dark / --color-text)',
      type: 'string',
      description: 'Hex, e.g. #16130C',
      group: 'theme',
    }),
    defineField({
      name: 'fontDisplay',
      title: 'Display font family (maps to --font-display)',
      type: 'string',
      description: 'CSS font-family name, e.g. "Bricolage Grotesque"',
      group: 'theme',
    }),
    defineField({
      name: 'fontBody',
      title: 'Body font family (maps to --font-body)',
      type: 'string',
      description: 'CSS font-family name, e.g. "Geist"',
      group: 'theme',
    }),
    defineField({
      name: 'fontUrl',
      title: 'Font stylesheet URL',
      type: 'url',
      description:
        'Optional <link> stylesheet that loads the fonts above (e.g. a Google Fonts URL). Loaded at runtime — not next/font.',
      group: 'theme',
    }),

    // Feature scoping (spec section 4a)
    defineField({
      name: 'enabledModules',
      title: 'Enabled modules',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Stays (property PMS)', value: 'stays' },
          { title: 'Tours / Experiences', value: 'tours' },
          { title: 'Events', value: 'events' },
          { title: 'Restaurant (menu/POS/kitchen/stock)', value: 'restaurant' },
        ],
      },
      validation: (rule) => rule.required().min(1),
      group: 'modules',
    }),
    defineField({
      name: 'allowedListingTypes',
      title: 'Allowed listing types',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Stay', value: 'stay' },
          { title: 'Experience', value: 'experience' },
          { title: 'Event', value: 'event' },
          { title: 'Rental', value: 'rental' },
          { title: 'Service', value: 'service' },
        ],
      },
      validation: (rule) => rule.required().min(1),
      group: 'modules',
    }),

    // Content
    defineField({
      name: 'contactEmail',
      title: 'Contact email',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'contactPhone',
      title: 'Contact phone',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'footerText',
      title: 'Footer text',
      type: 'text',
      group: 'content',
    }),
    defineField({
      name: 'defaultCity',
      title: 'Default city / region',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'landingHtml',
      title: 'Custom landing page HTML',
      description:
        'Optional. A complete HTML page served verbatim at the partner site. Use {{BOOKING}} for the booking form and {{MENU}} for the live menu. CSS only (no JS). Leave empty to use the default template.',
      type: 'text',
      rows: 20,
      group: 'content',
    }),

    // Promotions / offers — lightweight partner-specific marketing banners
    // shown on the partner's own site (not marketplace inventory). Managed
    // from the partner's own admin via /api/partner/offers.
    defineField({
      name: 'promotions',
      title: 'Promotions / Offers',
      type: 'array',
      group: 'content',
      of: [
        {
          type: 'object',
          name: 'promotion',
          fields: [
            { name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() },
            { name: 'subtitle', title: 'Subtitle', type: 'string' },
            {
              name: 'category',
              title: 'Category',
              type: 'string',
              options: {
                list: [
                  { title: 'Rental / Villas', value: 'rental' },
                  { title: 'Safari / Tours', value: 'safari' },
                  { title: 'For Sale', value: 'sale' },
                  { title: 'Special', value: 'special' },
                ],
              },
              initialValue: 'rental',
            },
            { name: 'badge', title: 'Badge', type: 'string' },
            { name: 'body', title: 'Body text', type: 'text', rows: 3 },
            { name: 'ctaLabel', title: 'CTA label', type: 'string' },
            { name: 'ctaUrl', title: 'CTA URL', type: 'string' },
            { name: 'image', title: 'Image', type: 'image' },
            { name: 'validFrom', title: 'Valid from', type: 'date' },
            { name: 'validTo', title: 'Valid to', type: 'date' },
            { name: 'isPublished', title: 'Published', type: 'boolean', initialValue: true },
          ],
          preview: {
            select: { title: 'title', subtitle: 'category' },
          },
        },
      ],
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'slug.current', media: 'logo' },
  },
})
