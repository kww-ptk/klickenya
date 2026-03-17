import { createClient } from 'next-sanity'
import { defineLive } from 'next-sanity/live'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
})

// Draft preview client — uses token, bypasses CDN
export const sanityPreviewClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

// Visual Editing — live content + click-to-edit in Presentation tool
export const { sanityFetch, SanityLive } = defineLive({
  client: sanityClient.withConfig({
    apiVersion: '2024-01-01',
  }),
  serverToken: process.env.SANITY_API_TOKEN,
  fetchOptions: {
    revalidate: 60,
  },
})
