import { groq } from "next-sanity";

/** All partners, newest first — for the /admin/partners list. */
export const ADMIN_PARTNERS_QUERY = groq`
  *[_type == "partner"] | order(_createdAt desc) {
    _id,
    name,
    "slug": slug.current,
    domains,
    "logoUrl": logo.asset->url,
    enabledModules,
    "listingCount": count(*[_type == "listing" && partner._ref == ^._id])
  }
`;

/** One partner by _id — for the edit form. */
export const ADMIN_PARTNER_BY_ID_QUERY = groq`
  *[_type == "partner" && _id == $id][0] {
    _id, name, "slug": slug.current, domains,
    "logoUrl": logo.asset->url,
    colorPrimary, colorAccent, colorDark, fontDisplay, fontBody,
    enabledModules, allowedListingTypes,
    contactEmail, contactPhone, footerText, defaultCity, landingHtml,
    "listingId": *[_type == "listing" && partner._ref == ^._id][0]._id
  }
`;

/** Published listings not yet assigned to any partner (candidates for assignment). */
export const UNASSIGNED_LISTINGS_QUERY = groq`
  *[_type == "listing" && status == "published" && !defined(partner)] | order(title asc) {
    _id, title, "slug": slug.current, type, subcategory, city
  }
`;
