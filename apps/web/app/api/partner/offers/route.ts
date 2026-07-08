import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sanityClient } from "@/lib/sanity/client";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { verifyPartnerKey } from "@/lib/partner/auth";

/**
 * GET/POST /api/partner/offers?partner=<partner_id>
 * Authorization: Bearer <partner's key from PARTNER_API_KEYS>
 *
 * Lists / appends a partner's promotional offers. Offers are lightweight
 * marketing banners stored as the `promotions` array on the partner's Sanity
 * document (not marketplace inventory, so not a top-level document type).
 * Each item is addressed by its Sanity array `_key`.
 * Server-to-server only; never called from a browser.
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

function pickFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) out[field] = body[field];
  }
  return out;
}

async function partnerDocId(partner: string): Promise<string | null> {
  const doc = await sanityClient.fetch<{ _id: string } | null>(
    `*[_type == "partner" && slug.current == $partner][0]{_id}`,
    { partner }
  );
  return doc?._id ?? null;
}

export async function GET(request: NextRequest) {
  const partner = request.nextUrl.searchParams.get("partner");
  if (!partner) {
    return NextResponse.json({ error: "partner query param required" }, { status: 400 });
  }
  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await sanityClient.fetch<{ promotions?: unknown[] } | null>(
    `*[_type == "partner" && slug.current == $partner][0]{promotions}`,
    { partner }
  );
  return NextResponse.json({ offers: doc?.promotions ?? [] });
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

  const docId = await partnerDocId(partner);
  if (!docId) {
    return NextResponse.json({ error: "Unknown partner" }, { status: 400 });
  }

  const offer = {
    _type: "promotion",
    _key: randomUUID().replace(/-/g, ""),
    ...pickFields(body),
    title,
    isPublished: body.isPublished === undefined ? true : Boolean(body.isPublished),
  };

  await sanityWriteClient
    .patch(docId)
    .setIfMissing({ promotions: [] })
    .append("promotions", [offer])
    .commit();

  return NextResponse.json({ offer }, { status: 201 });
}
