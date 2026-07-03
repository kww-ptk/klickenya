import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { listingInputSchema, inputToSanityFields } from "@/lib/listings/listingFields";
import { syncEventPending } from "@/lib/listings/events";
import { revalidateListingPaths } from "@/lib/listings/revalidate";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertAdmin(req);
    const { id } = await params;
    const data = listingInputSchema.parse(await req.json());

    const existing = await sanityWriteClient.fetch<{ _id: string; type: string } | null>(
      `*[_id == $id && _type == "listing"][0]{ _id, type }`, { id });
    if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    const clash = await sanityWriteClient.fetch<string | null>(
      `*[_type == "listing" && slug.current == $slug && _id != $id][0]._id`, { slug: data.slug, id });
    if (clash) return NextResponse.json({ error: "Another listing already uses this slug." }, { status: 409 });

    const fields = inputToSanityFields(data);
    await sanityWriteClient.patch(id).set(fields).commit();
    await syncEventPending(id, data.type, "update", { title: data.title, city: data.city });
    revalidateListingPaths();
    return NextResponse.json({ success: true, id, slug: data.slug });
  } catch (err) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    console.error("Admin edit listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertAdmin(req);
    const { id } = await params;
    const existing = await sanityWriteClient.fetch<{ _id: string; type: string } | null>(
      `*[_id == $id && _type == "listing"][0]{ _id, type }`, { id });
    if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    await syncEventPending(id, existing.type, "delete");
    await sanityWriteClient.delete(id);
    revalidateListingPaths();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Admin delete listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
