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
  ],
  preview: {
    select: { title: 'name', subtitle: 'slug.current', media: 'logo' },
  },
})
