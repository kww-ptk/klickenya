import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";

// NOTE: The listing_requests table does not yet have a "notes" column.
// A migration is required to add it:
//   ALTER TABLE listing_requests ADD COLUMN notes text;
// Until that migration is run, this endpoint will return a Supabase error.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin(request);
    const { id } = await params;
    const { note } = await request.json();

    if (typeof note !== "string") {
      return NextResponse.json(
        { error: "note must be a string" },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from("listing_requests")
      .update({ notes: note })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
