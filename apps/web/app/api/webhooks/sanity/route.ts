// Configure this webhook in Sanity dashboard:
// URL: https://klickenya.com/api/webhooks/sanity
// Secret: match SANITY_WEBHOOK_SECRET in your env vars
// Trigger on: create, update, delete
// Projection: { _type, slug }

import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

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
        if (slugValue) {
          revalidatePath(`/stays/${slugValue}`, 'page')
          revalidatePath(`/experiences/${slugValue}`, 'page')
          revalidatePath(`/events/${slugValue}`, 'page')
          revalidatePath(`/rentals/${slugValue}`, 'page')
          revalidatePath(`/services/${slugValue}`, 'page')
        }
        revalidatePath('/stays', 'page')
        revalidatePath('/experiences', 'page')
        revalidatePath('/events', 'page')
        revalidatePath('/rentals', 'page')
        revalidatePath('/services', 'page')
        revalidatePath('/', 'page')
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

      case 'property': {
        if (slugValue) {
          revalidatePath(`/property/for-sale/${slugValue}`, 'page')
          revalidatePath(`/property/for-rent/${slugValue}`, 'page')
          revalidatePath(`/property/land/${slugValue}`, 'page')
          revalidatePath(`/property/commercial/${slugValue}`, 'page')
        }
        revalidatePath('/property', 'page')
        revalidatePath('/property/for-sale', 'page')
        revalidatePath('/property/for-rent', 'page')
        revalidatePath('/property/land', 'page')
        revalidatePath('/property/commercial', 'page')
        break
      }

      case 'neighbourhood': {
        if (slugValue) {
          revalidatePath(`/neighbourhoods/${slugValue}`, 'page')
        }
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
