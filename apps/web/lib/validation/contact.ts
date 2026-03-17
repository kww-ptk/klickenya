import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Kenyan phone regex: 07XX / 01XX or +254 prefix
// ---------------------------------------------------------------------------
export const kenyanPhoneRegex = /^(\+254|0)[17]\d{8}$/;

// ---------------------------------------------------------------------------
// Base contact schema (shared across all listing types)
// ---------------------------------------------------------------------------
const baseContactSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().regex(kenyanPhoneRegex, "Enter a valid Kenyan phone number (07XX or +254...)"),
  message: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Shared listing fields
// ---------------------------------------------------------------------------
const listingFields = {
  listingId: z.string().min(1),
  listingTitle: z.string().min(1),
} as const;

// ---------------------------------------------------------------------------
// Per-type schemas
// ---------------------------------------------------------------------------

export const stayContactSchema = baseContactSchema.extend({
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
  guests: z.number().min(1).max(50),
  ...listingFields,
  listingType: z.literal("stay"),
});

export const experienceContactSchema = baseContactSchema.extend({
  preferredDate: z.iso.date(),
  groupSize: z.number().min(1).max(50),
  experienceLevel: z.enum(["Beginner", "Intermediate", "Experienced"]),
  ...listingFields,
  listingType: z.literal("experience"),
});

export const eventContactSchema = baseContactSchema.extend({
  ticketQuantity: z.number().min(1).max(20),
  ticketType: z.string().min(1),
  promoCode: z.string().optional(),
  ...listingFields,
  listingType: z.literal("event"),
});

export const rentalContactSchema = baseContactSchema.extend({
  pickupDate: z.iso.date(),
  returnDate: z.iso.date(),
  licenceNumber: z.string().min(3),
  ...listingFields,
  listingType: z.literal("rental"),
});

export const serviceContactSchema = baseContactSchema.extend({
  preferredDate: z.iso.date(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.enum(["1h", "2h", "3h", "Half day", "Full day"]),
  ...listingFields,
  listingType: z.literal("service"),
});

export const restaurantContactSchema = baseContactSchema.extend({
  reservationDate: z.iso.date(),
  reservationTime: z.string().regex(/^\d{2}:\d{2}$/),
  diners: z.number().min(1).max(30),
  ...listingFields,
  listingType: z.literal("restaurant"),
});

// ---------------------------------------------------------------------------
// Discriminated union of all listing contact schemas
// ---------------------------------------------------------------------------
export const contactSchema = z.discriminatedUnion("listingType", [
  stayContactSchema,
  experienceContactSchema,
  eventContactSchema,
  rentalContactSchema,
  serviceContactSchema,
  restaurantContactSchema,
]);

// ---------------------------------------------------------------------------
// Property enquiry schema (standalone — not part of the listing union)
// ---------------------------------------------------------------------------
export const propertyEnquirySchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().regex(kenyanPhoneRegex, "Enter a valid Kenyan phone number (07XX or +254...)"),
  enquiryType: z.enum([
    "I want to buy",
    "I want to rent",
    "I want to arrange a viewing",
    "I want more information",
  ]),
  message: z.string().optional(),
  mortgageInterest: z.boolean(),
  propertyId: z.string().min(1),
  propertyTitle: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------
export type StayContact = z.infer<typeof stayContactSchema>;
export type ExperienceContact = z.infer<typeof experienceContactSchema>;
export type EventContact = z.infer<typeof eventContactSchema>;
export type RentalContact = z.infer<typeof rentalContactSchema>;
export type ServiceContact = z.infer<typeof serviceContactSchema>;
export type RestaurantContact = z.infer<typeof restaurantContactSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type PropertyEnquiry = z.infer<typeof propertyEnquirySchema>;
