import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'
import type { StructureBuilder } from 'sanity/structure'
import { aiActionsPlugin } from './plugins/ai-actions'

const singletonTypes = new Set(['siteSettings', 'homePage'])

function structure(S: StructureBuilder) {
  return S.list()
    .title('Klickenya CMS')
    .items([
      S.listItem()
        .title('Listings')
        .child(
          S.list()
            .title('Listings')
            .items([
              S.documentTypeListItem('listing').title('All listings'),
              S.documentTypeListItem('host').title('Hosts'),
            ])
        ),
      S.divider(),

      S.listItem()
        .title('Real Estate')
        .child(
          S.list()
            .title('Real Estate')
            .items([
              S.documentTypeListItem('property').title('Properties'),
              S.documentTypeListItem('agent').title('Agents'),
              S.documentTypeListItem('neighbourhood').title('Neighbourhoods'),
            ])
        ),
      S.divider(),

      S.documentTypeListItem('blogPost').title('Blog Posts'),
      S.documentTypeListItem('destination').title('Destinations'),
      S.divider(),

      S.listItem()
        .title('Home Page')
        .id('homePage')
        .child(
          S.document()
            .schemaType('homePage')
            .documentId('homePage')
        ),
      S.documentTypeListItem('page').title('Static Pages'),
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
        ),
      S.divider(),

      S.documentTypeListItem('author').title('Authors'),
    ])
}

export default defineConfig({
  name: 'default',
  title: 'Klickenya CMS',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  plugins: [
    structureTool({ structure }),
    presentationTool({
      previewUrl: {
        origin: process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:3000',
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
    }),
    visionTool(),
    aiActionsPlugin(),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },

  document: {
    actions: (input, context) =>
      singletonTypes.has(context.schemaType)
        ? input.filter(
            ({ action }) =>
              action && ['publish', 'discardChanges', 'restore'].includes(action)
          )
        : input,
  },
})
