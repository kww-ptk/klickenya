import imageUrlBuilder from '@sanity/image-url'
import { sanityClient } from './client'

type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>['image']>[0]

const builder = imageUrlBuilder(sanityClient)

export function urlForImage(source: SanityImageSource) {
  return builder.image(source)
}

export function imageUrl(source: SanityImageSource, width = 800): string {
  return builder.image(source).width(width).auto('format').url()
}

export function getImageDimensions(image: {
  asset?: { metadata?: { dimensions?: { width: number; height: number } } }
}): { width: number; height: number } {
  const dimensions = image?.asset?.metadata?.dimensions
  return {
    width: dimensions?.width ?? 800,
    height: dimensions?.height ?? 600,
  }
}
