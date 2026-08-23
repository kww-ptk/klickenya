import { urlForImage } from "@/lib/sanity/image";

/**
 * The shape every property grid renders. Built once here instead of the four
 * near-identical `mapPropertyToCard` copies that used to live in the page files.
 */
export interface PropertyCardData {
  id: string;
  title: string;
  slug: string;
  listingCategory: string;
  propertyType?: string;
  status: string;
  price: number;
  priceType: string;
  previousPrice?: number;
  isFeatured?: boolean;
  isNewDevelopment?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  landSizeAcres?: number;
  features: string[];
  neighbourhood: string;
  city: string;
  coverPhoto?: string;
  coverPhotoAlt?: string;
  photoCount: number;
  createdAt?: string;
  updatedAt?: string;
  developerName?: string;
  completionPercentage?: number;
  unitsAvailable?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapPropertyToCard(p: any): PropertyCardData {
  return {
    id: p._id,
    title: p.title ?? "Untitled",
    slug: p.slug?.current ?? p.slug ?? "",
    listingCategory: p.listingCategory ?? "for-sale",
    propertyType: p.propertyType,
    status: p.status ?? "available",
    price: p.price ?? 0,
    priceType: p.priceType ?? "total",
    previousPrice: p.previousPrice ?? undefined,
    isFeatured: p.isFeatured ?? false,
    isNewDevelopment: p.isNewDevelopment ?? false,
    bedrooms: p.bedrooms ?? undefined,
    bathrooms: p.bathrooms ?? undefined,
    sizeSqm: p.sizeSqm ?? undefined,
    landSizeAcres: p.landSizeAcres ?? undefined,
    features: Array.isArray(p.features) ? p.features : [],
    neighbourhood: p.neighbourhood ?? "",
    city: p.city ?? "",
    coverPhoto: p.coverPhoto?.asset
      ? urlForImage(p.coverPhoto).width(800).height(600).url()
      : undefined,
    coverPhotoAlt: p.coverPhoto?.alt ?? undefined,
    photoCount: p.photoCount ?? 0,
    createdAt: p._createdAt,
    updatedAt: p._updatedAt,
    developerName: p.developerName ?? undefined,
    completionPercentage: p.completionPercentage ?? undefined,
    unitsAvailable: p.unitsAvailable ?? undefined,
  };
}

export function mapPropertiesToCards(input: unknown): PropertyCardData[] {
  return ((input ?? []) as any[]).map(mapPropertyToCard);
}

/* ── Neighbourhoods ────────────────────────────────── */

export interface NeighbourhoodCardData {
  name: string;
  slug: string;
  city: string;
  avgPrice?: number;
  avgPriceForRent?: number;
  imageUrl?: string;
  propertyCount?: number;
}

export function mapNeighbourhood(n: any): NeighbourhoodCardData {
  return {
    name: n.name ?? "Unnamed",
    slug: n.slug?.current ?? n.slug ?? "",
    city: n.city ?? "",
    avgPrice: n.avgPriceForSale ?? undefined,
    avgPriceForRent: n.avgPriceForRent ?? undefined,
    imageUrl: n.heroImage?.asset
      ? urlForImage(n.heroImage).width(600).height(450).url()
      : undefined,
    propertyCount: n.propertyCount ?? undefined,
  };
}

/* ── Agents ────────────────────────────────────────── */

export interface AgentCardData {
  name: string;
  slug: string;
  agency?: string;
  isVerified?: boolean;
  photoUrl?: string;
  specialisations?: string[];
  propertyCount?: number;
}

export function mapAgent(a: any): AgentCardData {
  return {
    name: a.displayName ?? "Agent",
    slug: a.slug?.current ?? a.slug ?? "",
    agency: a.agencyName ?? undefined,
    isVerified: a.isVerified ?? false,
    photoUrl: a.photo?.asset ? urlForImage(a.photo).width(200).height(200).url() : undefined,
    specialisations: a.specialisations ?? undefined,
    propertyCount: a.propertyCount ?? undefined,
  };
}
