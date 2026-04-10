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

