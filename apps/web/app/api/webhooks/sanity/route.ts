// Configure this webhook in Sanity dashboard:
// URL: https://klickenya.com/api/webhooks/sanity
// Secret: match SANITY_WEBHOOK_SECRET in your env vars
// Trigger on: create, update, delete
// Projection: { _type, slug }

import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import { revalidateListing } from '@/lib/listings/revalidate'

const WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  const secret = request.headers.get('sanity-webhook-signature')

  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { _type, slug } = body
    const slugValue = slug?.current

    switch (_type) {
      case 'listing': {
        // The real detail route is /[type]/[city]/[slug] and is force-static, so we
        // must revalidate the CONCRETE URL. The webhook projection only gives us the
        // slug, so fetch the type + city to build the path. (The old per-slug paths
        // here were missing the /city/ segment and never matched.)
        if (slugValue) {
          const doc = await sanityClient.fetch<{ type?: string; city?: string } | null>(
            `*[_type == "listing" && slug.current == $slug][0]{ type, city }`,
            { slug: slugValue },
          )
          revalidateListing(doc?.type, doc?.city, slugValue)
        } else {
          revalidateListing()
        }
        break
      }

      case 'blogPost': {
        if (slugValue) {
          revalidatePath(`/journal/${slugValue}`, 'page')
        }
        revalidatePath('/journal', 'page')
        break
      }

      case 'destination': {
        if (slugValue) {
          revalidatePath(`/destinations/${slugValue}`, 'page')
        }
        revalidatePath('/', 'page')
        break
      }

      // Properties live under /real-estate, not /property. Every path here was
      // a route that does not exist, so editing a property in Studio has never
      // revalidated anything and changes waited out the hour of ISR instead.
      case 'property': {
        if (slugValue) {
          revalidatePath(`/real-estate/${slugValue}`, 'page')
        }
        revalidatePath('/real-estate', 'page')
        revalidatePath('/real-estate/for-sale', 'page')
        revalidatePath('/real-estate/for-rent', 'page')
        revalidatePath('/real-estate/land', 'page')
        revalidatePath('/real-estate/commercial', 'page')
        revalidatePath('/real-estate/new-developments', 'page')
        break
      }

      // Same problem: the route is /real-estate/neighbourhood/[slug], singular
      // and nested, not /neighbourhoods/[slug].
      case 'neighbourhood': {
        if (slugValue) {
          revalidatePath(`/real-estate/neighbourhood/${slugValue}`, 'page')
        }
        revalidatePath('/real-estate', 'page')
        break
      }

      case 'agent': {
        revalidatePath('/agents', 'page')
        break
      }

      case 'page': {
        // page schema uses a plain string slug, not slug.current
        const pageSlug = slug?.current ?? slug
        if (pageSlug) {
          revalidatePath(`/${pageSlug}`, 'page')
        }
        break
      }

      case 'siteSettings': {
        revalidatePath('/', 'layout')
        break
      }

      default:
        break
    }

    return NextResponse.json({
      revalidated: true,
      type: _type,
      slug: slugValue ?? slug,
    })
  } catch (err) {
    console.error('Sanity webhook error:', err)
    return NextResponse.json(
      { message: 'Error processing webhook' },
      { status: 500 }
    )
  }
}
