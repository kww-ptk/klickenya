import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: property } = await adminClient
    .from("properties")
    .select("id, owner_id, listing_slug")
    .eq("id", id)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (property.listing_slug) {
    revalidatePath(`/stays/${property.listing_slug}`);
  }
  revalidatePath(`/dashboard/property/${id}`);

  return NextResponse.json({
    success: true,
    revalidated_at: new Date().toISOString(),
  });
}
