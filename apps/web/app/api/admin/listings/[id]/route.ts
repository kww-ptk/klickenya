import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { listingInputSchema, inputToSanityFields } from "@/lib/listings/listingFields";
import { syncEventPending } from "@/lib/listings/events";
import { revalidateListing } from "@/lib/listings/revalidate";

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
    revalidateListing(data.type, data.city, data.slug);
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
    const existing = await sanityWriteClient.fetch<{ _id: string; type: string; city?: string; slug?: string } | null>(
      `*[_id == $id && _type == "listing"][0]{ _id, type, city, "slug": slug.current }`, { id });
    if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    // Sanity refuses to delete a document that strong references point to. Listings
    // are strongly referenced by host.listings[] (and blog/destination relatedListings),
    // so a plain delete() throws and the listing lingers on the host page and marketplace.
    // Strip the reference from every referring document IN THE SAME TRANSACTION as the
    // delete, so referential integrity holds at commit time.
    const referrers = await sanityWriteClient.fetch<{ _id: string; _type: string; slug: string | null }[]>(
      `*[references($id)]{ _id, _type, "slug": slug.current }`, { id });

    await syncEventPending(id, existing.type, "delete");

    let tx = sanityWriteClient.transaction();
    for (const r of referrers) {
      tx = tx.patch(r._id, (p) =>
        p.unset([
          `listings[_ref=="${id}"]`,
          `relatedListings[_ref=="${id}"]`,
          `events[_ref=="${id}"]`,
        ]),
      );
    }
    tx = tx.delete(id);
    await tx.commit();

    // Refresh public marketplace pages + every host profile page that listed it.
    revalidateListing(existing.type, existing.city, existing.slug);
    revalidatePath("/hosts", "page");
    for (const r of referrers) {
      if (r._type === "host" && r.slug) revalidatePath(`/hosts/${r.slug}`, "page");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Admin delete listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
