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
/**
 * Server-side Sanity read, cached in Next's Data Cache for 60s.
 *
 * Pass `tags` for anything a write revalidates. `revalidatePath` clears the
 * page but NOT the 60s data entry underneath it, so a page rebuilt inside that
 * window re-reads pre-write data and bakes it in for the page's whole
 * revalidate period — an hour, for listing detail pages. Tagging lets the write
 * path drop the data entry too (see lib/listings/revalidate.ts).
 */
export async function sanityFetch<T = any>({
  query,
  params,
  tags,
}: {
  query: string
  params?: Record<string, unknown>
  tags?: string[]
}): Promise<{ data: T }> {
  const data = await sanityClient.fetch<T>(query, params ?? {}, {
    next: { revalidate: 60, ...(tags?.length ? { tags } : {}) },
  })
  return { data }
}

// No-op — was used for Sanity visual editing (defineLive), not needed in production
export function SanityLive() {
  return null
}
