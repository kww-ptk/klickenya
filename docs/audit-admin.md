# Audit — Admin POV (starting with Reservations + 404s)

> Status: **Audit only — no fixes applied.** Written 2026-06-23.
> This run focuses on: how admin **Reservations** works + where reservations come
> from, the **"View" button 404**, and an **app-wide 404 classification**
> (intentional vs bug). Findings below were **verified live** against the
> production database (read-only) via the local dev env.

Severity: 🔴 broken / bug · 🟠 confusing · 🟡 polish.

---

## How reservations work (and where they come from)

**Reservations = restaurant table bookings** (not property bookings). They live in
the Supabase **`reservations`** table, each linked to a **`menus`** row via
`menu_id`.

**Entry points** — all POST to [`/api/menu/reservations`](../apps/web/app/api/menu/reservations/route.ts),
which sets a `source`:
| Source | Where the guest booked from |
|---|---|
| `qr_menu` | The QR menu page (`/m/[slug]`) — default |
| `listing` | The reservation widget on the public restaurant listing page (`ReservationInline` / `ReservationSheet`) |
| `embed` | The embedded reservation widget on an external site (`/embed/reservations/[slug]`, `/embed/restaurant/[slug]`) — records `source_origin` (the host site) + `source_ref` (campaign tag) |
| host-created | Manually added by the host in `ReservationsDashboard` |

So admin **Reservations** (`/admin/reservations`) is a read-only roll-up of every
table reservation across all restaurants, regardless of channel. The list query
([reservations/page.tsx:51-58](../apps/web/app/admin/reservations/page.tsx))
reads `reservations` + a `menus` embed and works fine (11 rows in prod at audit
time).

---

## 🔴 AR-1 — The "View" button 404s on EVERY reservation (confirmed bug)

The View button links to `/admin/reservations/[id]` (route exists). The detail
page fetches the reservation and does:
```ts
const { data: reservation, error } = await adminClient
  .from("reservations")
  .select(`id, ..., notes, ..., internal_notes, ..., menu:menus(...)`)
  .eq("id", id).single();
if (error || !reservation) notFound();   // ← fires on ANY query error
```
([reservations/[id]/page.tsx:48-60](../apps/web/app/admin/reservations/[id]/page.tsx))

**Root cause (verified against prod DB):** the SELECT lists **two columns that do
not exist** on the `reservations` table:
- `notes` → `column reservations.notes does not exist` (Postgres 42703)
- `internal_notes` → also missing

PostgREST returns **HTTP 400** → `error` is truthy → `notFound()` → **404 for every
View click.** This is **schema-projection drift** — the exact failure class
CLAUDE.md warns about (a stale `.select()` referencing non-existent columns; the
list page works only because it doesn't select them).

**Not intentional — it's a bug.** Verified live: the full detail query 400s, while
the same query *without* `notes`/`internal_notes` returns 200. The page also
*renders* `reservation.notes` (Guest Notes) and `reservation.internal_notes`
(Internal Notes), so either those columns were renamed/never added, or the page was
written against a planned schema that didn't ship.
**Fix direction:** confirm the real column names on `reservations` (the detail UI
expects guest notes + internal notes), update the SELECT + the JSX to match, and
distinguish a query **error** (log / 500) from a genuine **not-found** (404) so a
projection bug never silently becomes a 404 again.

---

## App-wide 404 (`notFound()`) classification

I swept every `notFound()` call in `app/**/page.tsx`. Three categories:

### 🔴 Bug — query error masked as 404
- **`/admin/reservations/[id]`** — the only site that explicitly does
  `if (error || !x) notFound()`, and the query currently errors (AR-1). Broken for
  all rows.

### ✅ Intentional — correct 404 for a genuinely missing/invalid resource
These are working as designed (resource doesn't exist, isn't owned, or the URL is
invalid):
- **Resource detail not found** (`if (!x) notFound()`): all admin detail pages
  (`claims`, `bookings`, `hosts`, `contact-requests`, `events`, `ambassadors`,
  `general-contacts`, `guests`, `listing-requests`, `partners/[id]/edit`,
  `property-enquiries`), plus `dashboard/property/[id]`, `dashboard/enquiries/[id]`,
  `b/[slug]`, `claim/[slug]`, `hosts/[slug]`, `authors/[slug]`,
  `destinations/[slug]`, `real-estate/[slug]`, `real-estate/agent/[slug]`,
  `storefront`, `w/[slug]`, `receipt/[sessionId]`, the `(listings)` detail, etc.
- **URL/param validation**: `if (!isValidType(type))`, `if (!isValidCategory(...))`,
  `station !== "kitchen" && station !== "bar"` (kitchen/POS), journal category.
- **Feature-gated**: `embed/reservations/[slug]` 404s when
  `!menu.reservations_enabled` (intentional — reservations off for that restaurant;
  arguably deserves a friendlier "not accepting reservations" message rather than a
  bare 404 — see polish note).

### 🟠 Latent risk — intentional today, but fragile pattern
Most resource pages use `if (!data) notFound()` **without** separating a query
error from a true miss. With Supabase `.single()`, a **failed query returns
`data: null`**, so any future projection drift (a renamed/removed column, like
AR-1) will **silently turn into a 404** instead of surfacing the error. This is the
same trap AR-1 fell into. Not broken now, but the pattern means the *next* schema
drift will present as a mysterious 404. Recommend a shared helper that 404s on
"no row" but logs/500s on an actual PostgREST error.

### 🟡 Polish
- `embed/reservations/[slug]` and similar feature-off cases could render an inline
  "not available" state instead of a hard 404 inside an iframe (a bare 404 page
  embedded in a partner site looks broken).

---

## Suggested priority (when fixes are greenlit)
1. **AR-1** — fix the reservations detail SELECT (`notes`/`internal_notes`) so the
   View button works; this is user-visible and breaks the whole admin reservations
   detail view.
2. Add an **error-vs-not-found** helper so projection drift can't masquerade as 404
   (prevents the next AR-1).
3. Friendlier feature-off states for embedded pages (polish).

*(No code changed. This file is the audit deliverable only. Findings AR-1 and the
missing columns were verified read-only against the production database.)*
