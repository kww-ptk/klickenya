# Klickenya — Platform Review

_Prepared by: engineering review · Last updated: 2026-06-27_

End-to-end review of account sign-up, roles, host onboarding, the host dashboard,
and the admin panel — **verified against live production data, not just code.**

---

## Bottom line
The core platform works well (marketplace, bookings, website-embed). The weak
spots are concentrated in **account sign-up and host onboarding**, plus a few
**data-privacy and admin bugs**. These should be addressed before pushing for more
sign-ups. Nothing here blocks the marketplace itself.

**Production snapshot:** 118 guests · 10 hosts · 2 admins. **3 of 10 hosts (30%)
are broken** (have the host role but can't access their tools).

---

## 1. Top issues (priority order)

| # | Issue | Impact | Severity | Status |
|---|---|---|---|---|
| 1 | **Sign-up confirmation emails not delivered** | New users can't activate their accounts | 🔴 | ✅ **Fixed** — Supabase SMTP now points to Resend; sign-ups confirmed working 2026-06-27 |
| 2 | **~30% of host accounts are broken** | 3 of 10 hosts can't use the dashboard | 🔴 | ⏳ Open — F-4 bug (missing slug on host_profiles insert) not yet fixed in code |
| 3 | **Guest enquiry details exposed to other hosts** | Privacy gap (names, emails, phones) | 🔴 | ⏳ Open — RLS policy fix not yet applied |
| 4 | **Admin "View reservation" always 404s** | Admins can't open reservation details | 🔴 | ⏳ Open — bad query not yet fixed |
| 5 | Hosts can't edit/view their listings in the dashboard | Limited self-service | 🟠 | ⏳ Open |
| 6 | PMS property vs marketplace listing are disconnected | "My Listings" shows 0 after setup; data re-entry | 🟠 | ⏳ Open |
| 7 | "Analyse with AI" step always fails | Users hit an error, fall back to manual | 🟠 | ⏳ Open — needs `FIRECRAWL_API_KEY` |
| 8 | Broken/inconsistent on/off toggles; ~35 pages missing loading states | Rough UX | 🟡 | ⏳ Open |

_(Full technical detail, file references, and fix directions are in the supporting
docs listed at the bottom.)_

---

## 2. What we fixed this round

### Round 1 (2026-06-24)
- **"Confirmation link expired" sign-up bug** — links pointed at the wrong web address.
- **Approved listings now go live** on the marketplace (they were staying hidden despite the "you're live" email).
- **Added a "List your business" button** in the host dashboard (previously there was no way to start a listing from there).
- **Cleaner listing form** — live email/phone validation + a mobile progress bar.

> Note: these fixes are committed and staged; final production deploy + one Supabase
> email setting are still required for sign-up to work end-to-end.

### Round 2 (2026-06-27)
- **Back button on /list page** — was hardcoded to homepage, now returns to previous page using `router.back()`.
- **Grouped sidebar navigation** — both admin (19 items → 6 groups) and host dashboard (9 items → 4 groups) reorganised with labelled section headers for clarity.
- **Page descriptions on all pages** — every main page in admin and host dashboard now has a one-line description explaining what the page is and what you can do there (18 admin pages + 9 dashboard pages).
- **Count badges on page titles** — row counts moved from description text to a small pill badge next to the page title, keeping descriptions clean and static.
- **`/become-a-host` improvements** — added "Already have a website?" section with embed widget explanation + code snippet, and a "Host Dashboard" section showcasing 6 feature cards (Property PMS, QR Menu & POS, Table Reservations, Kitchen & Stock, Enquiries, Multi-property).
- **Resort integration plan** (`docs/resort-integration-plan.md`) — full plan for consolidating Seven Islands, Claris, and Tribal Sand into Klickenya as the single engine, shutting down 3 separate databases.
- **Host onboarding flow plan** (`docs/host-onboarding-flow-plan.md`) — two-path flow design, feature unlock model (marketplace + embed independently unlockable), exact host-facing wording at every state, admin approval panel spec, DB changes required.

---

## 3. How "becoming a host" works today (and the problem)
- **Everyone signs up as a _guest_** (browse, book, enquire, save).
- Becoming a **host** happens through **four different paths** (Google upgrade,
  email upgrade, claiming a listing, or submitting one for review).
- **The problem:** those paths don't behave consistently — several fail to finish
  setting up the host account, which is why **30% of hosts end up broken** (they
  have the role but no usable profile, so the dashboard locks them out).

## 4. Recommended process
Adopt the standard marketplace model:

> **Anyone can become a host instantly to set up — but their listing is reviewed
> before it goes public.**

- Gate the **listing** (what the public sees), not **dashboard access**.
- Consolidate all host setup into **one reliable path** (fixes the 30% broken hosts).
- This removes friction *and* keeps quality control where it matters.

---

## 5. Recommended next steps
1. **Configure production email** (Supabase → Resend SMTP) — unblocks all sign-ups. _Quick._
2. **Consolidate host onboarding** into one reliable path — fixes the 30% broken hosts. _Medium._
3. **Close the enquiry privacy gap.** _Medium._
4. **Fix the admin reservation view.** _Quick._
5. Give hosts the ability to edit/manage their own listings; connect PMS ↔ marketplace. _Larger._

---

## Supporting documentation (full detail in `/docs`)
- `audit-auth-roles-listings.md` — sign-up, login, roles, listing creation
- `audit-host-dashboard.md` — every host page (privacy leak, toggles, loading gaps)
- `audit-admin.md` — admin reservations + the 404 bug + 404 classification
- `fix-plan-auth-roles-listings.md` — fixes (done + planned), with statuses
- `issues-2026-06-24.md` — email delivery (NEW-1) + 30% broken hosts (NEW-2)
- `host-onboarding-target-design.md` — the recommended onboarding design in detail
- `host-onboarding-flow-plan.md` — feature unlock model, two-path flow, host comms wording
- `resort-integration-plan.md` — consolidating Seven Islands, Claris, Tribal Sand into Klickenya

---

## 6. Work done — 2026-06-27 session

### UI / Navigation

**Grouped sidebar navigation (both admin and host dashboard)**
- Admin nav reorganised from 19 flat items into 6 labelled groups: Overview, Inbox, Listings, People, Activity, System
- Host dashboard nav reorganised from 9 flat items into 4 labelled groups: Overview, My Business, Operations, Account
- Group labels rendered as muted uppercase text — visible but not competing with nav items
- Files: `apps/web/app/admin/layout.tsx`, `apps/web/app/dashboard/layout.tsx`

**Page descriptions added to all pages**
- Every main list/overview page in both admin and host dashboard now has a static one-line description below the page title explaining what the page is and what you can do there
- 18 admin pages + 9 dashboard pages updated
- Count of rows (total records) moved from the description text to a small pill badge next to the page title — cleaner visual separation
- Files: all `page.tsx` files under `apps/web/app/admin/` and `apps/web/app/dashboard/`

**Back button on /list page**
- Was hardcoded to `/` (homepage). Now uses `router.back()` so it returns to whatever page the user came from
- Committed: `feat(list): add back button that returns to previous page`
- Files: `apps/web/app/list/BackButton.tsx` (new client component), `apps/web/app/list/page.tsx`

### /become-a-host page improvements
- Added "Already have a website?" section with embed widget explanation, feature checklist, and live code snippet showing the `embed.js` script tag
- Added "Host Dashboard" section with 6 feature cards: Property & Room Management, QR Menu & POS, Table Reservations, Kitchen & Stock, Enquiries & Guests, Multi-Property Support
- File: `apps/web/app/become-a-host/page.tsx`

### Planning docs created

**`docs/resort-integration-plan.md`**
Covers consolidating Seven Islands, Claris, and Tribal Sand (3 separate PHP sites + databases) into Klickenya as the single engine. Key points:
- PHP resort sites become plain marketing sites — no database, no backend logic
- Klickenya handles all bookings, availability, guest comms via embed widget
- 5 phases: host setup → Seven Islands pilot → fix booking embed → Claris + Tribal → marketplace listing
- Cost reduction: from ~$46–70/mo (4 databases) to ~$25/mo (1 Supabase)
- 5 business subscription scenarios mapped out

**`docs/host-onboarding-flow-plan.md`**
Covers the broken host onboarding flow and the two-path fix. Key points:
- 6 root causes of current confusion identified
- Feature unlock model: base dashboard is immediate, marketplace listing and embed widget are independently unlockable with admin approval
- DB changes required: `embed_enabled`, `embed_requested_at`, `marketplace_enabled` columns on `host_profiles`
- Exact host-facing wording at every state (pending, approved, rejected)
- Admin view per host: feature panel with approve/reject actions in `/admin/hosts/[id]`

### Still pending (from this session)
- [ ] Fix F-4 bug — host_profiles insert missing slug (both `upgrade-to-host` and `register/actions.ts`)
- [ ] Build feature unlock UI in `/admin/hosts/[id]` — marketplace + embed approve/reject panel
- [ ] Add embed code panel in host dashboard — visible after `embed_enabled = true`
- [ ] Split `/become-a-host` into two explicit cards (Path 1: marketplace, Path 2: tools/embed)
- [ ] Fix dashboard empty state for Path 2 hosts
- [ ] DB migration for host_profiles feature flags (next migration: 073)
- [ ] Live test `/embed/booking/[slug]` — blocker for resort integration
