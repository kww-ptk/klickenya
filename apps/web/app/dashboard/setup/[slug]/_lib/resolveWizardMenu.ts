import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getAuthUser, getIsAdmin } from "@/app/dashboard/_lib/auth";

/**
 * Wizard pages and /api/setup/* routes are all keyed by listing_slug
 * (the URL slug is the same one used by the public listing page).
 *
 * This helper resolves the user → menu mapping in one query, redirecting
 * unauthenticated users to /login and unauthorised users to /dashboard.
 *
 * Returns the full menu row needed by every step page, so each page can
 * compute the next-step destination locally without re-fetching.
 */

export type WizardMenu = {
  id: string;
  slug: string;
  listing_slug: string | null;
  name: string;
  is_published: boolean;
  table_ordering: boolean;
  reservations_enabled: boolean;
  stock_enabled: boolean;
  reservations_decided_at: string | null;
  table_ordering_decided_at: string | null;
  stock_decided_at: string | null;
  setup_completed_at: string | null;
  setup_dismissed_at: string | null;
  takeaway_waitlist: boolean;
  delivery_waitlist: boolean;
};

export async function resolveWizardMenu(listingSlug: string): Promise<{
  userId: string;
  menu: WizardMenu;
}> {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const isAdmin = await getIsAdmin(user.id);

  let query = adminClient
    .from("menus")
    .select(
      [
        "id",
        "slug",
        "listing_slug",
        "name",
        "is_published",
        "table_ordering",
        "reservations_enabled",
        "stock_enabled",
        "reservations_decided_at",
        "table_ordering_decided_at",
        "stock_decided_at",
        "setup_completed_at",
        "setup_dismissed_at",
        "takeaway_waitlist",
        "delivery_waitlist",
      ].join(", "),
    )
    .eq("listing_slug", listingSlug);
  if (!isAdmin) query = query.eq("business_id", user.id);

  const { data } = await query.maybeSingle<WizardMenu>();
  if (!data) redirect("/dashboard");

  return { userId: user.id, menu: data };
}
