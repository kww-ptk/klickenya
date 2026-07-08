import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { verifyPartnerKey } from "@/lib/partner/auth";

/**
 * GET/POST /api/partner/tours?partner=<partner_id>
 * Authorization: Bearer <partner's key from PARTNER_API_KEYS>
 *
 * Lists / creates a partner's tours/experiences as Sanity `listing`
 * documents (type: "experience"), scoped via the `partner` reference field.
 * Server-to-server only; never called from a browser.
 */

function toPortableText(text: string) {
  return [{ _type: "block", style: "normal", children: [{ _type: "span", text }] }];
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96);
}

export async function GET(request: NextRequest) {
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }
  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tours = await sanityClient.fetch(
    `*[_type == "listing" && type == "experience" && partner->slug.current == $partner] | order(_createdAt desc) {
      _id, title, "slug": slug.current, status, price, duration, "photo": photos[0].asset->url
    }`,
    { partner }
  );

  return NextResponse.json({ tours });
}

export async function POST(request: NextRequest) {
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }
  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const partnerDoc = await sanityClient.fetch<{ _id: string; defaultCity?: string } | null>(
    `*[_type == "partner" && slug.current == $partner][0]{_id, defaultCity}`,
    { partner }
  );
  if (!partnerDoc) {
    return NextResponse.json({ error: "Unknown partner" }, { status: 400 });
  }

  const created = await sanityWriteClient.create({
    _type: "listing",
    partner: { _type: "reference", _ref: partnerDoc._id },
    publishToMarketplace: false,
    title,
    slug: { _type: "slug", current: slugify(title) + "-" + Date.now().toString(36) },
    type: "experience",
    subcategory: "cultural",
    status: "draft",
    city: partnerDoc.defaultCity || "Watamu",
    bookingType: "contact_form",
    description: typeof body.description === "string" && body.description
      ? toPortableText(body.description)
      : undefined,
  });

  return NextResponse.json({ tour: created }, { status: 201 });
}
