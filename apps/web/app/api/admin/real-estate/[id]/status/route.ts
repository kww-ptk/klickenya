import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import {
  PROPERTY_STATUSES,
  categoryCityPath,
  categoryPath,
  isPropertyCategory,
  propertyPath,
} from "@/lib/real-estate/constants";

/**
 * PATCH /api/admin/real-estate/[id]/status
 * Body: { status: "available" | "under-offer" | "sold" | "let" | "draft" }
 *
 * Moving a property between market states meant opening Sanity Studio, which
 * is the one thing an admin does to a listing most often. The property status
 * decides whether a listing appears in any grid, so the pages it affects are
 * revalidated here rather than waiting out the hour of ISR.
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let status: string;
  try {
    ({ status } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!(PROPERTY_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${PROPERTY_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!process.env.SANITY_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "SANITY_WRITE_TOKEN is not configured on this environment" },
      { status: 500 }
    );
  }

  const existing = await sanityClient
    .fetch<{
      _id: string;
      slug?: { current?: string };
      listingCategory?: string;
      city?: string;
      status?: string;
    } | null>(
      `*[_type == "property" && _id == $id][0]{ _id, slug, listingCategory, city, status }`,
      { id }
    )
    .catch(() => null);

  if (!existing) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  try {
    await sanityWriteClient.patch(id).set({ status }).commit();
  } catch (err) {
    console.error("Property status update failed:", err);
    return NextResponse.json(
      { error: "Could not update the property in Sanity" },
      { status: 502 }
    );
  }

  // Revalidate the concrete URLs this touches, not the route templates.
  const slug = existing.slug?.current;
  const paths = new Set<string>(["/real-estate"]);
  if (slug) paths.add(propertyPath(slug));
  if (existing.listingCategory && isPropertyCategory(existing.listingCategory)) {
    paths.add(categoryPath(existing.listingCategory));
    if (existing.city) {
      paths.add(categoryCityPath(existing.listingCategory, existing.city));
    }
  }
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      /* a revalidation miss self-heals on the next ISR window */
    }
  }

  return NextResponse.json({
    ok: true,
    id,
    previousStatus: existing.status ?? null,
    status,
    revalidated: Array.from(paths),
  });
}
