# Restaurant Feature Map — Klickenya
_Audit date: 2026-05-10. Source of truth: codebase under `apps/web/` and `supabase/migrations/`. Migration count: 069. Read ahead of redesigning the owner setup flow._

Status legend: **shipped** = UI + API + DB all present and wired · **partial** = some layers missing (called out) · **scaffolded** = DB or stub UI only · **planned** = nothing in code beyond a coming-soon card.

---

## Section 1 — Feature inventory

| # | Feature (owner label) | Description | Status | Controlling flag / table | Owner page | Public/customer page | File evidence |
|---|---|---|---|---|---|---|---|
| 1 | Listing claim | Claim a scraped listing via 4-step OTP flow → seeds an empty `menus` row for restaurants. | shipped | `claim_requests`, `menus.business_id`, Sanity `verificationStatus` | `/claim/[slug]` | n/a | `apps/web/app/api/claim/initiate/route.ts`, `apps/web/app/api/claim/verify/route.ts:117-153` (auto-seeds menu), `supabase/migrations/014_claim_requests.sql` |
| 2 | Digital menu (browse-only) | Customer scans QR → reads sections + items + dietary tags + photos. No ordering. | shipped | `menus.is_published` | `/dashboard/menu/[id]` | `/m/[slug]` | `apps/web/app/m/[slug]/page.tsx:36-122`, `apps/web/components/menu/MenuWithFilters.tsx`, `supabase/migrations/028_menu_system.sql` |
| 3 | Menu builder (sections / items / options) | CRUD for sections, items (price, dietary tags, photos), option groups (size / extras / allergy). | shipped | `menu_sections`, `menu_items`, `item_option_groups`, `item_options` | `/dashboard/menu/[id]`, `/dashboard/menu/[id]/items/[itemId]` | n/a | `apps/web/app/api/menu/sections/route.ts`, `apps/web/app/api/menu/items/route.ts`, `apps/web/app/api/menu/options/route.ts`, `supabase/migrations/045_pos_foundation.sql` |
| 4 | Item photos | Upload per-item photos via Supabase storage bucket `menu-photos`. | shipped | `menu_items.photo_url` + `menu-photos` bucket | item editor | shown on `/m/[slug]` | `supabase/migrations/030_menu_photos_bucket.sql`, `apps/web/app/api/menu/upload/route.ts` |
| 5 | Menu CSV import | Owners paste/upload a CSV to bulk-create sections + items. | shipped | `menus` rows | `/dashboard/menu/[id]` (button) | n/a | `apps/web/app/api/menu/import/route.ts` |
| 6 | QR codes per table | Generate a downloadable PNG of `klickenya.com/m/[slug]?table=T1` for each `restaurant_tables` row. | shipped | `restaurant_tables` | `/dashboard/menu/[id]/qr` | scanned to `/m/[slug]` | `apps/web/app/dashboard/menu/[id]/qr/page.tsx`, `apps/web/components/dashboard/menu/QRDownload.tsx`, `supabase/migrations/045_pos_foundation.sql` |
| 7 | Scan tracking | Records anonymous scan pings per menu to `menu_scans`. | shipped | `menu_scans` | (analytics surfaced on `/dashboard/menu/[id]`) | `/m/[slug]` (pixel) | `apps/web/app/api/menu/scans/route.ts`, `apps/web/components/menu/ScanTracker.tsx`, migration 028 |
| 8 | Table ordering (QR → kitchen) | Guest builds a cart from `/m/[slug]?table=T1`, places order, kitchen sees it on dashboard. No payment — pay at table. | shipped | `menus.table_ordering` (the live flag) | `/dashboard/menu/[id]` (toggle), `/dashboard/menu/[id]/orders` (kitchen view), `/dashboard/listings/[id]/orders` (table setup) | `/m/[slug]` (cart appears) | `apps/web/app/api/orders/route.ts`, `apps/web/app/api/menu/orders/route.ts`, `apps/web/components/menu/MenuWithCart.tsx`, `apps/web/app/m/[slug]/page.tsx:107-119`, migration 043 |
| 9 | Restaurant tables / floor sections | CRUD for tables, capacity, floor section, drag-to-position floor map (`pos_x`, `pos_y` 0–100%). | shipped | `restaurant_tables` | `/dashboard/listings/[id]/orders` | n/a | `apps/web/app/dashboard/listings/[id]/orders/TableOrderingClient.tsx`, `apps/web/app/api/menu/tables/route.ts`, `supabase/migrations/067_floor_map_position_constraints.sql` |
| 10 | Table reservations (real system) | Time-window-bookable form with party size, area preference, lead-time + max-advance enforcement, owner approve/decline, email notification to host. | shipped | `menus.reservations_enabled` + `reservations` + `reservation_time_windows` + `restaurant_areas` | `/dashboard/listings/[id]/reservations` | `/m/[slug]` (Book button) and listing-page `BookingSidebar` | `apps/web/app/api/menu/reservations/route.ts:136-338`, `apps/web/components/reservations/ReservationSheet.tsx`, `apps/web/components/reservations/ReservationInline.tsx`, `apps/web/components/listings/widgets/BookingSidebar.tsx:24-48`, migrations 049/051/052/053 |
| 11 | Reservation time windows | Multiple lunch / dinner slots per menu (open / close / label), used to validate booking time. | shipped | `reservation_time_windows` | reservations dashboard (windows tab) | enforced server-side in POST `/api/menu/reservations` | `apps/web/app/api/menu/time-windows/route.ts`, `supabase/migrations/053_reservation_time_windows.sql` |
| 12 | Restaurant areas (indoor / terrace / bar) | Reservations can target an area; floor map groups tables by area. | shipped | `restaurant_areas` | reservations dashboard, floor-map editor | area selector in `ReservationSheet` | `apps/web/app/api/menu/areas/route.ts`, migration 049 |
| 13 | POS terminal | PIN-authed staff sign-in, table grid, order entry, ready-orders queue, session detail, bill panel (subtotal/service charge/discount/split), receipt PDF + email. | shipped | `restaurant_staff`, `table_sessions`, `pos_audit_log`; `menus.default_service_charge_pct` | `/dashboard/listings/[id]/pos` (staff/PIN setup), `/pos/[slug]` (terminal) | n/a (staff-only) | `apps/web/app/pos/[slug]/page.tsx`, `apps/web/app/api/pos/auth/route.ts`, `apps/web/app/api/pos/orders/route.ts`, `apps/web/components/pos/PosBillPanel.tsx`, `apps/web/app/api/menu/sessions/[id]/receipt/route.ts`, migrations 045/054/056 |
| 14 | Manager overrides + audit log | Sensitive actions (void item, cancel order) require manager PIN; logged to `pos_audit_log`. | shipped | `pos_audit_log`, `order_items.void_at` | `/dashboard/menu/[id]/audit` | n/a | `apps/web/components/pos/ManagerOverridePrompt.tsx`, `apps/web/app/api/menu/order-items/[id]/route.ts`, migrations 058 / 059 |
| 15 | Kitchen display screen | Per-listing kitchen screen showing live tickets with status transitions (new → preparing → ready → delivered/cancelled). | shipped | `orders.status` | `/dashboard/menu/[id]/orders` (web), `/kitchen/[slug]` (full-screen) | n/a | `apps/web/app/kitchen/[slug]/orders/`, `apps/web/app/dashboard/menu/[id]/orders/page.tsx`, `apps/web/app/api/menu/orders/route.ts`, migration 055 (realtime publication) |
| 16 | Klickenya Kitchen — ingredients & suppliers | CRUD for ingredients (unit, on-hand, low-stock threshold, yield %, cost), suppliers, reference prices. | shipped | `ingredients`, `suppliers`, `business_po_counters` | `/dashboard/menu/[id]/stock/ingredients`, `…/suppliers`, `…/reference-prices` | n/a | migration 060, `apps/web/app/dashboard/menu/[id]/stock/ingredients/page.tsx`, `…/reference-prices/ReferencePricesClient.tsx` |
| 17 | Klickenya Kitchen — recipes & costing | Each `menu_item` can have a recipe (`recipe_ingredients` with `qty`, `ep_qty`, `yield_pct`) → drives plate cost / margin. | shipped | `recipes`, `recipe_ingredients` | item editor (`RecipeBuilder.tsx`), `/dashboard/menu/[id]/stock/missing-recipes` | n/a | `apps/web/app/dashboard/menu/[id]/items/[itemId]/RecipeBuilder.tsx`, migration 060 |
| 18 | Klickenya Kitchen — purchase orders | Draft → sent → partial → received PO workflow with `qty_received`, atomic `fn_receive_purchase_order` RPC, per-business `po_number` (PO-YYYY-NNNN). | shipped | `purchase_orders`, `purchase_order_items`, `business_po_counters` | `/dashboard/menu/[id]/stock/purchases`, `…/purchases/new`, `…/purchases/[poId]` | n/a | migration 061, `apps/web/app/dashboard/menu/[id]/stock/purchases/[poId]/POClient.tsx` |
| 19 | Klickenya Kitchen — stock movements & auto-deduct | Canonical log (`purchase_in` / `recipe_out` / `waste` / `count_adjustment` / `transfer`) with trigger that updates `ingredients.on_hand`. Auto-deduct fires when an order hits `menus.stock_deduct_on` (placed/preparing/ready/paid). | shipped | `stock_movements`, `menus.stock_enabled`, `menus.stock_deduct_on` | `/dashboard/menu/[id]/stock/movements`, `…/stock` (toggle) | n/a | migrations 060 / 062, `apps/web/app/dashboard/menu/[id]/stock/StockEnableButton.tsx` |
| 20 | Klickenya Kitchen — reports | Live stock, margin per dish, variance, supplier prices, dead inventory, missing recipes. | shipped | views/queries over kitchen tables | `/dashboard/menu/[id]/stock/reports/*` | n/a | migrations 063 / 064 / 065 / 066, `apps/web/app/dashboard/menu/[id]/stock/reports/**` |
| 21 | Featured items | Mark menu items as featured. | shipped | `menu_items.is_featured` (migration 048) | item editor | rendered on `/m/[slug]` | `supabase/migrations/048_featured_items.sql`, `apps/web/components/menu/ItemModal.tsx` |
| 22 | Listing-page reservation widget | On `/restaurants/[city]/[slug]` the booking sidebar shows `ReservationInline` if `reservations_enabled`, otherwise a contact/enquiry form. | shipped | `menus.reservations_enabled` (read), `contact_requests` (fallback) | n/a | `/restaurants/[city]/[slug]` | `apps/web/components/listings/widgets/BookingSidebar.tsx:24-48`, `apps/web/components/listings/widgets/MobileBookingBar.tsx` |
| 23 | Receipt email / PDF | Generate session receipt as JSON or PDF, email it to a customer. | shipped | `table_sessions.receipt_url`, `receipt_sent_at`, `receipt_sent_to` | POS bill panel | emailed to guest | `apps/web/app/api/menu/sessions/[id]/receipt/route.ts`, `…/receipt.pdf/route.ts`, `…/receipt/send/route.ts`, migration 056 |
| 24 | Service charge & bill discount / split | Per-menu default service charge %, per-session discount amount, bill notes, split count (1–20). | shipped | `menus.default_service_charge_pct`, `table_sessions.service_charge_pct/discount_amount_kes/bill_notes/split_count` | POS terminal | n/a | migrations 054 / 056, `apps/web/components/pos/PosBillPanel.tsx` |
| 25 | M-Pesa payment on bill | Schema columns exist on orders + sessions; **no STK-push integration, no callback route, no PSP env var wired**. | scaffolded | `orders.mpesa_ref`, `table_sessions.mpesa_ref`, `payment_method` | n/a | n/a | migrations 043 / 045; no file in `apps/web/app/api/**` references Daraja, STK, or Safaricom |
| 26 | Takeaway orders | Coming-soon card; flag exists, no order surface, no pickup-time UI. | planned | `menus.takeaway_enabled` (read but never written outside seed) | n/a (locked card) | n/a | `apps/web/app/dashboard/listings/[id]/_lib/features.config.ts:71-78` (`getStatus: () => 'coming_soon'`), migration 028 |
| 27 | Food delivery | Coming-soon card; columns exist for radius / fee / min order; no rider, address, or dispatch code. | planned | `menus.delivery_enabled`, `delivery_radius_km`, `delivery_fee_kes`, `min_order_kes`; `orders.delivery_address/lat/lng` | n/a (locked card) | n/a | `…/features.config.ts:80-87`, migrations 028 / 043 |
| 28 | Reservation deposits | Columns dormant, no Resend/M-Pesa hookup, no UI. | scaffolded | `menus.reservations_require_deposit`, `reservations_deposit_amount_kes`; `reservations.deposit_*` | n/a | n/a | migration 049 (commented as V2/V3); zero references in `apps/web/**` |
| 29 | Reservation auto-approve | Column exists, no logic. | scaffolded | `menus.reservations_auto_approve` | n/a | n/a | migration 049; only insert path uses `status: "pending"` (`api/menu/reservations/route.ts:299`) |
| 30 | Reservation slots (per-day capacity) | Table created (V2 plan). Not used by any route or UI. | scaffolded | `reservation_slots` | n/a | n/a | migration 049, no readers in code |
| 31 | Check-in / no-show / completed flow | `status` enum supports `checked_in`, `no_show`, `completed`; UI only flips between `pending`/`approved`/`declined`/`cancelled`. PATCH route accepts the others but no surface drives them. | partial (UI missing) | `reservations.status`, dormant `checked_in_at`, `completed_at` | `/dashboard/listings/[id]/reservations` (only approve/decline buttons) | n/a | `apps/web/app/api/menu/reservations/route.ts:392`, `apps/web/components/dashboard/listings/ReservationsDashboard.tsx` |
| 32 | `ordering_enabled` flag (legacy) | Read in 7 places, only ever **written `false`** in the menu-create / claim-verify / admin-assign seed paths. The actual switch users flip is `table_ordering`. | dead (DB-only) | `menus.ordering_enabled` | none — no toggle in UI | none | grep results: read in `lib/cache/menu.ts:177-190`, `_lib/features.config.ts:10`, `dashboard/listings/[id]/page.tsx:69-83`, `…/layout.tsx:107-133`, `…/features/page.tsx:72-86`; only written by `api/menu/create/route.ts:46`, `api/claim/verify/route.ts:146`, `api/admin/hosts/[id]/assign/route.ts:113` |
| 33 | Featured / coming-soon "ordering" lock-out | The features grid surfaces `takeaway` and `delivery` as `coming_soon` cards (lock icon, no link). | shipped UX, planned feature | per `features.config.ts` | `/dashboard/listings/[id]/features` | n/a | `apps/web/app/dashboard/listings/[id]/features/page.tsx` |

---

## Section 2 — Dependency graph

Preconditions are taken from real guards in the code (DB constraints, `redirect()` calls, `if (!menu.X)` checks in routes), not assumed.

- **Listing claim** requires: a Sanity listing exists (`*[_id == $id]`), claimant has working email for OTP. _Source: `api/claim/initiate/route.ts`._
- **Digital menu (browse)** requires: listing claimed (auto-seeds `menus` row keyed on `listing_slug`), `menus.is_published = true`, at least one `menu_section` with `is_visible=true`, and at least one `menu_item` (otherwise `/m/[slug]` 404s — `app/m/[slug]/page.tsx:181`).
- **Menu builder** requires: a `menus` row owned by `business_id = user.id` (auto-created on claim verify for restaurants, line 138-149).
- **Item photos** requires: menu builder + Supabase storage bucket present (migration 030).
- **CSV import** requires: a `menus` row.
- **QR codes per table** requires: at least one `restaurant_tables` row (otherwise QR page renders empty).
- **Scan tracking** requires: published menu.
- **Table ordering (QR → kitchen)** requires: published menu, `menus.table_ordering = true`, at least one `menu_item` with `is_available = true`, at least one `restaurant_tables` row (cart's table dropdown is fed by `is_active` tables — `app/m/[slug]/page.tsx:106-119`). Disabling the toggle is blocked while there are open orders (`api/menu/settings/route.ts:233`).
- **Restaurant tables / floor sections** requires: a `menus` row (FK).
- **Table reservations** requires: published menu, `menus.reservations_enabled = true`, at least one `reservation_time_windows` row with `is_active = true` for any non-trivial bookable hours (otherwise the route falls through to a permissive "no windows configured" mode at `api/menu/reservations/route.ts:243-269` — i.e. anything goes, which is almost certainly not what an owner wants), party size ≤ `reservations_max_party_size`, request ≥ `reservations_lead_time_hours` ahead and ≤ `reservations_max_advance_days` ahead.
- **Reservation time windows** requires: a `menus` row.
- **Restaurant areas** requires: a `menus` row.
- **POS terminal** requires: `menus.table_ordering = true` (POS routes assume order pipeline is on; `pos/auth/route.ts` selects `table_ordering`), at least one `restaurant_staff` row with a PIN, at least one `restaurant_tables` row to assign sessions to, ideally `default_service_charge_pct` set on the menu.
- **Manager overrides + audit log** requires: at least one `restaurant_staff` row with `role='manager'`.
- **Kitchen display screen** requires: table ordering active (or POS active) so that `orders` rows exist; Realtime publication enabled (migration 055).
- **Klickenya Kitchen — ingredients & suppliers** requires: `menus.stock_enabled = true` (the toggle gates the nav entry; underlying tables are scoped by `business_id`).
- **Klickenya Kitchen — recipes & costing** requires: at least one `menu_item`, at least one `ingredient`.
- **Klickenya Kitchen — purchase orders** requires: at least one `supplier`, at least one `ingredient`.
- **Klickenya Kitchen — stock movements & auto-deduct** requires: `stock_enabled = true`, recipes for items so `recipe_out` movements can compute, a sensible value for `stock_deduct_on`.
- **Klickenya Kitchen — reports** requires: at least one `stock_movements` row to populate the views meaningfully.
- **Featured items** requires: a `menu_item`.
- **Listing-page reservation widget** requires: `menus.reservations_enabled = true` AND a Sanity listing matching `menus.listing_slug` (otherwise the contact/enquiry form renders).
- **Receipt email / PDF** requires: a closed `table_sessions` row with totals; guest email entered at the bill stage.
- **Service charge & bill discount / split** requires: an open `table_sessions` row.
- **M-Pesa payment on bill** requires: scaffolded only — would need PSP credentials, callback route, KYC fields. Not buildable from current code without new env + new routes.
- **Takeaway / Food delivery / Reservation deposits / Auto-approve / Reservation slots / Check-in flow** are scaffolded or planned — no preconditions to list because no enabling surface exists.

---

## Section 3 — Proposed owner setup flow

Sequence assumes the owner has just verified the OTP at `/claim/[slug]/success` and is dropped onto a setup checklist. Each step toggles exactly one DB column or creates one row type. Hard dependencies always come earlier in the sequence.

### Step 0 — Pre-step: claim verification (already happens)
Triggers: row inserted into `claim_requests` (`status='verified'`); empty `menus` row auto-seeded (`api/claim/verify/route.ts:138-149`); Sanity listing patched (`verificationStatus: "claimed"`).

### Step 1 — "Build your menu first"
- **Question**: _"Ready to build your menu? You'll add sections (e.g. Starters), then dishes with prices and photos."_ (Yes only — this is the gate to everything below.)
- **Sets**: nothing yet — just navigates.
- **If yes**: lands on `/dashboard/menu/[id]` with the section/item editor open.
- **If no**: skipped; banner on dashboard "Add at least one dish before turning on ordering or reservations." Other steps stay locked.
- **Done when**: at least one `menu_section` with one `menu_item`. Then a "Publish menu" CTA appears.

### Step 2 — "Make your menu live"
- **Question**: _"Publish your menu so guests can see it on klickenya.com?"_
- **Sets**: `menus.is_published = true` via `POST /api/menu/publish`.
- **If yes**: confirmation toast + the QR code page link surfaces.
- **If no**: skipped; menu stays in draft, `/m/[slug]` 404s.

### Step 3 — "Do you take table reservations?"
_(Comes before table ordering on purpose: many restaurants want bookings even if they never want QR ordering.)_
- **Question**: _"Will guests be able to book a table at your restaurant through Klickenya?"_
- **Sets**: `menus.reservations_enabled = true` via `PATCH /api/menu/settings`.
- **If yes**: lands on `/dashboard/listings/[id]/reservations` with three sub-prompts:
  - 3a. _"What hours can people book?"_ → creates rows in `reservation_time_windows` (e.g. Lunch 12:00-15:00, Dinner 18:30-22:30). At least one active window required, otherwise the booking validator silently allows any time (gap — see Section 4).
  - 3b. _"What's the largest party you accept?"_ → `menus.reservations_max_party_size`.
  - 3c. _"How many hours notice do you need? How far ahead can people book?"_ → `reservations_lead_time_hours`, `reservations_max_advance_days`.
  - 3d. _(Optional)_ "Have separate areas like terrace or bar?" → creates `restaurant_areas` rows.
- **If no**: skipped; listing-page widget falls back to a generic enquiry form (`BookingSidebar.tsx:48-…`).

### Step 4 — "Do you want guests to order from their table via QR?"
- **Question**: _"Should guests scan a QR at their table and order from their phone, with the order going straight to your kitchen?"_
- **Sets**: `menus.table_ordering = true` via `PATCH /api/menu/settings`.
- **If yes**: prompts a sub-question 4a. _"Add the tables in your dining room"_ → lands on `/dashboard/listings/[id]/orders` to create `restaurant_tables` rows. Then offers QR download (`/dashboard/menu/[id]/qr`).
- **If no**: skipped; `MenuWithFilters` (browse-only) renders on `/m/[slug]`.
- **Note**: disabling later is blocked while open orders exist (`api/menu/settings/route.ts:233`).

### Step 5 — "Do you want a POS terminal for staff?"
_(Only offered if Step 4 = yes.)_
- **Question**: _"Want a tablet checkout your waiters use for table-side orders, bills, splits, and receipts?"_
- **Sets**: nothing on `menus` directly. Creates rows in `restaurant_staff` (PIN-protected) and optionally a `default_service_charge_pct` on the menu.
- **If yes**: lands on `/dashboard/listings/[id]/pos` to add staff (waiter, manager, cashier, kitchen) and copy the `/pos/[slug]` sign-in URL. Sub-prompt 5a. _"What service charge do you add?"_ → `menus.default_service_charge_pct`.
- **If no**: skipped; the kitchen still gets QR orders on `/dashboard/menu/[id]/orders`.

### Step 6 — "Do you want a floor map?"
_(Only offered if Step 5 = yes — POS uses the floor view; without POS the floor map is purely cosmetic.)_
- **Question**: _"Want to drag your tables onto a floor plan so waiters see exactly which table needs them?"_
- **Sets**: per-table `pos_x`, `pos_y` (0-100%) within an area.
- **If yes**: lands on the floor-map editor inside `/dashboard/listings/[id]/orders`.
- **If no**: skipped; POS shows a simple grid.

### Step 7 — "Do you want to track stock and food cost?"
- **Question**: _"Track ingredients, recipes, and food cost per dish? Stock will deduct automatically when orders fire."_
- **Sets**: `menus.stock_enabled = true` and `menus.stock_deduct_on` (default `'preparing'`).
- **If yes**: lands on `/dashboard/menu/[id]/stock` — guides through:
  - 7a. Add ingredients with cost & unit (`ingredients`).
  - 7b. Add suppliers (`suppliers`).
  - 7c. Build recipes for each menu item (link from the item editor; `recipes`, `recipe_ingredients`).
  - 7d. Confirm "Deduct stock when order is _placed / preparing / ready / paid_" → `stock_deduct_on`.
- **If no**: skipped; reports + auto-deduct stay dormant. Banner on dashboard "Track food cost — see margin per dish" can resurface later.

### Step 8 — "Do you take takeaway orders?" — **NOT YET BUILDABLE**
- **Question text drafted**, but the toggle is locked. Surface as `coming_soon`. No database write. Capture interest with a simple `interested_takeaway` flag in a follow-up CRM table if needed.

### Step 9 — "Do you take delivery orders?" — **NOT YET BUILDABLE**
- Same as Step 8. Locked card.

### Step 10 — "Accept M-Pesa for bills?" — **NOT YET BUILDABLE**
- Schema is there (`mpesa_ref`, `payment_method`) but no STK-push code. Surface as locked.

### Recommended ordering rationale
Sections 4 → 5 → 6 are nested because POS reads `table_ordering`, and the floor map only earns its keep with POS. Section 3 (reservations) is independent — many owners will be a "yes" here and a "no" on Section 4. Section 7 sits last among shipped features because it requires items already exist (Step 1) and ideally a stream of orders to make reports interesting.

---

## Section 4 — Gaps

Anything the proposed flow needs that isn't fully built.

| Gap | What's missing | What happens today | Scope |
|---|---|---|---|
| **A. Setup checklist UI itself** | No post-claim onboarding wizard exists. The features tile-grid at `/dashboard/listings/[id]/features` is a read-only preview ("Add-on management coming soon" callout — `features/page.tsx:111-121`). Owners must navigate by hand to find the right toggle. | Owner lands on `/dashboard/listings/[id]` with stat tiles and figures it out via the menu builder's right-side publish panel. | medium |
| **B. Permissive-fallback in reservation hours** | `api/menu/reservations/route.ts:269` — _"If no active windows configured, skip the check (permissive fallback)"_. An owner who flips `reservations_enabled` on without configuring `reservation_time_windows` accepts bookings 24/7. | Bookings come in for 03:00 because no one ever set Lunch / Dinner. | small (require ≥1 active window or refuse) |
| **C. "List your table" on the listing page when reservations off** | When `reservations_enabled = false`, the listing-page sidebar shows a generic contact form (`BookingSidebar.tsx:48-…`). It's labelled as a contact form, not "Reserve a table". | Owner who hasn't enabled reservations gets unrelated enquiries via `contact_requests`. | small (copy + routing tweak) |
| **D. `ordering_enabled` is dead** | Read in 7 files (`lib/cache/menu.ts:177`, `features.config.ts:10`, `dashboard/listings/[id]/{page,layout,features}.tsx`, `_lib/features.config.ts`) but only ever written `false` in seed paths. The actual switch is `table_ordering`. | Confusing for any next dev. Two flags, one job. | small (drop the column or use it as the umbrella for `table_ordering ∨ takeaway_enabled ∨ delivery_enabled`) |
| **E. Reservation status surfaces** | DB enum supports `checked_in / no_show / completed`. Dashboard buttons only do `approved / declined / cancelled`. PATCH route accepts the missing values but nothing calls them. | Owner can't mark a no-show or check someone in, so the analytics carry the "approved → ?" gap forever. | medium (add buttons + per-row state machine in `ReservationsDashboard`) |
| **F. Reservation deposits / auto-approve / per-day capacity slots** | Schema exists (V2/V3 columns in migration 049 and table `reservation_slots`) but no UI, no payment hookup, no capacity logic. | "Sorry we're full" must be done manually by declining. | large (deposits = M-Pesa integration is its own gap; slots = capacity engine; auto-approve = simplest of the three) |
| **G. Takeaway** | No DB writes for takeaway, no `/m/[slug]?mode=takeaway`, no pickup-time picker, no order-status surface for "ready for pickup". | Coming-soon card only. | large |
| **H. Delivery** | Columns exist; no rider entity, no dispatch, no address autocomplete, no live tracking. | Coming-soon card only. | extra-large |
| **I. M-Pesa STK push / Daraja integration** | Columns `mpesa_ref` and `payment_method` exist (migrations 043 / 045). No callback route, no env var, no Safaricom client. POS bill panel collects payment method as text. | Cash / card paid at table; M-Pesa ref typed in by hand. | large (requires Safaricom Daraja onboarding, callback URL whitelisting, idempotency) |
| **J. POS receipt SMS** | Receipt sent by Resend email only. CLAUDE.md notes "WhatsApp wa.me links available as manual fallback" — no SMS provider in env. | Email or copy-paste WhatsApp. | small (one Africa's Talking call) |
| **K. Listing-page → menu link** | `RestaurantDetail.tsx` references `menuData?.table_ordering` (line 103) but the integration to push customers from the city listing into `/m/[slug]` for direct ordering relies on the existing menu tab (`MenuDisplay.tsx`). Verify "Order now" CTAs render when `table_ordering = true`. | Unverified — listing-page ordering CTA may or may not appear correctly when `is_published` and `table_ordering` are both true. | small (verify; possibly nil) |
| **L. Stock-feature first-run UX** | The kitchen feature has many tables but no "set me up" wizard. Owners landing on `/dashboard/menu/[id]/stock` see an empty state and must read the Klickenya Kitchen blog post. | High abandonment risk. | medium |

**On reservations specifically (the question I was asked to be precise about):** Yes, this is a real reservation system. Calendar (timezone-aware Africa/Nairobi), party size, lead time, max-advance, multi-window bookable hours, area selection, status state machine, owner approval dashboard, host email notification — all present and used. It is **not** a generic enquiry form. The only behavioural caveat is gap **B** above (the permissive fallback when no windows are configured) and gap **E** (the half-empty status state machine).

---

## Section 5 — Conflicts, overlaps, dead code

- **`ordering_enabled` vs `table_ordering`** — gap **D**. `table_ordering` is canonical. `ordering_enabled` is queried alongside it in five places (`features.config.ts`, `lib/cache/menu.ts`, `listings/[id]/{page,layout,features}.tsx`) but is never `true` in production data because nothing writes it `true`. Either repurpose it as a top-level "ordering on at all" umbrella (`table OR takeaway OR delivery`) or drop it.
- **`takeaway_enabled` / `delivery_enabled`** — feature flags that read all the way down through the features grid but render only as `coming_soon` cards. The columns are dead until those features ship.
- **`reservation_slots` table** — empty in every codepath except migration 049. Will need schema extension when V2 capacity engine is built.
- **`reservations.table_id`, `session_id`, `slot_id`, `approved_by`, `approved_at`, `checked_in_at`, `completed_at`, `deposit_amount_kes`, `deposit_mpesa_ref`, `deposit_paid_at`** — all dormant; defined in migration 049 with the comment "V2/V3" but no readers. Safe to leave for now.
- **`menus.reservations_open_time` / `reservations_close_time`** — added in 052, then dropped/migrated into `reservation_time_windows` in 053. Migration 053's data backfill is the only thing that ever read those columns.
- **POS `default_payment_method` (none)** — there isn't one, but `table_sessions.payment_method` is free-form text. Inconsistency risk: a manager could type "mpesa", "M-Pesa", "M_PESA". Worth normalising before reports lean on it.
- **`/dashboard/listings/[id]/kitchen`** — exists as a route but redirects to `/dashboard/menu/[id]/stock`. Harmless, but a maintainability smell — pick one URL.
- **`/dashboard/menu/[id]/orders` (kitchen view) vs `/kitchen/[slug]` (full-screen kitchen) vs `/dashboard/listings/[id]/orders` (table setup)** — three URLs, three different surfaces with overlapping nouns. Owners will get confused. Consider renaming "table setup" to `/dashboard/listings/[id]/tables`.
- **`menus.currency`** — present (default `'KES'`) but only KES is used anywhere; no UI to change it. Probably fine.
- **Features-grid "Set up" links** — `setupHrefFor` (`features/page.tsx:208-219`) currently sends both `table_ordering` and `reservations` setup CTAs to `/dashboard/menu/[id]` (the menu builder). When the proposed flow lands, these should split — reservations should jump to `/dashboard/listings/[id]/reservations`, table ordering to `/dashboard/listings/[id]/orders` — so each toggle has a single home.
- **`listing_requests.admin_notes`** — CLAUDE.md flagged this as missing; it's actually present in migration `068_listing_requests_ai_fields.sql:41`. The note in CLAUDE.md is stale.

---

## Section 6 — Migration-to-feature map

| Migration | Adds |
|---|---|
| 005 | Adds `restaurant` listing type to taxonomy. |
| 014 | `claim_requests` — gate for everything restaurant-side. |
| 028 | `menus`, `menu_sections`, `menu_items`, `menu_scans` — V0 menu system + currency/`ordering_enabled`/`table_ordering`/`takeaway_enabled`/`delivery_enabled` flags + delivery cost columns. |
| 029 | `menus.listing_slug`, `display_name` — multi-menu per listing. |
| 030 | `menu-photos` Supabase storage bucket. |
| 043 | `orders`, `order_items` (with snapshots, `mpesa_ref` stub, delivery address stub). |
| 044 | Performance indexes for orders. |
| 045 | `restaurant_tables` (with `pos_x/pos_y`), `table_sessions`, `item_option_groups`, `item_options`. Extends orders/order_items with `table_id`, `table_session_id`, `selected_options`. |
| 048 | `menu_items.is_featured`. |
| 049 | `reservations`, `restaurant_areas`, `reservation_slots` (dormant) + reservations flags on menus. |
| 051 | `reservations.guest_email`. |
| 052 | `menus.reservations_open_time/close_time` (replaced by 053). |
| 053 | `reservation_time_windows` table — multi-window bookable hours. Migrates from 052. |
| 054 | `restaurant_staff` (PIN), activates `table_sessions` totals + `service_charge_pct`, `orders.waiter_id`, `menus.default_service_charge_pct`. |
| 055 | Realtime publication for kitchen / POS. |
| 056 | Bill enhancements: `discount_amount_kes`, `bill_notes`, `split_count`, receipt fields. |
| 057 | Adds `kitchen` role to staff enum. |
| 058 | `pos_audit_log` — manager overrides + audit. |
| 059 | `order_items.void_at`, `voided_by`. |
| 060 | Klickenya Kitchen V0: `menus.stock_enabled` + `stock_deduct_on`, `ingredients`, `recipes`, `recipe_ingredients`, `stock_movements` (+ trigger), `suppliers`, `purchase_orders`, `purchase_order_items`. |
| 061 | PO numbering, `qty_received`, `business_po_counters`, `fn_receive_purchase_order` RPC. |
| 062 | Auto-deduct trigger refinement. |
| 063 | Kitchen reports views/helpers. |
| 064 | Reference prices for ingredients. |
| 065 | Performance indexes for kitchen ops. |
| 066 | Purchase order indexes. |
| 067 | Floor-map `pos_x`/`pos_y` 0-100 CHECK constraints. |
| 068 | `listing_requests` AI fields including `admin_notes`. |
| 069 | `listing_requests` photo fields. |

Gaps on disk: 046, 047, 050 (squashed/never committed — don't reuse).
