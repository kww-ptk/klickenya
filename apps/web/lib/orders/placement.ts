/**
 * Placement rules shared by the guest route (/api/orders) and the POS route
 * (/api/pos/orders). Both used to carry their own copy of the item checks and
 * both rejected a basket that held the same dish twice with different add-ons:
 * `.in("id", ids)` returns one row per distinct id, and the length compare
 * treated that as "an item is not on this menu".
 */

export function distinctIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/**
 * A required option group whose options are all unavailable cannot be
 * satisfied by anyone. The menu hides such a group (lib/eat/menus.ts drops
 * groups with no available option), so enforcing it server-side would reject
 * every basket containing that dish with a message nobody can act on.
 */
export function requiredGroupsToEnforce<G extends { id: string }>(
  groups: G[],
  availableOptionCountByGroup: ReadonlyMap<string, number>,
): G[] {
  return groups.filter((g) => (availableOptionCountByGroup.get(g.id) ?? 0) > 0);
}

/** Count the available options per group from a joined select. */
export function availableOptionCounts(
  groups: { id: string; item_options?: { is_available: boolean | null }[] | null }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const g of groups) {
    const n = (g.item_options ?? []).filter((o) => o.is_available !== false).length;
    counts.set(g.id, n);
  }
  return counts;
}
