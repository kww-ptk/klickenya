# Klickenya — Platform Review

_Prepared by: engineering review · Last updated: 2026-06-25_

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

| # | Issue | Impact | Severity | Type |
|---|---|---|---|---|
| 1 | **Sign-up confirmation emails not delivered** | New users can't activate their accounts | 🔴 | Config (Supabase email) |
| 2 | **~30% of host accounts are broken** | 3 of 10 hosts can't use the dashboard | 🔴 | Code (onboarding) |
| 3 | **Guest enquiry details exposed to other hosts** | Privacy gap (names, emails, phones) | 🔴 | Code (access control) |
| 4 | **Admin "View reservation" always 404s** | Admins can't open reservation details | 🔴 | Code (bad query) |
| 5 | Hosts can't edit/view their listings in the dashboard | Limited self-service | 🟠 | Code (missing feature) |
| 6 | PMS property vs marketplace listing are disconnected | "My Listings" shows 0 after setup; data re-entry | 🟠 | Design |
| 7 | "Analyse with AI" step always fails | Users hit an error, fall back to manual | 🟠 | Config + code |
| 8 | Broken/inconsistent on/off toggles; ~35 pages missing loading states | Rough UX | 🟡 | Polish |

_(Full technical detail, file references, and fix directions are in the supporting
docs listed at the bottom.)_

---

## 2. What we fixed this round
- **"Confirmation link expired" sign-up bug** — links pointed at the wrong web address.
- **Approved listings now go live** on the marketplace (they were staying hidden despite the "you're live" email).
- **Added a "List your business" button** in the host dashboard (previously there was no way to start a listing from there).
- **Cleaner listing form** — live email/phone validation + a mobile progress bar.

> Note: these fixes are committed and staged; final production deploy + one Supabase
> email setting are still required for sign-up to work end-to-end.

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
