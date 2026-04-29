import { adminClient } from "@/lib/supabase/admin";

/**
 * Resolve a published menu by slug for the POS terminal.
 * Returns the bare minimum the POS pages need; never returns sensitive
 * fields like business_id back to the client component layer.
 */
export interface PosMenu {
  id:                   string;
  slug:                 string;
  name:                 string;
  table_ordering:       boolean;
  reservations_enabled: boolean;
}

export async function getPosMenuBySlug(slug: string): Promise<PosMenu | null> {
  const { data } = await adminClient
    .from("menus")
    .select("id, slug, name, table_ordering, reservations_enabled, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (!data) return null;
  return {
    id:                   data.id,
    slug:                 data.slug,
    name:                 data.name,
    table_ordering:       !!data.table_ordering,
    reservations_enabled: !!data.reservations_enabled,
  };
}
