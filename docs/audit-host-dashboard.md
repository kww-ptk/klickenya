# Audit — Host Dashboard (POV: a logged-in host)

> Status: **Audit only — no fixes applied.** Written 2026-06-23.
> Scope: every page under `/dashboard/*` a host can reach — auth/ownership guards,
> empty states, broken/unclear flows, missing loading states, navigation.
> Method: **code-level audit** (read each page's real logic) + structure scan.
> Live click-through wasn't possible: the test host account is Google-only (no
> password) so the headless preview browser can't hold a host session, and
> authenticated routes redirect/431 without one. Findings are from the source.

Severity: 🔴 broken / security · 🟠 confusing or inconsistent · 🟡 polish.

Companion to [audit-auth-roles-listings.md](./audit-auth-roles-listings.md)
(some items overlap and are cross-referenced).

---

## TL;DR
The host dashboard is mostly well-guarded (most pages check auth + ownership and
have empty states), but there are **two real security/ownership gaps**, a
**fragmented enquiry experience**, and broad **missing loading-state coverage**.

Route count: **46 pages**, **11 loading.tsx** skeletons, **9 nav items**.

---

## 🔴 Security / ownership

### HD-1 — IDOR / PII leak on `/dashboard/enquiries/[id]`
The enquiry detail page fetches the row by id with the **service-role** client
(no owner filter), then only checks ownership **if a Sanity listing is linked**:
```ts
const { data: request } = await adminClient.from("contact_requests")
  .select("*").eq("id", id).single();          // any enquiry, by id
...
if (request.listing_sanity_id) {               // ← guard is CONDITIONAL
  const ownerCheck = await sanityClient.fetch(...);
  if (!ownerCheck) redirect("/dashboard/enquiries");
}
```
([enquiries/[id]/page.tsx:27-57](../apps/web/app/dashboard/enquiries/[id]/page.tsx))

When `listing_sanity_id` is **null**, the ownership check is **skipped entirely**,
so **any logged-in host can open the enquiry by URL** and read the guest's name,
email, phone, and message. Booking enquiries from **PMS-only properties** (e.g.
Seven Island, where no Sanity listing is linked) are created with
`listing_sanity_id = null` (see `/api/properties/booking-enquiry`), so they are
exactly the records left unprotected. **Fix direction:** gate on the property's
`owner_id` (Supabase) when there's no Sanity listing, and `notFound()`/redirect by
default if neither ownership check passes.

### HD-2 — `property/[id]/settings` ownership relies entirely on RLS
The settings page is a client component that loads the property with the **anon**
client and **no owner filter**:
```ts
supabase.from("properties").select("*").eq("id", id).single()
```
([property/[id]/settings/page.tsx:175-191](../apps/web/app/dashboard/property/[id]/settings/page.tsx))
Room reads/writes are likewise `supabase.from("rooms")…eq("id", roomId)` with no
explicit owner scoping. This is **safe only if RLS on `properties`/`rooms`
restricts rows to the owner.** If those policies are missing or permissive, a host
can load and edit another host's property by changing the `[id]` in the URL.
**Action:** verify RLS enforces owner-scoping on `properties` and `rooms` for the
anon role; if not, this is an IDOR. (Contrast: [property/[id]/page.tsx:23-31]
(../apps/web/app/dashboard/property/[id]/page.tsx) *does* filter by `owner_id`.)

---

## 🟠 Broken / unclear flows

### HD-3 — Two separate enquiry inboxes; embed/PMS enquiries vanish from the main tab
The dashboard **Enquiries** list only shows enquiries whose `listing_sanity_id`
is in the host's Sanity listing ids:
```ts
query.in("listing_sanity_id", listingIds)
```
([enquiries/page.tsx:42-57](../apps/web/app/dashboard/enquiries/page.tsx))
So enquiries with `listing_sanity_id = null` — i.e. **booking enquiries from the
embed / PMS-only properties** — **never appear in the main Enquiries tab.** They
land in a *separate* inbox under **Property PMS → Enquiries**
(`/api/properties/enquiries`). A host who checks only the top-level "Enquiries"
nav will **miss booking enquiries** (e.g. the Seven Island embed test). Two
disconnected inboxes for the same concept = confusing and a missed-lead risk.

### HD-4 — Listing hub is restaurant-only (no hub for stays/experiences/events)
`/dashboard/listings/[id]` requires the listing to be a restaurant:
```groq
*[_id == $id && (type == "restaurant" || subcategory == "restaurants") && (hostId == $userId || ...)]
```
([listings/[id]/page.tsx:46-56](../apps/web/app/dashboard/listings/[id]/page.tsx))
and the "My Listings" card only shows **"Open dashboard"** for restaurants. So a
host with a **stay/experience/event** listing has **no management hub** — they can
only "View listing" (the public page). This matches **H-2** in the other audit
(no host-side listing management for non-restaurants).

---

## 🟠 UX / consistency

### HD-5 — Missing `loading.tsx` on ~35 of 46 routes
CLAUDE.md: *"Every feature needs a nav entry + loading.tsx skeleton."* Only 11
routes have one. Notable pages **without** a loading skeleton: `settings`,
`profile/edit`, `menus`, `property/new`, `property/[id]/settings`,
`property/calendar`, `events/new`, `enquiries/[id]`, `listings/[id]` and all its
sub-routes, and the **entire** `menu/[id]/stock/**` tree (ingredients, movements,
purchases, suppliers, reference-prices, and all 6 reports). On slower connections
these flash blank instead of a skeleton.

### HD-6 — Navigation exceeds the stated limit
CLAUDE.md: *"Dashboard rule: max 5 nav items. Keep it tight."* The sidebar has
**9**: Dashboard, My Listings, Property PMS, Menu, Stats, My Events, Enquiries,
Edit Profile, Settings. Either the rule is stale or the nav needs grouping.

### HD-7 — Guest pages live inside the host dashboard tree
`/dashboard/guest/bookings` and `/dashboard/guest/enquiries` exist under the
**host** dashboard route group. Guest-facing content nested in the host tree is an
odd placement and an unclear flow (guests have `/profile`). Worth confirming
who/what reaches these and whether they belong here.

### HD-8 — (Resolved) No "create listing" entry in the dashboard
Previously there was no way to reach `/list` from the dashboard. **Already fixed**
on `fix/auth-roles-listings` (F-5/H-1): "List your business" button added to My
Listings. Listed here for completeness.

---

## What's solid (acknowledged)
- Most nav pages guard correctly: `dashboard`, `stats`, `enquiries` (list),
  `events`, `menus`, `profile/edit` all check `getAuthUser` + `getHostProfile`
  and redirect appropriately, with proper empty states ("No … yet").
- Ownership is correctly enforced on `property/[id]` (owner_id),
  `listings/[id]` (Sanity hostId), `menu/[id]` (business_id), and
  `events/[id]/attendees` (host_id) — good patterns to copy for HD-1/HD-2.
- The `/dashboard` home and "My Listings" empty states are clear.

---

## Suggested priority (when fixes are greenlit)
1. **HD-1** — close the enquiry IDOR/PII leak (gate on property `owner_id` when no
   Sanity listing; default-deny).
2. **HD-2** — verify/repair RLS for `properties`/`rooms` (or add explicit owner
   checks in the settings page + its APIs).
3. **HD-3** — unify the two enquiry inboxes (or at least surface PMS/booking
   enquiries in the main Enquiries tab).
4. **HD-4** — host management hub for non-restaurant listings (ties to H-2).
5. **HD-5/6/7** — loading skeletons, nav grouping, relocate guest pages.

*(No code changed. This file is the audit deliverable only.)*
