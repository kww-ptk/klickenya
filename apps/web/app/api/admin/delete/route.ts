import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";

const ALLOWED_TABLES = [
  "contact_requests",
  "property_enquiries",
  "listing_requests",
  "general_contacts",
  "ambassador_applications",
  "claim_requests",
  "newsletter_subscribers",
] as const;

const deleteSchema = z.object({
  table: z.enum(ALLOWED_TABLES),
  id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { table, id } = parsed.data;

    const { error } = await adminClient
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`Delete error (${table}):`, error);
      return NextResponse.json(
        { error: "Failed to delete" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
