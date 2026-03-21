# Rooms & Renting Toggle Feature — Technical Handoff

## What was built

A per-room listing system for stay-type listings on Klickenya. Before this feature, every stay was bookable only as an "entire place." Now hosts can offer individual rooms for booking — useful for boutique hotels, guesthouses, and villas that rent by the room.

**The problem it solves:** Boutique hotels (like Maya Kobe) have multiple room types at different price points. Guests need to see each room separately — its photo, amenities, capacity, and price — and enquire about a specific one. Without this, the host would receive a generic enquiry with no idea which room the guest wants.

**Applies to:** Any listing where `type === "stay"`. The `rentingType` field controls the behaviour:

| Value | Behaviour |
|---|---|
| `entire_place` (default) | No rooms UI. Listing works exactly as before. |
| `by_room` | Only rooms are shown. The whole-property price field is hidden in Sanity. |
| `both` | A toggle lets the guest choose between "Entire place" and "By room." |

---

## Files created

| File | Purpose |
|---|---|
| `apps/web/components/listings/widgets/RoomCard.tsx` | Card component for a single room. Horizontal layout on mobile (matching listing cards), vertical on desktop. Shows photo, name, capacity, bed type, amenities (with tick icons), price, and "Enquire" button. |
| `apps/web/components/listings/widgets/RoomsGrid.tsx` | Renders a grid of `RoomCard` components. Handles the "Enquire" click by adding `?room=RoomName` to the URL and scrolling to the contact form with an amber flash. |
| `apps/web/components/listings/widgets/RentingToggle.tsx` | Orchestrator component. Returns `null` for `entire_place`, renders `RoomsGrid` directly for `by_room`, and shows a toggle UI with localStorage persistence for `both`. |
| `apps/web/scripts/seed-maya-kobe.ts` | One-off script that created the Maya Kobe boutique hotel listing in Sanity with 5 rooms. Used for testing. |

---

## Files modified

| File | What changed | Why |
|---|---|---|
| `apps/studio/schemas/listing.ts` | Added `rentingType` field (radio, 3 options, hidden when not stay). Added `rooms[]` array field with 10 sub-fields per room object. Added `🛏️ Rooms` group tab. Made `price` field hidden when `rentingType === 'by_room'` and updated its description for `both` mode. | Core schema — defines the data structure hosts fill in. |
| `packages/shared/types/index.ts` | Added `RoomType` interface. Added `rentingType` and `rooms` optional fields to `Listing` interface. | Type safety across the monorepo. |
| `apps/web/lib/sanity/queries.ts` | Added `rentingType` and `rooms[]{ ... }` with full sub-field projection to `LISTING_BY_SLUG_QUERY`. | The detail page needs to fetch room data from Sanity. |
| `apps/web/components/listings/detail/StayDetail.tsx` | Added `"use client"` directive, `useState` import, `RentingToggle` import. Renders `<RentingToggle>` after `<HighlightsGrid>`. Passes `listing.price`, `listing.rooms`, `listing.rentingType`. | Wires the toggle into the stay detail page. |
| `apps/web/components/listings/ContactForm.tsx` | Added `useSearchParams`, `useRouter`, `usePathname` imports. Reads `?room=` from URL. Renders amber room badge with dismiss button as first form element. Includes `room` in the submit payload. | The form needs to know which room the guest selected and display it visually. |
| `apps/web/app/api/contact/route.ts` | Added `room: z.string().optional()` to Zod schema. Includes room in Supabase `notes` field. Prepends "Requested room" row to both confirmation and notification email summaries. Updates email subjects to include room name when present. | API must validate, store, and communicate the room selection. |

---

## Data structure

### RoomType interface

```typescript
interface RoomType {
  _key: string           // Sanity array item key
  roomName: string       // e.g. "Prestige Suite"
  roomDescription?: any  // Plain text (Sanity text field, 3 rows)
  photos?: SanityImage[] // Up to 8 images per room, hotspot enabled
  pricePerNight: number  // KSh, required
  capacity: number       // Max guests, required, min 1
  bedType?: string       // One of: King, Queen, Twin, Double, Single, Bunk beds
  roomSizeSqm?: number   // Optional square metres
  roomAmenities?: string[] // Tag input from: AC, Fan, Sea view, Garden view,
                            // Pool view, Balcony, Terrace, Mini bar, In-room safe,
                            // Bathtub, Shower only, Smart TV, Work desk, Kitchenette
  isAvailable: boolean   // Manual toggle, defaults to true
  quantity?: number      // How many of this room type exist, defaults to 1
}
```

### rentingType field

```typescript
type RentingType = 'entire_place' | 'by_room' | 'both'
```

| Value | Sanity behaviour | Frontend behaviour |
|---|---|---|
| `entire_place` | `price` field visible, `rooms` tab hidden | `RentingToggle` returns `null` — no change from before |
| `by_room` | `price` field hidden, `rooms` tab visible | `RoomsGrid` renders directly, no toggle |
| `both` | `price` visible (described as whole-property price), `rooms` tab visible | Toggle UI: "Entire place" shows price card, "By room" shows `RoomsGrid` |

### GROQ query fragment

```groq
rentingType,
rooms[] {
  _key,
  roomName,
  roomDescription,
  "photos": photos[] {
    asset->{ _id, url, metadata { dimensions } },
    alt,
    hotspot,
    crop
  },
  pricePerNight,
  capacity,
  bedType,
  roomSizeSqm,
  roomAmenities,
  isAvailable,
  quantity
}
```

This is included in `LISTING_BY_SLUG_QUERY` in `apps/web/lib/sanity/queries.ts`.

---

## How it works end to end

```
1. HOST sets rentingType in Sanity Studio
   └─ If "by_room" or "both": Rooms tab appears → host adds rooms with
      name, photo, price, capacity, bed type, amenities

2. GUEST opens listing detail page
   └─ GROQ query fetches rentingType + rooms[] from Sanity
   └─ StayDetail renders <RentingToggle> after highlights

3. RentingToggle decides what to show:
   ├─ entire_place → returns null (page unchanged)
   ├─ by_room → renders <RoomsGrid> directly
   └─ both → renders toggle buttons + panel
      └─ "Entire place" panel: shows property price + "Enquire for the whole place"
      └─ "By room" panel: renders <RoomsGrid>
      └─ Selection persisted in localStorage key "kk_rent_mode"

4. GUEST clicks "Enquire" on a RoomCard
   └─ RoomsGrid.handleEnquire(roomName) fires:
      a. router.replace(pathname + '?room=RoomName', { scroll: false })
      b. Scrolls #contact-form into view
      c. Flashes amber ring on form for 1 second

5. ContactForm reads ?room= via useSearchParams()
   └─ Shows amber badge: "🛏 Prestige Suite  ×"
   └─ × button calls router.replace(pathname) to clear param
   └─ room field added to submit payload

6. POST /api/contact receives { ...formData, room: "Prestige Suite" }
   └─ Zod validates room as optional string
   └─ Supabase notes column: "Room: Prestige Suite" line added
   └─ Guest confirmation email subject: "Your enquiry for Prestige Suite at Maya Kobe"
   └─ Host notification email subject: "New enquiry: Prestige Suite at Maya Kobe"
   └─ Both emails include "Requested room: Prestige Suite" as first summary row
```

---

## Current limitations (V1)

| Limitation | Why it exists |
|---|---|
| **No per-room availability calendar** | V1 scope is enquiry-only, no booking engine. Hosts manage availability manually. |
| **No per-room booking engine** | V1 uses contact forms, not instant booking. No payment processing. |
| **`isAvailable` is a manual toggle only** | Hosts must go to Sanity Studio to mark a room unavailable. No automation. |
| **No per-room pricing rules** | No weekend rates, seasonal pricing, or minimum stay. Single `pricePerNight` per room. |
| **No minimum stay per room** | The `pricePerNight` field has no associated `minNights` constraint. |
| **No room-level photo gallery** | RoomCard shows only the first photo. No lightbox or carousel. |
| **Room data lives in Sanity only** | No Supabase mirror. This is fine for V1 (content-driven) but V2 booking needs relational data. |

---

## V2 upgrade plan — what to build next

### V2-1: Per-room availability calendar

**What to build:**
- Supabase table `room_availability` with columns: `id`, `listing_id` (text, Sanity ID), `room_key` (text, matches `_key`), `date` (date), `status` (enum: available/blocked/booked), `booking_id` (uuid, nullable), `created_at`
- Calendar component `RoomAvailabilityCalendar.tsx` showing a month view with green/red/grey dates
- API route `GET /api/rooms/[listingId]/[roomKey]/availability?month=2026-04` returning date statuses
- Integration in `RoomCard`: show a mini date picker or "Check dates" button before "Enquire"

**Files to touch:** New Supabase migration, new API route, new calendar component, modify `RoomCard.tsx`

### V2-2: Per-room booking engine

**What to build:**
- Supabase table `bookings` with: `id`, `listing_id`, `room_key`, `guest_id`, `check_in`, `check_out`, `guests`, `total_price`, `status` (pending/confirmed/cancelled), `payment_intent_id`, `created_at`
- Replace "Enquire" button in `RoomCard` with a `BookRoomWidget` that collects dates + guests, calculates total, and initiates booking
- Payment integration (Stripe or M-Pesa) via `/api/bookings/create`
- Booking confirmation emails with calendar invite (.ics attachment)
- Host dashboard page showing upcoming bookings per room

**Files to touch:** New Supabase migration, new API routes (`/api/bookings/*`), new `BookRoomWidget.tsx`, modify `RoomCard.tsx`, new admin pages

### V2-3: iCal sync per room

**What to build:**
- Supabase table `external_calendars` with: `id`, `listing_id`, `room_key` (nullable — null means whole property), `ical_url`, `direction` (import/export), `last_synced_at`
- Cron job (or scheduled task) that fetches each iCal URL every 15 minutes and blocks dates in `room_availability`
- Export endpoint `GET /api/ical/[listingId]/[roomKey].ics` generating iCal feed from bookings
- Sanity field or admin UI for hosts to paste Airbnb/Booking.com iCal URLs per room

**Files to touch:** New Supabase migration, new cron script, new API route, modify Sanity schema or admin UI

### V2-4: Real-time availability check

**What to build:**
- API route `POST /api/rooms/check-availability` accepting `{ listingId, roomKey, checkIn, checkOut }` and returning `{ available: boolean, conflictingDates: string[] }`
- `RoomCard` gets a date picker (check-in / check-out) that appears on click
- After dates are selected, the card shows a green "Available" or red "Not available" badge
- "Enquire" / "Book" button only enabled when dates are selected and room is available
- Optimistic UI: show loading spinner while checking

**Files to touch:** New API route, modify `RoomCard.tsx`, new `RoomDatePicker.tsx` component

---

## V2 Claude Code prompts

### Prompt V2-1: Per-room availability calendar

```
Create a per-room availability system for Klickenya.

1. Supabase migration: Create table `room_availability` with columns:
   - id: uuid primary key default gen_random_uuid()
   - listing_id: text not null (Sanity document ID)
   - room_key: text not null (matches rooms[]._key in Sanity)
   - date: date not null
   - status: text not null check (status in ('available', 'blocked', 'booked'))
   - booking_id: uuid nullable references bookings(id)
   - created_at: timestamptz default now()
   - unique constraint on (listing_id, room_key, date)

2. API route: GET /api/rooms/[listingId]/[roomKey]/availability
   Query params: month (YYYY-MM)
   Returns: { dates: { [date: string]: 'available' | 'blocked' | 'booked' } }

3. Component: apps/web/components/listings/widgets/RoomDatePicker.tsx
   - Month calendar grid showing availability status per date
   - Green = available, Red = booked, Grey = blocked
   - Click to select check-in/check-out range
   - Props: listingId, roomKey, onDatesSelected(checkIn, checkOut)

4. Integration: Add RoomDatePicker to RoomCard.tsx
   - Show "Check dates" button that expands the date picker
   - When dates selected, show total price calculation
   - Pass selected dates to onEnquire callback

Match existing design system: amber (#E8A020) for primary actions,
border color #E2DDD5, text colors #16130C / #9C9485.
Run TypeScript check after every change.
```

### Prompt V2-2: Per-room booking engine

```
Build a per-room booking engine for Klickenya stays.

1. Supabase migration: Create table `bookings` with columns:
   - id: uuid primary key default gen_random_uuid()
   - listing_id: text not null
   - room_key: text not null
   - guest_name: text not null
   - guest_email: text not null
   - guest_phone: text
   - check_in: date not null
   - check_out: date not null
   - guests: int not null
   - nights: int not null
   - price_per_night: int not null
   - total_price: int not null
   - currency: text default 'KES'
   - status: text check (status in ('pending', 'confirmed', 'cancelled', 'completed'))
   - payment_method: text
   - payment_intent_id: text
   - notes: text
   - created_at: timestamptz default now()
   - updated_at: timestamptz default now()

2. API routes:
   - POST /api/bookings/create — validates dates, checks availability
     in room_availability table, creates booking + blocks dates,
     sends confirmation email
   - GET /api/bookings/[id] — returns booking details
   - PATCH /api/bookings/[id]/cancel — cancels and unblocks dates

3. Replace "Enquire" button in RoomCard with BookRoomWidget:
   - Date picker (check-in / check-out)
   - Guest counter
   - Price breakdown (nights x price)
   - "Book now" button → POST /api/bookings/create
   - Falls back to "Enquire" if booking is disabled for this listing

4. Booking confirmation email template matching existing
   Klickenya email style (see AdminReply.tsx for reference).

5. Admin dashboard: /admin/bookings page showing all bookings
   with filters by status, listing, date range.

Existing files to reference:
- apps/web/app/api/contact/route.ts (email sending pattern)
- apps/web/components/emails/AdminReply.tsx (email template style)
- apps/web/components/listings/widgets/RoomCard.tsx (current UI)
- apps/web/app/admin/page.tsx (admin dashboard pattern)

Run TypeScript check after every change.
```

### Prompt V2-3: iCal sync per room

```
Add iCal calendar sync for per-room availability on Klickenya.

1. Supabase migration: Create table `external_calendars`:
   - id: uuid primary key default gen_random_uuid()
   - listing_id: text not null
   - room_key: text (nullable — null means whole property)
   - ical_url: text not null
   - direction: text check (direction in ('import', 'export'))
   - last_synced_at: timestamptz
   - sync_errors: text
   - created_at: timestamptz default now()

2. Sanity schema change: In apps/studio/schemas/listing.ts,
   add to each room object in the rooms array:
   - externalCalendarUrl: string, optional,
     description: "Paste Airbnb/Booking.com iCal URL"

3. Cron job script: apps/web/scripts/sync-ical.ts
   - Fetches all external_calendars where direction = 'import'
   - Parses each iCal feed (use ical.js or node-ical)
   - For each VEVENT: block those dates in room_availability
   - Updates last_synced_at and sync_errors
   - Run every 15 minutes via scheduled task

4. Export endpoint: GET /api/ical/[listingId]/[roomKey].ics
   - Generates iCal feed from bookings table for that room
   - Content-Type: text/calendar
   - Hosts paste this URL into Airbnb/Booking.com

5. Admin UI: Add "Calendar Sync" section to the listing
   admin page showing sync status, last synced time,
   and any errors.

Reference: room_availability table from V2-1.
Run TypeScript check after every change.
```

### Prompt V2-4: Real-time availability check

```
Add real-time room availability checking to Klickenya.

1. API route: POST /api/rooms/check-availability
   Body: { listingId: string, roomKey: string,
           checkIn: string (YYYY-MM-DD),
           checkOut: string (YYYY-MM-DD) }
   Response: { available: boolean,
               conflictingDates: string[],
               totalPrice: number,
               nights: number }
   Logic: Query room_availability table for any dates
   between checkIn and checkOut where status != 'available'.
   Calculate total from room's pricePerNight * nights.

2. Component: apps/web/components/listings/widgets/RoomDatePicker.tsx
   - Inline date range picker (check-in + check-out)
   - Calls the API on date selection
   - Shows loading spinner while checking
   - Green badge "Available" or red "Not available for [dates]"
   - Calculates and shows: "3 nights · KSh 101,400 total"

3. Modify RoomCard.tsx:
   - Add "Check dates" expandable section above the Enquire button
   - When expanded, show RoomDatePicker
   - Enquire button disabled until dates are selected and available
   - Pass selected dates to onEnquire so they pre-fill the form

4. Modify ContactForm.tsx:
   - Accept optional checkIn/checkOut props from room selection
   - Pre-fill the check-in/check-out fields when coming from
     a room card with dates selected

Reference: room_availability table from V2-1.
Match design system: amber primary, #E2DDD5 borders.
Run TypeScript check after every change.
```

---

## Environment variables needed for V2

| Variable | Purpose | When needed |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe payment processing for room bookings | V2-2 (booking engine) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | V2-2 (booking engine) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js client-side checkout | V2-2 (booking engine) |
| `MPESA_CONSUMER_KEY` | M-Pesa Daraja API (if adding mobile money) | V2-2 (optional) |
| `MPESA_CONSUMER_SECRET` | M-Pesa Daraja API | V2-2 (optional) |
| `CRON_SECRET` | Authenticate scheduled iCal sync requests | V2-3 (iCal sync) |

All existing env vars (`SANITY_API_TOKEN`, `SUPABASE_*`, `RESEND_API_KEY`, etc.) remain unchanged.

---

## Key decisions made in V1

### 1. Rooms live in Sanity, not Supabase

**Decision:** Room definitions (name, photos, price, amenities) are stored as an array field on the Sanity `listing` document.

**Rationale:** V1 is content-driven — no booking engine, no availability tracking. Sanity gives hosts a rich editing experience (image hotspot cropping, drag-to-reorder, inline previews). The alternative (Supabase table) would require building a custom admin UI.

**V2 implication:** Room *definitions* stay in Sanity. Room *availability* and *bookings* go in Supabase. The `room_key` field (Sanity's `_key`) is the join key between the two systems.

### 2. rentingType defaults to `entire_place`

**Decision:** Every existing listing automatically behaves as before — no rooms UI appears unless the host explicitly sets `rentingType` to `by_room` or `both`.

**Rationale:** Backward compatibility. 40+ listings were seeded before this feature. None of them should suddenly show a broken rooms section.

### 3. Room selection via URL param, not form state

**Decision:** When a guest clicks "Enquire" on a room card, the room name is added to the URL as `?room=RoomName` rather than stored in React state.

**Rationale:** The `ContactForm` lives in `BookingSidebar` (a separate component tree from `RoomsGrid`). URL params are the cleanest way to pass data across component boundaries without prop drilling or global state. It also makes the selection shareable and bookmarkable.

### 4. No price shown for `by_room` listings

**Decision:** The Sanity `price` field is hidden when `rentingType === 'by_room'`. Each room has its own `pricePerNight`.

**Rationale:** Showing a property-level price alongside per-room prices would confuse guests. For `both` mode, the property price is shown in the "Entire place" panel and room prices in the "By room" panel — never mixed.

### 5. `RentingToggle` returns null for entire_place

**Decision:** The toggle component is a no-op for the default case.

**Rationale:** This means `StayDetail` can unconditionally render `<RentingToggle>` without wrapping it in a conditional. The component handles its own visibility logic. This keeps the detail page clean and makes future additions easier.

### 6. localStorage persistence for toggle mode

**Decision:** When `rentingType === 'both'`, the guest's toggle selection (entire vs room) is saved to `localStorage` under key `kk_rent_mode`.

**Rationale:** If a guest is browsing multiple listings and prefers room-by-room booking, they shouldn't have to re-select "By room" on every listing. The preference carries across pages within the session.
