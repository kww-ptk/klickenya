import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Idempotent menu seed-or-reassign.
 *
 * Used by:
 *   - /api/admin/hosts/[id]/assign  (admin assigning a listing to a host)
 *   - /api/claim/verify             (owner claiming their own listing)
 *
 * Both paths previously called `upsert(..., { ignoreDuplicates: true })` on
 * the menus table, keyed on slug. That has a hidden bug: if a menu already
 * existed for the slug (because someone claimed earlier, or because we
 * pre-seeded it), the upsert kept the original business_id and the new
 * owner couldn't see the menu in their dashboard. Public /m/<slug> still
 * worked (no ownership check), making the bug invisible until the new
 * host tried to manage it.
 *
 * Behaviour:
 *   - If a menu row exists for the slug, UPDATE business_id (the only field
 *     a reassignment should touch — name / display_name / is_published may
 *     have been edited by previous owner and must not be clobbered).
 *   - If no menu exists, INSERT a fresh row with the seed defaults.
 *
 * Returns the menu id or null if neither branch succeeded.
 */
export async function reassignOrSeedMenu(
  client: SupabaseClient,
  opts: {
    slug: string;
    businessId: string;
    listingSlug: string;
    name: string;
    displayName?: string;
  },
): Promise<{ id: string | null; created: boolean; reassigned: boolean }> {
  const { slug, businessId, listingSlug, name, displayName } = opts;

  // 1. Try to reassign an existing row.
  const { data: updated } = await client
    .from("menus")
    .update({ business_id: businessId })
    .eq("slug", slug)
    .select("id")
    .maybeSingle();

  if (updated) {
    return { id: updated.id as string, created: false, reassigned: true };
  }

  // 2. No row existed — seed a fresh one.
  const { data: inserted } = await client
    .from("menus")
    .insert({
      slug,
      listing_slug: listingSlug,
      business_id: businessId,
      name,
      display_name: displayName ?? name,
      is_published: false,
    })
    .select("id")
    .single();

  return { id: (inserted?.id as string) ?? null, created: true, reassigned: false };
}
