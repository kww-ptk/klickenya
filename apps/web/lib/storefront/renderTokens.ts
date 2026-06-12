import type { StorefrontMenu } from "@/lib/storefront/getRestaurant";

interface RenderCtx {
  menuSlug: string | null;       // menu.slug — for the booking iframe
  menuSections: StorefrontMenu["menu_sections"] | null;
  accentHex: string | null;      // partner.colorPrimary (e.g. "#0055FF" or null)
  siteUrl: string;               // NEXT_PUBLIC_SITE_URL
}

/** Booking iframe (the existing /embed widget). Empty when no bookable menu. */
function bookingHtml(ctx: RenderCtx): string {
  if (!ctx.menuSlug) return "";
  const accent = ctx.accentHex ? `?accent=${encodeURIComponent(ctx.accentHex.replace("#", ""))}` : "";
  const src = `${ctx.siteUrl}/embed/reservations/${ctx.menuSlug}${accent}`;
  return `<iframe src="${src}" style="width:100%;max-width:520px;height:680px;border:0" title="Book a table"></iframe>`;
}

/** Live menu as semantic HTML the operator's CSS can target (.kk-menu*). */
export function renderMenuHtml(sections: StorefrontMenu["menu_sections"] | null): string {
  const visible = (sections ?? []).filter((s) => s.is_visible && s.menu_items.length > 0);
  if (visible.length === 0) return `<div class="kk-menu kk-menu--empty">Menu coming soon.</div>`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sectionsHtml = visible
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => {
      const items = s.menu_items
        .filter((i) => i.is_available)
        .sort((a, b) => a.display_order - b.display_order)
        .map(
          (i) =>
            `<li class="kk-menu-item"><span class="kk-item-name">${esc(i.name)}</span>` +
            (i.description ? `<span class="kk-item-desc">${esc(i.description)}</span>` : "") +
            `<span class="kk-item-price">KES ${i.price_kes}</span></li>`,
        )
        .join("");
      return `<section class="kk-menu-section"><h3 class="kk-section-title">${esc(s.title)}</h3><ul class="kk-menu-list">${items}</ul></section>`;
    })
    .join("");
  return `<div class="kk-menu">${sectionsHtml}</div>`;
}

/** If a full document was pasted, take the <body> inner + hoist <head> <style>/<link>. */
function extractRenderable(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return html; // already a fragment
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headStyles = headMatch
    ? (headMatch[1].match(/<style[\s\S]*?<\/style>|<link[^>]*rel=["']stylesheet["'][^>]*>/gi) ?? []).join("\n")
    : "";
  return `${headStyles}\n${bodyMatch[1]}`;
}

/** Replace {{BOOKING}} / {{MENU}} and normalize a pasted full document to a renderable fragment. */
export function renderLandingHtml(rawHtml: string, ctx: RenderCtx): string {
  let html = extractRenderable(rawHtml);
  html = html.split("{{BOOKING}}").join(bookingHtml(ctx));
  html = html.split("{{MENU}}").join(renderMenuHtml(ctx.menuSections));
  return html;
}
