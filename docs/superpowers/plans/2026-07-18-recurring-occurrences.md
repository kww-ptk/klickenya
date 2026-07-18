# Recurring-Event Occurrences (Lite) + Purchase-Box Trust Signals — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Make recurring-event tickets date-bound: buyer picks a night, ticket is valid only for that night, inventory is per-night, and the door scanner enforces the date. Plus add a date selector + real trust signals (secure payment, official, last-booked) to the event purchase box.

**Branch:** `feat/recurring-occurrences` off `dev`. Worktree `/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya-ticketing`.
**Env note:** no Supabase/Sanity/browser here. Gates: `npx tsc --noEmit` + `pnpm vitest run` + `pnpm lint` (from apps/web). DB apply + runtime = manual preview.

## Design decisions (approved)
- **Occurrence = a calendar DATE** (so a party past midnight is still "that Saturday").
- **occurrence_date on order/ticket:** recurring → the picked date; non-recurring → `null` (unchanged, not date-enforced).
- **Inventory counter date:** recurring → picked date; non-recurring → the sentinel `2000-01-01` (keeps existing counter rows continuous — backward-compatible).
- **Sell the next 8 occurrences.** Scanner defaults to tonight's occurrence, host can change the date.
- **"Last booked X ago" is REAL** (most-recent paid order for the event) — hidden when none/older than 14 days. Never fabricated.

## Key existing structures
- Migration 079: `ticket_orders`, `tickets`, `event_ticket_counters (PK event_sanity_id, tier_key)`, RPCs `reserve_event_tickets(p_event_sanity_id, p_lines)` / `release_event_tickets(...)`.
- Checkout `apps/web/app/api/events/tickets/checkout/route.ts` fetches event (isFree, totalCapacity, eventDate, ticketTypes), builds lines, reserves, creates order, issues.
- Cron `apps/web/app/api/cron/expire-ticket-orders/route.ts` releases tickets + coupons.
- `lib/tickets/tierEdit.ts` schedule shape: `{day: monday..sunday, startTime, endTime?}`.
- Buyer UI `components/events/TicketPurchase.tsx` (client): builds `selected=[{tierKey,qty}]`, coupon preview, posts to checkout.
- Scanner `app/dashboard/events/[id]/scan/ScannerClient.tsx` (shared by `/scan` + dashboard); validate route `app/api/dashboard/events/tickets/validate/route.ts`.
- Ticket surfaces: `app/t/[code]/page.tsx`, `lib/tickets/ticketPdf.ts`, `lib/tickets/email.ts`.
- Constant to add: `export const OCCURRENCE_SENTINEL = "2000-01-01"` in `lib/tickets/occurrences.ts` (Task 2), imported by checkout + migration uses the literal.

---

## Task 1: Migration 082 — occurrence dates + per-night inventory

**File:** create `supabase/migrations/082_occurrence_dates.sql` (confirm 081 is highest).

```sql
-- 082_occurrence_dates.sql
-- Date-bind tickets to a specific occurrence of a recurring event, and make
-- inventory per (event, tier, occurrence_date). Backward-compatible: existing
-- counter rows adopt the sentinel date and keep working; non-recurring tickets
-- store occurrence_date = NULL and reserve against the sentinel.

ALTER TABLE ticket_orders ADD COLUMN occurrence_date date;   -- NULL = non-recurring
ALTER TABLE tickets       ADD COLUMN occurrence_date date;

-- Re-key the counter to include the occurrence date.
ALTER TABLE event_ticket_counters ADD COLUMN occurrence_date date NOT NULL DEFAULT DATE '2000-01-01';
ALTER TABLE event_ticket_counters DROP CONSTRAINT event_ticket_counters_pkey;
ALTER TABLE event_ticket_counters ADD PRIMARY KEY (event_sanity_id, tier_key, occurrence_date);

-- Reserve now takes an occurrence_date and keys the counter by it.
CREATE OR REPLACE FUNCTION reserve_event_tickets(
  p_event_sanity_id text,
  p_occurrence_date date,
  p_lines jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  line jsonb;
  v_updated integer;
BEGIN
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO event_ticket_counters (event_sanity_id, tier_key, occurrence_date, sold, capacity)
    VALUES (p_event_sanity_id, line->>'tier_key', p_occurrence_date, 0, NULLIF(line->>'capacity','')::integer)
    ON CONFLICT (event_sanity_id, tier_key, occurrence_date)
    DO UPDATE SET capacity = EXCLUDED.capacity;

    UPDATE event_ticket_counters
       SET sold = sold + (line->>'qty')::integer
     WHERE event_sanity_id = p_event_sanity_id
       AND tier_key = line->>'tier_key'
       AND occurrence_date = p_occurrence_date
       AND (capacity IS NULL OR sold + (line->>'qty')::integer <= capacity);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN RAISE EXCEPTION 'SOLD_OUT:%', line->>'tier_key'; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION release_event_tickets(
  p_event_sanity_id text,
  p_occurrence_date date,
  p_lines jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE line jsonb;
BEGIN
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    UPDATE event_ticket_counters
       SET sold = GREATEST(0, sold - (line->>'qty')::integer)
     WHERE event_sanity_id = p_event_sanity_id
       AND tier_key = line->>'tier_key'
       AND occurrence_date = p_occurrence_date;
  END LOOP;
END $$;
```
Note: the RPC SIGNATURES change (added `p_occurrence_date`). Postgres `CREATE OR REPLACE` cannot change the argument list — so the migration must `DROP FUNCTION reserve_event_tickets(text, jsonb); DROP FUNCTION release_event_tickets(text, jsonb);` FIRST, then create the new 3-arg versions. Add those two DROP statements before the CREATEs.

- [ ] Author the file (with the two `DROP FUNCTION ... (text, jsonb)` lines before the new CREATEs). Structural check: balanced `$$`, PK swap present, both RPCs 3-arg. DB apply is a manual user step — don't fake it.
- [ ] Commit: `git add supabase/migrations/082_occurrence_dates.sql && git commit -m "feat(tickets): migration 082 — occurrence-dated tickets + per-night inventory"`

---

## Task 2: Occurrence date math (pure, TDD)

**Files:** create `apps/web/lib/tickets/occurrences.ts` + `__tests__/occurrences.test.ts`.

Types: schedule row `{ day: string; startTime?: string; endTime?: string }` (day ∈ monday..sunday).

- [ ] Test first (`occurrences.test.ts`):
```typescript
import { describe, it, expect } from "vitest";
import { nextOccurrences, isValidOccurrence, OCCURRENCE_SENTINEL } from "../occurrences";

const sched = [{ day: "saturday" }, { day: "sunday" }];

describe("nextOccurrences", () => {
  it("returns the next N dates matching scheduled weekdays, from a given date (YYYY-MM-DD, UTC-safe)", () => {
    // 2026-08-05 is a Wednesday. Next Sat=08-08, Sun=08-09, Sat=08-15...
    const out = nextOccurrences(sched, "2026-08-05", 4);
    expect(out).toEqual(["2026-08-08", "2026-08-09", "2026-08-15", "2026-08-16"]);
  });
  it("includes today if today is a scheduled day", () => {
    // 2026-08-08 is a Saturday
    const out = nextOccurrences(sched, "2026-08-08", 1);
    expect(out[0]).toBe("2026-08-08");
  });
  it("empty schedule → []", () => {
    expect(nextOccurrences([], "2026-08-05", 4)).toEqual([]);
  });
});

describe("isValidOccurrence", () => {
  it("true for a scheduled day on/after now", () => {
    expect(isValidOccurrence(sched, "2026-08-15", "2026-08-05")).toBe(true);
  });
  it("false for a non-scheduled weekday or a past date", () => {
    expect(isValidOccurrence(sched, "2026-08-12", "2026-08-05")).toBe(false); // Wednesday
    expect(isValidOccurrence(sched, "2026-08-01", "2026-08-05")).toBe(false); // past
  });
});

describe("OCCURRENCE_SENTINEL", () => {
  it("is the non-recurring counter date", () => { expect(OCCURRENCE_SENTINEL).toBe("2000-01-01"); });
});
```
- [ ] Implement `occurrences.ts` — pure, no `Date.now()` (callers pass `fromISO`/`nowISO`). Parse dates as UTC (`new Date(iso + "T00:00:00Z")`), compute weekday via `getUTCDay()` (0=Sun..6=Sat), map schedule day-names → indices, walk forward up to ~370 days collecting matches until `count`. `isValidOccurrence(sched, date, now)` = date >= now (date compare) AND date's weekday ∈ scheduled days. Export `OCCURRENCE_SENTINEL = "2000-01-01"`.
- [ ] Run → pass. tsc clean. Commit: `feat(tickets): occurrence date math (TDD)`.

---

## Task 3: Checkout — occurrence-aware reservation

**File:** modify `apps/web/app/api/events/tickets/checkout/route.ts` + `apps/web/app/api/cron/expire-ticket-orders/route.ts`.

- [ ] Read the current checkout. Extend the Sanity event fetch to also select `isRecurring, schedule[]{day, startTime, endTime}`.
- [ ] Add `occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()` to the checkout schema.
- [ ] After the event is loaded, compute the dates:
```typescript
import { isValidOccurrence, OCCURRENCE_SENTINEL } from "@/lib/tickets/occurrences";
// ...
let ticketOccurrenceDate: string | null = null;   // stored on order/tickets
let counterDate = OCCURRENCE_SENTINEL;             // inventory key
if (event.isRecurring) {
  if (!body.occurrenceDate) return NextResponse.json({ error: "Pick a date" }, { status: 400 });
  const nowISO = new Date().toISOString().slice(0, 10);
  if (!isValidOccurrence(event.schedule ?? [], body.occurrenceDate, nowISO)) {
    return NextResponse.json({ error: "That date isn't available" }, { status: 400 });
  }
  ticketOccurrenceDate = body.occurrenceDate;
  counterDate = body.occurrenceDate;
}
```
- [ ] Reserve with the date: change the `reserve_event_tickets` rpc call to pass `p_occurrence_date: counterDate` (alongside `p_event_sanity_id`, `p_lines`). Same for BOTH `release_event_tickets` calls (the reserve-failure release and the order-insert-failure release) — add `p_occurrence_date: counterDate`.
- [ ] Store on the order insert: add `occurrence_date: ticketOccurrenceDate`. Issuance copies it to tickets — check `lib/tickets/issue.ts`: it reads the order and inserts ticket rows; add `occurrence_date: order.occurrence_date` to the ticket insert rows and to the order select. (Modify `issue.ts` accordingly.)
- [ ] Cron `expire-ticket-orders`: it already selects order fields + calls `release_event_tickets`. Add `occurrence_date` to its select, and pass `p_occurrence_date: order.occurrence_date ?? "2000-01-01"` to the release call (non-recurring orders have null → sentinel).
- [ ] tsc + vitest + lint. Commit: `feat(tickets): occurrence-aware checkout reservation + release`.

---

## Task 4: Show the occurrence date on ticket surfaces

**Files:** `apps/web/app/t/[code]/page.tsx`, `lib/tickets/ticketPdf.ts`, `lib/tickets/email.ts`, `lib/tickets/issue.ts` (TicketRow shape).

- [ ] `issue.ts`: include `occurrence_date` in the `tickets` select that builds `TicketRow` (add to the type + select) so downstream has it.
- [ ] `/t/[code]/page.tsx`: select `occurrence_date`; when present, show it as the event date (format `en-KE`, weekday+day+month, `Africa/Nairobi`) instead of the generic event `eventDate`. Fallback to event.eventDate when null.
- [ ] `email.ts` / `ticketPdf.ts`: `sendTicketEmail` already computes `dateStr` from event.eventDate. When a ticket has `occurrence_date`, prefer it for the displayed date (the PDF + email header show the specific night). Pass the per-ticket occurrence date into `renderTicketsPdf` (extend `PdfTicket` with `dateStr?: string | null` and use it per page, falling back to the event dateStr). Keep it simple: compute a formatted occurrence date per ticket in email.ts and pass through.
- [ ] tsc + vitest + lint. Commit: `feat(tickets): show the specific occurrence date on ticket page, PDF, and email`.

---

## Task 5: Purchase box — date picker + trust signals + real "last booked"

**Files:** create `apps/web/app/api/events/tickets/recent-booking/route.ts`; modify `apps/web/components/events/TicketPurchase.tsx`; the event detail data path to pass `isRecurring` + `schedule` + `eventSanityId` to TicketPurchase (check `EventDetail.tsx` / the router — TicketPurchase already gets `eventSanityId`, `isFree`, `tiers`; add `isRecurring` + `schedule`).

- [ ] **Recent-booking endpoint** `recent-booking/route.ts`: `GET ?eventSanityId=...` → most recent PAID order's `created_at` for that event; return `{ lastBookedAt: string | null }`. Rate-limit-free but cache-friendly; only paid orders. (Real data only.)
- [ ] **TicketPurchase date picker** (recurring only): compute the next 8 occurrences client-side via `nextOccurrences(schedule, todayISO, 8)` (import the pure lib — it's isomorphic), render a horizontal list / select of formatted dates; the buyer must pick one before tiers are actionable. Store `occurrenceDate`; include it in the checkout body AND the coupon-preview body. For non-recurring events, no picker (unchanged).
- [ ] **Trust signals** (below the pay button): a small stack — `🔒 Secure payment · M-Pesa & card via Paystack`; `✓ Official tickets — sold on Klickenya`; and, when the recent-booking fetch returns a `lastBookedAt` within 14 days, `🎟 Last booked {relative time} ago` (compute relative time client-side). Hide the last-booked line otherwise. Style consistent with the box (muted, small).
- [ ] tsc + vitest + lint. Commit: `feat(tickets): event purchase box — date picker + trust signals + real last-booked`.

---

## Task 6: Date-scoped scanner

**Files:** modify `app/api/dashboard/events/tickets/validate/route.ts`, `ScannerClient.tsx`, both scan pages (`app/scan/page.tsx`, `app/dashboard/events/[id]/scan/page.tsx`).

- [ ] **Validate route:** accept `scanDate` (YYYY-MM-DD, optional) in the body. After loading the ticket, if `ticket.occurrence_date` is non-null AND a `scanDate` is provided AND they differ → return `{ result: "wrong_date", occurrenceDate: ticket.occurrence_date, attendeeName }` WITHOUT checking in. (Null occurrence_date = non-recurring → no date check, unchanged.) Keep the atomic check-in for the matching case.
- [ ] **ScannerClient:** add a "Scanning for" date control. The scan pages pass `occurrenceDates: string[]` (the event's upcoming occurrences, or [] for non-recurring) and a default `scanDate` (nearest occurrence to today, or today). If `occurrenceDates` is non-empty, render a compact date selector at the top; the selected date is sent as `scanDate` in every validate call. Add a `wrong_date` result to the `ScanResult` union + COLORS/LABELS (`"✗ WRONG DATE"`, e.g. `bg-orange-800`) and show "ticket is for {occurrenceDate}".
- [ ] **Scan pages:** compute `occurrenceDates` = for a recurring event, `nextOccurrences(schedule, todayISO, 8)`; else `[]`. Fetch the event's `isRecurring` + `schedule` (Sanity) in each scan page and pass `occurrenceDates` + default `scanDate` to ScannerClient. (Dashboard scan resolves the event via `resolveManageableEvent`; the public `/scan` has the door session's event id — fetch schedule from Sanity by that id.)
- [ ] tsc + vitest + lint. Commit: `feat(tickets): date-scoped door scanner for recurring events`.

---

## Task 7: Docs + verify + (hand back for shipping)

- [ ] `CLAUDE.md`: migration counter → next 083; note "recurring-event occurrences: date-bound tickets, per-night inventory + door date-check; event purchase box trust signals."
- [ ] Full verify: `pnpm vitest run` (all suites incl. occurrences), `npx tsc --noEmit`, `pnpm lint` on touched dirs.
- [ ] Commit docs. STOP — do not push; report back for the controller to ship via dev→main.

## Deployment / manual checks
- Apply migration **082** to Supabase (after 079–081). Then on preview: recurring event shows a date picker; buying stamps the night on the ticket/PDF/email; scanner defaults to tonight and rejects other-night tickets with "WRONG DATE"; the trust signals render and "last booked" shows only real recent activity.

## Self-review
- Recurring tickets date-bound end-to-end (buy → ticket → scan). ✓
- Per-night inventory via re-keyed counter; non-recurring uses sentinel (backward-compatible). ✓
- "Last booked" is real, hidden when absent (no fabricated social proof). ✓
- occurrence math pure + TDD; no Date.now() in the lib. ✓
