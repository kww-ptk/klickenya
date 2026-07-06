import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { syncEventPending } from "@/lib/listings/events";
import { revalidateListing } from "@/lib/listings/revalidate";

const body = z.object({ status: z.enum(["archived", "published"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertAdmin(req);
    const { id } = await params;
    const { status } = body.parse(await req.json());
    const existing = await sanityWriteClient.fetch<{ _id: string; type: string; city?: string; slug?: string } | null>(
      `*[_id == $id && _type == "listing"][0]{ _id, type, city, "slug": slug.current }`, { id });
    if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    await sanityWriteClient.patch(id).set({ status }).commit();
    if (status === "archived") await syncEventPending(id, existing.type, "archive");
    revalidateListing(existing.type, existing.city, existing.slug);
    return NextResponse.json({ success: true, status });
  } catch (err) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    console.error("Admin archive listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
