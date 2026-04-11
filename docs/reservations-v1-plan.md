# Reservations V1 — Architecture Plan

> **Deliverable scope:** Written plan only. No migrations, no components, no API routes.
> Reviewed and approved before Prompt 7 runs.

---

## 1. Restaurant Listing Page — Current State

### Location & rendering

- **File:** `apps/web/app/(listings)/[type]/[city]/[slug]/page.tsx`
- **Router:** Next.js App Router
- **Strategy:** `export const dynamic = 'force-static'` + `revalidate = 3600`
- **Data source:** Hybrid — Sanity CMS for listing metadata, Supabase for menu data

The page routes restaurants (via `listing.subcategory === "restaurants"`) to:

```
RestaurantDetail  ←  apps/web/components/listings/detail/RestaurantDetail.tsx
```

### Generic booking form — where and what

There is no standalone "booking request form component" for restaurants. The form lives inside two shared widgets rendered by `RestaurantDetail`:

| Surface | Component | File |
|---|---|---|
| Desktop (right column) | `BookingSidebar` → renders `ContactForm` | `components/listings/widgets/BookingSidebar.tsx` |
| Mobile (fixed bar + inline form) | `MobileBookingBar` → renders `ContactForm` | `components/listings/widgets/MobileBookingBar.tsx` |

**`ContactForm`** (`components/listings/ContactForm.tsx`) handles all listing types. For `listingType = "restaurant"` it renders:
- `reservationDate` (date picker)
- `reservationTime` (time input)
- `diners` (counter, min 1)
- `name`, `email`, `phone`, `message` (shared fields)

**Submission flow:** `POST /api/contact` → saved to `contact_requests` table in Supabase → Resend email to guest + host notification.

### How the listing page knows which menu belongs to this restaurant

The page already queries Supabase for the menu:

```typescript
// apps/web/app/(listings)/[type]/[city]/[slug]/page.tsx  L229–248
await adminClient.from("menus")
  .select("id, slug, name, is_published, table_ordering, menu_sections(...)")
  .eq("listing_slug", slug)          // ← slug = Sanity slug.current
  .eq("is_published", true)
  .single();
```

Linking is done by **`listing_slug` string match** — there is no `klickenya_business_id` in the Sanity listing schema. Adding `reservations_enabled` to this query requires only a new column on `menus` and one extra field in the `.select()` string. No Sanity schema changes needed.

### Shared codebase with `/m/[slug]`?

Yes. Both `/(listings)/[type]/[city]/[slug]/page.tsx` and `/m/[slug]/page.tsx` live in the same `apps/web` Next.js app. `ReservationSheet` can be a regular shared component at `components/reservations/ReservationSheet.tsx` — no package extraction needed.

---

## 2. The Reference Enable-Flow — What It Actually Is

The Explore agent misidentified the pattern. There are **two distinct enable patterns** in this codebase — one for accommodations, one for menus. Both matter.

### Pattern A — Accommodation (implicit, data-presence driven)

The listing page server-renders a `hasPms` boolean:

```typescript
// page.tsx L308–424 (abbreviated)
const property = await adminClient.from("properties")
  .select("id, renting_type, entire_place_price")
  .eq("listing_slug", slug).eq("is_active", true);

const pmsRooms = await adminClient.from("rooms")...
hasPms = pmsRooms.length > 0;
```

Then in `StayDetail`:

```typescript
// StayDetail.tsx L232–256
{hasPms ? (
  <StayBookingSidebar ... />   // ← real booking flow
) : (
  <BookingSidebar ... />       // ← generic ContactForm
)}
```

**The "toggle" is implicit:** a property + rooms record existing in Supabase is the flag. No boolean column. No admin UI toggle for this swap.

### Pattern B — Menu ordering (explicit boolean, the closer template)

`menus.table_ordering` (boolean, default `false`) is the flag. It is:

1. **Flipped by:** `MenuBuilder.tsx` → `toggleTableOrdering()` → `PATCH /api/menu/settings` with `{ menu_id, table_ordering: bool }`
2. **Read by:** `getMenu()` in `/m/[slug]/page.tsx` (selected as part of the menu query)
3. **Acts as:** conditional in `m/[slug]/page.tsx`:

```typescript
{menu.table_ordering ? <MenuWithCart ... /> : <MenuWithFilters ... />}
```

4. **Revalidation:** the settings PATCH route calls `revalidateTag` + `revalidatePath(/m/${slug})` after the update.

**This is the exact pattern to replicate for `reservations_enabled`.** Use an explicit boolean column on `menus`, a dashboard toggle, and a conditional render in both surfaces.

---

## 3. Menu Page `/m/[slug]` — Current Header Layout

### Header structure

```tsx
// apps/web/app/m/[slug]/page.tsx  L107–112
<header className="bg-white border-b border-border px-5 py-5 text-center">
  <h1 className="font-display text-[26px] font-extrabold ...">
    {menu.name}
  </h1>
</header>
```

Single centered `<h1>`. No buttons. No cart button in the header — the cart lives inside `MenuWithCart` as a floating footer element.

### Where "Book a table" fits

The header has horizontal space on both sides of the centered `h1`. The natural placement is a right-anchored button (`absolute right-5` or flex row with `ml-auto`). On mobile, a compact `"Book"` label keeps the layout from wrapping. This mirrors patterns already used in the mobile booking bar.

### How `table_ordering` is fetched today

```typescript
// m/[slug]/page.tsx  L21–46 (getMenu)
adminClient.from("menus")
  .select("id, name, is_published, table_ordering, menu_sections(...)")
  .eq("slug", slug)
  .eq("is_published", true)
  .single();
```

**`reservations_enabled` piggybacks here:** add it to the `.select()` string and extend `MenuWithOrdering` type. Zero additional queries.

---

## 4. Realtime Pattern — Kitchen Orders Confirmed

**Not Supabase Realtime.** The kitchen orders dashboard uses **polling**.

- **File:** `apps/web/components/dashboard/menu/KitchenDashboard.tsx` (lines 318–361)
- **Interval:** 8 seconds (`setInterval(poll, 8000)`)
- **Endpoint:** `GET /api/menu/orders?menu_id={menuId}`
- **Filtering:** by `menu_id`
- **New-order detection:** compares incoming IDs against current state; plays audio beep + 3s amber highlight on new arrivals
- **Reconnect logic:** no backoff — next poll cycle silently catches errors and retries in 8s

The reservations dashboard (Prompt 8) should copy this pattern verbatim:
- 8s polling against `GET /api/menu/reservations?menu_id={menuId}`
- Same ID-diff logic for "new reservation" audio/highlight
- Same PATCH endpoint pattern for status updates (`pending → confirmed → seated → completed → cancelled`)

---

## 5. Proposed Architecture

### 5.1 Where `reservations_enabled` lives

**Single source of truth: `menus.reservations_enabled` boolean column (default `false`).**

Rationale:
- The flag is about the restaurant's operational capability (linked to their menu/business system), not listing content
- Avoids Sanity schema changes entirely
- Follows `table_ordering` pattern exactly — same table, same API, same toggle UI location in MenuBuilder
- The listing page already queries `menus` by `listing_slug` — adding one field costs nothing
- The menu page already queries `menus` by `slug` — same

### 5.2 Where `ReservationSheet` lives and how it's consumed

```
apps/web/components/reservations/ReservationSheet.tsx   ← shared component
```

A client-side sheet/drawer (using the existing `Sheet` primitive if one exists, or a simple fixed-position panel). Accepts:

```typescript
interface ReservationSheetProps {
  menuId: string;
  restaurantName: string;
  onClose: () => void;
}
```

**Consumed from two surfaces:**

| Surface | How |
|---|---|
| `/m/[slug]` | "Book a table" button in header; `ReservationSheet` imported directly |
| Listing page (`RestaurantDetail`) | `BookingSidebar` / `MobileBookingBar` receive `reservationsEnabled` + `menuId` props; conditionally render `ReservationSheet` trigger instead of `ContactForm` |

No package extraction. Same codebase, same import path.

### 5.3 How "is reservations enabled?" resolves on both surfaces

**One column, two query callsites — no shared resolver needed.**

| Surface | Query callsite | Field added |
|---|---|---|
| `/m/[slug]` | `getMenu()` in `app/m/[slug]/page.tsx` | `reservations_enabled` added to `.select()` |
| Listing page | `adminClient.from("menus")...` in `app/(listings)/[type]/[city]/[slug]/page.tsx` L229–248 | Same |

Both pass the resolved boolean as a prop down to their respective components. No shared helper function needed — the query structure is already identical.

### 5.4 How the listing page conditionally swaps generic form ↔ ReservationSheet

Mirrors the `hasPms` accommodation pattern:

**In `page.tsx`** — add `reservationsEnabled` to the data derived from `menuData`:

```typescript
const reservationsEnabled = menuData?.reservations_enabled === true;
```

Pass to `RestaurantDetail`:

```typescript
<RestaurantDetail
  {...detailProps}
  reservationsEnabled={reservationsEnabled}
  menuId={menuData?.id}
/>
```

**In `RestaurantDetail`** — swap `BookingSidebar` and `MobileBookingBar`:

```typescript
// Right column (desktop)
{reservationsEnabled && menuId ? (
  <ReservationBookingSidebar menuId={menuId} restaurantName={listing.title} />
) : (
  <BookingSidebar listingId={listing._id} listingTitle={listing.title} listingType={sanityType} ... />
)}

// Mobile bar — similar conditional
```

`ReservationBookingSidebar` is a thin wrapper around `ReservationSheet` with the same sticky sidebar container as `BookingSidebar`.

### 5.5 Dashboard toggle (enables the flow)

In `MenuBuilder.tsx`, alongside the existing `table_ordering` toggle, add a `reservations_enabled` toggle. Same pattern:
- Toggle state in component
- `PATCH /api/menu/settings` with `{ menu_id, reservations_enabled: bool }`
- After successful PATCH: call `revalidatePath` for both `/m/${menu.slug}` AND the listing page URL (requires knowing the `listing_slug`, which is already on the `menus` record — add it to the MenuBuilder data fetch)

---

## 6. Mismatches With the Accommodation Pattern

| Mismatch | Impact | Workaround |
|---|---|---|
| Accommodation uses implicit `hasPms` (data presence); reservations need explicit toggle | Minor — different mental model but same conditional-render structure | Use explicit `menus.reservations_enabled` boolean. Cleaner and mirrors `table_ordering` |
| Listing page is `force-static` + `revalidate=3600`. After a host enables reservations, the listing page can lag up to 1 hour | Medium — host expectation mismatch | The settings PATCH must call `revalidatePath` for the listing URL (e.g. `/restaurants/${city}/${listing_slug}`). Requires `listing_slug` + city in the API response. Add both to the `menus` select in the settings route. The listing will re-render within seconds of the toggle |
| Accommodation toggle is implicit (no admin UI); reservations need an explicit dashboard toggle | Minor — actually better UX | Add toggle to MenuBuilder alongside `table_ordering`. Same toggle component, same PATCH endpoint |
| The listing page menu query uses `.single()` — if no menu exists, `menuData` is `null` and `reservationsEnabled` is `false` | None — correct behavior | No workaround needed. Restaurants without a published menu cannot enable reservations |

---

## 7. Flags for Prompt 7/8/9 Plan

Issues that must be addressed before implementation begins:

1. **`revalidatePath` for listing URL requires city slug.** The `menus` table currently stores `listing_slug` (e.g. `speedy-s-backyard`) but not the city or URL type segment (e.g. `nairobi`, `restaurants`). The settings PATCH route needs either: (a) the full listing URL passed from the client, or (b) a join to a `listings` table that has city. Check if a `listings` table exists in Supabase, or if the city must come from the client request body. **Decision needed before Prompt 7.**

2. **`reservations` Supabase table design.** The plan requires a new `reservations` table (not reusing `contact_requests`). Schema should include: `id`, `menu_id`, `listing_slug`, `date`, `time`, `party_size`, `guest_name`, `guest_email`, `guest_phone`, `special_requests`, `status` (pending/confirmed/seated/completed/cancelled/no_show), `created_at`, `notes`. RLS should mirror `orders` policies (owner select/update via `menus.business_id = auth.uid()`). **Confirm schema before Prompt 7.**

3. **No `Sheet` primitive exists.** Check `components/ui/` for an existing Sheet/Drawer component before building `ReservationSheet`. If absent, a simple fixed-right slide-in panel with `z-[200]` and a backdrop is sufficient for V1 — avoid pulling in a new library.

4. **`ContactForm` restaurant fields vs `ReservationSheet`.** `ContactForm` already collects `reservationDate`, `reservationTime`, `diners`. When `reservations_enabled = true`, `ReservationSheet` replaces this. When `false`, `ContactForm` keeps collecting these fields and saving to `contact_requests`. This is correct — no change to `ContactForm` needed.

5. **`m/[slug]` header is `text-center` with no relative positioning.** Adding an absolutely-positioned "Book" button requires changing the header to `relative` or switching to a flex layout. Verify this doesn't break the `ScanTracker` component that renders above the header (it's a server-side invisible component, should be fine).

6. **`revalidate = 3600` on the listing page vs `revalidate = 60` on the menu page.** The menu page already updates in 60s. The listing page will lag up to 3600s if `revalidatePath` is not called. Confirm the PATCH route can resolve the full listing URL at toggle time (see item 1).

7. **Kitchen dashboard polling is the right pattern.** The reservation dashboard (Prompt 8) should NOT attempt Supabase Realtime — use the same 8s polling as `KitchenDashboard.tsx`. Copy the component structure verbatim, swap `orders` for `reservations`.

---

---

## Pre-implementation Checks

> Prompt 6.5 findings — appended before Prompt 7 runs.

---

### Check 1 — Listing page menu fetch mechanism

**Where the menu is fetched:**
`apps/web/app/(listings)/[type]/[city]/[slug]/page.tsx` lines 229–248, inline in the page component body (no helper function):

```typescript
const { data } = await adminClient
  .from("menus")
  .select("id, slug, name, is_published, table_ordering, menu_sections(...)")
  .eq("listing_slug", slug)
  .eq("is_published", true)
  .single();
```

**Pattern: raw Supabase call — no `unstable_cache`, no `fetch()` wrapper.**

`sanityFetch` (used for the listing metadata in the same page) is a thin wrapper around `sanityClient.fetch` with `next: { revalidate: 60 }` — it uses Next.js's built-in fetch cache for Sanity only. It does not cache or tag the menu Supabase query.

```typescript
// lib/sanity/client.ts — sanityFetch
export async function sanityFetch<T = any>({ query, params }) {
  const data = await sanityClient.fetch<T>(query, params ?? {}, {
    next: { revalidate: 60 },   // ← Sanity only, not the menu query
  })
  return { data }
}
```

**Why `revalidateTag` won't work for the menu query as-is:**
The Supabase `adminClient` call is not tagged. `revalidateTag("menu:${menu_id}")` is called in the existing settings PATCH route, but it only affects the `/m/[slug]` page (which wraps its menu fetch in `revalidatePath`). The listing page has no such tag.

**Recommendation — minimum-change path: `revalidatePath` on the listing URL.**

The listing page is `force-static`. `revalidatePath("/restaurants/{city}/{slug}")` triggers a full ISR re-render, which re-runs the menu query and picks up `reservations_enabled`. No `unstable_cache` or `fetch()` refactor needed.

**The only wrinkle:** the settings PATCH route needs the full listing path to call `revalidatePath`. The `menus` table stores `listing_slug` but not `city`. Two options:

- **(Recommended) Option A:** Accept `listing_city` in the PATCH request body alongside `menu_id`. The client (MenuBuilder) already knows it — add one prop. The route computes the path: `` `/restaurants/${city.toLowerCase().replace(/\s+/g, "-")}/${listing_slug}` ``.
- **Option B:** Wrap the menu query in `unstable_cache` with a tag and let `revalidateTag` handle it — larger diff, not worth it for V1.

**Prompt 7 action:** In `PATCH /api/menu/settings`, accept optional `listing_city` in the request body, and call `revalidatePath` for the listing URL when `reservations_enabled` changes (in addition to the existing `revalidatePath("/m/${menu.slug}")`).

---

### Check 2 — ContactForm submission destination for restaurants

**Final destination: `contact_requests` table in Supabase.**

`ContactForm` → `POST /api/contact` (`app/api/contact/route.ts`) → `supabase.from("contact_requests").insert(...)`.

**Are restaurant submissions distinguishable from stay submissions?**

Yes, via the `listing_type` column (value `"restaurant"`). However:
- `check_in` and `check_out` columns are only populated when `listingType === "stay"` (hardcoded at line 243–244)
- Restaurant-specific fields (`reservationDate`, `reservationTime`, `diners`) are **not stored in dedicated columns** — they are concatenated into the freeform `notes` text column as:
  ```
  Reservation date: 2026-05-01
  Reservation time: 19:00
  Diners: 4
  ```
- There are no structured `reservation_date`, `reservation_time`, or `party_size` columns on `contact_requests`

**Owner-facing UI for these requests:**

None. Restaurant owners have no dashboard to view `contact_requests`. Visibility today is email-only:
1. Guest receives a Resend confirmation email
2. Host receives a Resend notification email (from `notificationEmail1`/`notificationEmail2` in Sanity, falling back to `host_profiles.email`)
3. Admin receives a copy at `ADMIN_EMAIL`

**The gap when `reservations_enabled` flips `false → true`:**

There is a clear owner-experience transition: before, the host got an email for every booking request. After, requests become structured reservations in a dashboard — email notifications will need to be added separately to `POST /api/menu/reservations` to maintain continuity. If no notification email is sent from the new endpoint, the owner's inbox goes silent on day one.

**Recommendation for Prompt 7/8:**
- The `POST /api/menu/reservations` route must send a host notification email (same Resend pattern as `/api/contact`) — this is not optional for V1
- Add copy to the MenuBuilder toggle UI: *"When enabled, reservation requests appear in your dashboard instead of email enquiries"*
- The `contact_requests` table is unchanged; generic enquiries still land there when `reservations_enabled = false`

---

### Check 3 — Existing settings PATCH route

**Confirmed: `PATCH /api/menu/settings` exists.**

- **File:** `apps/web/app/api/menu/settings/route.ts`
- **Validation pattern:** Manual — no Zod schema. Uses `typeof` guards:
  ```typescript
  const { menu_id, table_ordering } = body;
  if (typeof table_ordering === "boolean") updates.table_ordering = table_ordering;
  if (Object.keys(updates).length === 0) return 400 "No valid fields to update"
  ```
- **Revalidation calls today:** Both — `revalidateTag` then `revalidatePath`:
  ```typescript
  revalidateTag(`menu:${menu_id}`, "default");
  revalidatePath(`/m/${menu.slug}`);
  ```
  Note: `revalidateTag` takes one argument in the Next.js API — the second `"default"` argument appears to be a no-op in practice (existing behaviour, not changed here).
- **Fields currently accepted in PATCH body:** `table_ordering` only
- **Can Prompt 7 extend this route rather than creating a new one?**

  **Yes.** The pattern is a clean open/close: add `reservations_enabled` to the same `updates` accumulator block:
  ```typescript
  if (typeof reservations_enabled === "boolean") {
    updates.reservations_enabled = reservations_enabled;
  }
  ```
  And add the `revalidatePath` call for the listing URL in the same handler (see Check 1). No new route file needed.

**Prompt 7 action:** Extend `apps/web/app/api/menu/settings/route.ts` — add `reservations_enabled` field support + `revalidatePath` for the listing URL. Keep the existing `table_ordering` path unchanged.

---

## File Index

Key files for implementation:

| File | Role |
|---|---|
| `apps/web/app/(listings)/[type]/[city]/[slug]/page.tsx` | Listing page — add `reservations_enabled` to menu query, derive flag, pass to `RestaurantDetail` |
| `apps/web/components/listings/detail/RestaurantDetail.tsx` | Accept `reservationsEnabled` + `menuId` props, swap sidebar conditionally |
| `apps/web/components/listings/widgets/BookingSidebar.tsx` | Thin wrapper — will need a reservation variant |
| `apps/web/components/listings/widgets/MobileBookingBar.tsx` | Mobile — conditional CTA triggers `ReservationSheet` |
| `apps/web/components/listings/ContactForm.tsx` | Unchanged — still used when `reservations_enabled = false` |
| `apps/web/app/m/[slug]/page.tsx` | Add `reservations_enabled` to `getMenu()` select, pass to header |
| `apps/web/components/dashboard/menu/MenuBuilder.tsx` | Add `reservations_enabled` toggle alongside `table_ordering` |
| `apps/web/app/api/menu/settings/route.ts` | Extend PATCH to accept `reservations_enabled`, call `revalidatePath` for listing URL |
| `apps/web/components/dashboard/menu/KitchenDashboard.tsx` | Template for reservation dashboard polling |
| `apps/studio/schemas/listing.ts` | **No changes needed** — flag lives in Supabase |
| `supabase/migrations/` | New migration: `menus.reservations_enabled` column + `reservations` table + RLS |
| `apps/web/components/reservations/ReservationSheet.tsx` | **New** — shared sheet component consumed by both surfaces |
| `apps/web/app/api/menu/reservations/route.ts` | **New** — GET (list) + POST (create) + PATCH (status update) |
| `apps/web/app/dashboard/menu/[id]/reservations/page.tsx` | **New** — reservation management dashboard page |
| `apps/web/components/dashboard/menu/ReservationsDashboard.tsx` | **New** — polling dashboard, modelled on `KitchenDashboard.tsx` |

---

## Listing Command Center Discovery

> Investigation date: 2026-04-10. No code changes — mapping only.

---

### Q1 — Current state of `/dashboard/listings/`

**Folder structure (two levels):**

```
apps/web/app/dashboard/listings/
├── page.tsx          ← read-only listing list
└── loading.tsx       ← skeleton
```

**There is no `[id]` dynamic route.** The page is a simple read-only index: it queries Sanity for all listings claimed by the current user, renders a card list with photo + title + type + city + verification badge, and links each card to the public listing URL (`/{type}/{city}/{slug}`). No editing, no tabs, no feature management.

**JSX layout root (page.tsx):**
```tsx
return (
  <div>
    <div className="flex items-center justify-between mb-5">
      <h1 …>My Listings</h1>
      <p …>{listings.length} listings · {verifiedCount} verified · {pendingCount} pending</p>
    </div>
    {listings.length === 0 ? <EmptyState /> : (
      <div className="space-y-3">
        {listings.map(listing => (
          <div key={listing._id} …>
            {/* photo + title + type + city + badge */}
            <div className="flex gap-2 mt-2.5 pt-2.5 border-t …">
              <Link href={href}>View listing →</Link>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
```

Single page, no tabs, no per-listing management. The `[id]` route does not exist yet — it is fully greenfield.

---

### Q2 — How stays are managed today

Stay owners do **not** manage their listing through `/dashboard/listings/`. That page is view-only. Stay management lives in a completely separate PMS system at `/dashboard/property/[id]/`.

**Entry path for a stay owner:**
1. Dashboard homepage (`/dashboard`) shows a "Property calendar is ready to set up" banner if a property exists without configuration → links to `/dashboard/property/{id}`
2. Sidebar nav has a "Property PMS" link → `/dashboard/property/` (hub listing all properties)

**Key routes:**

| Route | File | Purpose |
|---|---|---|
| `/dashboard/property/` | `property/page.tsx` | Hub — lists all properties, 60-day unified calendar, check-in/out stats |
| `/dashboard/property/[id]/` | `property/[id]/page.tsx` | Single property — today snapshot, per-property calendar, room management, linked listing card |
| `/dashboard/property/[id]/settings/` | `property/[id]/settings/page.tsx` | Full settings: name, type, check-in/out times, min stay, renting type, entire-place price, weekend multiplier, date-based pricing rules, fees, listing link, booking toggle |
| `/dashboard/property/new/` | `property/new/page.tsx` | Create or import from Sanity listing |

**Layout description:** The single-property page (`property/[id]/page.tsx`) is a single-page layout (no tabs): header, TodaySnapshot stats row, PropertyCalendarWrapper (full monthly calendar with booking/block overlays), RoomManagementSection (room cards with drag-to-reorder), and a LinkedListingCard. Settings are on a **separate sub-route** (`/settings/`), not a tab. The pattern is: main page = operational view, sub-route = configuration.

This is the only precedent in the dashboard for a sub-route pattern: `property/[id]/` → `property/[id]/settings/`.

---

### Q3 — How restaurants are managed today

**Entry path for a restaurant owner:**
1. Dashboard homepage shows "Your digital menu isn't live yet" banner → links to `/dashboard/menus`
2. Sidebar nav has a "Menu" link → `/dashboard/menus/`

**Routes:**

| Route | File | Purpose |
|---|---|---|
| `/dashboard/menus/` | `menus/page.tsx` | Hub — lists all menus via `MenusOverview` component |
| `/dashboard/menu/[id]/` | `menu/[id]/page.tsx` | **The restaurant command center today** — single page with MenuBuilder |
| `/dashboard/menu/[id]/orders/` | `menu/[id]/orders/page.tsx` | Kitchen dashboard (only accessible when `table_ordering = true`) |
| `/dashboard/menu/[id]/qr/` | `menu/[id]/qr/page.tsx` | QR code download |

**There is no listing-level restaurant UI that is not menu-related.** When a restaurant owner logs in, they go to their menu. All feature configuration (publish toggle, table ordering, reservations) lives inside `MenuBuilder`'s sticky publish panel (the right column on desktop, the top section on mobile). There is no "restaurant listing command center" — only a menu builder with a settings sidebar baked in.

The `MenuBuilder` component is a 957-line monolith that combines menu editing, section/item CRUD, and all feature toggles in one component. It is the pattern we are explicitly replacing with the new `/dashboard/listings/[id]` command center.

---

### Q4 — Existing tab/nav primitives in the dashboard

**Result: no reusable tab component exists anywhere in the dashboard. Individual pages roll their own.**

The only tab implementation in the entire codebase is in `apps/web/app/profile/ProfileClient.tsx` (the public guest profile page, not the dashboard):

```typescript
// ProfileClient.tsx — lines 89–96
const TABS = [
  { key: "profile",   label: "Profile",   icon: User },
  { key: "bookings",  label: "Bookings",  icon: BookOpen },
  { key: "enquiries", label: "Enquiries", icon: Mail },
  { key: "events",    label: "Events",    icon: Calendar },
  { key: "saved",     label: "Saved",     icon: Heart },
] as const;
type Tab = (typeof TABS)[number]["key"];

const [activeTab, setActiveTab] = useState<Tab>(startTab);
```

Tab buttons are rendered inline with `onClick={() => setActiveTab(tab.key)}` and conditional content blocks below. No shared component, no URL-driven tabs, no search-param routing.

`components/ui/` has **no Tabs component**: Badge, Button, Card, DateRangePicker, Input, Modal, PhoneInput, Select, Textarea, Toast. That is the full list.

`components/dashboard/` contains only one sub-directory: `menu/` (8 files — ItemForm, KitchenDashboard, MenuBuilder, MenuImporter, MenusOverview, OptionGroupEditor, QRDownload, TableSetup).

**Bottom line:** The tab system for the listing command center must be built from scratch, but it can be minimal — the ProfileClient pattern (constant array + `useState`) is proven and readable. The key upgrade needed: URL-driven tab state (search param or sub-route) so the active tab survives a page refresh and supports direct linking.

---

### Q5 — Existing "feature card" or "upsell card" patterns

**Result: no reusable feature/upsell card component exists.** Scattered references only:

| File | Pattern | Note |
|---|---|---|
| `property/[id]/settings/page.tsx` | `"Optional upsell"` label on fee radio button | Single text string in a form field label |
| `dashboard/settings/SettingsClient.tsx` | `"More options coming soon."` | Inline text |
| `admin/page.tsx` | `source: "coming-soon"` badge | Admin-only analytics |
| `become-a-host/UpgradeButton.tsx` | `/api/auth/upgrade-to-host` flow | Role upgrade, not feature upsell |
| `hosts/[slug]/page.tsx` | `"Reviews coming soon"` | Placeholder text |

Nothing is reusable. No `FeatureCard`, no `UpsellCard`, no `ComingSoonBadge` component anywhere. The Features tab upsell surface is fully greenfield.

---

### Q6 — How "enabled features" are detected per listing today

**Restaurants (`menus` table)** — richest flag set, fully structured:

| Column | Type | Default | Status |
|---|---|---|---|
| `ordering_enabled` | boolean | false | Dormant (from migration 028) |
| `table_ordering` | boolean | false | Active V1 |
| `takeaway_enabled` | boolean | false | Dormant (from migration 028) |
| `delivery_enabled` | boolean | false | Dormant (from migration 028) |
| `reservations_enabled` | boolean | false | Active V1 (migration 049) |
| `default_reservation_duration` | int | 90 | Active V1 |
| `reservations_lead_time_hours` | int | 2 | Active V1 |
| `reservations_max_party_size` | int | 12 | Active V1 |
| `reservations_max_advance_days` | int | 30 | Active V1 |

The dormant flags (`ordering_enabled`, `takeaway_enabled`, `delivery_enabled`) are schema-only — no UI, no API, no logic reads them. They are future features waiting for an upsell surface.

**Stays (`properties` table)** — thin:

| Column | Type | Default | Meaning |
|---|---|---|---|
| `is_active` | boolean | true | Property-level on/off |
| `renting_type` | enum | varies | `entire_place` / `by_room` / `both` — not a feature flag |

There are no per-feature boolean flags on properties analogous to `reservations_enabled`. The property PMS itself is the "feature" — having a linked property at `/dashboard/property/[id]/` means the booking engine is on. There is no `booking_engine_enabled` flag; the booking widget is gated purely by `properties.is_active`.

**No unified feature flag model exists.** The restaurant flags live on `menus`, the property on/off lives on `properties.is_active`, and the two systems have no shared abstraction. The listing command center will need to define this abstraction.

---

### Q7 — Recommended architecture

#### URL structure

Use **sub-routes** with a shared `layout.tsx` containing the tab nav:

```
/dashboard/listings/[id]/                  ← redirects to /overview
/dashboard/listings/[id]/overview/         ← stats, listing info, quick links
/dashboard/listings/[id]/features/         ← Features tab (upsell surface, always visible)
/dashboard/listings/[id]/reservations/     ← only rendered when reservations_enabled = true
/dashboard/listings/[id]/orders/           ← only rendered when table_ordering = true (future)
/dashboard/listings/[id]/menu/             ← only rendered for restaurants (future)
```

**Rationale:** Sub-routes are the only existing precedent for per-entity navigation in this codebase (`property/[id]/settings/`). Each tab is a server component with its own data-fetching. Active tab state is the URL, so it survives refresh, supports deep-linking, and does not require client state. The tab nav in `layout.tsx` reads `pathname` to highlight the active tab.

Search-param routing (`?tab=reservations`) is ruled out because the Reservations tab needs server-side data — with search params it would be a client-rendered component, losing the server fetch pattern.

#### Tab rendering — dynamic feature tabs

A feature config file at `apps/web/app/dashboard/listings/[id]/_lib/features.config.ts` exports `LISTING_FEATURES: FeatureDefinition[]`. The layout.tsx reads this config, checks each feature's `isEnabled(ctx)` against the current listing's data, and renders tab links only for enabled features.

```typescript
// Pseudo-registration in layout.tsx
const enabledTabs = LISTING_FEATURES.filter(f =>
  f.appliesTo.includes(listingType) && f.isEnabled(featureCtx)
);
```

No hardcoded conditionals in layout. Adding a new feature tab = adding one object to the config array.

#### Feature registry shape (proposed TypeScript)

```typescript
// apps/web/app/dashboard/listings/[id]/_lib/features.config.ts

type ListingType = "restaurant" | "stay" | "experience" | "service" | "event" | "rental";
type FeatureStatus = "active" | "inactive" | "coming_soon" | "paid";

interface FeatureContext {
  listingType: ListingType;
  menuId: string | null;            // restaurants only
  propertyId: string | null;        // stays only
  reservationsEnabled: boolean;
  tableOrderingEnabled: boolean;
  // add more flags as features grow
}

interface FeatureDefinition {
  /** Unique slug — also the URL segment for the tab */
  id: string;
  label: string;
  description: string;
  icon: string; // emoji or Lucide icon name
  /** Which listing types can have this feature */
  appliesTo: ListingType[];
  /**
   * Returns the current status for this listing.
   * "active"       → feature is on; show as a tab + green badge in Features tab
   * "inactive"     → feature exists but is off; show toggle in Features tab, no tab link
   * "coming_soon"  → not yet buildable; show locked card in Features tab
   * "paid"         → requires a paid plan; show upgrade CTA in Features tab
   */
  getStatus: (ctx: FeatureContext) => FeatureStatus;
  /**
   * The page component path for the feature tab (relative to [id]/).
   * Only rendered when getStatus returns "active".
   * Omit for coming_soon / paid features.
   */
  tabSegment?: string; // e.g. "reservations"
}

// Example entries
const LISTING_FEATURES: FeatureDefinition[] = [
  {
    id: "reservations",
    label: "Table Reservations",
    description: "Let guests book a table directly from your listing and menu page.",
    icon: "📅",
    appliesTo: ["restaurant"],
    getStatus: (ctx) => ctx.reservationsEnabled ? "active" : "inactive",
    tabSegment: "reservations",
  },
  {
    id: "table_ordering",
    label: "Table Ordering",
    description: "Guests scan your QR code and order from their phone.",
    icon: "🍽️",
    appliesTo: ["restaurant"],
    getStatus: (ctx) => ctx.tableOrderingEnabled ? "active" : "inactive",
    tabSegment: "orders",
  },
  {
    id: "delivery",
    label: "Delivery",
    description: "Accept delivery orders from your menu page.",
    icon: "🛵",
    appliesTo: ["restaurant"],
    getStatus: () => "coming_soon",
  },
  {
    id: "takeaway",
    label: "Takeaway",
    description: "Let guests pre-order for collection.",
    icon: "🥡",
    appliesTo: ["restaurant"],
    getStatus: () => "coming_soon",
  },
  {
    id: "booking_engine",
    label: "Direct Bookings",
    description: "Accept reservations and payments without OTA fees.",
    icon: "🏠",
    appliesTo: ["stay"],
    getStatus: (ctx) => ctx.propertyId ? "active" : "inactive",
  },
];
```

#### Where Prompt 8 places the Reservations dashboard

- **URL:** `/dashboard/listings/[id]/reservations`
- **Page file:** `apps/web/app/dashboard/listings/[id]/reservations/page.tsx`
- **Component:** `apps/web/components/dashboard/listings/ReservationsDashboard.tsx`
  (new directory `components/dashboard/listings/` — mirrors existing `components/dashboard/menu/`)
- **Mount condition:** `getStatus(ctx) === "active"` i.e. `reservations_enabled = true`
- **If accessed when disabled:** the layout redirects to `/dashboard/listings/[id]/features`
- **Data source:** `GET /api/menu/reservations?menu_id={menuId}` with 8-second polling, mirroring `KitchenDashboard.tsx` pattern

The existing `apps/web/app/dashboard/menu/[id]/reservations/` route planned in the earlier section of this doc **is superseded** by the listing command center. Build it at `/dashboard/listings/[id]/reservations/` instead.

#### Minimum-change path

**Reuse / extend (zero new patterns):**
- `property/[id]/` sub-route structure → same pattern for `listings/[id]/`
- `ProfileClient.tsx` tab array + conditional rendering → same pattern for tab nav, upgraded with `usePathname` for URL-driven active state
- `KitchenDashboard.tsx` 8-second polling → `ReservationsDashboard.tsx` copy + adapt
- `MenuBuilder.tsx` toggleReservations → same PATCH `/api/menu/settings` endpoint, same toast pattern
- `ReservationSheet.tsx` (already built) → reused in the Reservations dashboard for manual booking entry (future)

**Build new (minimal, intentionally small):**
1. `apps/web/app/dashboard/listings/[id]/layout.tsx` — fetches listing metadata + feature context, renders tab nav (client component for `usePathname`, everything else server)
2. `apps/web/app/dashboard/listings/[id]/_lib/features.config.ts` — the feature registry (pure data, no components)
3. `apps/web/app/dashboard/listings/[id]/_lib/context.ts` — `getListingFeatureContext(listingId, userId)` server helper that queries Supabase for menus/properties linked to the listing
4. `apps/web/app/dashboard/listings/[id]/page.tsx` — redirect to `/overview`
5. `apps/web/app/dashboard/listings/[id]/overview/page.tsx` — listing stats, quick-action cards
6. `apps/web/app/dashboard/listings/[id]/features/page.tsx` — Features tab: maps LISTING_FEATURES, renders FeatureCard for each
7. `apps/web/app/dashboard/listings/[id]/reservations/page.tsx` — Reservations tab (Prompt 8)
8. `apps/web/components/dashboard/listings/FeatureCard.tsx` — the reusable card for the Features tab (active/inactive/coming_soon/paid states)
9. `apps/web/components/dashboard/listings/ListingTabNav.tsx` — the client tab bar component

**What does NOT need to be built:**
- A new API route for features (all existing `/api/menu/settings` routes are reused)
- A new Supabase table (feature flags already exist on `menus` and `properties`)
- A Sanity schema change (listing metadata stays in Sanity, feature state stays in Supabase)

**Open question for Prompt 8:** The existing `/dashboard/menu/[id]/` route is where restaurant owners currently land. After building the listing command center, should `/dashboard/menu/[id]/` be deprecated (redirect to `/dashboard/listings/[id]/menu/`) or kept as a standalone route for QR/menu-specific workflows? Recommendation: keep `/dashboard/menu/[id]/` for now — the `MenuBuilder` (menu editing itself) stays there. The command center adds a layer above it, it does not replace it.

---

## Admin Access Discovery (Prompt 10.5)

> Discovery pass only — no code changes. Maps the current state for the forthcoming admin access prompt.

---

### 1. Admin Role Detection

**Mechanism:** `users.role` column in Supabase. Checked as `profile?.role === "admin"`.

There is no email allowlist, no env-var ID list, no Supabase `app_metadata`. The role string lives in a plain `users` table row alongside `host` and `guest` roles.

**Primary server-side check — middleware route guard:**
```typescript
// apps/web/middleware.ts  lines 57–66
const { data: profile } = await adminSupabase
  .from("users")
  .select("role")
  .eq("id", user.id)
  .single();

const role = profile?.role;

if (isAdmin && role !== "admin") {
  const url = request.nextUrl.clone();
  url.pathname = role === "host" ? "/dashboard" : "/profile";
  return NextResponse.redirect(url);
}
```

**API-layer check — shared menu auth helper:**
```typescript
// apps/web/app/api/menu/_lib/auth.ts  lines 13–22
const { data: profile } = await adminClient
  .from("users")
  .select("role")
  .eq("id", user.id)
  .single();

return {
  userId: user.id,
  isAdmin: profile?.role === "admin",
  supabase,
};
```

**Admin count:** Not visible in code — determined dynamically from `users` table at runtime. No hardcoded list.

**Server-side only.** No client-side role checks found. The admin chrome in layout.tsx is server-rendered behind the middleware guard.

---

### 2. How Admin Sees Menus Today

**URL:** Admin visits `/admin/hosts/{hostId}` → clicks "Edit menu" → lands at `/admin/hosts/{hostId}/menu/{menuId}`.

This is a **parallel admin route** at `apps/web/app/admin/hosts/[id]/menu/[menuId]/page.tsx`. It fetches the menu without any ownership filter:

```typescript
// apps/web/app/admin/hosts/[id]/menu/[menuId]/page.tsx  lines ~16–31
// Admin auth is handled by the admin layout — no extra check needed
// Fetch menu without ownership filter (admin can edit any menu)
const { data: menu } = await adminClient
  .from("menus")
  .select(...)
  .eq("id", menuId)   // ← NO business_id filter
  .single();
```

The admin sees **identical UI to the owner** — it renders the same `MenuBuilder` component with no special chrome or read-only mode. No "viewing as admin" banner exists today.

The ownership bypass is also implemented at the API level. Every `/api/menu/*` route calls `verifyMenuAccess()` which has an explicit admin escape hatch:

```typescript
// apps/web/app/api/menu/_lib/auth.ts  lines 29–52
export async function verifyMenuAccess(
  supabase,
  menuId: string,
  userId: string,
  isAdmin: boolean
) {
  if (isAdmin) {
    // Admin: fetch without ownership filter
    const { data } = await adminClient
      .from("menus")
      .select("id, slug")
      .eq("id", menuId)
      .single();
    return data;
  }

  const { data } = await supabase
    .from("menus")
    .select("id, slug")
    .eq("id", menuId)
    .eq("business_id", userId)  // ← ownership check for non-admins
    .single();
  return data;
}
```

**This bypass already covers every `/api/menu/*` route** — settings, areas, tables, reservations GET, reservations PATCH, sections, items, orders. All call `verifyMenuAccess`. So admin can already call all of those APIs without restriction.

---

### 3. Existing Admin Routes and Code Paths

**`/app/admin/` folder structure (2 levels deep):**
```
app/admin/
├── _components/
│   ├── AdminNavLink.tsx
│   ├── AdminSignOut.tsx
│   └── AdminBottomNav.tsx
├── ambassadors/[id]/page.tsx
├── analytics/page.tsx
├── bookings/[id]/page.tsx
├── claims/[id]/page.tsx
├── contact-requests/[id]/page.tsx
├── events/[id]/page.tsx
├── general-contacts/[id]/page.tsx
├── guests/[id]/page.tsx
├── hosts/
│   ├── [id]/
│   │   ├── menu/[menuId]/page.tsx   ← the only restaurant-deep admin route today
│   │   ├── page.tsx
│   │   └── HostListingActions.tsx
│   ├── CreateHostModal.tsx
│   └── page.tsx
├── listings/page.tsx                ← exists but no restaurant command center link
├── newsletter/page.tsx
├── property-enquiries/[id]/page.tsx
├── property-listings/page.tsx
├── real-estate/page.tsx
├── settings/page.tsx
├── layout.tsx
├── page.tsx
└── error.tsx
```

**`/app/api/admin/` routes** (all require `role === "admin"` enforced in-handler):
```
api/admin/properties/assign/
api/admin/hosts/create/
api/admin/hosts/[id]/assign|unassign|sync-listings/
api/admin/events/[id]/review/
api/admin/delete/
api/admin/contact-requests/[id]/send-reply|note|status/
api/admin/general-contacts/[id]/send-reply/
api/admin/property-enquiries/[id]/send-reply|note|status/
api/admin/listing-requests/[id]/send-reply|note|status/
api/admin/ambassadors/[id]/send-reply|note|status/
api/admin/ai/draft-reply/
```

**`isAdmin` occurrences in `/api/menu/` routes** (all use the shared `verifyMenuAccess` bypass):
- `app/api/menu/_lib/auth.ts` — defines it
- `app/api/menu/settings/route.ts`
- `app/api/menu/areas/route.ts`
- `app/api/menu/tables/route.ts`
- `app/api/menu/reservations/route.ts` (GET)
- `app/api/menu/reservations/[id]/route.ts` (PATCH)
- `app/api/menu/time-windows/route.ts` (GET/POST/PATCH/DELETE — added Prompt 10 multiple-windows)
- `app/api/menu/sections/route.ts`
- `app/api/menu/items/route.ts`
- `app/api/menu/orders/route.ts`

No `requireAdmin`, `admin_only`, or `hasAdminAccess` patterns exist anywhere. `adminClient` throughout the codebase refers to the Supabase service-role client (`lib/supabase/admin.ts`), not an admin-user check.

---

### 4. Auth Helpers — Current State on Each Route

| Route | Auth helper | Admin bypass today? |
|---|---|---|
| `GET /api/menu/reservations` | `getMenuAuth()` + `verifyMenuAccess()` | ✅ YES — via `verifyMenuAccess` |
| `PATCH /api/menu/reservations/[id]` | `getMenuAuth()` + `verifyMenuAccess()` | ✅ YES — via `verifyMenuAccess` |
| `GET/POST/PATCH/DELETE /api/menu/areas` | `getMenuAuth()` + `verifyMenuAccess()` | ✅ YES — via `verifyMenuAccess` |
| `PATCH /api/menu/settings` | `getMenuAuth()` + `verifyMenuAccess()` | ✅ YES — via `verifyMenuAccess` |
| `GET/POST/PATCH/DELETE /api/menu/tables` | `getMenuAuth()` + `verifyMenuAccess()` | ✅ YES — via `verifyMenuAccess` |
| `GET/POST/PATCH/DELETE /api/menu/time-windows` | `getMenuAuth()` + `verifyMenuAccess()` | ✅ YES — via `verifyMenuAccess` |
| `app/dashboard/listings/[id]/layout.tsx` | Sanity ownership query | ❌ NO bypass |
| `app/dashboard/listings/[id]/reservations/page.tsx` | Sanity ownership + `business_id` filter | ❌ NO bypass |

**The gap is entirely in the page/layout layer, not the API layer.**

Every `/api/menu/*` route already works for admins — the `verifyMenuAccess` bypass was built in Prompt 8b and covers all of them. The problem is the listing command center pages themselves are gated by a Sanity ownership query that has no admin escape hatch.

**Listing layout ownership check (the blocker):**
```typescript
// apps/web/app/dashboard/listings/[id]/layout.tsx  lines 55–74
const listing = await sanityClient.fetch<...>(
  `*[
    _id == $id &&
    (_type == "listing" || _type == "event") &&
    (hostId == $userId || host._ref == $sanityHostId)
  ][0]{...}`,
  {
    id,
    userId: user.id,
    sanityHostId: hostProfile.sanity_host_id ?? "",
  },
);

if (!listing) notFound();   // ← admin hits notFound() here
```

**Reservations page ownership check (second blocker):**
```typescript
// apps/web/app/dashboard/listings/[id]/reservations/page.tsx  lines 28–42
const listing = await sanityClient.fetch<...>(
  `*[_id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{...}`,
  { id, userId: user.id, sanityHostId: hostProfile.sanity_host_id ?? "" },
);

if (!listing) redirect("/dashboard/listings");

const { data: menu } = await adminClient
  .from("menus")
  .select(...)
  .eq("listing_slug", listing.slug)
  .eq("business_id", user.id)    // ← second ownership filter (Supabase)
  .maybeSingle();
```

**Shared helper location:** `apps/web/app/dashboard/_lib/auth.ts` — contains `getAuthUser()`, `getUserProfile()`, `getHostProfile()`. These have no admin bypass. They just return the current user's profile.

---

### 5. Admin Discovery UI

**What exists today:**
1. `/admin/hosts` — lists all hosts in a table, each row links to `/admin/hosts/{id}`
2. `/admin/hosts/{id}` — shows host detail + their assigned listings + "Edit menu" links to `/admin/hosts/{id}/menu/{menuId}`
3. `/admin/listings` — page exists but contains no restaurant command center links (general listing overview only)

**What's missing for "find restaurant → fix something → done":**
- No direct path from the admin UI to `/dashboard/listings/{id}` (the listing command center)
- The "Edit menu" link in `/admin/hosts/{id}` goes to the parallel `/admin/hosts/{id}/menu/{menuId}` route, which only shows the QR menu builder. It does not expose: reservations, areas, booking rules, bookable hours, ordering tables, or the new settings sub-tab
- No search across restaurants — admin must browse by host
- No `/admin/listings/{id}` route mirroring `/dashboard/listings/{id}`

---

### 6. Recommendation

#### (a) Bypass vs parallel routes

**Recommendation: Bypass (add admin escape hatches to existing ownership checks).**

Rationale: The codebase already uses bypass as its convention. `verifyMenuAccess()` was written from day one with `if (isAdmin) return data` — this pattern was deliberate and consistent. The API layer is already fully permissive for admins. Building parallel routes (`/admin/listings/[id]/reservations/`) would create a second copy of every page that would immediately diverge. Two changes instead of two file edits.

#### (b) Files needing bypass for listing command center access

Three locations need updating:

1. **`apps/web/app/dashboard/listings/[id]/layout.tsx` — Sanity ownership query**
   The GROQ query includes `(hostId == $userId || host._ref == $sanityHostId)`. For admins, drop the ownership clause and fetch by `_id` only. Change: detect admin via `getUserProfile` or a new `isAdmin` check, then conditionally use a broader Sanity query.

2. **`apps/web/app/dashboard/listings/[id]/reservations/page.tsx` — Sanity query + `business_id` filter**
   Same Sanity query bypass needed. Also the Supabase menu fetch uses `.eq("business_id", user.id)` — replace with `adminClient` fetch without that filter when admin.

3. **`apps/web/app/dashboard/_lib/auth.ts` — Add `isAdmin` helper**
   Currently returns `getAuthUser`, `getUserProfile`, `getHostProfile`. Add `getIsAdmin(userId)` that checks `users.role === "admin"` — same pattern as `getMenuAuth()`. The layout and page can then call this and branch.

All `/api/menu/*` endpoints — already done. No changes needed there.

#### (c) Admin discovery entry point

Add a "Restaurants" section to `/admin/hosts/{id}` that includes a direct link to `/dashboard/listings/{sanityListingId}` alongside the existing "Edit menu" link. The host detail page already fetches the host's assigned listings (Sanity `_id` available). This requires one extra link per listing card — no new page.

A dedicated `/admin/restaurants` index (search by name, city, slug) would be valuable but is lower priority than the bypass fix.

#### (d) "Viewing as admin" banner

**Yes, mandatory.** The listing dashboard has no visual distinction between owner view and admin view today (admin sees identical MenuBuilder UI). Without a banner, an admin can forget they are acting as an admin and accidentally trigger guest-facing actions. The banner should be persistent (sticky in the layout header), clearly branded ("Viewing as admin — changes affect live restaurant"), and non-dismissable.

#### (e) Communication safety

**Recommendation: Server-side check — if `isAdmin`, skip guest email send.**

In `PATCH /api/menu/reservations/[id]`, the `sendGuestEmail()` call is already conditional on `guestEmail` being set. Add one more condition: `&& !isAdmin`. This is the smallest possible change, guaranteed to be correct regardless of UI, and requires no UI work. The `isAdmin` flag is already extracted from `getMenuAuth()` at the top of the handler.

```typescript
// Current (line 371–386)
if (guestEmail && whatsAppTransitions.includes(newStatus)) {
  void sendGuestEmail({...});
}

// After fix — one extra condition
if (guestEmail && whatsAppTransitions.includes(newStatus) && !isAdmin) {
  void sendGuestEmail({...});
}
```

The WhatsApp URL is still generated and returned — admin can paste it manually if needed. No communication is fired automatically.

#### (f) Audit log

**Defer.** No audit infrastructure exists today and building `admin_actions` table, migration, and logging hooks is scope-creep for what is a small team with few admins. Minimum viable logging: add `console.log("[admin]", userId, "updated reservation", reservationId, updates)` at the existing action points. Real audit table is V2 when the team grows or compliance requires it.

---

### Surprises / gaps worth flagging

1. **The API is already admin-permissive; only the pages are not.** The work is smaller than it looks — two page files and the layout need bypass logic. The heavy API layer needs nothing.

2. **The listing layout makes a second Sanity ownership query.** The reservations page makes its own *third* Sanity query for the same listing. Both need to be bypassed independently — there is no single place to fix both.

3. **Admin email send risk is real today.** An admin who navigates to `/dashboard/menu/{menuId}/` (already accessible via `verifyMenuAccess` bypass), then uses the reservations dashboard (if they could reach it), could trigger approve/decline/cancel emails to real guests. The `sendGuestEmail()` call has no admin guard today.

4. **`/admin/listings/page.tsx` exists but is a stub.** It doesn't link to individual listing command centers. It's a placeholder that will need content when admin access is built.

5. **`approved_by` is set to `userId` on approve** (line 315 of `reservations/[id]/route.ts`). When an admin approves, `approved_by` would be set to the admin's user ID, not the restaurant owner's. This is actually correct behaviour for an audit trail but worth noting — the restaurant owner won't see "who approved" in the UI today, but if that's added in V2, admin approvals will be attributable.

---

## Admin Panel Inventory (Prompt 10.6)

> Discovery pass only — no code changes. Catalogs every /app/admin/ page, what it does, and where it's stale relative to the restaurant/reservation schema built in Prompts 7–10.

---

### 1. Navigation & Layout Shell

**File:** `apps/web/app/admin/layout.tsx`

Persistent sidebar (desktop) + bottom nav (mobile). Unread/pending badge counts are fetched on every layout load:

```typescript
// Tables queried on layout mount for badge counts
contact_requests       (status = "new")
property_enquiries     (status = "new")
listing_requests       (status = "new")
general_contacts       (all)
ambassador_applications (status = "new")
claim_requests         (status in ["pending", "verified"])
newsletter_subscribers (total count)
events_pending         (status = "pending")
```

**Nav links in order:** Dashboard · Contact Requests · Listing Requests · General Contacts · Property Enquiries · Bookings · Guests · Ambassadors · Verification Requests · Events · Hosts · Analytics · Newsletter Subscribers · Listings · Real Estate · Blog Posts (Sanity Studio external link) · Settings

No restaurant-specific nav items. No reservations nav item.

---

### 2. Admin Dashboard Home

**File:** `apps/web/app/admin/page.tsx`  
**Page title:** "Dashboard"

Stats cards + recent-activity tables. Queries: contact_requests, property_enquiries, listing_requests, general_contacts, ambassador_applications, newsletter_subscribers, claim_requests, events_pending, Sanity listings/blog post counts.

**Restaurant/reservation relevance: NONE.** No reservation metrics, no restaurant-specific widgets.

---

### 3. Hosts Module

#### `/admin/hosts` — Hosts list
**File:** `apps/web/app/admin/hosts/page.tsx`  
**Queries:** host_profiles, Sanity listing counts per host.  
**Renders:** Table of all hosts with listing count and "View →" link.  
**Restaurant relevance:** Indirect entry point only.

#### `/admin/hosts/[id]` — Host detail
**File:** `apps/web/app/admin/hosts/[id]/page.tsx`

This is the **primary admin entry point for restaurant management today.** Key fetch:

```typescript
// Lines 49–61
const restaurantSlugs = assignedListings.filter(isRestaurant).map((l) => l.slug);
const { data } = await adminClient
  .from("menus")
  .select("id, slug, display_name, is_published, listing_slug")
  .in("slug", restaurantSlugs);
```

Renders: Host details → Assigned listings (all types) → **Menu Management section** with "Edit menu" link per restaurant → Assign a listing interface.

The "Edit menu" link goes to `/admin/hosts/[id]/menu/[menuId]`. There is **no link to `/dashboard/listings/[id]`** — the listing command center is unreachable from admin today.

No badge or indicator for whether reservations_enabled is true on any menu.

#### `/admin/hosts/[id]/menu/[menuId]` — Menu editor
**File:** `apps/web/app/admin/hosts/[id]/menu/[menuId]/page.tsx`

The only admin page that goes into a specific restaurant. Fetches:

```typescript
// Lines 18–31 — does NOT fetch any reservation columns
await adminClient
  .from("menus")
  .select(`
    id, slug, name, is_published, table_ordering,
    menu_sections ( id, title, display_order, is_visible,
      menu_items ( id, name, description, price_kes,
        dietary_tags, is_available, display_order, photo_url ) )
  `)
  .eq("id", menuId)
  .single();
```

Delegates to the shared `MenuBuilder` component. MenuBuilder shows a `reservations_enabled` toggle (calls `PATCH /api/menu/settings`) but only as an on/off switch with a hardcoded note: "Configure full reservation settings in the listing dashboard." The link to the listing dashboard is only rendered when `listingId` is passed as a prop — **the admin page does not pass `listingId`,** so the link is invisible in admin context.

**STALE.** Does not query or display: `reservations_enabled` status badge, `default_reservation_duration`, `reservations_lead_time_hours`, `reservations_max_party_size`, `reservations_max_advance_days`, `restaurant_areas`, `restaurant_tables`, `reservation_time_windows`.

---

### 4. Bookings Module

**Files:** `apps/web/app/admin/bookings/page.tsx` + `/[id]/page.tsx`  
**Page title:** "All Bookings"

Queries: bookings (with nested properties + rooms), booking_fees, booking_payments.  
Searchable/filterable by status (Confirmed, Checked in, Checked out, Cancelled) and payment status.

**Restaurant/reservation relevance: NONE.** This is strictly property stay bookings (`bookings` table). The restaurant `reservations` table is entirely separate and has NO admin UI equivalent.

---

### 5. Guests Module

**File:** `apps/web/app/admin/guests/page.tsx`  
Queries: bookings + contact_requests aggregated per guest user.  
**Restaurant/reservation relevance: NONE.**

---

### 6. Listings Module

**File:** `apps/web/app/admin/listings/page.tsx`  
**Page title:** "Listings"

Reads all Sanity listings. Has a type filter that includes "restaurant." Links to Sanity Studio edit or the public listing page. **No links to `/dashboard/listings/[id]` or any reservation management.**

**STALE / STUB.** Shows restaurants but provides zero management capability for the new restaurant features. No reservation status column, no "Open command center" link.

---

### 7. Other Modules (No Restaurant Relevance)

| Page | Purpose | Tables |
|---|---|---|
| `/admin/contact-requests` | Inbound contact form submissions | contact_requests |
| `/admin/general-contacts` | General platform contact messages | general_contacts |
| `/admin/property-enquiries` | Stay property enquiries | property_enquiries |
| `/admin/listing-requests` | New listing applications | listing_requests |
| `/admin/claims` | Listing verification/ownership claims | claim_requests |
| `/admin/events` | Event submission review | events_pending |
| `/admin/ambassadors` | Ambassador program applications | ambassador_applications |
| `/admin/analytics` | Platform-wide listing view analytics | listing_events |
| `/admin/real-estate` | Real estate property listings (Sanity) | Sanity |
| `/admin/newsletter` | Newsletter subscriber management | newsletter_subscribers |
| `/admin/settings` | Service status, webhook config | env vars only |

None of these touch restaurants, menus, reservations, or the new schema tables.

---

### 8. Admin UI Patterns

**Entity index pages:** Table (paginated) with search/filter and row-level "View →" link. Standard pattern across bookings, guests, hosts, claims.

**Entity detail pages:** Info card at top, nested related entities below, action buttons or API calls for status changes.

**Shared component reuse:** Admin menu editor reuses `MenuBuilder` directly — same component as owner dashboard. This is the only case of shared UI between admin and owner surfaces.

**Admin chrome:** All admin pages render inside the layout with the sidebar nav. No "admin banner" or visual marker on pages that admin reaches via the owner flow.

**Authentication:** Middleware enforces `role === "admin"` at the edge for all `/admin/*` routes. Individual pages don't re-check role (rely on middleware).

---

### 9. Gap Analysis

#### Blocker — Admin cannot reach the listing command center at all

The listing command center at `/dashboard/listings/[id]` (reservations dashboard, areas CRUD, booking rules, ordering tables, bookable hours) is completely unreachable from the admin panel. The only path from admin to a restaurant is `/admin/hosts/[id]/menu/[menuId]` which shows only the menu builder. No bypass exists yet in `dashboard/listings/[id]/layout.tsx` (the Sanity ownership query returns notFound() for admin).

#### Blocker — No platform-wide reservations dashboard

The admin `bookings` module covers property stays only. There is no `/admin/reservations` equivalent for restaurant table reservations. Admin has no visibility into pending/confirmed/cancelled reservations across all restaurants without navigating into each one individually.

#### Stale — Admin menu editor missing reservation config

`/admin/hosts/[id]/menu/[menuId]` fetches menus but ignores all new columns (`reservations_enabled` status, duration, lead time, party size, advance days). The MenuBuilder toggle exists but the link to full reservation config is suppressed because `listingId` is not passed as a prop. An admin enabling reservations from this page has no way to configure the settings.

#### Stale — Listings page has no reservation status

`/admin/listings` shows all restaurants but no column for `reservations_enabled`. An admin trying to understand which restaurants have reservations active must check each one individually.

#### Stale — Host detail page has no reservation badge

`/admin/hosts/[id]` shows menu cards but no indicator of whether reservations are turned on. Admin needs to click into the menu editor to find out.

#### Nice-to-have — Dashboard has no reservation metrics

Admin dashboard home shows stay booking counts but nothing for restaurant reservations. Adding a "Pending reservations this week" stat card would give platform-level visibility.

---

### 10. Architecture Recommendation

**Recommendation: Deep-link (hybrid) approach.**

The admin panel already reuses owner components (MenuBuilder) rather than building parallel UI. The stays Bookings module is admin-native because admins genuinely need cross-property booking views — that use case doesn't translate to restaurant reservations at V1 scale. The right split:

**(a) Deep-link for individual restaurant management.**  
Add admin bypass to `layout.tsx` + `reservations/page.tsx` (per Prompt 10.5 recommendation). Admin navigates: `/admin/hosts/[id]` → "Open listing dashboard" link → `/dashboard/listings/[id]` with bypass active + admin banner. Admin sees and edits everything the owner sees using the same UI. Zero duplication.

**(b) Add two admin-native cross-restaurant pages where admin needs platform views:**
1. **`/admin/reservations`** — all reservations across all restaurants, filterable by status/date/restaurant. Same pattern as `/admin/bookings`. Add nav badge for pending reservations.
2. **Enrich `/admin/listings`** — add `reservations_enabled` status column and "Open command center" link per restaurant row.

**(c) Fix the broken listingId prop in admin menu editor.**  
Pass `listingId` to `MenuBuilder` in `/admin/hosts/[id]/menu/[menuId]` so the "Configure full reservation settings" link appears for admins. One-line fix.

This hybrid gives admin full depth (via deep-link) and breadth (via the new reservations index page) without duplicating any of the owner-facing management UI.

