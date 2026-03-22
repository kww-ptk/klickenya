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
  subcategory,
  status,
  city,
  county,
  price,
  priceUnit,
  priceRange,
  openingHours,
  avgRating,
  reviewCount,
  tags,
  hostName,
  isVerified,
  verificationStatus,
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

export const LISTINGS_FILTERED_QUERY = groq`
  *[_type == "listing" && status == "published" && type == $type
    && select(
      $subcategory != "" => subcategory == $subcategory,
      true
    )
    && select(
      $city != "" => lower(city) == lower($city),
      true
    )
  ] | order(_createdAt desc) [0...$limit] {
    ${LISTING_CARD_FIELDS}
  }
`

export const SUBCATEGORY_COUNTS_QUERY = groq`
  *[_type == "listing" && status == "published" && type == $type] {
    subcategory
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
    subcategory,
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
    rentingType,
    rooms[] {
      _key,
      roomName,
      roomDescription,
      "photos": photos[] {
        asset->{ _id, url, metadata { dimensions } },
        alt,
        hotspot,
        crop
      },
      pricePerNight,
      capacity,
      bedType,
      roomSizeSqm,
      roomAmenities,
      isAvailable,
      quantity
    },
    cuisine,
    priceRange,
    openingHours,
    reservationRequired,
    seoTitle,
    seoDescription,
    isVerified,
    verificationStatus,

    // Restaurant fields
    atmosphere,
    menu[]{ name, description, price },

    // Experience fields
    duration,
    maxGroupSize,
    difficulty,
    minAge,
    languages,
    included,
    notIncluded,
    guideInfo,
    meetingPoint,
    whatToBring,

    // Event fields
    eventDate,
    eventEndDate,
    venue,
    lineup[]{ name, role, time },
    ticketTypes[]{ name, price, description },
    ageRestriction,
    dresscode,

    // Service fields
    serviceArea,
    responseTime,
    isVerified,
    pricingTable[]{ service, price, unit },
    providerInfo,
    serviceTypes
  }
`

export const LISTING_SLUGS_QUERY = groq`
  *[_type == "listing" && status == "published"] {
    "slug": slug.current,
    type,
    subcategory,
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
  *[_type == "blogPost" && status == "published" && count(tags[lower(@) == $tag]) > 0] | order(publishedAt desc) {
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
          _id, title, slug, type, subcategory, city, price, priceUnit, tags,
          "coverPhoto": photos[0]{ ${IMAGE_FIELDS} }
        }
      },
      _type == "listingSliderBlock" => {
        ...,
        "listings": listings[]->{
          _id, title, slug, type, subcategory, city, pricePerNight, priceUnit, rating, reviewCount,
          "mainImageUrl": mainImage.asset->url + "?w=400&h=300&fit=crop&auto=format&q=80",
          isVerified, hostName
        }
      },
      _type == "eventSliderBlock" => {
        ...,
        "events": events[]->{
          _id, title, slug, type, subcategory, city, pricePerNight, priceUnit,
          "mainImageUrl": mainImage.asset->url + "?w=400&h=300&fit=crop&auto=format&q=80"
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

export const LATEST_BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost" && status == "published"] | order(publishedAt desc) [0...3] {
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

export const HOMEPAGE_DESTINATIONS_QUERY = groq`
  *[_type == "destination" && slug.current in ["watamu", "kilifi", "diani", "nairobi", "lamu"]] {
    _id,
    name,
    slug,
    tagline,
    county,
    "heroImage": heroImage{ ${IMAGE_FIELDS} }
  }
`

export const ALL_DESTINATIONS_QUERY = groq`
  *[_type == "destination"] | order(name asc) {
    _id,
    name,
    slug,
    tagline,
    description,
    "coverImage": heroImage{ ${IMAGE_FIELDS} }
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
    },
    "cityListings": *[_type == "listing" && status == "published" && lower(city) == lower(^.name)] | order(_createdAt desc) [0...12] {
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

// ── Events ──────────────────────────────────────

export const EVENTS_QUERY = groq`
  *[_type == "listing" && type == "event" && status == "published"] | order(eventDate asc, _createdAt desc) [0...12] {
    ${LISTING_CARD_FIELDS},
    eventDate,
    eventEndDate,
    venue,
    "coverPhotoUrl": photos[0].asset->url
  }
`

// ── Search ───────────────────────────────────────

// $q should be passed as "term*" from the caller for wildcard matching

export const SEARCH_LISTINGS_QUERY = groq`
  *[_type == "listing" && status == "published" && (
    title match $q ||
    city match $q ||
    county match $q ||
    description match $q ||
    $qLower in tags[]
  )
    && select($typeFilter != "" => type == $typeFilter, true)
    && select($cityFilter != "" => lower(city) == lower($cityFilter), true)
    && select($subFilter != "" => subcategory == $subFilter, true)
  ] | order(_createdAt desc) [0...$limit] {
    _id,
    title,
    "slug": slug.current,
    type,
    subcategory,
    city,
    county,
    price,
    priceUnit,
    "photo": photos[0].asset->url,
    avgRating,
    tags
  }
`

export const SEARCH_LISTINGS_FALLBACK_QUERY = groq`
  *[_type == "listing" && status == "published" && (
    city match $q
  )
    && select($typeFilter != "" => type == $typeFilter, true)
    && select($cityFilter != "" => lower(city) == lower($cityFilter), true)
  ] | order(_createdAt desc) [0...6] {
    _id,
    title,
    "slug": slug.current,
    type,
    subcategory,
    city,
    county,
    price,
    priceUnit,
    "photo": photos[0].asset->url,
    avgRating,
    tags
  }
`

export const SEARCH_DESTINATIONS_QUERY = groq`
  *[_type == "destination" && (
    name match $q ||
    city match $q ||
    tagline match $q
  )] | order(name asc) [0..5] {
    _id,
    name,
    "slug": slug.current,
    tagline,
    city,
    "heroImage": heroImage.asset->url
  }
`

export const SEARCH_BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost" && status == "published" && (
    title match $q ||
    excerpt match $q
  )] | order(publishedAt desc) [0..3] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    tags,
    readingTime,
    publishedAt,
    "coverImage": coverImage.asset->url
  }
`

// ── Home Page ────────────────────────────────────

export const HOME_PAGE_QUERY = groq`
  *[_type == "homePage"][0]{
    heroEyebrow,
    heroTitle,
    heroHighlight,
    heroSubtitle,
    heroStats,
    "heroImages": heroImages[].asset->url,
    featuredTitle,
    featuredSubtitle,
    eventsTitle,
    eventsSubtitle,
    destinationsTitle,
    destinationsSubtitle,
    howItWorksTitle,
    howItWorksSubtitle,
    howItWorksSteps,
    statsBar,
    hostEyebrow,
    hostTitle,
    hostHighlight,
    hostDescription,
    hostCtaPrimary,
    hostCtaPrimaryLink,
    hostCtaSecondary,
    hostCtaSecondaryLink,
    testimonialsTitle,
    testimonialsSubtitle,
    testimonials,
    metaTitle,
    metaDescription
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
