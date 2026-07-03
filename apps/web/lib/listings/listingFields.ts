// apps/web/lib/listings/listingFields.ts
import { z } from "zod/v4";
import type { UploadedImage } from "@/components/shared/ImageUploader";

/* ── Validation schema (superset used by create + edit) ── */
export const uploadedImageSchema = z.object({
  assetId: z.string(),
  url: z.string(),
  alt: z.string(),
});

export const listingInputSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  type: z.string().min(1),
  subcategory: z.string().optional(),
  city: z.string().min(1),
  county: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]),
  description: z.string().optional(),
  descriptionLocked: z.boolean().optional(),
  price: z.number().min(0).optional(),
  priceUnit: z.string().optional(),
  bookingType: z.string().optional(),
  maxGuests: z.number().int().min(1).optional(),
  rentingType: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notificationEmail: z.string().email().optional().or(z.literal("")),
  notificationEmail2: z.string().email().optional().or(z.literal("")),
  hostEmail: z.string().email().optional().or(z.literal("")),
  amenities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  photos: z.array(uploadedImageSchema).optional(),
  photoConsent: z.enum(["yes_all", "yes_logo_only", "no"]).optional(),
  cuisine: z.array(z.string()).optional(),
  priceRange: z.string().optional(),
  openingHours: z.string().optional(),
  atmosphere: z.string().optional(),
  reservationRequired: z.boolean().optional(),
  duration: z.string().optional(),
  maxGroupSize: z.number().int().min(1).optional(),
  difficulty: z.string().optional(),
  minAge: z.number().int().min(0).optional(),
  languages: z.array(z.string()).optional(),
  meetingPoint: z.string().optional(),
  eventDate: z.string().optional(),
  eventEndDate: z.string().optional(),
  venue: z.string().optional(),
  ageRestriction: z.string().optional(),
  dresscode: z.string().optional(),
  venueAddress: z.string().optional(),
  doorsOpen: z.string().optional(),
  isFree: z.boolean().optional(),
  priceFrom: z.number().min(0).optional(),
  ticketLink: z.string().optional(),
  organizer: z.string().optional(),
  serviceArea: z.string().optional(),
  responseTime: z.string().optional(),
  providerInfo: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  submissionSource: z.string().optional(),
});

export type ListingInput = z.infer<typeof listingInputSchema>;

/* ── Client-side form state shape (all strings, for controlled inputs) ── */
export interface ListingFormValues {
  title: string; slug: string; type: string; subcategory: string; city: string; county: string; address: string;
  status: "draft" | "published" | "archived"; description: string; descriptionLocked: boolean;
  price: string; priceUnit: string; bookingType: string; maxGuests: string; rentingType: string;
  website: string; instagram: string; facebook: string; phone: string; email: string;
  notificationEmail: string; notificationEmail2: string; hostEmail: string;
  amenities: string[]; tags: string[]; photos: UploadedImage[]; photoConsent: string;
  cuisine: string[]; priceRange: string; openingHours: string; atmosphere: string; reservationRequired: boolean;
  duration: string; maxGroupSize: string; difficulty: string; minAge: string; languages: string[]; meetingPoint: string;
  eventDate: string; eventEndDate: string; venue: string; ageRestriction: string; dresscode: string;
  venueAddress: string; doorsOpen: string; isFree: boolean; priceFrom: string; ticketLink: string; organizer: string;
  serviceArea: string; responseTime: string; providerInfo: string;
  seoTitle: string; seoDescription: string;
}

export const emptyListingForm: ListingFormValues = {
  title: "", slug: "", type: "stay", subcategory: "", city: "", county: "", address: "",
  status: "draft", description: "", descriptionLocked: false,
  price: "", priceUnit: "night", bookingType: "contact_form", maxGuests: "", rentingType: "entire_place",
  website: "", instagram: "", facebook: "", phone: "", email: "",
  notificationEmail: "", notificationEmail2: "", hostEmail: "",
  amenities: [], tags: [], photos: [], photoConsent: "",
  cuisine: [], priceRange: "", openingHours: "", atmosphere: "", reservationRequired: false,
  duration: "", maxGroupSize: "", difficulty: "", minAge: "", languages: [], meetingPoint: "",
  eventDate: "", eventEndDate: "", venue: "", ageRestriction: "", dresscode: "",
  venueAddress: "", doorsOpen: "", isFree: false, priceFrom: "", ticketLink: "", organizer: "",
  serviceArea: "", responseTime: "", providerInfo: "",
  seoTitle: "", seoDescription: "",
};

/* ── Portable-text description helpers (data-safety) ── */
const rnd = () => Math.random().toString(36).slice(2, 10);

/** A description is "plain" (safe to edit as text) only if every block is a
 *  vanilla `block` with normal style and no marks — i.e. no Photo Rows, tip
 *  cards, headings, links, etc. Empty description also counts as plain. */
export function isPlainDescription(desc: unknown): boolean {
  if (!desc) return true;
  if (!Array.isArray(desc)) return false;
  return desc.every((b) => {
    if (!b || typeof b !== "object") return false;
    const block = b as Record<string, unknown>;
    if (block._type !== "block") return false;
    if (block.style && block.style !== "normal") return false;
    if (Array.isArray(block.markDefs) && block.markDefs.length > 0) return false;
    const children = (block.children as Array<Record<string, unknown>>) ?? [];
    return children.every((c) => c._type === "span" && (!Array.isArray(c.marks) || c.marks.length === 0));
  });
}

/** Join plain portable-text blocks into a textarea string (paragraph per block). */
export function descriptionToText(desc: unknown): string {
  if (!Array.isArray(desc)) return "";
  return desc
    .map((b) => {
      const children = ((b as Record<string, unknown>).children as Array<{ text?: string }>) ?? [];
      return children.map((c) => c.text ?? "").join("");
    })
    .join("\n\n")
    .trim();
}

/** Convert textarea text back into portable-text blocks (one block per paragraph). */
export function textToDescription(text: string) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const source = paras.length ? paras : [text.trim()].filter(Boolean);
  return source.map((p) => ({
    _type: "block" as const,
    _key: rnd(),
    style: "normal",
    markDefs: [],
    children: [{ _type: "span" as const, _key: rnd(), text: p, marks: [] }],
  }));
}

/* ── Photo mapping ── */
export function uploadedToSanityPhotos(photos?: UploadedImage[], fallbackAlt = "") {
  if (!photos?.length) return undefined;
  return photos.map((p) => ({
    _type: "image" as const,
    _key: rnd(),
    asset: { _type: "reference" as const, _ref: p.assetId },
    alt: p.alt || fallbackAlt,
  }));
}

/** Map read-side Sanity photos (asset->{_id,url}) into UploadedImage[] for the uploader. */
export function sanityPhotosToUploaded(
  photos?: Array<{ asset?: { _id?: string; url?: string }; alt?: string }>,
): UploadedImage[] {
  if (!photos?.length) return [];
  return photos
    .filter((p) => p.asset?._id && p.asset?.url)
    .map((p) => ({ assetId: p.asset!._id!, url: p.asset!.url!, alt: p.alt ?? "" }));
}

/* ── Form values → Sanity patch object (scalar fields only) ── */
/** Builds the `set` object for a Sanity patch/create from validated input.
 *  Omits `description` entirely when `descriptionLocked` so rich content is preserved.
 *  Returns only defined scalar fields — never touches nested Studio arrays. */
export function inputToSanityFields(data: ListingInput) {
  const isStay = data.type === "stay";
  const isRestaurant = data.subcategory === "restaurants";
  const isExperience = data.type === "experience" && !isRestaurant;
  const isEvent = data.type === "event";
  const isService = data.type === "service";

  const fields: Record<string, unknown> = {
    title: data.title,
    slug: { _type: "slug", current: data.slug },
    type: data.type,
    subcategory: data.subcategory || undefined,
    city: data.city,
    county: data.county || undefined,
    address: data.address || undefined,
    status: data.status,
    price: data.price ?? undefined,
    priceUnit: data.priceUnit || undefined,
    bookingType: data.bookingType || undefined,
    maxGuests: data.maxGuests ?? undefined,
    rentingType: isStay ? data.rentingType || undefined : undefined,
    website: data.website || undefined,
    instagram: data.instagram || undefined,
    facebook: data.facebook || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    notificationEmail1: data.notificationEmail || undefined,
    notificationEmail2: data.notificationEmail2 || undefined,
    amenities: data.amenities?.length ? data.amenities : undefined,
    tags: data.tags?.length ? data.tags : undefined,
    photos: uploadedToSanityPhotos(data.photos, data.title),
    cuisine: isRestaurant && data.cuisine?.length ? data.cuisine : undefined,
    priceRange: isRestaurant ? data.priceRange || undefined : undefined,
    openingHours: isRestaurant ? data.openingHours || undefined : undefined,
    atmosphere: isRestaurant ? data.atmosphere || undefined : undefined,
    reservationRequired: isRestaurant ? data.reservationRequired ?? undefined : undefined,
    duration: isExperience ? data.duration || undefined : undefined,
    maxGroupSize: isExperience ? data.maxGroupSize ?? undefined : undefined,
    difficulty: isExperience ? data.difficulty || undefined : undefined,
    minAge: isExperience ? data.minAge ?? undefined : undefined,
    languages: isExperience && data.languages?.length ? data.languages : undefined,
    meetingPoint: isExperience ? data.meetingPoint || undefined : undefined,
    eventDate: isEvent ? data.eventDate || undefined : undefined,
    eventEndDate: isEvent ? data.eventEndDate || undefined : undefined,
    venue: isEvent ? data.venue || undefined : undefined,
    ageRestriction: isEvent ? data.ageRestriction || undefined : undefined,
    dresscode: isEvent ? data.dresscode || undefined : undefined,
    venueAddress: isEvent ? data.venueAddress || undefined : undefined,
    doorsOpen: isEvent ? data.doorsOpen || undefined : undefined,
    isFree: isEvent ? data.isFree ?? undefined : undefined,
    priceFrom: isEvent ? data.priceFrom ?? undefined : undefined,
    ticketLink: isEvent ? data.ticketLink || undefined : undefined,
    organizer: isEvent ? data.organizer || undefined : undefined,
    serviceArea: isService ? data.serviceArea || undefined : undefined,
    responseTime: isService ? data.responseTime || undefined : undefined,
    providerInfo: isService ? data.providerInfo || undefined : undefined,
    seoTitle: data.seoTitle || undefined,
    seoDescription: data.seoDescription || undefined,
  };

  if (!data.descriptionLocked) {
    fields.description = data.description ? textToDescription(data.description) : undefined;
  }

  return fields;
}

/** Build editor form values from a fetched Sanity listing doc.
 *  `doc.photos` must be projected with asset->{_id,url}. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanityDocToForm(doc: Record<string, any>): ListingFormValues {
  const plain = isPlainDescription(doc.description);
  return {
    ...emptyListingForm,
    title: doc.title ?? "",
    slug: doc.slug?.current ?? doc.slug ?? "",
    type: doc.type ?? "stay",
    subcategory: doc.subcategory ?? "",
    city: doc.city ?? "",
    county: doc.county ?? "",
    address: doc.address ?? "",
    status: (doc.status ?? "draft") as ListingFormValues["status"],
    description: descriptionToText(doc.description),
    descriptionLocked: !plain,
    price: doc.price != null ? String(doc.price) : "",
    priceUnit: doc.priceUnit ?? "night",
    bookingType: doc.bookingType ?? "contact_form",
    maxGuests: doc.maxGuests != null ? String(doc.maxGuests) : "",
    rentingType: doc.rentingType ?? "entire_place",
    website: doc.website ?? "", instagram: doc.instagram ?? "", facebook: doc.facebook ?? "",
    phone: doc.phone ?? "", email: doc.email ?? "",
    notificationEmail: doc.notificationEmail1 ?? "", notificationEmail2: doc.notificationEmail2 ?? "",
    amenities: doc.amenities ?? [], tags: doc.tags ?? [],
    photos: sanityPhotosToUploaded(doc.photos),
    cuisine: doc.cuisine ?? [], priceRange: doc.priceRange ?? "", openingHours: doc.openingHours ?? "",
    atmosphere: doc.atmosphere ?? "", reservationRequired: !!doc.reservationRequired,
    duration: doc.duration ?? "", maxGroupSize: doc.maxGroupSize != null ? String(doc.maxGroupSize) : "",
    difficulty: doc.difficulty ?? "", minAge: doc.minAge != null ? String(doc.minAge) : "",
    languages: doc.languages ?? [], meetingPoint: doc.meetingPoint ?? "",
    eventDate: doc.eventDate ? String(doc.eventDate).slice(0, 16) : "",
    eventEndDate: doc.eventEndDate ? String(doc.eventEndDate).slice(0, 16) : "",
    venue: doc.venue ?? "", ageRestriction: doc.ageRestriction ?? "", dresscode: doc.dresscode ?? "",
    venueAddress: doc.venueAddress ?? "", doorsOpen: doc.doorsOpen ?? "", isFree: !!doc.isFree,
    priceFrom: doc.priceFrom != null ? String(doc.priceFrom) : "", ticketLink: doc.ticketLink ?? "",
    organizer: doc.organizer ?? "",
    serviceArea: doc.serviceArea ?? "", responseTime: doc.responseTime ?? "", providerInfo: doc.providerInfo ?? "",
    seoTitle: doc.seoTitle ?? "", seoDescription: doc.seoDescription ?? "",
  };
}
