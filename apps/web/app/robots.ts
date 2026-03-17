import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/dashboard/', '/api/', '/auth/', '/studio/'],
      },
    ],
    sitemap: 'https://klickenya.com/sitemap.xml',
  }
}
