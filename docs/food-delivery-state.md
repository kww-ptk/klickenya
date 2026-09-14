# Food delivery — where it stands
**Last updated: 14 September 2026.** Read this before touching anything under
`/eat`, `/eatklick`, `/tablet`, `/rider` or `/admin/eat`.

This is the state of the delivery programme, not a plan. The plan is
`docs/food-delivery-program-plan.md`; several of its decisions have since been
reversed, and where they have, this document wins.

---

## 1. What exists, end to end

A guest can order, a kitchen can cook it, a rider can carry it, and everyone
can be paid. All of it is live on production.

| Surface | URL | Who gets in |
|---|---|---|
| Food app | `eat.klickenya.com` | anyone |
| Order tracking | `/order/<orderId>` | anyone with the link (the id **is** the credential) |
| SEO hubs | `klickenya.com/eat`, `/eat/<city>` | anyone |
| Owner command center | `klickenya.com/manage` | Supabase login, host or admin |
| **Food Delivery Orders** | `/tablet/<menuSlug>` | 4-digit staff PIN |
| Rider app | `klickenya.com/rider` | rider phone + 4-digit PIN |
| Eat admin | `/admin/eat` | Supabase login, admin |

### The order lifecycle

```
guest orders              → status new      · pickup_code generated (delivery only)
                                            · restaurant EMAILED (notificationEmail1/2, else host email, + ADMIN_EMAIL)
guest "Cancel"            → status cancelled (only while new; POST /api/orders/<id>/cancel)
kitchen "Start preparing" → status preparing · accepted_at · lines cascade · JOB APPEARS TO RIDERS
kitchen "Decline"         → status cancelled · reason shown on the tracking page
rider "Take this job"     →                   rider_accepted_at set (atomic; status must be preparing/ready)
rider "I can't do this"   →                   rider_id cleared (before pickup only) — job back on the list
kitchen "Mark ready"      → status ready    · lines cascade · handover code shown to the kitchen
rider "I have the food"   →                   picked_up_at set (code required; 5 misses lock 15 min)
rider "Delivered" + cash  → status delivered · only from ready, only once · lines cascade
```

**Who may do what.** The status machine lives in `lib/orders/transitions.ts` and
nowhere else: the order PATCH, the item PATCH and the queue button all read it.
The `delivery` role (091) drives the full lifecycle like kitchen/manager/bar.
Once a rider has claimed a delivery, the counter can no longer "Complete" it
(409) — the rider closes it at the door. Every status write carries its
precondition in the UPDATE filter, so a stale screen loses instead of
overwriting. Where a delivery actually is comes from `deliveryStage()` in
`lib/orders/deliveryStage.ts` (waiting · cooking · rider_assigned ·
awaiting_rider · out_for_delivery · delivered · cancelled), and the guest
tracking page reads that, not `status`.

**There is no `out_for_delivery` status, and adding one would be a mistake.**
`063:333` (`mv_dish_margin_30d`) filters `status in ('preparing','ready','delivered')`,
so an order parked in a new status vanishes from margin reports for its whole
time in flight, and `062:256` / `063:125` branch on `delivered` for stock. The
delivery leg is carried by timestamps instead — `rider_accepted_at`,
`picked_up_at`, `delivered_at`. This reverses what the P0 spec proposed.

---

## 2. Migrations added (087–092, all applied)

| # | What |
|---|---|
| 087 | `menus.pos_enabled` — POS becomes a real toggle. Backfilled `true` to preserve behaviour |
| 088 | `riders`, `rider_menus`, and the delivery leg on `orders` |
| 089 | `riders.is_platform` — Klickenya riders who work every delivering restaurant |
| 090 | `orders.pickup_code` — the handover code |
| 091 | `restaurant_staff.role` gains `'delivery'` |
| 092 | commission rates on `menus`, money snapshots on `orders` |
| 093 | drops the anonymous insert policies on `orders`/`order_items` (043); `orders.pickup_attempts` + `pickup_locked_until`; `menus.pos_failed_attempts` + `pos_locked_until`; index on `orders(order_type, created_at)` for the admin; index on `menus(listing_slug)` |

**Next migration number: 094.** Code reading the 093 lock columns does so in
its own small select and tolerates their absence, so a deploy before the
migration degrades to "no lockout", not a 400.

---

## 3. The money model

Two pots, and they are not the same money.

```
Food 2,500 + delivery fee 200 = guest pays 2,700
  restaurant  2,250   food less commission
  rider         160   80% of the delivery fee
  Klickenya     290   250 commission + 40 fee share
```

- **Commission is on the food**: 10% delivery, 7% pickup by default, per
  restaurant, admin-settable at `/admin/eat/restaurants`. Owners cannot set
  their own.
- **The delivery fee is split 80/20 with the rider.** The restaurant has no
  share — they did not carry anything. That split is a platform term, so it
  lives in `lib/orders/money.ts`, not on the menu.
- **Every figure is snapshotted onto the order at placement.** Rates get
  renegotiated; an order settled in March must not move because a rate changed
  in June. Editing an order recomputes from the rate frozen on *that order*.
- Basis points throughout, matching `PLATFORM_TICKET_FEE_BPS`. Complements are
  derived by subtraction, never a second rounding, so the parts always sum to
  the whole. Tested in `lib/orders/__tests__/money.test.ts`.

---

## 4. Things that will bite you

**PostgREST column drift is the recurring failure here.** A missing column
returns 400, `data` reads as `null`, and the UI shows a confident empty state.
It happened three times today. `lib/eat/adminMetrics.ts` now surfaces the query
error as `schemaError` rather than rendering zeros over a live restaurant — copy
that pattern. Better still: put the flag in a shared TypeScript type, which
turns the CLAUDE.md grep rule into a compile error.

**`tsc` cannot see inside a PostgREST query string.** Two invented table names
(`menu_item_options` / `menu_item_option_groups`; the real ones are
`item_options` / `item_option_groups`) compiled, built, and would have failed at
runtime. Run new query strings against the live database before committing.

**A route rename escapes every allowlist keyed on its old prefix.** Renaming
`/kitchen` → `/tablet` silently put the marketplace bottom nav back on a counter
tablet, because `HIDDEN_ROUTES` still said `/kitchen`. Nothing failed.

**Routes that exist but are unreachable.** Four this session. The subtle version
is not a missing link — it is gating the only entrance on a feature the user may
not have switched on, which is how the order tablet became invisible to
delivery-only restaurants.

**Nothing behind a login was ever verified by eyes.** `/manage`, `/admin` and
`/rider` were built, typechecked, built again and shipped without once being
seen rendered. The exception is the tablet: staff PIN auth needs no Supabase
session, so it *can* be driven with `curl` — sign in at `POST /api/pos/auth`
with `{menu_id, pin}`, keep the cookie, and fetch the page. Do that.

---

**Throttles and lockouts (14 Sep).** `lib/security/rateLimit.ts` is an
in-memory per-instance fixed window — a speed bump, not a wall. POST
/api/orders: 10 per IP per minute and 5 per phone per 10 minutes. Rider
sign-in: 20 per IP per 10 minutes on top of the per-account lockout. Staff PIN
sign-in: 20 per IP per 10 minutes, plus ten wrong PINs lock the MENU for ten
minutes (PINs are looked up by menu + pin, so a miss cannot be pinned on one
staff row). Handover code: five wrong codes lock that order's pickup for
fifteen minutes. The middleware no longer calls Supabase Auth for `/api/*`
(each route authenticates itself); it does gate `/api/admin/*` with a JSON
401 as defence in depth.

**An owner cannot take over a rider by phone number any more.** POST
/api/menu/riders used to reset the PIN of ANY existing rider whose phone
matched, platform riders included. It now refuses (409) unless that rider is
already linked to the caller's menu, and never reactivates a rider an admin
deactivated.

## 5. Current data state

- **One restaurant delivers**: Napul'è. Fee KSh 200, WhatsApp set, 10% / 7%.
- **One rider** exists.
- Napul'è has a **Food Delivery Station** staff PIN — `0002`, because `0001` was
  already taken by an inactive staff member.
- Its other seven staff are **inactive**, so their PINs are refused.
- Four orders predate 092 and carry **null commission**. Left deliberately:
  back-filling would invent an agreement nobody made.
- Two orders (`#CDA0505F`, `#A40A2934`) are stuck at `new` — saved before the
  iPhone WhatsApp fix, so the kitchen was never messaged.

---

## 6. What follows

**Before anything else — walk one order end to end.** Order on
`eat.klickenya.com`, Start preparing, take the job on `/rider`, Mark ready,
enter the handover code, Delivered with cash. Nobody has done this yet. Deliberately
enter a **wrong** handover code first: a code that accepts anything looks
identical to one that works.

Then, roughly in order of value:

1. **Notifications.** The restaurant is now EMAILED on every delivery and
   takeaway order (`lib/orders/notifyRestaurant.ts`, same recipient rule as
   reservations). Riders still only see a job if the app is open (15 s poll,
   paused while the tab is hidden); nothing is pushed to phones. Supabase
   Realtime on `orders` is the next step and also replaces the owner poll.
2. **Rider payouts.** Earnings are recorded per order; there is no payout run,
   no statement, no "settled" marker. Needed before rider #2.
3. **Prepay.** Everything is cash on delivery. `PaymentProvider` has no
   `refund()` and `orders.payment_status` has no `refunded` — see the P1 spec.
4. **Photos.** 160 of 162 menu items have none. Every surface is built to show
   them; this is the single biggest visual lift available.
5. `/admin/eat` **has never been rendered.** Its data layer has been run against
   production, its pages have not. It is now cached (30 s, tag `eat:orders`),
   auto-refreshes while visible, no longer pulls line items, and has its own
   skeleton — but nobody has looked at it yet.
6. **WhatsApp number still required to order.** The cart refuses to submit
   without one even though the restaurant is now emailed. Worth relaxing once
   a restaurant proves it watches email.

**Explicitly not built, and deliberately:** dispatch algorithm, live GPS
tracking, offer/accept timeouts, batching. With one restaurant and a shared job
list, first-to-tap beats an algorithm and has far less to go wrong. These are
P4/P5 in the programme plan and are where delivery businesses burn money.

---

## 7. Security note

Five `/api/admin/*` routes accepted **unauthenticated** callers — including
claim-approve, the only path that sets `isVerified` and that creates host
accounts. Middleware never covered `/api/admin/*`: its check is
`pathname.startsWith("/admin")`, which matches the pages and never the API.

Fixed, and `lib/admin/__tests__/adminRoutesGuarded.test.ts` now walks the
directory and fails if any route exporting a handler is missing `assertAdmin`.
**Worth doing separately:** make middleware cover `/api/admin/*` as defence in
depth, so a future route is safe even if someone forgets.
