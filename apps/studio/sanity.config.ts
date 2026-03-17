import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'
import type { StructureBuilder } from 'sanity/structure'

const singletonTypes = new Set(['siteSettings'])

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
    visionTool(),
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
