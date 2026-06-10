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
  defaultCity
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
