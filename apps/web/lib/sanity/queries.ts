import { groq } from 'next-sanity'

// ── Shared projection fragments ──────────────────

const IMAGE_FIELDS = `
  asset->{_id, url, metadata{dimensions}},
  alt,
  hotspot,
  crop
`

const LISTING_CARD_FIELDS = `
  _id,
  title,
  slug,
  type,
  status,
  city,
  county,
  price,
  priceUnit,
  tags,
  "coverPhoto": photos[0]{ ${IMAGE_FIELDS} }
`

const PROPERTY_CARD_FIELDS = `
  _id,
  title,
  slug,
  listingCategory,
  propertyType,
  status,
  price,
  priceType,
  bedrooms,
  bathrooms,
  sizeSqm,
  neighbourhood,
  city,
  isNewDevelopment,
  isFeatured,
  previousPrice,
  completionPercentage,
  developerName,
  unitsAvailable,
  "coverPhoto": photos[0]{ ${IMAGE_FIELDS} }
`

// ── Listings ─────────────────────────────────────

export const LISTINGS_QUERY = groq`
  *[_type == "listing" && status == "published"] | order(_createdAt desc) {
    ${LISTING_CARD_FIELDS}
  }
`

export const LISTINGS_BY_TYPE_QUERY = groq`
  *[_type == "listing" && status == "published" && type == $type] | order(_createdAt desc) {
    ${LISTING_CARD_FIELDS}
  }
`

export const LISTINGS_BY_TYPE_CITY_QUERY = groq`
  *[_type == "listing" && status == "published" && type == $type && lower(city) == lower($city)] | order(_createdAt desc) {
    ${LISTING_CARD_FIELDS}
  }
`

export const LISTING_BY_SLUG_QUERY = groq`
  *[_type == "listing" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    type,
    status,
    city,
    county,
    address,
    price,
    priceUnit,
    bookingType,
    maxGuests,
    description,
    photos[]{ ${IMAGE_FIELDS} },
    amenities,
    tags,
    hostName,
    highlights,
    cuisine,
    priceRange,
    openingHours,
    reservationRequired,
    seoTitle,
    seoDescription
  }
`

export const LISTING_SLUGS_QUERY = groq`
  *[_type == "listing" && status == "published"] {
    "slug": slug.current,
    type,
    city
  }
`

export const SIMILAR_LISTINGS_QUERY = groq`
  *[_type == "listing" && status == "published" && type == $type && lower(city) == lower($city) && slug.current != $slug] | order(_createdAt desc) [0...3] {
    ${LISTING_CARD_FIELDS}
  }
`

// ── Blog Posts ────────────────────────────────────

export const BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost" && status == "published"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    tags,
    readingTime,
    publishedAt,
    "coverImage": coverImage{ ${IMAGE_FIELDS} },
    "author": author->{name, slug, avatar{asset->{_id, url}}}
  }
`

export const BLOG_POSTS_BY_TAG_QUERY = groq`
  *[_type == "blogPost" && status == "published" && $tag in tags] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    tags,
    readingTime,
    publishedAt,
    "coverImage": coverImage{ ${IMAGE_FIELDS} },
    "author": author->{name, slug, avatar{asset->{_id, url}}}
  }
`

export const BLOG_POST_BY_SLUG_QUERY = groq`
  *[_type == "blogPost" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    body[]{
      ...,
      _type == "inlineListingBlock" => {
        ...,
        "listing": listing->{
          _id, title, slug, type, city, price, priceUnit, tags,
          "coverPhoto": photos[0]{ ${IMAGE_FIELDS} }
        }
      }
    },
    tags,
    readingTime,
    publishedAt,
    seoTitle,
    seoDescription,
    "coverImage": coverImage{ ${IMAGE_FIELDS} },
    "author": author->{name, slug, avatar{asset->{_id, url}}, bio, role},
    "relatedListings": relatedListings[]->{
      ${LISTING_CARD_FIELDS}
    }
  }
`

export const BLOG_POST_SLUGS_QUERY = groq`
  *[_type == "blogPost" && status == "published"] {
    "slug": slug.current
  }
`

export const ALL_BLOG_TAGS_QUERY = groq`
  array::unique(*[_type == "blogPost" && status == "published"].tags[])
`

// ── Real Estate: Properties ───────────────────────

export const PROPERTIES_QUERY = groq`
  *[_type == "property" && status == "available"] | order(_createdAt desc) {
    ${PROPERTY_CARD_FIELDS}
  }
`

export const PROPERTIES_BY_CATEGORY_QUERY = groq`
  *[_type == "property" && status == "available" && listingCategory == $category] | order(_createdAt desc) {
    ${PROPERTY_CARD_FIELDS}
  }
`

export const PROPERTIES_BY_CATEGORY_CITY_QUERY = groq`
  *[_type == "property" && status == "available" && listingCategory == $category && lower(city) == lower($city)] | order(_createdAt desc) {
    ${PROPERTY_CARD_FIELDS}
  }
`

export const PROPERTIES_BY_NEIGHBOURHOOD_QUERY = groq`
  *[_type == "property" && status == "available" && lower(neighbourhood) == lower($neighbourhood) && lower(city) == lower($city)] | order(_createdAt desc) {
    ${PROPERTY_CARD_FIELDS}
  }
`

export const PROPERTY_BY_SLUG_QUERY = groq`
  *[_type == "property" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    listingCategory,
    propertyType,
    status,
    price,
    priceType,
    bedrooms,
    bathrooms,
    sizeSqm,
    landSizeAcres,
    yearBuilt,
    neighbourhood,
    city,
    county,
    lat,
    lng,
    features,
    description,
    photos[]{ ${IMAGE_FIELDS} },
    isNewDevelopment,
    isFeatured,
    previousPrice,
    completionPercentage,
    developerName,
    unitsAvailable,
    seoTitle,
    seoDescription,
    "agent": agent->{
      _id,
      displayName,
      slug,
      photo{ ${IMAGE_FIELDS} },
      agencyName,
      licenceNumber,
      isVerified,
      bio,
      phone,
      email,
      specialisations,
      serviceAreas,
      subscriptionTier
    }
  }
`

export const PROPERTY_SLUGS_QUERY = groq`
  *[_type == "property" && status == "available"] {
    "slug": slug.current,
    listingCategory,
    city,
    neighbourhood
  }
`

export const SIMILAR_PROPERTIES_QUERY = groq`
  *[_type == "property" && status == "available" && listingCategory == $category && lower(neighbourhood) == lower($neighbourhood) && slug.current != $slug] | order(_createdAt desc) [0...3] {
    ${PROPERTY_CARD_FIELDS}
  }
`

export const FEATURED_PROPERTIES_QUERY = groq`
  *[_type == "property" && status == "available" && isFeatured == true] | order(_createdAt desc) [0...6] {
    ${PROPERTY_CARD_FIELDS}
  }
`

export const NEW_DEVELOPMENTS_QUERY = groq`
  *[_type == "property" && status == "available" && isNewDevelopment == true] | order(_createdAt desc) {
    ${PROPERTY_CARD_FIELDS}
  }
`

export const AGENTS_QUERY = groq`
  *[_type == "agent"] | order(displayName asc) {
    _id,
    displayName,
    slug,
    photo{ asset->{_id, url, metadata{dimensions}}, alt, hotspot, crop },
    agencyName,
    isVerified,
    specialisations,
    subscriptionTier
  }
`

export const AGENT_BY_SLUG_QUERY = groq`
  *[_type == "agent" && slug.current == $slug][0] {
    _id,
    displayName,
    slug,
    photo{ asset->{_id, url, metadata{dimensions}}, alt, hotspot, crop },
    agencyName,
    licenceNumber,
    isVerified,
    bio,
    phone,
    email,
    specialisations,
    serviceAreas,
    subscriptionTier
  }
`

export const PROPERTIES_BY_AGENT_QUERY = groq`
  *[_type == "property" && status == "available" && agent._ref == $agentId] | order(_createdAt desc) {
    ${PROPERTY_CARD_FIELDS}
  }
`

// ── Destinations ──────────────────────────────────

export const DESTINATIONS_QUERY = groq`
  *[_type == "destination"] | order(name asc) {
    _id,
    name,
    slug,
    tagline,
    county,
    "heroImage": heroImage{ ${IMAGE_FIELDS} }
  }
`

export const DESTINATION_BY_SLUG_QUERY = groq`
  *[_type == "destination" && slug.current == $slug][0] {
    _id,
    name,
    slug,
    tagline,
    description,
    highlights,
    county,
    seoTitle,
    seoDescription,
    "heroImage": heroImage{ ${IMAGE_FIELDS} },
    "relatedListings": relatedListings[]->{
      ${LISTING_CARD_FIELDS}
    }
  }
`

// ── Neighbourhoods ────────────────────────────────

export const NEIGHBOURHOODS_QUERY = groq`
  *[_type == "neighbourhood"] | order(name asc) {
    _id,
    name,
    slug,
    city,
    avgPriceForSale,
    avgPriceForRent,
    "heroImage": heroImage{ ${IMAGE_FIELDS} }
  }
`

export const NEIGHBOURHOOD_BY_SLUG_QUERY = groq`
  *[_type == "neighbourhood" && slug.current == $slug][0] {
    _id,
    name,
    slug,
    city,
    tagline,
    description,
    avgPriceForSale,
    avgPriceForRent,
    avgPriceSqm,
    avgRentalYield,
    highlights,
    commuteInfo,
    seoTitle,
    seoDescription,
    "heroImage": heroImage{ ${IMAGE_FIELDS} },
    "relatedProperties": relatedProperties[]->{
      ${PROPERTY_CARD_FIELDS}
    }
  }
`

// ── Pages & Settings ──────────────────────────────

export const PAGE_BY_SLUG_QUERY = groq`
  *[_type == "page" && slug == $slug][0] {
    _id,
    title,
    slug,
    heroTitle,
    heroSubtitle,
    body,
    seoTitle,
    seoDescription
  }
`

export const SITE_SETTINGS_QUERY = groq`
  *[_type == "siteSettings"][0] {
    siteName,
    tagline,
    contactEmail,
    contactPhone,
    primaryCTA,
    heroImages[]{ ${IMAGE_FIELDS} },
    navLinks,
    footerColumns,
    socialLinks,
    stats
  }
`
