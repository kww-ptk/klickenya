import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient as createSanityClient } from "next-sanity";
import { createClient } from "@supabase/supabase-js";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";

const sanityWrite = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const uploadedImageSchema = z.object({
  assetId: z.string(),
  url: z.string(),
  alt: z.string(),
});

const schema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  type: z.string().min(1),
  subcategory: z.string().optional(),
  city: z.string().min(1),
  county: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["draft", "published"]),
  description: z.string().optional(),
  // Pricing
  price: z.number().min(0).optional(),
  priceUnit: z.string().optional(),
  bookingType: z.string().optional(),
  maxGuests: z.number().int().min(1).optional(),
  rentingType: z.string().optional(),
  // Contact
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notificationEmail: z.string().email().optional().or(z.literal("")),
  notificationEmail2: z.string().email().optional().or(z.literal("")),
  hostEmail: z.string().email().optional().or(z.literal("")),
  // Features
  amenities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  // Photos
  photos: z.array(uploadedImageSchema).optional(),
  photoConsent: z.enum(["yes_all", "yes_logo_only", "no"]).optional(),
  // Restaurant
  cuisine: z.array(z.string()).optional(),
  priceRange: z.string().optional(),
  openingHours: z.string().optional(),
  atmosphere: z.string().optional(),
  reservationRequired: z.boolean().optional(),
  // Experience
  duration: z.string().optional(),
  maxGroupSize: z.number().int().min(1).optional(),
  difficulty: z.string().optional(),
  minAge: z.number().int().min(0).optional(),
  languages: z.array(z.string()).optional(),
  meetingPoint: z.string().optional(),
  // Event
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
  // Service
  serviceArea: z.string().optional(),
  responseTime: z.string().optional(),
  providerInfo: z.string().optional(),
  // SEO
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  submissionSource: z.string().optional(),
});

function toPortableText(text: string) {
  return [
    {
      _type: "block",
      _key: Math.random().toString(36).slice(2, 10),
      children: [{ _type: "span", _key: Math.random().toString(36).slice(2, 10), text }],
    },
  ];
}

function sanityImage(assetId: string, alt: string) {
  return {
    _type: "image",
    _key: Math.random().toString(36).slice(2, 10),
    asset: { _type: "reference", _ref: assetId },
    alt,
  };
}

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req);

    const body = await req.json();
    const data = schema.parse(body);

    /* Check slug uniqueness in Sanity */
    const existing = await sanityWrite.fetch(
      `*[_type == "listing" && slug.current == $slug][0]._id`,
      { slug: data.slug }
    );
    if (existing) {
      return NextResponse.json(
        { error: "A listing with this slug already exists. Choose a different slug." },
        { status: 409 }
      );
    }

    /* Optionally resolve host */
    let hostRef: { _type: string; _ref: string } | undefined;
    if (data.hostEmail) {
      const { data: hostProfile } = await supabase
        .from("host_profiles")
        .select("sanity_host_id")
        .eq("email", data.hostEmail)
        .single();

      if (hostProfile?.sanity_host_id) {
        hostRef = { _type: "reference", _ref: hostProfile.sanity_host_id };
      }
    }

    /* Build photos array for Sanity */
    const sanityPhotos = data.photos?.length
      ? data.photos.map((p) => sanityImage(p.assetId, p.alt || data.title))
      : undefined;

    /* Create listing in Sanity */
    const listing = await sanityWrite.create({
      _type: "listing",
      title: data.title,
      slug: { _type: "slug", current: data.slug },
      type: data.type,
      subcategory: data.subcategory || undefined,
      city: data.city,
      county: data.county || undefined,
      address: data.address || undefined,
      status: data.status,
      description: data.description ? toPortableText(data.description) : undefined,
      // Pricing
      price: data.price ?? undefined,
      priceUnit: data.priceUnit || undefined,
      bookingType: data.bookingType || undefined,
      maxGuests: data.maxGuests ?? undefined,
      rentingType: data.rentingType || undefined,
      // Contact
      website: data.website || undefined,
      instagram: data.instagram || undefined,
      facebook: data.facebook || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      notificationEmail1: data.notificationEmail || undefined,
      notificationEmail2: data.notificationEmail2 || undefined,
      // Features
      amenities: data.amenities?.length ? data.amenities : undefined,
      tags: data.tags?.length ? data.tags : undefined,
      // Photos
      photos: sanityPhotos,
      // Restaurant
      cuisine: data.cuisine?.length ? data.cuisine : undefined,
      priceRange: data.priceRange || undefined,
      openingHours: data.openingHours || undefined,
      atmosphere: data.atmosphere || undefined,
      reservationRequired: data.reservationRequired ?? undefined,
      // Experience
      duration: data.duration || undefined,
      maxGroupSize: data.maxGroupSize ?? undefined,
      difficulty: data.difficulty || undefined,
      minAge: data.minAge ?? undefined,
      languages: data.languages?.length ? data.languages : undefined,
      meetingPoint: data.meetingPoint || undefined,
      // Event
      eventDate: data.eventDate || undefined,
      eventEndDate: data.eventEndDate || undefined,
      venue: data.venue || undefined,
      ageRestriction: data.ageRestriction || undefined,
      dresscode: data.dresscode || undefined,
      venueAddress: data.venueAddress || undefined,
      doorsOpen: data.doorsOpen || undefined,
      isFree: data.isFree ?? undefined,
      priceFrom: data.priceFrom ?? undefined,
      ticketLink: data.ticketLink || undefined,
      organizer: data.organizer || undefined,
      // Service
      serviceArea: data.serviceArea || undefined,
      responseTime: data.responseTime || undefined,
      providerInfo: data.providerInfo || undefined,
      // SEO
      seoTitle: data.seoTitle || undefined,
      seoDescription: data.seoDescription || undefined,
      // Verification
      isVerified: false,
      submissionSource: data.submissionSource || "admin",
      ...(hostRef && { host: hostRef }),
    });

    /* If host found and has sanity_host_id, append listing reference to host doc */
    if (hostRef) {
      try {
        await sanityWrite
          .patch(hostRef._ref)
          .setIfMissing({ listings: [] })
          .append("listings", [
            { _type: "reference", _ref: listing._id, _key: Math.random().toString(36).slice(2, 10) },
          ])
          .commit();
      } catch (patchErr) {
        console.error("Host listings patch error:", patchErr);
      }
    }

    return NextResponse.json({ success: true, listingId: listing._id, slug: data.slug });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return NextResponse.json(
        { error: first?.message ?? "Invalid data." },
        { status: 400 }
      );
    }
    console.error("Admin create listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
