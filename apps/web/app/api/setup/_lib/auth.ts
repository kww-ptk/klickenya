import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth helper for /api/setup/* routes. Mirrors getMenuAuth +
 * verifyMenuAccess from /api/menu/_lib/auth, but returns the wider menu
 * shape the setup endpoints actually need (decided_at timestamps, waitlist
 * booleans, etc.).
 *
 * Returns null for the menu when the caller is unauthenticated, the menu
 * doesn't exist, or the menu isn't owned by the caller (and they aren't
 * an admin).
 */
export async function getSetupAuth(menuId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, menu: null as null };

  const { data: profile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  let q = adminClient
    .from("menus")
    .select(
      "id, slug, listing_slug, business_id, is_published, table_ordering, reservations_enabled, stock_enabled",
    )
    .eq("id", menuId);
  if (!isAdmin) q = q.eq("business_id", user.id);

  const { data: menu } = await q.maybeSingle<{
    id: string;
    slug: string;
    listing_slug: string | null;
    business_id: string;
    is_published: boolean;
    table_ordering: boolean;
    reservations_enabled: boolean;
    stock_enabled: boolean;
  }>();

  return { userId: user.id, menu: menu ?? null };
}
