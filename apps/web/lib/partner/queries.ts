import { groq } from 'next-sanity'

export const PARTNER_PROJECTION = `
  _id,
  name,
  "slug": slug.current,
  domains,
  "logo": { "url": logo.asset->url, "alt": logo.alt },
  "favicon": { "url": favicon.asset->url, "alt": favicon.alt },
  poweredByKlickenya,
  colorPrimary,
  colorAccent,
  colorDark,
  fontDisplay,
  fontBody,
  fontUrl,
  enabledModules,
  allowedListingTypes,
  contactEmail,
  contactPhone,
  footerText,
  defaultCity,
  landingHtml
`

// Resolve a partner by an incoming request hostname. $host must be the bare
// hostname (no protocol/port), e.g. "sunsetrentals.com".
export const PARTNER_BY_DOMAIN_QUERY = groq`
  *[_type == "partner" && $host in domains][0] {
    ${PARTNER_PROJECTION}
  }
`

export const PARTNER_BY_SLUG_QUERY = groq`
  *[_type == "partner" && slug.current == $slug][0] {
    ${PARTNER_PROJECTION}
  }
`

// The partner's primary restaurant listing (published). Display fields only;
// booking data comes from the linked Supabase menu.
export const PARTNER_RESTAURANT_LISTING_QUERY = groq`
  *[_type == "listing" && status == "published" && partner._ref == $partnerId][0] {
    _id,
    title,
    "slug": slug.current,
    type,
    city,
    county,
    address,
    description,
    openingHours,
    cuisine,
    priceRange,
    atmosphere,
    "photos": photos[]{ "url": asset->url, alt }
  }
`
