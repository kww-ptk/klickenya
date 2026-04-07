import { createClient } from 'next-sanity'

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

// Simple fetch wrapper with ISR revalidation
export async function sanityFetch<T = any>({
  query,
  params,
}: {
  query: string
  params?: Record<string, unknown>
}): Promise<{ data: T }> {
  const data = await sanityClient.fetch<T>(query, params ?? {}, {
    next: { revalidate: 60 },
  })
  return { data }
}

// No-op — was used for Sanity visual editing (defineLive), not needed in production
export function SanityLive() {
  return null
}
