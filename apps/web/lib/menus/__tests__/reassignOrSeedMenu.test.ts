/**
 * The "Mannis bug": when an admin reassigned a listing whose menu already
 * existed, the upsert (`ignoreDuplicates: true`) silently no-op'd and the
 * new owner's dashboard came up empty. The new helper updates business_id
 * when a row exists, otherwise inserts a fresh seed.
 *
 * These tests use a hand-rolled mock client because the supabase-js mock
 * surface for chained .from(…).update(…).eq(…).select(…).maybeSingle()
 * + .from(…).insert(…).select(…).single() is small enough to be clearer
 * inline than via vi.mock.
 */

import { describe, expect, test, vi } from "vitest";
import { reassignOrSeedMenu } from "../reassignOrSeedMenu";

type Result<T> = Promise<{ data: T | null; error: null }>;

function makeClient(opts: {
  existingId: string | null; // null = no row exists for the slug
  insertedId?: string;
}) {
  const updateSpy = vi.fn();
  const insertSpy = vi.fn();

  const client = {
    from: (table: string) => {
      if (table !== "menus") throw new Error(`unexpected table ${table}`);
      return {
        update: (patch: Record<string, unknown>) => {
          updateSpy(patch);
          return {
            eq: () => ({
              select: () => ({
                maybeSingle: (): Result<{ id: string }> =>
                  Promise.resolve({
                    data: opts.existingId ? { id: opts.existingId } : null,
                    error: null,
                  }),
              }),
            }),
          };
        },
        insert: (row: Record<string, unknown>) => {
          insertSpy(row);
          return {
            select: () => ({
              single: (): Result<{ id: string }> =>
                Promise.resolve({
                  data: opts.insertedId ? { id: opts.insertedId } : null,
                  error: null,
                }),
            }),
          };
        },
      };
    },
  };

  return { client, updateSpy, insertSpy };
}

describe("reassignOrSeedMenu", () => {
  test("existing menu → reassigns business_id only, does NOT insert, does NOT touch name/is_published", async () => {
    const { client, updateSpy, insertSpy } = makeClient({ existingId: "menu-existing" });

    const result = await reassignOrSeedMenu(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
      {
        slug: "mannis-restaurant",
        listingSlug: "mannis-restaurant",
        businessId: "patrik-user-id",
        name: "Mannis Restaurant Menu",
      },
    );

    expect(result).toEqual({ id: "menu-existing", created: false, reassigned: true });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({ business_id: "patrik-user-id" });
    // Critical: the update payload must NOT include name / is_published —
    // those were potentially edited by the previous owner and must be
    // preserved.
    const patch = updateSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("name");
    expect(patch).not.toHaveProperty("display_name");
    expect(patch).not.toHaveProperty("is_published");
    expect(patch).not.toHaveProperty("listing_slug");
    // No insert path was taken.
    expect(insertSpy).not.toHaveBeenCalled();
  });

  test("no existing menu → inserts a fresh seed with default is_published = false", async () => {
    const { client, updateSpy, insertSpy } = makeClient({
      existingId: null,
      insertedId: "menu-new",
    });

    const result = await reassignOrSeedMenu(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
      {
        slug: "kivukoni",
        listingSlug: "kivukoni",
        businessId: "owner-1",
        name: "Kivukoni Menu",
      },
    );

    expect(result).toEqual({ id: "menu-new", created: true, reassigned: false });
    expect(updateSpy).toHaveBeenCalledTimes(1); // probe call always fires
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "kivukoni",
        listing_slug: "kivukoni",
        business_id: "owner-1",
        name: "Kivukoni Menu",
        display_name: "Kivukoni Menu",
        is_published: false,
      }),
    );
  });

  test("display_name defaults to name when omitted, but is respected when provided", async () => {
    const { client, insertSpy } = makeClient({ existingId: null, insertedId: "menu-new" });

    await reassignOrSeedMenu(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
      {
        slug: "kivukoni",
        listingSlug: "kivukoni",
        businessId: "owner-1",
        name: "Kivukoni Menu",
        displayName: "Kivukoni — Watamu",
      },
    );

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: "Kivukoni — Watamu" }),
    );
  });
});
