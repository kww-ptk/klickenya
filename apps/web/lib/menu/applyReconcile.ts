/**
 * The database half of a menu reconcile. The planning is pure and lives in
 * ./reconcile; this module is the only place that writes.
 *
 * Kept out of the route handler so it can be driven directly against a real
 * database — the write ordering here (sections before items, deletes before
 * inserts) is the part that unit tests over a pure planner cannot prove.
 */

import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import type { ExistingSection, IncomingSection, ReconcilePlan } from "./reconcile";

/** Mirrors commitSectionSchema in app/api/menu/import/route.ts. */
export const importSectionSchema = z.object({
  title: z.string().min(1).max(200),
  items: z.array(
    z.object({
      name:         z.string().min(1).max(200),
      description:  z.string().max(1000).optional().default(""),
      price_kes:    z.number().min(0),
      dietary_tags: z.array(z.string().max(50)).max(10).optional().default([]),
    })
  ).min(0).max(200),
});

export type CommitSection = z.infer<typeof importSectionSchema>;

function sanitiseText(raw: string, maxLen: number): string {
  return raw.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
}

/** Clean the incoming payload once, so the plan and the writes agree exactly. */
export function toIncoming(sections: CommitSection[]): IncomingSection[] {
  return sections
    .map((s) => ({
      title: sanitiseText(s.title, 200),
      items: s.items
        .map((i) => ({
          name:         sanitiseText(i.name, 200),
          description:  sanitiseText(i.description ?? "", 1000),
          price_kes:    Math.max(0, Math.round(i.price_kes ?? 0)),
          dietary_tags: (i.dietary_tags ?? [])
                          .map((t) => sanitiseText(t, 50))
                          .filter(Boolean)
                          .slice(0, 10),
        }))
        .filter((i) => i.name),
    }))
    .filter((s) => s.title);
}

/**
 * Read the menu as it stands. Errors are thrown rather than swallowed: a
 * PostgREST 400 leaves `data` null, and reconciling against a null menu would
 * read as "nothing here yet" and delete the lot.
 */
export async function loadExistingMenu(menuId: string): Promise<ExistingSection[]> {
  const { data, error } = await adminClient
    .from("menu_sections")
    .select(
      "id, title, display_order, menu_items(id, name, description, price_kes, dietary_tags, display_order)"
    )
    .eq("menu_id", menuId)
    .order("display_order");

  if (error) throw new Error(`Could not read the current menu: ${error.message}`);

  return (data ?? []).map((s) => {
    const row = s as unknown as {
      id: string;
      title: string;
      display_order: number;
      menu_items: Array<{
        id: string;
        name: string;
        description: string | null;
        price_kes: number;
        dietary_tags: string[] | null;
        display_order: number;
      }> | null;
    };
    return {
      id:            row.id,
      title:         row.title,
      display_order: row.display_order,
      items: (row.menu_items ?? [])
        .map((i) => ({
          id:            i.id,
          name:          i.name,
          description:   i.description,
          price_kes:     Number(i.price_kes),
          dietary_tags:  i.dietary_tags ?? [],
          display_order: i.display_order,
        }))
        .sort((a, b) => a.display_order - b.display_order),
    };
  });
}

/**
 * What an owner loses if they confirm the removals. Deleting a menu item
 * cascades to its option groups and its recipe, and detaches it from past
 * orders — none of which is visible from the menu screen.
 */
export async function describeDependencies(itemIds: string[]) {
  if (itemIds.length === 0) {
    return { withOptions: 0, withRecipe: 0, withOrders: 0 };
  }
  const [opts, recipes, orders] = await Promise.all([
    adminClient.from("item_option_groups").select("menu_item_id").in("menu_item_id", itemIds),
    adminClient.from("recipes").select("menu_item_id").in("menu_item_id", itemIds),
    adminClient.from("order_items").select("menu_item_id").in("menu_item_id", itemIds),
  ]);
  const uniq = (r: { data: Array<{ menu_item_id: string | null }> | null }) =>
    new Set((r.data ?? []).map((x) => x.menu_item_id).filter(Boolean)).size;

  return { withOptions: uniq(opts), withRecipe: uniq(recipes), withOrders: uniq(orders) };
}

/**
 * Turn rename pairs the owner rejected back into a removal plus an addition,
 * so a wrong guess is never written.
 */
export function applyRejections(
  plan: ReconcilePlan,
  rejected: Array<{ section: string; from: string; to: string }>
): ReconcilePlan {
  if (rejected.length === 0) return plan;
  // JSON rather than a delimiter: a dish name may contain any character,
  // and a collision here would reject the wrong rename.
  const key = (s: string, f: string, t: string) =>
    JSON.stringify([s, f, t].map((x) => x.toLowerCase()));
  const rejectedKeys = new Set(rejected.map((r) => key(r.section, r.from, r.to)));

  const sections = plan.sections.map((sec) => {
    const keep = [];
    const extraCreates = [...sec.creates];
    const extraDeletes = [...sec.deletes];

    for (const u of sec.updates) {
      const newName = u.patch.name ?? u.previousName;
      if (u.renamed && rejectedKeys.has(key(sec.title, u.previousName, newName))) {
        extraDeletes.push({ id: u.id, name: u.previousName });
        extraCreates.push({
          name:          newName,
          description:   u.patch.description ?? "",
          price_kes:     u.patch.price_kes ?? 0,
          dietary_tags:  u.patch.dietary_tags ?? [],
          display_order: u.patch.display_order ?? extraCreates.length,
        });
        continue;
      }
      keep.push(u);
    }
    return { ...sec, updates: keep, creates: extraCreates, deletes: extraDeletes };
  });

  const counts = { ...plan.counts };
  counts.itemsUpdated  = sections.reduce((n, s) => n + s.updates.length, 0);
  counts.itemsRenamed  = sections.reduce((n, s) => n + s.updates.filter((u) => u.renamed).length, 0);
  counts.itemsCreated  = sections.reduce((n, s) => n + s.creates.length, 0);
  counts.itemsDeleted  = sections.reduce((n, s) => n + s.deletes.length, 0)
                       + plan.deletedSections.reduce((n, s) => n + s.itemCount, 0);

  return { ...plan, sections, counts };
}

/** Apply a plan. Ordering matters: sections are created before their items. */
export async function applyPlan(menuId: string, plan: ReconcilePlan) {
  // 1. Sections that no longer exist — cascades to their items.
  for (const s of plan.deletedSections) {
    const { error } = await adminClient.from("menu_sections").delete().eq("id", s.id);
    if (error) throw new Error(`Could not remove section "${s.title}": ${error.message}`);
  }

  for (const sec of plan.sections) {
    let sectionId = sec.sectionId;

    if (sectionId === null) {
      const { data, error } = await adminClient
        .from("menu_sections")
        .insert({
          menu_id:       menuId,
          title:         sec.title,
          display_order: sec.displayOrder,
          is_visible:    true,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`Could not add section "${sec.title}": ${error?.message}`);
      sectionId = data.id;
    } else if (sec.sectionPatch) {
      const { error } = await adminClient
        .from("menu_sections")
        .update(sec.sectionPatch)
        .eq("id", sectionId);
      if (error) throw new Error(`Could not reorder "${sec.title}": ${error.message}`);
    }

    // 2. Removals before insertions, so a dish that swapped places with
    //    another does not collide on display_order mid-flight.
    if (sec.deletes.length > 0) {
      const { error } = await adminClient
        .from("menu_items")
        .delete()
        .in("id", sec.deletes.map((d) => d.id));
      if (error) throw new Error(`Could not remove items from "${sec.title}": ${error.message}`);
    }

    for (const u of sec.updates) {
      const { error } = await adminClient.from("menu_items").update(u.patch).eq("id", u.id);
      if (error) throw new Error(`Could not update "${u.previousName}": ${error.message}`);
    }

    if (sec.creates.length > 0) {
      const { error } = await adminClient.from("menu_items").insert(
        sec.creates.map((c) => ({
          section_id:    sectionId,
          name:          c.name,
          description:   c.description || null,
          price_kes:     c.price_kes,
          dietary_tags:  c.dietary_tags,
          is_available:  true,
          display_order: c.display_order,
        }))
      );
      if (error) throw new Error(`Could not add items to "${sec.title}": ${error.message}`);
    }
  }
}

