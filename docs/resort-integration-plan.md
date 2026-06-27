# Resort Integration Plan — Seven Islands, Claris, Tribal Sand → Klickenya

> Status: **Planning** · Author: engineering · Date: 2026-06-27

---

## Why We're Doing This

We manage three resort websites — Seven Islands Watamu, Claris African Experience,
and Tribal Sand. Each one was built separately, each has its own database, its own
admin panel, and its own booking system. That made sense when they were independent
projects. But now that all three are under the same team, running them separately
creates real problems:

- **Cost** — we are paying for 4 databases (3 resorts + Klickenya) when one is enough
- **Maintenance** — a bug fix or feature update has to be made 3 times, once per site
- **No unified view** — there is no single place to see all bookings across all properties
- **Wasted effort** — Klickenya already has a fully built property management system,
  availability calendar, booking engine, email notifications, and host dashboard.
  The resorts built the same thing from scratch in PHP and are running it in parallel.

This is unnecessary duplication that costs money and slows down every future improvement.

---

## Objective

Consolidate all resort booking and property management into Klickenya — one platform,
one database, one dashboard — while each resort website keeps its own design, brand,
and content exactly as it is today.

The resort websites become **marketing sites** that showcase the property.
Klickenya becomes the **engine** that handles everything operational — bookings,
availability, guest enquiries, email notifications, and payment tracking.

This also positions Klickenya as a real hospitality platform: not just a marketplace
where guests discover places, but the system that powers the operations behind those places.
Every resort we onboard proves the model and makes the platform more valuable.

---

## The Problem Today

| Site | Database | Cost |
|---|---|---|
| Seven Islands Watamu | Render PostgreSQL (own DB) | ~$7–15/mo |
| Claris African Experience | Render PostgreSQL (own DB) | ~$7–15/mo |
| Tribal Sand | Neon PostgreSQL (own DB) | ~$7–15/mo |
| Klickenya | Supabase | ~$25/mo |
| **Total** | **4 separate databases** | **~$46–70/mo** |

Each site also has its own admin panel and booking system to maintain separately.

---

## The Solution

Move all booking/availability/enquiry data into Klickenya's Supabase.
Each resort website stays exactly as it looks — only the booking form is replaced
with a Klickenya embed widget (one `<script>` tag).

```
PHP site           → marketing, content, SEO  (stays in PHP)
Klickenya Supabase → bookings, availability, holds, payments (one DB)
```

---

## Phase 1 — Set Up Hosts on Klickenya (1 day)

Create a host account for each resort:

| Resort | Host |
|---|---|
| Seven Islands Watamu | Host A |
| Claris African Experience | Host B |
| Tribal Sand | Host C |

Each host logs into `/dashboard` and sets up their property — rooms, prices,
photos, availability. This is already built in Klickenya's PMS dashboard.

---

## Phase 2 — Seven Islands as the Pilot (1 week)

Start with Seven Islands only. Don't touch Claris or Tribal yet.

1. Host A sets up Seven Islands on the Klickenya dashboard — rooms, pricing, availability
2. Embed the Klickenya booking widget on `sevenislandswatamu.com`, replacing the current PHP booking form:
   ```html
   <script src="https://klickenya.com/embed.js" async></script>
   <div data-klickenya-tool="booking" data-slug="seven-islands-watamu"></div>
   ```
3. Test end-to-end — guest fills form → booking appears in Klickenya dashboard → host gets email notification
4. Run both systems in parallel for 2 weeks (PHP form stays as fallback)
5. Once confident — remove the PHP booking form, shut down Seven Islands' Render PostgreSQL DB

---

## Phase 3 — Fix What's Not Ready Yet (1 week, runs alongside Phase 2)

The Klickenya property booking embed (`/embed/booking/[slug]`) was built but
**never live-tested**. Before going live we need to:

- [ ] Test end-to-end with a real property slug
- [ ] Verify email notification fires correctly on booking submission
- [ ] Verify the booking appears in the host dashboard
- [ ] Fix any bugs found
- [ ] Add a dashboard snippet generator for property owners (parity with the restaurant embed panel)

> This is the single technical blocker. Everything else is already built.

---

## Phase 4 — Roll Out to Claris and Tribal Sand (1 week each)

Same process as Phase 2, one property at a time:

- **Claris African Experience** → embed widget → test → shut down their Render DB
- **Tribal Sand** → embed widget → test → shut down their Neon DB

---

## Phase 5 — List All Three on the Klickenya Marketplace

Once the booking side works, add each resort as a published listing on
`klickenya.com` — so guests discover them through the marketplace, not only
through the resort's own website. This doubles their reach with zero extra work.

---

## The Design Boundary — PHP vs Klickenya

This is the most important rule of the integration:

> **The existing resort websites (Seven Islands, Claris, Tribal Sand) will become
> plain PHP static sites — no database, no backend logic, no admin panel.
> Klickenya handles everything entirely.**

Right now these sites have:
- Their own PostgreSQL database
- Their own booking system and admin panel
- Their own email notifications and hold logic

After integration, all of that is **removed completely**. The PHP sites become
pure HTML/CSS/PHP presentation — just pages, design, photos, and content.
No database connection. No form processing. No admin login.

Everything a guest needs to do — enquire, check availability, book a room —
happens through the Klickenya embed widget dropped into the page.
Everything the resort owner needs to manage — bookings, rooms, calendar, guests —
happens in the Klickenya host dashboard.

The PHP sites only need to exist as a branded front door. Klickenya does the rest.

---

## End Result

| Before | After |
|---|---|
| 4 databases | 1 database (Klickenya Supabase) |
| 3 separate admin panels | 1 Klickenya host dashboard per resort |
| 3 booking systems to maintain | 1 codebase |
| ~$46–70/mo DB cost | ~$25/mo |
| New resort onboarding = weeks | New resort onboarding = hours |

Each resort site looks identical to guests — only the backend changes.
Any new resort client gets onboarded by creating a host account and
embedding one script tag on their site.

---

## Expected Results

### For the business
- **Lower cost** — 3 resort databases shut down, saving ~$21–45/mo immediately
- **Less maintenance** — one booking system to update instead of three
- **One dashboard** — all properties, all bookings, all guests in one place
- **Faster onboarding** — adding a new resort client goes from weeks of custom dev to hours of configuration
- **Stronger Klickenya** — every resort we onboard is proof that Klickenya works as a hospitality platform, not just a directory

### For resort owners (hosts)
- No more managing a separate admin panel per site
- Availability, bookings, and guest emails all handled automatically
- Their website stays exactly as guests know it — nothing changes on the front end
- They get access to the full Klickenya dashboard: calendar, room management, booking history, payment tracking

### For guests
- No visible change — they book on the same resort website they always used
- The form is faster, cleaner, and more reliable than the custom PHP forms
- Future: they can also discover the resort on klickenya.com and book from there too

---

## Business Subscription Scenarios

Different types of businesses get different value from Klickenya depending on their situation.

### Scenario 1 — Business with No Website
*e.g. a small guesthouse in Malindi that only uses WhatsApp*

They get everything from Klickenya:
- Listed on the marketplace so guests can find them
- A host dashboard to manage rooms, bookings, and enquiries
- A QR menu if they have a restaurant
- Email notifications when a booking comes in
- No website needed — Klickenya is their entire online presence

### Scenario 2 — Business with Their Own Website
*e.g. Seven Islands, Claris, Tribal Sand*

They keep their website, Klickenya powers the operations:
- Listed on the marketplace for extra discovery
- Booking and reservation forms on their site are replaced with Klickenya embed widgets
- All bookings land in their Klickenya host dashboard
- They shut down whatever separate booking system they had before

### Scenario 3 — Business Already on OTAs
*e.g. a hotel already listed on Airbnb and Booking.com*

Klickenya becomes their central hub:
- All OTA bookings sync into Klickenya via iCal — no more double bookings
- Availability is managed in one calendar across all channels
- They also get listed on the Klickenya marketplace as an additional direct channel
- Direct bookings through Klickenya mean no OTA commission

### Scenario 4 — Restaurant
*e.g. a restaurant in Nairobi*

They get the full restaurant stack:
- Listed on the marketplace under Restaurants
- QR menu on their tables — guests scan and order
- POS terminal for staff to manage orders
- Table reservation system with a guest-facing booking form
- Kitchen display for live order management
- Embed menu and reservation widget on their own website if they have one

### Scenario 5 — Multi-Property Operator
*e.g. an operator managing 5 villas across the coast*

One host account, all properties in one dashboard:
- Each property has its own rooms, calendar, and pricing
- All bookings visible in one place across every property
- Each property can have its own embed widget on its own website or page
- Admin can see and manage across all of them from the Klickenya admin panel

---

## Recommended First Step

**Fix and live-test the Klickenya booking embed (Phase 3)** — that is the
only technical blocker before anything else can move forward.
