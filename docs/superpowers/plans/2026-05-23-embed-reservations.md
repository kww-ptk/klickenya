# Embeddable Reservation Form — Design Spec

> **Status:** Spec only, no code. Pick this up in a future session.
> **Implementation skill:** When ready, use superpowers:writing-plans to convert this spec into a task-by-task plan, then superpowers:subagent-driven-development to execute.

## Goal

Restaurant owners can paste one line of HTML into their own website (Squarespace / Wix / Webflow / a developer-built site) and get the Klickenya reservation form embedded as an iframe. Diners book through it, the data lands in the same `reservations` table, the owner manages it from the same `/dashboard/listings/<id>/reservations` page.

One-line snippet the owner copies:

```html
<iframe
  src="https://klickenya.com/embed/reservations/napul-restaurant"
  style="width:100%;height:680px;border:0"
></iframe>
```

Optional query params for theming:
- `?theme=light|dark` (default `light`)
- `?accent=E8A020` (hex, no `#`; default Klickenya orange)
- `?bg=transparent` (default `white`)

## Why iframe, not JS widget

Iframes are what every reservation product in the wild ships first (Resy, OpenTable, Tock, SevenRooms, Tock). One day of work vs ~5 days for a script widget, and 90% of the use cases (Squarespace/Wix users pasting code) only want a snippet. JS widget can be a V2 if anyone asks.

## User-visible surface

### 1. Public route: `/embed/reservations/[slug]`

- Server component, fetches the menu by `listing_slug` (same lookup as `/m/[slug]`)
- 404 if menu not found OR `reservations_enabled = false` (no embedding a disabled feature)
- Renders ONLY the reservation form — no header, footer, menu nav, branding chrome
- Mobile-first; works in iframes as narrow as 320px wide
- Loads the same `ReservationSheet` component used inside `/m/[slug]`, but standalone
- Auto-resizes via `postMessage` so the parent iframe can adjust height

### 2. Embed-only layout: `apps/web/app/embed/layout.tsx`

- No `<Header>`, no `<Footer>`, no `<MobileBottomNav>`
- Body has transparent or themed background per query param
- Loads only the CSS needed by the reservation form
- `<meta name="robots" content="noindex,nofollow">` — embed pages should not show up in Google

### 3. Owner-side: "Embed code" panel

New section inside the menu builder's right-sidebar Reservations card (or on the listing dashboard's Reservations tab):

```
┌─ Embed on your website ─────────────────────┐
│ Paste this snippet wherever you want the    │
│ booking form to appear on your site.        │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ <iframe                                  │ │
│ │   src="https://klickenya.com/embed/...   │ │
│ │   style="width:100%;height:680;border:0" │ │
│ │ ></iframe>                               │ │
│ └─────────────────────────────────────────┘ │
│                              [ Copy code ]  │
│                                             │
│ ▸ Customise colours and theme               │
│                                             │
│ ▸ Preview                                   │
└─────────────────────────────────────────────┘
```

Collapsed by default. Expanding "Customise colours and theme" shows controls that update the snippet in real time (theme/accent/bg query params). "Preview" expands into a 600px-tall iframe pointed at the embed URL so the owner sees exactly what diners will see.

Only shown when `reservations_enabled = true`.

## Files to create

```
apps/web/
├── app/
│   └── embed/
│       ├── layout.tsx                      ← embed-only chrome (none)
│       └── reservations/
│           └── [slug]/
│               ├── page.tsx                ← server component, fetches menu
│               └── EmbeddedReservation.tsx ← client wrapper (postMessage height)
├── components/
│   └── dashboard/menu/
│       └── ReservationsEmbedPanel.tsx      ← owner-side snippet generator + preview
└── middleware.ts                            ← MODIFIED: relax frame-ancestors for /embed/*
```

## Files to modify

- `apps/web/middleware.ts` — add a branch that, when `pathname.startsWith("/embed/")`, sets:
  ```ts
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors *",
  );
  response.headers.delete("X-Frame-Options");
  ```
  (Default Next.js behaviour is `X-Frame-Options: SAMEORIGIN`. We override per-route.)
- `apps/web/components/dashboard/menu/MenuBuilder.tsx` — inside the Reservations card in the Publish Panel, render `<ReservationsEmbedPanel menuSlug={menu.slug} reservationsEnabled={reservationsEnabled} />` when reservations are on.

## Files NOT to modify (already work as-is)

- `apps/web/components/reservations/ReservationSheet.tsx` — the existing booking form. Reuse it directly; if it requires modifications, that's a sign we should extract its core form into a presentational sub-component.
- Email/notification flow — owner gets the same email regardless of where the booking originated.

## Source tracking (REQUIRED for V1)

The owner needs to know **where each reservation came from** — main site, embedded widget on their own site, embedded on a third-party site, etc. Without this, embedding is half-blind: the owner can't tell which channel is producing bookings, can't justify the iframe to their web dev, can't spot a competitor scraping their form.

### Data model

New migration adds three columns to `reservations`:

```sql
-- 0NN_reservation_source_tracking.sql
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS source        text NOT NULL DEFAULT 'main'
    CHECK (source IN ('main', 'embed', 'pos', 'admin')),
  ADD COLUMN IF NOT EXISTS source_origin text,
  ADD COLUMN IF NOT EXISTS source_ref    text;

CREATE INDEX IF NOT EXISTS idx_reservations_menu_source
  ON reservations (menu_id, source);
```

- `source` — broad bucket. Values: `'main'` (booked on klickenya.com), `'embed'` (iframe), `'pos'` (staff entered via terminal — future), `'admin'` (owner manually added — future). Default `'main'` so existing rows backfill cleanly.
- `source_origin` — the parent page's hostname when source='embed' (e.g. `napul-restaurant.com`, `www.theirsquarespacesite.com`). NULL otherwise. Don't store paths or query strings — privacy + storage discipline.
- `source_ref` — optional owner-set label, supplied via embed URL query param `?ref=instagram-bio` or `?ref=newsletter-may`. Free text, max 64 chars. Like UTM but simpler. NULL when not set.

### API change

`api/menu/reservations` POST:
- Accept optional `source`, `source_origin`, `source_ref` in the body
- Validate: source must be in the allowed enum; source_origin must look like a hostname (regex `^[a-z0-9.-]+\.[a-z]{2,}$`, max 253 chars); source_ref max 64 chars, stripped of HTML
- If `source` is missing, default to `'main'` (preserves existing behaviour for any caller that doesn't update)
- Never trust client for `source='main'` from an embed URL — the embed page server component sets `source='embed'` server-side before rendering the form

### Embed-side implementation

The embed page's server component reads two signals:

1. **Parent origin via `Sec-Fetch-Site` + `Referer` headers** on the inbound request. When a page is loaded inside an iframe, the browser sends:
   - `Sec-Fetch-Site: cross-site` (or `same-site`)
   - `Referer: https://parent-site.com/some/page`
   - We parse the hostname from `Referer` → that's `source_origin`. If header is missing or unparseable, leave NULL.

2. **`ref` query param** from the embed URL → that's `source_ref`.

The embed page passes these as hidden form fields into the ReservationSheet → POST body. Owner can't tamper-proof this fully (any user can edit the iframe URL), but the data is good enough for "which channel works" analytics. For tamper-proof, see V1.5 allowed_origins below.

### Owner-side surface

Two additions:

1. **Per-booking source pill in the reservations list** — `/dashboard/listings/<id>/reservations`. Each booking row shows a small badge next to the time:
   - `🌐 Main site` (source='main')
   - `🔗 your-site.com` (source='embed', source_origin truncated to 30 chars)
   - `📱 POS` (source='pos', future)
   When source_ref is set, append `· instagram-bio` so the owner can see their campaign tags.

2. **"Where bookings come from" panel** at the top of `/dashboard/listings/<id>/reservations` — a 3-column count strip:
   ```
   ┌─ Main site ─┐  ┌─ Embedded ──┐  ┌─ Top source ──────┐
   │     17      │  │      31      │  │ your-site.com  24 │
   │  last 30 d  │  │   last 30 d  │  │   napul.com     5 │
   └─────────────┘  └──────────────┘  │   instagram     2 │
                                       └───────────────────┘
   ```
   Single SQL aggregate per panel; cheap to compute, refreshes on page load.

### Privacy note

Storing the parent hostname is fine — it's the diner's choice to book through that site. Don't store paths, query strings, or full URLs (they often contain user IDs, search params, etc.). Don't store IP addresses for analytics; we already have IP in Vercel logs for security purposes.

### Schema-projection rule reminder

Adding columns to `reservations`. Per CLAUDE.md "When you add a column to an existing table — READ THIS":

```bash
grep -rn '\.from("reservations")' apps/web --include='*.ts' --include='*.tsx'
```

Every `.select()` on `reservations` that powers the owner-facing dashboard or any list view needs to include `source, source_origin, source_ref`. The reservation confirmation email template may want them too. Audit all callsites.

## Files NOT to modify (revised)

- `apps/web/app/api/menu/reservations/route.ts` — POST endpoint **does need modifications for source tracking** (see above). Otherwise unchanged.

## Theming

Query params accepted by the embed page:

| Param | Values | Default | Effect |
|---|---|---|---|
| `theme` | `light` / `dark` | `light` | Sets background, text colour, input borders |
| `accent` | hex without `#` | `E8A020` | Buttons, focus rings, accents |
| `bg` | `transparent` / `white` / hex | `white` | Outer background of the form container |
| `ref` | free text, max 64 chars | none | Stored as `reservations.source_ref` for owner-side attribution (e.g. `?ref=instagram-bio`) |

Implementation: read params in the embed page server component, apply via inline CSS variables on a root `<div>`:

```tsx
<div style={{
  "--klickenya-accent": `#${accent}`,
  "--klickenya-bg": bg === "transparent" ? "transparent" : bg === "white" ? "#ffffff" : `#${bg}`,
}}>
```

The reservation form's CSS already uses Tailwind. We add a small set of CSS custom properties (`--klickenya-accent` etc.) and override the relevant Tailwind classes inside `/embed/*` via a scoped stylesheet OR by passing a `themeOverrides` prop down through ReservationSheet.

Defer dark theme to V2 if it adds complexity — most embedders run light-themed sites.

## postMessage height auto-resize

The embed page client component sends its current height to the parent on mount and after every layout shift:

```ts
useEffect(() => {
  const sendHeight = () => {
    window.parent.postMessage(
      { type: "klickenya:resize", height: document.documentElement.scrollHeight },
      "*",
    );
  };
  sendHeight();
  const observer = new ResizeObserver(sendHeight);
  observer.observe(document.documentElement);
  return () => observer.disconnect();
}, []);
```

Document for embedders who want auto-resize on their side:

```html
<script>
  window.addEventListener("message", (e) => {
    if (e.data?.type === "klickenya:resize") {
      document.querySelector("iframe[src*='klickenya.com/embed']").style.height = e.data.height + "px";
    }
  });
</script>
```

90% of embedders won't add this — the static `height:680px` in the snippet is good enough for the default form. The auto-resize is a nice-to-have for picky embedders.

## Security & abuse

### Already in place
- Turnstile captcha on the reservation form (blocks bot submissions)
- Server-side input validation in `api/menu/reservations` POST
- Reservation flow has no auth requirement (guests book without signing in) — same surface as the existing public form
- Rate limiting on the endpoint (verify what's there; add if missing)

### V1 additions
- `Content-Security-Policy: frame-ancestors *` — explicitly allow any origin to embed. This is the same posture as Calendly / Resy.
- `<meta name="robots" content="noindex,nofollow">` on the embed page so Google doesn't index a thousand copies of the same form.

### V1.5 (defer unless requested)
- Per-menu allowed_origins list (owner enters their domain in the dashboard; embed only accepts that origin). Adds an `allowed_embed_origins text[]` column to `menus`. Middleware checks `Sec-Fetch-Site` and the `Referer` header against the list. Blocks competitors / scrapers from putting your booking form on their site.

## Confirmation emails

The booking confirmation email currently says "klickenya.com" in the from address and the copy mentions Klickenya. For V1 of embeds, this is acceptable — the diner is booking through a Klickenya-powered widget and the email branding makes that clear.

For V2: per-menu sender domain via Resend. Owner verifies their domain in Resend (or we proxy via DKIM), and confirmation emails come from `bookings@theirrestaurant.com`. This is its own project — bigger than this spec.

## Out of scope for V1

- JS widget (Calendly-style modal injector) — defer until iframe demand proves out
- REST API + custom UI from the embedder — defer; doc the iframe and let it be
- Per-menu allowed_origins enforcement — defer to V1.5
- Per-menu sender domain — defer to V2
- Analytics / conversion tracking for the embedder (e.g. firing a host-page event on successful booking) — defer; can add via postMessage later
- White-label removing the "Powered by Klickenya" link — defer; small "Powered by" link at the bottom of the embed is acceptable for V1 and worth keeping as a growth channel

## Testing checklist

When implementing:

- [ ] `/embed/reservations/<slug>` loads with no Next.js chrome (no header/footer/nav)
- [ ] Embedded form renders inside an iframe served from a different origin (test with a one-line HTML file on `localhost:8080`)
- [ ] `X-Frame-Options` is NOT set on `/embed/*` (browser dev tools network tab)
- [ ] `Content-Security-Policy: frame-ancestors *` IS set
- [ ] Turnstile widget renders inside the iframe and validates
- [ ] Submitting a booking from the embed writes a `reservations` row identical to one from `/m/<slug>` PLUS `source='embed'`, `source_origin` = parent hostname, `source_ref` = ?ref query param value
- [ ] Submitting a booking from `/m/<slug>` writes `source='main'`, source_origin NULL, source_ref NULL
- [ ] Existing reservations created before the migration all default to `source='main'`
- [ ] The owner gets the confirmation email same as before
- [ ] Embed page returns 404 when `reservations_enabled = false`
- [ ] Embed page returns 404 for an unknown slug
- [ ] Theme params change colours visibly: `?theme=dark`, `?accent=00ff00`
- [ ] `?ref=foo` query param is captured into source_ref; rejected if longer than 64 chars
- [ ] Embed page has `<meta name="robots" content="noindex,nofollow">`
- [ ] Owner-side ReservationsEmbedPanel renders only when `reservations_enabled = true`
- [ ] "Copy code" button copies the snippet with current theme params applied
- [ ] Preview iframe inside the dashboard works and matches what the embed URL renders
- [ ] postMessage height messages fire on form expansion (e.g. user clicks "Special requests")
- [ ] Mobile-first: form works at 320px width (Squarespace mobile preview)
- [ ] Reservations list at `/dashboard/listings/<id>/reservations` shows per-booking source badge
- [ ] "Where bookings come from" panel shows accurate 30-day counts grouped by source / top source_origin

## Effort estimate

- Migration for source tracking (3 columns + index): 30 min
- API change: accept + validate source fields, default 'main': 1 hour
- Embed page + layout: 2–3 hours
- Embed page server-side parses Referer for source_origin: 30 min
- ReservationsEmbedPanel (snippet generator + theme picker + preview): 2 hours
- Per-booking source badge in reservations list: 1 hour
- "Where bookings come from" panel (3 SQL aggregates): 1.5 hours
- Middleware CSP / X-Frame headers: 30 min
- postMessage bridge: 30 min
- Theming via CSS variables: 1 hour
- Manual testing across Squarespace/Wix/raw HTML: 1 hour
- Polish + docs page for restaurant owners: 1 hour

**Total: ~1.5 working days** (was 1 day before source tracking — the analytics surface adds half a day). One DB migration. No new dependencies.

## Schema-projection rule check

New columns on `reservations`: `source`, `source_origin`, `source_ref`. Per CLAUDE.md:

```bash
grep -rn '\.from("reservations")' apps/web --include='*.ts' --include='*.tsx'
```

Every SELECT that powers a list, table, or detail view of reservations needs to include the new columns (or at least `source` and `source_origin` — `source_ref` is only relevant in the dashboard analytics).

V1.5 (`allowed_embed_origins` on `menus`) would add another column; same drill when it lands.

## Open questions to settle before implementation

1. Where does the embed panel live: inside the menu builder Publish Panel (next to the Reservations toggle) or on `/dashboard/listings/<id>/reservations` settings? Both are defensible. Recommend: menu builder Publish Panel, since that's where the owner already toggles reservations on and where the inline section/station controls live.
2. Should the embed page show a small "Powered by Klickenya" link at the bottom? Recommend yes — free growth channel, common pattern, can be hidden later as a paid white-label tier.
3. Should we ship a one-page docs site at `/embed-docs` or similar so restaurant owners (and their developers) have copy-pasteable snippets for common host platforms? Probably yes, but ship as follow-up if it slows down V1.
