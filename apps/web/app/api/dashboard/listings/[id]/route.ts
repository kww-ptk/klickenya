import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getAuthUser, getHostProfile, getIsAdmin } from "@/app/dashboard/_lib/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { listingInputSchema, inputToSanityFields, type ListingInput } from "@/lib/listings/listingFields";
import { hostOwnsListing } from "@/lib/listings/ownership";
import { syncEventPending } from "@/lib/listings/events";
import { revalidateListing } from "@/lib/listings/revalidate";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;

    const hostProfile = await getHostProfile(user.id);
    const isAdmin = await getIsAdmin(user.id);
    const { ok, type } = await hostOwnsListing(id, user.id, hostProfile?.sanity_host_id ?? null);
    if (!ok && !isAdmin) return NextResponse.json({ error: "You don't have permission to edit this listing." }, { status: 403 });
    if (!type) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    const data = listingInputSchema.parse(await req.json());
    const stored = await sanityWriteClient.fetch<{ slug: string; type: string } | null>(
      `*[_id == $id][0]{ "slug": slug.current, type }`, { id });
    if (!stored) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    const safe: ListingInput = { ...data, slug: stored.slug, type: stored.type, status: data.status === "archived" ? "archived" : "published" };
    const fields = inputToSanityFields(safe);
    await sanityWriteClient.patch(id).set(fields).commit();
    await syncEventPending(id, stored.type, "update", { title: safe.title, city: safe.city });
    revalidateListing(stored.type, safe.city, stored.slug);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    console.error("Host edit listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
