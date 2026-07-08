import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { verifyPartnerKey } from "@/lib/partner/auth";

/**
 * PATCH/DELETE /api/partner/offers/[key]?partner=<partner_id>
 * Authorization: Bearer <partner's key from PARTNER_API_KEYS>
 *
 * Update or remove one promotion (by its Sanity array `_key`) on the
 * partner's `promotions` array. Ownership is implicit — the partner doc is
 * resolved from the authenticated partner slug, so a partner can only touch
 * its own offers. Server-to-server only.
 */

const EDITABLE_FIELDS = [
  "title",
  "subtitle",
  "category",
  "badge",
  "body",
  "ctaLabel",
  "ctaUrl",
  "validFrom",
  "validTo",
  "isPublished",
] as const;

async function partnerDocId(partner: string): Promise<string | null> {
  const doc = await sanityClient.fetch<{ _id: string } | null>(
    `*[_type == "partner" && slug.current == $partner][0]{_id}`,
    { partner }
  );
  return doc?._id ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }
  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docId = await partnerDocId(partner);
  if (!docId) {
    return NextResponse.json({ error: "Unknown partner" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const set: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) set[`promotions[_key==$key].${field}`] = body[field];
  }
  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  await sanityWriteClient
    .patch(docId)
    .set(set)
    .commit({ params: { key } });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }
  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docId = await partnerDocId(partner);
  if (!docId) {
    return NextResponse.json({ error: "Unknown partner" }, { status: 400 });
  }

  await sanityWriteClient
    .patch(docId)
    .unset([`promotions[_key=="${key}"]`])
    .commit();

  return NextResponse.json({ success: true });
}
