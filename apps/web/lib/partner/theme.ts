import type { Partner } from "@/lib/partner/types";

/** Strip characters that could break out of a <style> block. */
function clean(value: string): string {
  return value.replace(/[<>{}]/g, "").trim();
}

/**
 * Build a `:root{…}` CSS override from a partner's theme tokens.
 * Only properties the partner actually set are emitted — unset ones fall back
 * to the Klickenya defaults in globals.css. Returns "" when there is nothing
 * to override (house brand, or a partner with no theme fields).
 *
 * Token mapping (v1, per spec §7):
 *   colorPrimary -> --color-amber
 *   colorAccent  -> --color-purple
 *   colorDark    -> --color-dark + --color-text
 *   fontDisplay  -> --font-display
 *   fontBody     -> --font-body
 * Secondary shades (--color-amber2/purple2/dims) stay Klickenya in v1.
 */
export function partnerThemeCss(partner: Partner | null): string {
  if (!partner) return "";
  const decls: string[] = [];
  if (partner.colorPrimary) decls.push(`--color-amber:${clean(partner.colorPrimary)};`);
  if (partner.colorAccent) decls.push(`--color-purple:${clean(partner.colorAccent)};`);
  if (partner.colorDark) {
    const dark = clean(partner.colorDark);
    decls.push(`--color-dark:${dark};`);
    decls.push(`--color-text:${dark};`);
  }
  if (partner.fontDisplay) decls.push(`--font-display:"${clean(partner.fontDisplay)}", sans-serif;`);
  if (partner.fontBody) decls.push(`--font-body:"${clean(partner.fontBody)}", sans-serif;`);
  if (decls.length === 0) return "";
  return `:root{${decls.join("")}}`;
}
