# Premium Storefront — Upgraded Template + Custom-HTML Override — Design

**Date:** 2026-06-12
**Status:** Approved design, pending implementation plan
**Author:** Patrik Giuliana (with Claude)

## 1. Purpose

The white-label restaurant storefront works but looks basic. Make partner sites premium in two complementary ways:

- **Upgraded default template** — every restaurant partner automatically gets a polished, modern landing page auto-filled from their data. Zero per-client effort.
- **Custom-HTML override** — for clients who want a bespoke page, the operator pastes a complete HTML landing page (designed in Claude) into the admin form; Klickenya serves it verbatim at the partner's site, with the booking widget and live menu dropped in via simple tokens.

Reuses what already shipped: the partner/theming system, `getRestaurant`, the menu data, and **dev's `/embed/reservations/<slug>` widget** (a standalone themeable booking iframe).

## 2. One resolution point

The storefront resolver (used by both `/w/<slug>` and the host-routed `/storefront`) branches on the partner:

- **`partner.landingHtml` is set** → serve the custom HTML page (tokens replaced).
- **otherwise** → render the upgraded default template.

Everything else (which partner, which restaurant/menu, theming) is unchanged.

## 3. Custom-HTML override

### 3.1 Storage
A new optional **`landingHtml`** field (type `text`) on the Sanity `partner` doc. Authored via a new textarea in the `/admin/partners` create/edit form ("Custom landing page HTML — optional"), with a short note listing the tokens.

### 3.2 Serving
When `landingHtml` is present, Klickenya serves it as the **full page** at `/w/<slug>` and the partner's custom domain — the operator's own `<head>`, fonts, and styles, with **no Klickenya React shell** wrapping it. (Implementation note for the plan: a raw-HTML **route handler** returning `text/html` gives true full-document control; if a simpler in-shell `dangerouslySetInnerHTML` render is chosen instead, the operator supplies body content + a `<style>` block and `<head>` meta is set from the partner. The plan picks the cleanest Next mechanism — full-document route handler preferred.)

### 3.3 Tokens (replaced at render time, server-side)
- **`{{BOOKING}}`** → the themed booking iframe:
  `<iframe src="<SITE_URL>/embed/reservations/<menuSlug>?accent=<partner.colorPrimary-hex>&theme=...">` — the widget that already exists. `menuSlug` resolved via `getRestaurant` → `menu.slug`; the accent/theme params derived from the partner's brand tokens.
- **`{{MENU}}`** → the **live menu**, server-rendered into the page at request time (so it always matches the dashboard — the operator never hand-maintains menu items). Built from the same menu data `getRestaurant` already returns, emitted as clean semantic HTML the operator's page styles can target (e.g. a documented class structure).

Token replacement is a plain server-side string substitution. If a token appears multiple times, each is replaced; if the partner has no menu, `{{MENU}}`/`{{BOOKING}}` collapse to an empty string (or a "menu coming soon" note for `{{MENU}}`).

### 3.4 Operator workflow
1. "Claude, design a landing page for <restaurant>" → get a complete HTML page.
2. Drop `{{BOOKING}}` and `{{MENU}}` where you want them.
3. Paste into `/admin/partners` → save. It's live at `/w/<slug>` (and the custom domain).

## 4. Upgraded default template

Rebuild the current basic `RestaurantStorefront` into a real restaurant landing page, auto-filled from the partner brand + listing + menu and themed via `<PartnerTheme>`:

- **Hero** — full-bleed listing photo, restaurant name, cuisine · city · hours, a prominent **Book a table** CTA (opens the existing `ReservationSheet`).
- **About** — the listing description.
- **Menu** — an elegant, readable layout of the prepared sections.
- **Gallery** — a grid of the listing photos.
- **Location & hours** — address + opening hours.
- **Footer** — "Powered by Klickenya" (per the partner flag).

Built with a deliberate frontend-design pass (generous spacing, strong type hierarchy, tasteful imagery) so it reads as a premium site, not a Klickenya clone. Stays mobile-first (CLAUDE.md iOS rules).

## 5. Admin form addition

`/admin/partners` create + edit forms gain a collapsible **"Custom landing page HTML (optional)"** textarea (≥16px font). A one-line helper lists the `{{BOOKING}}` and `{{MENU}}` tokens and links to the live `/w/<slug>` to preview. Empty = the partner uses the upgraded default template.

## 6. Reused / unchanged
- `/embed/reservations/<slug>` widget (the booking iframe) — used by `{{BOOKING}}`.
- `getRestaurant`, the menu data, `<PartnerTheme>`, `ReservationSheet`, the marketplace — untouched.
- Bookings still flow into the host's dashboard exactly as today.

## 7. Security
`landingHtml` is authored **only by Klickenya admins** (the `/admin/partners` form is admin-gated), so it is trusted input — full HTML is intentional. The plan must NOT expose `landingHtml` authoring to non-admins, and token substitution must not allow a token to inject attacker-controlled markup (tokens map to fixed, server-controlled output). The booking iframe `accent` param is already hex-sanitized by the embed route.

## 8. Out of scope (v1)
- A WYSIWYG/no-code page builder (you author HTML, optionally via Claude — not a drag-and-drop editor).
- Per-listing custom pages (the override is per-partner; one restaurant per partner in v1).
- Non-restaurant templates (stay/tour) — restaurant only.
- A `{{GALLERY}}` or other tokens beyond `{{BOOKING}}`/`{{MENU}}` (add later if wanted).
- Versioning/preview-draft of the custom HTML (it goes live on save).
