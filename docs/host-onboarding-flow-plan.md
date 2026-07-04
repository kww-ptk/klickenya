# Host Onboarding Flow — Clarity Plan

> Status: **Planning** · Author: engineering · Date: 2026-06-27
>
> This plan addresses the confusion in the current host onboarding flow
> and defines the correct two-path experience for businesses joining Klickenya.

---

## Why the Current Flow is Confusing

### 1. "Become a host" and "List your business" look like the same thing
Both links exist in the nav and footer. Both land on pages that say essentially
the same thing. A business owner doesn't know which one to click or what the
difference is. They are actually different entry points to the same broken funnel.

### 2. Every CTA leads to `/list` — no matter who you are
Whether you are a small guesthouse with no website or an established resort with
10,000 monthly visitors, clicking any button on `/become-a-host` sends you to the
same 6-step marketplace submission form. That form is designed for getting listed
on the Klickenya marketplace — not for onboarding a business that just wants the
dashboard and embed tools.

### 3. The `/list` form feels like applying for something
It's a 6-step form that ends with "our team reviews every submission." For a resort
owner who already has a business and just wants to plug in a booking widget, this
feels like a gatekeeper. They are being asked to submit for approval just to access
tools they need now.

### 4. The dashboard and embed widget are never mentioned until after approval
A business owner reading `/become-a-host` sees: get discovered, receive enquiries,
showcase photos, build reputation. That's a directory pitch. Nothing tells them
that Klickenya also comes with a full PMS, POS, QR menu, kitchen system, and
embeddable widgets. They have no idea what they're actually signing up for.

### 5. The upgrade-to-host API silently fails
When a logged-in guest clicks any CTA on `/become-a-host`, the system upgrades
their role to host but inserts a `host_profiles` row without a slug — which is
NOT NULL. The insert fails silently. The user gets `role=host` but no
`host_profile`, meaning every dashboard page redirects them out. They become a
host but can't use any host features. This is a live bug.

### 6. No path for businesses that already have a website
The entire funnel assumes the business has no online presence and wants Klickenya
to be their homepage. There is no path for the Seven Islands scenario — an
established resort that wants the dashboard and embed widget but does not
necessarily want or need a marketplace listing first.

---

## The Two Types of Business Klickenya Serves

Understanding this is the foundation of the fix:

| Type | Who | What they need | Right path |
|---|---|---|---|
| **Type 1 — New to online** | Small guesthouse, new restaurant, tour operator | Get discovered on klickenya.com marketplace | Submit listing → admin approves → dashboard |
| **Type 2 — Already established** | Resort with own website, restaurant with regulars | Dashboard + embed widget for their existing site | Register as host → dashboard immediately → embed code |

These are genuinely different needs. One path cannot serve both well.

---

## The Proposed Flow

### Path 1 — "Put me on the Klickenya marketplace"

```
/become-a-host (card 1)
    ↓
/register?role=host (if not logged in) OR already logged in
    ↓
/list — 6-step marketplace submission form
    ↓
Admin reviews and approves (within 24h)
    ↓
Listing goes live on klickenya.com
    ↓
/dashboard — host sees their listing, enquiries, stats
    ↓
Can optionally set up embed widget from dashboard
```

**Best for:** Any business that wants to be discovered by guests on klickenya.com.

---

### Path 2 — "I have a website, I want the tools"

```
/become-a-host (card 2)
    ↓
/register?role=host (if not logged in) OR already logged in
    ↓
/dashboard — immediately accessible, no approval needed
    ↓
Set up property / rooms / menu from dashboard
    ↓
Copy embed code snippet from dashboard
    ↓
Paste into their existing website — done
    ↓
All bookings and enquiries flow into Klickenya dashboard
    ↓
Optionally submit a marketplace listing later for extra discovery
```

**Best for:** Established resorts, restaurants, and businesses with existing websites
that want Klickenya to power their booking and operations backend.

---

## What Needs to Be Built

### 1. Split `/become-a-host` into two explicit cards
Replace the current single "I run a place or service" card with two clear cards:

**Card A — "Get on the Klickenya marketplace"**
- For businesses with no website or that want to be discovered
- CTA: "List my business" → `/list`
- Shows: marketplace reach, enquiries, reviews, verification badge

**Card B — "I already have a website"**
- For established businesses that want the dashboard + embed
- CTA: "Get the tools" → `/register?role=host` or `/dashboard`
- Shows: embed widget, PMS, QR menu, dashboard tools, no approval needed

### 2. Fix the upgrade-to-host API (F-4 bug)
The `host_profiles` insert must include a generated slug. Without this, any host
created via the upgrade path cannot use the dashboard. This must be fixed before
either path works reliably.

### 3. Add a "Get your embed code" section in the dashboard
Once a host sets up a property, they should see a clear panel with:
- The one-line script tag to copy
- The `<div>` snippet for each widget type
- A live preview of what the embed looks like

### 4. Make the dashboard immediately useful without a listing
Right now the dashboard empty state says "Claim a listing" — it assumes the host
got there through the marketplace path. For Path 2 hosts, the empty state should
say "Set up your property" and guide them to create a property and rooms first,
then get their embed code.

---

## What Does NOT Change

- The `/list` form itself — it works fine for Path 1
- The admin approval flow for marketplace listings
- The dashboard itself — it's already fully built
- The embed widgets — already built (pending live test)
- The claim flow — already works

---

## Feature Unlock Architecture

Rather than forcing every business through one path, Klickenya uses a
**feature unlock model**. Every host starts with base dashboard access immediately.
Additional capabilities — marketplace listing and embed widget — are unlocked
separately, each requiring admin approval. A business can request one, both, or
neither depending on what they need.

```
Register as Host
      ↓
Dashboard — Base Access (immediate, no approval)
Includes: Events · Enquiries · Profile · Basic stats
      │
      ├── 🔓 Unlock: Marketplace Listing
      │         Host submits via /list form
      │         Admin reviews and approves
      │         → Listed on klickenya.com
      │
      └── 🔓 Unlock: Embed Widget
                Host requests from dashboard
                Admin approves (embed_enabled = true)
                → Embed code appears in dashboard
                → Drop on any website
```

Both unlocks are independent — a resort can have the embed without a marketplace
listing, a small guesthouse can have the marketplace listing without the embed,
or a power user can have both.

---

## Host Communication — What the Host Sees at Every Step

This is critical. The host must always know exactly what is happening, what they
are waiting for, and what comes next. No silent states, no confusion.

### After registering as host
> **"Welcome to your Klickenya dashboard."**
> Your base account is active. You can create events, receive enquiries, and
> manage your profile right now. When you're ready, unlock the features below
> to expand your reach.

### After requesting marketplace listing (submitted /list form)
> **"Your listing is under review."**
> Our team reviews every submission within 24 hours to keep the marketplace
> high quality. We'll email you at [email] once it's approved and live.
> You don't need to do anything else right now.

Dashboard shows a visible **"Pending — under review"** badge on the listing.

### After admin approves marketplace listing
> **"Your listing is live on Klickenya! 🎉"**
> Guests can now discover [Business Name] on klickenya.com. Head to your
> dashboard to track enquiries and manage your profile.

Email sent automatically. Badge changes to **"Live"** in green.

### After requesting embed widget access
> **"Embed access requested."**
> Our team will review your request and enable the embed widget for your
> account within 24 hours. We'll email you when it's ready.

Dashboard shows a **"Requested — pending approval"** state on the embed panel.
The code snippet is blurred/locked until approved.

### After admin approves embed widget
> **"Your embed widget is unlocked! 🎉"**
> Copy the code below and paste it into your website. All bookings and
> enquiries will appear in your Klickenya dashboard automatically.

Email sent automatically. Embed code panel unlocks fully with copy button.

### If admin rejects a request
> **"We couldn't approve your request right now."**
> [Reason from admin if provided]. Please contact us at hello@klickenya.com
> if you have questions or would like to resubmit.

Badge changes to **"Not approved"** with a "Contact us" link. No dead ends.

---

## What Admin Sees Per Host

In `/admin/hosts/[id]`, a simple feature panel:

| Feature | Status | Action |
|---|---|---|
| Marketplace listing | ✅ Approved — Live | View listing |
| Embed widget | ⏳ Requested | Approve · Reject |
| Base dashboard | ✅ Active | — |

Admin can approve or reject each unlock independently with an optional note
that gets sent to the host in the rejection email.

---

## Database Changes Required

Add feature flags to `host_profiles`:

```sql
ALTER TABLE host_profiles
  ADD COLUMN embed_enabled boolean DEFAULT false,
  ADD COLUMN embed_requested_at timestamptz,
  ADD COLUMN marketplace_enabled boolean DEFAULT false;
```

`marketplace_enabled` is set to `true` automatically when admin approves
a listing request. `embed_enabled` is set to `true` when admin approves
the embed request from the host dashboard.

---

## Priority Order

1. **Fix F-4 (upgrade-to-host slug bug)** — both paths break without this
2. **Split `/become-a-host` into two cards** — the core UX fix
3. **Fix dashboard empty state for Path 2 hosts** — guides them to set up property
4. **Add embed code panel in dashboard** — completes the Path 2 experience
5. **Live test the booking embed** — required before Path 2 is fully usable

---

## End Result

A business owner landing on `/become-a-host` immediately understands:
- If they want to be on the Klickenya marketplace → clear path
- If they already have a website and just want the tools → clear path

No confusion. No one ends up in the wrong funnel. No silent failures.
