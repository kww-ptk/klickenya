import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { resolveManageableEvent } from "@/lib/events/manageableEvent";
import { revalidateListing } from "@/lib/listings/revalidate";
import { mergeTierKeys, validateTierInput, type TierInput } from "@/lib/tickets/tierEdit";

const tierSchema = z.object({
  _key: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  price: z.number().min(0),
  description: z.string().trim().max(200).optional(),
  available: z.number().int().min(0).optional(),
  isSoldOut: z.boolean().optional(),
});
const bodySchema = z.object({ tiers: z.array(tierSchema).max(20) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const managed = await resolveManageableEvent(supabase, user.id, id);
  if (!managed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid tiers" }, { status: 400 });
  for (const t of parsed.data.tiers) {
    const v = validateTierInput(t as TierInput);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  }

  const doc = await sanityClient.fetch<{
    ticketTypes: { _key: string; name: string; price: number }[] | null;
    city: string | null;
    slug: string | null;
  } | null>(
    `*[_type == "listing" && _id == $id][0]{
      ticketTypes[]{_key, name, price},
      city, "slug": slug.current
    }`,
    { id: managed.sanityEventId },
  );

  const merged = mergeTierKeys(doc?.ticketTypes ?? [], parsed.data.tiers as TierInput[], randomUUID);

  try {
    await sanityWriteClient.patch(managed.sanityEventId).set({ ticketTypes: merged }).commit();
  } catch (e) {
    console.error("[tiers] sanity patch failed:", e);
    return NextResponse.json({ error: "Could not save tiers" }, { status: 500 });
  }

  // Refresh the public event detail page (+ grids). revalidateListing builds the
  // concrete /events/{city}/{slug} path exactly like generateStaticParams.
  if (doc?.city && doc?.slug) {
    revalidateListing("event", doc.city, doc.slug);
  }

  return NextResponse.json({ ok: true, tiers: merged });
}
