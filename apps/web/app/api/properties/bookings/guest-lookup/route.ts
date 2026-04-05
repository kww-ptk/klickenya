import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  // Only authenticated users (hosts) can call this
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ guest_user_id: null });

  // Check public users table first (fast, indexed by email)
  const { data: row } = await adminClient
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (row?.id) {
    return NextResponse.json({ guest_user_id: row.id });
  }

  // Fallback: query auth.users directly via admin API
  // Handles users who registered via OAuth and may lag in the public users table
  const { data: authData } = await adminClient.auth.admin.getUserByEmail(email);
  return NextResponse.json({ guest_user_id: authData?.user?.id ?? null });
}
