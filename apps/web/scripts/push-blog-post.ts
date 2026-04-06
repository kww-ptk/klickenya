/**
 * Universal blog post draft pusher
 *
 * Accepts a single blog post JSON file and pushes it to Sanity as a DRAFT.
 *
 * Usage:
 *   npx tsx scripts/push-blog-post.ts path/to/post.json
 *
 * The JSON file must contain a valid blogPost document, e.g.:
 *   {
 *     "_id": "blog-my-post",
 *     "_type": "blogPost",
 *     "title": "My Post Title",
 *     "slug": { "_type": "slug", "current": "my-post-slug" },
 *     "body": [...]
 *   }
 *
 * The script will prefix the _id with "drafts." so the post lands
 * as an unpublished draft in Sanity Studio.
 */

import fs from 'fs'
import path from 'path'
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

async function pushDraft(post: Record<string, unknown>): Promise<void> {
  if (!post._id || typeof post._id !== 'string') {
    throw new Error('Post must have a string _id field')
  }
  if (!post.title || typeof post.title !== 'string') {
    throw new Error('Post must have a string title field')
  }

  const draftId = post._id.startsWith('drafts.') ? post._id : `drafts.${post._id}`

  const doc = {
    ...post,
    _id: draftId,
    _type: post._type ?? 'blogPost',
    status: 'draft',
  }

  const result = await client.createOrReplace(doc)

  console.log(`✓ Draft pushed: "${post.title}"`)
  console.log(`  Sanity ID: ${result._id}`)
}

async function main(): Promise<void> {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error('Error: No file path provided.')
    console.error('Usage: npx tsx scripts/push-blog-post.ts path/to/post.json')
    process.exit(1)
  }

  const resolved = path.resolve(filePath)

  if (!fs.existsSync(resolved)) {
    console.error(`Error: File not found: ${resolved}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(resolved, 'utf8')
  let post: Record<string, unknown>

  try {
    post = JSON.parse(raw)
  } catch {
    console.error('Error: Could not parse JSON file.')
    process.exit(1)
  }

  console.log(`Pushing draft from: ${resolved}`)
  await pushDraft(post)
}

main().catch((err) => {
  console.error('Push failed:', err)
  process.exit(1)
})
