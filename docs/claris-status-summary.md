# Claris → Klickenya — Status Summary

> Date: 2026-07-02 · One-page view of what's done and what's left.
> Details: [handoff for Patrick](./claris-handoff-patrick.md) ·
> [full plan](./claris-integration-plan.md)

## The goal
Make Klickenya the booking engine behind the Claris website. Claris keeps its own
site + branding; bookings, villas, and enquiries run through Klickenya.
**Enquiry flow, no payments** (Claris is price-on-request). Claris is the pilot;
Seven Islands + Tribal Sand follow the same recipe.

---

## ✅ What we achieved (all verified in DEV / locally)

| # | Achievement |
|---|---|
| 1 | Confirmed Claris's real data: **42 villas**, no prices (enquiry model), on **Neon** (plan said Render — corrected). |
| 2 | **42 villas imported** into Klickenya (dev) — each its own bookable unit (Option B), keyed by the villa's own slug. |
| 3 | **616 photos uploaded** into Klickenya storage; villas show real images. |
| 4 | Booking widget verified per-villa — Twiga House page shows only Twiga House, photo, **"Price on request"**. |
| 5 | **Claris site tested locally with the Klickenya widget** — the real villa page loads the Klickenya booking form. Confirmed working. |
| 6 | **Sanity decoupled** — enquiries reach the dashboard by property, no marketplace listing needed. |
| 7 | **Security fix** — closed a gap where a host could view another host's enquiry by ID. |
| 8 | **One-line site change** proven — a single edit in `room.php` covers all 42 villa pages. |
| 9 | Reusable **migration scripts** + full **handoff for Patrick** written. |

---

## ⏳ What's remaining (for Patrick / production)

### Must-do to go live
1. **Back up the live Claris site + Neon DB** (before any change). ← blocking
2. **Merge the 5 Klickenya code changes** (feature → dev → main).
3. **Import Claris into Klickenya PRODUCTION** (run the 2 scripts against prod;
   set the real Claris host email first).
4. **Apply the widget** to the real Claris site (already coded, toggle on),
   commit only after the backup.
5. **Parallel run ~2 weeks**, then **shut down Claris's Neon DB**.

### Should-do before scaling to more resorts
6. **Security follow-up** — audit enquiry action endpoints (reply/convert/hold/
   decline) for the same ownership check; proper `contact_requests` RLS migration.
7. **Move images to Cloudflare R2 + CDN** (no egress fees) before many resorts.

### Optional / later
8. **Marketplace listings** — run `seed-claris-listings.ts` to also list Claris
   villas on klickenya.com for discovery (needs Sanity access).
9. **Payments + instant-book (V2)** — only when M-Pesa/Paystack is added.
10. **Repeat for Seven Islands + Tribal Sand** using this same recipe.

---

## Where the line is right now
**Everything on the Klickenya side is built and proven in dev. Nothing has been
pushed. The Claris live site is untouched.** The next move is Patrick's:
back up Claris, then run the production cutover.
