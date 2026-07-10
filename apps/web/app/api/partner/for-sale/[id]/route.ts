import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { verifyPartnerKey } from "@/lib/partner/auth";

/**
 * GET/PATCH /api/partner/for-sale/[id]?partner=<partner_id>
 * Authorization: Bearer <partner's key from PARTNER_API_KEYS>
 *
 * Read or update one for-sale property (Sanity `property` document).
 * Ownership checked via the document's `partner` reference matching the
 * requesting partner. Server-to-server only.
 */

const EDITABLE_FIELDS = [
  "title",
  "propertyType",
  "status",
  "price",
  "bedrooms",
  "bathrooms",
  "sizeSqm",
  "neighbourhood",
  "city",
  "county",
  "features",
  "seoTitle",
  "seoDescription",
] as const;

function toPortableText(text: string) {
  return [
    {
      _type: "block",
      style: "normal",
      children: [{ _type: "span", text }],
    },
  ];
}

async function loadOwnedProperty(id: string, partner: string) {
  return sanityClient.fetch(
    `*[_type == "property" && _id == $id && partner->slug.current == $partner][0]`,
    { id, partner }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }
  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const property = await loadOwnedProperty(id, partner);
  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ property });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }
  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const property = await loadOwnedProperty(id, partner);
  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const patch = sanityWriteClient.patch(id);
  const set: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) set[field] = body[field];
  }
  if (typeof body.description === "string") {
    set.description = toPortableText(body.description);
  }
  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const updated = await patch.set(set).commit();
  return NextResponse.json({ property: updated });
}
