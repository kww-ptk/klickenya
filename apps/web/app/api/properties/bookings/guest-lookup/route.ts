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

  // Fallback: scan auth.users for email match
  // Handles users who registered via OAuth and may lag in the public users table
  const { data: authList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const match = authList?.users?.find((u) => u.email?.toLowerCase() === email);
  return NextResponse.json({ guest_user_id: match?.id ?? null });
}
