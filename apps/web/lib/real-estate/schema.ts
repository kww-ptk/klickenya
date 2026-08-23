import {
  SITE_URL,
  agentPath,
  propertyPath,
  isClosedStatus,
} from "./constants";
import type { PropertyCardData } from "./mappers";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/* ── Breadcrumbs ───────────────────────────────────── */

export interface Crumb {
  name: string;
  /** Omit on the current page — Google expects the last item without an item. */
  path?: string;
}

/**
 * Every real-estate page rendered a visual breadcrumb trail and none of them
 * emitted BreadcrumbList, so Google never showed the trail in results.
 */
export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
    })),
  };
}

/* ── Result lists ──────────────────────────────────── */

export function itemListSchema(
  cards: PropertyCardData[],
  { name, url }: { name: string; url: string }
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(url),
    numberOfItems: cards.length,
    itemListElement: cards.slice(0, 100).map((card, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(propertyPath(card.slug)),
      name: card.title,
    })),
  };
}

/* ── Property detail ───────────────────────────────── */

function availability(status?: string): string {
  if (status === "sold") return "https://schema.org/SoldOut";
  if (status === "let") return "https://schema.org/SoldOut";
  if (status === "under-offer") return "https://schema.org/LimitedAvailability";
  return "https://schema.org/InStock";
}

/**
 * The previous schema carried only name/description/image/address/price. Beds,
 * baths, floor size, availability, geo and the listing agent are exactly the
 * fields Google's property understanding uses, and they were all being dropped.
 */
export function propertyListingSchema(property: any, photos: string[]) {
  const slug = property.slug?.current ?? property.slug ?? "";
  const url = absoluteUrl(propertyPath(slug));
  const isRent =
    property.listingCategory === "for-rent" || property.priceType === "per-month";

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["RealEstateListing", "Product"],
    "@id": url,
    url,
    name: property.title,
    description:
      property.seoDescription ??
      `${property.title} in ${[property.neighbourhood, property.city].filter(Boolean).join(", ")}.`,
    image: photos.slice(0, 6),
    datePosted: property._createdAt,
    dateModified: property._updatedAt,
    address: {
      "@type": "PostalAddress",
      streetAddress: property.neighbourhood || undefined,
      addressLocality: property.city,
      addressRegion: property.county,
      addressCountry: "KE",
    },
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "KES",
      availability: availability(property.status),
      url,
      ...(isRent
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: property.price,
              priceCurrency: "KES",
              unitCode: "MON",
              billingIncrement: 1,
            },
          }
        : {}),
    },
  };

  if (property.lat != null && property.lng != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: property.lat,
      longitude: property.lng,
    };
  }

  if (property.bedrooms != null && property.bedrooms > 0) {
    schema.numberOfBedrooms = property.bedrooms;
    schema.numberOfRooms = property.bedrooms;
  }
  if (property.bathrooms != null && property.bathrooms > 0) {
    schema.numberOfBathroomsTotal = property.bathrooms;
  }
  if (property.sizeSqm != null && property.sizeSqm > 0) {
    schema.floorSize = {
      "@type": "QuantitativeValue",
      value: property.sizeSqm,
      unitCode: "MTK",
    };
  }
  if (property.landSizeAcres != null && property.landSizeAcres > 0) {
    schema.lotSize = {
      "@type": "QuantitativeValue",
      value: property.landSizeAcres,
      unitCode: "ACR",
    };
  }
  if (property.yearBuilt != null) {
    schema.yearBuilt = property.yearBuilt;
  }
  if (Array.isArray(property.features) && property.features.length > 0) {
    schema.amenityFeature = property.features.map((f: string) => ({
      "@type": "LocationFeatureSpecification",
      name: f,
      value: true,
    }));
  }
  if (property.agent?.displayName) {
    const agentSlug = property.agent.slug?.current ?? property.agent.slug ?? "";
    schema.broker = {
      "@type": "RealEstateAgent",
      name: property.agent.displayName,
      ...(property.agent.agencyName
        ? { worksFor: { "@type": "Organization", name: property.agent.agencyName } }
        : {}),
      ...(property.agent.phone ? { telephone: property.agent.phone } : {}),
      ...(agentSlug ? { url: absoluteUrl(agentPath(agentSlug)) } : {}),
    };
  }

  return schema;
}

/** Sold and let listings stay crawlable but should not compete in results. */
export function shouldNoIndex(status?: string): boolean {
  return status === "draft" || isClosedStatus(status);
}

/* ── Agents ────────────────────────────────────────── */

export function agentSchema(agent: any, photoUrl?: string) {
  const slug = agent.slug?.current ?? agent.slug ?? "";
  const url = absoluteUrl(agentPath(slug));
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": url,
    url,
    name: agent.displayName,
    ...(photoUrl ? { image: photoUrl } : {}),
    ...(agent.agencyName
      ? { worksFor: { "@type": "Organization", name: agent.agencyName } }
      : {}),
    ...(agent.phone ? { telephone: agent.phone } : {}),
    ...(agent.email ? { email: agent.email } : {}),
    ...(Array.isArray(agent.serviceAreas) && agent.serviceAreas.length
      ? { areaServed: agent.serviceAreas.map((a: string) => ({ "@type": "Place", name: a })) }
      : {}),
    address: { "@type": "PostalAddress", addressCountry: "KE" },
  };
}

/* ── FAQ ───────────────────────────────────────────── */

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
