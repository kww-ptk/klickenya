import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { listing_slug, display_name, slug } = await req.json();

    if (!listing_slug?.trim() || !display_name?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { error: "listing_slug, display_name, and slug are required" },
        { status: 400 }
      );
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("menus")
      .select("id")
      .eq("slug", cleanSlug)
      .single();

    if (existing) {
      const suggestion = `${cleanSlug}-${Math.random().toString(36).slice(2, 6)}`;
      return NextResponse.json(
        { error: "Slug already taken", suggestion },
        { status: 409 }
      );
    }

    const { data: menu, error } = await supabase
      .from("menus")
      .insert({
        business_id: user.id,
        slug: cleanSlug,
        listing_slug: listing_slug.trim(),
        display_name: display_name.trim(),
        name: display_name.trim(),
        is_published: false,
        ordering_enabled: false,
      })
      .select("id, slug, display_name, listing_slug, is_published")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidateTag(`owner:${user.id}`, "default");
    return NextResponse.json(menu);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
