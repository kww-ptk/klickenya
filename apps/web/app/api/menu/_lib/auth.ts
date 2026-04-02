import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Returns the session user ID and whether they are an admin.
 * Admin users can bypass menu ownership checks.
 */
export async function getMenuAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, isAdmin: false, supabase };

  const { data: profile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    isAdmin: profile?.role === "admin",
    supabase,
  };
}

/**
 * Verify menu ownership: returns the menu if owned by user or if user is admin.
 */
export async function verifyMenuAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menuId: string,
  userId: string,
  isAdmin: boolean
) {
  if (isAdmin) {
    // Admin: fetch without ownership filter
    const { data } = await adminClient
      .from("menus")
      .select("id")
      .eq("id", menuId)
      .single();
    return data;
  }

  const { data } = await supabase
    .from("menus")
    .select("id")
    .eq("id", menuId)
    .eq("business_id", userId)
    .single();
  return data;
}
