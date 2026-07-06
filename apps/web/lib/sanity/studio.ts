/**
 * Sanity Studio deep-linking.
 *
 * The Studio is deployed with `studioHost: 'klickenya'` (apps/studio/sanity.cli.ts),
 * i.e. https://klickenya.sanity.studio. `NEXT_PUBLIC_SANITY_STUDIO_URL` was never set
 * in prod, so link builders fell back to http://localhost:3333 — every "Edit in Sanity"
 * button pointed at a dev server that isn't running.
 */
export const STUDIO_URL =
  process.env.NEXT_PUBLIC_SANITY_STUDIO_URL?.replace(/\/+$/, "") ||
  "https://klickenya.sanity.studio";

/**
 * Deep link that opens a document for editing in the Studio.
 *
 * Uses Sanity's intent resolver rather than a structural path like
 * `/structure/listing;<id>`. The structural form only resolves when a top-level
 * desk pane is named exactly after the schema type; with a custom desk structure
 * (which this Studio has) it lands on the wrong pane. Intent links resolve to the
 * correct document regardless of structure.
 */
export function studioEditUrl(type: string, id: string): string {
  return `${STUDIO_URL}/intent/edit/id=${id};type=${type}/`;
}
