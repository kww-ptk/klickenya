# Partner API Integration — How It Works
_Last updated: June 27, 2026_

## Overview

Klickenya acts as the booking engine behind a partner's website. The partner manages everything from one Klickenya dashboard — rooms, prices, availability — and it all syncs automatically to their website. Guests never need to visit Klickenya directly.

> **Current state (V1 — enquiry flow):** guests submit a booking **enquiry**;
> the host confirms and converts it in the Klickenya dashboard. There is no
> instant, self-confirmed booking yet.
>
> **Instant-book (V2 — not built):** guest clicks Book and gets an immediate
> confirmation. This needs an atomic availability hold **and** payment
> integration (M-Pesa/Paystack), neither of which exists yet. Everywhere this
> doc mentions "clicks Book → confirmation," read it as the V2 target, not
> today's behaviour.

---

## Three Partner Scenarios

### Scenario 1 — Has a website, wants quick setup (Embed Widget)
They paste one line of code on their existing website. A ready-made booking form appears. No developer needed.

### Scenario 2 — Has a website, wants full custom design (API)
Their developer builds the booking form to match their brand exactly. The form talks to Klickenya behind the scenes. More work but looks 100% like their brand.

### Scenario 3 — No website
Klickenya builds the whole website for them. Already connected from day one. No embed, no API key needed. Just manage the dashboard.

---

## Scenario 1 — Existing Website, Quick Setup via Embed (e.g. 7islands.com)

**Setup (happens once):**
1. 7 Islands signs up on Klickenya
2. They add their property, rooms, and prices in the Klickenya dashboard
3. They copy their embed code from the dashboard
4. Their web developer pastes that one line of code on their website where the booking form should appear
5. Done

**Guest booking flow:**
1. Guest opens `7islands.com`
2. They see the booking form — rooms, prices, photos all pulled live from Klickenya dashboard
3. Guest picks a room and selects dates
4. Guest fills in their details and submits an enquiry
5. Klickenya records the enquiry and emails a confirmation to the guest ("we've received your enquiry"), plus a notification to the host/admin
6. Host opens their Klickenya dashboard, sees the enquiry, and converts it to a confirmed booking
   _(V2: guest clicks Book and gets an instant confirmation — needs availability hold + payments)_

**When 7 Islands adds a new room:**
1. Add it in the Klickenya dashboard
2. It automatically appears in the booking form on `7islands.com`
3. No one touches the website

---

## Scenario 2 — Existing Website, Full Custom Design via API (e.g. 7islands.com)

**Setup (happens once):**
1. 7 Islands signs up on Klickenya
2. They add their property, rooms, and prices in the Klickenya dashboard
3. They go to **Settings → API** and copy their API key
4. They send that key to their web developer
5. Developer builds a custom booking form on `7islands.com` that matches their brand
6. Developer connects that form to Klickenya using the API key
7. Done

**Guest booking flow:**
1. Guest opens `7islands.com`
2. They see a fully branded booking form — design matches 7 Islands completely
3. Behind the scenes the form is asking Klickenya for rooms, prices, availability
4. Guest picks a room and submits an enquiry
5. Klickenya records the enquiry and emails the guest a confirmation; host/admin are notified
6. Host converts the enquiry to a confirmed booking in their Klickenya dashboard
   _(V2: instant Book — needs availability hold + payments)_

**When 7 Islands adds a new room:**
1. Add it in the Klickenya dashboard
2. It automatically appears in their custom form on `7islands.com`
3. No one touches the website

---

## Scenario 3 — No Website (e.g. Diani Beach Lodge)

**Setup (happens once):**
1. Diani Beach Lodge signs up on Klickenya
2. They add their property, rooms, and prices in the dashboard
3. Klickenya builds their website — already connected from day one
4. No API key, no developer, no technical work needed from the partner

**Guest booking flow:**
1. Guest opens `dianibeachlodge.com` — built and powered by Klickenya
2. They see all rooms, prices, photos — all from the Klickenya dashboard
3. Guest picks dates
4. Guest submits an enquiry — a confirmation email is sent, host/admin notified
5. Host sees the enquiry in their Klickenya dashboard and confirms it
   _(V2: instant Book — needs availability hold + payments)_

**When they add a new room:**
1. Add it in the Klickenya dashboard
2. Appears on their website instantly

---

## Comparison

| | Scenario 1 (Embed) | Scenario 2 (API) | Scenario 3 (No Website) |
|---|---|---|---|
| Has existing website | Yes | Yes | No |
| Who builds the booking form | Klickenya (already built) | Partner's developer | Klickenya (builds everything) |
| Technical effort for partner | Paste one line of code | Developer builds custom form | Zero |
| Design control | Limited — Klickenya style | Full — matches their brand | Klickenya style |
| API key needed | No | Yes | No |
| New rooms auto-appear | Yes | Yes | Yes |
| All managed in Klickenya dashboard | Yes | Yes | Yes |

All three scenarios end up in the same place — one Klickenya dashboard, everything synced automatically.

---

## What the API Does

The API is the messenger between the partner's website and Klickenya.

**It fetches:**
- List of rooms and photos
- Room availability for selected dates
- Pricing

**It sends:**
- New booking requests
- Guest details

The partner's website never stores any data itself. It asks Klickenya, Klickenya answers, and the website shows the result to the guest.

---

## What Needs to Be Built

| Feature | Status |
|---|---|
| Room booking embed (`/embed/booking/[slug]`) | **Already built** (enquiry flow) |
| Availability display | **Already built** — read-only in the widget |
| Booking **enquiry** submission API | **Already built** |
| Instant-book (self-confirmed booking + guest confirmation) | **To build (V2)** — needs availability hold + payments |
| Payment integration (M-Pesa / Paystack) | **To build (V2)** |
| Partner API key system | **To build** |
| API key generator in dashboard | **To build** |
| Activities / other listing type embeds | **To build** |
| Website builder for partners with no site | **To plan** |

---

## Embed vs API

| | Embed | API |
|---|---|---|
| What it is | Ready-made booking form, paste once | Raw data connection, developer builds the form |
| Design control | Limited — looks like Klickenya | Full — matches their brand completely |
| Technical effort | Minimal — paste one line of code | Requires a developer to build the forms |
| New rooms auto-appear | Yes | Yes |
| Price changes auto-update | Yes | Yes |
| Availability real-time | Yes | Yes |
| Best for | Quick setup on existing sites | Custom-built websites with full brand control |

Both options stay in sync with the Klickenya dashboard automatically. The only difference is who controls the design.
