import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";

const VALID_TYPES = ["stay", "experience", "event", "service", "rental", "restaurant"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const draftTitle = String(body.draftTitle ?? "").trim();
    const listingType = String(body.listingType ?? "").trim();

    if (!draftTitle) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(listingType)) {
      return NextResponse.json({ error: "Invalid listing type" }, { status: 400 });
    }

    const text = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s.length ? s : null;
    };

    const { error } = await adminClient
      .from("listing_requests")
      .update({
        draft_title: draftTitle,
        listing_type: listingType,
        draft_city: text(body.draftCity),
        draft_subcategory: text(body.draftSubcategory),
        business_name: text(body.businessName),
        draft_description: text(body.draftDescription),
        draft_website: text(body.draftWebsite),
        draft_instagram: text(body.draftInstagram),
        draft_phone: text(body.draftPhone),
        draft_email: text(body.draftEmail),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath(`/admin/listing-requests/${id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Listing-request draft update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
