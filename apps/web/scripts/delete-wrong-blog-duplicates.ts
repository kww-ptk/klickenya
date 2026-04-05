import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'b9zd8u9f',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
})

async function cleanup() {
  console.log('Deleting wrongly created duplicate blog posts...')

  await client.delete('blog-watamu-sunset-spots-2026')
  console.log('✓ Deleted blog-watamu-sunset-spots-2026')

  await client.delete('blog-kilifi-diani-lamu-comparison-2026')
  console.log('✓ Deleted blog-kilifi-diani-lamu-comparison-2026')

  console.log('\nDone. Duplicates removed.')
}

cleanup().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
