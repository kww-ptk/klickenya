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

- `apps/web/app/api/menu/reservations/route.ts` — POST endpoint already validates input, runs Turnstile, writes to `reservations` table. No changes needed.
- `apps/web/components/reservations/ReservationSheet.tsx` — the existing booking form. Reuse it directly; if it requires modifications, that's a sign we should extract its core form into a presentational sub-component.
- Email/notification flow — owner gets the same email regardless of where the booking originated.

## Theming

Query params accepted by the embed page:

| Param | Values | Default | Effect |
|---|---|---|---|
| `theme` | `light` / `dark` | `light` | Sets background, text colour, input borders |
| `accent` | hex without `#` | `E8A020` | Buttons, focus rings, accents |
| `bg` | `transparent` / `white` / hex | `white` | Outer background of the form container |

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
- [ ] Submitting a booking from the embed writes a `reservations` row identical to one from `/m/<slug>`
- [ ] The owner gets the confirmation email same as before
- [ ] Embed page returns 404 when `reservations_enabled = false`
- [ ] Embed page returns 404 for an unknown slug
- [ ] Theme params change colours visibly: `?theme=dark`, `?accent=00ff00`
- [ ] Embed page has `<meta name="robots" content="noindex,nofollow">`
- [ ] Owner-side ReservationsEmbedPanel renders only when `reservations_enabled = true`
- [ ] "Copy code" button copies the snippet with current theme params applied
- [ ] Preview iframe inside the dashboard works and matches what the embed URL renders
- [ ] postMessage height messages fire on form expansion (e.g. user clicks "Special requests")
- [ ] Mobile-first: form works at 320px width (Squarespace mobile preview)

## Effort estimate

- Embed page + layout: 2–3 hours
- ReservationsEmbedPanel (snippet generator + theme picker + preview): 2 hours
- Middleware CSP / X-Frame headers: 30 min
- postMessage bridge: 30 min
- Theming via CSS variables: 1 hour
- Manual testing across Squarespace/Wix/raw HTML: 1 hour
- Polish + docs page for restaurant owners: 1 hour

**Total: ~1 working day.** No DB migration. No new dependencies.

## Schema-projection rule check

No new columns added in V1. V1.5 (allowed_embed_origins) would add one — when implementing it, follow the CLAUDE.md "When you add a column to an existing table" rule and grep every `.from("menus")` callsite.

## Open questions to settle before implementation

1. Where does the embed panel live: inside the menu builder Publish Panel (next to the Reservations toggle) or on `/dashboard/listings/<id>/reservations` settings? Both are defensible. Recommend: menu builder Publish Panel, since that's where the owner already toggles reservations on and where the inline section/station controls live.
2. Should the embed page show a small "Powered by Klickenya" link at the bottom? Recommend yes — free growth channel, common pattern, can be hidden later as a paid white-label tier.
3. Should we ship a one-page docs site at `/embed-docs` or similar so restaurant owners (and their developers) have copy-pasteable snippets for common host platforms? Probably yes, but ship as follow-up if it slows down V1.
