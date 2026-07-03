import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getAuthUser, getHostProfile, getIsAdmin } from "@/app/dashboard/_lib/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { hostOwnsListing } from "@/lib/listings/ownership";
import { syncEventPending } from "@/lib/listings/events";
import { revalidateListingPaths } from "@/lib/listings/revalidate";

const body = z.object({ status: z.enum(["archived", "published"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const hostProfile = await getHostProfile(user.id);
    const isAdmin = await getIsAdmin(user.id);
    const { ok, type } = await hostOwnsListing(id, user.id, hostProfile?.sanity_host_id ?? null);
    if (!ok && !isAdmin) return NextResponse.json({ error: "You don't have permission." }, { status: 403 });
    if (!type) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    const { status } = body.parse(await req.json());
    await sanityWriteClient.patch(id).set({ status }).commit();
    if (status === "archived") await syncEventPending(id, type, "archive");
    revalidateListingPaths();
    return NextResponse.json({ success: true, status });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    console.error("Host archive listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
