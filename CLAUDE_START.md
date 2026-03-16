# Klickenya — Claude Code Master Brief
> Read this file at the start of every session before writing any code.

---

## What is Klickenya?

**Klickenya** is Kenya's all-in-one booking and property marketplace. Think:
- **Airbnb** → Stays, experiences, rentals, services
- **Luma** → Events and ticketing  
- **Zillow** → Real estate listings, agent directory, AI valuations

Everything in one platform, built for Kenya, paid via M-Pesa.

---

## Project Structure

```
klickenya/                    ← monorepo root
├── apps/
│   ├── web/                  ← Next.js 14 App Router (klickenya.com)
│   └── studio/               ← Sanity Studio (studio.klickenya.com)
├── packages/
│   └── shared/               ← Shared TypeScript types
├── reference/                ← Design HTML files (read-only — design spec)
│   ├── klickenya-home-v2.html   ← HOMEPAGE (use this one — final approved)
│   ├── stay.html
│   ├── activity.html
│   ├── event.html
│   └── blog.html
├── CLAUDE_START.md           ← This file
└── pnpm-workspace.yaml
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 App Router + TypeScript | SSG + ISR for all listing/property pages |
| Styling | Tailwind CSS + shadcn/ui | Custom design tokens below |
| CMS | Sanity.io | All content: listings, properties, blog, pages |
| Database | Supabase (Postgres) | Auth + dynamic data + pgvector |
| Auth | Supabase Auth | Admin-only in V1; public in V3 |
| Search | Postgres Full-Text Search | Built into Supabase — no Algolia |
| Email | Resend + React Email | Transactional emails |
| CRM | GoHighLevel (GHL) | Webhook-based — optional env var |
| Payments | IntaSend (M-Pesa + card) | V2 — not yet |
| Calendar | iCal two-way sync | V2 — schema ready |
| AI | Anthropic Claude API + pgvector | V2 — embedding columns ready |
| Hosting | Vercel | |

---

## Brand & Design System

### Colours
```css
--purple:      #8B4DAB;   /* Primary accent — logo-derived, lighter version */
--purple-dim:  rgba(139,77,171,0.10);
--gold:        #F5C842;   /* Gold wave from logo */
--gold-warm:   #E8A020;   /* Warm amber */
--canvas:      #FAFAF8;
--surface:     #F4F1EC;
--border:      #E2DDD5;
--text:        #16130C;
--text2:       #5E5848;
--text3:       #9C9485;
--dark:        #111008;
```

### Typography
- **Body / UI**: `Helvetica Neue, Helvetica, Arial, sans-serif` — clean, no Google Fonts needed
- **Display headings**: Same Helvetica stack at weight 700–800, tight letter-spacing

### Purple usage rule
Purple is an **accent only** — not a dominant background colour. It appears on:
- Logo icon background (nav)
- Sign-in button (sticky nav)
- Search button (pill + hero search box)
- Active tab underlines
- Category nav active state
- Event date month labels
- Section eyebrow labels

### Design reference
`reference/klickenya-home-v2.html` is the approved homepage design. When building any page, open this file and match the layout, spacing, and component patterns exactly.

---

## V1 Scope — STRICT

V1 ships with:
- ✅ Homepage (from reference/klickenya-home-v2.html)
- ✅ Listing pages (stays, experiences, events, rentals, services)
- ✅ Property pages (for-sale, for-rent, land) — Real Estate V1
- ✅ Blog / Journal system
- ✅ Destination + neighbourhood guide pages
- ✅ Contact form (NOT a booking engine — saves to Supabase)
- ✅ Admin panel (/admin — role-protected)
- ✅ Sanity Studio CMS
- ✅ SEO infrastructure (sitemap, robots, JSON-LD)

V1 does NOT include:
- ❌ Booking engine or payment processing
- ❌ User registration (guests or hosts)
- ❌ Reviews system
- ❌ Agent self-registration (V2)
- ❌ Interactive map search (V2)
- ❌ AI valuations (V3)
- ❌ M-Pesa / Stripe (V2)

---

## URL Structure

### Marketplace
```
/                                    Homepage
/stays                               All stays
/stays/nairobi                       Stays in Nairobi
/stays/nairobi/sunset-loft           Listing detail
/experiences/narok/mara-game-drive   Experience detail
/events/nairobi/blankets-and-wine    Event detail
/journal                             Blog index
/journal/10-days-in-kenya            Blog post
/destinations/maasai-mara            Destination guide
```

### Real Estate
```
/property                            RE homepage
/property/for-sale                   All for-sale
/property/for-sale/nairobi           City index
/property/for-sale/nairobi/kilimani  Neighbourhood
/property/for-sale/nairobi/kilimani/3br-apt-xyz   Listing
/property/for-rent/mombasa/nyali     Neighbourhood rent
/neighbourhoods/kilimani             Neighbourhood guide
/agents                              Agent directory
/tools/property-valuation            Valuation tool (V3)
/tools/mortgage-calculator           Calculator (V3)
/market-data/nairobi/kilimani        Price trends (V2)
```

---

## Database — Key Tables

### Marketplace
- `users` — role: admin | host | guest
- `listings` — stays, experiences, events, rentals, services
- `contact_requests` — V1 "booking" stand-in
- `blog_posts`
- `activity_log` — every significant action (AI-ready)
- `api_keys` — for GHL, n8n, external integrations
- `external_calendars` — iCal sync (V2, schema exists)

### Real Estate
- `properties` — all property listings
- `agents` — verified agent profiles
- `property_enquiries` — buyer → agent lead capture
- `saved_properties` — user watchlists
- `property_alerts` — saved search notifications
- `valuations` — AI valuation results log

### AI-Ready columns (exist from day 1, populated in V2)
- `listings.embedding vector(1536)` — pgvector semantic search
- `properties.embedding vector(1536)` — property semantic search
- `blog_posts.embedding vector(1536)` — content search

---

## Integrations

### GHL (GoHighLevel)
```typescript
// Every form submission calls this — no-op if env var not set
await sendToGHL('contact.received', { name, email, phone, listing_title, ... })
```
Env var: `GHL_INBOUND_WEBHOOK_URL` — set in Vercel when ready

### Sanity → ISR
Sanity webhook → `/api/webhooks/sanity` → `revalidatePath()` → page rebuilds in ~2s

### iCal (V2)
Vercel Cron every 2h → `/api/cron/sync-calendars` → fetch .ics → update availability table

---

## Coding Conventions

1. **TypeScript everywhere** — no `any` types
2. **Named exports** from all components
3. **Zod validation** on all API route inputs
4. **All DB queries** go through `lib/supabase/queries.ts` — never inline SQL in components
5. **All Sanity queries** go through `lib/sanity/queries.ts` — never inline GROQ in components
6. **Every API route that mutates data** calls `sendToGHL()` after success
7. **Every significant action** logs to `activity_log` table
8. **All images** use `next/image` with width + height + alt text
9. **SEO**: every page has `generateMetadata()` + JSON-LD schema
10. **File naming**: PascalCase components, camelCase utils/hooks, kebab-case routes

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=
SANITY_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=
ADMIN_EMAIL=

# Site
NEXT_PUBLIC_SITE_URL=https://klickenya.com

# Integrations (optional — safe to leave empty in V1)
GHL_INBOUND_WEBHOOK_URL=
CRON_SECRET=

# AI (V2 — safe to leave empty in V1)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## How to Start a Session

1. Open this file first
2. Tell Claude Code what page/feature you're building
3. Reference the relevant HTML file: "Before coding, read `reference/klickenya-home-v2.html` and identify the components we'll be building"
4. Use the prompts in `klickenya-roadmap.html` (Prompt 0 → Prompt 8) in order
5. Commit to git after each prompt completes

---

## Phase Summary

| Phase | Scope | Timeline |
|---|---|---|
| V1 | Content site, admin CMS, contact forms, SEO, RE listings | 6 weeks |
| V2 | Bookings, payments, M-Pesa, host dashboard, agent portal, map search | 8 weeks |
| V3 | Self-serve listing, events ticketing, AI valuations, AI tools | 8 weeks |
| V4 | Scale, dynamic pricing, data API, mortgage partnerships | 10 weeks |

**Full roadmap:** see `klickenya-roadmap.html`
